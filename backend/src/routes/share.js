const express = require('express');
const Module = require('../models/Module');
const LiveSession = require('../models/LiveSession');

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

/**
 * Render a waiting/closed gate page for Live evaluation mode.
 */
function renderLiveGatePage(mod, theme, status) {
  const title = escapeHtml(mod.title);
  const isWaiting = status === 'waiting';
  const startTime = mod.liveStartTime ? new Date(mod.liveStartTime).toISOString() : '';
  const endTime = mod.liveEndTime ? new Date(mod.liveEndTime).toISOString() : '';

  const message = isWaiting
    ? 'Cet examen n\'a pas encore commence.'
    : 'Cet examen est termine.';
  const subMessage = isWaiting
    ? `Ouverture prevue le <strong id="start-date"></strong>`
    : `L'examen s'est termine le <strong id="end-date"></strong>`;
  const iconColor = isWaiting ? '#3b82f6' : '#ef4444';
  const icon = isWaiting ? '&#9201;' : '&#10006;';
  const badgeColor = isWaiting ? '#dbeafe' : '#fee2e2';
  const badgeTextColor = isWaiting ? '#1e40af' : '#991b1b';
  const badgeLabel = isWaiting ? 'EN ATTENTE' : 'TERMINE';

  return `<!DOCTYPE html>
<html lang="${mod.language || 'fr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - TEGS-Learning</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${theme.font}; background: ${theme.bodyBg}; color: ${theme.bodyText}; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .gate-card { background: ${theme.cardBg}; border-radius: 16px; padding: 48px; text-align: center; max-width: 500px; width: 90%; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .gate-icon { font-size: 48px; margin-bottom: 16px; color: ${iconColor}; }
    .gate-badge { display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; background: ${badgeColor}; color: ${badgeTextColor}; margin-bottom: 16px; }
    .gate-title { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
    .gate-message { font-size: 16px; color: #6b7280; margin-bottom: 12px; }
    .gate-sub { font-size: 14px; color: #9ca3af; }
    .gate-sub strong { color: ${theme.bodyText}; }
    #countdown { margin-top: 24px; font-size: 32px; font-weight: bold; font-family: monospace; color: ${theme.primary || '#1e40af'}; }
    .gate-footer { margin-top: 32px; font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="gate-card">
    <div class="gate-icon">${icon}</div>
    <div class="gate-badge">${badgeLabel}</div>
    <div class="gate-title">${title}</div>
    <p class="gate-message">${message}</p>
    <p class="gate-sub">${subMessage}</p>
    ${isWaiting ? '<div id="countdown"></div>' : ''}
    <div class="gate-footer">TEGS-Learning &bull; Mode Examen en direct</div>
  </div>
  <script>
    (function() {
      var startISO = '${startTime}';
      var endISO = '${endTime}';
      var startEl = document.getElementById('start-date');
      var endEl = document.getElementById('end-date');
      var fmt = function(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          + ' a ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      };
      if (startEl) startEl.textContent = fmt(startISO);
      if (endEl) endEl.textContent = fmt(endISO);

      ${isWaiting ? `
      var cdEl = document.getElementById('countdown');
      if (cdEl && startISO) {
        function tick() {
          var now = new Date();
          var diff = Math.max(0, Math.floor((new Date(startISO) - now) / 1000));
          if (diff <= 0) { location.reload(); return; }
          var h = Math.floor(diff / 3600);
          var m = Math.floor((diff % 3600) / 60);
          var s = diff % 60;
          cdEl.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        }
        tick();
        setInterval(tick, 1000);
      }` : ''}
    })();
  </script>
</body>
</html>`;
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
      return `<div id="${qid}" class="question-block" style="background:${theme.cardBg};border:1px solid #dbeafe;border-radius:8px;padding:20px;margin:16px 0">
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
      return `<div id="${tfid}" class="question-block" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:16px 0">
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
      return `<div id="${nid}" class="question-block" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:20px;margin:16px 0">
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
      return `<div id="${fbid}" class="question-block" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:20px;margin:16px 0">
        <span style="background:#0d9488;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">TEXTE A TROUS</span>
        <div style="line-height:2.2;margin-top:12px">${rendered}</div>
        <button onclick="fbCheck('${fbid}',${JSON.stringify(blanks)})" style="margin-top:12px;padding:8px 16px;background:#0d9488;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">Valider</button>
        <div class="quiz-result" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:14px"></div>
        ${d.explanation ? `<p class="quiz-explanation" style="display:none;margin-top:8px;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(d.explanation)}</p>` : ''}
        <button onclick="fbReset('${fbid}')" class="quiz-retry" style="display:none;margin-top:8px;font-size:13px;color:#0d9488;background:none;border:none;cursor:pointer">Recommencer</button>
      </div>`;
    }
    case 'matching': {
      const mid = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const pairs = d.pairs || [];
      // Shuffle the right side options for the dropdowns
      const rightOptions = pairs.map((p, i) => ({ text: p.right, idx: i }));
      return `<div id="${mid}" class="question-block" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:20px;margin:16px 0">
        <div style="display:flex;align-items:center;justify-content:space-between"><span style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">APPARIEMENT</span><div style="display:flex;gap:8px;font-size:11px;color:#6b7280">${d.points ? `<span style="background:#ede9fe;color:#6d28d9;padding:2px 6px;border-radius:4px">${d.points} pt${d.points > 1 ? 's' : ''}</span>` : ''}${d.duration ? `<span style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${d.duration} min</span>` : ''}</div></div>
        ${d.instruction ? `<p style="margin:12px 0;font-size:14px">${escapeHtml(d.instruction)}</p>` : ''}
        ${pairs.map((p, i) => `<div style="display:flex;align-items:center;gap:12px;margin:6px 0" class="match-row">
          <div style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px">${i + 1}. ${escapeHtml(p.left)}</div>
          <span>&harr;</span>
          <select class="match-select" data-correct="${i}" style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;cursor:pointer">
            <option value="">-- Choisir --</option>
            ${rightOptions.map(r => `<option value="${r.idx}">${escapeHtml(r.text)}</option>`).join('')}
          </select>
        </div>`).join('')}
        <button onclick="matchCheck('${mid}',${pairs.length})" style="margin-top:12px;padding:8px 16px;background:#7c3aed;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">Valider</button>
        <div class="quiz-result" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:14px"></div>
        ${d.explanation ? `<p class="quiz-explanation" style="display:none;margin-top:8px;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(d.explanation)}</p>` : ''}
        <button onclick="matchReset('${mid}')" class="quiz-retry" style="display:none;margin-top:8px;font-size:13px;color:#7c3aed;background:none;border:none;cursor:pointer">Recommencer</button>
      </div>`;
    }
    case 'sequence': {
      const seqid = `seq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const items = d.items || [];
      // Shuffle items for display (store correct order as data attributes)
      const shuffled = items.map((it, i) => ({ text: it, correctIdx: i })).sort(() => Math.random() - 0.5);
      return `<div id="${seqid}" class="question-block" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:16px 0">
        <div style="display:flex;align-items:center;justify-content:space-between"><span style="background:#ea580c;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">SEQUENCE</span><div style="display:flex;gap:8px;font-size:11px;color:#6b7280">${d.points ? `<span style="background:#ffedd5;color:#c2410c;padding:2px 6px;border-radius:4px">${d.points} pt${d.points > 1 ? 's' : ''}</span>` : ''}${d.duration ? `<span style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${d.duration} min</span>` : ''}</div></div>
        ${d.instruction ? `<p style="margin:12px 0;font-size:14px">${escapeHtml(d.instruction)}</p>` : ''}
        <div class="seq-items">
          ${shuffled.map((it) => `<div class="seq-item" data-correct="${it.correctIdx}" style="display:flex;align-items:center;gap:8px;padding:8px 16px;margin:4px 0;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;background:white;cursor:grab">
            <span class="seq-num" style="font-weight:bold;color:#9ca3af;min-width:20px"></span>
            <span style="flex:1">${escapeHtml(it.text)}</span>
            <button onclick="seqMove('${seqid}',this.parentNode,-1)" style="background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:2px 4px" title="Monter">&uarr;</button>
            <button onclick="seqMove('${seqid}',this.parentNode,1)" style="background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:2px 4px" title="Descendre">&darr;</button>
          </div>`).join('')}
        </div>
        <button onclick="seqCheck('${seqid}')" style="margin-top:12px;padding:8px 16px;background:#ea580c;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">Valider</button>
        <div class="quiz-result" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:14px"></div>
        ${d.explanation ? `<p class="quiz-explanation" style="display:none;margin-top:8px;font-size:13px;color:#6b7280;font-style:italic">${escapeHtml(d.explanation)}</p>` : ''}
        <button onclick="seqReset('${seqid}')" class="quiz-retry" style="display:none;margin-top:8px;font-size:13px;color:#ea580c;background:none;border:none;cursor:pointer">Recommencer</button>
      </div>`;
    }
    case 'likert': {
      const lid = `lik_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const labels = { agreement: ['Pas du tout', '', 'Neutre', '', 'Tout a fait'], satisfaction: ['Tres insatisfait', '', 'Neutre', '', 'Tres satisfait'], frequency: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours'] };
      const scaleLabels = labels[d.scale] || labels.agreement;
      return `<div id="${lid}" class="question-block" style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;padding:20px;margin:16px 0">
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
      return `<div id="${oaid}" class="question-block" style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;padding:20px;margin:16px 0">
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
    case 'callout': {
      const variantColors = {
        info: { bg: '#eff6ff', border: '#60a5fa', text: '#1e3a5f' },
        success: { bg: '#f0fdf4', border: '#4ade80', text: '#166534' },
        warning: { bg: '#fffbeb', border: '#fbbf24', text: '#78350f' },
        danger: { bg: '#fef2f2', border: '#f87171', text: '#991b1b' },
        note: { bg: '#f9fafb', border: '#9ca3af', text: '#374151' },
        tip: { bg: '#ecfdf5', border: '#34d399', text: '#065f46' },
        quote: { bg: '#faf5ff', border: '#a78bfa', text: '#581c87' },
      };
      const variantIcons = { info: '\u2139\uFE0F', success: '\u2705', warning: '\u26A0\uFE0F', danger: '\u274C', note: '\uD83D\uDCDD', tip: '\uD83D\uDCA1', quote: '\u201C' };
      const variant = d.variant || 'info';
      const colors = variant === 'custom'
        ? { bg: d.bgColor || '#eff6ff', border: d.borderColor || '#3b82f6', text: d.textColor || '#1e3a5f' }
        : (variantColors[variant] || variantColors.info);
      const icon = variantIcons[variant] || '';
      const borderStyle = d.borderStyle || 'left';
      const borderCss = borderStyle === 'left'
        ? `border-left:4px solid ${colors.border}`
        : borderStyle === 'full'
        ? `border:2px solid ${colors.border}`
        : '';
      const cid = d.collapsible ? `callout_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` : '';
      let html = `<div ${cid ? `id="${cid}"` : ''} style="background:${colors.bg};color:${colors.text};${borderCss};border-radius:8px;padding:16px;margin:16px 0${d.collapsible ? ';cursor:pointer' : ''}"${d.collapsible ? ` onclick="var c=document.getElementById('${cid}_body');c.style.display=c.style.display==='none'?'block':'none';var a=document.getElementById('${cid}_arrow');a.textContent=c.style.display==='none'?'\\u25B6':'\\u25BC'"` : ''}>`;
      if (d.title) {
        html += `<div style="font-weight:bold;${d.collapsible ? 'display:flex;align-items:center;justify-content:space-between' : 'margin-bottom:6px'}">`;
        html += `<span>${icon ? icon + ' ' : ''}${escapeHtml(d.title)}</span>`;
        if (d.collapsible) html += `<span id="${cid}_arrow" style="font-size:12px;margin-left:8px">\u25BC</span>`;
        html += '</div>';
      }
      html += `<div ${cid ? `id="${cid}_body"` : ''} style="white-space:pre-wrap${d.title ? ';margin-top:6px' : ''}">${escapeHtml(d.content)}</div>`;
      html += '</div>';
      return html;
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

    // === Live mode time-window gating ===
    if (mod.evaluationType === 'live') {
      const now = new Date();
      if (mod.liveStartTime && now < new Date(mod.liveStartTime)) {
        return res.send(renderLiveGatePage(mod, theme, 'waiting'));
      }
      if (mod.liveEndTime && now > new Date(mod.liveEndTime)) {
        return res.send(renderLiveGatePage(mod, theme, 'closed'));
      }
    }

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

    // Compute total timer for the module
    let totalTimerMinutes = 0;
    let totalTimerSeconds = 0; // Used for live mode precision
    const isLiveMode = mod.evaluationType === 'live';

    if (isLiveMode && mod.liveEndTime) {
      // Live mode: timer = remaining time until liveEndTime
      const remainingSecs = Math.max(0, Math.floor((new Date(mod.liveEndTime) - new Date()) / 1000));
      totalTimerSeconds = remainingSecs;
      totalTimerMinutes = Math.ceil(remainingSecs / 60);
    } else if (mod.globalTimeLimit && mod.globalTimeLimit > 0) {
      totalTimerMinutes = mod.globalTimeLimit;
      totalTimerSeconds = totalTimerMinutes * 60;
    } else {
      for (const section of mod.sections || []) {
        for (const screen of section.screens || []) {
          for (const block of screen.contentBlocks || []) {
            const bd = block.data || {};
            if (['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'likert', 'open_answer'].includes(block.type)) {
              if (bd.duration && bd.duration > 0) totalTimerMinutes += bd.duration;
            }
          }
        }
      }
      totalTimerSeconds = totalTimerMinutes * 60;
    }

    // Count questions for tracking
    let questionCount = 0;
    const questionMeta = [];
    for (const section of mod.sections || []) {
      for (const screen of section.screens || []) {
        for (const block of screen.contentBlocks || []) {
          if (['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'open_answer'].includes(block.type)) {
            questionCount++;
            const bd = block.data || {};
            questionMeta.push({
              type: block.type,
              text: bd.question || bd.statement || bd.text || '',
              points: bd.points || 0,
              duration: bd.duration || 0,
            });
          }
        }
      }
    }

    // Compute effective surveillance for live mode
    const effectiveSurveillance = isLiveMode ? 'strict' : (mod.surveillanceMode || 'light');
    const effectiveSettings = isLiveMode
      ? { fullscreen: true, antiCopy: true, blurDetection: true, maxBlurCount: 3, autoSubmitOnExceed: true }
      : (mod.strictSettings || {});
    const survSettingsStr = JSON.stringify(effectiveSettings);
    const isContestMode = isLiveMode && mod.contestMode === true;
    const proctoringMode = mod.proctoring || 'none';
    const snapshotInterval = mod.snapshotInterval || 30;

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
    /* Global Timer */
    #global-timer { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #e5e7eb; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; }
    #global-timer .timer-display { font-family: monospace; font-size: 18px; font-weight: bold; }
    #global-timer .timer-display.warning { color: #f59e0b; }
    #global-timer .timer-display.danger { color: #ef4444; animation: pulse 1s infinite; }
    #global-timer .progress-bar { width: 200px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
    #global-timer .progress-fill { height: 100%; border-radius: 3px; transition: width 1s linear; background: #3b82f6; }
    /* Live banner */
    #live-banner + #global-timer { top: 0; }
    /* Student form */
    #student-form { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    #student-form input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; width: 100%; }
    /* Submit bar */
    #submit-bar { background: ${theme.headerBg}; padding: 16px 20px; border-radius: 8px; margin-top: 24px; text-align: center; }
    #submit-bar button { background: #22c55e; color: white; border: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; }
    #submit-bar button:hover { background: #16a34a; }
    #submit-bar button:disabled { opacity: 0.5; cursor: not-allowed; }
    /* Result banner */
    #result-banner { display: none; margin-top: 20px; padding: 24px; border-radius: 12px; text-align: center; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @media (max-width: 768px) {
      .layout { flex-direction: column; }
      .sidebar { width: 100%; max-height: 200px; }
      .main { padding: 16px; }
      .main-inner { padding: 20px; }
    }
  </style>
</head>
<body>
  <!-- Global Timer -->
  ${isLiveMode ? `<!-- Live Mode Banner -->
  <div id="live-banner" style="background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-size:13px;z-index:101">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="display:inline-block;width:10px;height:10px;background:#fff;border-radius:50%;animation:pulse 1.5s infinite"></span>
      <strong>SESSION LIVE &mdash; Surveillance stricte active</strong>
    </div>
    <div style="display:flex;align-items:center;gap:12px;font-size:12px;opacity:0.9">
      <span>Fin de l'epreuve : <strong id="live-end-display"></strong></span>
    </div>
  </div>` : ''}
  ${totalTimerMinutes > 0 ? `<!-- Global Timer -->
  <div id="global-timer">
    <div style="display:flex;align-items:center;gap:12px">
      <span>&#9201;</span>
      <span class="timer-display" id="timer-text">00:00</span>
      <span style="font-size:12px;color:#6b7280">restant</span>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <div class="progress-bar"><div class="progress-fill" id="timer-progress" style="width:100%"></div></div>
      <span style="font-size:11px;color:#6b7280">${questionCount} questions</span>
    </div>
  </div>` : ''}

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
        <!-- Student identification form -->
        <div id="student-form">
          <div style="font-weight:bold;margin-bottom:8px;color:#1e40af">Identification</div>
          <div style="display:flex;gap:12px">
            <input type="text" id="student-name" placeholder="Votre nom complet" required style="flex:1">
            <input type="email" id="student-email" placeholder="Email (optionnel)" style="flex:1">
          </div>
          ${isContestMode ? '<div style="margin-top:8px"><input type="text" id="student-establishment" placeholder="Nom de votre etablissement / ecole" style="width:100%"></div>' : ''}
        </div>

        <div id="welcome-screen">
          <div style="text-align:center;padding:48px 0">
            <h2 style="font-size:24px;font-weight:bold;margin-bottom:12px">${escapeHtml(mod.title)}</h2>
            <p style="color:#6b7280;margin-bottom:24px">${escapeHtml(mod.description || 'Bienvenue dans ce module de formation.')}</p>
            <p style="font-size:14px;color:#9ca3af">Cliquez sur un ecran dans le menu pour commencer.</p>
          </div>
        </div>
        ${content}
      </div>
      <!-- Submit bar -->
      <div id="submit-bar" style="display:${questionCount > 0 ? 'block' : 'none'}">
        <p style="color:${theme.headerText};margin-bottom:8px;font-size:14px">Vous avez repondu a <span id="answered-count">0</span>/${questionCount} questions</p>
        <button onclick="submitResults()" id="submit-btn">Soumettre mes reponses</button>
      </div>

      <!-- Result banner -->
      <div id="result-banner"></div>

      <div class="footer">TEGS-Learning &middot; DDENE Haiti</div>
    </div>
  </div>
  <script>
    // === ANSWER TRACKING SYSTEM ===
    var _shareToken = '${mod.shareToken}';
    var _moduleId = '${mod._id}';
    var _questionMeta = ${JSON.stringify(questionMeta)};
    var _answers = {};
    var _startTime = Date.now();
    var _sessionKey = (function() {
      var key = 'tegs_session_' + _shareToken;
      var stored = sessionStorage.getItem(key);
      if (stored) return stored;
      var id = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem(key, id);
      return id;
    })();
    var _isLiveMode = ${isLiveMode ? 'true' : 'false'};
    var _isContestMode = ${isContestMode ? 'true' : 'false'};
    var _proctoringMode = '${proctoringMode}';
    var _hasTimer = ${totalTimerMinutes > 0 ? 'true' : 'false'};

    function trackAnswer(qIndex, data) {
      _answers[qIndex] = data;
      var count = Object.keys(_answers).length;
      var el = document.getElementById('answered-count');
      if (el) el.textContent = count;
    }
  </script>
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

    // Question index tracker
    var _qCounter = 0;
    function getQIndex(el) {
      if (el.dataset.qidx !== undefined) return parseInt(el.dataset.qidx);
      el.dataset.qidx = _qCounter++;
      return parseInt(el.dataset.qidx);
    }

    // Quiz (QCM) interactivity
    function quizSelect(id, selected, correct) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      el.dataset.answered = '1';
      var opts = el.querySelectorAll('.quiz-opt');
      var selectedText = '', correctText = '', choices = [];
      opts.forEach(function(o, i) {
        o.style.cursor = 'default';
        choices.push(o.textContent.trim());
        if (i === correct) { o.style.background = '#dcfce7'; o.style.borderColor = '#4ade80'; correctText = o.textContent.trim(); }
        else if (i === selected) { o.style.background = '#fee2e2'; o.style.borderColor = '#f87171'; }
        else { o.style.opacity = '0.5'; }
        if (i === selected) selectedText = o.textContent.trim();
      });
      var isCorrect = selected === correct;
      var result = el.querySelector('.quiz-result');
      result.style.display = 'block';
      if (isCorrect) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Bonne reponse !'; }
      else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.textContent = 'Mauvaise reponse.'; }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
      trackAnswer(getQIndex(el), { studentAnswer: selectedText, correctAnswer: correctText, isCorrect: isCorrect, choices: choices });
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
      var isCorrect = selected === correct;
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
      if (isCorrect) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Bonne reponse !'; }
      else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.textContent = 'Mauvaise reponse.'; }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
      trackAnswer(getQIndex(el), { studentAnswer: selected === 'true' ? 'Vrai' : 'Faux', correctAnswer: correct === 'true' ? 'Vrai' : 'Faux', isCorrect: isCorrect });
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
      trackAnswer(getQIndex(el), { studentAnswer: val, correctAnswer: answer, isCorrect: correct });
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

    // Sequence interactivity
    function seqUpdateNums(id) {
      var el = document.getElementById(id);
      var items = el.querySelectorAll('.seq-item');
      items.forEach(function(item, i) { item.querySelector('.seq-num').textContent = (i + 1) + '.'; });
    }
    // Auto-number on load
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('[id^="seq_"]').forEach(function(el) { seqUpdateNums(el.id); });
    });
    function seqMove(id, item, dir) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      var container = el.querySelector('.seq-items');
      var items = Array.from(container.querySelectorAll('.seq-item'));
      var idx = items.indexOf(item);
      if (dir === -1 && idx > 0) { container.insertBefore(item, items[idx - 1]); }
      else if (dir === 1 && idx < items.length - 1) { container.insertBefore(items[idx + 1], item); }
      seqUpdateNums(id);
    }
    function seqCheck(id) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      el.dataset.answered = '1';
      var items = el.querySelectorAll('.seq-item');
      var allCorrect = true;
      items.forEach(function(item, i) {
        var correct = parseInt(item.dataset.correct) === i;
        item.style.borderColor = correct ? '#4ade80' : '#f87171';
        item.style.background = correct ? '#dcfce7' : '#fee2e2';
        item.querySelectorAll('button').forEach(function(b) { b.disabled = true; b.style.opacity = '0.3'; });
        if (!correct) allCorrect = false;
      });
      var result = el.querySelector('.quiz-result');
      result.style.display = 'block';
      if (allCorrect) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Ordre correct !'; }
      else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.textContent = "L'ordre n'est pas correct."; }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
      var seqAnswer = []; items.forEach(function(it) { seqAnswer.push(it.querySelector('span:nth-child(2)').textContent.trim()); });
      trackAnswer(getQIndex(el), { studentAnswer: seqAnswer.join(' > '), correctAnswer: '(ordre correct)', isCorrect: allCorrect });
    }
    function seqReset(id) {
      var el = document.getElementById(id);
      delete el.dataset.answered;
      el.querySelectorAll('.seq-item').forEach(function(item) { item.style.borderColor = '#e5e7eb'; item.style.background = 'white'; item.querySelectorAll('button').forEach(function(b) { b.disabled = false; b.style.opacity = '1'; }); });
      el.querySelector('.quiz-result').style.display = 'none';
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'none';
      el.querySelector('.quiz-retry').style.display = 'none';
    }

    // Matching interactivity
    function matchCheck(id, count) {
      var el = document.getElementById(id);
      if (el.dataset.answered) return;
      var selects = el.querySelectorAll('.match-select');
      var allFilled = true;
      selects.forEach(function(s) { if (!s.value) allFilled = false; });
      if (!allFilled) return;
      el.dataset.answered = '1';
      var allCorrect = true;
      selects.forEach(function(s) {
        s.disabled = true;
        var correct = s.value === s.dataset.correct;
        s.style.borderColor = correct ? '#4ade80' : '#f87171';
        s.style.background = correct ? '#dcfce7' : '#fee2e2';
        if (!correct) allCorrect = false;
      });
      var result = el.querySelector('.quiz-result');
      result.style.display = 'block';
      if (allCorrect) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Tout est correct !'; }
      else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.textContent = 'Certaines associations sont incorrectes.'; }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
      trackAnswer(getQIndex(el), { studentAnswer: '(associations)', correctAnswer: '(associations correctes)', isCorrect: allCorrect });
    }
    function matchReset(id) {
      var el = document.getElementById(id);
      delete el.dataset.answered;
      el.querySelectorAll('.match-select').forEach(function(s) { s.value = ''; s.disabled = false; s.style.borderColor = '#e5e7eb'; s.style.background = ''; });
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
      var studentVals = []; inputs.forEach(function(inp) { studentVals.push(inp.value || ''); });
      trackAnswer(getQIndex(el), { studentAnswer: studentVals.join(', '), correctAnswer: answers.join(', '), isCorrect: allCorrect });
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
      var oaCorrect = false;
      if (autoGrade) {
        oaCorrect = val.toLowerCase() === answer.toLowerCase();
        if (oaCorrect) { result.style.background = '#dcfce7'; result.style.color = '#166534'; result.textContent = 'Bonne reponse !'; }
        else { result.style.background = '#fee2e2'; result.style.color = '#991b1b'; result.innerHTML = 'Mauvaise reponse. Reponse attendue : <strong>' + answer + '</strong>'; }
      } else {
        result.style.background = '#dbeafe'; result.style.color = '#1e40af'; result.textContent = 'Reponse enregistree. Cette question sera evaluee manuellement.';
        oaCorrect = true; // Manual grading — count as answered
      }
      var expl = el.querySelector('.quiz-explanation'); if (expl) expl.style.display = 'block';
      var retry = el.querySelector('.quiz-retry'); if (retry) retry.style.display = 'inline-block';
      trackAnswer(getQIndex(el), { studentAnswer: val, correctAnswer: answer || '(evaluation manuelle)', isCorrect: oaCorrect });
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

    // === LIVE MODE END TIME DISPLAY ===
    ${isLiveMode && mod.liveEndTime ? `(function() {
      var endEl = document.getElementById('live-end-display');
      if (endEl) {
        var d = new Date('${new Date(mod.liveEndTime).toISOString()}');
        endEl.textContent = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }
    })();` : ''}

    // === GLOBAL TIMER (SERVER-SYNCED) ===
    ${totalTimerMinutes > 0 ? `(function() {
      var initialSecs = ${totalTimerSeconds};
      var totalSecs = initialSecs;
      var remaining = initialSecs;
      var timerEl = document.getElementById('timer-text');
      var progressEl = document.getElementById('timer-progress');
      if (!timerEl) return;

      // Create/resume server session for timer persistence
      function initSession() {
        fetch(window.location.origin + '/api/share/public/' + _shareToken + '/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionKey: _sessionKey }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.status === 'expired' || data.status === 'submitted') {
            remaining = 0;
            autoSubmit();
            return;
          }
          if (data.remainingSeconds !== undefined) {
            remaining = data.remainingSeconds;
            totalSecs = data.totalSeconds || initialSecs;
          }
          updateTimer();
        })
        .catch(function() { updateTimer(); }); // Fallback to local timer on error
      }

      // Periodic server sync (every 30s) — authoritative time from GCP server
      var syncInterval = setInterval(function() {
        fetch(window.location.origin + '/api/share/public/' + _shareToken + '/session/tick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionKey: _sessionKey }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.forceSubmit) {
            remaining = 0;
            clearInterval(timerInterval);
            clearInterval(syncInterval);
            autoSubmit();
            return;
          }
          if (data.remainingSeconds !== undefined) {
            remaining = data.remainingSeconds; // Server is authoritative
          }
        })
        .catch(function() {}); // Silently continue with local timer
      }, 30000);

      function updateTimer() {
        var r = Math.max(0, remaining);
        var h = Math.floor(r / 3600);
        var m = Math.floor((r % 3600) / 60);
        var s = r % 60;
        timerEl.textContent = h > 0
          ? String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0')
          : String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        var pct = totalSecs > 0 ? (r / totalSecs) * 100 : 0;
        progressEl.style.width = pct + '%';
        if (pct <= 10) { timerEl.className = 'timer-display danger'; progressEl.style.background = '#ef4444'; }
        else if (pct <= 25) { timerEl.className = 'timer-display warning'; progressEl.style.background = '#f59e0b'; }
        else { timerEl.className = 'timer-display'; progressEl.style.background = '#3b82f6'; }
        if (r <= 0) {
          clearInterval(timerInterval);
          clearInterval(syncInterval);
          autoSubmit();
        }
      }

      // Local tick (1s) — decrements locally between server syncs
      var timerInterval = setInterval(function() { remaining = Math.max(0, remaining - 1); updateTimer(); }, 1000);
      initSession();

      function autoSubmit() {
        window._autoSubmitted = true;
        var isLive = _isLiveMode;
        var banner = document.getElementById('result-banner');
        banner.style.display = 'block';
        banner.style.background = '#fef2f2';
        banner.style.color = '#991b1b';
        banner.innerHTML = isLive
          ? '<h3 style="font-size:18px;font-weight:bold">Fin de l\\x27epreuve !</h3><p>Le temps imparti est ecoule. Vos reponses ont ete soumises automatiquement.</p>'
          : '<h3 style="font-size:18px;font-weight:bold">Temps ecoule !</h3><p>Vos reponses sont soumises automatiquement.</p>';
        // Disable all interactive elements
        var allBtns = document.querySelectorAll('button, input, textarea, select');
        for (var b = 0; b < allBtns.length; b++) allBtns[b].disabled = true;
        submitResults();
      }
    })();` : ''}

    // === SUBMIT RESULTS ===
    function submitResults() {
      var nameEl = document.getElementById('student-name');
      var emailEl = document.getElementById('student-email');
      var name = (nameEl.value || '').trim();
      if (!name) { nameEl.style.borderColor = '#ef4444'; nameEl.focus(); alert('Veuillez entrer votre nom'); return; }

      var submitBtn = document.getElementById('submit-btn');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Envoi en cours...'; }

      // Build answers array from tracked data
      var answersArr = [];
      for (var i = 0; i < _questionMeta.length; i++) {
        var meta = _questionMeta[i];
        var ans = _answers[i] || { studentAnswer: '(non repondu)', isCorrect: false, pointsEarned: 0 };
        answersArr.push({
          blockId: 'q' + i,
          questionType: meta.type,
          questionText: meta.text,
          choices: ans.choices || null,
          studentAnswer: ans.studentAnswer || '(non repondu)',
          correctAnswer: ans.correctAnswer || '',
          isCorrect: !!ans.isCorrect,
          pointsEarned: ans.isCorrect ? (meta.points || 0) : 0,
          maxPoints: meta.points || 0,
          feedback: ans.feedback || '',
        });
      }

      var elapsed = Math.floor((Date.now() - _startTime) / 1000);
      var durationISO = 'PT' + Math.floor(elapsed / 60) + 'M' + (elapsed % 60) + 'S';

      var payload = {
        shareToken: _shareToken,
        studentName: name,
        studentEmail: (emailEl.value || '').trim(),
        answers: answersArr,
        duration: durationISO,
        evaluationType: '${mod.evaluationType || 'personalized'}',
        autoSubmitted: window._autoSubmitted || false,
      };

      fetch(window.location.origin + '/api/reporting/submit-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var banner = document.getElementById('result-banner');
        banner.style.display = 'block';
        if (data.percentage >= 60) {
          banner.style.background = '#dcfce7';
          banner.style.color = '#166534';
        } else {
          banner.style.background = '#fee2e2';
          banner.style.color = '#991b1b';
        }
        banner.innerHTML = '<h3 style="font-size:24px;font-weight:bold;margin-bottom:8px">' + (data.percentage || 0) + '%</h3>'
          + '<p style="font-size:16px">Score: ' + (data.score || '0/0') + '</p>'
          + '<p style="margin-top:8px;font-size:14px">Resultats enregistres avec succes !</p>';
        if (submitBtn) submitBtn.style.display = 'none';
        // Emit exam_submitted via socket
        if (window._liveSock && window._liveSock.connected) {
          window._liveSock.emit('exam_submitted', {
            totalScore: data.totalScore || 0,
            maxScore: data.maxScore || 0,
            percentage: data.percentage || 0
          });
        }
        // Close server session
        if (_hasTimer) {
          fetch(window.location.origin + '/api/share/public/' + _shareToken + '/session/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionKey: _sessionKey }),
          }).catch(function() {});
        }
      })
      .catch(function(err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Soumettre mes reponses'; }
        alert('Erreur: ' + err.message);
      });
    }

    // === SURVEILLANCE MODULE ===
    ${effectiveSurveillance !== 'strict' ? '// Mode light — aucune restriction' : `(function() {
      var settings = ${survSettingsStr};
      var blurCount = 0;
      var maxBlur = settings.maxBlurCount || 3;

      // Anti-copy
      if (settings.antiCopy !== false) {
        document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        document.addEventListener('copy', function(e) { e.preventDefault(); });
        document.addEventListener('cut', function(e) { e.preventDefault(); });
        document.addEventListener('selectstart', function(e) { e.preventDefault(); });
      }

      // Fullscreen
      if (settings.fullscreen !== false) {
        document.addEventListener('click', function requestFS() {
          var el = document.documentElement;
          var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
          if (req) req.call(el).catch(function(){});
          document.removeEventListener('click', requestFS);
        }, { once: true });

        document.addEventListener('fullscreenchange', function() {
          if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            blurCount++;
            showSurvWarning('Vous avez quitte le mode plein ecran (' + blurCount + '/' + maxBlur + ')');
            checkLimit();
          }
        });
      }

      // Blur detection
      if (settings.blurDetection !== false) {
        window.addEventListener('blur', function() {
          blurCount++;
          showSurvWarning('Changement d\\x27onglet detecte (' + blurCount + '/' + maxBlur + ')');
          checkLimit();
        });
      }

      function checkLimit() {
        if (blurCount >= maxBlur) {
          if (settings.autoSubmitOnExceed) {
            showSurvWarning('Nombre maximal de sorties atteint. Le module est termine.', true);
          } else {
            showSurvWarning('Attention : vous avez atteint la limite de ' + maxBlur + ' sorties autorisees.', true);
          }
        }
      }

      // Warning banner
      var warnEl = document.createElement('div');
      warnEl.id = 'surv-warning';
      warnEl.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;padding:12px 20px;background:#ef4444;color:#fff;text-align:center;font-weight:bold;font-size:14px;z-index:99999;transition:opacity 0.3s';
      document.body.appendChild(warnEl);

      function showSurvWarning(msg, persist) {
        warnEl.textContent = msg;
        warnEl.style.display = 'block';
        if (!persist) setTimeout(function() { warnEl.style.display = 'none'; }, 4000);
      }

      // Surveillance indicator
      var badge = document.createElement('div');
      badge.style.cssText = 'position:fixed;bottom:12px;right:12px;background:#dc2626;color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:bold;z-index:99999;opacity:0.8';
      badge.textContent = 'Mode Surveille';
      document.body.appendChild(badge);
    })();`}
  </script>
  ${isLiveMode ? `<script src="/socket.io/socket.io.js"></script>
  <script>
    (function() {
      if (typeof io === 'undefined') { console.warn('[LIVE] socket.io not available'); return; }
      var sock = io(window.location.origin + '/student', { path: '/socket.io', transports: ['websocket', 'polling'] });
      window._liveSock = sock;

      sock.on('connect', function() {
        console.log('[LIVE] Connected to student namespace');
        sock.emit('join_exam', {
          shareToken: _shareToken,
          sessionKey: _sessionKey,
          studentName: ''
        });
      });

      // Update studentName + establishment once form provides it
      var origSubmit = window.handleSubmit;
      if (typeof origSubmit === 'function') {
        window.handleSubmit = function() {
          var nameEl = document.getElementById('student-name');
          var estEl = document.getElementById('student-establishment');
          if (nameEl && nameEl.value && sock.connected) {
            sock.emit('join_exam', {
              shareToken: _shareToken,
              sessionKey: _sessionKey,
              studentName: nameEl.value.trim(),
              establishment: estEl ? estEl.value.trim() : ''
            });
          }
          return origSubmit.apply(this, arguments);
        };
      }

      // Emit question_changed on navigation
      var origShowScreen = window.showScreen;
      var screenIdx = 0;
      if (typeof origShowScreen === 'function') {
        window.showScreen = function(id) {
          origShowScreen(id);
          screenIdx++;
          if (sock.connected) {
            sock.emit('question_changed', {
              screenIndex: screenIdx,
              questionIndex: Object.keys(_answers).length,
              questionText: ''
            });
          }
        };
      }

      // Emit answer_submitted when trackAnswer is called
      var origTrack = window.trackAnswer;
      if (typeof origTrack === 'function') {
        window.trackAnswer = function(qIndex, data) {
          origTrack(qIndex, data);
          if (sock.connected) {
            var meta = _questionMeta[qIndex] || {};
            sock.emit('answer_submitted', {
              questionIndex: qIndex,
              questionText: meta.text || '',
              questionType: meta.type || 'quiz',
              isCorrect: !!data.isCorrect,
              pointsEarned: data.isCorrect ? (meta.points || 0) : 0,
              maxPoints: meta.points || 0,
              studentAnswer: data.studentAnswer || '',
              responseTimeMs: data.responseTimeMs || 0
            });
          }
        };
      }

      // Emit blur_detected from surveillance
      var blurCounter = 0;
      window.addEventListener('blur', function() {
        blurCounter++;
        if (sock.connected) {
          sock.emit('blur_detected', { blurCount: blurCounter });
        }
      });

      // Emit exam_submitted on form submit
      window.addEventListener('beforeunload', function() {
        if (window._autoSubmitted && sock.connected) {
          sock.emit('exam_submitted', { totalScore: 0, maxScore: 0, percentage: 0 });
        }
      });

      // ═══════════════════════════════════════════════════════
      // ARENA — National Challenge UI (Forced Sequencing)
      // ═══════════════════════════════════════════════════════
      if (_isContestMode) {
        // SVG circular timer constants
        var CIRCLE_R = 90, CIRCLE_C = 2 * Math.PI * CIRCLE_R;

        var overlay = document.createElement('div');
        overlay.id = 'arena-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#0f172a;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:system-ui,sans-serif';

        overlay.innerHTML = ''
          // Media indicators (top-left)
          + '<div id="arena-media" style="position:absolute;top:16px;left:16px;display:flex;gap:8px">'
          + '  <div id="arena-cam-badge" style="display:none;background:#dc2626;color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:bold;display:flex;align-items:center;gap:4px">'
          + '    <span style="width:6px;height:6px;border-radius:50%;background:#fff;animation:pulse 1.5s infinite"></span>CAMERA'
          + '  </div>'
          + '  <div id="arena-mic-badge" style="display:none;background:#f59e0b;color:#000;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:bold;display:flex;align-items:center;gap:4px">'
          + '    <span style="width:6px;height:6px;border-radius:50%;background:#000;animation:pulse 1.5s infinite"></span>MICRO'
          + '  </div>'
          + '</div>'
          // Progress dots (top-right)
          + '<div id="arena-dots" style="position:absolute;top:16px;right:16px;display:flex;gap:4px;flex-wrap:wrap;max-width:200px;justify-content:flex-end"></div>'
          // Center content
          + '<div style="text-align:center;max-width:700px;width:95%">'
          // Status line
          + '  <div id="arena-status" style="font-size:14px;letter-spacing:4px;text-transform:uppercase;opacity:0.5;margin-bottom:8px">EN ATTENTE</div>'
          // SVG Circular Timer
          + '  <div style="position:relative;width:220px;height:220px;margin:0 auto 16px">'
          + '    <svg viewBox="0 0 200 200" style="width:220px;height:220px;transform:rotate(-90deg)">'
          + '      <circle cx="100" cy="100" r="' + CIRCLE_R + '" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>'
          + '      <circle id="arena-ring" cx="100" cy="100" r="' + CIRCLE_R + '" fill="none" stroke="#3b82f6" stroke-width="8" stroke-linecap="round"'
          + '        stroke-dasharray="' + CIRCLE_C + '" stroke-dashoffset="0" style="transition:stroke-dashoffset 0.9s linear,stroke 0.3s"/>'
          + '    </svg>'
          + '    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">'
          + '      <div id="arena-seconds" style="font-size:72px;font-weight:900;font-variant-numeric:tabular-nums;font-family:monospace;line-height:1">--</div>'
          + '      <div id="arena-progress" style="font-size:13px;opacity:0.4;margin-top:4px">-- / --</div>'
          + '    </div>'
          + '  </div>'
          // Question card
          + '  <div id="arena-q-card" style="display:none;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;margin-bottom:16px;backdrop-filter:blur(12px)">'
          + '    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">'
          + '      <span id="arena-q-type" style="background:#3b82f6;color:#fff;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:1px">QUIZ</span>'
          + '      <span id="arena-q-pts" style="background:#f59e0b;color:#000;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:800">0 PTS</span>'
          + '    </div>'
          + '    <div id="arena-q-text" style="font-size:18px;font-weight:600;line-height:1.5"></div>'
          + '  </div>'
          // Answer zone (interactive block goes here)
          + '  <div id="arena-answer" style="display:none;background:rgba(255,255,255,0.03);border:2px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;min-height:80px"></div>'
          // Lock / Transition / Eliminated overlays
          + '  <div id="arena-lock" style="display:none;background:rgba(239,68,68,0.15);border:2px solid #ef4444;padding:20px 24px;border-radius:12px;margin-top:16px">'
          + '    <div style="font-size:24px;font-weight:900;color:#ef4444;margin-bottom:4px">VERROUILLE</div>'
          + '    <div style="font-size:14px;opacity:0.7">Temps ecoule. Reponse envoyee.</div>'
          + '  </div>'
          + '  <div id="arena-transition" style="display:none;margin-top:24px">'
          + '    <div style="font-size:14px;opacity:0.5">Question suivante dans...</div>'
          + '    <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.2);border-top-color:#3b82f6;border-radius:50%;margin:12px auto;animation:spin 0.8s linear infinite"></div>'
          + '  </div>'
          + '  <div id="arena-eliminated" style="display:none;margin-top:24px;background:rgba(239,68,68,0.2);border:2px solid #ef4444;border-radius:16px;padding:32px">'
          + '    <div style="font-size:48px;margin-bottom:12px">&#x26D4;</div>'
          + '    <div style="font-size:24px;font-weight:900;color:#ef4444">ELIMINE</div>'
          + '    <div style="font-size:14px;opacity:0.7;margin-top:8px">Vous avez quitte le plein ecran. Votre participation est terminee.</div>'
          + '  </div>'
          + '  <div id="arena-end" style="display:none;margin-top:20px"></div>'
          + '</div>';

        // CSS animations
        var arenaStyle = document.createElement('style');
        arenaStyle.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(arenaStyle);
        document.body.appendChild(overlay);

        var arenaState = { active: false, currentQ: -1, totalQ: 0, duration: 0, eliminated: false, qStartTime: 0, serverDrift: 0 };

        // Latency drift compensation: compute offset between server time and client time
        function computeDrift(serverTimestamp) {
          if (!serverTimestamp) return;
          arenaState.serverDrift = Date.now() - serverTimestamp;
        }
        function getCompensatedRemaining(serverRemaining, serverTimestamp) {
          if (!serverTimestamp) return serverRemaining;
          var latency = Math.max(0, (Date.now() - serverTimestamp) / 1000);
          return Math.max(0, serverRemaining - latency);
        }

        // Build progress dots
        function buildDots(total) {
          var dotsEl = document.getElementById('arena-dots');
          dotsEl.innerHTML = '';
          for (var i = 0; i < total; i++) {
            var dot = document.createElement('div');
            dot.id = 'arena-dot-' + i;
            dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.15);transition:background 0.3s,transform 0.3s';
            dotsEl.appendChild(dot);
          }
        }
        function updateDot(idx, state) {
          var d = document.getElementById('arena-dot-' + idx);
          if (!d) return;
          if (state === 'active') { d.style.background = '#3b82f6'; d.style.transform = 'scale(1.4)'; }
          else if (state === 'done') { d.style.background = '#4ade80'; d.style.transform = 'scale(1)'; }
          else if (state === 'locked') { d.style.background = '#ef4444'; d.style.transform = 'scale(1)'; }
        }

        function updateRing(pct) {
          var ring = document.getElementById('arena-ring');
          if (!ring) return;
          var offset = CIRCLE_C * (1 - pct / 100);
          ring.setAttribute('stroke-dashoffset', offset);
          if (pct <= 10) ring.setAttribute('stroke', '#ef4444');
          else if (pct <= 25) ring.setAttribute('stroke', '#f59e0b');
          else ring.setAttribute('stroke', '#3b82f6');
        }

        // ── CONTEST EVENTS ────────────────────────────────
        sock.on('contest_start', function(data) {
          arenaState.active = true;
          arenaState.totalQ = data.totalQuestions;
          overlay.style.display = 'flex';
          document.querySelector('.layout').style.display = 'none';
          document.getElementById('arena-status').textContent = 'PREPARATION';
          document.getElementById('arena-seconds').textContent = '--';
          document.getElementById('arena-end').style.display = 'none';
          document.getElementById('arena-eliminated').style.display = 'none';
          buildDots(data.totalQuestions);
        });

        sock.on('contest_countdown', function(data) {
          var v = data.value;
          document.getElementById('arena-seconds').textContent = v > 0 ? v : 'GO!';
          document.getElementById('arena-seconds').style.color = v > 0 ? '#f59e0b' : '#4ade80';
          document.getElementById('arena-status').textContent = v > 0 ? 'DECOMPTE' : 'C\\x27EST PARTI !';
          updateRing(100);
        });

        sock.on('contest_question', function(data) {
          if (arenaState.eliminated) return;
          arenaState.currentQ = data.questionIndex;
          arenaState.duration = data.duration;
          arenaState.qStartTime = Date.now();
          computeDrift(data.serverTimestamp);

          // Update status
          document.getElementById('arena-status').textContent = 'REPONDEZ MAINTENANT';
          document.getElementById('arena-status').style.color = '#4ade80';
          document.getElementById('arena-seconds').textContent = data.remaining;
          document.getElementById('arena-seconds').style.color = '#fff';
          document.getElementById('arena-progress').textContent = (data.questionIndex + 1) + ' / ' + data.totalQuestions;
          updateRing(100);

          // Update dots
          if (data.questionIndex > 0) updateDot(data.questionIndex - 1, 'done');
          updateDot(data.questionIndex, 'active');

          // Question card
          var qCard = document.getElementById('arena-q-card');
          qCard.style.display = 'block';
          qCard.style.animation = 'slideIn 0.3s ease-out';
          document.getElementById('arena-q-type').textContent = (data.questionType || 'QUIZ').toUpperCase().replace('_', ' ');
          document.getElementById('arena-q-pts').textContent = (data.points || 0) + ' PTS';
          document.getElementById('arena-q-text').textContent = data.questionText || '';

          // Move interactive block into answer zone
          var ansZone = document.getElementById('arena-answer');
          ansZone.style.display = 'block';
          ansZone.innerHTML = '';
          ansZone.style.animation = 'slideIn 0.4s ease-out';
          var allBlocks = document.querySelectorAll('.question-block');
          if (allBlocks[data.questionIndex]) {
            var block = allBlocks[data.questionIndex];
            block.style.display = 'block';
            block.style.background = 'transparent';
            block.style.border = 'none';
            block.style.color = '#e2e8f0';
            ansZone.appendChild(block);
          }

          // Hide lock/transition/reveal + clear blur
          document.getElementById('arena-lock').style.display = 'none';
          document.getElementById('arena-transition').style.display = 'none';
          var revealEl = document.getElementById('arena-reveal');
          if (revealEl) revealEl.style.display = 'none';
          var qText = document.getElementById('arena-q-text');
          if (qText) qText.style.filter = 'none';
          var ansZone2 = document.getElementById('arena-answer');
          if (ansZone2) ansZone2.style.filter = 'none';
        });

        sock.on('contest_tick', function(data) {
          if (data.questionIndex !== arenaState.currentQ) return;
          // Latency-compensated remaining time
          var r = Math.max(0, Math.round(getCompensatedRemaining(data.remaining, data.serverTimestamp)));
          document.getElementById('arena-seconds').textContent = r;
          var pct = arenaState.duration > 0 ? (r / arenaState.duration) * 100 : 0;
          updateRing(pct);

          if (pct <= 10) document.getElementById('arena-seconds').style.color = '#ef4444';
          else if (pct <= 25) document.getElementById('arena-seconds').style.color = '#f59e0b';
          else document.getElementById('arena-seconds').style.color = '#fff';
        });

        sock.on('contest_force_submit', function(data) {
          // Atomic lock — force submit current answer even if incomplete
          if (data.questionIndex !== arenaState.currentQ) return;
          var ansZone = document.getElementById('arena-answer');
          var inputs = ansZone.querySelectorAll('input, button, select, textarea, .quiz-opt');
          for (var i = 0; i < inputs.length; i++) { inputs[i].disabled = true; inputs[i].style.pointerEvents = 'none'; inputs[i].style.opacity = '0.4'; }

          // Send response time
          if (sock.connected && !_answers[data.questionIndex]) {
            // No answer given — record as unanswered
            trackAnswer(data.questionIndex, { studentAnswer: '(non repondu)', isCorrect: false, pointsEarned: 0 });
          }
        });

        sock.on('contest_lock', function(data) {
          if (data.questionIndex !== arenaState.currentQ) return;
          document.getElementById('arena-status').textContent = 'VERROUILLE';
          document.getElementById('arena-status').style.color = '#ef4444';
          document.getElementById('arena-lock').style.display = 'block';
          // Visual blur on question text to prevent continued reading
          var qText = document.getElementById('arena-q-text');
          if (qText) qText.style.filter = 'blur(6px)';
          var ansZone = document.getElementById('arena-answer');
          if (ansZone) ansZone.style.filter = 'blur(4px)';
          updateDot(data.questionIndex, 'locked');
          updateRing(0);
        });

        sock.on('contest_transition', function(data) {
          document.getElementById('arena-q-card').style.display = 'none';
          document.getElementById('arena-answer').style.display = 'none';
          document.getElementById('arena-lock').style.display = 'none';
          document.getElementById('arena-transition').style.display = 'block';
          document.getElementById('arena-status').textContent = 'CHARGEMENT';
          document.getElementById('arena-status').style.color = '#94a3b8';
        });

        sock.on('contest_reveal', function(data) {
          document.getElementById('arena-status').textContent = 'CORRECTION';
          document.getElementById('arena-status').style.color = '#a78bfa';
          document.getElementById('arena-transition').style.display = 'none';
          document.getElementById('arena-lock').style.display = 'none';

          // Show correct answer on the question card
          var qCard = document.getElementById('arena-q-card');
          if (qCard) qCard.style.display = 'block';
          var qText = document.getElementById('arena-q-text');
          if (qText) { qText.style.filter = 'none'; }
          var ansZone = document.getElementById('arena-answer');
          if (ansZone) { ansZone.style.filter = 'none'; }

          // ── GREEN GLOW on the correct option ──
          if (ansZone) {
            var correctIdx = data.correctIndex;
            var correctAns = data.correctAnswer;
            var qType = data.questionType;

            // QCM/Quiz: highlight by index
            var quizOpts = ansZone.querySelectorAll('.quiz-opt');
            if (quizOpts.length > 0 && correctIdx >= 0 && correctIdx < quizOpts.length) {
              quizOpts.forEach(function(opt, i) {
                if (i === correctIdx) {
                  opt.style.background = 'rgba(74,222,128,0.2)';
                  opt.style.borderColor = '#4ade80';
                  opt.style.color = '#4ade80';
                  opt.style.fontWeight = '800';
                  opt.style.boxShadow = '0 0 20px rgba(74,222,128,0.3)';
                  opt.style.transition = 'all 0.4s ease-out';
                } else {
                  opt.style.opacity = '0.4';
                  opt.style.transition = 'opacity 0.4s';
                }
              });
            }

            // True/False: highlight by answer text
            var tfBtns = ansZone.querySelectorAll('.tf-btn');
            if (tfBtns.length === 2 && correctAns) {
              var correctIsTrue = String(correctAns).toLowerCase() === 'true' || String(correctAns).toLowerCase() === 'vrai';
              tfBtns.forEach(function(btn, i) {
                var isCorrectBtn = (correctIsTrue && i === 0) || (!correctIsTrue && i === 1);
                if (isCorrectBtn) {
                  btn.style.background = 'rgba(74,222,128,0.2)';
                  btn.style.borderColor = '#4ade80';
                  btn.style.color = '#4ade80';
                  btn.style.boxShadow = '0 0 20px rgba(74,222,128,0.3)';
                  btn.style.transition = 'all 0.4s ease-out';
                } else {
                  btn.style.opacity = '0.4';
                  btn.style.transition = 'opacity 0.4s';
                }
              });
            }
          }

          // Add reveal overlay with stats
          var revealEl = document.getElementById('arena-reveal');
          if (!revealEl) {
            revealEl = document.createElement('div');
            revealEl.id = 'arena-reveal';
            revealEl.style.cssText = 'margin-top:16px;padding:20px;border-radius:12px;background:rgba(74,222,128,0.1);border:2px solid #4ade80;animation:slideIn 0.4s ease-out';
            qCard.parentElement.appendChild(revealEl);
          }
          revealEl.style.display = 'block';
          var pct = data.stats ? data.stats.percentage : 0;
          var pctColor = pct >= 50 ? '#4ade80' : '#ef4444';

          // Build distribution HTML
          var distHtml = '';
          if (data.distribution && data.distribution.length > 0) {
            distHtml = '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">';
            data.distribution.forEach(function(d) {
              var bg = d.isCorrect ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)';
              var border = d.isCorrect ? '#4ade80' : '#475569';
              var color = d.isCorrect ? '#4ade80' : '#94a3b8';
              distHtml += '<span style="padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:' + bg + ';border:1px solid ' + border + ';color:' + color + '">'
                + d.answer + ' ' + d.percentage + '%</span>';
            });
            distHtml += '</div>';
          }

          revealEl.innerHTML = '<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px">Bonne reponse</div>'
            + '<div style="font-size:22px;font-weight:800;color:#4ade80;margin-bottom:12px">' + (data.correctAnswer || '--') + '</div>'
            + '<div style="font-size:14px;color:' + pctColor + '">' + pct + '% de reussite (' + (data.stats ? data.stats.correct : 0) + '/' + (data.stats ? data.stats.total : 0) + ')</div>'
            + (data.explanation ? '<div style="font-size:13px;color:#94a3b8;margin-top:8px;font-style:italic">' + data.explanation + '</div>' : '')
            + distHtml;
        });

        sock.on('contest_pause', function() {
          document.getElementById('arena-status').textContent = 'PAUSE';
          document.getElementById('arena-status').style.color = '#f59e0b';
        });

        sock.on('contest_resume', function() {
          document.getElementById('arena-status').textContent = 'REPONDEZ MAINTENANT';
          document.getElementById('arena-status').style.color = '#4ade80';
        });

        sock.on('contest_eliminated', function(data) {
          arenaState.eliminated = true;
          document.getElementById('arena-q-card').style.display = 'none';
          document.getElementById('arena-answer').style.display = 'none';
          document.getElementById('arena-lock').style.display = 'none';
          document.getElementById('arena-transition').style.display = 'none';
          document.getElementById('arena-eliminated').style.display = 'block';
          document.getElementById('arena-status').textContent = 'ELIMINE';
          document.getElementById('arena-status').style.color = '#ef4444';
          document.getElementById('arena-seconds').textContent = '\\u2716';
          document.getElementById('arena-seconds').style.color = '#ef4444';
          updateRing(0);
        });

        sock.on('contest_end', function(data) {
          arenaState.active = false;
          document.getElementById('arena-status').textContent = 'CONCOURS TERMINE';
          document.getElementById('arena-status').style.color = '#a78bfa';
          document.getElementById('arena-seconds').textContent = 'FIN';
          document.getElementById('arena-seconds').style.fontSize = '56px';
          document.getElementById('arena-seconds').style.color = '#a78bfa';
          document.getElementById('arena-q-card').style.display = 'none';
          document.getElementById('arena-answer').style.display = 'none';
          document.getElementById('arena-lock').style.display = 'none';
          document.getElementById('arena-transition').style.display = 'none';
          updateRing(0);

          // Show rankings + stats
          var endEl = document.getElementById('arena-end');
          endEl.style.display = 'block';
          var html = '<div style="font-size:20px;font-weight:800;margin-bottom:16px">CLASSEMENT</div>';
          if (data.rankings && data.rankings.length > 0) {
            html += '<div style="max-height:250px;overflow-y:auto;text-align:left">';
            data.rankings.forEach(function(r) {
              var medal = r.rank === 1 ? '\\u1F947' : r.rank === 2 ? '\\u1F948' : r.rank === 3 ? '\\u1F949' : '';
              html += '<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:rgba(255,255,255,' + (r.rank <= 3 ? '0.1' : '0.03') + ');border-radius:8px;margin-bottom:3px">'
                + '<span style="width:28px;font-weight:900;color:' + (r.rank <= 3 ? '#fbbf24' : '#64748b') + '">#' + r.rank + '</span>'
                + '<span style="flex:1;font-weight:600">' + (r.name || 'Anonyme') + '</span>'
                + '<span style="font-weight:800;font-variant-numeric:tabular-nums;color:#4ade80">' + r.score + '/' + r.maxScore + '</span>'
                + '</div>';
            });
            html += '</div>';
          }
          if (data.stats && data.stats.length > 0) {
            html += '<div style="font-size:14px;font-weight:700;margin:16px 0 8px;opacity:0.6">PAR QUESTION</div>';
            html += '<div style="max-height:200px;overflow-y:auto;text-align:left">';
            data.stats.forEach(function(s, i) {
              var pct = s.percentage || 0;
              var clr = pct >= 60 ? '#4ade80' : pct >= 30 ? '#f59e0b' : '#ef4444';
              html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:2px;font-size:13px">'
                + '<span style="width:24px;font-weight:700;color:#64748b">Q' + (i+1) + '</span>'
                + '<div style="flex:1;background:rgba(255,255,255,0.08);border-radius:4px;height:6px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + clr + ';border-radius:4px"></div></div>'
                + '<span style="font-weight:700;color:' + clr + ';width:40px;text-align:right">' + pct + '%</span>'
                + '</div>';
            });
            html += '</div>';
          }
          endEl.innerHTML = html;

          // Auto-submit after showing results
          setTimeout(function() {
            window._autoSubmitted = true;
            var submitBtn = document.getElementById('submit-btn');
            if (submitBtn) submitBtn.click();
          }, 5000);
        });

        // ── FULLSCREEN ENFORCEMENT → ELIMINATION ──────────
        document.addEventListener('fullscreenchange', function() {
          if (!arenaState.active || arenaState.eliminated) return;
          if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (sock.connected) sock.emit('fullscreen_exit');
          }
        });
        // Force fullscreen on first click
        document.addEventListener('click', function enterFS() {
          var el = document.documentElement;
          var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
          if (fn) fn.call(el).catch(function(){});
          document.removeEventListener('click', enterFS);
        }, { once: true });
      }

      // ═══════════════════════════════════════════════════════
      // PROCTORING — Camera + Audio Monitoring
      // Contest mode always requires camera/mic for anti-fraud
      // ═══════════════════════════════════════════════════════
      if (_proctoringMode === 'snapshot' || _proctoringMode === 'video' || _isContestMode) {
        var videoEl = document.createElement('video');
        videoEl.setAttribute('autoplay', '');
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('muted', '');
        videoEl.style.cssText = 'position:fixed;bottom:12px;left:12px;width:120px;height:90px;border-radius:8px;border:2px solid #dc2626;z-index:99998;object-fit:cover';
        document.body.appendChild(videoEl);

        var canvasEl = document.createElement('canvas');
        canvasEl.width = 320;
        canvasEl.height = 240;
        var cameraReady = false;
        var audioCtx = null;
        var analyser = null;
        var audioData = null;
        var NOISE_THRESHOLD = 0.15; // Normalized 0-1

        // Request camera + mic
        navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: true
        }).then(function(stream) {
          videoEl.srcObject = stream;
          cameraReady = true;

          // Show camera badge
          if (_isContestMode) {
            document.getElementById('arena-cam-badge').style.display = 'flex';
            document.getElementById('arena-mic-badge').style.display = 'flex';
          } else {
            var camBadge = document.createElement('div');
            camBadge.style.cssText = 'position:fixed;bottom:105px;left:12px;background:#dc2626;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:bold;z-index:99999';
            camBadge.innerHTML = '\\u25CF CAM + MIC';
            document.body.appendChild(camBadge);
          }

          // Audio level monitoring (Web Audio API)
          try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            var source = audioCtx.createMediaStreamSource(stream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            audioData = new Uint8Array(analyser.frequencyBinCount);

            // Monitor audio levels every 2 seconds
            setInterval(function() {
              if (!analyser) return;
              analyser.getByteFrequencyData(audioData);
              var sum = 0;
              for (var i = 0; i < audioData.length; i++) sum += audioData[i];
              var avg = sum / audioData.length / 255; // Normalize 0-1
              if (avg > NOISE_THRESHOLD && sock.connected) {
                sock.emit('audio_level_alert', { level: Math.round(avg * 100), threshold: Math.round(NOISE_THRESHOLD * 100) });
              }
            }, 2000);
          } catch(e) { console.warn('[PROCTOR] Audio monitoring unavailable:', e.message); }
        }).catch(function(err) {
          console.warn('[PROCTOR] Media access denied:', err.message);
          videoEl.style.display = 'none';
          if (sock.connected) {
            sock.emit('snapshot_response', { imageData: null, timestamp: new Date().toISOString(), error: 'media_denied' });
          }
          // HARD BLOCK in contest mode — camera/mic is mandatory for anti-fraud
          if (_isContestMode) {
            var blocker = document.createElement('div');
            blocker.style.cssText = 'position:fixed;inset:0;background:#0f172a;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:40px';
            blocker.innerHTML = '<div style="font-size:64px;margin-bottom:20px">&#x1F4F7;</div>'
              + '<div style="font-size:28px;font-weight:900;margin-bottom:12px;color:#ef4444">ACCES CAMERA / MICRO REQUIS</div>'
              + '<div style="font-size:16px;opacity:0.7;max-width:500px;line-height:1.6;margin-bottom:32px">'
              + 'Le concours exige l\\x27acces a votre camera et microphone pour la surveillance anti-fraude. '
              + 'Veuillez autoriser l\\x27acces dans les parametres de votre navigateur, puis rechargez la page.</div>'
              + '<button onclick="location.reload()" style="background:#3b82f6;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer">Recharger la page</button>';
            document.body.appendChild(blocker);
          }
        });

        // Snapshot capture
        function captureSnapshot(trigger) {
          if (!cameraReady) return;
          var ctx = canvasEl.getContext('2d');
          ctx.drawImage(videoEl, 0, 0, 320, 240);
          var data = canvasEl.toDataURL('image/jpeg', 0.5);
          if (sock.connected) sock.emit('snapshot_response', { imageData: data, timestamp: new Date().toISOString(), trigger: trigger || 'scheduled' });
        }
        sock.on('snapshot_request', function() { captureSnapshot('scheduled'); });

        // Auto-snapshot every 60s during contest mode (Anti-Fraud Evidence)
        if (_isContestMode) {
          var _autoSnapshotTimer = null;
          sock.on('contest_start', function() {
            if (_autoSnapshotTimer) clearInterval(_autoSnapshotTimer);
            _autoSnapshotTimer = setInterval(function() {
              captureSnapshot('auto');
            }, 60000);
            // Capture immediately at contest start
            setTimeout(function() { captureSnapshot('contest_start'); }, 2000);
          });
          sock.on('contest_end', function() {
            if (_autoSnapshotTimer) { clearInterval(_autoSnapshotTimer); _autoSnapshotTimer = null; }
            captureSnapshot('contest_end');
          });
        }

        // ── WEBRTC ON-DEMAND (professor opens student camera/mic) ──
        var rtcPeer = null;
        sock.on('webrtc_media_request', function(data) {
          // Professor wants to see/hear this student
          var constraints = { video: false, audio: false };
          if (data.mediaType === 'camera' || data.mediaType === 'both') constraints.video = true;
          if (data.mediaType === 'mic' || data.mediaType === 'both') constraints.audio = true;

          // Reuse existing stream if possible
          var existingStream = videoEl.srcObject;
          if (existingStream) {
            startWebRTC(existingStream);
          } else {
            navigator.mediaDevices.getUserMedia(constraints).then(startWebRTC).catch(function(e) {
              console.warn('[WEBRTC] Media denied:', e.message);
            });
          }

          function startWebRTC(stream) {
            rtcPeer = new RTCPeerConnection({
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
            });
            stream.getTracks().forEach(function(t) { rtcPeer.addTrack(t, stream); });
            rtcPeer.onicecandidate = function(e) {
              if (e.candidate && sock.connected) {
                sock.emit('webrtc_signal', { signal: { type: 'candidate', candidate: e.candidate } });
              }
            };
            rtcPeer.createOffer().then(function(offer) {
              return rtcPeer.setLocalDescription(offer);
            }).then(function() {
              if (sock.connected) {
                sock.emit('webrtc_signal', { signal: { type: 'offer', sdp: rtcPeer.localDescription } });
                sock.emit('webrtc_ready', { mediaType: data.mediaType });
              }
            });
          }
        });

        sock.on('webrtc_signal', function(data) {
          if (!rtcPeer || !data.signal) return;
          if (data.signal.type === 'answer') {
            rtcPeer.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
          } else if (data.signal.type === 'candidate') {
            rtcPeer.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
          }
        });

        sock.on('webrtc_stop', function() {
          if (rtcPeer) { rtcPeer.close(); rtcPeer = null; }
        });

        // ── SPOTLIGHT: Second peer connection for spectator display ──
        var spotlightPeer = null;
        sock.on('spotlight_request', function(data) {
          // Reuse existing camera stream
          var existingStream = videoEl ? videoEl.srcObject : null;
          if (!existingStream) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(startSpotlight).catch(function(e) {
              console.warn('[SPOTLIGHT] Camera denied:', e.message);
            });
          } else {
            startSpotlight(existingStream);
          }

          function startSpotlight(stream) {
            spotlightPeer = new RTCPeerConnection({
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
            });
            stream.getTracks().forEach(function(t) { spotlightPeer.addTrack(t, stream); });
            spotlightPeer.onicecandidate = function(e) {
              if (e.candidate && sock.connected) {
                sock.emit('spotlight_signal', { signal: { type: 'candidate', candidate: e.candidate } });
              }
            };
            spotlightPeer.createOffer().then(function(offer) {
              return spotlightPeer.setLocalDescription(offer);
            }).then(function() {
              if (sock.connected) {
                sock.emit('spotlight_signal', { signal: { type: 'offer', sdp: spotlightPeer.localDescription } });
                sock.emit('spotlight_ready');
              }
            });
          }
        });

        sock.on('spotlight_signal', function(data) {
          if (!spotlightPeer || !data.signal || !data.fromSpectator) return;
          if (data.signal.type === 'answer') {
            spotlightPeer.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
          } else if (data.signal.type === 'candidate') {
            spotlightPeer.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
          }
        });

        sock.on('spotlight_stop', function() {
          if (spotlightPeer) { spotlightPeer.close(); spotlightPeer = null; }
        });
      }
    })();
  </script>` : ''}
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

    // Live mode time-window gating
    if (mod.evaluationType === 'live') {
      const now = new Date();
      if (mod.liveStartTime && now < new Date(mod.liveStartTime)) {
        return res.status(403).json({ error: 'Examen non encore ouvert', liveStartTime: mod.liveStartTime });
      }
      if (mod.liveEndTime && now > new Date(mod.liveEndTime)) {
        return res.status(403).json({ error: 'Examen termine', liveEndTime: mod.liveEndTime });
      }
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

// ---------------------------------------------------------------------------
// POST /api/modules/public/:shareToken/session
// Create or resume a timed session (server-side timer persistence)
// Prevents clock manipulation by using server time exclusively
// ---------------------------------------------------------------------------
router.post('/public/:shareToken/session', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      shareToken: req.params.shareToken,
      shareEnabled: true,
    }).lean();

    if (!mod) return res.status(404).json({ error: 'Module introuvable' });

    // Live mode time-window check
    if (mod.evaluationType === 'live') {
      const now = new Date();
      if (mod.liveStartTime && now < new Date(mod.liveStartTime)) {
        return res.status(403).json({ error: 'Examen non encore ouvert', serverTime: now.toISOString() });
      }
      if (mod.liveEndTime && now > new Date(mod.liveEndTime)) {
        return res.status(403).json({ error: 'Examen termine', serverTime: now.toISOString() });
      }
    }

    const { sessionKey } = req.body;
    if (!sessionKey) return res.status(400).json({ error: 'sessionKey requis' });

    const now = new Date();

    // Compute total allowed seconds
    let totalSeconds = 0;
    if (mod.evaluationType === 'live' && mod.liveEndTime) {
      totalSeconds = Math.max(0, Math.floor((new Date(mod.liveEndTime) - now) / 1000));
    } else if (mod.globalTimeLimit && mod.globalTimeLimit > 0) {
      totalSeconds = mod.globalTimeLimit * 60;
    } else {
      // Sum question durations
      for (const section of mod.sections || []) {
        for (const screen of section.screens || []) {
          for (const block of screen.contentBlocks || []) {
            const bd = block.data || {};
            if (['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'likert', 'open_answer'].includes(block.type)) {
              if (bd.duration && bd.duration > 0) totalSeconds += bd.duration * 60;
            }
          }
        }
      }
    }

    // Find or create session
    let session = await LiveSession.findOne({ module_id: mod._id, sessionKey });

    if (session) {
      // Resume existing session
      if (session.status !== 'active') {
        return res.json({
          status: session.status,
          remainingSeconds: 0,
          serverTime: now.toISOString(),
          message: session.status === 'submitted' ? 'Deja soumis' : 'Session expiree',
        });
      }

      // For live mode, remaining = time until liveEndTime
      let remainingSeconds;
      if (mod.evaluationType === 'live' && mod.liveEndTime) {
        remainingSeconds = Math.max(0, Math.floor((new Date(mod.liveEndTime) - now) / 1000));
      } else {
        // Personalized: compute elapsed from server timestamps
        const realElapsed = Math.floor((now - session.lastTickAt) / 1000) + session.elapsedSeconds;
        remainingSeconds = Math.max(0, session.totalSeconds - realElapsed);

        // Update elapsed
        session.elapsedSeconds = Math.min(session.totalSeconds, realElapsed);
        session.lastTickAt = now;
        await session.save();
      }

      if (remainingSeconds <= 0) {
        session.status = 'expired';
        await session.save();
        return res.json({ status: 'expired', remainingSeconds: 0, serverTime: now.toISOString() });
      }

      return res.json({
        status: 'active',
        remainingSeconds,
        totalSeconds: session.totalSeconds,
        serverTime: now.toISOString(),
        resumed: true,
      });
    }

    // Create new session
    if (totalSeconds <= 0) {
      return res.json({ status: 'no_timer', serverTime: now.toISOString() });
    }

    session = await LiveSession.create({
      module_id: mod._id,
      sessionKey,
      tenant_id: mod.tenant_id,
      startedAt: now,
      totalSeconds,
      elapsedSeconds: 0,
      lastTickAt: now,
      status: 'active',
    });

    res.json({
      status: 'active',
      remainingSeconds: totalSeconds,
      totalSeconds,
      serverTime: now.toISOString(),
      resumed: false,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/modules/public/:shareToken/session/tick
// Periodic sync: returns authoritative server time & remaining seconds
// Client polls this every 30s to stay synced and persist progress
// ---------------------------------------------------------------------------
router.post('/public/:shareToken/session/tick', async (req, res, next) => {
  try {
    const { sessionKey, clientElapsed } = req.body;
    if (!sessionKey) return res.status(400).json({ error: 'sessionKey requis' });

    const mod = await Module.findOne({
      shareToken: req.params.shareToken,
      shareEnabled: true,
    }).lean();

    if (!mod) return res.status(404).json({ error: 'Module introuvable' });

    const now = new Date();

    // Live mode: check if exam ended
    if (mod.evaluationType === 'live' && mod.liveEndTime && now > new Date(mod.liveEndTime)) {
      // Mark session as expired
      await LiveSession.findOneAndUpdate(
        { module_id: mod._id, sessionKey, status: 'active' },
        { status: 'expired' }
      );
      return res.json({ status: 'expired', remainingSeconds: 0, serverTime: now.toISOString(), forceSubmit: true });
    }

    const session = await LiveSession.findOne({ module_id: mod._id, sessionKey });
    if (!session) return res.status(404).json({ error: 'Session introuvable' });

    if (session.status !== 'active') {
      return res.json({ status: session.status, remainingSeconds: 0, serverTime: now.toISOString(), forceSubmit: session.status === 'expired' });
    }

    let remainingSeconds;
    if (mod.evaluationType === 'live' && mod.liveEndTime) {
      remainingSeconds = Math.max(0, Math.floor((new Date(mod.liveEndTime) - now) / 1000));
    } else {
      // Use server-tracked elapsed + delta since last tick
      const serverDelta = Math.floor((now - session.lastTickAt) / 1000);
      const newElapsed = session.elapsedSeconds + serverDelta;
      remainingSeconds = Math.max(0, session.totalSeconds - newElapsed);

      // Persist
      session.elapsedSeconds = Math.min(session.totalSeconds, newElapsed);
      session.lastTickAt = now;
      await session.save();
    }

    if (remainingSeconds <= 0) {
      session.status = 'expired';
      await session.save();
      return res.json({ status: 'expired', remainingSeconds: 0, serverTime: now.toISOString(), forceSubmit: true });
    }

    res.json({
      status: 'active',
      remainingSeconds,
      serverTime: now.toISOString(),
      forceSubmit: false,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/modules/public/:shareToken/session/close
// Mark session as submitted (called after successful result submission)
// ---------------------------------------------------------------------------
router.post('/public/:shareToken/session/close', async (req, res, next) => {
  try {
    const { sessionKey } = req.body;
    if (!sessionKey) return res.status(400).json({ error: 'sessionKey requis' });

    const mod = await Module.findOne({
      shareToken: req.params.shareToken,
      shareEnabled: true,
    }).lean();

    if (!mod) return res.status(404).json({ error: 'Module introuvable' });

    await LiveSession.findOneAndUpdate(
      { module_id: mod._id, sessionKey },
      { status: 'submitted', submittedAt: new Date() }
    );

    res.json({ status: 'submitted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

module.exports.THEMES = THEMES;
