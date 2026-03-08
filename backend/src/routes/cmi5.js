const express = require('express');
const Module = require('../models/Module');
const LaunchSession = require('../models/LaunchSession');
const User = require('../models/User');
const { generateCmi5Xml } = require('../services/cmi5Xml');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/cmi5/manifest/:moduleId
// Genere le cmi5.xml pour un module (necessite auth + tenant isolation)
// ---------------------------------------------------------------------------
router.get(
  '/manifest/:moduleId',
  authenticate,
  tenantIsolation,
  authorize('admin_ddene', 'teacher'),
  async (req, res, next) => {
    try {
      const mod = await Module.findOne({
        _id: req.params.moduleId,
        ...req.tenantFilter(),
      });

      if (!mod) {
        return res.status(404).json({ error: 'Module introuvable' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const xml = generateCmi5Xml(mod, baseUrl);

      res.set('Content-Type', 'application/xml');
      res.set('Content-Disposition', `attachment; filename="cmi5-${mod._id}.xml"`);
      res.send(xml);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/cmi5/manifest/:moduleId/json
// Retourne la structure cmi5 en JSON (pour le frontend)
// ---------------------------------------------------------------------------
router.get(
  '/manifest/:moduleId/json',
  authenticate,
  tenantIsolation,
  authorize('admin_ddene', 'teacher'),
  async (req, res, next) => {
    try {
      const mod = await Module.findOne({
        _id: req.params.moduleId,
        ...req.tenantFilter(),
      });

      if (!mod) {
        return res.status(404).json({ error: 'Module introuvable' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const courseId = `https://tegs-learning.edu.ht/courses/${mod._id}`;

      const blocks = (mod.sections || []).map((section) => ({
        id: `${courseId}/blocks/${section._id}`,
        title: section.title,
        aus: (section.screens || []).map((screen) => ({
          id: `${courseId}/au/${screen._id}`,
          title: screen.title,
          url: `${baseUrl}/api/cmi5/player/${mod._id}/${screen._id}`,
          moveOn: 'CompletedOrPassed',
          launchMethod: 'AnyWindow',
        })),
      }));

      res.json({
        courseId,
        title: mod.title,
        description: mod.description,
        language: mod.language,
        blocks,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/cmi5/launch/:moduleId/:screenId
// Genere une URL de lancement cmi5 pour un ecran specifique.
// Cree une LaunchSession avec un token unique.
// Retourne l'URL de lancement complete avec les parametres cmi5.
// ---------------------------------------------------------------------------
router.post(
  '/launch/:moduleId/:screenId',
  authenticate,
  tenantIsolation,
  async (req, res, next) => {
    try {
      const mod = await Module.findOne({
        _id: req.params.moduleId,
        ...req.tenantFilter(),
      });

      if (!mod) {
        return res.status(404).json({ error: 'Module introuvable' });
      }

      // Verifier que l'ecran existe
      let foundScreen = null;
      for (const section of mod.sections) {
        const screen = section.screens.id(req.params.screenId);
        if (screen) {
          foundScreen = screen;
          break;
        }
      }

      if (!foundScreen) {
        return res.status(404).json({ error: 'Ecran introuvable' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const activityId = `https://tegs-learning.edu.ht/courses/${mod._id}/au/${foundScreen._id}`;

      // Recuperer les infos de l'acteur
      const user = await User.findById(req.user.id);

      // Creer la session de lancement
      const session = await LaunchSession.create({
        module_id: mod._id,
        screen_id: foundScreen._id.toString(),
        user_id: req.user.id,
        tenant_id: req.tenantId,
        launchData: {
          contextTemplate: {
            extensions: {
              'https://tegs-learning.edu.ht/ext/tenant_id': req.tenantId.toString(),
              'https://tegs-learning.edu.ht/ext/module_id': mod._id.toString(),
            },
          },
          launchMode: 'Normal',
          moveOn: 'CompletedOrPassed',
          masteryScore: req.body.masteryScore || 0.7,
        },
      });

      // Construire l'URL de lancement cmi5
      const endpoint = `${baseUrl}/api/xapi`;
      const fetchUrl = `${baseUrl}/api/cmi5/fetch/${session.token}`;
      const actor = JSON.stringify({
        objectType: 'Agent',
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        mbox: user ? `mailto:${user.email}` : 'mailto:unknown@tegs.local',
      });

      const launchUrl = `${baseUrl}/api/cmi5/player/${mod._id}/${foundScreen._id}`
        + `?endpoint=${encodeURIComponent(endpoint)}`
        + `&fetch=${encodeURIComponent(fetchUrl)}`
        + `&registration=${session.registration}`
        + `&activityId=${encodeURIComponent(activityId)}`
        + `&actor=${encodeURIComponent(actor)}`
        + `&sessionId=${session._id}`;

      res.status(201).json({
        message: 'Session de lancement creee',
        launchUrl,
        sessionId: session._id,
        token: session.token,
        registration: session.registration,
        expiresAt: session.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/cmi5/fetch/:token
// Endpoint fetch cmi5 : le AU appelle cette URL pour recuperer les infos
// de session (auth-token, endpoint LRS, etc.)
// Conforme a la spec cmi5 : retourne un auth-token unique.
// ---------------------------------------------------------------------------
router.post('/fetch/:token', async (req, res, next) => {
  try {
    const session = await LaunchSession.findOne({ token: req.params.token });

    if (!session) {
      return res.status(404).json({ error: 'Session introuvable ou expiree' });
    }

    if (session.status !== 'created') {
      return res.status(409).json({ error: 'Session deja consommee' });
    }

    // Verifier l'expiration
    if (new Date() > session.expiresAt) {
      return res.status(410).json({ error: 'Session expiree' });
    }

    // Marquer la session comme fetched
    session.status = 'fetched';
    await session.save();

    // Retourner les donnees cmi5 au format attendu
    // La spec cmi5 attend un auth-token dans le body
    res.json({
      'auth-token': session.token,
      endpoint: `${req.protocol}://${req.get('host')}/api/xapi`,
      registration: session.registration,
      activityId: `https://tegs-learning.edu.ht/courses/${session.module_id}/au/${session.screen_id}`,
      actor: null, // sera recupere depuis la session
      launchData: session.launchData,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/cmi5/session/:sessionId
// Consulter le statut d'une session de lancement
// ---------------------------------------------------------------------------
router.get(
  '/session/:sessionId',
  authenticate,
  tenantIsolation,
  async (req, res, next) => {
    try {
      const session = await LaunchSession.findOne({
        _id: req.params.sessionId,
        tenant_id: req.tenantId,
      });

      if (!session) {
        return res.status(404).json({ error: 'Session introuvable' });
      }

      res.json({ session });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/cmi5/session/:sessionId/status
// Met a jour le statut d'une session (launched, completed, terminated)
// ---------------------------------------------------------------------------
router.put(
  '/session/:sessionId/status',
  authenticate,
  tenantIsolation,
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const validTransitions = ['launched', 'completed', 'terminated'];
      if (!validTransitions.includes(status)) {
        return res.status(400).json({ error: `Statut invalide: ${status}` });
      }

      const session = await LaunchSession.findOne({
        _id: req.params.sessionId,
        tenant_id: req.tenantId,
      });

      if (!session) {
        return res.status(404).json({ error: 'Session introuvable' });
      }

      session.status = status;
      await session.save();

      res.json({ message: 'Statut mis a jour', status: session.status });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/cmi5/state/:sessionId
// Sauvegarde l'etat (bookmark) de la session (ecran courant, progression)
// ---------------------------------------------------------------------------
router.put(
  '/state/:sessionId',
  authenticate,
  tenantIsolation,
  async (req, res, next) => {
    try {
      const session = await LaunchSession.findOne({
        _id: req.params.sessionId,
        tenant_id: req.tenantId,
      });

      if (!session) {
        return res.status(404).json({ error: 'Session introuvable' });
      }

      session.launchData = {
        ...session.launchData,
        state: req.body,
      };
      await session.save();

      res.json({ message: 'Etat sauvegarde' });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/cmi5/state/:sessionId
// Recupere l'etat sauvegarde d'une session
// ---------------------------------------------------------------------------
router.get(
  '/state/:sessionId',
  authenticate,
  tenantIsolation,
  async (req, res, next) => {
    try {
      const session = await LaunchSession.findOne({
        _id: req.params.sessionId,
        tenant_id: req.tenantId,
      });

      if (!session) {
        return res.status(404).json({ error: 'Session introuvable' });
      }

      res.json(session.launchData?.state || {});
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/cmi5/player/:moduleId/:screenId
// Page de lancement du contenu (player cmi5).
// Retourne une page HTML minimale qui charge le contenu de l'ecran.
// ---------------------------------------------------------------------------
router.get('/player/:moduleId/:screenId', async (req, res, next) => {
  try {
    const { endpoint, fetch: fetchUrl, registration, activityId, actor, sessionId } = req.query;

    // Escape values for safe HTML injection
    const safeReg = (registration || 'N/A').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeActivity = activityId
      ? decodeURIComponent(activityId).replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : 'N/A';

    res.set('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TEGS-Learning Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; }
    .player-header { background: #1e40af; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    .player-header h1 { font-size: 18px; }
    .player-header .actions button { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-left: 8px; font-size: 14px; }
    .player-header .actions button:hover { background: #2563eb; }
    .player-header .actions button.danger { background: #ef4444; }
    .player-content { max-width: 800px; margin: 24px auto; padding: 0 16px; }
    .cmi5-info { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 14px; }
    .cmi5-info code { background: #dbeafe; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    #screen-content { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; }
    .loading { text-align: center; padding: 48px; color: #6b7280; }
    .block { margin-bottom: 24px; }
    .block-text { line-height: 1.7; white-space: pre-wrap; }
    .block-media img { max-width: 100%; border-radius: 8px; }
    .block-media video { max-width: 100%; border-radius: 8px; }
    .block-media .caption { font-size: 13px; color: #6b7280; margin-top: 8px; text-align: center; }
    .block-quiz { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .block-quiz h3 { margin-bottom: 12px; font-size: 16px; }
    .block-quiz .option { display: block; padding: 10px 16px; margin: 6px 0; background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }
    .block-quiz .option:hover { background: #eff6ff; }
    .block-quiz .option.selected { background: #dbeafe; border-color: #3b82f6; }
    .block-quiz .option.correct { background: #dcfce7; border-color: #16a34a; }
    .block-quiz .option.wrong { background: #fee2e2; border-color: #dc2626; }
    .block-quiz .submit-quiz { margin-top: 12px; background: #1e40af; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    .block-quiz .feedback { margin-top: 12px; padding: 12px; border-radius: 6px; font-weight: 500; }
    .block-quiz .feedback.pass { background: #dcfce7; color: #166534; }
    .block-quiz .feedback.fail { background: #fee2e2; color: #991b1b; }
    #tracking-status { position: fixed; bottom: 16px; right: 16px; background: #1e293b; color: #94a3b8; padding: 8px 16px; border-radius: 8px; font-size: 12px; z-index: 100; }
    #tracking-status.ok { color: #4ade80; }
    #tracking-status.error { color: #f87171; }
  </style>
</head>
<body>
  <div class="player-header">
    <h1>TEGS-Learning Player cmi5</h1>
    <div class="actions">
      <button onclick="handleComplete()">Terminer le contenu</button>
      <button class="danger" onclick="handleClose()">Fermer</button>
    </div>
  </div>
  <div class="player-content">
    <div class="cmi5-info">
      <strong>Session cmi5</strong><br>
      Registration: <code>${safeReg}</code><br>
      Activity: <code>${safeActivity}</code>
    </div>
    <div id="screen-content">
      <div class="loading">Chargement du contenu...</div>
    </div>
  </div>
  <div id="tracking-status">Tracking: initialisation...</div>

  <script src="/public/js/tegs-runtime.js"></script>
  <script>
    let runtime = null;

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function renderBlocks(blocks) {
      if (!blocks || blocks.length === 0) {
        return '<p style="color:#6b7280;">Aucun contenu pour cet ecran.</p>';
      }
      return blocks.sort((a,b) => a.order - b.order).map((block, idx) => {
        if (block.type === 'text') {
          return '<div class="block block-text">' + escapeHtml(block.data.content || '') + '</div>';
        }
        if (block.type === 'media') {
          const d = block.data;
          let html = '<div class="block block-media">';
          if (d.mediaType === 'video') {
            html += '<video controls src="' + escapeHtml(d.url) + '"></video>';
          } else {
            html += '<img src="' + escapeHtml(d.url) + '" alt="' + escapeHtml(d.caption || '') + '">';
          }
          if (d.caption) html += '<div class="caption">' + escapeHtml(d.caption) + '</div>';
          html += '</div>';
          return html;
        }
        if (block.type === 'quiz') {
          const q = block.data;
          const qid = 'quiz-' + idx;
          let html = '<div class="block block-quiz" id="' + qid + '">';
          html += '<h3>' + escapeHtml(q.question || 'Question') + '</h3>';
          (q.options || []).forEach((opt, i) => {
            html += '<div class="option" data-quiz="' + qid + '" data-idx="' + i + '" data-correct="' + (i === q.correctIndex ? '1' : '0') + '" onclick="selectOption(this)">' + escapeHtml(opt) + '</div>';
          });
          html += '<button class="submit-quiz" onclick="submitQuiz(\\''+qid+'\\', ' + (q.correctIndex || 0) + ')">Valider</button>';
          html += '<div class="feedback" id="' + qid + '-feedback" style="display:none;"></div>';
          html += '</div>';
          return html;
        }
        return '';
      }).join('');
    }

    function selectOption(el) {
      const qid = el.dataset.quiz;
      document.querySelectorAll('[data-quiz="'+qid+'"]').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
    }

    async function submitQuiz(qid, correctIdx) {
      const options = document.querySelectorAll('[data-quiz="'+qid+'"]');
      const selected = document.querySelector('[data-quiz="'+qid+'"].selected');
      if (!selected) return;

      const selectedIdx = parseInt(selected.dataset.idx);
      const isCorrect = selected.dataset.correct === '1';
      const fb = document.getElementById(qid + '-feedback');

      options.forEach(o => {
        o.style.pointerEvents = 'none';
        if (o.dataset.correct === '1') o.classList.add('correct');
        if (o.classList.contains('selected') && !isCorrect) o.classList.add('wrong');
      });

      if (isCorrect) {
        fb.className = 'feedback pass';
        fb.textContent = 'Correct !';
      } else {
        fb.className = 'feedback fail';
        fb.textContent = 'Incorrect.';
      }
      fb.style.display = 'block';

      // Send score via runtime
      if (runtime) {
        const score = isCorrect ? 1.0 : 0.0;
        if (isCorrect) {
          await runtime.passed(score);
        } else {
          await runtime.failed(score);
        }
        updateStatus('Score envoye: ' + (isCorrect ? 'Passed' : 'Failed'), 'ok');
      }
    }

    async function handleComplete() {
      if (runtime) {
        await runtime.completed();
        updateStatus('Completed envoye', 'ok');
      }
    }

    async function handleClose() {
      if (runtime) {
        await runtime.terminate();
        updateStatus('Terminated - session fermee', 'ok');
      }
      setTimeout(() => { window.close(); }, 500);
    }

    function updateStatus(msg, cls) {
      const el = document.getElementById('tracking-status');
      el.textContent = 'Tracking: ' + msg;
      el.className = cls || '';
    }

    // --- Main launch sequence ---
    (async function() {
      const fetchUrl = ${JSON.stringify(fetchUrl || '')};
      const moduleId = ${JSON.stringify(req.params.moduleId)};
      const screenId = ${JSON.stringify(req.params.screenId)};
      const actorParam = ${JSON.stringify(actor || '')};
      const registrationParam = ${JSON.stringify(registration || '')};
      const activityIdParam = ${JSON.stringify(activityId || '')};
      const endpointParam = ${JSON.stringify(endpoint || '')};

      let authToken = null;
      let sessionData = null;

      // Step 1: cmi5 Fetch
      if (fetchUrl) {
        try {
          const fetchRes = await fetch(decodeURIComponent(fetchUrl), { method: 'POST' });
          if (fetchRes.ok) {
            sessionData = await fetchRes.json();
            authToken = sessionData['auth-token'];
            updateStatus('Session fetched', 'ok');
          } else {
            updateStatus('Fetch echoue (' + fetchRes.status + ')', 'error');
          }
        } catch (e) {
          updateStatus('Fetch erreur: ' + e.message, 'error');
        }
      }

      // Step 2: Load screen content
      if (authToken && endpointParam) {
        try {
          const contentUrl = decodeURIComponent(endpointParam).replace('/xapi', '') + '/modules/' + moduleId + '/screens/' + screenId;
          const contentRes = await fetch(contentUrl, {
            headers: { 'Authorization': 'Bearer ' + authToken }
          });
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            document.getElementById('screen-content').innerHTML = renderBlocks(contentData.screen.contentBlocks);
          } else {
            document.getElementById('screen-content').innerHTML = '<p>Contenu non disponible.</p>';
          }
        } catch (e) {
          document.getElementById('screen-content').innerHTML = '<p>Erreur de chargement.</p>';
        }
      }

      // Step 3: Initialize runtime
      if (authToken && endpointParam) {
        let actorObj = {};
        try { actorObj = JSON.parse(decodeURIComponent(actorParam)); } catch(e) {}

        // Extract sessionId from context extensions if available
        let sessionId = null;
        if (sessionData && sessionData.launchData) {
          // sessionId stored in launch context
        }
        // Try to get sessionId from fetchUrl path
        const fetchParts = decodeURIComponent(fetchUrl).split('/fetch/');
        if (fetchParts[1]) {
          // We need the sessionId, get it from the endpoint
          try {
            // The session ID is not in the token - we need to request it
            // For now, store the token as reference
          } catch(e) {}
        }

        runtime = new TEGSRuntime({
          endpoint: decodeURIComponent(endpointParam),
          authToken: authToken,
          registration: registrationParam,
          activityId: decodeURIComponent(activityIdParam),
          actor: actorObj,
          sessionId: ${JSON.stringify(sessionId || '')},
        });

        await runtime.initialize();
        updateStatus('Initialized', 'ok');

        // Send Experienced for this screen
        await runtime.experienced(document.title);
        updateStatus('En cours...', 'ok');
      }
    })();

    // Terminate on page unload
    window.addEventListener('beforeunload', function() {
      if (runtime && !runtime._terminated) {
        // Use sendBeacon for reliability
        const url = runtime.endpoint + '/statements';
        const stmt = JSON.stringify({
          verb: { id: 'http://adlnet.gov/expapi/verbs/terminated', display: { 'fr-HT': 'a mis fin' } },
          object: { id: runtime.activityId, objectType: 'Activity' },
          context: { registration: runtime.registration },
        });
        navigator.sendBeacon(url, new Blob([stmt], { type: 'application/json' }));
      }
    });
  </script>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
