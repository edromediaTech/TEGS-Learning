const express = require('express');
const { param, validationResult } = require('express-validator');
const Vote = require('../models/Vote');
const Participant = require('../models/Participant');
const Tournament = require('../models/Tournament');

const router = express.Router();

// Toutes les routes votes sont publiques (pas d'auth nécessaire)

/**
 * Extraire l'IP réelle (derrière proxy / Cloud Run).
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.connection?.remoteAddress
    || req.ip
    || 'unknown';
}

// ---------------------------------------------------------------------------
// POST /api/votes/:tournamentId/:participantId
// Voter pour un candidat (1 vote par IP par heure)
// ---------------------------------------------------------------------------
router.post(
  '/:tournamentId/:participantId',
  [
    param('tournamentId').isMongoId(),
    param('participantId').isMongoId(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId, participantId } = req.params;
      const voterIp = getClientIp(req);

      // Vérifier que le tournoi existe et est actif
      const tournament = await Tournament.findById(tournamentId).select('status title').lean();
      if (!tournament || !['active', 'registration'].includes(tournament.status)) {
        return res.status(400).json({ error: 'Tournoi non disponible pour les votes' });
      }

      // Vérifier que le participant existe
      const participant = await Participant.findOne({
        _id: participantId,
        tournament_id: tournamentId,
      }).lean();
      if (!participant) {
        return res.status(404).json({ error: 'Candidat non trouvé' });
      }

      // Rate limit: 1 vote par IP par participant par heure
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentVote = await Vote.findOne({
        tournament_id: tournamentId,
        participant_id: participantId,
        voterIp,
        createdAt: { $gte: oneHourAgo },
      });

      if (recentVote) {
        const nextVoteAt = new Date(recentVote.createdAt.getTime() + 60 * 60 * 1000);
        return res.status(429).json({
          error: 'Vous avez déjà voté pour ce candidat récemment',
          nextVoteAt,
          minutesLeft: Math.ceil((nextVoteAt - Date.now()) / 60000),
        });
      }

      // Enregistrer le vote
      await Vote.create({
        tournament_id: tournamentId,
        participant_id: participantId,
        voterIp,
        voterSession: req.body.session || '',
      });

      // Compter le nouveau total
      const totalVotes = await Vote.countDocuments({
        tournament_id: tournamentId,
        participant_id: participantId,
      });

      // Broadcast via socket si disponible
      try {
        const io = global._io;
        if (io) {
          const room = `tournament:${tournamentId}`;
          io.of('/tournament').to(room).emit('vote_received', {
            participantId,
            participantName: `${participant.firstName} ${participant.lastName}`,
            totalVotes,
            timestamp: Date.now(),
          });
        }
      } catch {}

      res.json({
        message: `Vote enregistré pour ${participant.firstName} ${participant.lastName}`,
        totalVotes,
        participant: {
          _id: participant._id,
          name: `${participant.firstName} ${participant.lastName}`,
          establishment: participant.establishment,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/votes/:tournamentId/rankings
// Classement de popularité (votes)
// ---------------------------------------------------------------------------
router.get('/:tournamentId/rankings', async (req, res, next) => {
  try {
    const rankings = await Vote.aggregate([
      { $match: { tournament_id: require('mongoose').Types.ObjectId.createFromHexString(req.params.tournamentId) } },
      { $group: { _id: '$participant_id', votes: { $sum: 1 } } },
      { $sort: { votes: -1 } },
      { $limit: 50 },
    ]);

    // Enrichir avec les noms
    const participantIds = rankings.map((r) => r._id);
    const participants = await Participant.find({ _id: { $in: participantIds } })
      .select('firstName lastName establishment')
      .lean();
    const pMap = Object.fromEntries(participants.map((p) => [p._id.toString(), p]));

    const result = rankings.map((r, i) => {
      const p = pMap[r._id.toString()];
      return {
        rank: i + 1,
        participantId: r._id,
        name: p ? `${p.firstName} ${p.lastName}` : 'Inconnu',
        establishment: p?.establishment || '',
        votes: r.votes,
      };
    });

    const totalVotes = rankings.reduce((sum, r) => sum + r.votes, 0);

    res.json({
      rankings: result,
      totalVotes,
      count: result.length,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/votes/:tournamentId/popular
// Le "Coup de Coeur du Public" (1er des votes)
// ---------------------------------------------------------------------------
router.get('/:tournamentId/popular', async (req, res, next) => {
  try {
    const top = await Vote.aggregate([
      { $match: { tournament_id: require('mongoose').Types.ObjectId.createFromHexString(req.params.tournamentId) } },
      { $group: { _id: '$participant_id', votes: { $sum: 1 } } },
      { $sort: { votes: -1 } },
      { $limit: 1 },
    ]);

    if (top.length === 0) {
      return res.json({ popular: null, totalVotes: 0 });
    }

    const p = await Participant.findById(top[0]._id)
      .select('firstName lastName establishment district competitionToken')
      .lean();

    const totalVotes = await Vote.countDocuments({
      tournament_id: req.params.tournamentId,
    });

    res.json({
      popular: {
        participantId: top[0]._id,
        name: p ? `${p.firstName} ${p.lastName}` : 'Inconnu',
        establishment: p?.establishment || '',
        votes: top[0].votes,
        competitionToken: p?.competitionToken,
      },
      totalVotes,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
