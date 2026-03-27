const express = require('express');
const mongoose = require('mongoose');
const Statement = require('../models/Statement');
const Module = require('../models/Module');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const QuizResult = require('../models/QuizResult');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

router.use(authenticate);
router.use(tenantIsolation);

// Helper : construire le filtre de dates
function dateFilter(since, until) {
  const f = {};
  if (since) f.$gte = new Date(since);
  if (until) f.$lte = new Date(until);
  return Object.keys(f).length ? f : null;
}

// -----------------------------------------------------------------------
// GET /api/analytics/overview
// Vue d'ensemble : KPIs principaux pour le tenant
// -----------------------------------------------------------------------
router.get('/overview', async (req, res, next) => {
  try {
    const filter = { ...req.tenantFilter(), voided: false };
    const { since, until, source } = req.query;

    const df = dateFilter(since, until);
    if (df) filter.timestamp = df;
    if (source) filter['context.extensions.syncSource'] = source;

    const [
      totalStatements,
      totalUsers,
      totalModules,
      verbBreakdown,
      avgScore,
    ] = await Promise.all([
      Statement.countDocuments(filter),
      User.countDocuments({ tenant_id: req.tenantId, isActive: true }),
      Module.countDocuments(req.tenantFilter()),
      Statement.aggregate([
        { $match: filter },
        { $group: { _id: '$verb.id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Statement.aggregate([
        { $match: { ...filter, 'result.score.scaled': { $exists: true } } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$result.score.scaled' },
            minScore: { $min: '$result.score.scaled' },
            maxScore: { $max: '$result.score.scaled' },
            totalScored: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Taux de reussite et d'echec
    const passCount = verbBreakdown.find(v => v._id.includes('/passed'))?.count || 0;
    const failCount = verbBreakdown.find(v => v._id.includes('/failed'))?.count || 0;
    const totalAttempts = passCount + failCount;
    const successRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

    res.json({
      totalStatements,
      totalUsers,
      totalModules,
      successRate,
      passCount,
      failCount,
      avgScore: avgScore[0]?.avgScore ? Math.round(avgScore[0].avgScore * 100) / 100 : 0,
      totalScored: avgScore[0]?.totalScored || 0,
      verbBreakdown: verbBreakdown.map(v => ({
        verb: v._id.split('/').pop(),
        verbId: v._id,
        count: v.count,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/analytics/top-modules
// Top 5 modules les plus reussis (par taux de reussite)
// -----------------------------------------------------------------------
router.get('/top-modules', async (req, res, next) => {
  try {
    const filter = { ...req.tenantFilter(), voided: false };
    const { since, until } = req.query;
    const df = dateFilter(since, until);
    if (df) filter.timestamp = df;

    const pipeline = [
      {
        $match: {
          ...filter,
          'verb.id': { $in: [
            'http://adlnet.gov/expapi/verbs/passed',
            'http://adlnet.gov/expapi/verbs/failed',
            'http://adlnet.gov/expapi/verbs/completed',
          ] },
        },
      },
      {
        $group: {
          _id: '$object.id',
          activityName: { $first: '$object.definition.name' },
          totalAttempts: { $sum: 1 },
          passed: {
            $sum: { $cond: [{ $regexMatch: { input: '$verb.id', regex: /passed/ } }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $regexMatch: { input: '$verb.id', regex: /failed/ } }, 1, 0] },
          },
          avgScore: { $avg: '$result.score.scaled' },
        },
      },
      {
        $addFields: {
          successRate: {
            $cond: [
              { $gt: [{ $add: ['$passed', '$failed'] }, 0] },
              { $multiply: [{ $divide: ['$passed', { $add: ['$passed', '$failed'] }] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { successRate: -1, totalAttempts: -1 } },
      { $limit: 10 },
    ];

    const topModules = await Statement.aggregate(pipeline);

    res.json({
      modules: topModules.map(m => ({
        activityId: m._id,
        name: m.activityName || m._id.split('/').pop(),
        totalAttempts: m.totalAttempts,
        passed: m.passed,
        failed: m.failed,
        successRate: Math.round(m.successRate),
        avgScore: m.avgScore ? Math.round(m.avgScore * 100) / 100 : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/analytics/weekly-progress
// Progression hebdomadaire des eleves (7 derniers jours ou plage custom)
// -----------------------------------------------------------------------
router.get('/weekly-progress', async (req, res, next) => {
  try {
    const { since, until, days } = req.query;
    const numDays = parseInt(days) || 7;

    const endDate = until ? new Date(until) : new Date();
    const startDate = since ? new Date(since) : new Date(endDate.getTime() - numDays * 86400000);

    const pipeline = [
      {
        $match: {
          ...req.tenantFilter(),
          voided: false,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            verb: '$verb.id',
          },
          count: { $sum: 1 },
          avgScore: { $avg: '$result.score.scaled' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ];

    const raw = await Statement.aggregate(pipeline);

    // Restructurer par jour
    const dailyMap = {};
    for (const r of raw) {
      const day = r._id.date;
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, total: 0, passed: 0, failed: 0, completed: 0, avgScore: null, scores: [] };
      }
      dailyMap[day].total += r.count;
      const verb = r._id.verb;
      if (verb.includes('/passed')) dailyMap[day].passed += r.count;
      if (verb.includes('/failed')) dailyMap[day].failed += r.count;
      if (verb.includes('/completed')) dailyMap[day].completed += r.count;
      if (r.avgScore !== null) dailyMap[day].scores.push(r.avgScore);
    }

    const progress = Object.values(dailyMap).map(d => ({
      date: d.date,
      total: d.total,
      passed: d.passed,
      failed: d.failed,
      completed: d.completed,
      avgScore: d.scores.length > 0
        ? Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 100) / 100
        : null,
    }));

    res.json({ progress, startDate, endDate });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/analytics/compare-schools
// Comparaison des performances entre ecoles (admin_ddene uniquement)
// Nota : necessite un super-admin ou cross-tenant query - ici on retourne
// les stats du tenant courant. Pour la comparaison multi-ecoles, un endpoint
// special est prevu.
// -----------------------------------------------------------------------
router.get('/compare-schools', authorize('admin_ddene'), async (req, res, next) => {
  try {
    const { since, until } = req.query;

    // Agreger par tenant_id pour tous les tenants (admin cross-tenant)
    const matchFilter = { voided: false };
    const df = dateFilter(since, until);
    if (df) matchFilter.timestamp = df;

    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$tenant_id',
          totalStatements: { $sum: 1 },
          passed: {
            $sum: { $cond: [{ $regexMatch: { input: '$verb.id', regex: /passed/ } }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $regexMatch: { input: '$verb.id', regex: /failed/ } }, 1, 0] },
          },
          avgScore: { $avg: '$result.score.scaled' },
          uniqueUsers: { $addToSet: '$actor.user_id' },
        },
      },
      {
        $addFields: {
          successRate: {
            $cond: [
              { $gt: [{ $add: ['$passed', '$failed'] }, 0] },
              { $round: [{ $multiply: [{ $divide: ['$passed', { $add: ['$passed', '$failed'] }] }, 100] }, 0] },
              0,
            ],
          },
          activeUsers: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { successRate: -1 } },
    ];

    const schoolStats = await Statement.aggregate(pipeline);

    // Enrichir avec les noms des tenants
    const tenantIds = schoolStats.map(s => s._id);
    const tenants = await Tenant.find({ _id: { $in: tenantIds } }).lean();
    const tenantMap = {};
    for (const t of tenants) {
      tenantMap[t._id.toString()] = t;
    }

    res.json({
      schools: schoolStats.map(s => ({
        tenantId: s._id,
        schoolName: tenantMap[s._id.toString()]?.name || 'Inconnue',
        schoolCode: tenantMap[s._id.toString()]?.code || '',
        totalStatements: s.totalStatements,
        passed: s.passed,
        failed: s.failed,
        successRate: s.successRate,
        avgScore: s.avgScore ? Math.round(s.avgScore * 100) / 100 : 0,
        activeUsers: s.activeUsers,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/analytics/sources
// Repartition par source de synchronisation
// -----------------------------------------------------------------------
router.get('/sources', async (req, res, next) => {
  try {
    const filter = { ...req.tenantFilter(), voided: false };
    const { since, until } = req.query;
    const df = dateFilter(since, until);
    if (df) filter.timestamp = df;

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$context.extensions.syncSource', 'direct'] },
          count: { $sum: 1 },
          avgScore: { $avg: '$result.score.scaled' },
          lastActivity: { $max: '$timestamp' },
        },
      },
      { $sort: { count: -1 } },
    ];

    const sources = await Statement.aggregate(pipeline);

    res.json({
      sources: sources.map(s => ({
        source: s._id,
        count: s.count,
        avgScore: s.avgScore ? Math.round(s.avgScore * 100) / 100 : null,
        lastActivity: s.lastActivity,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/analytics/leaderboard
// Classement des eleves par score moyen
// -----------------------------------------------------------------------
router.get('/leaderboard', async (req, res, next) => {
  try {
    const filter = {
      ...req.tenantFilter(),
      voided: false,
      'result.score.scaled': { $exists: true },
    };
    const { since, until, limit: lim } = req.query;
    const df = dateFilter(since, until);
    if (df) filter.timestamp = df;
    const maxResults = Math.min(parseInt(lim) || 20, 100);

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$actor.user_id',
          name: { $first: '$actor.name' },
          avgScore: { $avg: '$result.score.scaled' },
          totalActivities: { $sum: 1 },
          passed: {
            $sum: { $cond: [{ $regexMatch: { input: '$verb.id', regex: /passed/ } }, 1, 0] },
          },
        },
      },
      { $sort: { avgScore: -1 } },
      { $limit: maxResults },
    ];

    const leaderboard = await Statement.aggregate(pipeline);

    res.json({
      leaderboard: leaderboard.map((l, i) => ({
        rank: i + 1,
        userId: l._id,
        name: l.name,
        avgScore: Math.round(l.avgScore * 100) / 100,
        totalActivities: l.totalActivities,
        passed: l.passed,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/analytics/export/csv
// Export CSV des statements filtres
// -----------------------------------------------------------------------
router.get('/export/csv', async (req, res, next) => {
  try {
    const filter = { ...req.tenantFilter(), voided: false };
    const { since, until, verb, activity, source } = req.query;
    const df = dateFilter(since, until);
    if (df) filter.timestamp = df;
    if (verb) filter['verb.id'] = verb;
    if (activity) filter['object.id'] = activity;
    if (source) filter['context.extensions.syncSource'] = source;

    const statements = await Statement.find(filter)
      .sort({ timestamp: -1 })
      .limit(5000)
      .lean();

    // Construire le CSV
    const headers = [
      'statementId', 'timestamp', 'actorName', 'actorEmail',
      'verb', 'activityId', 'scoreScaled', 'scoreRaw', 'scoreMax',
      'success', 'completion', 'duration', 'source',
    ];

    const rows = statements.map(s => [
      s.statementId,
      s.timestamp ? new Date(s.timestamp).toISOString() : '',
      `"${(s.actor?.name || '').replace(/"/g, '""')}"`,
      s.actor?.mbox?.replace('mailto:', '') || '',
      s.verb?.id?.split('/').pop() || '',
      s.object?.id || '',
      s.result?.score?.scaled ?? '',
      s.result?.score?.raw ?? '',
      s.result?.score?.max ?? '',
      s.result?.success ?? '',
      s.result?.completion ?? '',
      s.result?.duration || '',
      s.context?.extensions?.syncSource || 'direct',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tegs-analytics-${Date.now()}.csv"`);
    res.send('\uFEFF' + csv); // BOM pour Excel
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/analytics/export/json
// Export JSON structuré pour rapport
// -----------------------------------------------------------------------
router.get('/export/json', async (req, res, next) => {
  try {
    const filter = { ...req.tenantFilter(), voided: false };
    const { since, until } = req.query;
    const df = dateFilter(since, until);
    if (df) filter.timestamp = df;

    const [overview, topModules, sources] = await Promise.all([
      Statement.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgScore: { $avg: '$result.score.scaled' },
            passed: { $sum: { $cond: [{ $regexMatch: { input: '$verb.id', regex: /passed/ } }, 1, 0] } },
            failed: { $sum: { $cond: [{ $regexMatch: { input: '$verb.id', regex: /failed/ } }, 1, 0] } },
          },
        },
      ]),
      Statement.aggregate([
        { $match: { ...filter, 'verb.id': { $regex: /passed|failed|completed/ } } },
        { $group: { _id: '$object.id', attempts: { $sum: 1 }, avgScore: { $avg: '$result.score.scaled' } } },
        { $sort: { attempts: -1 } },
        { $limit: 10 },
      ]),
      Statement.aggregate([
        { $match: filter },
        { $group: { _id: { $ifNull: ['$context.extensions.syncSource', 'direct'] }, count: { $sum: 1 } } },
      ]),
    ]);

    const tenant = await Tenant.findById(req.tenantId).lean();
    const o = overview[0] || { total: 0, avgScore: 0, passed: 0, failed: 0 };
    const totalAttempts = o.passed + o.failed;

    res.json({
      report: {
        generatedAt: new Date().toISOString(),
        school: tenant?.name || 'Unknown',
        period: { since: since || 'all', until: until || new Date().toISOString() },
        summary: {
          totalStatements: o.total,
          avgScore: o.avgScore ? Math.round(o.avgScore * 100) / 100 : 0,
          successRate: totalAttempts > 0 ? Math.round((o.passed / totalAttempts) * 100) : 0,
          passed: o.passed,
          failed: o.failed,
        },
        topActivities: topModules.map(m => ({
          activityId: m._id,
          attempts: m.attempts,
          avgScore: m.avgScore ? Math.round(m.avgScore * 100) / 100 : null,
        })),
        sources: sources.map(s => ({ source: s._id, count: s.count })),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
