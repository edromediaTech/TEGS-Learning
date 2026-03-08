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
    case 'text': {
      // Render HTML content (from WYSIWYG editor) while stripping dangerous tags
      let textContent = d.content || '';
      // Strip MSO/Word/Google markup
      textContent = textContent
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\?xml[\s\S]*?\?>/gi, '')
        .replace(/<\/?\w+:[^>]*>/gi, '')
        .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
        .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|meta|base)[^>]*>/gi, '')
        .replace(/\bon\w+\s*=/gi, '')
        .replace(/<\/?mark[^>]*>/gi, '')
        .replace(/<span\s*>\s*([\s\S]*?)\s*<\/span>/gi, '$1');
      const isHtml = /<[a-z][\s\S]*>/i.test(textContent);
      if (isHtml) {
        return `<div style="line-height:1.7;margin:12px 0">${textContent}</div>`;
      }
      return `<div style="line-height:1.7;white-space:pre-wrap;margin:12px 0">${escapeHtml(d.content)}</div>`;
    }
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
    case 'quiz': {
      const qid = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const correctIdx = (d.options || []).findIndex(o => o.isCorrect);
      return `<div id="${qid}" style="background:${theme.cardBg};border:1px solid #dbeafe;border-radius:8px;padding:20px;margin:16px 0">
        <div style="display:flex;align-items:center;justify-content:space-between"><span style="background:#2563eb;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">QCM</span><div style="display:flex;gap:8px;font-size:11px;color:#6b7280">${d.points ? `<span style="background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:4px">${d.points} pt${d.points > 1 ? 's' : ''}</span>` : ''}${d.duration ? `<span style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${d.duration} min</span>` : ''}</div></div>
        <p style="font-weight:600;margin:12px 0">${escapeHtml(d.question)}</p>
        ${(d.options || []).map((o, i) => `<div onclick="quizSelect('${qid}',${i},${correctIdx})" style="padding:10px 16px;margin:4px 0;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;cursor:pointer;transition:all 0.2s" class="quiz-opt" onmouseover="if(!this.parentNode.dataset.answered)this.style.background='#eff6ff';this.style.borderColor='#93c5fd'" onmouseout="if(!this.parentNode.dataset.answered){this.style.background='';this.style.borderColor='#e5e7eb'}"><strong>${String.fromCharCode(65 + i)}.</strong> ${escapeHtml(o.text)}</div>`).join('')}
        <div class="quiz-result" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:14px"></div>
        ${d.explanation ? `<p class="quiz-explanation" style="display:none;margin-top:8px;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(d.explanation)}</p>` : ''}
        <button onclick="quizReset('${qid}')" class="quiz-retry" style="display:none;margin-top:8px;font-size:13px;color:#2563eb;background:none;border:none;cursor:pointer">Recommencer</button>
      </div>`;
    }
    case 'true_false': {
      const tfid = `tf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const ans = d.answer === true ? 'true' : 'false';
      return `<div id="${tfid}" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:16px 0">
        <span style="background:#d97706;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">VRAI / FAUX</span>
        <p style="font-weight:600;margin:12px 0">${escapeHtml(d.statement)}</p>
        <div style="display:flex;gap:12px">
          <div onclick="tfSelect('${tfid}','true','${ans}')" style="flex:1;text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:6px;font-weight:600;cursor:pointer;transition:all 0.2s" class="tf-btn" onmouseover="if(!this.parentNode.parentNode.dataset.answered)this.style.background='#fef3c7'" onmouseout="if(!this.parentNode.parentNode.dataset.answered)this.style.background=''">Vrai</div>
          <div onclick="tfSelect('${tfid}','false','${ans}')" style="flex:1;text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:6px;font-weight:600;cursor:pointer;transition:all 0.2s" class="tf-btn" onmouseover="if(!this.parentNode.parentNode.dataset.answered)this.style.background='#fef3c7'" onmouseout="if(!this.parentNode.parentNode.dataset.answered)this.style.background=''">Faux</div>
        </div>
        <div class="quiz-result" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:14px"></div>
        ${d.explanation ? `<p class="quiz-explanation" style="display:none;margin-top:8px;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(d.explanation)}</p>` : ''}
        <button onclick="tfReset('${tfid}')" class="quiz-retry" style="display:none;margin-top:8px;font-size:13px;color:#d97706;background:none;border:none;cursor:pointer">Recommencer</button>
      </div>`;
    }
    case 'numeric': {
      const nid = `num_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const tolerance = d.tolerance || 0;
      return `<div id="${nid}" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:20px;margin:16px 0">
        <span style="background:#4f46e5;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">NUMERIQUE</span>
        <p style="font-weight:600;margin:12px 0">${escapeHtml(d.question)}</p>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" step="any" placeholder="Votre reponse" class="num-input" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;width:150px;font-size:14px">
          ${d.unit ? `<span style="font-size:14px">${escapeHtml(d.unit)}</span>` : ''}
          <button onclick="numCheck('${nid}',${d.answer},${tolerance})" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">Valider</button>
        </div>
        <div class="quiz-result" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:14px"></div>
        ${d.explanation ? `<p class="quiz-explanation" style="display:none;margin-top:8px;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(d.explanation)}</p>` : ''}
        <button onclick="numReset('${nid}')" class="quiz-retry" style="display:none;margin-top:8px;font-size:13px;color:#4f46e5;background:none;border:none;cursor:pointer">Recommencer</button>
      </div>`;
    }
    case 'fill_blank': {
      const fbid = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const blanks = [];
      const rawText = d.text || '';
      const regex = /\{\{(.+?)\}\}/g;
      let m;
      while ((m = regex.exec(rawText)) !== null) blanks.push(m[1]);
      let blankIdx = 0;
      const rendered = escapeHtml(rawText).replace(/\{\{(.+?)\}\}/g, () => {
        const idx = blankIdx++;
        return `<input type="text" class="fb-input" data-idx="${idx}" placeholder="..." style="display:inline-block;border:none;border-bottom:2px solid #0d9488;width:100px;text-align:center;margin:0 4px;padding:4px;font-size:inherit;background:transparent;outline:none">`;
      });
      return `<div id="${fbid}" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:20px;margin:16px 0">
        <span style="background:#0d9488;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">TEXTE A TROUS</span>
        <div style="line-height:2.2;margin-top:12px">${rendered}</div>
        <button onclick="fbCheck('${fbid}',${JSON.stringify(blanks)})" style="margin-top:12px;padding:8px 16px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">Valider</button>
        <div class="quiz-result" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:14px"></div>
        ${d.explanation ? `<p class="quiz-explanation" style="display:none;margin-top:8px;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(d.explanation)}</p>` : ''}
        <button onclick="fbReset('${fbid}')" class="quiz-retry" style="display:none;margin-top:8px;font-size:13px;color:#0d9488;background:none;border:none;cursor:pointer">Recommencer</button>
      </div>`;
    }
    case 'matching':
      return `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">APPARIEMENT</span>${d.instruction ? `<p style="margin:12px 0;font-size:14px">${escapeHtml(d.instruction)}</p>` : ''}${(d.pairs || []).map((p, i) => `<div style="display:flex;align-items:center;gap:12px;margin:6px 0"><div style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px">${i + 1}. ${escapeHtml(p.left)}</div><span>&harr;</span><div style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px">${escapeHtml(p.right)}</div></div>`).join('')}</div>`;
    case 'sequence':
      return `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:16px 0"><span style="background:#ea580c;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">SEQUENCE</span>${d.instruction ? `<p style="margin:12px 0;font-size:14px">${escapeHtml(d.instruction)}</p>` : ''}${(d.items || []).map((it, i) => `<div style="padding:8px 16px;margin:4px 0;border:1px solid #e5e7eb;border-radius:6px;font-size:14px"><strong>${i + 1}.</strong> ${escapeHtml(it)}</div>`).join('')}</div>`;
    case 'likert': {
      const lid = `lik_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const labels = { agreement: ['Pas du tout', '', 'Neutre', '', 'Tout a fait'], satisfaction: ['Tres insatisfait', '', 'Neutre', '', 'Tres satisfait'], frequency: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours'] };
      const scaleLabels = labels[d.scale] || labels.agreement;
      return `<div id="${lid}" style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;padding:20px;margin:16px 0">
        <span style="background:#db2777;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">LIKERT</span>
        <p style="font-weight:600;margin:12px 0">${escapeHtml(d.question)}</p>
        <div style="display:flex;justify-content:space-between;gap:4px;text-align:center">
          ${[1,2,3,4,5].map((n, i) => `<div onclick="likertSelect('${lid}',this)" style="flex:1;padding:12px 4px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;transition:all 0.2s" onmouseover="if(!this.dataset.selected)this.style.background='#fce7f3'" onmouseout="if(!this.dataset.selected)this.style.background=''"><div style="font-size:16px;font-weight:bold">${n}</div><div style="font-size:10px;color:#6b7280;margin-top:4px">${scaleLabels[i]}</div></div>`).join('')}
        </div>
      </div>`;
    }
    case 'open_answer': {
      const oaid = `oa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const autoGrade = d.autoGrade === true;
      const answer = d.answer || '';
      const maxWords = d.maxWords || 0;
      return `<div id="${oaid}" style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;padding:20px;margin:16px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span style="background:#0891b2;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">REPONSE COURTE</span>
          <div style="display:flex;gap:8px;font-size:11px;color:#6b7280">
            ${d.points ? `<span style="background:#cffafe;color:#0e7490;padding:2px 6px;border-radius:4px">${d.points} pt${d.points > 1 ? 's' : ''}</span>` : ''}
            ${d.duration ? `<span style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${d.duration} min</span>` : ''}
          </div>
        </div>
        <p style="font-weight:600;margin:0 0 12px">${escapeHtml(d.question)}</p>
        <textarea class="oa-input" rows="${d.rows || 3}" placeholder="${maxWords ? 'Reponse (max ' + maxWords + ' mots)...' : 'Votre reponse...'}" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;resize:none;font-family:inherit"></textarea>
        ${maxWords ? `<div class="oa-wordcount" style="text-align:right;font-size:11px;color:#9ca3af;margin-top:4px">0 / ${maxWords} mots</div>` : ''}
        <button onclick="oaCheck('${oaid}',${autoGrade ? 'true' : 'false'},${JSON.stringify(escapeHtml(answer))},${maxWords})" style="margin-top:8px;padding:8px 16px;background:#0891b2;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">Valider</button>
        <div class="quiz-result" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:14px"></div>
        ${d.explanation ? `<p class="quiz-explanation" style="display:none;margin-top:8px;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(d.explanation)}</p>` : ''}
        <button onclick="oaReset('${oaid}')" class="quiz-retry" style="display:none;margin-top:8px;font-size:13px;color:#0891b2;background:none;border:none;cursor:pointer">Recommencer</button>
      </div>`;
    }
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

    // Quiz (QCM) interactivity
    function quizSelect(id, selected, correct) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      el.dataset.answered = '1';
      var opts = el.querySelectorAll('.quiz-opt');
      opts.forEach(function(o, i) {
        o.style.cursor = 'default';
        if (i === correct) { o.style.background = '#dcfce7'; o.style.borderColor = '#4ade80'; }
        else if (i === selected) { o.style.background = '#fee2e2'; o.style.borderColor = '#f87171'; }
        else { o.style.opacity = '0.5'; }
      });
      var result = el.querySelector('.quiz-result');
      result.style.display = 'block';
      if (selected === correct) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Bonne reponse !'; }
      else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.textContent = 'Mauvaise reponse.'; }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
    }
    function quizReset(id) {
      var el = document.getElementById(id);
      delete el.dataset.answered;
      el.querySelectorAll('.quiz-opt').forEach(function(o) { o.style.background = ''; o.style.borderColor = '#e5e7eb'; o.style.opacity = '1'; o.style.cursor = 'pointer'; });
      el.querySelector('.quiz-result').style.display = 'none';
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'none';
      el.querySelector('.quiz-retry').style.display = 'none';
    }

    // True/False interactivity
    function tfSelect(id, selected, correct) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      el.dataset.answered = '1';
      var btns = el.querySelectorAll('.tf-btn');
      btns.forEach(function(b, i) {
        b.style.cursor = 'default';
        var val = i === 0 ? 'true' : 'false';
        if (val === correct) { b.style.background = '#dcfce7'; b.style.borderColor = '#4ade80'; b.style.color = '#166534'; }
        else if (val === selected) { b.style.background = '#fee2e2'; b.style.borderColor = '#f87171'; b.style.color = '#991b1b'; }
        else { b.style.opacity = '0.5'; }
      });
      var result = el.querySelector('.quiz-result');
      result.style.display = 'block';
      if (selected === correct) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Bonne reponse !'; }
      else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.textContent = 'Mauvaise reponse.'; }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
    }
    function tfReset(id) {
      var el = document.getElementById(id);
      delete el.dataset.answered;
      el.querySelectorAll('.tf-btn').forEach(function(b) { b.style.background = ''; b.style.borderColor = '#e5e7eb'; b.style.color = ''; b.style.opacity = '1'; b.style.cursor = 'pointer'; });
      el.querySelector('.quiz-result').style.display = 'none';
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'none';
      el.querySelector('.quiz-retry').style.display = 'none';
    }

    // Numeric interactivity
    function numCheck(id, answer, tolerance) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      var input = el.querySelector('.num-input');
      var val = parseFloat(input.value);
      if (isNaN(val)) return;
      el.dataset.answered = '1';
      input.disabled = true;
      var correct = Math.abs(val - answer) <= tolerance;
      var result = el.querySelector('.quiz-result');
      result.style.display = 'block';
      if (correct) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Bonne reponse !'; input.style.borderColor = '#4ade80'; }
      else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.textContent = 'Mauvaise reponse. La reponse est ' + answer + '.'; input.style.borderColor = '#f87171'; }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
    }
    function numReset(id) {
      var el = document.getElementById(id);
      delete el.dataset.answered;
      var input = el.querySelector('.num-input');
      input.value = ''; input.disabled = false; input.style.borderColor = '#d1d5db';
      el.querySelector('.quiz-result').style.display = 'none';
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'none';
      el.querySelector('.quiz-retry').style.display = 'none';
    }

    // Fill in the blank interactivity
    function fbCheck(id, answers) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      el.dataset.answered = '1';
      var inputs = el.querySelectorAll('.fb-input');
      var allCorrect = true;
      inputs.forEach(function(inp) {
        var idx = parseInt(inp.dataset.idx);
        var correct = (inp.value || '').trim().toLowerCase() === (answers[idx] || '').trim().toLowerCase();
        inp.disabled = true;
        if (correct) { inp.style.borderColor = '#4ade80'; inp.style.background = '#dcfce7'; }
        else { inp.style.borderColor = '#f87171'; inp.style.background = '#fee2e2'; allCorrect = false; }
      });
      var result = el.querySelector('.quiz-result');
      result.style.display = 'block';
      if (allCorrect) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Tout est correct !'; }
      else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.innerHTML = 'Certaines reponses sont incorrectes. Reponses : ' + answers.map(function(a, i) { return (i+1) + '. <strong>' + a + '</strong>'; }).join(', '); }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
    }
    function fbReset(id) {
      var el = document.getElementById(id);
      delete el.dataset.answered;
      el.querySelectorAll('.fb-input').forEach(function(inp) { inp.value = ''; inp.disabled = false; inp.style.borderColor = '#0d9488'; inp.style.background = 'transparent'; });
      el.querySelector('.quiz-result').style.display = 'none';
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'none';
      el.querySelector('.quiz-retry').style.display = 'none';
    }

    // Open Answer interactivity
    function oaCheck(id, autoGrade, answer, maxWords) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      var ta = el.querySelector('.oa-input');
      var val = (ta.value || '').trim();
      if (!val) return;
      if (maxWords > 0) {
        var wc = val.split(/\\s+/).length;
        if (wc > maxWords) return;
      }
      el.dataset.answered = '1';
      ta.disabled = true;
      var result = el.querySelector('.quiz-result');
      result.style.display = 'block';
      if (autoGrade) {
        var correct = val.toLowerCase() === answer.toLowerCase();
        if (correct) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Bonne reponse !'; }
        else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.innerHTML = 'Mauvaise reponse. Reponse attendue : <strong>' + answer + '</strong>'; }
      } else {
        result.style.background = '#dbeafe'; result.style.color = '#1e40af'; result.textContent = 'Reponse enregistree. Cette question sera evaluee manuellement.';
      }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
    }
    function oaReset(id) {
      var el = document.getElementById(id);
      delete el.dataset.answered;
      var ta = el.querySelector('.oa-input');
      ta.value = ''; ta.disabled = false;
      el.querySelector('.quiz-result').style.display = 'none';
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'none';
      el.querySelector('.quiz-retry').style.display = 'none';
      var wc = el.querySelector('.oa-wordcount'); if (wc) wc.textContent = '0 / ' + wc.textContent.split('/')[1].trim();
    }

    // Word count for open answer textareas
    document.addEventListener('input', function(e) {
      if (e.target.classList && e.target.classList.contains('oa-input')) {
        var parent = e.target.closest('[id]');
        var wc = parent ? parent.querySelector('.oa-wordcount') : null;
        if (wc) {
          var val = (e.target.value || '').trim();
          var count = val ? val.split(/\\s+/).length : 0;
          var max = wc.textContent.split('/')[1].trim().split(' ')[0];
          wc.textContent = count + ' / ' + max + ' mots';
          wc.style.color = count > parseInt(max) ? '#ef4444' : '#9ca3af';
        }
      }
    });

    // Likert interactivity
    function likertSelect(id, clicked) {
      var el = document.getElementById(id);
      var items = clicked.parentNode.children;
      for (var i = 0; i < items.length; i++) {
        items[i].style.background = ''; items[i].style.borderColor = '#e5e7eb'; delete items[i].dataset.selected;
      }
      clicked.style.background = '#fce7f3'; clicked.style.borderColor = '#ec4899'; clicked.dataset.selected = '1';
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
