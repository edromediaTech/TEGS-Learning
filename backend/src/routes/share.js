const express = require('express');
const Module = require('../models/Module');

const router = express.Router();

// Definitions des themes CSS
const THEMES = {
  ddene: {
    name: 'DDENE Officiel',
    primary: '#1e40af',
    primaryLight: '#3b82f6',
    primaryDark: '#1e3a8a',
    secondary: '#f8fafc',
    accent: '#2563eb',
    headerBg: '#1e40af',
    headerText: '#ffffff',
    bodyBg: '#f8fafc',
    bodyText: '#1e293b',
    cardBg: '#ffffff',
    font: 'system-ui, sans-serif',
  },
  nature: {
    name: 'Nature',
    primary: '#166534',
    primaryLight: '#22c55e',
    primaryDark: '#14532d',
    secondary: '#f0fdf4',
    accent: '#16a34a',
    headerBg: '#166534',
    headerText: '#ffffff',
    bodyBg: '#fefce8',
    bodyText: '#1c1917',
    cardBg: '#ffffff',
    font: 'Georgia, serif',
  },
  contrast: {
    name: 'Contraste',
    primary: '#fbbf24',
    primaryLight: '#fde68a',
    primaryDark: '#d97706',
    secondary: '#1e293b',
    accent: '#f59e0b',
    headerBg: '#0f172a',
    headerText: '#fbbf24',
    bodyBg: '#1e293b',
    bodyText: '#f1f5f9',
    cardBg: '#334155',
    font: 'system-ui, sans-serif',
  },
  ocean: {
    name: 'Ocean',
    primary: '#0891b2',
    primaryLight: '#22d3ee',
    primaryDark: '#155e75',
    secondary: '#ecfeff',
    accent: '#06b6d4',
    headerBg: '#164e63',
    headerText: '#ffffff',
    bodyBg: '#ecfeff',
    bodyText: '#134e4a',
    cardBg: '#ffffff',
    font: 'system-ui, sans-serif',
  },
  sunset: {
    name: 'Coucher de soleil',
    primary: '#dc2626',
    primaryLight: '#f87171',
    primaryDark: '#991b1b',
    secondary: '#fff7ed',
    accent: '#ea580c',
    headerBg: '#7c2d12',
    headerText: '#ffffff',
    bodyBg: '#fff7ed',
    bodyText: '#1c1917',
    cardBg: '#ffffff',
    font: 'system-ui, sans-serif',
  },
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderBlock(block, theme) {
  const d = block.data || {};
  switch (block.type) {
    case 'heading': {
      const level = d.level || 1;
      const sizes = { 1: '28px', 2: '22px', 3: '18px' };
      return `<h${level} style="font-size:${sizes[level]};font-weight:bold;margin:16px 0 8px;color:${theme.bodyText}">${escapeHtml(d.text)}</h${level}>`;
    }
    case 'text':
      return `<div style="line-height:1.7;white-space:pre-wrap;margin:12px 0">${escapeHtml(d.content)}</div>`;
    case 'separator':
      if (d.style === 'space') return '<div style="height:32px"></div>';
      return `<hr style="border-style:${d.style || 'solid'};border-color:#d1d5db;margin:16px 0">`;
    case 'image':
      if (!d.url) return '';
      const maxW = d.size === 'small' ? '50%' : d.size === 'medium' ? '75%' : '100%';
      return `<figure style="max-width:${maxW};margin:16px auto"><img src="${escapeHtml(d.url)}" alt="${escapeHtml(d.alt)}" style="width:100%;border-radius:8px">${d.caption ? `<figcaption style="text-align:center;font-size:13px;color:#6b7280;margin-top:6px">${escapeHtml(d.caption)}</figcaption>` : ''}</figure>`;
    case 'text_image': {
      const dir = d.layout === 'text-right' ? 'row-reverse' : 'row';
      return `<div style="display:flex;gap:24px;flex-direction:${dir};align-items:flex-start;margin:16px 0"><div style="flex:1;white-space:pre-wrap">${escapeHtml(d.text)}</div><div style="flex:1">${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" style="width:100%;border-radius:8px">` : ''}</div></div>`;
    }
    case 'video':
      if (!d.url) return '';
      const ytMatch = d.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) return `<div style="position:relative;padding-bottom:56.25%;height:0;margin:16px 0"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px" frameborder="0" allowfullscreen></iframe></div>`;
      return `<video src="${escapeHtml(d.url)}" controls style="width:100%;border-radius:8px;margin:16px 0"></video>`;
    case 'audio':
      if (!d.url) return '';
      return `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">${d.title ? `<p style="font-weight:600;margin-bottom:8px">${escapeHtml(d.title)}</p>` : ''}<audio src="${escapeHtml(d.url)}" controls style="width:100%"></audio></div>`;
    case 'pdf':
      if (!d.url) return '';
      return `<div style="margin:16px 0">${d.title ? `<p style="font-weight:600;margin-bottom:8px">${escapeHtml(d.title)}</p>` : ''}<iframe src="${escapeHtml(d.url)}" style="width:100%;height:${d.height || 500}px;border:1px solid #e5e7eb;border-radius:8px" frameborder="0"></iframe></div>`;
    case 'embed':
      if (!d.url) return '';
      return `<div style="margin:16px auto;max-width:${d.width || 800}px">${d.title ? `<p style="font-weight:600;margin-bottom:8px">${escapeHtml(d.title)}</p>` : ''}<iframe src="${escapeHtml(d.url)}" width="${d.width || 800}" height="${d.height || 500}" style="width:100%;border:1px solid #e5e7eb;border-radius:8px" frameborder="0" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div>`;
    case 'media':
      if (!d.url) return '';
      if (d.mediaType === 'video') return `<video src="${escapeHtml(d.url)}" controls style="width:100%;border-radius:8px;margin:16px 0"></video>`;
      return `<img src="${escapeHtml(d.url)}" alt="${escapeHtml(d.caption)}" style="max-width:100%;border-radius:8px;margin:16px 0">`;
    case 'quiz':
      return `<div style="background:${theme.cardBg};border:1px solid #dbeafe;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#2563eb;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">QCM</span><p style="font-weight:600;margin:12px 0">${escapeHtml(d.question)}</p>${(d.options || []).map((o, i) => `<div style="padding:8px 16px;margin:4px 0;border:1px solid #e5e7eb;border-radius:6px;font-size:14px"><strong>${String.fromCharCode(65 + i)}.</strong> ${escapeHtml(o.text)}</div>`).join('')}</div>`;
    case 'true_false':
      return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#d97706;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">VRAI / FAUX</span><p style="font-weight:600;margin:12px 0">${escapeHtml(d.statement)}</p><div style="display:flex;gap:12px"><div style="flex:1;text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:6px;font-weight:600">Vrai</div><div style="flex:1;text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:6px;font-weight:600">Faux</div></div></div>`;
    case 'numeric':
      return `<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#4f46e5;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">NUMERIQUE</span><p style="font-weight:600;margin:12px 0">${escapeHtml(d.question)}</p><div style="display:flex;align-items:center;gap:8px"><input type="number" placeholder="Reponse" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;width:150px" disabled>${d.unit ? `<span>${escapeHtml(d.unit)}</span>` : ''}</div></div>`;
    case 'fill_blank': {
      const rendered = escapeHtml(d.text || '').replace(/\{\{(.+?)\}\}/g, '<span style="display:inline-block;border-bottom:2px solid #0d9488;width:80px;text-align:center;margin:0 4px">___</span>');
      return `<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#0d9488;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">TEXTE A TROUS</span><div style="line-height:2;margin-top:12px">${rendered}</div></div>`;
    }
    case 'matching':
      return `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">APPARIEMENT</span>${d.instruction ? `<p style="margin:12px 0;font-size:14px">${escapeHtml(d.instruction)}</p>` : ''}${(d.pairs || []).map((p, i) => `<div style="display:flex;align-items:center;gap:12px;margin:6px 0"><div style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px">${i + 1}. ${escapeHtml(p.left)}</div><span>&harr;</span><div style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px">${escapeHtml(p.right)}</div></div>`).join('')}</div>`;
    case 'sequence':
      return `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#ea580c;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">SEQUENCE</span>${d.instruction ? `<p style="margin:12px 0;font-size:14px">${escapeHtml(d.instruction)}</p>` : ''}${(d.items || []).map((it, i) => `<div style="padding:8px 16px;margin:4px 0;border:1px solid #e5e7eb;border-radius:6px;font-size:14px"><strong>${i + 1}.</strong> ${escapeHtml(it)}</div>`).join('')}</div>`;
    case 'likert':
      return `<div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#db2777;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">LIKERT</span><p style="font-weight:600;margin:12px 0">${escapeHtml(d.question)}</p><div style="display:flex;justify-content:space-between;gap:4px;font-size:11px;text-align:center">${['1', '2', '3', '4', '5'].map(n => `<div style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px">${n}</div>`).join('')}</div></div>`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// GET /api/modules/public/:shareToken
// Lecteur public du module partage (pas d'authentification requise)
// ---------------------------------------------------------------------------
router.get('/public/:shareToken', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      shareToken: req.params.shareToken,
      shareEnabled: true,
    });

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable ou partage desactive' });
    }

    const theme = THEMES[mod.theme] || THEMES.ddene;

    // Generer le HTML du lecteur avec le theme
    const sections = mod.sections || [];
    let nav = '';
    let content = '';

    sections.forEach((section, si) => {
      nav += `<div style="padding:4px 12px;font-size:11px;font-weight:bold;color:${theme.headerText};opacity:0.7;text-transform:uppercase;margin-top:${si > 0 ? '12px' : '0'}">${escapeHtml(section.title)}</div>`;
      (section.screens || []).forEach((screen, sci) => {
        const screenIdx = `s${si}_${sci}`;
        nav += `<a href="#" onclick="showScreen('${screenIdx}');return false" id="nav-${screenIdx}" style="display:block;padding:8px 12px;margin:2px 8px;border-radius:6px;font-size:13px;color:${theme.headerText};text-decoration:none;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="if(!this.classList.contains('active'))this.style.background='transparent'">${escapeHtml(screen.title)}</a>`;

        let blocksHtml = '';
        (screen.contentBlocks || []).sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((block) => {
          blocksHtml += renderBlock(block, theme);
        });
        if (!blocksHtml) blocksHtml = '<p style="text-align:center;color:#9ca3af;padding:32px 0">Cet ecran est vide.</p>';
        content += `<div id="screen-${screenIdx}" class="screen-panel" style="display:none"><h2 style="font-size:20px;font-weight:bold;margin-bottom:16px;color:${theme.bodyText}">${escapeHtml(screen.title)}</h2>${blocksHtml}</div>`;
      });
    });

    res.set('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="${mod.language || 'fr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(mod.title)} - TEGS-Learning</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${theme.font}; background: ${theme.bodyBg}; color: ${theme.bodyText}; }
    .layout { display: flex; height: 100vh; }
    .sidebar { width: 260px; background: ${theme.headerBg}; overflow-y: auto; flex-shrink: 0; }
    .sidebar-header { padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .sidebar-header h1 { font-size: 16px; color: ${theme.headerText}; font-weight: bold; }
    .sidebar-header p { font-size: 12px; color: ${theme.headerText}; opacity: 0.6; margin-top: 4px; }
    .sidebar-nav { padding: 8px 0; }
    .main { flex: 1; overflow-y: auto; padding: 32px; }
    .main-inner { max-width: 800px; margin: 0 auto; background: ${theme.cardBg}; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .nav-active { background: rgba(255,255,255,0.2) !important; font-weight: 600 !important; }
    .footer { text-align: center; padding: 16px; font-size: 11px; opacity: 0.5; margin-top: 24px; }
    @media (max-width: 768px) {
      .layout { flex-direction: column; }
      .sidebar { width: 100%; max-height: 200px; }
      .main { padding: 16px; }
      .main-inner { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <h1>${escapeHtml(mod.title)}</h1>
        <p>${escapeHtml(mod.description || '')}</p>
      </div>
      <div class="sidebar-nav">${nav}</div>
    </div>
    <div class="main">
      <div class="main-inner">
        <div id="welcome-screen">
          <div style="text-align:center;padding:48px 0">
            <h2 style="font-size:24px;font-weight:bold;margin-bottom:12px">${escapeHtml(mod.title)}</h2>
            <p style="color:#6b7280;margin-bottom:24px">${escapeHtml(mod.description || 'Bienvenue dans ce module de formation.')}</p>
            <p style="font-size:14px;color:#9ca3af">Cliquez sur un ecran dans le menu pour commencer.</p>
          </div>
        </div>
        ${content}
      </div>
      <div class="footer">TEGS-Learning &middot; DDENE Haiti</div>
    </div>
  </div>
  <script>
    let currentNav = null;
    function showScreen(id) {
      document.getElementById('welcome-screen').style.display = 'none';
      document.querySelectorAll('.screen-panel').forEach(el => el.style.display = 'none');
      const panel = document.getElementById('screen-' + id);
      if (panel) panel.style.display = 'block';
      if (currentNav) { currentNav.classList.remove('nav-active'); currentNav.style.background = 'transparent'; }
      currentNav = document.getElementById('nav-' + id);
      if (currentNav) { currentNav.classList.add('nav-active'); currentNav.style.background = 'rgba(255,255,255,0.2)'; }
    }
  </script>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/modules/public/:shareToken/json
// Retourne les donnees JSON du module (pour integration iframe avancee)
// ---------------------------------------------------------------------------
router.get('/public/:shareToken/json', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      shareToken: req.params.shareToken,
      shareEnabled: true,
    }).lean();

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable ou partage desactive' });
    }

    // Ne pas exposer les IDs internes sensibles
    res.json({
      title: mod.title,
      description: mod.description,
      language: mod.language,
      theme: mod.theme,
      sections: (mod.sections || []).map(s => ({
        title: s.title,
        screens: (s.screens || []).map(sc => ({
          title: sc.title,
          contentBlocks: (sc.contentBlocks || []).map(b => ({
            type: b.type,
            order: b.order,
            data: b.data,
          })),
        })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

module.exports.THEMES = THEMES;
