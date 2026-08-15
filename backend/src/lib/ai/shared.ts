// Catálogo, system prompt, definição das tools e execução delas — compartilhado
// entre os providers de IA (Anthropic e Google/Gemini). Cada provider só
// converte esse schema pro formato da própria SDK; a lógica de negócio (o que
// a tool FAZ) mora só aqui, uma vez, pra nunca dessincronizar entre os dois.
import { createBooking, getAvailability, BookingConflictError, BookingInputError } from '../booking';

export const SERVICE_CATALOG = `
SALÃO DE BELEZA (Angella Barros)
- Corte & Finalização — 45 min — R$ 180
- Coloração Premium — 2h30 — R$ 480
- Tratamento Capilar (reconstrução) — 1h15 — R$ 240
- Mechas / Iluminado — 3h — R$ 620
MASSOTERAPIA & BEM-ESTAR (Aline Maria)
- Massagem Relaxante — 60 min — R$ 220
- Drenagem Linfática — 75 min — R$ 280
- Massagem Modeladora — 60 min — R$ 260
- Pedras Quentes — 80 min — R$ 320
HORÁRIOS: Seg–Sex 9h–20h · Sáb 9h–17h · Domingo fechado
ENDEREÇO: Centro · Parintins — Amazonas
`;

// Loja/pagamento ficam como stub nesta rodada — catálogo estático (mesmo
// conteúdo padrão de store.jsx) só para a Bela poder recomendar produtos.
// Quando a loja tiver CRUD real ligado à vitrine pública, trocar por SELECT em `products`.
const PRODUCT_LIST = `
- Shampoo Restaurador Vinho (Tratamento Capilar) — R$ 168 — Limpeza suave com reconstrução de queratina. Para cabelos coloridos.
- Óleo Relaxante Bem-Estar (Óleo Essencial) — R$ 142 — Blend de lavanda, gerânio e bergamota para massagem corporal.
- Máscara Reconstrução Couture (Máscara Hidratação) — R$ 198 — Tratamento intensivo semanal.
- Sérum Aromático Noite (Aromaterapia) — R$ 224 — Ritual noturno de relaxamento.
`.trim();

export function systemPrompt(): string {
  return `Você é a Bela, concierge virtual do Angella Barros Studio de Beleza — um studio autoral de beleza e bem-estar em Parintins, Amazonas, fundado em 2018.

Tom: acolhedor, elegante, direto. Português do Brasil. Frases curtas. Nunca use jargão corporativo nem emojis em excesso (no máximo um ✧ ocasional).

CATÁLOGO DE SERVIÇOS:${SERVICE_CATALOG}

PRODUTOS DA LOJA:
${PRODUCT_LIST}

ESPECIALISTAS:
- Angella Barros — coloração avançada, cortes autorais, 12+ anos.
- Aline Maria — drenagem linfática (método Vodder), massagem ayurvédica, 9+ anos.

COMO ATENDER:
1. Faça no máximo 2 perguntas curtas para entender a necessidade (tipo de cabelo, objetivo, tensão corporal, ocasião, tempo disponível).
2. Recomende 1 serviço principal + no máximo 1 produto complementar, sempre justificando em uma frase.
3. Quando a cliente demonstrar interesse em marcar, pergunte o nome, a data desejada e o horário — e então use a ferramenta agendar.
4. Nunca invente serviços, preços ou horários fora do catálogo.
5. Respostas de até 4 frases. Sem listas longas.

Data de hoje: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Manaus' })}.`;
}

// JSON Schema puro (compatível com o `input_schema` da Anthropic e com o
// `parametersJsonSchema` do @google/genai — mesmo objeto serve pros dois).
export interface ToolDef {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export const TOOLS: ToolDef[] = [
  {
    name: 'agendar',
    description:
      'Cria uma reserva no sistema do studio. Use somente quando você tiver nome da cliente, serviço, data e horário confirmados por ela.',
    input_schema: {
      type: 'object',
      properties: {
        client: { type: 'string', description: 'Nome da cliente' },
        service: { type: 'string', description: 'Nome exato do serviço do catálogo' },
        pro: { type: 'string', description: 'Angella Barros ou Aline Maria' },
        date: { type: 'string', description: 'Data no formato AAAA-MM-DD' },
        time: { type: 'string', description: 'Horário no formato HH:MM' },
        price: { type: 'number', description: 'Valor em reais, apenas número' },
      },
      required: ['client', 'service', 'pro', 'date', 'time', 'price'],
    },
  },
  {
    name: 'verificar_disponibilidade',
    description: 'Consulta os horários livres do studio numa data específica.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data AAAA-MM-DD' },
        pro: { type: 'string' },
      },
      required: ['date'],
    },
  },
];

export async function runTool(name: string, input: any): Promise<string> {
  try {
    if (name === 'agendar') {
      const b = await createBooking({
        clientName: input.client,
        service: input.service,
        pro: input.pro,
        date: input.date,
        time: input.time,
        price: input.price,
        channel: 'ia',
      });
      return `Reserva registrada com sucesso. Protocolo ${b.code}. Status: aguardando confirmação do studio.`;
    }
    if (name === 'verificar_disponibilidade') {
      const av = await getAvailability(input.date, input.pro);
      if (!av.open) return 'Domingo o studio está fechado. Sugira segunda ou sábado.';
      return av.slots.length
        ? `Horários livres em ${av.date}: ${av.slots.join(', ')}.`
        : `Nenhum horário livre em ${av.date}.`;
    }
    return `Ferramenta desconhecida: ${name}`;
  } catch (err) {
    if (err instanceof BookingConflictError || err instanceof BookingInputError) return err.message;
    console.error(`Erro na tool ${name}:`, err);
    return 'Tive um problema técnico ao tentar isso agora. Sugira falar pelo WhatsApp do studio.';
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
