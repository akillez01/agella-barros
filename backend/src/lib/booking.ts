// Lógica compartilhada de agendamento — usada tanto pelo endpoint REST
// (POST /api/bookings, GET /api/bookings/availability) quanto pelas tools
// da IA (agendar, verificar_disponibilidade), para as duas vias baterem
// sempre no mesmo banco Postgres e nunca dessincronizarem.
import { pool } from '../db';

export const ALL_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:30', '16:00', '17:30', '19:00'];

export class BookingConflictError extends Error {}
export class BookingInputError extends Error {}

function isSunday(dateISO: string): boolean {
  const d = new Date(dateISO + 'T12:00:00-04:00');
  if (isNaN(d.getTime())) throw new BookingInputError('Data inválida.');
  return d.getDay() === 0;
}

// 'Angella Barros' | 'angella' | 'Aline Maria' | 'aline' | 'qualquer' | '' -> key da specialists
function normalizeSpecialistKey(input?: string | null): string {
  const s = (input || '').trim().toLowerCase();
  if (!s || s === 'qualquer' || s === 'qualquer especialista') return 'angella';
  if (s.includes('aline')) return 'aline';
  if (s.includes('angella')) return 'angella';
  return s; // pode já ser a própria key
}

async function findSpecialist(input?: string | null) {
  const key = normalizeSpecialistKey(input);
  const { rows } = await pool.query(
    `SELECT id, key, name FROM specialists WHERE key = $1 AND is_active LIMIT 1`,
    [key]
  );
  return rows[0] || null;
}

async function findService(name?: string | null) {
  if (!name) return null;
  const { rows } = await pool.query(
    `SELECT id, name, price_cents, duration_min FROM services WHERE name ILIKE $1 AND is_active LIMIT 1`,
    [name.trim()]
  );
  return rows[0] || null;
}

function genCode(dateISO: string): string {
  const ymd = dateISO.slice(2).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AG-${ymd}-${rand}`;
}

export interface CreateBookingInput {
  clientName: string;
  clientPhone?: string;
  service: string;
  pro?: string;
  date: string; // AAAA-MM-DD
  time: string; // HH:MM
  price?: number; // reais — usado se o serviço não bater com o catálogo
  channel: 'site' | 'ia' | 'whatsapp' | 'presencial';
  notes?: string;
}

export async function createBooking(input: CreateBookingInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new BookingInputError('Data inválida.');
  if (!/^\d{2}:\d{2}$/.test(input.time)) throw new BookingInputError('Horário inválido.');
  if (isSunday(input.date)) throw new BookingConflictError('O studio não abre aos domingos.');
  if (!ALL_SLOTS.includes(input.time)) throw new BookingInputError('Horário fora da grade do studio.');

  const specialist = await findSpecialist(input.pro);
  const service = await findService(input.service);
  const durationMin = service?.duration_min ?? 60;
  const priceCents = service?.price_cents ?? Math.round((input.price ?? 0) * 100);

  const startsAt = new Date(`${input.date}T${input.time}:00-04:00`);
  const endsAt = new Date(startsAt.getTime() + durationMin * 60000);

  for (let attempt = 0; attempt < 2; attempt++) {
    const code = genCode(input.date);
    try {
      const { rows } = await pool.query(
        `INSERT INTO bookings
           (code, customer_name, customer_phone, service_id, service_name,
            specialist_id, specialist_name, starts_at, ends_at, price_cents,
            status, channel, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pendente',$11,$12)
         RETURNING id, code, service_name, specialist_name, starts_at, ends_at, price_cents, status`,
        [
          code,
          input.clientName.trim(),
          (input.clientPhone || '').replace(/\D/g, ''),
          service?.id || null,
          input.service,
          specialist?.id || null,
          specialist?.name || input.pro || null,
          startsAt.toISOString(),
          endsAt.toISOString(),
          priceCents,
          input.channel,
          input.notes || null,
        ]
      );
      return rows[0];
    } catch (err: any) {
      if (err?.code === '23P01') {
        // EXCLUDE constraint (no_overlap) — horário já ocupado por essa especialista
        throw new BookingConflictError('Esse horário acabou de ficar indisponível. Escolha outro.');
      }
      if (err?.code === '23505' && attempt === 0) continue; // colisão de código, tenta de novo
      throw err;
    }
  }
  throw new Error('Não foi possível gerar um código de reserva único.');
}

export async function getAvailability(dateISO: string, pro?: string | null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) throw new BookingInputError('Data inválida.');
  if (isSunday(dateISO)) return { open: false, date: dateISO, slots: [] as string[], taken: [] as string[] };

  const specialist = await findSpecialist(pro);
  const { rows } = await pool.query(
    `SELECT to_char(starts_at AT TIME ZONE 'America/Manaus', 'HH24:MI') AS t
       FROM bookings
      WHERE (starts_at AT TIME ZONE 'America/Manaus')::date = $1::date
        AND status IN ('pendente','confirmado')
        AND ($2::uuid IS NULL OR specialist_id = $2::uuid)`,
    [dateISO, specialist?.id || null]
  );
  const taken = rows.map((r) => r.t);
  const slots = ALL_SLOTS.filter((s) => !taken.includes(s));
  return { open: true, date: dateISO, slots, taken };
}
