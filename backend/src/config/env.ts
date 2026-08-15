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
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Chat da Bela — provider selecionável sem mexer em código, só na env var.
  // 'anthropic' (padrão) usa o loop de tool-use já validado; 'google' usa
  // Gemini enquanto a conta Anthropic estiver sem crédito. Trocar de volta
  // é só mudar AI_PROVIDER e reiniciar o container.
  AI_PROVIDER: (process.env.AI_PROVIDER || 'anthropic') as 'anthropic' | 'google',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  GOOGLE_MODEL: process.env.GOOGLE_MODEL || 'gemini-3.6-flash',

  ADMIN_SESSION_COOKIE: process.env.ADMIN_SESSION_COOKIE || 'ab_admin_session',
  ADMIN_SESSION_TTL_HOURS: Number(process.env.ADMIN_SESSION_TTL_HOURS || '168'),

  // Pagamentos (Sprint 1): ordem real + Pix + cartao (modo manual opcional).
  PIX_KEY: process.env.PIX_KEY || '',
  PIX_MERCHANT: process.env.PIX_MERCHANT || 'ANGELLA BARROS STUDIO',
  PIX_CITY: process.env.PIX_CITY || 'PARINTINS',
  PIX_EXPIRES_MINUTES: Number(process.env.PIX_EXPIRES_MINUTES || '30'),

  // Se false, cartao fica pendente ate conciliacao/manual ou gateway real.
  CARD_MANUAL_AUTO_APPROVE: (process.env.CARD_MANUAL_AUTO_APPROVE || 'true') === 'true',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
};
