const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const Tournament = require('../models/Tournament');
const Participant = require('../models/Participant');
const Transaction = require('../models/Transaction');
const moncash = require('../services/moncash');
const natcash = require('../services/natcash');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/payment/initiate
// Initier un paiement pour une inscription tournoi
// (Route publique — pas d'auth requise, le participant vient de s'inscrire)
// ---------------------------------------------------------------------------
router.post(
  '/initiate',
  [
    body('participant_id').isMongoId().withMessage('participant_id invalide'),
    body('provider').isIn(['moncash', 'natcash']).withMessage('Provider: moncash ou natcash'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { participant_id, provider } = req.body;

      const participant = await Participant.findById(participant_id);
      if (!participant) {
        return res.status(404).json({ error: 'Participant non trouvé' });
      }

      if (participant.paid) {
        return res.status(400).json({ error: 'Déjà payé', competitionToken: participant.competitionToken });
      }

      const tournament = await Tournament.findById(participant.tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      if (tournament.registrationFee <= 0) {
        // Tournoi gratuit — activer directement
        participant.paid = true;
        await participant.save();
        return res.json({
          message: 'Inscription gratuite confirmée',
          competitionToken: participant.competitionToken,
          paid: true,
        });
      }

      // Créer la transaction en base
      const transaction = await Transaction.create({
        participant_id: participant._id,
        tournament_id: tournament._id,
        tenant_id: tournament.tenant_id,
        amount: tournament.registrationFee,
        currency: tournament.currency,
        provider,
        status: 'pending',
      });

      participant.transaction_id = transaction._id;
      await participant.save();

      // Construire le callback URL
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const callbackUrl = `${baseUrl}/api/payment/webhook/${provider}`;

      let paymentResult;

      if (provider === 'moncash') {
        paymentResult = await moncash.createPayment({
          amount: tournament.registrationFee,
          orderId: transaction._id.toString(),
        });
        transaction.providerRef = paymentResult.token;
      } else if (provider === 'natcash') {
        paymentResult = await natcash.createPayment({
          amount: tournament.registrationFee,
          orderId: transaction._id.toString(),
          callbackUrl,
        });
        transaction.providerRef = paymentResult.reference;
      }

      await transaction.save();

      res.json({
        message: 'Paiement initié',
        paymentUrl: paymentResult.paymentUrl,
        transaction_id: transaction._id,
        provider,
        amount: tournament.registrationFee,
        currency: tournament.currency,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/payment/webhook/moncash
// Callback MonCash après paiement (appelé par MonCash)
// ---------------------------------------------------------------------------
router.post('/webhook/moncash', async (req, res, next) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId requis' });
    }

    // Vérifier auprès de MonCash
    const verification = await moncash.verifyPayment(transactionId);

    const transaction = await Transaction.findById(verification.orderId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction non trouvée' });
    }

    transaction.status = verification.status;
    transaction.providerRef = transactionId;
    transaction.providerResponse = verification.raw;
    if (verification.status === 'completed') {
      transaction.completedAt = new Date();
    }
    await transaction.save();

    // Si paiement réussi → activer le participant
    if (verification.status === 'completed') {
      await Participant.findByIdAndUpdate(transaction.participant_id, { paid: true });
    }

    res.json({ status: 'ok', paymentStatus: verification.status });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/payment/webhook/natcash
// Callback Natcash après paiement
// ---------------------------------------------------------------------------
router.post('/webhook/natcash', async (req, res, next) => {
  try {
    const { orderId, status: natcashStatus } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId requis' });
    }

    // Vérifier auprès de Natcash
    const verification = await natcash.verifyPayment(orderId);

    const transaction = await Transaction.findById(orderId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction non trouvée' });
    }

    transaction.status = verification.status;
    transaction.providerResponse = verification.raw;
    if (verification.status === 'completed') {
      transaction.completedAt = new Date();
    }
    await transaction.save();

    // Si paiement réussi → activer le participant
    if (verification.status === 'completed') {
      await Participant.findByIdAndUpdate(transaction.participant_id, { paid: true });
    }

    res.json({ status: 'ok', paymentStatus: verification.status });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/payment/verify/:transactionId
// Vérification manuelle du statut d'un paiement (polling côté frontend)
// ---------------------------------------------------------------------------
router.get(
  '/verify/:transactionId',
  param('transactionId').isMongoId().withMessage('ID invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const transaction = await Transaction.findById(req.params.transactionId).lean();
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction non trouvée' });
      }

      // Si encore pending, re-vérifier auprès du provider
      if (transaction.status === 'pending') {
        try {
          let verification;
          if (transaction.provider === 'moncash' && transaction.providerRef) {
            verification = await moncash.verifyPayment(transaction.providerRef);
          } else if (transaction.provider === 'natcash') {
            verification = await natcash.verifyPayment(transaction._id.toString());
          }

          if (verification && verification.status !== 'pending') {
            await Transaction.findByIdAndUpdate(transaction._id, {
              status: verification.status,
              providerResponse: verification.raw,
              completedAt: verification.status === 'completed' ? new Date() : null,
            });

            if (verification.status === 'completed') {
              await Participant.findByIdAndUpdate(transaction.participant_id, { paid: true });
            }

            transaction.status = verification.status;
          }
        } catch (e) {
          // Provider check failed — return current DB status
        }
      }

      // Si complété, retourner aussi le competitionToken + QR
      let competitionToken = null;
      let qrCode = null;
      if (transaction.status === 'completed') {
        const participant = await Participant.findById(transaction.participant_id).lean();
        if (participant) {
          competitionToken = participant.competitionToken;
          qrCode = await QRCode.toDataURL(participant.competitionToken, {
            width: 300,
            margin: 2,
            color: { dark: '#1e293b', light: '#ffffff' },
          });
        }
      }

      res.json({
        transaction_id: transaction._id,
        status: transaction.status,
        provider: transaction.provider,
        amount: transaction.amount,
        currency: transaction.currency,
        competitionToken,
        qrCode,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/payment/manual-confirm
// Confirmation manuelle par admin (paiement en espèces / autre)
// ---------------------------------------------------------------------------
router.post(
  '/manual-confirm',
  [
    body('participant_id').isMongoId().withMessage('participant_id invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const participant = await Participant.findById(req.body.participant_id);
      if (!participant) {
        return res.status(404).json({ error: 'Participant non trouvé' });
      }

      const tournament = await Tournament.findById(participant.tournament_id);

      // Créer une transaction manuelle
      const transaction = await Transaction.create({
        participant_id: participant._id,
        tournament_id: participant.tournament_id,
        tenant_id: participant.tenant_id,
        amount: tournament ? tournament.registrationFee : 0,
        currency: tournament ? tournament.currency : 'HTG',
        provider: 'manual',
        providerRef: `MANUAL-${Date.now()}`,
        status: 'completed',
        completedAt: new Date(),
      });

      participant.paid = true;
      participant.transaction_id = transaction._id;
      await participant.save();

      // Générer QR code
      const qrCode = await QRCode.toDataURL(participant.competitionToken, {
        width: 300,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });

      res.json({
        message: 'Paiement confirmé manuellement',
        competitionToken: participant.competitionToken,
        qrCode,
        participant,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
