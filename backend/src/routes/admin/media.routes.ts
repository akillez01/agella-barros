import { Router } from 'express';
import { upload, saveMediaRow } from '../../lib/media';

export const adminMediaRouter = Router();

// Upload de uma imagem — usado antes de criar/editar produto, galeria,
// perfil de especialista etc. Retorna {id, url}; o `id` vira o `image_id`/
// `media_id`/`photo_id` enviado no corpo JSON das outras rotas admin.
adminMediaRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado (campo "file")' });
  try {
    const media = await saveMediaRow(req.file);
    res.status(201).json({ media });
  } catch (err) {
    console.error('Erro ao salvar mídia:', err);
    res.status(500).json({ error: 'Falha ao salvar arquivo' });
  }
});
