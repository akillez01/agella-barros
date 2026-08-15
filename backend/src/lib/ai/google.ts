// Provider alternativo pro chat da Bela — Google Gemini via @google/genai.
// Mesmo contrato de tools que o provider Anthropic (`./shared.ts`): o schema
// JSON de `agendar`/`verificar_disponibilidade` é reaproveitado igual,
// convertido pro formato de `functionDeclarations` do Gemini
// (`parametersJsonSchema` aceita o mesmo JSON Schema que a Anthropic usa em
// `input_schema` — não precisou reescrever nada tool por tool).
import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { systemPrompt, TOOLS, runTool, ChatMessage } from './shared';

const functionDeclarations = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.input_schema,
}));

function toContents(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

export async function chatGoogle(messages: ChatMessage[]): Promise<string> {
  if (!env.GOOGLE_API_KEY) {
    throw Object.assign(new Error('GOOGLE_API_KEY não configurada'), { code: 'NO_KEY' });
  }
  const ai = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
  let contents: any[] = toContents(messages);

  for (let i = 0; i < 6; i++) {
    const resp = await ai.models.generateContent({
      model: env.GOOGLE_MODEL,
      contents,
      config: {
        systemInstruction: systemPrompt(),
        tools: [{ functionDeclarations }],
      },
    });

    const calls = resp.functionCalls || [];
    if (calls.length === 0) {
      return (resp.text || '').trim() || 'Desculpe, não entendi. Pode repetir?';
    }

    // Turno do modelo com as chamadas de função (reconstruído a partir de
    // `resp.functionCalls` em vez de confiar em `resp.candidates[0].content`,
    // pra não depender de um caminho de resposta menos estável da SDK).
    contents = [
      ...contents,
      { role: 'model', parts: calls.map((fc) => ({ functionCall: { name: fc.name, args: fc.args || {} } })) },
    ];

    const resultParts = [];
    for (const fc of calls) {
      const result = await runTool(fc.name as string, fc.args || {});
      resultParts.push({ functionResponse: { name: fc.name, response: { result } } });
    }
    contents = [...contents, { role: 'user', parts: resultParts }];
  }
  return 'Desculpe, tive um problema para concluir agora. Fale conosco pelo WhatsApp.';
}
