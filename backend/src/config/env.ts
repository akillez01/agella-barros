import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Env var ausente: ${name}`);
  return v;
}

export const env = {
  PORT: process.env.PORT || '3001',
  DATABASE_URL: required('DATABASE_URL'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://angellabarros.com',
  UPLOAD_DIR: process.env.UPLOAD_DIR || '/app/uploads',

  // Chat da Bela — provider selecionável sem mexer em código, só na env var.
  // 'anthropic' (padrão) usa o loop de tool-use já validado; 'google' usa
  // Gemini enquanto a conta Anthropic estiver sem crédito. Trocar de volta
  // é só mudar AI_PROVIDER e reiniciar o container.
  AI_PROVIDER: (process.env.AI_PROVIDER || 'anthropic') as 'anthropic' | 'google',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  GOOGLE_MODEL: process.env.GOOGLE_MODEL || 'gemini-3.6-flash',

  // Token compartilhado simples pra proteger /api/admin/* nesta rodada.
  // TODO: substituir por sessão real (admin_users/admin_sessions já
  // modelados no schema.sql, com bcrypt) quando o login do painel deixar de
  // ser só usuário/senha comparados no navegador.
  ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN || '',
};
