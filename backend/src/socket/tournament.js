/**
 * TEGS-Learning — Tournament Socket Namespace
 *
 * Namespace: /tournament
 * Room: `tournament:<tournamentId>`
 *
 * Events émis par le serveur :
 *   tournament_state   — état complet du tournoi (rounds, currentRound, status)
 *   tournament_bracket — bracket mis à jour avec participants par round
 *   round_started      — un round vient de démarrer
 *   round_advanced     — promotion terminée (qualified[], eliminated[])
 *   participant_joined — nouveau participant inscrit
 *   tournament_finished — tournoi terminé + podium
 *   breaking_news      — événement spectaculaire (qualification surprise, etc.)
 *
 * Events reçus du client :
 *   join_tournament    — { shareToken } rejoindre en tant que spectateur
 *   join_admin         — { tournamentId } rejoindre en tant qu'admin (JWT auth)
 *   admin_start_round  — admin démarre le round
 *   admin_advance      — admin déclenche la promotion
 */

const jwt = require('jsonwebtoken');
const Tournament = require('../models/Tournament');
const Participant = require('../models/Participant');
const QuizResult = require('../models/QuizResult');

function setupTournamentNamespace(io) {
  const nsp = io.of('/tournament');

  nsp.on('connection', (socket) => {
    console.log(`[TOURNAMENT] Client connected: ${socket.id}`);

    // --- JOIN (spectateur via shareToken) ---
    socket.on('join_tournament', async ({ shareToken }) => {
      try {
        const tournament = await Tournament.findOne({ shareToken }).lean();
        if (!tournament) {
          return socket.emit('error_msg', { message: 'Tournoi introuvable' });
        }

        const room = `tournament:${tournament._id}`;
        socket.join(room);
        socket.tournamentId = tournament._id.toString();
        socket.isAdmin = false;

        // Envoyer l'état initial
        const bracket = await buildBracket(tournament);
        const participantCount = await Participant.countDocuments({ tournament_id: tournament._id });

        socket.emit('tournament_state', {
          tournament: publicTournamentInfo(tournament),
          participantCount,
        });
        socket.emit('tournament_bracket', bracket);
      } catch (err) {
        socket.emit('error_msg', { message: err.message });
      }
    });

    // --- JOIN ADMIN (JWT auth) ---
    socket.on('join_admin', async ({ tournamentId, token }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const tournament = await Tournament.findById(tournamentId).lean();
        if (!tournament) {
          return socket.emit('error_msg', { message: 'Tournoi introuvable' });
        }

        const room = `tournament:${tournament._id}`;
        socket.join(room);
        socket.tournamentId = tournament._id.toString();
        socket.isAdmin = true;
        socket.userId = decoded.id;

        const bracket = await buildBracket(tournament);
        const participants = await Participant.find({ tournament_id: tournament._id }).lean();

        socket.emit('tournament_state', {
          tournament,
          participantCount: participants.length,
        });
        socket.emit('tournament_bracket', bracket);
        socket.emit('tournament_participants', { participants });
      } catch (err) {
        socket.emit('error_msg', { message: 'Auth failed' });
      }
    });

    // --- ADMIN: START ROUND ---
    socket.on('admin_start_round', async () => {
      if (!socket.isAdmin || !socket.tournamentId) return;

      try {
        const tournament = await Tournament.findById(socket.tournamentId);
        if (!tournament) return;

        const roundIndex = tournament.currentRound;
        if (roundIndex >= tournament.rounds.length) return;

        const round = tournament.rounds[roundIndex];
        if (round.status !== 'pending') return;

        round.status = 'active';
        round.startTime = new Date();
        tournament.status = 'active';
        await tournament.save();

        const room = `tournament:${tournament._id}`;
        const bracket = await buildBracket(tournament);

        nsp.to(room).emit('round_started', {
          round: { order: round.order, label: round.label, module_id: round.module_id },
          currentRound: tournament.currentRound,
        });
        nsp.to(room).emit('tournament_state', {
          tournament: publicTournamentInfo(tournament),
        });
        nsp.to(room).emit('tournament_bracket', bracket);
      } catch (err) {
        socket.emit('error_msg', { message: err.message });
      }
    });

    // --- ADMIN: ADVANCE (promote top X) ---
    socket.on('admin_advance', async () => {
      if (!socket.isAdmin || !socket.tournamentId) return;

      try {
        const tournament = await Tournament.findById(socket.tournamentId);
        if (!tournament) return;

        const roundIndex = tournament.currentRound;
        if (roundIndex >= tournament.rounds.length) return;

        const currentRound = tournament.rounds[roundIndex];
        if (currentRound.status !== 'active') return;

        const moduleId = currentRound.module_id;
        if (!moduleId) return;

        const { promoteTopX } = currentRound;
        const roundOrder = currentRound.order;

        // Récupérer participants + quiz results
        const participants = await Participant.find({
          tournament_id: tournament._id,
          status: { $in: ['registered', 'qualified'] },
        });

        const userIds = participants.map((p) => p.user_id).filter(Boolean);
        const quizResults = await QuizResult.find({
          module_id: moduleId,
          user_id: { $in: userIds },
        }).lean();

        const resultMap = new Map();
        for (const qr of quizResults) {
          resultMap.set(qr.user_id.toString(), qr);
        }

        // Score + duration parsing
        const scored = [];
        for (const p of participants) {
          const qr = p.user_id ? resultMap.get(p.user_id.toString()) : null;
          const percentage = qr ? qr.percentage : 0;
          const totalScore = qr ? qr.totalScore : 0;

          let durationSec = Infinity;
          const durationStr = qr ? qr.duration : '';
          if (durationStr) {
            const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
            if (match) {
              durationSec = (parseInt(match[1] || '0', 10) * 3600)
                + (parseInt(match[2] || '0', 10) * 60)
                + parseFloat(match[3] || '0');
            }
          }

          // Ajouter round result
          if (!p.roundResults.find((rr) => rr.round === roundOrder)) {
            p.roundResults.push({
              round: roundOrder,
              module_id: moduleId,
              quizResult_id: qr ? qr._id : null,
              score: totalScore,
              maxScore: qr ? qr.maxScore : 0,
              percentage,
              duration: durationStr,
              status: 'pending',
              completedAt: qr ? qr.completedAt : null,
            });
          }

          scored.push({ participant: p, percentage, totalScore, durationSec });
        }

        // Tri: percentage DESC, duration ASC
        scored.sort((a, b) => b.percentage - a.percentage || a.durationSec - b.durationSec);

        const qualified = [];
        const eliminated = [];
        const isLastRound = roundIndex === tournament.rounds.length - 1;

        for (let i = 0; i < scored.length; i++) {
          const { participant } = scored[i];
          const rr = participant.roundResults.find((r) => r.round === roundOrder);

          if (i < promoteTopX) {
            if (rr) rr.status = 'qualified';
            participant.status = isLastRound ? 'winner' : 'qualified';
            participant.totalScore += scored[i].totalScore;
            if (isLastRound) participant.finalRank = i + 1;
            qualified.push({
              name: `${participant.firstName} ${participant.lastName}`,
              rank: i + 1,
              percentage: scored[i].percentage,
              durationSec: scored[i].durationSec === Infinity ? null : scored[i].durationSec,
            });
          } else {
            if (rr) rr.status = 'eliminated';
            participant.status = 'eliminated';
            eliminated.push({
              name: `${participant.firstName} ${participant.lastName}`,
              percentage: scored[i].percentage,
            });
          }

          await participant.save();
        }

        // Fermer le round
        currentRound.status = 'completed';
        currentRound.endTime = new Date();
        tournament.currentRound = roundIndex + 1;
        if (isLastRound) tournament.status = 'completed';
        await tournament.save();

        const room = `tournament:${tournament._id}`;
        const bracket = await buildBracket(tournament);

        // Broadcast résultats
        nsp.to(room).emit('round_advanced', {
          round: roundOrder,
          label: currentRound.label,
          qualified,
          eliminated,
          isFinished: tournament.status === 'completed',
        });
        nsp.to(room).emit('tournament_bracket', bracket);
        nsp.to(room).emit('tournament_state', {
          tournament: publicTournamentInfo(tournament),
        });

        // Breaking news pour les qualifications surprises
        if (qualified.length > 0) {
          nsp.to(room).emit('breaking_news', {
            type: 'round_complete',
            round: currentRound.label,
            qualifiedCount: qualified.length,
            eliminatedCount: eliminated.length,
            leader: qualified[0],
          });
        }

        // Si terminé, podium
        if (tournament.status === 'completed') {
          const winners = await Participant.find({
            tournament_id: tournament._id,
            finalRank: { $ne: null },
          }).sort({ finalRank: 1 }).lean();

          const podium = winners.map((w) => {
            const prize = tournament.prizes.find((p) => p.rank === w.finalRank);
            return {
              rank: w.finalRank,
              name: `${w.firstName} ${w.lastName}`,
              establishment: w.establishment,
              totalScore: w.totalScore,
              prize: prize || null,
            };
          });

          nsp.to(room).emit('tournament_finished', {
            podium,
            tournamentTitle: tournament.title,
          });
        }
      } catch (err) {
        socket.emit('error_msg', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[TOURNAMENT] Client disconnected: ${socket.id}`);
    });
  });

  return nsp;
}

// --- Helpers ---

function publicTournamentInfo(t) {
  return {
    _id: t._id,
    title: t.title,
    description: t.description,
    status: t.status,
    currentRound: t.currentRound,
    rounds: t.rounds.map((r) => ({
      order: r.order,
      label: r.label,
      status: r.status,
      promoteTopX: r.promoteTopX,
      startTime: r.startTime,
      endTime: r.endTime,
    })),
    prizes: t.prizes,
    registrationFee: t.registrationFee,
    currency: t.currency,
  };
}

async function buildBracket(tournament) {
  const participants = await Participant.find({ tournament_id: tournament._id })
    .sort({ totalScore: -1 })
    .lean();

  const bracket = tournament.rounds.map((round) => {
    const roundParticipants = participants
      .filter((p) => p.roundResults.some((rr) => rr.round === round.order))
      .map((p) => {
        const rr = p.roundResults.find((r) => r.round === round.order);
        return {
          _id: p._id,
          name: `${p.firstName} ${p.lastName}`,
          establishment: p.establishment || '',
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

  // Podium
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
          prize: prize || null,
        };
      });
  }

  return { bracket, podium };
}

module.exports = { setupTournamentNamespace };
