const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Sponsor = require('../models/Sponsor');
const Tournament = require('../models/Tournament');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

// ===========================================================================
// ROUTE PUBLIQUE — Sponsors d'un tournoi (pour Live Arena, tickets, etc.)
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/sponsors/public/:tournamentId
// Liste publique des sponsors actifs (trié par tier)
// ---------------------------------------------------------------------------
router.get('/public/:tournamentId', async (req, res, next) => {
  try {
    const tierOrder = { diamond: 0, gold: 1, silver: 2, bronze: 3 };

    const sponsors = await Sponsor.find({
      tournament_id: req.params.tournamentId,
      isActive: true,
    })
      .select('name logoUrl website slogan type tier showOnTicket showOnCertificate showOnArena showOnMobile')
      .lean();

    sponsors.sort((a, b) => (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99));

    // Incrémenter les impressions
    const ids = sponsors.map((s) => s._id);
    if (ids.length > 0) {
      await Sponsor.updateMany({ _id: { $in: ids } }, { $inc: { impressions: 1 } });
    }

    res.json({
      sponsors,
      count: sponsors.length,
      byTier: {
        diamond: sponsors.filter((s) => s.tier === 'diamond'),
        gold: sponsors.filter((s) => s.tier === 'gold'),
        silver: sponsors.filter((s) => s.tier === 'silver'),
        bronze: sponsors.filter((s) => s.tier === 'bronze'),
      },
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
// POST /api/sponsors/:tournamentId
// Ajouter un sponsor à un tournoi
// ---------------------------------------------------------------------------
router.post(
  '/:tournamentId',
  authorize('admin_ddene', 'teacher'),
  [
    param('tournamentId').isMongoId(),
    body('name').notEmpty().withMessage('Nom requis'),
    body('tier').optional().isIn(['diamond', 'gold', 'silver', 'bronze']),
    body('type').optional().isIn(['commercial', 'public', 'individual', 'school']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await Tournament.findOne({
        _id: req.params.tournamentId,
        ...req.tenantFilter(),
      });
      if (!tournament) {
        return res.status(404).json({ error: 'Tournoi non trouvé' });
      }

      const sponsor = await Sponsor.create({
        tournament_id: tournament._id,
        tenant_id: tournament.tenant_id,
        name: req.body.name,
        logoUrl: req.body.logoUrl || '',
        website: req.body.website || '',
        slogan: req.body.slogan || '',
        contactEmail: req.body.contactEmail || '',
        contactPhone: req.body.contactPhone || '',
        type: req.body.type || 'commercial',
        tier: req.body.tier || 'bronze',
        amountInvested: req.body.amountInvested || 0,
        currency: req.body.currency || 'HTG',
        inKindDescription: req.body.inKindDescription || '',
        showOnTicket: req.body.showOnTicket !== false,
        showOnCertificate: req.body.showOnCertificate !== false,
        showOnArena: req.body.showOnArena !== false,
        showOnMobile: req.body.showOnMobile || false,
      });

      res.status(201).json({ message: 'Sponsor ajouté', sponsor });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/sponsors/:tournamentId
// Lister les sponsors d'un tournoi (admin)
// ---------------------------------------------------------------------------
router.get('/:tournamentId', async (req, res, next) => {
  try {
    const sponsors = await Sponsor.find({
      tournament_id: req.params.tournamentId,
      ...req.tenantFilter(),
    }).sort({ tier: 1, amountInvested: -1 }).lean();

    const totalInvested = sponsors.reduce((sum, s) => sum + s.amountInvested, 0);

    res.json({
      sponsors,
      count: sponsors.length,
      totalInvested,
      currency: sponsors[0]?.currency || 'HTG',
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sponsors/edit/:sponsorId
// Modifier un sponsor
// ---------------------------------------------------------------------------
router.put(
  '/edit/:sponsorId',
  authorize('admin_ddene', 'teacher'),
  param('sponsorId').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const allowedFields = [
        'name', 'logoUrl', 'website', 'slogan', 'contactEmail', 'contactPhone',
        'type', 'tier', 'amountInvested', 'currency', 'inKindDescription',
        'showOnTicket', 'showOnCertificate', 'showOnArena', 'showOnMobile', 'isActive',
      ];

      const updates = {};
      for (const f of allowedFields) {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      }

      const sponsor = await Sponsor.findOneAndUpdate(
        { _id: req.params.sponsorId, ...req.tenantFilter() },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!sponsor) return res.status(404).json({ error: 'Sponsor non trouvé' });

      res.json({ message: 'Sponsor mis à jour', sponsor });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/sponsors/edit/:sponsorId
// Supprimer un sponsor
// ---------------------------------------------------------------------------
router.delete(
  '/edit/:sponsorId',
  authorize('admin_ddene', 'teacher'),
  param('sponsorId').isMongoId(),
  async (req, res, next) => {
    try {
      const sponsor = await Sponsor.findOneAndDelete({
        _id: req.params.sponsorId,
        ...req.tenantFilter(),
      });
      if (!sponsor) return res.status(404).json({ error: 'Sponsor non trouvé' });
      res.json({ message: 'Sponsor supprimé' });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/sponsors/analytics/:tournamentId
// ROI social des sponsors
// ---------------------------------------------------------------------------
router.get(
  '/analytics/:tournamentId',
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const Participant = require('../models/Participant');

      const sponsors = await Sponsor.find({
        tournament_id: req.params.tournamentId,
        ...req.tenantFilter(),
      }).lean();

      const participantCount = await Participant.countDocuments({
        tournament_id: req.params.tournamentId,
      });

      const analytics = sponsors.map((s) => ({
        _id: s._id,
        name: s.name,
        tier: s.tier,
        amountInvested: s.amountInvested,
        impressions: s.impressions,
        participantsExposed: participantCount,
        costPerImpression: s.impressions > 0 ? (s.amountInvested / s.impressions).toFixed(2) : 'N/A',
        visibility: {
          ticket: s.showOnTicket,
          certificate: s.showOnCertificate,
          arena: s.showOnArena,
          mobile: s.showOnMobile,
        },
      }));

      const totalInvested = sponsors.reduce((sum, s) => sum + s.amountInvested, 0);
      const totalImpressions = sponsors.reduce((sum, s) => sum + s.impressions, 0);

      res.json({
        sponsors: analytics,
        summary: {
          totalSponsors: sponsors.length,
          totalInvested,
          totalImpressions,
          participantsExposed: participantCount,
          currency: sponsors[0]?.currency || 'HTG',
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
