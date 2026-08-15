import { createApp } from './app';
import { env } from './config/env';
import { pool } from './db';

const app = createApp();
const port = parseInt(env.PORT, 10);

async function main() {
  await pool.query('SELECT 1');
  console.log('Postgres conectado');

  app.listen(port, '0.0.0.0', () => {
    console.log(`angellabarros-backend rodando na porta ${port}`);
    if (!env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY não configurada — /api/ai/chat vai responder 501 até a chave ser definida.');
    }
  });
}

main().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
