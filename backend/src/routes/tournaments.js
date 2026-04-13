const express = require('express');
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const Tournament = require('../models/Tournament');
const Participant = require('../models/Participant');
const QuizResult = require('../models/QuizResult');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const QRCode = require('qrcode');

const router = express.Router();

// ===========================================================================
// ROUTES PUBLIQUES (sans authentification)
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/tournaments/public/:shareToken
// Détails publics d'un tournoi (pour la page d'inscription)
// ---------------------------------------------------------------------------
router.get('/public/:shareToken', async (req, res, next) => {
  try {
    const tournament = await Tournament.findOne({
      shareToken: req.params.shareToken,
    }).lean();

    if (!tournament) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }

    const participantCount = await Participant.countDocuments({
      tournament_id: tournament._id,
    });

    // Ne retourner que les infos publiques (pas de tenant_id, created_by, etc.)
    res.json({
      tournament: {
        _id: tournament._id,
        title: tournament.title,
        description: tournament.description,
        coverImage: tournament.coverImage,
        status: tournament.status,
        registrationFee: tournament.registrationFee,
        currency: tournament.currency,
        maxParticipants: tournament.maxParticipants,
        registrationOpen: tournament.registrationOpen,
        registrationClose: tournament.registrationClose,
        rounds: tournament.rounds.map((r) => ({
          order: r.order,
          label: r.label,
          status: r.status,
          promoteTopX: r.promoteTopX,
        })),
        prizes: tournament.prizes,
        currentRound: tournament.currentRound,
      },
      participantCount,
      spotsLeft: tournament.maxParticipants > 0
        ? Math.max(0, tournament.maxParticipants - participantCount)
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tournaments/public/:shareToken/register
// Inscription publique (sans auth) — génère competitionToken + QR
// ---------------------------------------------------------------------------
router.post(
  '/public/:shareToken/register',
  [
    body('firstName').notEmpty().withMessage('Le prénom est requis'),
    body('lastName').notEmpty().withMessage('Le nom est requis'),
    body('email').isEmail().withMessage('Email invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        shareToken: req.params.shareToken,
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      if (!['draft', 'registration'].includes(tournament.status)) {
        return res.status(400).json({ error: 'Les inscriptions sont fermées' });
      }

      // Vérifier la fenêtre d'inscription
      const now = new Date();
      if (tournament.registrationOpen && now < new Date(tournament.registrationOpen)) {
        return res.status(400).json({ error: 'Les inscriptions ne sont pas encore ouvertes' });
      }
      if (tournament.registrationClose && now > new Date(tournament.registrationClose)) {
        return res.status(400).json({ error: 'Les inscriptions sont clôturées' });
      }

      // Vérifier la capacité
      if (tournament.maxParticipants > 0) {
        const count = await Participant.countDocuments({ tournament_id: tournament._id });
        if (count >= tournament.maxParticipants) {
          return res.status(400).json({ error: 'Nombre maximum de participants atteint' });
        }
      }

      // Vérifier doublon
      const existing = await Participant.findOne({
        tournament_id: tournament._id,
        email: req.body.email,
      });
      if (existing) {
        const qrCode = await QRCode.toDataURL(existing.competitionToken, {
          width: 300, margin: 2, color: { dark: '#1e293b', light: '#ffffff' },
        });
        return res.status(409).json({
          error: 'Vous êtes déjà inscrit(e)',
          competitionToken: existing.competitionToken,
          qrCode,
          paid: existing.paid,
          participant_id: existing._id,
        });
      }

      const isFree = tournament.registrationFee === 0;

      const participant = await Participant.create({
        tournament_id: tournament._id,
        tenant_id: tournament.tenant_id,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone || '',
        establishment: req.body.establishment || '',
        district: req.body.district || '',
        paid: isFree,
        status: 'registered',
      });

      // Générer QR code du ticket
      const qrCode = await QRCode.toDataURL(participant.competitionToken, {
        width: 300, margin: 2, color: { dark: '#1e293b', light: '#ffffff' },
      });

      res.status(201).json({
        message: isFree ? 'Inscription confirmée' : 'Inscription enregistrée — paiement requis',
        participant_id: participant._id,
        competitionToken: participant.competitionToken,
        qrCode,
        paid: isFree,
        requiresPayment: !isFree,
        amount: isFree ? 0 : tournament.registrationFee,
        currency: tournament.currency,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tournaments/verify-token/:competitionToken
// Vérifier un badge (competitionToken) — utilisé par les superviseurs
// ---------------------------------------------------------------------------
router.get('/verify-token/:competitionToken', async (req, res, next) => {
  try {
    const participant = await Participant.findOne({
      competitionToken: req.params.competitionToken,
    }).lean();

    if (!participant) {
      return res.status(404).json({ error: 'Badge invalide — aucun participant trouvé' });
    }

    const tournament = await Tournament.findById(participant.tournament_id)
      .select('title status currentRound')
      .lean();

    res.json({
      valid: true,
      participant: {
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        establishment: participant.establishment,
        district: participant.district,
        status: participant.status,
        paid: participant.paid,
        competitionToken: participant.competitionToken,
        finalRank: participant.finalRank,
      },
      tournament: tournament ? {
        title: tournament.title,
        status: tournament.status,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

// ===========================================================================
// ROUTES AUTHENTIFIÉES
// ===========================================================================
router.use(authenticate);
router.use(tenantIsolation);

// ---------------------------------------------------------------------------
// POST /api/tournaments
// Créer un nouveau tournoi
// ---------------------------------------------------------------------------
router.post(
  '/',
  authorize('admin_ddene', 'teacher'),
  [
    body('title').notEmpty().withMessage('Le titre est requis'),
    body('rounds').isArray({ min: 1 }).withMessage('Au moins un round est requis'),
    body('rounds.*.label').notEmpty().withMessage('Le label du round est requis'),
    body('rounds.*.promoteTopX').isInt({ min: 1 }).withMessage('promoteTopX doit être >= 1'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title, description, coverImage,
        registrationFee, currency, maxParticipants,
        registrationOpen, registrationClose,
        rounds, prizes,
      } = req.body;

      const targetTenant = req.body.tenant_id || req.tenantId;
      if (!targetTenant) {
        return res.status(400).json({ error: 'tenant_id requis' });
      }

      // Numéroter les rounds automatiquement
      const numberedRounds = rounds.map((r, i) => ({
        ...r,
        order: i + 1,
        status: 'pending',
      }));

      const tournament = await Tournament.create({
        title,
        description: description || '',
        coverImage: coverImage || '',
        registrationFee: registrationFee || 0,
        currency: currency || 'HTG',
        maxParticipants: maxParticipants || 0,
        registrationOpen: registrationOpen || null,
        registrationClose: registrationClose || null,
        rounds: numberedRounds,
        prizes: prizes || [],
        shareToken: crypto.randomBytes(12).toString('hex'),
        tenant_id: targetTenant,
        created_by: req.user.id,
      });

      res.status(201).json({
        message: 'Tournoi créé avec succès',
        tournament,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tournaments
// Lister les tournois du tenant
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const tournaments = await Tournament.find(req.tenantFilter())
      .sort({ createdAt: -1 })
      .lean();

    // Compter les participants pour chaque tournoi
    const ids = tournaments.map((t) => t._id);
    const counts = await Participant.aggregate([
      { $match: { tournament_id: { $in: ids } } },
      { $group: { _id: '$tournament_id', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    const result = tournaments.map((t) => ({
      ...t,
      participantCount: countMap[t._id.toString()] || 0,
    }));

    res.json({ tournaments: result, count: result.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/tournaments/:id
// Détail d'un tournoi avec participants
// ---------------------------------------------------------------------------
router.get(
  '/:id',
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      }).lean();

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      const participants = await Participant.find({ tournament_id: tournament._id })
        .sort({ finalRank: 1, totalScore: -1 })
        .lean();

      res.json({ tournament, participants, participantCount: participants.length });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/tournaments/:id
// Mettre à jour un tournoi
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  authorize('admin_ddene', 'teacher'),
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const allowedFields = [
        'title', 'description', 'coverImage', 'status',
        'registrationFee', 'currency', 'maxParticipants',
        'registrationOpen', 'registrationClose',
        'rounds', 'prizes',
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // Re-numéroter les rounds si mis à jour
      if (updates.rounds) {
        updates.rounds = updates.rounds.map((r, i) => ({
          ...r,
          order: i + 1,
        }));
      }

      const tournament = await Tournament.findOneAndUpdate(
        { _id: req.params.id, ...req.tenantFilter() },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      res.json({ message: 'Tournoi mis à jour', tournament });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/tournaments/:id
// Supprimer un tournoi (draft uniquement)
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  authorize('admin_ddene', 'teacher'),
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      if (tournament.status !== 'draft') {
        return res.status(400).json({
          error: 'Seuls les tournois en brouillon peuvent être supprimés',
        });
      }

      // Supprimer les participants associés
      await Participant.deleteMany({ tournament_id: tournament._id });
      await tournament.deleteOne();

      res.json({ message: 'Tournoi supprimé' });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/register
// Inscrire un participant (vérifie capacité + génère competitionToken)
// ---------------------------------------------------------------------------
router.post(
  '/:id/register',
  param('id').isMongoId().withMessage('ID invalide'),
  [
    body('firstName').notEmpty().withMessage('Le prénom est requis'),
    body('lastName').notEmpty().withMessage('Le nom est requis'),
    body('email').isEmail().withMessage('Email invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      // Vérifier que l'inscription est ouverte
      if (!['draft', 'registration'].includes(tournament.status)) {
        return res.status(400).json({ error: 'Les inscriptions sont fermées' });
      }

      // Vérifier la capacité
      if (tournament.maxParticipants > 0) {
        const currentCount = await Participant.countDocuments({
          tournament_id: tournament._id,
        });
        if (currentCount >= tournament.maxParticipants) {
          return res.status(400).json({ error: 'Nombre maximum de participants atteint' });
        }
      }

      // Vérifier doublon
      const existing = await Participant.findOne({
        tournament_id: tournament._id,
        email: req.body.email,
      });
      if (existing) {
        return res.status(409).json({
          error: 'Ce participant est déjà inscrit',
          competitionToken: existing.competitionToken,
        });
      }

      const isFree = tournament.registrationFee === 0;

      const participant = await Participant.create({
        tournament_id: tournament._id,
        user_id: req.body.user_id || req.user.id,
        tenant_id: tournament.tenant_id,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone || '',
        establishment: req.body.establishment || '',
        district: req.body.district || '',
        paid: isFree,
        status: 'registered',
      });

      res.status(201).json({
        message: 'Inscription réussie',
        participant,
        competitionToken: participant.competitionToken,
        requiresPayment: !isFree,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tournaments/:id/participants
// Lister les participants d'un tournoi
// ---------------------------------------------------------------------------
router.get(
  '/:id/participants',
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      const { round, status } = req.query;
      const filter = { tournament_id: tournament._id };
      if (status) filter.status = status;

      let participants = await Participant.find(filter)
        .sort({ totalScore: -1, createdAt: 1 })
        .lean();

      // Filtrer par round si spécifié
      if (round !== undefined) {
        const roundNum = parseInt(round, 10);
        participants = participants.filter((p) =>
          p.roundResults.some((rr) => rr.round === roundNum)
        );
      }

      res.json({ participants, count: participants.length });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/start-round
// Démarrer un round (passe le round au statut 'active')
// ---------------------------------------------------------------------------
router.post(
  '/:id/start-round',
  authorize('admin_ddene', 'teacher'),
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      const roundIndex = tournament.currentRound;
      if (roundIndex >= tournament.rounds.length) {
        return res.status(400).json({ error: 'Tous les rounds sont terminés' });
      }

      const round = tournament.rounds[roundIndex];
      if (round.status !== 'pending') {
        return res.status(400).json({ error: `Round "${round.label}" n'est pas en attente` });
      }

      round.status = 'active';
      round.startTime = new Date();
      tournament.status = 'active';

      await tournament.save();

      res.json({
        message: `Round "${round.label}" démarré`,
        tournament,
        activeRound: round,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/tournaments/:id/advance
// Promotion automatique : qualifie les top X du round actif
// ---------------------------------------------------------------------------
router.post(
  '/:id/advance',
  authorize('admin_ddene', 'teacher'),
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      const roundIndex = tournament.currentRound;
      if (roundIndex >= tournament.rounds.length) {
        return res.status(400).json({ error: 'Tous les rounds sont déjà terminés' });
      }

      const currentRound = tournament.rounds[roundIndex];
      if (currentRound.status !== 'active') {
        return res.status(400).json({ error: 'Le round actif n\'est pas en cours' });
      }

      const { promoteTopX } = currentRound;
      const roundOrder = currentRound.order;

      // Récupérer les résultats quiz pour le module de ce round
      const moduleId = currentRound.module_id;
      if (!moduleId) {
        return res.status(400).json({ error: 'Aucun module associé à ce round' });
      }

      // Trouver les participants de ce tournoi qui ont un résultat pour ce round
      const participants = await Participant.find({
        tournament_id: tournament._id,
        status: { $in: ['registered', 'qualified'] },
      });

      // Récupérer les quiz results pour le module de ce round
      const participantUserIds = participants.map((p) => p.user_id).filter(Boolean);
      const quizResults = await QuizResult.find({
        module_id: moduleId,
        user_id: { $in: participantUserIds },
        ...req.tenantFilter(),
      }).lean();

      // Mapper user_id → quizResult
      const resultMap = new Map();
      for (const qr of quizResults) {
        resultMap.set(qr.user_id.toString(), qr);
      }

      // Calculer le score de chaque participant pour ce round
      const scored = [];
      for (const p of participants) {
        const qr = p.user_id ? resultMap.get(p.user_id.toString()) : null;
        const score = qr ? qr.percentage : 0;
        const maxScore = qr ? qr.maxScore : 0;
        const totalScore = qr ? qr.totalScore : 0;

        // Ajouter le résultat du round
        const existingRoundResult = p.roundResults.find((rr) => rr.round === roundOrder);
        if (!existingRoundResult) {
          p.roundResults.push({
            round: roundOrder,
            module_id: moduleId,
            quizResult_id: qr ? qr._id : null,
            score: totalScore,
            maxScore: maxScore,
            percentage: score,
            duration: qr ? qr.duration : '',
            status: 'pending',
            completedAt: qr ? qr.completedAt : null,
          });
        }

        // Parser la durée ISO 8601 (ex: "PT1M30S") en secondes pour départage
        const durationStr = qr ? qr.duration : '';
        let durationSec = Infinity; // pas de résultat = dernière position
        if (durationStr) {
          const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
          if (match) {
            durationSec = (parseInt(match[1] || '0', 10) * 3600)
              + (parseInt(match[2] || '0', 10) * 60)
              + parseFloat(match[3] || '0');
          }
        }

        scored.push({ participant: p, percentage: score, totalScore, durationSec });
      }

      // Trier par percentage DESC, puis temps de réponse ASC (plus rapide gagne le départage)
      scored.sort((a, b) => b.percentage - a.percentage || a.durationSec - b.durationSec);

      // Qualifier les top X, éliminer le reste
      const qualified = [];
      const eliminated = [];

      for (let i = 0; i < scored.length; i++) {
        const { participant } = scored[i];
        const roundResult = participant.roundResults.find((rr) => rr.round === roundOrder);
        const isLastRound = roundIndex === tournament.rounds.length - 1;

        if (i < promoteTopX) {
          if (roundResult) roundResult.status = 'qualified';
          participant.status = isLastRound ? 'winner' : 'qualified';
          participant.totalScore += scored[i].totalScore;
          if (isLastRound) {
            participant.finalRank = i + 1;
          }
          qualified.push({
            name: `${participant.firstName} ${participant.lastName}`,
            rank: i + 1,
            percentage: scored[i].percentage,
            durationSec: scored[i].durationSec === Infinity ? null : scored[i].durationSec,
          });
        } else {
          if (roundResult) roundResult.status = 'eliminated';
          participant.status = 'eliminated';
          eliminated.push({
            name: `${participant.firstName} ${participant.lastName}`,
            percentage: scored[i].percentage,
            durationSec: scored[i].durationSec === Infinity ? null : scored[i].durationSec,
          });
        }

        await participant.save();
      }

      // Fermer le round et avancer
      currentRound.status = 'completed';
      currentRound.endTime = new Date();
      tournament.currentRound = roundIndex + 1;

      // Si dernier round, le tournoi est terminé
      if (roundIndex === tournament.rounds.length - 1) {
        tournament.status = 'completed';
      }

      await tournament.save();

      res.json({
        message: `Round "${currentRound.label}" terminé — ${qualified.length} qualifiés, ${eliminated.length} éliminés`,
        qualified,
        eliminated,
        tournament,
        isFinished: tournament.status === 'completed',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tournaments/:id/bracket
// Arbre de progression (tous les rounds + résultats)
// ---------------------------------------------------------------------------
router.get(
  '/:id/bracket',
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      }).lean();

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      const participants = await Participant.find({ tournament_id: tournament._id })
        .sort({ totalScore: -1 })
        .lean();

      // Construire l'arbre par round
      const bracket = tournament.rounds.map((round) => {
        const roundParticipants = participants
          .filter((p) => p.roundResults.some((rr) => rr.round === round.order))
          .map((p) => {
            const rr = p.roundResults.find((r) => r.round === round.order);
            return {
              _id: p._id,
              name: `${p.firstName} ${p.lastName}`,
              establishment: p.establishment,
              score: rr ? rr.score : 0,
              maxScore: rr ? rr.maxScore : 0,
              percentage: rr ? rr.percentage : 0,
              duration: rr ? rr.duration : '',
              status: rr ? rr.status : 'pending',
            };
          })
          .sort((a, b) => b.percentage - a.percentage);

        return {
          order: round.order,
          label: round.label,
          status: round.status,
          promoteTopX: round.promoteTopX,
          startTime: round.startTime,
          endTime: round.endTime,
          participants: roundParticipants,
        };
      });

      // Podium (si tournoi terminé)
      let podium = null;
      if (tournament.status === 'completed') {
        podium = participants
          .filter((p) => p.finalRank)
          .sort((a, b) => a.finalRank - b.finalRank)
          .slice(0, 3)
          .map((p) => {
            const prize = tournament.prizes.find((pr) => pr.rank === p.finalRank);
            return {
              rank: p.finalRank,
              name: `${p.firstName} ${p.lastName}`,
              establishment: p.establishment,
              totalScore: p.totalScore,
              prize: prize ? { amount: prize.amount, currency: prize.currency, label: prize.label } : null,
            };
          });
      }

      res.json({ bracket, podium, currentRound: tournament.currentRound });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tournaments/:id/podium
// Classement final + certificats numériques
// ---------------------------------------------------------------------------
router.get(
  '/:id/podium',
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      }).lean();

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      if (tournament.status !== 'completed') {
        return res.status(400).json({ error: 'Le tournoi n\'est pas encore terminé' });
      }

      const winners = await Participant.find({
        tournament_id: tournament._id,
        finalRank: { $ne: null },
      })
        .sort({ finalRank: 1 })
        .lean();

      const podium = winners.map((w) => {
        const prize = tournament.prizes.find((p) => p.rank === w.finalRank);
        return {
          rank: w.finalRank,
          firstName: w.firstName,
          lastName: w.lastName,
          establishment: w.establishment,
          district: w.district,
          totalScore: w.totalScore,
          competitionToken: w.competitionToken,
          roundResults: w.roundResults,
          prize: prize || null,
          certificate: {
            tournamentTitle: tournament.title,
            rank: w.finalRank,
            participantName: `${w.firstName} ${w.lastName}`,
            date: tournament.updatedAt,
            prizeAmount: prize ? prize.amount : 0,
            prizeCurrency: prize ? prize.currency : 'HTG',
          },
        };
      });

      res.json({ podium, tournament: { title: tournament.title, status: tournament.status } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tournaments/:id/certificate/:participantId
// Générer un certificat PDF pour un gagnant
// ---------------------------------------------------------------------------
router.get(
  '/:id/certificate/:participantId',
  [
    param('id').isMongoId().withMessage('ID tournoi invalide'),
    param('participantId').isMongoId().withMessage('ID participant invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.id,
        ...req.tenantFilter(),
      }).lean();

      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      const participant = await Participant.findOne({
        _id: req.params.participantId,
        tournament_id: tournament._id,
        finalRank: { $ne: null },
      }).lean();

      if (!participant) {
        return res.status(404).json({ error: 'Participant non trouvé ou pas de classement final' });
      }

      const prize = tournament.prizes.find((p) => p.rank === participant.finalRank);
      const rankLabel = participant.finalRank === 1 ? '1er' : `${participant.finalRank}e`;

      // Générer le PDF avec jsPDF
      const { jsPDF } = require('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Dimensions
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      // Fond dégradé (rectangles)
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, w, h, 'F');

      // Bordure dorée
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(2);
      doc.rect(10, 10, w - 20, h - 20);
      doc.setLineWidth(0.5);
      doc.rect(14, 14, w - 28, h - 28);

      // Titre
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text('CERTIFICAT DE MERITE', w / 2, 35, { align: 'center' });

      // Nom du tournoi
      doc.setFontSize(28);
      doc.setTextColor(245, 158, 11); // amber
      doc.text(tournament.title, w / 2, 55, { align: 'center' });

      // "décerné à"
      doc.setFontSize(12);
      doc.setTextColor(156, 163, 175);
      doc.text('décerné à', w / 2, 72, { align: 'center' });

      // Nom du gagnant
      doc.setFontSize(32);
      doc.setTextColor(255, 255, 255);
      doc.text(`${participant.firstName} ${participant.lastName}`, w / 2, 90, { align: 'center' });

      // Établissement
      if (participant.establishment) {
        doc.setFontSize(14);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(participant.establishment, w / 2, 102, { align: 'center' });
      }

      // Rang
      doc.setFontSize(20);
      doc.setTextColor(245, 158, 11);
      doc.text(`${rankLabel} Place`, w / 2, 120, { align: 'center' });

      // Prime
      if (prize && prize.amount > 0) {
        doc.setFontSize(16);
        doc.setTextColor(34, 197, 94); // green-500
        doc.text(`Prime : ${prize.amount.toLocaleString()} ${prize.currency || 'HTG'}`, w / 2, 133, { align: 'center' });
      }

      // Score
      doc.setFontSize(11);
      doc.setTextColor(148, 163, 184);
      doc.text(`Score total : ${participant.totalScore} points`, w / 2, 148, { align: 'center' });

      // Date
      const dateStr = new Date(tournament.updatedAt).toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Délivré le ${dateStr}`, w / 2, 165, { align: 'center' });

      // Token de vérification
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Ref: ${participant.competitionToken}`, w / 2, 180, { align: 'center' });

      // TEGS watermark
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('TEGS-Learning | Plateforme DDENE', w / 2, 190, { align: 'center' });

      // Envoyer le PDF
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `inline; filename="certificat-${participant.firstName}-${participant.lastName}-${rankLabel}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
