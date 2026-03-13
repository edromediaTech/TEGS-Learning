const express = require('express');
const Module = require('../models/Module');

const router = express.Router();

/**
 * GET /api/live-arena/:shareToken
 *
 * Public "Live Arena Display" — TV / Projector / Streaming optimised view.
 * No authentication required. Read-only spectator interface.
 * Connects to the /spectator WebSocket namespace for real-time updates.
 */
router.get('/:shareToken', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      shareToken: req.params.shareToken,
      shareEnabled: true,
      contestMode: true,
    })
      .select('_id title tenant_id language')
      .lean();

    if (!mod) {
      return res.status(404).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Concours introuvable</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif}
.msg{text-align:center}.msg h1{font-size:72px;margin:0;opacity:0.3}.msg p{font-size:20px;opacity:0.6}</style></head>
<body><div class="msg"><h1>404</h1><p>Concours introuvable ou pas encore actif.</p></div></body></html>`);
    }

    const backendURL = `${req.protocol}://${req.get('host')}`;
    const title = mod.title || 'Concours National';
    const lang = mod.language || 'fr';
    const shareToken = req.params.shareToken;

    res.set('Content-Type', 'text/html');
    res.send(buildArenaHTML({ backendURL, title, lang, shareToken }));
  } catch (err) {
    next(err);
  }
});

function buildArenaHTML({ backendURL, title, lang, shareToken }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — TEGS Live Arena</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    :root {
      --bg: #0a0e1a;
      --surface: #111827;
      --surface2: #1e293b;
      --border: rgba(255,255,255,0.06);
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #3b82f6;
      --gold: #fbbf24;
      --silver: #94a3b8;
      --bronze: #d97706;
      --green: #4ade80;
      --red: #ef4444;
      --purple: #a78bfa;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      overflow: hidden;
    }

    /* ═══ HEADER BAR ═══ */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: linear-gradient(135deg, #111827 0%, #1a1f35 100%);
      border-bottom: 1px solid var(--border);
      height: 72px;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo-badge {
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      color: #fff;
      font-weight: 900;
      font-size: 14px;
      padding: 6px 14px;
      border-radius: 8px;
      letter-spacing: 0.05em;
    }
    .event-title {
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(90deg, #e2e8f0, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header-right { display: flex; align-items: center; gap: 24px; }
    .header-stat {
      text-align: center;
    }
    .header-stat-value {
      font-size: 22px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
    }
    .header-stat-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    .live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(239,68,68,0.15);
      border: 1px solid rgba(239,68,68,0.3);
      color: #ef4444;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .live-dot {
      width: 8px; height: 8px;
      background: #ef4444;
      border-radius: 50%;
      animation: livePulse 1.5s ease-in-out infinite;
    }

    /* ═══ MAIN LAYOUT ═══ */
    .main {
      display: grid;
      grid-template-columns: 1fr 380px;
      height: calc(100vh - 72px - 52px); /* header + ticker */
      gap: 0;
    }

    /* ═══ LEFT: QUESTION + STATS ═══ */
    .left-panel {
      display: flex;
      flex-direction: column;
      padding: 32px;
      gap: 24px;
      overflow: hidden;
    }

    /* Progress bar */
    .progress-bar-wrap {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .progress-track {
      flex: 1;
      height: 8px;
      background: var(--surface2);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #8b5cf6);
      border-radius: 4px;
      transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
    }
    .progress-label {
      font-size: 14px;
      font-weight: 700;
      color: var(--muted);
      white-space: nowrap;
    }

    /* Timer display */
    .timer-section {
      display: flex;
      align-items: center;
      gap: 32px;
    }
    .timer-ring-wrap {
      position: relative;
      width: 140px;
      height: 140px;
      flex-shrink: 0;
    }
    .timer-ring-wrap svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .timer-seconds {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
    }
    .question-info { flex: 1; }
    .q-badge-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .q-badge {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .q-badge-type { background: rgba(59,130,246,0.15); color: var(--accent); border: 1px solid rgba(59,130,246,0.3); }
    .q-badge-pts { background: rgba(251,191,36,0.15); color: var(--gold); border: 1px solid rgba(251,191,36,0.3); }
    .q-text {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.35;
      max-height: 200px;
      overflow: hidden;
    }

    /* Live stats bar */
    .stats-bar {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .stat-card {
      flex: 1;
      min-width: 120px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
    }
    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin-top: 4px;
    }

    /* ═══ RIGHT: LEADERBOARD ═══ */
    .right-panel {
      background: var(--surface);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .lb-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lb-list {
      flex: 1;
      overflow: hidden;
      padding: 8px 0;
      position: relative;
    }
    .lb-row {
      display: flex;
      align-items: center;
      padding: 10px 24px;
      position: absolute;
      left: 0; right: 0;
      transition: top 0.6s cubic-bezier(0.4,0,0.2,1), background 0.3s, opacity 0.3s;
      border-bottom: 1px solid var(--border);
      height: 56px;
    }
    .lb-row.glow-gold { background: rgba(251,191,36,0.08); }
    .lb-row.glow-up { animation: glowUp 1s ease-out; }
    .lb-row:hover { background: rgba(255,255,255,0.02); }
    .lb-rank {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 16px;
      border-radius: 10px;
      flex-shrink: 0;
      margin-right: 14px;
    }
    .lb-rank-1 { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1a2e; }
    .lb-rank-2 { background: linear-gradient(135deg, #94a3b8, #64748b); color: #1a1a2e; }
    .lb-rank-3 { background: linear-gradient(135deg, #d97706, #b45309); color: #fff; }
    .lb-rank-default { background: var(--surface2); color: var(--muted); }
    .lb-name {
      flex: 1;
      font-weight: 700;
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lb-streak {
      font-size: 12px;
      margin-left: 6px;
      animation: sparkle 0.4s ease-out;
    }
    .lb-score {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
      font-size: 16px;
      color: var(--accent);
      margin-left: 12px;
    }
    .lb-pct {
      font-size: 11px;
      color: var(--muted);
      margin-left: 8px;
      width: 40px;
      text-align: right;
    }

    /* ═══ WAITING / COUNTDOWN SCREEN ═══ */
    .overlay-screen {
      position: fixed;
      inset: 0;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      transition: opacity 0.5s;
    }
    .overlay-screen.hidden { opacity: 0; pointer-events: none; }
    .waiting-logo { font-size: 18px; font-weight: 900; letter-spacing: 0.15em; color: var(--muted); margin-bottom: 12px; }
    .waiting-title { font-size: 42px; font-weight: 900; margin-bottom: 8px; text-align: center; padding: 0 20px; }
    .waiting-sub { font-size: 18px; color: var(--muted); margin-bottom: 40px; }
    .countdown-big {
      font-size: 160px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
      line-height: 1;
      animation: countPulse 0.8s ease-out;
    }
    .waiting-pulse {
      width: 80px; height: 80px;
      border: 3px solid rgba(59,130,246,0.3);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* ═══ PODIUM (end) ═══ */
    .podium-screen {
      position: fixed;
      inset: 0;
      background: var(--bg);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 40px;
    }
    .podium-screen.active { display: flex; }
    .podium-title {
      font-size: 36px;
      font-weight: 900;
      margin-bottom: 8px;
      background: linear-gradient(90deg, var(--gold), #f59e0b, var(--gold));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shimmer 2s ease-in-out infinite;
      background-size: 200% 100%;
    }
    .podium-sub { font-size: 16px; color: var(--muted); margin-bottom: 48px; }
    .podium-row {
      display: flex;
      align-items: flex-end;
      gap: 24px;
      margin-bottom: 48px;
    }
    .podium-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .podium-medal {
      font-size: 56px;
      margin-bottom: 12px;
      animation: medalBounce 0.6s ease-out;
    }
    .podium-place-name {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 4px;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .podium-place-score {
      font-size: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
    }
    .podium-place-1 .podium-place-score { color: var(--gold); }
    .podium-place-2 .podium-place-score { color: var(--silver); }
    .podium-place-3 .podium-place-score { color: var(--bronze); }
    .podium-bar {
      width: 140px;
      border-radius: 12px 12px 0 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 12px;
      font-weight: 900;
      font-size: 32px;
      color: rgba(255,255,255,0.4);
      animation: barGrow 0.8s cubic-bezier(0.4,0,0.2,1);
      transform-origin: bottom;
    }
    .podium-place-1 .podium-bar { height: 180px; background: linear-gradient(180deg, rgba(251,191,36,0.25), rgba(251,191,36,0.05)); }
    .podium-place-2 .podium-bar { height: 130px; background: linear-gradient(180deg, rgba(148,163,184,0.2), rgba(148,163,184,0.05)); }
    .podium-place-3 .podium-bar { height: 100px; background: linear-gradient(180deg, rgba(217,119,6,0.2), rgba(217,119,6,0.05)); }

    /* Stats summary (end) */
    .end-stats {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .end-stat { text-align: center; }
    .end-stat-val { font-size: 32px; font-weight: 900; font-family: 'JetBrains Mono', monospace; }
    .end-stat-lbl { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }

    /* ═══ REVEAL OVERLAY (Moment de Verite) ═══ */
    .reveal-overlay {
      position: absolute;
      inset: 0;
      background: rgba(10,14,26,0.92);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 50;
      animation: revealFadeIn 0.5s ease-out;
      padding: 40px;
    }
    .reveal-overlay.active { display: flex; }
    .reveal-badge {
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 12px;
    }
    .reveal-answer {
      font-size: 36px;
      font-weight: 900;
      color: var(--green);
      text-align: center;
      margin-bottom: 24px;
      text-shadow: 0 0 30px rgba(74,222,128,0.3);
      animation: revealPop 0.6s cubic-bezier(0.34,1.56,0.64,1);
    }
    .reveal-explanation {
      font-size: 15px;
      color: var(--muted);
      text-align: center;
      max-width: 500px;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .reveal-donut-wrap {
      position: relative;
      width: 180px;
      height: 180px;
      margin-bottom: 20px;
    }
    .reveal-donut-wrap svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .reveal-donut-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .reveal-donut-pct {
      font-size: 42px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
    }
    .reveal-donut-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
    }
    .reveal-distribution {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-top: 16px;
      max-width: 600px;
    }
    .reveal-dist-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 8px;
      background: var(--surface2);
      font-size: 14px;
      font-weight: 600;
      transition: transform 0.3s;
      animation: revealSlideUp 0.5s ease-out both;
    }
    .reveal-dist-item.correct {
      background: rgba(74,222,128,0.15);
      border: 1px solid rgba(74,222,128,0.3);
      color: var(--green);
    }
    .reveal-dist-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .reveal-dist-bar {
      width: 60px;
      height: 6px;
      border-radius: 3px;
      background: var(--surface);
      overflow: hidden;
    }
    .reveal-dist-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
    }
    .reveal-stats-row {
      display: flex;
      gap: 32px;
      margin-top: 20px;
    }
    .reveal-stat { text-align: center; }
    .reveal-stat-val {
      font-size: 24px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
    }
    .reveal-stat-lbl {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin-top: 2px;
    }

    /* ═══ SPOTLIGHT VIDEO ═══ */
    .spotlight-wrap {
      position: fixed;
      bottom: 64px;
      right: 24px;
      width: 320px;
      border-radius: 16px;
      overflow: hidden;
      background: #000;
      border: 3px solid var(--gold);
      box-shadow: 0 0 40px rgba(251,191,36,0.2);
      z-index: 70;
      display: none;
      animation: spotlightIn 0.5s ease-out;
    }
    .spotlight-wrap.active { display: block; }
    .spotlight-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(0,0,0,0.8);
      font-size: 13px;
      font-weight: 700;
    }
    .spotlight-live-dot {
      width: 8px; height: 8px;
      background: var(--red);
      border-radius: 50%;
      animation: livePulse 1.5s ease-in-out infinite;
    }
    .spotlight-name { color: var(--gold); }
    .spotlight-video {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      display: block;
      background: #111;
    }
    @keyframes spotlightIn {
      0% { transform: translateY(40px) scale(0.9); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }

    @keyframes revealFadeIn { 0%{opacity:0} 100%{opacity:1} }
    @keyframes revealPop { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
    @keyframes revealSlideUp { 0%{transform:translateY(20px);opacity:0} 100%{transform:translateY(0);opacity:1} }

    /* ═══ PAUSE OVERLAY ═══ */
    .pause-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10,14,26,0.85);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 90;
    }
    .pause-overlay.active { display: flex; }
    .pause-text { font-size: 64px; font-weight: 900; color: var(--gold); letter-spacing: 0.2em; animation: pausePulse 2s ease-in-out infinite; }

    /* ═══ ESTABLISHMENT RANKING ═══ */
    .est-table {
      width: 100%;
      border-collapse: collapse;
    }
    .est-table caption {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      padding-bottom: 12px;
      text-align: left;
    }
    .est-table th {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .est-table td {
      padding: 10px 12px;
      font-size: 14px;
      border-bottom: 1px solid var(--border);
    }
    .est-table tr:first-child td { color: var(--gold); font-weight: 800; }
    .est-table tr:nth-child(2) td { color: var(--silver); font-weight: 700; }
    .est-table tr:nth-child(3) td { color: var(--bronze); font-weight: 700; }
    .est-name { font-weight: 700; }
    .est-pct { font-family: 'JetBrains Mono', monospace; font-weight: 800; }

    /* ═══ BREAKING NEWS TICKER ═══ */
    .ticker-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 52px;
      background: linear-gradient(90deg, #111827 0%, #1a1f35 50%, #111827 100%);
      border-top: 2px solid var(--gold);
      z-index: 80;
      display: flex;
      align-items: center;
      overflow: hidden;
    }
    .ticker-badge {
      flex-shrink: 0;
      background: var(--red);
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.15em;
      padding: 6px 16px;
      margin-right: 20px;
    }
    .ticker-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 40px;
      overflow: hidden;
      white-space: nowrap;
    }
    .ticker-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      animation: tickerSlide 0.5s ease-out;
      flex-shrink: 0;
    }
    .ticker-item .ticker-icon { font-size: 20px; }
    .ticker-item .ticker-name { color: var(--gold); }
    .ticker-item .ticker-msg { color: var(--text); }
    .ticker-separator {
      color: var(--muted);
      opacity: 0.3;
      font-size: 20px;
      flex-shrink: 0;
    }

    /* ═══ ANIMATIONS ═══ */
    @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    @keyframes spin { to { transform:rotate(360deg) } }
    @keyframes countPulse { 0%{transform:scale(1.3);opacity:0} 100%{transform:scale(1);opacity:1} }
    @keyframes glowUp { 0%{background:rgba(59,130,246,0.2)} 100%{background:transparent} }
    @keyframes sparkle { 0%{transform:scale(0);opacity:0} 50%{transform:scale(1.3)} 100%{transform:scale(1);opacity:1} }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes medalBounce { 0%{transform:translateY(-30px);opacity:0} 60%{transform:translateY(5px)} 100%{transform:translateY(0);opacity:1} }
    @keyframes barGrow { 0%{transform:scaleY(0)} 100%{transform:scaleY(1)} }
    @keyframes pausePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes tickerSlide { 0%{transform:translateX(100px);opacity:0} 100%{transform:translateX(0);opacity:1} }
    @keyframes particles {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-60px) scale(0); opacity: 0; }
    }
  </style>
</head>
<body>

<!-- ═══ WAITING SCREEN ═══ -->
<div class="overlay-screen" id="waitingScreen">
  <div class="waiting-logo">TEGS LEARNING</div>
  <div class="waiting-title" id="waitTitle">${escapeHTML(title)}</div>
  <div class="waiting-sub" id="waitSub">En attente du lancement du concours...</div>
  <div class="waiting-pulse" id="waitSpinner"></div>
  <div class="countdown-big" id="waitCountdown" style="display:none"></div>
</div>

<!-- ═══ PAUSE OVERLAY ═══ -->
<div class="pause-overlay" id="pauseOverlay"><div class="pause-text">PAUSE</div></div>

<!-- ═══ PODIUM SCREEN ═══ -->
<div class="podium-screen" id="podiumScreen">
  <div class="waiting-logo">TEGS LEARNING &times; DDENE</div>
  <div class="podium-title">RESULTATS OFFICIELS</div>
  <div class="podium-sub" id="podiumTitle">${escapeHTML(title)}</div>
  <div class="podium-row" id="podiumRow"></div>
  <div class="end-stats" id="endStats"></div>
  <div id="estRanking" style="display:none;margin-top:32px;width:100%;max-width:600px"></div>
</div>

<!-- ═══ REVEAL OVERLAY (Moment de Verite) ═══ -->
<div class="reveal-overlay" id="revealOverlay">
  <div class="reveal-badge">MOMENT DE VERITE</div>
  <div class="reveal-answer" id="revealAnswer"></div>
  <div class="reveal-explanation" id="revealExplanation"></div>
  <div class="reveal-donut-wrap" id="revealDonut">
    <svg viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--red)" stroke-width="10" opacity="0.4"/>
      <circle id="revealRingCorrect" cx="60" cy="60" r="50" fill="none" stroke="var(--green)" stroke-width="10"
        stroke-dasharray="0 314.16" stroke-linecap="round"
        style="transition:stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)"/>
    </svg>
    <div class="reveal-donut-center">
      <div class="reveal-donut-pct" id="revealPct">0%</div>
      <div class="reveal-donut-label">reussite</div>
    </div>
  </div>
  <div class="reveal-distribution" id="revealDistribution"></div>
  <div class="reveal-stats-row" id="revealStatsRow"></div>
</div>

<!-- ═══ MAIN DISPLAY ═══ -->
<div class="header" id="mainHeader" style="display:none">
  <div class="header-left">
    <div class="logo-badge">TEGS</div>
    <div class="event-title" id="headerTitle">${escapeHTML(title)}</div>
  </div>
  <div class="header-right">
    <div class="header-stat">
      <div class="header-stat-value" id="hParticipants">0</div>
      <div class="header-stat-label">Participants</div>
    </div>
    <div class="header-stat">
      <div class="header-stat-value" id="hAnswered">0%</div>
      <div class="header-stat-label">Ont repondu</div>
    </div>
    <div class="live-badge"><div class="live-dot"></div>EN DIRECT</div>
  </div>
</div>

<div class="main" id="mainLayout" style="display:none">
  <!-- LEFT: Question + Stats -->
  <div class="left-panel">
    <!-- Progress -->
    <div class="progress-bar-wrap">
      <div class="progress-track"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
      <div class="progress-label" id="progressLabel">--/--</div>
    </div>

    <!-- Timer + Question -->
    <div class="timer-section">
      <div class="timer-ring-wrap">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
          <circle id="timerRing" cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="6"
            stroke-dasharray="326.73" stroke-dashoffset="0" stroke-linecap="round"
            style="transition:stroke-dashoffset 1s linear,stroke 0.3s"/>
        </svg>
        <div class="timer-seconds" id="timerSeconds">--</div>
      </div>
      <div class="question-info">
        <div class="q-badge-row">
          <span class="q-badge q-badge-type" id="qType">--</span>
          <span class="q-badge q-badge-pts" id="qPts">--</span>
        </div>
        <div class="q-text" id="qText">En attente de la question...</div>
      </div>
    </div>

    <!-- Live stats -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-value" id="sAnswered" style="color:var(--accent)">0</div>
        <div class="stat-label">Reponses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="sCorrect" style="color:var(--green)">0%</div>
        <div class="stat-label">Reussite</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="sParticipants" style="color:var(--purple)">0</div>
        <div class="stat-label">Candidats</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="sEliminated" style="color:var(--red)">0</div>
        <div class="stat-label">Elimines</div>
      </div>
    </div>
  </div>

  <!-- RIGHT: Leaderboard -->
  <div class="right-panel">
    <div class="lb-header">
      <span style="font-size:18px">&#x1F3C6;</span> Classement en direct
    </div>
    <div class="lb-list" id="lbList"></div>
  </div>
</div>

<!-- ═══ BREAKING NEWS TICKER ═══ -->
<div class="ticker-bar" id="tickerBar" style="display:none">
  <div class="ticker-badge">FLASH</div>
  <div class="ticker-content" id="tickerContent"></div>
</div>

<!-- ═══ SPOTLIGHT VIDEO ═══ -->
<div class="spotlight-wrap" id="spotlightWrap">
  <div class="spotlight-header">
    <div class="spotlight-live-dot"></div>
    <span>SPOTLIGHT</span>
    <span class="spotlight-name" id="spotlightName"></span>
  </div>
  <video id="spotlightVideo" class="spotlight-video" autoplay playsinline muted></video>
</div>

<!-- ═══ PARTICLES CONTAINER (for celebration effects) ═══ -->
<div id="particles" style="position:fixed;inset:0;pointer-events:none;z-index:200;overflow:hidden"></div>

<script src="/socket.io/socket.io.js"></script>
<script>
(function() {
  'use strict';

  var CIRC = 2 * Math.PI * 52; // 326.73
  var shareToken = '${shareToken}';
  var sock = null;
  var state = {
    status: 'waiting',
    currentQ: -1,
    totalQ: 0,
    duration: 0,
    remaining: 0,
    rankings: [],
    prevRankMap: {},
    participants: 0,
    eliminated: 0,
    qStats: { correct: 0, total: 0, percentage: 0 },
    establishments: [],
    pendingRankingUpdate: false,
  };

  // ═══ CONNECT ═══
  function connect() {
    var baseURL = window.location.origin;
    sock = io(baseURL + '/spectator', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    sock.on('connect', function() {
      console.log('[ARENA] Connected');
      sock.emit('join_arena', { shareToken: shareToken });
    });

    sock.on('disconnect', function() {
      console.log('[ARENA] Disconnected');
    });

    sock.on('arena_info', function(data) {
      document.getElementById('headerTitle').textContent = data.title;
      document.getElementById('waitTitle').textContent = data.title;
      document.getElementById('podiumTitle').textContent = data.title;
    });

    sock.on('participant_count', function(data) {
      state.participants = data.count;
      updateParticipants();
    });

    // ── CONTEST LIFECYCLE ──────────────────────────────
    sock.on('contest_state', function(data) {
      state.status = data.status;
      state.totalQ = data.totalQuestions;
      state.participants = data.participantCount || state.participants;
      state.eliminated = data.eliminatedCount || 0;
      updateParticipants();
      updateEliminated();

      if (data.status === 'running' || data.status === 'frozen' || data.status === 'paused') {
        showMain();
      }
    });

    sock.on('contest_start', function(data) {
      state.totalQ = data.totalQuestions;
      document.getElementById('waitSub').textContent = 'Le concours commence !';
      document.getElementById('waitSpinner').style.display = 'none';
    });

    sock.on('contest_countdown', function(data) {
      var v = data.value;
      var el = document.getElementById('waitCountdown');
      el.style.display = 'block';
      el.textContent = v > 0 ? v : 'GO !';
      el.style.color = v > 0 ? 'var(--gold)' : 'var(--green)';
      el.style.animation = 'none';
      void el.offsetWidth; // trigger reflow
      el.style.animation = 'countPulse 0.8s ease-out';

      if (v <= 0) {
        setTimeout(function() { showMain(); }, 600);
      }
    });

    sock.on('contest_question', function(data) {
      state.currentQ = data.questionIndex;
      state.duration = data.duration;
      state.remaining = data.remaining;
      state.qStats = { correct: 0, total: 0, percentage: 0 };

      // Hide reveal overlay from previous question
      document.getElementById('revealOverlay').classList.remove('active');

      showMain();

      // Progress
      var pct = state.totalQ > 0 ? ((data.questionIndex + 1) / state.totalQ) * 100 : 0;
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('progressLabel').textContent = (data.questionIndex + 1) + ' / ' + state.totalQ;

      // Question info
      document.getElementById('qType').textContent = formatType(data.questionType);
      document.getElementById('qPts').textContent = (data.points || 0) + ' PTS';
      document.getElementById('qText').textContent = data.questionText || '';

      // Timer
      updateTimer(data.remaining, data.duration);

      // Reset stats display
      document.getElementById('sAnswered').textContent = '0';
      document.getElementById('sCorrect').textContent = '--';
      document.getElementById('hAnswered').textContent = '0%';

      // Hide pause
      document.getElementById('pauseOverlay').classList.remove('active');
    });

    sock.on('contest_tick', function(data) {
      if (data.questionIndex !== state.currentQ) return;
      // Latency compensation
      var r = data.remaining;
      if (data.serverTimestamp) {
        var latency = Math.max(0, (Date.now() - data.serverTimestamp) / 1000);
        r = Math.max(0, r - latency);
      }
      state.remaining = r;
      updateTimer(r, state.duration);
    });

    sock.on('contest_question_stats', function(data) {
      state.qStats = data;
      document.getElementById('sAnswered').textContent = data.total;
      document.getElementById('sCorrect').textContent = data.percentage + '%';
      document.getElementById('sCorrect').style.color = data.percentage >= 50 ? 'var(--green)' : 'var(--red)';

      // Header answered %
      var answeredPct = state.participants > 0 ? Math.round((data.total / state.participants) * 100) : 0;
      document.getElementById('hAnswered').textContent = answeredPct + '%';
    });

    // ── PHASE DE VERROUILLAGE ──────────────────────────
    sock.on('contest_lock', function(data) {
      // Freeze timer at 0
      updateTimer(0, state.duration);

      // Visual lock state — timer turns red, status badge changes
      document.getElementById('timerSeconds').textContent = '\\u{1F512}';
      document.getElementById('timerSeconds').style.color = 'var(--red)';
      document.getElementById('timerRing').setAttribute('stroke', 'var(--red)');

      // Flash the stats bar answered percentage to 100%
      document.getElementById('hAnswered').textContent = '100%';
    });

    // ── MOMENT DE VERITE (Reveal Phase) ──────────────────
    sock.on('contest_reveal', function(data) {
      // Sound signal
      playRevealBeep();

      var overlay = document.getElementById('revealOverlay');
      overlay.classList.add('active');

      // Correct answer
      var ansEl = document.getElementById('revealAnswer');
      ansEl.textContent = data.correctAnswer || '--';

      // Explanation (if any)
      var explEl = document.getElementById('revealExplanation');
      if (data.explanation) {
        explEl.textContent = data.explanation;
        explEl.style.display = 'block';
      } else {
        explEl.style.display = 'none';
      }

      // Donut chart — green arc = correct %, red background = wrong %
      var DONUT_CIRC = 2 * Math.PI * 50; // 314.16
      var pct = data.stats ? data.stats.percentage : 0;
      var correctArc = (pct / 100) * DONUT_CIRC;

      var ringCorrect = document.getElementById('revealRingCorrect');

      // Reset before animating
      ringCorrect.style.transition = 'none';
      ringCorrect.setAttribute('stroke-dasharray', '0 ' + DONUT_CIRC);
      void ringCorrect.offsetWidth; // reflow

      ringCorrect.style.transition = 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)';
      ringCorrect.setAttribute('stroke-dasharray', correctArc + ' ' + DONUT_CIRC);

      // Percentage counter animation
      var pctEl = document.getElementById('revealPct');
      pctEl.style.color = pct >= 50 ? 'var(--green)' : 'var(--red)';
      animateCounter(pctEl, 0, pct, 1000);

      // Distribution items
      var distEl = document.getElementById('revealDistribution');
      distEl.innerHTML = '';
      if (data.distribution && data.distribution.length > 0) {
        var maxCount = Math.max.apply(null, data.distribution.map(function(d) { return d.count; }));
        var DIST_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#f43f5e', '#84cc16', '#ec4899'];
        data.distribution.forEach(function(d, idx) {
          var barPct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
          var color = DIST_COLORS[idx % DIST_COLORS.length];
          var item = document.createElement('div');
          item.className = 'reveal-dist-item' + (d.isCorrect ? ' correct' : '');
          item.style.animationDelay = (idx * 0.1) + 's';
          item.innerHTML = '<span class="reveal-dist-dot" style="background:' + (d.isCorrect ? 'var(--green)' : color) + '"></span>'
            + '<span>' + escapeHTMLJS(String(d.answer)) + '</span>'
            + '<span class="reveal-dist-bar"><span class="reveal-dist-bar-fill" style="width:0%;background:' + (d.isCorrect ? 'var(--green)' : color) + '"></span></span>'
            + '<span style="font-family:JetBrains Mono,monospace;font-size:13px;color:var(--muted)">' + d.count + ' (' + d.percentage + '%)</span>';
          distEl.appendChild(item);

          // Animate bar fill
          setTimeout(function(it, p) {
            var fill = it.querySelector('.reveal-dist-bar-fill');
            if (fill) fill.style.width = p + '%';
          }, 300 + idx * 100, item, barPct);
        });
      }

      // Stats row
      var statsRow = document.getElementById('revealStatsRow');
      var total = data.stats ? data.stats.total : 0;
      var correct = data.stats ? data.stats.correct : 0;
      statsRow.innerHTML = '<div class="reveal-stat"><div class="reveal-stat-val" style="color:var(--green)">' + correct + '</div><div class="reveal-stat-lbl">Correctes</div></div>'
        + '<div class="reveal-stat"><div class="reveal-stat-val" style="color:var(--red)">' + (total - correct) + '</div><div class="reveal-stat-lbl">Incorrectes</div></div>'
        + '<div class="reveal-stat"><div class="reveal-stat-val" style="color:var(--accent)">' + total + '</div><div class="reveal-stat-lbl">Reponses</div></div>';

      // After reveal duration, trigger leaderboard animation
      state.pendingRankingUpdate = true;
    });

    sock.on('contest_rankings', function(data) {
      // Track previous positions for rank-up animation
      var prevMap = {};
      state.rankings.forEach(function(r) { prevMap[r.sessionKey] = r.rank; });
      state.prevRankMap = prevMap;
      state.rankings = data || [];

      // If reveal is active, delay leaderboard render to sync with reveal phase
      var revealActive = document.getElementById('revealOverlay').classList.contains('active');
      if (revealActive && state.pendingRankingUpdate) {
        state.pendingRankingUpdate = false;
        // Wait 2s for the donut animation to finish, then animate leaderboard
        setTimeout(function() { renderLeaderboard(); }, 2000);
      } else {
        renderLeaderboard();
      }
    });

    sock.on('contest_pause', function() {
      document.getElementById('pauseOverlay').classList.add('active');
    });

    sock.on('contest_resume', function() {
      document.getElementById('pauseOverlay').classList.remove('active');
    });

    sock.on('contest_end', function(data) {
      showPodium(data.rankings || [], data.stats || [], data.establishments || []);
    });

    sock.on('contest_establishment_stats', function(data) {
      state.establishments = data || [];
    });

    // ── BREAKING NEWS ──────────────────────────────────
    sock.on('contest_breaking_news', function(events) {
      if (!events || !events.length) return;
      events.forEach(function(evt) { pushTickerItem(evt); });
    });

    sock.on('error_msg', function(data) {
      document.getElementById('waitSub').textContent = data.message || 'Erreur';
    });

    // ── SPOTLIGHT: WebRTC consumer for spectator display ──────
    var spotlightPC = null;
    var spotlightSessionKey = null;

    sock.on('spotlight_start', function(data) {
      spotlightSessionKey = data.sessionKey;
      document.getElementById('spotlightName').textContent = escapeHTMLJS(data.studentName || '');
    });

    sock.on('spotlight_student_ready', function(data) {
      // Student is ready, spectator creates a peer connection
      if (spotlightPC) { spotlightPC.close(); }
      spotlightPC = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
      });

      spotlightPC.ontrack = function(event) {
        var video = document.getElementById('spotlightVideo');
        video.srcObject = event.streams[0] || null;
        document.getElementById('spotlightWrap').classList.add('active');
      };

      spotlightPC.onicecandidate = function(event) {
        if (event.candidate) {
          sock.emit('spotlight_signal', {
            sessionKey: data.sessionKey,
            signal: { type: 'candidate', candidate: event.candidate },
          });
        }
      };

      // Receive-only (we want student's video)
      spotlightPC.addTransceiver('video', { direction: 'recvonly' });
      spotlightPC.addTransceiver('audio', { direction: 'recvonly' });
    });

    sock.on('spotlight_signal', function(data) {
      if (!spotlightPC) return;
      if (data.signal && data.signal.type === 'offer') {
        spotlightPC.setRemoteDescription(new RTCSessionDescription(data.signal.sdp || data.signal))
          .then(function() { return spotlightPC.createAnswer(); })
          .then(function(answer) {
            spotlightPC.setLocalDescription(answer);
            sock.emit('spotlight_signal', {
              sessionKey: data.sessionKey || spotlightSessionKey,
              signal: { type: 'answer', sdp: spotlightPC.localDescription },
            });
          });
      } else if (data.signal && data.signal.type === 'candidate') {
        spotlightPC.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
      }
    });

    sock.on('spotlight_stop', function() {
      if (spotlightPC) { spotlightPC.close(); spotlightPC = null; }
      var wrap = document.getElementById('spotlightWrap');
      wrap.classList.remove('active');
      var video = document.getElementById('spotlightVideo');
      video.srcObject = null;
      spotlightSessionKey = null;
    });
  }

  // ═══ BREAKING NEWS TICKER ═══
  var tickerQueue = [];
  var tickerVisible = false;
  var TICKER_MAX = 5;
  var TICKER_AUTO_HIDE = 8000; // hide after 8s of no news
  var tickerHideTimer = null;

  function pushTickerItem(evt) {
    var icon, msg;
    switch(evt.type) {
      case 'new_leader':
        icon = '&#x1F451;'; // crown
        msg = '<span class="ticker-name">' + escapeHTMLJS(evt.name) + '</span> <span class="ticker-msg">prend la tete du classement !</span>';
        spawnParticles();
        break;
      case 'top3_entry':
        var medals = { 1: '&#x1F947;', 2: '&#x1F948;', 3: '&#x1F949;' };
        icon = medals[evt.rank] || '&#x1F3C6;';
        msg = '<span class="ticker-name">' + escapeHTMLJS(evt.name) + '</span> <span class="ticker-msg">entre dans le Top ' + evt.rank + ' !</span>';
        break;
      case 'perfect_streak':
        icon = '&#x1F525;';
        msg = '<span class="ticker-name">' + escapeHTMLJS(evt.name) + '</span> <span class="ticker-msg">' + evt.streak + ' bonnes reponses d\\x27affilee !</span>';
        break;
      default: return;
    }

    tickerQueue.push({ icon: icon, msg: msg });
    if (tickerQueue.length > TICKER_MAX) tickerQueue.shift();
    renderTicker();
  }

  function renderTicker() {
    var bar = document.getElementById('tickerBar');
    var content = document.getElementById('tickerContent');
    bar.style.display = 'flex';
    tickerVisible = true;

    var html = '';
    for (var i = 0; i < tickerQueue.length; i++) {
      if (i > 0) html += '<span class="ticker-separator">&#x25C6;</span>';
      html += '<span class="ticker-item"><span class="ticker-icon">' + tickerQueue[i].icon + '</span>' + tickerQueue[i].msg + '</span>';
    }
    content.innerHTML = html;

    // Auto-hide after period of inactivity
    if (tickerHideTimer) clearTimeout(tickerHideTimer);
    tickerHideTimer = setTimeout(function() {
      bar.style.display = 'none';
      tickerVisible = false;
    }, TICKER_AUTO_HIDE);
  }

  // ═══ UI UPDATES ═══

  function showMain() {
    document.getElementById('waitingScreen').classList.add('hidden');
    document.getElementById('mainHeader').style.display = 'flex';
    document.getElementById('mainLayout').style.display = 'grid';
  }

  function updateTimer(remaining, duration) {
    var r = Math.max(0, Math.round(remaining));
    var el = document.getElementById('timerSeconds');
    el.textContent = r;

    var pct = duration > 0 ? (remaining / duration) * 100 : 0;
    var offset = CIRC * (1 - pct / 100);
    var ring = document.getElementById('timerRing');
    ring.setAttribute('stroke-dashoffset', offset);

    if (pct <= 10) { ring.setAttribute('stroke', 'var(--red)'); el.style.color = 'var(--red)'; }
    else if (pct <= 25) { ring.setAttribute('stroke', 'var(--gold)'); el.style.color = 'var(--gold)'; }
    else { ring.setAttribute('stroke', 'var(--accent)'); el.style.color = 'var(--text)'; }
  }

  function updateParticipants() {
    document.getElementById('hParticipants').textContent = state.participants;
    document.getElementById('sParticipants').textContent = state.participants;
  }

  function updateEliminated() {
    document.getElementById('sEliminated').textContent = state.eliminated;
  }

  // ═══ ANIMATED LEADERBOARD (FLIP-style absolute positioning) ═══
  var ROW_H = 56; // px per row
  var rowElements = {}; // sessionKey -> DOM element

  function renderLeaderboard() {
    var list = document.getElementById('lbList');
    var max = Math.min(state.rankings.length, 20);
    var seen = {};

    for (var i = 0; i < max; i++) {
      var r = state.rankings[i];
      seen[r.sessionKey] = true;
      var prevRank = state.prevRankMap[r.sessionKey];
      var movedUp = prevRank !== undefined && prevRank > r.rank;
      var isNew = !rowElements[r.sessionKey];
      var pct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
      var rankClass = r.rank <= 3 ? 'lb-rank-' + r.rank : 'lb-rank-default';

      // Streak badge (from server data)
      var streakHTML = '';
      if ((r.bestStreak || 0) >= 3) {
        streakHTML = '<span class="lb-streak">&#x1F525; ' + r.bestStreak + '</span>';
      }
      if (movedUp) {
        streakHTML += '<span class="lb-streak">&#x2B06;&#xFE0F;</span>';
      }

      var el = rowElements[r.sessionKey];
      if (!el) {
        // Create new row
        el = document.createElement('div');
        el.className = 'lb-row';
        el.dataset.key = r.sessionKey;
        list.appendChild(el);
        rowElements[r.sessionKey] = el;
      }

      // Update content
      el.innerHTML = '<div class="lb-rank ' + rankClass + '">' + r.rank + '</div>'
        + '<div class="lb-name">' + escapeHTMLJS(r.name) + streakHTML + '</div>'
        + '<div class="lb-score">' + r.score + '</div>'
        + '<div class="lb-pct">' + pct + '%</div>';

      // Animate position (FLIP: set top based on rank)
      var targetTop = i * ROW_H;
      el.style.top = targetTop + 'px';

      // Glow effects
      el.classList.remove('glow-gold', 'glow-up');
      if (r.rank === 1) el.classList.add('glow-gold');
      if (movedUp && !isNew) el.classList.add('glow-up');

      // Opacity for new entries
      if (isNew) {
        el.style.opacity = '0';
        requestAnimationFrame(function(e) { return function() { e.style.opacity = '1'; }; }(el));
      }
    }

    // Remove rows that dropped out of top 20
    Object.keys(rowElements).forEach(function(key) {
      if (!seen[key]) {
        var el = rowElements[key];
        el.style.opacity = '0';
        setTimeout(function() { el.remove(); }, 600);
        delete rowElements[key];
      }
    });

    // First place takeover particles
    if (state.rankings.length > 0) {
      var top = state.rankings[0];
      var prevTop = Object.keys(state.prevRankMap).find(function(k) { return state.prevRankMap[k] === 1; });
      if (prevTop && prevTop !== top.sessionKey) {
        spawnParticles();
      }
    }
  }

  function showPodium(rankings, stats, establishments) {
    document.getElementById('mainHeader').style.display = 'none';
    document.getElementById('mainLayout').style.display = 'none';
    document.getElementById('pauseOverlay').classList.remove('active');
    document.getElementById('tickerBar').style.display = 'none';

    var screen = document.getElementById('podiumScreen');
    screen.classList.add('active');

    var row = document.getElementById('podiumRow');
    var medals = ['&#x1F947;', '&#x1F948;', '&#x1F949;'];
    var order = [1, 0, 2]; // Display: silver(left), gold(center), bronze(right)
    var html = '';

    for (var i = 0; i < order.length; i++) {
      var idx = order[i];
      var r = rankings[idx];
      if (!r) continue;
      var pct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
      var estLabel = r.establishment ? '<div style="font-size:12px;color:var(--muted);margin-top:2px">' + escapeHTMLJS(r.establishment) + '</div>' : '';
      var delay = (i * 0.3) + 's';
      html += '<div class="podium-item podium-place-' + (idx + 1) + '" style="animation-delay:' + delay + '">'
        + '<div class="podium-medal" style="animation-delay:' + delay + '">' + medals[idx] + '</div>'
        + '<div class="podium-place-name">' + escapeHTMLJS(r.name) + '</div>'
        + estLabel
        + '<div class="podium-place-score">' + r.score + ' pts (' + pct + '%)</div>'
        + '<div class="podium-bar" style="animation-delay:' + delay + '">' + (idx + 1) + '</div>'
        + '</div>';
    }
    row.innerHTML = html;

    // Summary stats
    var totalCorrect = 0, totalQ = 0;
    stats.forEach(function(s) { totalCorrect += s.correct; totalQ += s.total; });
    var avgSuccess = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

    var statsHTML = '<div class="end-stat"><div class="end-stat-val" style="color:var(--purple)">' + rankings.length + '</div><div class="end-stat-lbl">Participants</div></div>'
      + '<div class="end-stat"><div class="end-stat-val" style="color:var(--accent)">' + stats.length + '</div><div class="end-stat-lbl">Questions</div></div>'
      + '<div class="end-stat"><div class="end-stat-val" style="color:var(--green)">' + avgSuccess + '%</div><div class="end-stat-lbl">Reussite moyenne</div></div>';
    if (rankings[0]) {
      statsHTML += '<div class="end-stat"><div class="end-stat-val" style="color:var(--gold)">' + rankings[0].score + '</div><div class="end-stat-lbl">Meilleur score</div></div>';
    }
    if (establishments && establishments.length > 0) {
      statsHTML += '<div class="end-stat"><div class="end-stat-val" style="color:var(--accent)">' + establishments.length + '</div><div class="end-stat-lbl">Etablissements</div></div>';
    }
    document.getElementById('endStats').innerHTML = statsHTML;

    // Establishment ranking table
    if (establishments && establishments.length > 0) {
      var estEl = document.getElementById('estRanking');
      estEl.style.display = 'block';
      var estHTML = '<table class="est-table"><caption>&#x1F3EB; Classement par Etablissement</caption>'
        + '<thead><tr><th>#</th><th>Etablissement</th><th>Moy.</th><th>Eleves</th><th>Meilleur</th></tr></thead><tbody>';
      var max = Math.min(establishments.length, 10);
      for (var i = 0; i < max; i++) {
        var e = establishments[i];
        estHTML += '<tr><td>' + (i + 1) + '</td>'
          + '<td class="est-name">' + escapeHTMLJS(e.name) + '</td>'
          + '<td class="est-pct">' + e.avgPct + '%</td>'
          + '<td>' + e.studentCount + '</td>'
          + '<td>' + escapeHTMLJS(e.bestStudent || '') + ' (' + e.bestScore + ')</td></tr>';
      }
      estHTML += '</tbody></table>';
      estEl.innerHTML = estHTML;
    }

    // Celebration particles
    setTimeout(function() { spawnParticles(); }, 500);
    setTimeout(function() { spawnParticles(); }, 1200);
    setTimeout(function() { spawnParticles(); }, 2000);
  }

  function spawnParticles() {
    var container = document.getElementById('particles');
    var colors = ['#fbbf24', '#3b82f6', '#4ade80', '#a78bfa', '#f43f5e', '#06b6d4'];
    for (var i = 0; i < 30; i++) {
      var p = document.createElement('div');
      var x = Math.random() * window.innerWidth;
      var y = window.innerHeight + 20;
      var size = 4 + Math.random() * 8;
      var color = colors[Math.floor(Math.random() * colors.length)];
      var dur = 1 + Math.random() * 2;
      var drift = (Math.random() - 0.5) * 200;
      p.style.cssText = 'position:absolute;left:' + x + 'px;bottom:-20px;width:' + size + 'px;height:' + size + 'px;'
        + 'background:' + color + ';border-radius:50%;'
        + 'animation:particles ' + dur + 's ease-out forwards;'
        + 'transform:translateX(' + drift + 'px);';
      container.appendChild(p);
      setTimeout(function(el) { el.remove(); }, dur * 1000 + 100, p);
    }
  }

  // ═══ WEB AUDIO BEEP (reveal signal) ═══
  var _audioCtx = null;
  function playRevealBeep() {
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var ctx = _audioCtx;
      // Two-tone beep: rising pitch
      [440, 660].forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3 + i * 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + 0.3 + i * 0.15);
      });
    } catch(e) { /* audio not available */ }
  }

  // ═══ ANIMATED COUNTER ═══
  function animateCounter(el, from, to, duration) {
    var start = performance.now();
    var diff = to - from;
    function frame(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + diff * eased) + '%';
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function formatType(t) {
    var map = {
      quiz: 'QCM', true_false: 'VRAI/FAUX', numeric: 'NUMERIQUE',
      fill_blank: 'TEXTE A TROUS', matching: 'ASSOCIATION',
      sequence: 'CLASSEMENT', open_answer: 'REPONSE LIBRE', likert: 'LIKERT',
    };
    return map[t] || (t || '').toUpperCase().replace('_', ' ');
  }

  function escapeHTMLJS(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ═══ FULLSCREEN TOGGLE (double-click) ═══
  document.addEventListener('dblclick', function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function(){});
    } else {
      document.exitFullscreen().catch(function(){});
    }
  });

  // ═══ INIT ═══
  connect();

})();
</script>
</body>
</html>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = router;
