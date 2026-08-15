import { Router } from 'express';
import { z } from 'zod';
import { createBooking, getAvailability, BookingConflictError, BookingInputError } from '../lib/booking';

export const bookingsRouter = Router();

const createSchema = z.object({
  clientName: z.string().min(2),
  clientPhone: z.string().optional(),
  service: z.string().min(1),
  pro: z.string().optional(),
  date: z.string(),
  time: z.string(),
  price: z.number().optional(),
  channel: z.enum(['site', 'ia', 'whatsapp', 'presencial']).default('site'),
  notes: z.string().optional(),
});

bookingsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  }
  try {
    const booking = await createBooking(parsed.data);
    res.status(201).json({ booking });
  } catch (err) {
    if (err instanceof BookingConflictError) return res.status(409).json({ error: err.message });
    if (err instanceof BookingInputError) return res.status(400).json({ error: err.message });
    console.error('Erro ao criar reserva:', err);
    res.status(500).json({ error: 'Falha ao registrar reserva' });
  }
});

bookingsRouter.get('/availability', async (req, res) => {
  const date = String(req.query.date || '');
  const pro = req.query.pro ? String(req.query.pro) : undefined;
  try {
    const result = await getAvailability(date, pro);
    res.json(result);
  } catch (err) {
    if (err instanceof BookingInputError) return res.status(400).json({ error: err.message });
    console.error('Erro ao consultar disponibilidade:', err);
    res.status(500).json({ error: 'Falha ao consultar disponibilidade' });
  }
});
