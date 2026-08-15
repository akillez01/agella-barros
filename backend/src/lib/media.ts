// Upload de mídia em disco local (sem S3, mesmo padrão adotado no Corrente de
// Apoio Portal — decisão do Achilles). Arquivos ficam em UPLOAD_DIR (fora do
// container, mapeado pro host em /var/www/vhosts/angellabarros.com/data/uploads
// via volume do docker-compose) e são servidos estático em `/uploads/<arquivo>`.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env';
import { pool } from '../db';

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Só imagens são aceitas'));
    cb(null, true);
  },
});

export async function saveMediaRow(file: Express.Multer.File) {
  const url = `/uploads/${file.filename}`;
  const { rows } = await pool.query(
    `INSERT INTO media (url, storage_key, bytes, mime)
     VALUES ($1,$2,$3,$4) RETURNING id, url`,
    [url, file.filename, file.size, file.mimetype]
  );
  return rows[0];
}
