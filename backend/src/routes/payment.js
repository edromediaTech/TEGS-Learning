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

// ═══════════════════════════════════════════════════════════════
// AGENT POS — Paiement Cash par Agent Autorisé
// ═══════════════════════════════════════════════════════════════

const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');

// ---------------------------------------------------------------------------
// GET /api/payment/agent/search-participant
// Rechercher un participant par nom, email ou competitionToken
// ---------------------------------------------------------------------------
router.get(
  '/agent/search-participant',
  authenticate,
  authorize('authorized_agent', 'admin_ddene'),
  async (req, res, next) => {
    try {
      const { q, tournament_id } = req.query;
      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Recherche trop courte (min 2 caractères)' });
      }

      const filter = {};
      if (tournament_id) filter.tournament_id = tournament_id;

      // Recherche par token exact ou par nom/email
      if (q.startsWith('TKT-')) {
        filter.competitionToken = q.toUpperCase();
      } else {
        filter.$or = [
          { firstName: { $regex: q, $options: 'i' } },
          { lastName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ];
      }

      const participants = await Participant.find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Enrichir avec le nom du tournoi
      const tournamentIds = [...new Set(participants.map((p) => p.tournament_id.toString()))];
      const tournaments = await Tournament.find({ _id: { $in: tournamentIds } })
        .select('title registrationFee currency')
        .lean();
      const tMap = Object.fromEntries(tournaments.map((t) => [t._id.toString(), t]));

      const results = participants.map((p) => ({
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        establishment: p.establishment,
        competitionToken: p.competitionToken,
        paid: p.paid,
        status: p.status,
        tournament: tMap[p.tournament_id.toString()] || null,
      }));

      res.json({ participants: results, count: results.length });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/payment/agent/collect
// Agent encaisse le paiement cash d'un participant
// ---------------------------------------------------------------------------
router.post(
  '/agent/collect',
  authenticate,
  authorize('authorized_agent', 'admin_ddene'),
  [
    body('participant_id').isMongoId().withMessage('participant_id invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // === CHECK 0 : Agent vérifié ===
      const agent = await User.findById(req.user.id);
      if (agent.role === 'authorized_agent' && !agent.isAgentVerified) {
        return res.status(403).json({ error: 'Votre compte agent n\'est pas encore vérifié par l\'administrateur' });
      }

      // === CHECK 0b : Contrat accepté ===
      if (agent.role === 'authorized_agent' && !agent.contractAcceptedAt) {
        return res.status(403).json({
          error: 'Vous devez accepter le contrat de partenariat avant de pouvoir encaisser.',
          code: 'CONTRACT_NOT_ACCEPTED',
        });
      }

      // SuperAdmin / Admin bypass toutes les contraintes agent
      const isBypass = req.isSuperAdmin || agent.role === 'admin_ddene';

      // === CHECK 1 : Agent actif (pas bloqué) ===
      if (!isBypass && agent.isBlocked) {
        return res.status(403).json({
          error: 'Compte suspendu. Contactez l\'administration DDENE.',
          code: 'AGENT_BLOCKED',
        });
      }

      const participant = await Participant.findById(req.body.participant_id);
      if (!participant) {
        return res.status(404).json({ error: 'Participant non trouvé' });
      }

      if (participant.paid) {
        return res.status(400).json({
          error: 'Ce participant a déjà payé',
          competitionToken: participant.competitionToken,
        });
      }

      const tournament = await Tournament.findById(participant.tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      // Générer numéro de reçu unique
      const receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}-${req.user.id.toString().slice(-4).toUpperCase()}`;

      const fee = tournament.registrationFee;

      // === CHECK 2 : Limite de quantité de paiements ===
      if (!isBypass && agent.maxPaymentLimit > 0 && agent.currentPaymentCount >= agent.maxPaymentLimit) {
        return res.status(403).json({
          error: `Limite de quantité atteinte (${agent.maxPaymentLimit} transactions max). Contactez l'administration.`,
          code: 'PAYMENT_LIMIT_REACHED',
          current: agent.currentPaymentCount,
          limit: agent.maxPaymentLimit,
        });
      }

      // === CHECK 3 : Quota financier (caution) ===
      if (!isBypass && agent.guaranteeBalance > 0) {
        const available = agent.guaranteeBalance - agent.usedQuota;
        if (fee > available) {
          return res.status(403).json({
            error: `Quota insuffisant. Solde restant : ${available} ${tournament.currency}. Veuillez recharger votre caution.`,
            code: 'INSUFFICIENT_QUOTA',
            available,
            required: fee,
            guaranteeBalance: agent.guaranteeBalance,
            usedQuota: agent.usedQuota,
          });
        }
      }

      // Calcul commission agent
      const rate = agent.commissionRate || 0;
      const commissionAmount = Math.round(fee * (rate / 100));
      const netAmount = fee - commissionAmount;

      // Créer la transaction agent_cash
      const transaction = await Transaction.create({
        participant_id: participant._id,
        tournament_id: participant.tournament_id,
        tenant_id: participant.tenant_id,
        amount: fee,
        currency: tournament.currency,
        provider: 'agent_cash',
        providerRef: receiptNumber,
        collectedBy: req.user.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        organizationName: agent.organizationName || '',
        receiptNumber,
        commissionRate: rate,
        commissionAmount,
        netAmount,
        status: 'completed',
        completedAt: new Date(),
      });

      // Activer le participant
      participant.paid = true;
      participant.transaction_id = transaction._id;
      await participant.save();

      // Mettre à jour quota agent
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { usedQuota: fee, currentPaymentCount: 1 },
      });

      // Alerte si quota < 10%
      if (agent.guaranteeBalance > 0) {
        const newUsed = (agent.usedQuota || 0) + fee;
        const remaining = agent.guaranteeBalance - newUsed;
        const threshold = agent.guaranteeBalance * 0.1;
        if (remaining > 0 && remaining <= threshold) {
          // Push notification: quota faible
          try {
            const fcm = require('../services/fcm');
            await fcm.sendToUser(req.user.id, {
              title: 'Quota presque épuisé !',
              body: `Attention, il vous reste ${remaining} ${tournament.currency} sur votre caution. Veuillez recharger.`,
              data: { type: 'quota_low', remaining: String(remaining) },
            });
          } catch {}
        }
      }

      // Générer QR code
      const qrCode = await QRCode.toDataURL(participant.competitionToken, {
        width: 300,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });

      // Sponsors pour le reçu
      const Sponsor = require('../models/Sponsor');
      const ticketSponsors = await Sponsor.find({
        tournament_id: tournament._id, isActive: true, showOnTicket: true,
      }).sort({ tier: 1 }).limit(2).select('name tier').lean();

      res.json({
        message: 'Paiement cash encaissé avec succès',
        receipt: {
          number: receiptNumber,
          amount: fee,
          currency: tournament.currency,
          commissionRate: rate,
          commissionAmount,
          netAmount,
          agent: `${agent.firstName} ${agent.lastName}`,
          organization: agent.organizationName,
          date: new Date().toISOString(),
          participant: `${participant.firstName} ${participant.lastName}`,
          tournament: tournament.title,
          sponsors: ticketSponsors.map((s) => s.name),
        },
        competitionToken: participant.competitionToken,
        qrCode,
        participant: {
          _id: participant._id,
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
          paid: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/payment/agent/my-collections
// Journal de caisse de l'agent connecté
// ---------------------------------------------------------------------------
router.get(
  '/agent/my-collections',
  authenticate,
  authorize('authorized_agent', 'admin_ddene'),
  async (req, res, next) => {
    try {
      const { date, tournament_id } = req.query;

      const filter = {
        collectedBy: req.user.id,
        provider: 'agent_cash',
      };
      if (tournament_id) filter.tournament_id = tournament_id;

      // Filtre par date (aujourd'hui par défaut)
      if (date) {
        const day = new Date(date);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        filter.completedAt = { $gte: day, $lt: nextDay };
      }

      const collections = await Transaction.find(filter)
        .sort({ completedAt: -1 })
        .populate('participant_id', 'firstName lastName email competitionToken')
        .lean();

      const total = collections.reduce((sum, c) => sum + c.amount, 0);
      const currency = collections[0]?.currency || 'HTG';

      res.json({
        collections: collections.map((c) => ({
          _id: c._id,
          receiptNumber: c.receiptNumber,
          amount: c.amount,
          currency: c.currency,
          participant: c.participant_id,
          completedAt: c.completedAt,
        })),
        count: collections.length,
        total,
        currency,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/payment/agent/deposit-slip
// Génère un bordereau de versement PDF (jsPDF)
// ---------------------------------------------------------------------------
router.get(
  '/agent/deposit-slip',
  authenticate,
  authorize('authorized_agent', 'admin_ddene'),
  async (req, res, next) => {
    try {
      const agent = await User.findById(req.user.id)
        .select('firstName lastName email organizationName guaranteeBalance usedQuota commissionRate')
        .lean();

      // Transactions non réglées (collectées, pas encore versées)
      const pendingCollections = await Transaction.find({
        collectedBy: req.user.id,
        provider: 'agent_cash',
        status: 'completed',
      })
        .sort({ completedAt: -1 })
        .populate('participant_id', 'firstName lastName competitionToken')
        .lean();

      const totalCollected = pendingCollections.reduce((s, t) => s + t.amount, 0);
      const totalCommission = pendingCollections.reduce((s, t) => s + (t.commissionAmount || 0), 0);
      const totalNet = pendingCollections.reduce((s, t) => s + (t.netAmount || t.amount), 0);
      const currency = pendingCollections[0]?.currency || 'HTG';

      // Générer le PDF
      const { jsPDF } = require('jspdf');
      require('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const w = doc.internal.pageSize.getWidth();
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
      const slipId = `BDV-${now.getTime().toString(36).toUpperCase()}`;

      // --- En-tête officiel ---
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, w, 40, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(245, 158, 11);
      doc.text('TEGS-Arena', 15, 18);

      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('Partenaire officiel DDENE', 15, 26);

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('BORDEREAU DE VERSEMENT', w - 15, 18, { align: 'right' });

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`N° ${slipId}`, w - 15, 26, { align: 'right' });
      doc.text(dateStr, w - 15, 33, { align: 'right' });

      // --- Infos Agent ---
      let y = 50;
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('AGENT AUTORISÉ', 15, y);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Nom : ${agent.firstName} ${agent.lastName}`, 15, y);
      doc.text(`Email : ${agent.email}`, w / 2, y);
      y += 6;
      doc.text(`Organisation : ${agent.organizationName || 'N/A'}`, 15, y);
      doc.text(`Taux commission : ${agent.commissionRate}%`, w / 2, y);

      // --- Résumé financier ---
      y += 14;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y - 5, w - 30, 28, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('RÉSUMÉ FINANCIER', 20, y + 2);

      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.text(`Total collecté :`, 20, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalCollected.toLocaleString()} ${currency}`, 80, y);

      doc.setFont('helvetica', 'normal');
      doc.text(`Commission agent :`, w / 2 + 5, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(`${totalCommission.toLocaleString()} ${currency}`, w - 30, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`Montant à reverser :`, 20, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text(`${totalNet.toLocaleString()} ${currency}`, 80, y);

      // --- Tableau des transactions ---
      y += 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`DÉTAIL DES TRANSACTIONS (${pendingCollections.length})`, 15, y);

      const tableData = pendingCollections.slice(0, 30).map((t, i) => [
        i + 1,
        t.receiptNumber || '-',
        t.participant_id ? `${t.participant_id.firstName} ${t.participant_id.lastName}` : '-',
        `${t.amount} ${t.currency}`,
        `${t.commissionAmount || 0}`,
        `${t.netAmount || t.amount}`,
        new Date(t.completedAt).toLocaleDateString('fr-FR'),
      ]);

      doc.autoTable({
        startY: y + 4,
        head: [['#', 'Reçu', 'Participant', 'Montant', 'Comm.', 'Net', 'Date']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
      });

      // --- Signatures ---
      const finalY = doc.lastAutoTable?.finalY || y + 60;
      const sigY = finalY + 20;

      doc.setDrawColor(200, 200, 200);
      doc.line(15, sigY + 15, 80, sigY + 15);
      doc.line(w - 80, sigY + 15, w - 15, sigY + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Signature Agent', 47, sigY + 22, { align: 'center' });
      doc.text('Signature Comptable DDENE', w - 47, sigY + 22, { align: 'center' });

      // --- QR Code pour régularisation ---
      const qrData = `SETTLE:${req.user.id}:${totalNet}:${slipId}`;
      const qrImg = await QRCode.toDataURL(qrData, { width: 200, margin: 1, color: { dark: '#0f172a' } });
      const qrSize = 25;
      doc.addImage(qrImg, 'PNG', (w - qrSize) / 2, sigY + 28, qrSize, qrSize);

      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Scanner pour régulariser', w / 2, sigY + 28 + qrSize + 4, { align: 'center' });
      doc.text(`Ref: ${slipId}`, w / 2, sigY + 28 + qrSize + 8, { align: 'center' });

      // Envoyer le PDF
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="bordereau-${slipId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/payment/agent/wallet
// Portefeuille de l'agent : commissions accumulées + dette à reverser
// ---------------------------------------------------------------------------
router.get(
  '/agent/wallet',
  authenticate,
  authorize('authorized_agent', 'admin_ddene'),
  async (req, res, next) => {
    try {
      const stats = await Transaction.aggregate([
        { $match: { collectedBy: req.user.id, provider: 'agent_cash', status: 'completed' } },
        {
          $group: {
            _id: null,
            totalCollected: { $sum: '$amount' },
            totalCommission: { $sum: '$commissionAmount' },
            totalNet: { $sum: '$netAmount' },
            transactionCount: { $sum: 1 },
            currency: { $first: '$currency' },
          },
        },
      ]);

      const s = stats[0] || { totalCollected: 0, totalCommission: 0, totalNet: 0, transactionCount: 0, currency: 'HTG' };

      const agent = await User.findById(req.user.id)
        .select('commissionRate organizationName firstName lastName guaranteeBalance usedQuota maxPaymentLimit currentPaymentCount isBlocked')
        .lean();

      const available = (agent.guaranteeBalance || 0) - (agent.usedQuota || 0);
      const quotaPercent = agent.guaranteeBalance > 0
        ? Math.round((available / agent.guaranteeBalance) * 100)
        : 100;

      res.json({
        agent: {
          name: `${agent.firstName} ${agent.lastName}`,
          organization: agent.organizationName,
          commissionRate: agent.commissionRate,
          isBlocked: agent.isBlocked,
        },
        wallet: {
          totalCollected: s.totalCollected,
          totalCommission: s.totalCommission,
          amountDue: s.totalNet,
          transactionCount: s.transactionCount,
          currency: s.currency,
        },
        quota: {
          guaranteeBalance: agent.guaranteeBalance || 0,
          usedQuota: agent.usedQuota || 0,
          available,
          quotaPercent,
          maxPaymentLimit: agent.maxPaymentLimit || 0,
          currentPaymentCount: agent.currentPaymentCount || 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/payment/agent/set-commission/:userId
// SuperAdmin modifie le taux de commission d'un agent
// ---------------------------------------------------------------------------
router.put(
  '/agent/set-commission/:userId',
  authenticate,
  authorize(), // superadmin only (authorize() with no args = superadmin via fallback)
  async (req, res, next) => {
    try {
      const { commissionRate } = req.body;
      if (commissionRate === undefined || commissionRate < 0 || commissionRate > 50) {
        return res.status(400).json({ error: 'commissionRate doit être entre 0 et 50' });
      }

      const user = await User.findById(req.params.userId);
      if (!user || user.role !== 'authorized_agent') {
        return res.status(404).json({ error: 'Agent non trouvé' });
      }

      user.commissionRate = commissionRate;
      await user.save();

      res.json({
        message: `Taux de commission de ${user.firstName} ${user.lastName} mis à ${commissionRate}%`,
        agent: {
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          commissionRate: user.commissionRate,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/payment/agent/verify/:userId
// SuperAdmin / Admin vérifie un agent
// ---------------------------------------------------------------------------
router.put(
  '/agent/verify/:userId',
  authenticate,
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user || user.role !== 'authorized_agent') {
        return res.status(404).json({ error: 'Agent non trouvé' });
      }

      user.isAgentVerified = true;
      await user.save();

      res.json({
        message: `Agent ${user.firstName} ${user.lastName} vérifié`,
        agent: { _id: user._id, isAgentVerified: true },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// CONTRAT AGENT
// ═══════════════════════════════════════════════════════════════

const CONTRACT_VERSION = '2026-04-v1';

// ---------------------------------------------------------------------------
// POST /api/payment/agent/accept-contract
// Agent accepte les termes du contrat de partenariat
// ---------------------------------------------------------------------------
router.post(
  '/agent/accept-contract',
  authenticate,
  authorize('authorized_agent'),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Agent non trouvé' });

      user.contractAcceptedAt = new Date();
      user.contractVersion = CONTRACT_VERSION;
      await user.save();

      res.json({
        message: 'Contrat accepté',
        contractAcceptedAt: user.contractAcceptedAt,
        contractVersion: CONTRACT_VERSION,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/payment/agent/contract-pdf
// Génère le contrat de partenariat PDF officiel
// ---------------------------------------------------------------------------
router.get(
  '/agent/contract-pdf',
  authenticate,
  authorize('authorized_agent', 'admin_ddene'),
  async (req, res, next) => {
    try {
      const agentId = req.query.agent_id || req.user.id;
      const agent = await User.findById(agentId)
        .select('firstName lastName email organizationName commissionRate guaranteeBalance contractAcceptedAt contractVersion tenant_id')
        .lean();

      if (!agent) return res.status(404).json({ error: 'Agent non trouvé' });

      const Tenant = require('../models/Tenant');
      const tenant = agent.tenant_id ? await Tenant.findById(agent.tenant_id).select('name').lean() : null;

      const { jsPDF } = require('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = doc.internal.pageSize.getWidth();
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

      // --- Fonctions helper ---
      let curY = 15;
      function title(text, size = 14) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(15, 23, 42);
        doc.text(text, w / 2, curY, { align: 'center' });
        curY += size * 0.5 + 2;
      }
      function subtitle(text) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 95);
        doc.text(text, 15, curY);
        curY += 7;
      }
      function para(text) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(text, w - 30);
        doc.text(lines, 15, curY);
        curY += lines.length * 5 + 3;
      }

      // --- En-tête ---
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, w, 8, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.line(0, 8, w, 8);

      curY = 20;
      title('CONTRAT DE PARTENARIAT', 16);
      title('AGENT DE COLLECTE AUTORISÉ TEGS-ARENA', 12);

      curY += 5;

      // --- ENTRE ---
      subtitle('ENTRE :');
      para('TEGS-Learning / Plateforme TEGS-Arena, représentée par M. Ronel Similien, ci-après dénommée "La Plateforme".');
      curY += 2;
      subtitle('ET :');
      para(`${agent.organizationName || 'N/A'}, représenté(e) par ${agent.firstName} ${agent.lastName} (${agent.email}), ci-après dénommé(e) "L'Agent".`);

      curY += 3;

      // --- Articles ---
      subtitle('ARTICLE 1 : OBJET DU CONTRAT');
      para('Le présent contrat définit les conditions dans lesquelles l\'Agent est autorisé à collecter les frais d\'inscription en espèces (Cash) pour les concours organisés sur la plateforme TEGS-Arena.');

      subtitle('ARTICLE 2 : SYSTÈME DE CAUTION ET QUOTA');
      para(`2.1. Caution de Garantie : L'Agent s'engage à déposer une caution de ${(agent.guaranteeBalance || 0).toLocaleString()} HTG. Ce montant définit la limite maximale de collecte autorisée (Quota).`);
      para('2.2. Blocage Automatique : Dès que le montant total collecté atteint la valeur de la caution, l\'accès de l\'Agent sera automatiquement suspendu par le système jusqu\'à régularisation.');

      subtitle('ARTICLE 3 : COMMISSIONS');
      para(`L'Agent perçoit une commission de ${agent.commissionRate || 5}% sur chaque transaction validée avec succès. Cette commission est calculée automatiquement par le système et déduite du montant à reverser à la Plateforme.`);

      subtitle('ARTICLE 4 : OBLIGATIONS DE L\'AGENT');
      para('4.1. Vérification : L\'Agent doit vérifier l\'identité du participant avant de valider le paiement.');
      para('4.2. Versement des Fonds : L\'Agent s\'engage à reverser les fonds collectés (nets de commission) à la Plateforme dès que son quota arrive à épuisement ou selon une fréquence hebdomadaire.');
      para('4.3. Bordereau : Chaque versement doit être accompagné du Bordereau de Versement PDF généré par l\'application.');

      subtitle('ARTICLE 5 : SÉCURITÉ ET FRAUDE');
      para('Toute tentative de manipulation du système, de surfacturation des participants ou de non-reversement des fonds entraînera la désactivation immédiate du compte de l\'Agent et des poursuites légales conformément aux lois haïtiennes en vigueur.');

      subtitle('ARTICLE 6 : DURÉE ET RÉSILIATION');
      para('Ce contrat est conclu pour une durée de 12 mois renouvelable. La Plateforme se réserve le droit de désactiver l\'Agent à tout moment en cas de non-respect des procédures techniques ou financières.');

      // Check page overflow
      if (curY > 250) {
        doc.addPage();
        curY = 20;
      }

      // --- Signatures ---
      curY += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`Fait à Port-au-Prince, Haïti, le ${dateStr}`, w / 2, curY, { align: 'center' });

      curY += 15;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, curY + 12, 80, curY + 12);
      doc.line(w - 80, curY + 12, w - 15, curY + 12);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('La Plateforme', 47, curY + 18, { align: 'center' });
      doc.text('L\'Agent', w - 47, curY + 18, { align: 'center' });

      // Signature numérique si contrat accepté
      if (agent.contractAcceptedAt) {
        doc.setFontSize(8);
        doc.setTextColor(34, 197, 94);
        doc.text(`Accepté numériquement le ${new Date(agent.contractAcceptedAt).toLocaleDateString('fr-FR')}`, w - 47, curY + 24, { align: 'center' });
        doc.text(`Version: ${agent.contractVersion}`, w - 47, curY + 28, { align: 'center' });
      }

      // Pied de page
      const footY = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`TEGS-Arena — Contrat Agent v${CONTRACT_VERSION}`, w / 2, footY, { align: 'center' });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `inline; filename="contrat-agent-${agent.firstName}-${agent.lastName}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// ADMIN — Gestion Agents (Caution, Quota, Settlement)
// ═══════════════════════════════════════════════════════════════

const GuaranteeLog = require('../models/GuaranteeLog');

// ---------------------------------------------------------------------------
// PUT /api/payment/agent/update-settings/:userId
// Admin met à jour caution, limite, block d'un agent
// ---------------------------------------------------------------------------
router.put(
  '/agent/update-settings/:userId',
  authenticate,
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user || user.role !== 'authorized_agent') {
        return res.status(404).json({ error: 'Agent non trouvé' });
      }

      const { guaranteeBalance, maxPaymentLimit, isBlocked, note } = req.body;
      const changes = [];

      // Mise à jour caution (top-up / adjustment)
      if (guaranteeBalance !== undefined && guaranteeBalance !== user.guaranteeBalance) {
        const before = user.guaranteeBalance;
        const diff = guaranteeBalance - before;
        user.guaranteeBalance = guaranteeBalance;

        await GuaranteeLog.create({
          agent_id: user._id,
          admin_id: req.user.id,
          type: diff > 0 ? 'deposit' : 'withdrawal',
          amount: Math.abs(diff),
          balanceBefore: before,
          balanceAfter: guaranteeBalance,
          note: note || `${diff > 0 ? 'Recharge' : 'Retrait'} caution`,
          tenant_id: req.tenantId,
        });
        changes.push(`Caution: ${before} → ${guaranteeBalance}`);

        // Auto-déblocage si la nouvelle marge est suffisante
        if (user.isBlocked && guaranteeBalance > user.usedQuota) {
          user.isBlocked = false;
          changes.push('Agent auto-débloqué (marge suffisante)');
        }
      }

      if (maxPaymentLimit !== undefined) {
        user.maxPaymentLimit = maxPaymentLimit;
        changes.push(`Limite paiements: ${maxPaymentLimit || 'illimité'}`);
      }

      if (isBlocked !== undefined) {
        user.isBlocked = isBlocked;
        changes.push(`Bloqué: ${isBlocked}`);
      }

      await user.save();

      res.json({
        message: `Agent ${user.firstName} ${user.lastName} mis à jour`,
        changes,
        agent: {
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          guaranteeBalance: user.guaranteeBalance,
          usedQuota: user.usedQuota,
          available: user.guaranteeBalance - user.usedQuota,
          maxPaymentLimit: user.maxPaymentLimit,
          currentPaymentCount: user.currentPaymentCount,
          isBlocked: user.isBlocked,
          commissionRate: user.commissionRate,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/payment/agent/settle-debt/:userId
// Admin enregistre un versement (settlement) — libère le quota agent
// ---------------------------------------------------------------------------
router.post(
  '/agent/settle-debt/:userId',
  authenticate,
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const { amountSettled, receiptRef, note } = req.body;

      if (!amountSettled || amountSettled <= 0) {
        return res.status(400).json({ error: 'Montant du versement requis (> 0)' });
      }

      const user = await User.findById(req.params.userId);
      if (!user || user.role !== 'authorized_agent') {
        return res.status(404).json({ error: 'Agent non trouvé' });
      }

      const usedBefore = user.usedQuota;
      const newUsed = Math.max(0, user.usedQuota - amountSettled);
      user.usedQuota = newUsed;

      // Auto-déblocage si quota suffisant
      const wasBlocked = user.isBlocked;
      if (user.isBlocked && user.guaranteeBalance > newUsed) {
        user.isBlocked = false;
      }

      await user.save();

      // Log du settlement
      await GuaranteeLog.create({
        agent_id: user._id,
        admin_id: req.user.id,
        type: 'reset',
        amount: amountSettled,
        balanceBefore: usedBefore,
        balanceAfter: newUsed,
        note: note || `Versement reçu${receiptRef ? ' — Ref: ' + receiptRef : ''}`,
        tenant_id: req.tenantId,
      });

      // Push notification à l'agent
      try {
        const fcm = require('../services/fcm');
        const currency = 'HTG';
        await fcm.sendToUser(user._id, {
          title: 'Paiement reçu — Quota réinitialisé',
          body: `Versement de ${amountSettled} ${currency} validé. Quota disponible : ${user.guaranteeBalance - newUsed} ${currency}. Vous pouvez reprendre les inscriptions.`,
          data: { type: 'settlement_confirmed', amount: String(amountSettled) },
        });
      } catch {}

      res.json({
        message: `Versement de ${amountSettled} enregistré pour ${user.firstName} ${user.lastName}`,
        settlement: {
          amountSettled,
          usedBefore,
          usedAfter: newUsed,
          quotaFreed: usedBefore - newUsed,
          available: user.guaranteeBalance - newUsed,
          autoUnblocked: wasBlocked && !user.isBlocked,
          receiptRef: receiptRef || null,
        },
        agent: {
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          guaranteeBalance: user.guaranteeBalance,
          usedQuota: newUsed,
          available: user.guaranteeBalance - newUsed,
          isBlocked: user.isBlocked,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/payment/agent/ledger/:userId
// Historique des mouvements de caution d'un agent
// ---------------------------------------------------------------------------
router.get(
  '/agent/ledger/:userId',
  authenticate,
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const logs = await GuaranteeLog.find({ agent_id: req.params.userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      res.json({ logs, count: logs.length });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/payment/agent/list
// Liste tous les agents avec leur statut quota
// ---------------------------------------------------------------------------
router.get(
  '/agent/list',
  authenticate,
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const agents = await User.find({
        role: 'authorized_agent',
        ...(req.tenantId ? { tenant_id: req.tenantId } : {}),
      })
        .select('firstName lastName email organizationName isAgentVerified isBlocked commissionRate guaranteeBalance usedQuota maxPaymentLimit currentPaymentCount isActive')
        .sort({ createdAt: -1 })
        .lean();

      const result = agents.map((a) => ({
        ...a,
        available: a.guaranteeBalance - (a.usedQuota || 0),
        quotaPercent: a.guaranteeBalance > 0
          ? Math.round(((a.guaranteeBalance - (a.usedQuota || 0)) / a.guaranteeBalance) * 100)
          : 100,
      }));

      res.json({ agents: result, count: result.length });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
