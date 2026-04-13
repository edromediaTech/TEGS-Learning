/**
 * Service Firebase Cloud Messaging (FCM) pour push notifications.
 *
 * Utilise l'API HTTP v1 de FCM avec une service account.
 * Fallback: si firebase-admin n'est pas installé, les notifications sont loggées.
 *
 * Variables d'environnement :
 *   FCM_PROJECT_ID — Firebase project ID
 *   GOOGLE_APPLICATION_CREDENTIALS — chemin vers le fichier service-account.json
 */
const { request } = require('undici');
const DeviceToken = require('../models/DeviceToken');

let firebaseAdmin = null;

/**
 * Initialiser firebase-admin si disponible.
 */
function getAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  try {
    firebaseAdmin = require('firebase-admin');
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.applicationDefault(),
        projectId: process.env.FCM_PROJECT_ID,
      });
    }
    return firebaseAdmin;
  } catch {
    console.warn('[FCM] firebase-admin non installe — push desactivees');
    return null;
  }
}

/**
 * Envoyer une notification push à un device.
 * @param {string} token - FCM device token
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 */
async function sendToDevice(token, { title, body, data = {} }) {
  const admin = getAdmin();
  if (!admin) {
    console.log(`[FCM-DRY] → ${token.substring(0, 20)}... | ${title}: ${body}`);
    return { success: false, reason: 'firebase-admin not available' };
  }

  try {
    const result = await admin.messaging().send({
      token,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'tegs-tournament',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    return { success: true, messageId: result };
  } catch (err) {
    // Token invalide → désactiver
    if (err.code === 'messaging/registration-token-not-registered') {
      await DeviceToken.findOneAndUpdate({ token }, { active: false });
    }
    console.error(`[FCM] Error sending to ${token.substring(0, 20)}...:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Envoyer une notification à tous les devices d'un utilisateur.
 */
async function sendToUser(userId, payload) {
  const devices = await DeviceToken.find({ user_id: userId, active: true }).lean();
  const results = [];
  for (const device of devices) {
    results.push(await sendToDevice(device.token, payload));
  }
  return results;
}

/**
 * Envoyer une notification à tous les participants d'un tournoi.
 */
async function sendToTournament(tournamentId, payload) {
  const Participant = require('../models/Participant');
  const participants = await Participant.find({ tournament_id: tournamentId }).lean();
  const userIds = participants.map((p) => p.user_id).filter(Boolean);

  const devices = await DeviceToken.find({
    $or: [
      { user_id: { $in: userIds }, active: true },
      { participant_id: { $in: participants.map((p) => p._id) }, active: true },
    ],
  }).lean();

  const results = [];
  for (const device of devices) {
    results.push(await sendToDevice(device.token, payload));
  }
  return { sent: results.length, successes: results.filter((r) => r.success).length };
}

/**
 * Notifications prédéfinies pour les événements tournoi.
 */
const TournamentNotifications = {
  roundStarting: (tournamentTitle, roundLabel, minutesBefore = 10) => ({
    title: `${roundLabel} commence bientot !`,
    body: `Le round "${roundLabel}" de ${tournamentTitle} demarre dans ${minutesBefore} minutes. Preparez votre camera !`,
    data: { type: 'round_starting', tournamentTitle, roundLabel },
  }),

  roundStarted: (tournamentTitle, roundLabel) => ({
    title: `${roundLabel} a commence !`,
    body: `Le round est en cours pour ${tournamentTitle}. Bonne chance !`,
    data: { type: 'round_started', tournamentTitle, roundLabel },
  }),

  qualified: (tournamentTitle, roundLabel, rank) => ({
    title: 'Felicitations — Qualifie(e) !',
    body: `Vous etes qualifie(e) au rang ${rank} du ${roundLabel} pour ${tournamentTitle}.`,
    data: { type: 'qualified', tournamentTitle, roundLabel, rank: String(rank) },
  }),

  eliminated: (tournamentTitle, roundLabel) => ({
    title: 'Fin de parcours',
    body: `Vous avez ete elimine(e) au ${roundLabel} de ${tournamentTitle}. Merci pour votre participation !`,
    data: { type: 'eliminated', tournamentTitle, roundLabel },
  }),

  tournamentFinished: (tournamentTitle) => ({
    title: 'Tournoi termine !',
    body: `${tournamentTitle} est termine. Decouvrez le podium et les resultats !`,
    data: { type: 'tournament_finished', tournamentTitle },
  }),

  winner: (tournamentTitle, rank, prizeAmount, currency) => ({
    title: `${rank === 1 ? 'Champion !' : `${rank}e place !`}`,
    body: `Vous avez termine ${rank === 1 ? '1er' : rank + 'e'} a ${tournamentTitle}${prizeAmount ? ` — Prime: ${prizeAmount} ${currency}` : ''} !`,
    data: { type: 'winner', tournamentTitle, rank: String(rank) },
  }),
};

module.exports = {
  sendToDevice,
  sendToUser,
  sendToTournament,
  TournamentNotifications,
};
