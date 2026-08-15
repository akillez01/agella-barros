import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { systemPrompt, TOOLS, runTool, ChatMessage } from './shared';

const anthropicTools: Anthropic.Tool[] = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema as any,
}));

export async function chatAnthropic(messages: ChatMessage[]): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY não configurada'), { code: 'NO_KEY' });
  }
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let convo: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let i = 0; i < 6; i++) {
    const resp = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 700,
      system: systemPrompt(),
      messages: convo,
      tools: anthropicTools,
    });

    const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

    if (toolUses.length === 0) {
      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return text || 'Desculpe, não entendi. Pode repetir?';
    }

    convo = [...convo, { role: 'assistant', content: resp.content }];
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const result = await runTool(tu.name, tu.input);
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
    }
    convo = [...convo, { role: 'user', content: toolResults }];
  }
  return 'Desculpe, tive um problema para concluir agora. Fale conosco pelo WhatsApp.';
}
