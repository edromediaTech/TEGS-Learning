// Moniteur d'integrite d'une activite (TP, quiz, examen) : CDC TEGS-Edge, etape E6.
//
// Observe le poste pendant l'activite : perte de focus de la fenetre, onglet masque,
// sortie du plein ecran, copier / coller. Les evenements sont dates en DUREE RELATIVE
// (ms depuis le debut de l'activite, performance.now) : l'horloge du poste, souvent fausse
// hors ligne, n'intervient pas. Le resume voyage dans les traces xAPI de fin
// (context.extensions.integrity) et remonte au cloud avec elles, outbox du noeud comprise.

export interface IntegrityEvent {
  type: 'focus_loss' | 'tab_hidden' | 'fullscreen_exit' | 'copy' | 'paste';
  at_ms: number;
  duration_ms?: number;
}

export interface IntegritySummary {
  version: 1;
  level: 'ok' | 'attention' | 'suspect';
  duration_ms: number;
  focus_loss_count: number;
  focus_lost_ms: number;
  tab_hidden_count: number;
  hidden_ms: number;
  fullscreen_exit_count: number;
  copy_count: number;
  paste_count: number;
  events: IntegrityEvent[];
}

const MAX_EVENTS = 200;
// Seuils d'alerte pour l'enseignant (indices, pas une sanction automatique).
const ATTENTION = { focus_loss_count: 1, hidden_ms: 10_000, copy_paste: 1 };
const SUSPECT = { focus_loss_count: 3, hidden_ms: 30_000, copy_paste: 3 };

export function useIntegrityMonitor() {
  let t0 = 0;
  let running = false;
  let endedAt = 0;
  let focusLostAt: number | null = null;
  let hiddenAt: number | null = null;
  const s = {
    focus_loss_count: 0, focus_lost_ms: 0, tab_hidden_count: 0, hidden_ms: 0,
    fullscreen_exit_count: 0, copy_count: 0, paste_count: 0,
  };
  const events: IntegrityEvent[] = [];

  const now = () => Math.round(performance.now() - t0);
  const push = (e: IntegrityEvent) => { if (events.length < MAX_EVENTS) events.push(e); };

  function onBlur() {
    if (focusLostAt !== null) return;
    focusLostAt = now();
    s.focus_loss_count += 1;
  }
  function onFocus() {
    if (focusLostAt === null) return;
    const d = now() - focusLostAt;
    s.focus_lost_ms += d;
    push({ type: 'focus_loss', at_ms: focusLostAt, duration_ms: d });
    focusLostAt = null;
  }
  function onVisibility() {
    if (document.hidden) {
      if (hiddenAt !== null) return;
      hiddenAt = now();
      s.tab_hidden_count += 1;
    } else if (hiddenAt !== null) {
      const d = now() - hiddenAt;
      s.hidden_ms += d;
      push({ type: 'tab_hidden', at_ms: hiddenAt, duration_ms: d });
      hiddenAt = null;
    }
  }
  function onFullscreen() {
    if (!document.fullscreenElement) {
      s.fullscreen_exit_count += 1;
      push({ type: 'fullscreen_exit', at_ms: now() });
    }
  }
  function onCopy() { s.copy_count += 1; push({ type: 'copy', at_ms: now() }); }
  function onPaste() { s.paste_count += 1; push({ type: 'paste', at_ms: now() }); }

  function start() {
    if (running || typeof window === 'undefined') return;
    running = true;
    t0 = performance.now();
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
  }

  function stop() {
    if (!running) return;
    endedAt = now();
    running = false;
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('fullscreenchange', onFullscreen);
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('paste', onPaste);
  }

  /** Etat a l'instant (une absence en cours est comptee jusqu'a maintenant). */
  function summary(): IntegritySummary {
    const t = running ? now() : endedAt;
    const focusLost = s.focus_lost_ms + (focusLostAt !== null ? t - focusLostAt : 0);
    const hidden = s.hidden_ms + (hiddenAt !== null ? t - hiddenAt : 0);
    const copyPaste = s.copy_count + s.paste_count;
    const over = (lim: typeof ATTENTION) =>
      s.focus_loss_count >= lim.focus_loss_count || hidden >= lim.hidden_ms || copyPaste >= lim.copy_paste;
    return {
      version: 1,
      level: over(SUSPECT) ? 'suspect' : over(ATTENTION) ? 'attention' : 'ok',
      duration_ms: t,
      ...s,
      focus_lost_ms: focusLost,
      hidden_ms: hidden,
      events: [...events],
    };
  }

  return { start, stop, summary };
}
