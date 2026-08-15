import { Pool } from 'pg';
import { env } from './config/env';

export const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do Postgres:', err);
});
