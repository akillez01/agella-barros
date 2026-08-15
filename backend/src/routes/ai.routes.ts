// Backend real da "Bela", concierge de IA do Angella Barros Studio de Beleza.
// Substitui o antigo `window.claude.complete(...)` (API fictícia de protótipo)
// por uma chamada de verdade a um provider de LLM real, rodando o loop de
// tool-use no servidor e executando as tools contra o Postgres (ver
// `../lib/ai/shared.ts`). Provider escolhido via env `AI_PROVIDER`
// ('anthropic' | 'google') — ver `../lib/ai/anthropic.ts` e `../lib/ai/google.ts`.
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { chatAnthropic } from '../lib/ai/anthropic';
import { chatGoogle } from '../lib/ai/google';

export const aiRouter = Router();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .min(1),
});

aiRouter.post('/chat', async (req, res) => {
  const hasKey = env.AI_PROVIDER === 'google' ? !!env.GOOGLE_API_KEY : !!env.ANTHROPIC_API_KEY;
  if (!hasKey) {
    return res.status(501).json({ error: `Chave do provider "${env.AI_PROVIDER}" não configurada ainda` });
  }

  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload inválido', issues: parsed.error.issues });
  }

  try {
    const chat = env.AI_PROVIDER === 'google' ? chatGoogle : chatAnthropic;
    const reply = await chat(parsed.data.messages);
    res.json({ reply, provider: env.AI_PROVIDER });
  } catch (err) {
    console.error(`Erro no chat da Bela (provider=${env.AI_PROVIDER}):`, err);
    res.status(500).json({ error: 'Falha ao processar a conversa' });
  }
});
