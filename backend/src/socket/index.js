const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Module = require('../models/Module');
const LiveSession = require('../models/LiveSession');
const ProctoringEvidence = require('../models/ProctoringEvidence');
const { setupTournamentNamespace } = require('./tournament');

/**
 * TEGS-Learning — National Challenge Engine
 *
 * Architecture:
 *   /prof    — JWT-authenticated professors (dashboard & controls)
 *   /student — Public namespace (exam pages, no auth)
 *
 * CompetitionManager — Server-side forced sequencing
 *   - NEXT_QUESTION_TRIGGER broadcast to all clients simultaneously
 *   - Atomic locking: UI freezes at T+0, answer force-submitted
 *   - Per-question countdown with heartbeat sync (1s ticks)
 *   - Elimination on fullscreen exit (configurable)
 *
 * WebRTC Bridge — On-demand media signaling
 *   - Professor opens mic/camera of specific student
 *   - Signaling relay (offer → answer → ICE candidates)
 *
 * Audio Proctoring
 *   - Students monitor mic levels via Web Audio API
 *   - Noise threshold alerts sent to professor
 *
 * Room: `live:<moduleId>`
 */

let io = null;

// ═══════════════════════════════════════════════════════════════
// COMPETITION MANAGER
// ═══════════════════════════════════════════════════════════════
const competitions = new Map();

class CompetitionManager {
  constructor(moduleId, questions, config = {}) {
    this.moduleId = moduleId;
    this.questions = questions; // [{index, text, type, points, duration, choices}]
    this.currentIndex = -1;
    this.status = 'lobby'; // lobby | countdown | running | frozen | paused | finished
    this.timer = null;
    this.remaining = 0;
    this.startedAt = null;
    this.questionStartedAt = null;
    this.transitionTimer = null;

    // Per-question answer tracking
    this.answers = new Map();

    // Eliminated students (fullscreen exit, etc.)
    this.eliminated = new Set();

    // Config
    this.eliminateOnFullscreenExit = config.eliminateOnFullscreenExit !== false;
    this.transitionDelay = config.transitionDelay || 2000; // ms between questions
    this.snapshotInterval = config.snapshotInterval || 30;
    this.snapshotTimer = null;
    this.proctoring = config.proctoring || 'none';

    // Rankings (live leaderboard)
    this.scores = new Map(); // sessionKey -> { name, score, maxScore, answeredCount, avgTime, streak, bestStreak }

    // Previous top-3 for breaking news detection
    this.prevTop3 = [];

    // Broadcast limit for spectators
    this.spectatorTopN = config.spectatorTopN || 20;
  }

  get room() { return `live:${this.moduleId}`; }
  get currentQuestion() { return this.questions[this.currentIndex] || null; }
  get totalQuestions() { return this.questions.length; }

  toJSON() {
    return {
      moduleId: this.moduleId,
      status: this.status,
      currentIndex: this.currentIndex,
      totalQuestions: this.totalQuestions,
      currentQuestion: this.currentQuestion,
      remaining: this.remaining,
      startedAt: this.startedAt,
      eliminatedCount: this.eliminated.size,
      participantCount: this.scores.size,
    };
  }

  getRankings() {
    return Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score || a.avgTime - b.avgTime)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }

  /**
   * Detect top-3 changes and return breaking news events.
   * Call AFTER updating scores but BEFORE updating prevTop3.
   */
  detectBreakingNews(newRankings) {
    const events = [];
    const newTop3 = newRankings.slice(0, 3);
    const prevKeys = this.prevTop3.map(r => r.sessionKey);

    for (const entry of newTop3) {
      const prevRank = prevKeys.indexOf(entry.sessionKey);
      // New entrant to top 3
      if (prevRank === -1) {
        events.push({
          type: 'top3_entry',
          name: entry.name,
          rank: entry.rank,
          score: entry.score,
          streak: entry.bestStreak || 0,
        });
      }
    }

    // #1 takeover
    if (newTop3[0] && (!this.prevTop3[0] || newTop3[0].sessionKey !== this.prevTop3[0].sessionKey)) {
      events.push({
        type: 'new_leader',
        name: newTop3[0].name,
        score: newTop3[0].score,
        streak: newTop3[0].bestStreak || 0,
      });
    }

    // Perfect streak (5+ correct in a row)
    for (const entry of newRankings) {
      if (entry.streak >= 5 && entry.streak % 5 === 0) {
        events.push({
          type: 'perfect_streak',
          name: entry.name,
          streak: entry.streak,
          rank: entry.rank,
        });
      }
    }

    this.prevTop3 = newTop3.map(r => ({ ...r }));
    return events;
  }

  /**
   * Aggregate scores by establishment (school).
   * Returns sorted array: best avg score first.
   */
  getEstablishmentStats() {
    const estMap = new Map(); // establishment -> { name, totalScore, totalMax, count, bestStudent }
    for (const s of this.scores.values()) {
      const est = s.establishment || '';
      if (!est) continue;
      if (!estMap.has(est)) {
        estMap.set(est, { name: est, totalScore: 0, totalMax: 0, count: 0, bestStudent: null, bestScore: 0 });
      }
      const e = estMap.get(est);
      e.totalScore += s.score;
      e.totalMax += s.maxScore;
      e.count++;
      if (s.score > e.bestScore) {
        e.bestScore = s.score;
        e.bestStudent = s.name;
      }
    }
    return Array.from(estMap.values())
      .map(e => ({
        name: e.name,
        avgScore: e.count > 0 ? Math.round(e.totalScore / e.count) : 0,
        avgPct: e.totalMax > 0 ? Math.round((e.totalScore / e.totalMax) * 100) : 0,
        studentCount: e.count,
        bestStudent: e.bestStudent,
        bestScore: e.bestScore,
      }))
      .sort((a, b) => b.avgPct - a.avgPct || b.avgScore - a.avgScore);
  }
}

function getCompetition(moduleId) {
  return competitions.get(moduleId) || null;
}

// ═══════════════════════════════════════════════════════════════

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3002',
        'http://127.0.0.1:3002',
        process.env.FRONTEND_URL,
        'https://luminous-mesh-459718-p4.web.app',
        'https://luminous-mesh-459718-p4.firebaseapp.com',
      ].filter(Boolean),
      credentials: true,
    },
    path: '/socket.io',
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 2e6,
  });

  global._io = io;

  setupProfessorNamespace();
  setupStudentNamespace();
  setupSpectatorNamespace();
  setupTournamentNamespace(io);

  console.log('[SOCKET] National Challenge Engine + Tournament namespace initialise');
  return io;
}

// ═══════════════════════════════════════════════════════════════
// PROFESSOR NAMESPACE
// ═══════════════════════════════════════════════════════════════
function setupProfessorNamespace() {
  const profNsp = io.of('/prof');

  profNsp.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.tenantId = decoded.tenant_id;
      socket.role = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  profNsp.on('connection', (socket) => {
    console.log(`[SOCKET] Prof connected: ${socket.userId}`);

    socket.on('join_room', async ({ moduleId }) => {
      try {
        const mod = await Module.findOne({
          _id: moduleId,
          tenant_id: socket.tenantId,
        }).lean();
        if (!mod) return socket.emit('error_msg', { message: 'Module introuvable' });

        const room = `live:${moduleId}`;
        socket.join(room);
        socket.moduleId = moduleId;

        const roster = getConnectedStudents(moduleId);
        socket.emit('student_roster', roster);

        const comp = getCompetition(moduleId);
        if (comp) {
          socket.emit('contest_state', comp.toJSON());
          socket.emit('contest_rankings', comp.getRankings());
        }

        console.log(`[SOCKET] Prof ${socket.userId} joined ${room} (${roster.length} students)`);
      } catch (err) {
        console.error('[SOCKET] join_room error:', err.message);
        socket.emit('error_msg', { message: 'Erreur serveur' });
      }
    });

    // ── COMPETITION CONTROLS ──────────────────────────────
    socket.on('contest_start', async ({ moduleId }) => {
      try {
        const mod = await Module.findOne({
          _id: moduleId,
          tenant_id: socket.tenantId,
        }).lean();
        if (!mod) return socket.emit('error_msg', { message: 'Module introuvable' });

        const questions = [];
        for (const section of mod.sections || []) {
          for (const screen of section.screens || []) {
            for (const block of screen.contentBlocks || []) {
              if (['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'open_answer'].includes(block.type)) {
                const bd = block.data || {};
                // Extract correct answer and full choice data for the reveal phase
                const choicesRaw = bd.options || [];
                const choices = choicesRaw.map(o => typeof o === 'string' ? o : (o.text || ''));
                let correctAnswer = null;
                let correctIndex = -1;

                if (block.type === 'quiz') {
                  correctIndex = choicesRaw.findIndex(o => o.isCorrect);
                  correctAnswer = correctIndex >= 0 ? choices[correctIndex] : null;
                } else if (block.type === 'true_false') {
                  correctAnswer = bd.answer === true || bd.answer === 'true' ? 'Vrai' : 'Faux';
                } else if (block.type === 'numeric') {
                  correctAnswer = String(bd.answer ?? '');
                } else if (block.type === 'fill_blank') {
                  correctAnswer = bd.answer || '';
                } else if (block.type === 'matching' || block.type === 'sequence') {
                  correctAnswer = '(voir correction)';
                } else if (block.type === 'open_answer') {
                  correctAnswer = bd.answer || '(evaluation manuelle)';
                }

                questions.push({
                  index: questions.length,
                  text: bd.question || bd.statement || bd.text || '',
                  type: block.type,
                  points: bd.points || 0,
                  duration: (bd.duration || 1) * 60,
                  choices,
                  correctAnswer,
                  correctIndex,
                  explanation: bd.explanation || null,
                });
              }
            }
          }
        }

        if (questions.length === 0) {
          return socket.emit('error_msg', { message: 'Aucune question trouvee' });
        }

        const comp = new CompetitionManager(moduleId, questions, {
          snapshotInterval: mod.snapshotInterval || 30,
          proctoring: mod.proctoring || 'none',
          eliminateOnFullscreenExit: true,
        });
        comp.status = 'countdown';
        comp.startedAt = new Date().toISOString();
        competitions.set(moduleId, comp);

        const room = `live:${moduleId}`;

        // 3-second countdown before first question
        emitToStudents(room, 'contest_start', {
          totalQuestions: questions.length,
          startedAt: comp.startedAt,
          countdown: 3,
        });
        emitToProfs(room, 'contest_state', comp.toJSON());
        emitToSpectators(room, 'contest_state', comp.toJSON());
        emitToSpectators(room, 'contest_start', { totalQuestions: questions.length, startedAt: comp.startedAt, countdown: 3 });

        console.log(`[COMPETITION] Started for ${moduleId} — ${questions.length} questions`);

        // Start proctoring
        if (comp.proctoring === 'snapshot') {
          startSnapshotRequests(comp);
        }

        // Countdown 3…2…1…GO
        let cd = 3;
        const cdTimer = setInterval(() => {
          cd--;
          emitToStudents(room, 'contest_countdown', { value: cd });
          emitToProfs(room, 'contest_countdown', { value: cd });
          emitToSpectators(room, 'contest_countdown', { value: cd });
          if (cd <= 0) {
            clearInterval(cdTimer);
            comp.status = 'running';
            advanceCompetition(moduleId);
          }
        }, 1000);
      } catch (err) {
        console.error('[SOCKET] contest_start error:', err.message);
        socket.emit('error_msg', { message: 'Erreur demarrage' });
      }
    });

    socket.on('contest_pause', ({ moduleId }) => {
      const comp = getCompetition(moduleId);
      if (!comp || comp.status !== 'running') return;
      comp.status = 'paused';
      if (comp.timer) { clearInterval(comp.timer); comp.timer = null; }
      const room = `live:${moduleId}`;
      emitToStudents(room, 'contest_pause', { remaining: comp.remaining });
      emitToProfs(room, 'contest_state', comp.toJSON());
      emitToSpectators(room, 'contest_pause', { remaining: comp.remaining });
      emitToSpectators(room, 'contest_state', comp.toJSON());
    });

    socket.on('contest_resume', ({ moduleId }) => {
      const comp = getCompetition(moduleId);
      if (!comp || comp.status !== 'paused') return;
      comp.status = 'running';
      startQuestionTimer(moduleId);
      const room = `live:${moduleId}`;
      emitToStudents(room, 'contest_resume', { questionIndex: comp.currentIndex, remaining: comp.remaining });
      emitToProfs(room, 'contest_state', comp.toJSON());
      emitToSpectators(room, 'contest_resume', { questionIndex: comp.currentIndex, remaining: comp.remaining });
      emitToSpectators(room, 'contest_state', comp.toJSON());
    });

    socket.on('contest_skip', ({ moduleId }) => {
      const comp = getCompetition(moduleId);
      if (!comp || comp.status !== 'running') return;
      if (comp.timer) { clearInterval(comp.timer); comp.timer = null; }
      freezeAndAdvance(moduleId);
    });

    socket.on('contest_stop', ({ moduleId }) => {
      const comp = getCompetition(moduleId);
      if (!comp) return;
      endCompetition(moduleId, 'stopped');
    });

    // ── PROCTORING CONTROLS ───────────────────────────────
    socket.on('proctor_request_snapshot', ({ moduleId, sessionKey }) => {
      if (!io) return;
      const studentNsp = io.of('/student');
      for (const [, s] of studentNsp.sockets) {
        if (s.moduleId === moduleId && s.sessionKey === sessionKey) {
          s.emit('snapshot_request', { reason: 'manual' });
          break;
        }
      }
    });

    socket.on('proctor_request_all_snapshots', ({ moduleId }) => {
      emitToStudents(`live:${moduleId}`, 'snapshot_request', { reason: 'scheduled' });
    });

    // ── WEBRTC SIGNALING ──────────────────────────────────
    // Professor initiates media request to a specific student
    socket.on('webrtc_request_media', ({ moduleId, sessionKey, mediaType }) => {
      // mediaType: 'camera' | 'mic' | 'both'
      if (!io) return;
      const studentNsp = io.of('/student');
      for (const [, s] of studentNsp.sockets) {
        if (s.moduleId === moduleId && s.sessionKey === sessionKey) {
          s.emit('webrtc_media_request', {
            mediaType,
            profSocketId: socket.id,
          });
          break;
        }
      }
    });

    // Relay WebRTC signaling messages (offer/answer/ICE)
    socket.on('webrtc_signal', ({ targetSessionKey, moduleId, signal }) => {
      if (!io) return;
      const studentNsp = io.of('/student');
      for (const [, s] of studentNsp.sockets) {
        if (s.moduleId === moduleId && s.sessionKey === targetSessionKey) {
          s.emit('webrtc_signal', { signal, fromProf: true });
          break;
        }
      }
    });

    socket.on('webrtc_stop_media', ({ moduleId, sessionKey }) => {
      if (!io) return;
      const studentNsp = io.of('/student');
      for (const [, s] of studentNsp.sockets) {
        if (s.moduleId === moduleId && s.sessionKey === sessionKey) {
          s.emit('webrtc_stop');
          break;
        }
      }
    });

    // ── SPOTLIGHT: Professor pushes a student's camera to the live-arena display ──
    socket.on('spotlight_start', ({ moduleId, sessionKey, studentName }) => {
      if (!io) return;
      const room = `live:${moduleId}`;

      // Tell student to create a SECOND peer connection for spectators
      const studentNsp = io.of('/student');
      for (const [, s] of studentNsp.sockets) {
        if (s.moduleId === moduleId && s.sessionKey === sessionKey) {
          s.emit('spotlight_request', { mediaType: 'camera' });
          break;
        }
      }

      // Tell spectators that a spotlight is starting
      emitToSpectators(room, 'spotlight_start', {
        sessionKey,
        studentName: studentName || 'Eleve',
      });

      console.log(`[SPOTLIGHT] Prof requested spotlight on "${studentName}" in ${room}`);
    });

    socket.on('spotlight_stop', ({ moduleId, sessionKey }) => {
      if (!io) return;
      const room = `live:${moduleId}`;

      // Tell student to close spotlight peer connection
      const studentNsp = io.of('/student');
      for (const [, s] of studentNsp.sockets) {
        if (s.moduleId === moduleId && s.sessionKey === sessionKey) {
          s.emit('spotlight_stop');
          break;
        }
      }

      // Tell spectators the spotlight ended
      emitToSpectators(room, 'spotlight_stop', {});

      console.log(`[SPOTLIGHT] Stopped in ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Prof disconnected: ${socket.userId}`);
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// STUDENT NAMESPACE
// ═══════════════════════════════════════════════════════════════
function setupStudentNamespace() {
  const studentNsp = io.of('/student');

  studentNsp.on('connection', (socket) => {

    socket.on('join_exam', async ({ shareToken, sessionKey, studentName, establishment }) => {
      try {
        const mod = await Module.findOne({ shareToken, shareEnabled: true })
          .select('_id tenant_id evaluationType contestMode proctoring snapshotInterval')
          .lean();
        if (!mod) return socket.emit('error_msg', { message: 'Module introuvable' });

        const room = `live:${mod._id}`;
        socket.join(room);
        socket.moduleId = mod._id.toString();
        socket.tenantId = mod.tenant_id?.toString() || null;
        socket.sessionKey = sessionKey;
        socket.studentName = studentName || 'Anonyme';
        socket.establishment = establishment || '';
        socket.studentScore = 0;
        socket.studentMaxScore = 0;
        socket.answeredCount = 0;
        socket.currentScreen = 0;
        socket.blurCount = 0;
        socket.status = 'online';

        emitToProfs(room, 'student_joined', {
          sessionKey,
          studentName: socket.studentName,
          establishment: socket.establishment,
          joinedAt: new Date().toISOString(),
        });

        // If competition is active, sync late joiner
        const comp = getCompetition(socket.moduleId);
        if (comp && comp.status !== 'finished' && comp.status !== 'lobby') {
          socket.emit('contest_start', {
            totalQuestions: comp.totalQuestions,
            startedAt: comp.startedAt,
            countdown: 0,
          });
          if (comp.currentQuestion && (comp.status === 'running' || comp.status === 'paused' || comp.status === 'frozen')) {
            socket.emit('contest_question', {
              questionIndex: comp.currentIndex,
              totalQuestions: comp.totalQuestions,
              duration: comp.currentQuestion.duration,
              remaining: comp.status === 'frozen' ? 0 : comp.remaining,
              questionText: comp.currentQuestion.text,
              questionType: comp.currentQuestion.type,
              points: comp.currentQuestion.points,
            });
            if (comp.status === 'paused') {
              socket.emit('contest_pause', { remaining: comp.remaining });
            }
            if (comp.status === 'frozen') {
              socket.emit('contest_lock', { questionIndex: comp.currentIndex });
            }
          }
          // Check if eliminated
          if (comp.eliminated.has(sessionKey)) {
            socket.emit('contest_eliminated', { reason: 'fullscreen_exit' });
          }
        }

        // Register in competition scores
        if (comp && !comp.scores.has(sessionKey)) {
          comp.scores.set(sessionKey, {
            sessionKey,
            name: socket.studentName,
            establishment: socket.establishment || '',
            score: 0,
            maxScore: 0,
            answeredCount: 0,
            avgTime: 0,
            totalTime: 0,
            streak: 0,
            bestStreak: 0,
          });
        }

        console.log(`[SOCKET] Student "${socket.studentName}" joined ${room}`);
      } catch (err) {
        console.error('[SOCKET] join_exam error:', err.message);
      }
    });

    socket.on('question_changed', ({ screenIndex, questionIndex, questionText }) => {
      if (!socket.moduleId) return;
      const room = `live:${socket.moduleId}`;
      socket.currentScreen = screenIndex || 0;
      socket.currentQuestion = questionIndex || 0;
      emitToProfs(room, 'student_navigation', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        screenIndex,
        questionIndex,
        questionText: questionText || '',
      });
    });

    socket.on('answer_submitted', ({ questionIndex, questionText, questionType, isCorrect, pointsEarned, maxPoints, responseTimeMs, studentAnswer }) => {
      if (!socket.moduleId) return;
      const room = `live:${socket.moduleId}`;

      socket.answeredCount = (socket.answeredCount || 0) + 1;
      socket.studentScore = (socket.studentScore || 0) + (pointsEarned || 0);
      socket.studentMaxScore = (socket.studentMaxScore || 0) + (maxPoints || 0);

      emitToProfs(room, 'student_answer', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        questionIndex,
        questionText,
        questionType,
        isCorrect,
        pointsEarned,
        maxPoints,
        totalScore: socket.studentScore,
        totalMaxScore: socket.studentMaxScore,
        answeredCount: socket.answeredCount,
        responseTimeMs: responseTimeMs || 0,
        timestamp: new Date().toISOString(),
      });

      // Track competition answers
      const comp = getCompetition(socket.moduleId);
      if (comp && (comp.status === 'running' || comp.status === 'frozen')) {
        if (!comp.answers.has(questionIndex)) {
          comp.answers.set(questionIndex, { correct: 0, total: 0, byStudent: {}, byChoice: {} });
        }
        const qa = comp.answers.get(questionIndex);
        if (!qa.byStudent[socket.sessionKey]) {
          qa.total++;
          if (isCorrect) qa.correct++;

          // Track per-choice distribution for reveal phase
          const choiceKey = String(studentAnswer || '(sans reponse)');
          qa.byChoice[choiceKey] = (qa.byChoice[choiceKey] || 0) + 1;

          qa.byStudent[socket.sessionKey] = {
            isCorrect,
            pointsEarned,
            studentAnswer: choiceKey,
            responseTimeMs: responseTimeMs || 0,
            timestamp: Date.now(),
          };

          // Update rankings + streak tracking
          const ranking = comp.scores.get(socket.sessionKey);
          if (ranking) {
            ranking.score += (pointsEarned || 0);
            ranking.maxScore += (maxPoints || 0);
            ranking.answeredCount++;
            ranking.totalTime += (responseTimeMs || 0);
            ranking.avgTime = ranking.answeredCount > 0
              ? Math.round(ranking.totalTime / ranking.answeredCount)
              : 0;

            // Streak tracking
            if (isCorrect) {
              ranking.streak = (ranking.streak || 0) + 1;
              ranking.bestStreak = Math.max(ranking.bestStreak || 0, ranking.streak);
            } else {
              ranking.streak = 0;
            }
          }

          const statsPayload = {
            questionIndex,
            correct: qa.correct,
            total: qa.total,
            percentage: qa.total > 0 ? Math.round((qa.correct / qa.total) * 100) : 0,
          };
          emitToProfs(room, 'contest_question_stats', statsPayload);
          emitToSpectators(room, 'contest_question_stats', statsPayload);

          // Broadcast updated rankings to profs + spectators
          const rankingsPayload = comp.getRankings();
          emitToProfs(room, 'contest_rankings', rankingsPayload);

          // Spectators get top 20 only (TV-clean)
          emitToSpectators(room, 'contest_rankings', rankingsPayload.slice(0, 20));
          emitToSpectators(room, 'participant_count', { count: comp.scores.size });

          // Breaking news: top-3 changes, new leader, perfect streaks
          const breakingEvents = comp.detectBreakingNews(rankingsPayload);
          if (breakingEvents.length > 0) {
            emitToProfs(room, 'contest_breaking_news', breakingEvents);
            emitToSpectators(room, 'contest_breaking_news', breakingEvents);
          }

          // Establishment stats (school-level aggregation)
          const estStats = comp.getEstablishmentStats();
          if (estStats.length > 0) {
            emitToProfs(room, 'contest_establishment_stats', estStats);
            emitToSpectators(room, 'contest_establishment_stats', estStats);
          }
        }
      }
    });

    socket.on('blur_detected', ({ blurCount }) => {
      if (!socket.moduleId) return;
      const room = `live:${socket.moduleId}`;
      socket.blurCount = blurCount || 0;

      emitToProfs(room, 'student_blur', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        blurCount,
        timestamp: new Date().toISOString(),
      });
    });

    // ── FULLSCREEN EXIT → ELIMINATION ─────────────────────
    socket.on('fullscreen_exit', () => {
      if (!socket.moduleId) return;
      const comp = getCompetition(socket.moduleId);
      if (!comp || comp.status === 'finished') return;

      if (comp.eliminateOnFullscreenExit && !comp.eliminated.has(socket.sessionKey)) {
        comp.eliminated.add(socket.sessionKey);
        socket.status = 'eliminated';
        socket.emit('contest_eliminated', { reason: 'fullscreen_exit' });

        const ts = new Date().toISOString();
        const room = `live:${socket.moduleId}`;
        emitToProfs(room, 'student_eliminated', {
          sessionKey: socket.sessionKey,
          studentName: socket.studentName,
          reason: 'fullscreen_exit',
          timestamp: ts,
        });

        // Persist elimination as evidence
        if (socket.tenantId) {
          ProctoringEvidence.create({
            module_id: socket.moduleId,
            tenant_id: socket.tenantId,
            sessionKey: socket.sessionKey,
            studentName: socket.studentName,
            type: 'fullscreen_exit',
            trigger: 'auto',
            questionIndex: comp.currentIndex,
            capturedAt: new Date(ts),
          }).catch(err => console.error('[PROCTOR] Elimination evidence save error:', err.message));
        }

        console.log(`[COMPETITION] Student "${socket.studentName}" ELIMINATED (fullscreen exit)`);
      }
    });

    socket.on('exam_submitted', ({ totalScore, maxScore, percentage }) => {
      if (!socket.moduleId) return;
      const room = `live:${socket.moduleId}`;
      socket.status = 'submitted';
      socket.studentScore = totalScore || socket.studentScore;
      socket.studentMaxScore = maxScore || socket.studentMaxScore;

      emitToProfs(room, 'student_submitted', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        totalScore: socket.studentScore,
        maxScore: socket.studentMaxScore,
        percentage: percentage || 0,
        submittedAt: new Date().toISOString(),
      });
    });

    // ── PROCTORING ────────────────────────────────────────
    socket.on('snapshot_response', ({ imageData, timestamp, trigger }) => {
      if (!socket.moduleId) return;
      const ts = timestamp || new Date().toISOString();

      // Relay to professor in real-time
      emitToProfs(`live:${socket.moduleId}`, 'student_snapshot', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        imageData,
        timestamp: ts,
      });

      // Persist to MongoDB as evidence (fire-and-forget)
      if (imageData && socket.tenantId) {
        const comp = getCompetition(socket.moduleId);
        ProctoringEvidence.create({
          module_id: socket.moduleId,
          tenant_id: socket.tenantId,
          sessionKey: socket.sessionKey,
          studentName: socket.studentName,
          type: 'snapshot',
          imageData,
          trigger: trigger || 'scheduled',
          questionIndex: comp ? comp.currentIndex : null,
          capturedAt: new Date(ts),
        }).catch(err => console.error('[PROCTOR] Evidence save error:', err.message));
      }
    });

    // ── AUDIO LEVEL ALERT ─────────────────────────────────
    socket.on('audio_level_alert', ({ level, threshold }) => {
      if (!socket.moduleId) return;
      const ts = new Date().toISOString();
      emitToProfs(`live:${socket.moduleId}`, 'student_audio_alert', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        level,
        threshold,
        timestamp: ts,
      });

      // Persist audio alert as evidence
      if (socket.tenantId) {
        const comp = getCompetition(socket.moduleId);
        ProctoringEvidence.create({
          module_id: socket.moduleId,
          tenant_id: socket.tenantId,
          sessionKey: socket.sessionKey,
          studentName: socket.studentName,
          type: 'audio_alert',
          audioLevel: level,
          trigger: 'auto',
          questionIndex: comp ? comp.currentIndex : null,
          capturedAt: new Date(ts),
        }).catch(err => console.error('[PROCTOR] Audio evidence save error:', err.message));
      }
    });

    // ── WEBRTC SIGNALING (student side) ───────────────────
    socket.on('webrtc_signal', ({ signal }) => {
      if (!socket.moduleId) return;
      // Relay to professor(s) in the room
      emitToProfs(`live:${socket.moduleId}`, 'webrtc_signal', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        signal,
      });
    });

    socket.on('webrtc_ready', ({ mediaType }) => {
      if (!socket.moduleId) return;
      emitToProfs(`live:${socket.moduleId}`, 'webrtc_student_ready', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        mediaType,
      });
    });

    // ── SPOTLIGHT: Student → Spectator WebRTC signaling ──
    socket.on('spotlight_ready', () => {
      if (!socket.moduleId) return;
      emitToSpectators(`live:${socket.moduleId}`, 'spotlight_student_ready', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
      });
    });

    socket.on('spotlight_signal', ({ signal }) => {
      if (!socket.moduleId) return;
      // Relay student's WebRTC signal to spectators
      emitToSpectators(`live:${socket.moduleId}`, 'spotlight_signal', {
        sessionKey: socket.sessionKey,
        signal,
      });
    });

    socket.on('disconnect', () => {
      if (!socket.moduleId) return;
      const room = `live:${socket.moduleId}`;
      emitToProfs(room, 'student_disconnected', {
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
      });
      console.log(`[SOCKET] Student "${socket.studentName}" disconnected from ${room}`);
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// COMPETITION ENGINE — Forced Sequencing
// ═══════════════════════════════════════════════════════════════

/**
 * Advance to next question:
 * 1. Freeze current question (atomic lock)
 * 2. Force-submit any pending answer
 * 3. Brief transition ("Loading next...")
 * 4. NEXT_QUESTION_TRIGGER broadcast
 */
function freezeAndAdvance(moduleId) {
  const comp = getCompetition(moduleId);
  if (!comp) return;
  const room = comp.room;
  const REVEAL_DELAY = 8000; // 8 seconds for the "Moment de Verite" debrief

  // Step 1: ATOMIC LOCK — freeze current question
  if (comp.currentIndex >= 0) {
    comp.status = 'frozen';

    // Force all students to submit their current answer NOW
    emitToStudents(room, 'contest_force_submit', {
      questionIndex: comp.currentIndex,
    });

    // Notify professors with stats
    const qa = comp.answers.get(comp.currentIndex) || { correct: 0, total: 0, byChoice: {} };
    emitToStudents(room, 'contest_lock', { questionIndex: comp.currentIndex });
    emitToProfs(room, 'contest_lock', {
      questionIndex: comp.currentIndex,
      stats: qa,
    });
    emitToSpectators(room, 'contest_lock', { questionIndex: comp.currentIndex });
  }

  // Step 2: REVEAL PHASE — "Moment de Verite"
  // Wait 1 second for force-submitted answers to arrive, then reveal
  setTimeout(() => {
    const q = comp.currentQuestion;
    const qa = comp.answers.get(comp.currentIndex) || { correct: 0, total: 0, byChoice: {} };

    // Build answer distribution (sorted by count desc)
    const distribution = Object.entries(qa.byChoice || {})
      .map(([answer, count]) => ({
        answer,
        count,
        percentage: qa.total > 0 ? Math.round((count / qa.total) * 100) : 0,
        isCorrect: q ? answer === q.correctAnswer : false,
      }))
      .sort((a, b) => b.count - a.count);

    const revealPayload = {
      questionIndex: comp.currentIndex,
      questionText: q ? q.text : '',
      questionType: q ? q.type : '',
      correctAnswer: q ? q.correctAnswer : null,
      correctIndex: q ? q.correctIndex : -1,
      explanation: q ? q.explanation : null,
      stats: {
        correct: qa.correct,
        total: qa.total,
        percentage: qa.total > 0 ? Math.round((qa.correct / qa.total) * 100) : 0,
      },
      distribution,
      revealDuration: REVEAL_DELAY - 1000, // time remaining for debrief display
    };

    // Broadcast reveal to all audiences
    emitToStudents(room, 'contest_reveal', revealPayload);
    emitToProfs(room, 'contest_reveal', revealPayload);
    emitToSpectators(room, 'contest_reveal', revealPayload);

    console.log(`[COMPETITION] REVEAL Q${comp.currentIndex + 1}: ${qa.correct}/${qa.total} correct (${revealPayload.stats.percentage}%)`);

    // Send fresh rankings right after reveal so leaderboard animates rank changes
    const rankingsPayload = comp.getRankings();
    emitToProfs(room, 'contest_rankings', rankingsPayload);
    emitToSpectators(room, 'contest_rankings', rankingsPayload.slice(0, 20));
  }, 1000);

  // Step 3: Transition to next question after reveal debrief
  emitToStudents(room, 'contest_transition', {
    nextIndex: comp.currentIndex + 1,
    totalQuestions: comp.totalQuestions,
    delay: REVEAL_DELAY,
  });

  comp.transitionTimer = setTimeout(() => {
    comp.transitionTimer = null;
    advanceCompetition(moduleId);
  }, REVEAL_DELAY);
}

function advanceCompetition(moduleId) {
  const comp = getCompetition(moduleId);
  if (!comp) return;
  const room = comp.room;

  comp.currentIndex++;

  if (comp.currentIndex >= comp.totalQuestions) {
    endCompetition(moduleId, 'finished');
    return;
  }

  comp.status = 'running';
  const q = comp.currentQuestion;
  comp.remaining = q.duration;
  comp.questionStartedAt = new Date().toISOString();

  // NEXT_QUESTION_TRIGGER — synchronous broadcast
  const questionPayload = {
    questionIndex: comp.currentIndex,
    totalQuestions: comp.totalQuestions,
    duration: q.duration,
    remaining: q.duration,
    questionText: q.text,
    questionType: q.type,
    points: q.points,
    serverTimestamp: Date.now(), // For client-side drift compensation
  };
  emitToStudents(room, 'contest_question', questionPayload);
  emitToSpectators(room, 'contest_question', questionPayload);

  emitToProfs(room, 'contest_state', comp.toJSON());
  emitToSpectators(room, 'contest_state', comp.toJSON());
  emitToProfs(room, 'contest_rankings', comp.getRankings());
  emitToSpectators(room, 'contest_rankings', comp.getRankings());

  console.log(`[COMPETITION] ${moduleId} — Q${comp.currentIndex + 1}/${comp.totalQuestions} (${q.duration}s)`);

  startQuestionTimer(moduleId);
}

function startQuestionTimer(moduleId) {
  const comp = getCompetition(moduleId);
  if (!comp) return;
  if (comp.timer) clearInterval(comp.timer);

  comp.timer = setInterval(() => {
    comp.remaining--;
    const room = comp.room;

    // Heartbeat sync — every second to all clients
    const tickPayload = {
      questionIndex: comp.currentIndex,
      remaining: comp.remaining,
      serverTimestamp: Date.now(),
    };
    emitToStudents(room, 'contest_tick', tickPayload);
    emitToProfs(room, 'contest_tick', tickPayload);
    emitToSpectators(room, 'contest_tick', tickPayload);

    if (comp.remaining <= 0) {
      clearInterval(comp.timer);
      comp.timer = null;
      freezeAndAdvance(moduleId);
    }
  }, 1000);
}

function endCompetition(moduleId, reason) {
  const comp = getCompetition(moduleId);
  if (!comp) return;

  if (comp.timer) { clearInterval(comp.timer); comp.timer = null; }
  if (comp.transitionTimer) { clearTimeout(comp.transitionTimer); comp.transitionTimer = null; }
  if (comp.snapshotTimer) { clearInterval(comp.snapshotTimer); comp.snapshotTimer = null; }
  comp.status = 'finished';

  const room = comp.room;

  // Build final question stats
  const allStats = [];
  for (let i = 0; i < comp.totalQuestions; i++) {
    const qa = comp.answers.get(i) || { correct: 0, total: 0 };
    allStats.push({
      questionIndex: i,
      questionText: comp.questions[i].text,
      correct: qa.correct,
      total: qa.total,
      percentage: qa.total > 0 ? Math.round((qa.correct / qa.total) * 100) : 0,
    });
  }

  const rankings = comp.getRankings();
  const establishmentStats = comp.getEstablishmentStats();

  emitToStudents(room, 'contest_end', { reason, stats: allStats, rankings: rankings.slice(0, 10), establishments: establishmentStats });
  emitToProfs(room, 'contest_end', { reason, stats: allStats, rankings, establishments: establishmentStats });
  emitToSpectators(room, 'contest_end', { reason, stats: allStats, rankings, establishments: establishmentStats });
  emitToProfs(room, 'contest_state', comp.toJSON());
  emitToSpectators(room, 'contest_state', comp.toJSON());

  console.log(`[COMPETITION] Ended ${moduleId} — ${reason} — ${rankings.length} participants`);

  setTimeout(() => competitions.delete(moduleId), 120000);
}

// ═══════════════════════════════════════════════════════════════
// PROCTORING — Snapshot Scheduling
// ═══════════════════════════════════════════════════════════════

function startSnapshotRequests(comp) {
  if (comp.snapshotTimer) clearInterval(comp.snapshotTimer);
  const ms = (comp.snapshotInterval || 30) * 1000;
  comp.snapshotTimer = setInterval(() => {
    if (comp.status !== 'running' && comp.status !== 'paused') return;
    emitToStudents(comp.room, 'snapshot_request', { reason: 'scheduled' });
  }, ms);
  emitToStudents(comp.room, 'snapshot_request', { reason: 'scheduled' });
}

// ═══════════════════════════════════════════════════════════════
// SPECTATOR NAMESPACE (public, read-only, for Live Arena Display)
// ═══════════════════════════════════════════════════════════════
function setupSpectatorNamespace() {
  const specNsp = io.of('/spectator');

  specNsp.on('connection', (socket) => {

    socket.on('join_arena', async ({ shareToken }) => {
      try {
        const mod = await Module.findOne({ shareToken, shareEnabled: true, contestMode: true })
          .select('_id title tenant_id')
          .lean();
        if (!mod) return socket.emit('error_msg', { message: 'Concours introuvable' });

        const room = `live:${mod._id}`;
        socket.join(room);
        socket.moduleId = mod._id.toString();

        // Send module info
        socket.emit('arena_info', {
          moduleId: mod._id.toString(),
          title: mod.title || 'Concours National',
        });

        // Sync current competition state if active
        const comp = getCompetition(socket.moduleId);
        if (comp) {
          socket.emit('contest_state', comp.toJSON());
          socket.emit('contest_rankings', comp.getRankings());
          if (comp.currentQuestion && comp.status === 'running') {
            socket.emit('contest_question', {
              questionIndex: comp.currentIndex,
              totalQuestions: comp.totalQuestions,
              duration: comp.currentQuestion.duration,
              remaining: comp.remaining,
              questionText: comp.currentQuestion.text,
              questionType: comp.currentQuestion.type,
              points: comp.currentQuestion.points,
              serverTimestamp: Date.now(),
            });
          }
        }

        const studentCount = getConnectedStudents(socket.moduleId).length;
        socket.emit('participant_count', { count: studentCount });

        console.log(`[SOCKET] Spectator joined arena ${room}`);
      } catch (err) {
        console.error('[SOCKET] join_arena error:', err.message);
      }
    });

    // ── SPOTLIGHT: Spectator → Student WebRTC signaling ──
    socket.on('spotlight_signal', ({ sessionKey, signal }) => {
      if (!socket.moduleId || !io) return;
      const studentNsp = io.of('/student');
      for (const [, s] of studentNsp.sockets) {
        if (s.moduleId === socket.moduleId && s.sessionKey === sessionKey) {
          s.emit('spotlight_signal', { signal, fromSpectator: true });
          break;
        }
      }
    });

    socket.on('disconnect', () => {
      // silent
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function emitToProfs(room, event, data) {
  if (!io) return;
  io.of('/prof').to(room).emit(event, data);
}

function emitToSpectators(room, event, data) {
  if (!io) return;
  io.of('/spectator').to(room).emit(event, data);
}

function emitToStudents(room, event, data) {
  if (!io) return;
  io.of('/student').to(room).emit(event, data);
}

function getConnectedStudents(moduleId) {
  if (!io) return [];
  const students = [];
  for (const [, socket] of io.of('/student').sockets) {
    if (socket.moduleId === moduleId) {
      students.push({
        sessionKey: socket.sessionKey,
        studentName: socket.studentName,
        status: socket.status || 'online',
        currentScreen: socket.currentScreen || 0,
        currentQuestion: socket.currentQuestion || 0,
        totalScore: socket.studentScore || 0,
        totalMaxScore: socket.studentMaxScore || 0,
        answeredCount: socket.answeredCount || 0,
        blurCount: socket.blurCount || 0,
      });
    }
  }
  return students;
}

function getIO() { return io; }

module.exports = { initSocket, getIO, emitToProfs, emitToStudents, emitToSpectators };
