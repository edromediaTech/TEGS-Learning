const express = require('express');
const crypto = require('crypto');
const TegScreenCustomer = require('../models/TegScreenCustomer');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function generateUniqueCode(maxTries = 12) {
  for (let i = 0; i < maxTries; i++) {
    const buf = crypto.randomBytes(4);
    const n = buf.readUInt32BE(0) % 100000000;
    const code = n.toString().padStart(8, '0');
    const taken = await TegScreenCustomer.exists({ code });
    if (!taken) return code;
  }
  throw new Error('Impossible de generer un code unique apres plusieurs tentatives');
}

function publicView(c) {
  return {
    id: c._id,
    name: c.name,
    code: c.code,
    numPcs: c.numPcs,
    numPhonesPerPc: c.numPhonesPerPc,
    status: c.status,
    machines: (c.machines || []).map(m => ({
      machineId: m.machineId,
      label: m.label || '',
      activatedAt: m.activatedAt,
      lastSeenAt: m.lastSeenAt,
    })),
    contactEmail: c.contactEmail,
    notes: c.notes,
    tenant_id: c.tenant_id || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function findMachine(customer, machineId) {
  return (customer.machines || []).find(m => m.machineId === machineId);
}

// =======================================================================
// PUBLIC: activation depuis une instance TegScreen
// =======================================================================

// POST /api/tegscreen/activate  { code, machine_id, label? }
router.post('/activate', async (req, res, next) => {
  try {
    const { code, machine_id, label } = req.body || {};
    if (typeof code !== 'string' || !/^\d{8}$/.test(code)) {
      return res.status(400).json({ error: 'Code invalide (8 chiffres attendus)' });
    }
    if (typeof machine_id !== 'string' || machine_id.length < 4 || machine_id.length > 200) {
      return res.status(400).json({ error: 'machine_id manquant ou invalide' });
    }
    const customer = await TegScreenCustomer.findOne({ code });
    if (!customer) return res.status(404).json({ error: 'Code inconnu' });
    if (customer.status === 'revoked') {
      return res.status(403).json({ error: 'Licence revoquee' });
    }

    const existing = findMachine(customer, machine_id);
    if (existing) {
      // Re-activation on the same PC (e.g. reinstall) — refresh lastSeenAt.
      existing.lastSeenAt = new Date();
      if (label && !existing.label) existing.label = String(label).trim();
    } else {
      if (customer.machines.length >= customer.numPcs) {
        return res.status(409).json({
          error: `Limite de ${customer.numPcs} PC atteinte pour ce code. ` +
                 `Demandez a l'administrateur d'augmenter numPcs ou de retirer un poste.`,
        });
      }
      customer.machines.push({
        machineId: machine_id,
        label: label ? String(label).trim() : '',
      });
    }
    customer.status = 'active';
    await customer.save();

    res.json({
      ok: true,
      customer: {
        id: customer._id,
        name: customer.name,
        numPcs: customer.numPcs,
        numPhonesPerPc: customer.numPhonesPerPc,
        machinesUsed: customer.machines.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tegscreen/verify  { code, machine_id }
router.post('/verify', async (req, res, next) => {
  try {
    const { code, machine_id } = req.body || {};
    if (typeof code !== 'string' || !/^\d{8}$/.test(code)) {
      return res.status(400).json({ valid: false, error: 'Code invalide' });
    }
    const customer = await TegScreenCustomer.findOne({ code });
    if (!customer || customer.status !== 'active') {
      return res.status(404).json({ valid: false, error: 'Licence inactive' });
    }
    const existing = findMachine(customer, machine_id);
    if (!existing) {
      return res.status(409).json({ valid: false, error: 'Cette machine n\'est pas enregistree' });
    }
    existing.lastSeenAt = new Date();
    await customer.save();
    res.json({
      valid: true,
      customer: {
        id: customer._id,
        name: customer.name,
        numPcs: customer.numPcs,
        numPhonesPerPc: customer.numPhonesPerPc,
        machinesUsed: customer.machines.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// =======================================================================
// ADMIN — superadmin uniquement
// =======================================================================
router.use(authenticate);
router.use(authorize('superadmin'));

// POST /api/tegscreen/customers
// Body: { name, numPcs, numPhonesPerPc, contactEmail?, notes?, tenant_id? }
router.post('/customers', async (req, res, next) => {
  try {
    const { name, numPcs, numPhonesPerPc, contactEmail, notes, tenant_id } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name requis' });
    }
    const pcs = Number(numPcs);
    const phones = Number(numPhonesPerPc);
    if (!Number.isInteger(pcs) || pcs < 1 || pcs > 1000) {
      return res.status(400).json({ error: 'numPcs doit etre un entier entre 1 et 1000' });
    }
    if (!Number.isInteger(phones) || phones < 1 || phones > 1000) {
      return res.status(400).json({ error: 'numPhonesPerPc doit etre un entier entre 1 et 1000' });
    }
    const code = await generateUniqueCode();
    const doc = await TegScreenCustomer.create({
      name: name.trim(),
      numPcs: pcs,
      numPhonesPerPc: phones,
      code,
      contactEmail: contactEmail || '',
      notes: notes || '',
      tenant_id: tenant_id || null,
    });
    res.status(201).json(publicView(doc));
  } catch (err) {
    next(err);
  }
});

// GET /api/tegscreen/customers
router.get('/customers', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const docs = await TegScreenCustomer.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.json(docs.map(publicView));
  } catch (err) {
    next(err);
  }
});

// GET /api/tegscreen/customers/:id
router.get('/customers/:id', async (req, res, next) => {
  try {
    const doc = await TegScreenCustomer.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Customer introuvable' });
    res.json(publicView(doc));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tegscreen/customers/:id
//   - upgrade plan: increase numPcs / numPhonesPerPc
//   - update name, notes, contactEmail
router.patch('/customers/:id', async (req, res, next) => {
  try {
    const doc = await TegScreenCustomer.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Customer introuvable' });
    const { name, numPcs, numPhonesPerPc, contactEmail, notes } = req.body || {};
    if (name !== undefined) doc.name = String(name).trim();
    if (contactEmail !== undefined) doc.contactEmail = String(contactEmail).trim();
    if (notes !== undefined) doc.notes = String(notes).trim();
    if (numPcs !== undefined) {
      const v = Number(numPcs);
      if (!Number.isInteger(v) || v < 1 || v > 1000) {
        return res.status(400).json({ error: 'numPcs invalide' });
      }
      if (v < doc.machines.length) {
        return res.status(400).json({
          error: `Impossible de reduire numPcs a ${v} : ${doc.machines.length} machines deja activees. Retirez d'abord des machines.`,
        });
      }
      doc.numPcs = v;
    }
    if (numPhonesPerPc !== undefined) {
      const v = Number(numPhonesPerPc);
      if (!Number.isInteger(v) || v < 1 || v > 1000) {
        return res.status(400).json({ error: 'numPhonesPerPc invalide' });
      }
      doc.numPhonesPerPc = v;
    }
    await doc.save();
    res.json(publicView(doc));
  } catch (err) {
    next(err);
  }
});

// POST /api/tegscreen/customers/:id/revoke
router.post('/customers/:id/revoke', async (req, res, next) => {
  try {
    const doc = await TegScreenCustomer.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Customer introuvable' });
    doc.status = 'revoked';
    await doc.save();
    res.json(publicView(doc));
  } catch (err) {
    next(err);
  }
});

// POST /api/tegscreen/customers/:id/machines/remove
// Body: { machine_id }
// Libere un slot PC pour qu'un autre poste puisse activer le code.
router.post('/customers/:id/machines/remove', async (req, res, next) => {
  try {
    const { machine_id } = req.body || {};
    const doc = await TegScreenCustomer.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Customer introuvable' });
    const before = doc.machines.length;
    doc.machines = doc.machines.filter(m => m.machineId !== machine_id);
    if (doc.machines.length === before) {
      return res.status(404).json({ error: 'machine_id introuvable' });
    }
    if (doc.machines.length === 0) doc.status = 'pending';
    await doc.save();
    res.json(publicView(doc));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
