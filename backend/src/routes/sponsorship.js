const express = require('express');
const { body, param, validationResult } = require('express-validator');
const SponsorshipPack = require('../models/SponsorshipPack');
const Tournament = require('../models/Tournament');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

// ===========================================================================
// ROUTE PUBLIQUE — Valider un code de parrainage
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /api/sponsorship/validate-code
// Vérifie si un code est valide et retourne les infos du pack
// ---------------------------------------------------------------------------
router.post('/validate-code', async (req, res, next) => {
  try {
    const { code, tournament_id } = req.body;
    if (!code) return res.status(400).json({ error: 'Code requis' });

    const filter = { code: code.toUpperCase(), isActive: true };
    if (tournament_id) filter.tournament_id = tournament_id;

    const pack = await SponsorshipPack.findOne(filter).lean();

    if (!pack) {
      return res.status(404).json({ valid: false, error: 'Code de parrainage invalide' });
    }

    if (pack.usedCount >= pack.maxUses) {
      return res.status(400).json({ valid: false, error: 'Ce code a atteint sa limite d\'utilisation' });
    }

    if (pack.expiresAt && new Date() > new Date(pack.expiresAt)) {
      return res.status(400).json({ valid: false, error: 'Ce code a expiré' });
    }

    res.json({
      valid: true,
      pack: {
        sponsorName: pack.sponsorName,
        sponsorType: pack.sponsorType,
        remaining: pack.maxUses - pack.usedCount,
        district: pack.district,
        establishment: pack.establishment,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/sponsorship/redeem
// Utiliser un code lors de l'inscription (décrémente le compteur)
// ---------------------------------------------------------------------------
router.post('/redeem', async (req, res, next) => {
  try {
    const { code, participant_id } = req.body;
    if (!code || !participant_id) {
      return res.status(400).json({ error: 'code et participant_id requis' });
    }

    const pack = await SponsorshipPack.findOne({ code: code.toUpperCase(), isActive: true });

    if (!pack) {
      return res.status(404).json({ error: 'Code invalide' });
    }
    if (pack.usedCount >= pack.maxUses) {
      return res.status(400).json({ error: 'Code épuisé' });
    }

    // Activer le participant
    const Participant = require('../models/Participant');
    const participant = await Participant.findById(participant_id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant non trouvé' });
    }

    participant.paid = true;
    participant.sponsorCode = code.toUpperCase();
    participant.sponsorName = pack.sponsorName;
    await participant.save();

    // Incrémenter le compteur
    pack.usedCount += 1;
    await pack.save();

    res.json({
      message: `Inscription parrainée par ${pack.sponsorName}`,
      sponsorName: pack.sponsorName,
      remaining: pack.maxUses - pack.usedCount,
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
// POST /api/sponsorship/:tournamentId
// Créer un pack de parrainage
// ---------------------------------------------------------------------------
router.post(
  '/:tournamentId',
  authorize('admin_ddene', 'teacher'),
  [
    param('tournamentId').isMongoId(),
    body('sponsorName').notEmpty().withMessage('Nom du parrain requis'),
    body('maxUses').isInt({ min: 1 }).withMessage('Nombre de places requis (min 1)'),
    body('amountPaid').isFloat({ min: 0 }).withMessage('Montant requis'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const tournament = await Tournament.findOne({
        _id: req.params.tournamentId,
        ...req.tenantFilter(),
      });
      if (!tournament) return res.status(404).json({ error: 'Tournoi non trouvé' });

      const pricePerCandidate = req.body.maxUses > 0
        ? Math.round(req.body.amountPaid / req.body.maxUses)
        : 0;

      const pack = await SponsorshipPack.create({
        tournament_id: tournament._id,
        sponsor_id: req.body.sponsor_id || null,
        tenant_id: tournament.tenant_id,
        sponsorName: req.body.sponsorName,
        sponsorType: req.body.sponsorType || 'entreprise',
        maxUses: req.body.maxUses,
        amountPaid: req.body.amountPaid,
        currency: req.body.currency || tournament.currency,
        pricePerCandidate,
        district: req.body.district || '',
        establishment: req.body.establishment || '',
        expiresAt: req.body.expiresAt || null,
      });

      res.status(201).json({
        message: 'Pack de parrainage créé',
        pack,
        code: pack.code,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/sponsorship/:tournamentId
// Lister les packs d'un tournoi
// ---------------------------------------------------------------------------
router.get('/:tournamentId', async (req, res, next) => {
  try {
    const packs = await SponsorshipPack.find({
      tournament_id: req.params.tournamentId,
      ...req.tenantFilter(),
    }).sort({ createdAt: -1 }).lean();

    const totalSponsored = packs.reduce((sum, p) => sum + p.usedCount, 0);
    const totalAmount = packs.reduce((sum, p) => sum + p.amountPaid, 0);

    res.json({
      packs,
      count: packs.length,
      totalSponsored,
      totalAmount,
      currency: packs[0]?.currency || 'HTG',
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sponsorship/edit/:packId
// Modifier un pack
// ---------------------------------------------------------------------------
router.put(
  '/edit/:packId',
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const allowedFields = ['sponsorName', 'sponsorType', 'maxUses', 'amountPaid', 'district', 'establishment', 'isActive', 'expiresAt'];
      const updates = {};
      for (const f of allowedFields) {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      }

      const pack = await SponsorshipPack.findOneAndUpdate(
        { _id: req.params.packId, ...req.tenantFilter() },
        { $set: updates },
        { new: true }
      );
      if (!pack) return res.status(404).json({ error: 'Pack non trouvé' });

      res.json({ message: 'Pack mis à jour', pack });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
