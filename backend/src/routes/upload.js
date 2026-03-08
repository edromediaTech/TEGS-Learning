const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { FormData: UndiciFormData, fetch: undiciFetch } = require('undici');

const router = express.Router();

// --- Configuration GCP Storage Service ---
const GCS_SERVICE_URL = process.env.GCS_SERVICE_URL || 'https://dp-storage-service-746425674533.us-central1.run.app';
const GCS_ENABLED = process.env.GCS_ENABLED !== 'false'; // true par defaut

// --- Fallback local ---
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer en memoire (pour GCP) ou sur disque (fallback local)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo (GCP supporte plus)
  fileFilter: (_req, file, cb) => {
    const ALLOWED = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf',
    ];
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorise. Formats acceptes : images, videos, audio, PDF'));
    }
  },
});

/**
 * Genere un JWT compatible avec dp-storage-service.
 * Le service GCP verifie le token avec JWT_SECRET.
 * On cree un token minimal contenant les infos attendues.
 */
function generateGcsToken(user) {
  const gcsSecret = process.env.GCS_JWT_SECRET || process.env.JWT_SECRET;
  return jwt.sign(
    {
      id: user.id.toString(),
      email: 'tegs-upload@tegs-learning.edu.ht',
      name: 'TEGS-Learning',
      roles: [{ name: 'admin', permissions: ['upload', 'read', 'delete'] }],
      deptId: user.tenant_id.toString(),
      deptName: 'tegs',
    },
    gcsSecret,
    { expiresIn: '5m' }
  );
}

/**
 * Dossier GCS isole par tenant : tegs/<tenant_id>/
 */
function tenantFolder(tenantId) {
  return `tegs/${tenantId}`;
}

// -----------------------------------------------------------------------
// POST /api/upload/image - Upload vers GCP (ou local en fallback)
// -----------------------------------------------------------------------
router.post('/image', authenticate, memoryUpload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier envoye' });
  }

  // --- Mode GCP ---
  if (GCS_ENABLED) {
    try {
      const token = generateGcsToken(req.user);
      const folder = tenantFolder(req.tenantId);

      // Construire le FormData pour dp-storage-service
      const formData = new UndiciFormData();

      // Renommer avec hash unique pour eviter les collisions
      const ext = path.extname(req.file.originalname).toLowerCase();
      const uniqueName = `${crypto.randomBytes(8).toString('hex')}${ext}`;

      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append('file', blob, uniqueName);
      formData.append('folder', folder);

      const gcsRes = await undiciFetch(`${GCS_SERVICE_URL}/api/storage/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const gcsData = await gcsRes.json();

      if (gcsRes.status === 409) {
        // Fichier identique existe deja, renvoyer son URL signee
        const existingFile = gcsData.file;
        const parts = existingFile.fullPath.split('/');
        const fileName = parts.pop();
        const folderPath = parts.join('/');

        const signedRes = await undiciFetch(
          `${GCS_SERVICE_URL}/api/storage/signed-url/${encodeURIComponent(folderPath)}/${encodeURIComponent(fileName)}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const signedData = await signedRes.json();

        return res.status(201).json({
          url: signedData.url,
          filename: fileName,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          storage: 'gcp',
          gcsPath: existingFile.fullPath,
        });
      }

      if (!gcsRes.ok) {
        console.error('[GCS RESPONSE]', gcsRes.status, JSON.stringify(gcsData));
        throw new Error(gcsData.error || gcsData.message || `GCS HTTP ${gcsRes.status}`);
      }

      return res.status(201).json({
        url: gcsData.url,
        filename: uniqueName,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        storage: 'gcp',
        gcsPath: `${folder}/${uniqueName}`,
      });
    } catch (err) {
      console.error('[GCS UPLOAD ERROR]', err.message);
      // Fallback sur local si GCS echoue
      console.log('[UPLOAD] Fallback sur stockage local');
    }
  }

  // --- Fallback local ---
  const ext = path.extname(req.file.originalname).toLowerCase();
  const localName = `${crypto.randomBytes(12).toString('hex')}${ext}`;
  const localPath = path.join(UPLOAD_DIR, localName);
  fs.writeFileSync(localPath, req.file.buffer);

  const url = `/public/uploads/${localName}`;
  res.status(201).json({
    url,
    filename: localName,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    storage: 'local',
  });
});

// -----------------------------------------------------------------------
// GET /api/upload/library - Lister les images (GCP + local)
// -----------------------------------------------------------------------
router.get('/library', authenticate, async (req, res) => {
  const images = [];

  // --- Images GCP ---
  if (GCS_ENABLED) {
    try {
      const token = generateGcsToken(req.user);
      const folder = tenantFolder(req.tenantId);
      const prefix = `${folder}/`;

      // Use list-files (no hardcoded prefix) and filter by tenant folder
      const gcsRes = await undiciFetch(
        `${GCS_SERVICE_URL}/api/storage/list-files`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (gcsRes.ok) {
        const gcsData = await gcsRes.json();
        const allFiles = Array.isArray(gcsData) ? gcsData : (gcsData.files || []);
        const tenantFiles = allFiles
          .filter(f => {
            const name = f.name || f.fullPath || f.filename || '';
            return name.startsWith(prefix) && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
          });

        // Generate signed URLs for each tenant file
        for (const f of tenantFiles) {
          const fullPath = f.name || f.fullPath || f.filename;
          const parts = fullPath.split('/');
          const fileName = parts.pop();
          const folderPath = parts.join('/');

          try {
            const signedRes = await undiciFetch(
              `${GCS_SERVICE_URL}/api/storage/signed-url/${encodeURIComponent(folderPath)}/${encodeURIComponent(fileName)}`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (signedRes.ok) {
              const signedData = await signedRes.json();
              images.push({
                filename: fileName,
                url: signedData.url,
                size: f.size || 0,
                storage: 'gcp',
                gcsPath: fullPath,
              });
            }
          } catch { /* skip file if signed URL fails */ }
        }
      }
    } catch (err) {
      console.error('[GCS LIST ERROR]', err.message);
    }
  }

  // --- Images locales ---
  try {
    const localFiles = fs.readdirSync(UPLOAD_DIR)
      .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(UPLOAD_DIR, f));
        return {
          filename: f,
          url: `/public/uploads/${f}`,
          size: stat.size,
          createdAt: stat.birthtime,
          storage: 'local',
        };
      });
    images.push(...localFiles);
  } catch { /* pas d'images locales */ }

  // Trier par date decroissante
  images.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return db - da;
  });

  res.json({ images });
});

// -----------------------------------------------------------------------
// GET /api/upload/signed-url - Regenerer une URL signee pour un fichier GCP
// -----------------------------------------------------------------------
router.get('/signed-url', authenticate, async (req, res) => {
  const { gcsPath } = req.query;
  if (!gcsPath) {
    return res.status(400).json({ error: 'gcsPath requis' });
  }

  // Verifier que le chemin appartient bien au tenant
  const expectedPrefix = tenantFolder(req.tenantId);
  if (!gcsPath.startsWith(expectedPrefix)) {
    return res.status(403).json({ error: 'Acces refuse : fichier hors tenant' });
  }

  try {
    const token = generateGcsToken(req.user);
    const parts = gcsPath.split('/');
    const fileName = parts.pop();
    const folderPath = parts.join('/');

    const gcsRes = await undiciFetch(
      `${GCS_SERVICE_URL}/api/storage/signed-url/${encodeURIComponent(folderPath)}/${encodeURIComponent(fileName)}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!gcsRes.ok) {
      return res.status(404).json({ error: 'Fichier non trouve sur GCP' });
    }

    const data = await gcsRes.json();
    res.json({ url: data.url });
  } catch (err) {
    console.error('[GCS SIGNED-URL ERROR]', err.message);
    res.status(500).json({ error: 'Erreur lors de la generation de l\'URL signee' });
  }
});

// -----------------------------------------------------------------------
// DELETE /api/upload/:filename - Supprimer un fichier (GCP ou local)
// -----------------------------------------------------------------------
router.delete('/:filename', authenticate, async (req, res) => {
  const { filename } = req.params;
  const { gcsPath } = req.query;

  // Suppression GCP
  if (gcsPath && GCS_ENABLED) {
    const expectedPrefix = tenantFolder(req.tenantId);
    if (!gcsPath.startsWith(expectedPrefix)) {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    try {
      const token = generateGcsToken(req.user);
      const gcsRes = await undiciFetch(
        `${GCS_SERVICE_URL}/api/storage/delete/${encodeURIComponent(gcsPath)}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (gcsRes.ok) {
        return res.json({ message: 'Fichier supprime de GCP' });
      }
    } catch (err) {
      console.error('[GCS DELETE ERROR]', err.message);
    }
  }

  // Suppression locale
  const localPath = path.join(UPLOAD_DIR, path.basename(filename));
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
    return res.json({ message: 'Fichier supprime localement' });
  }

  res.status(404).json({ error: 'Fichier non trouve' });
});

// Gestion erreur multer
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 50 Mo)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Erreur upload' });
});

module.exports = router;
