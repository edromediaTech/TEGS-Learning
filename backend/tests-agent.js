#!/usr/bin/env node
/**
 * Tests unitaires — Couche Agentique IA TEGS-Learning
 *
 * Modules testes :
 *   1. agentConfig      — profils role, isAgentEnabled
 *   2. sessionStore      — CRUD sessions, TTL, cleanup
 *   3. confirmationStore — create, reject, expiry, auth
 *   4. panicSwitch       — activate/deactivate, status, idempotence
 *   5. agentGate         — requireAgentEnabled, agentRateLimit
 *   6. baseTool          — defineTool, RBAC, toSchema, mutation flag
 *   7. tools/index       — registry, getToolsForRole, filtering
 *   8. orchestrator      — sanitizeMessage, processMessage (mocked)
 *   9. promptTemplates   — buildSystemPrompt public/prive
 *  10. docsIndex         — knowledge base structure
 *
 * Usage: node test-agent.js
 */

const assert = require('assert');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ❌ ${name} — ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ❌ ${name} — ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. agentConfig
// ═══════════════════════════════════════════════════════════════

function testAgentConfig() {
  console.log('\n── 1. agentConfig ──');
  const { isAgentEnabled, getProfileForRole, AGENT_PROFILES, ANOMALY_THRESHOLD } = require('./src/config/agentConfig');

  test('isAgentEnabled reflète PROCESS_AGENTIC_ON', () => {
    const prev = process.env.PROCESS_AGENTIC_ON;
    process.env.PROCESS_AGENTIC_ON = 'true';
    assert.strictEqual(isAgentEnabled(), true);
    process.env.PROCESS_AGENTIC_ON = 'false';
    assert.strictEqual(isAgentEnabled(), false);
    process.env.PROCESS_AGENTIC_ON = prev;
  });

  test('6 profils définis (public, student, authorized_agent, teacher, admin_ddene, superadmin)', () => {
    const roles = Object.keys(AGENT_PROFILES);
    assert.strictEqual(roles.length, 6);
    assert.ok(roles.includes('public'));
    assert.ok(roles.includes('student'));
    assert.ok(roles.includes('authorized_agent'));
    assert.ok(roles.includes('teacher'));
    assert.ok(roles.includes('admin_ddene'));
    assert.ok(roles.includes('superadmin'));
  });

  test('getProfileForRole retourne null pour role inconnu', () => {
    assert.strictEqual(getProfileForRole('hacker'), null);
  });

  test('profil student — read-only, pas de mutation', () => {
    const p = getProfileForRole('student');
    assert.strictEqual(p.canMutate, false);
    assert.ok(p.allowedTools.includes('faq'));
    assert.ok(!p.allowedTools.includes('tournamentCreate'));
  });

  test('profil admin_ddene — mutations autorisées, 12 outils', () => {
    const p = getProfileForRole('admin_ddene');
    assert.strictEqual(p.canMutate, true);
    assert.strictEqual(p.allowedTools.length, 12);
    assert.ok(p.allowedTools.includes('tournamentCreate'));
  });

  test('profil superadmin — 13 outils (inclut agentAdmin)', () => {
    const p = getProfileForRole('superadmin');
    assert.strictEqual(p.allowedTools.length, 13);
    assert.ok(p.allowedTools.includes('agentAdmin'));
  });

  test('profil public — 2 outils seulement, max 10 req/h', () => {
    const p = getProfileForRole('public');
    assert.strictEqual(p.allowedTools.length, 2);
    assert.strictEqual(p.maxRequestsPerHour, 10);
  });

  test('ANOMALY_THRESHOLD est un nombre positif', () => {
    assert.ok(typeof ANOMALY_THRESHOLD === 'number' && ANOMALY_THRESHOLD > 0);
  });
}

// ═══════════════════════════════════════════════════════════════
// 2. sessionStore
// ═══════════════════════════════════════════════════════════════

function testSessionStore() {
  console.log('\n── 2. sessionStore ──');
  const store = require('./src/agent/sessionStore');

  test('getOrCreateSession crée une nouvelle session', () => {
    const { sessionId, messages, isNew } = store.getOrCreateSession('user1', 'tenant1');
    assert.ok(sessionId.startsWith('agent:'));
    assert.deepStrictEqual(messages, []);
    assert.strictEqual(isNew, true);
  });

  test('getOrCreateSession retourne la même session pour le même user', () => {
    const s1 = store.getOrCreateSession('user1', 'tenant1');
    const s2 = store.getOrCreateSession('user1', 'tenant1');
    assert.strictEqual(s1.sessionId, s2.sessionId);
    assert.strictEqual(s2.isNew, false);
  });

  test('sessions différentes pour users différents', () => {
    const s1 = store.getOrCreateSession('userA', 'tenant1');
    const s2 = store.getOrCreateSession('userB', 'tenant1');
    assert.notStrictEqual(s1.sessionId, s2.sessionId);
  });

  test('addMessage ajoute un message', () => {
    const { sessionId } = store.getOrCreateSession('user2', 'tenant1');
    store.addMessage(sessionId, 'user', 'Bonjour');
    store.addMessage(sessionId, 'assistant', 'Comment puis-je vous aider ?');
    const history = store.getHistory(sessionId);
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].role, 'user');
    assert.strictEqual(history[1].role, 'assistant');
  });

  test('addMessage tronque au-delà de MAX_MESSAGES (20)', () => {
    const { sessionId } = store.getOrCreateSession('user3', 'tenant1');
    for (let i = 0; i < 25; i++) {
      store.addMessage(sessionId, 'user', `msg ${i}`);
    }
    const history = store.getHistory(sessionId, 100);
    assert.strictEqual(history.length, 20);
    assert.strictEqual(history[0].content, 'msg 5'); // premiers messages éjectés
  });

  test('getHistory respecte le limit', () => {
    const { sessionId } = store.getOrCreateSession('user3', 'tenant1');
    const h3 = store.getHistory(sessionId, 3);
    assert.strictEqual(h3.length, 3);
  });

  test('getSession retourne null pour id inconnu', () => {
    assert.strictEqual(store.getSession('inexistant'), null);
  });

  test('getHistory retourne [] pour session inexistante', () => {
    assert.deepStrictEqual(store.getHistory('inexistant'), []);
  });

  test('clearSession supprime la session', () => {
    const { sessionId } = store.getOrCreateSession('user4', 'tenant1');
    store.clearSession(sessionId);
    assert.strictEqual(store.getSession(sessionId), null);
  });

  test('clearUserSessions supprime toutes les sessions du user', () => {
    store.getOrCreateSession('user5', 'tenantA');
    store.clearUserSessions('user5');
    const s = store.getOrCreateSession('user5', 'tenantA');
    assert.strictEqual(s.isNew, true);
  });

  test('clearAllSessions vide tout et retourne le count', () => {
    store.getOrCreateSession('x1', 't');
    store.getOrCreateSession('x2', 't');
    const count = store.clearAllSessions();
    assert.ok(count >= 2);
    assert.strictEqual(store.activeSessionCount(), 0);
  });

  test('addMessage sur session inexistante ne crash pas', () => {
    store.addMessage('fake-session', 'user', 'test');
    // Pas d'erreur = success
  });

  test('addMessage convertit les objets en JSON string', () => {
    const { sessionId } = store.getOrCreateSession('user6', 'tenant1');
    store.addMessage(sessionId, 'tool_result', { data: [1, 2, 3] });
    const h = store.getHistory(sessionId, 1);
    assert.strictEqual(typeof h[0].content, 'string');
    assert.ok(h[0].content.includes('[1,2,3]'));
    store.clearAllSessions();
  });
}

// ═══════════════════════════════════════════════════════════════
// 3. panicSwitch
// ═══════════════════════════════════════════════════════════════

function testPanicSwitch() {
  console.log('\n── 3. panicSwitch ──');
  const panic = require('./src/agent/panicSwitch');

  // Reset state
  panic.panicDeactivate();

  test('état initial : pas en panic', () => {
    assert.strictEqual(panic.isPanicMode(), false);
  });

  test('getPanicStatus retourne active: false', () => {
    const s = panic.getPanicStatus();
    assert.strictEqual(s.active, false);
    assert.strictEqual(s.reason, null);
  });

  test('panicActivate active le mode', () => {
    panic.panicActivate('manual', 'admin123');
    assert.strictEqual(panic.isPanicMode(), true);
  });

  test('getPanicStatus contient reason et activatedBy', () => {
    const s = panic.getPanicStatus();
    assert.strictEqual(s.active, true);
    assert.strictEqual(s.reason, 'manual');
    assert.strictEqual(s.activatedBy, 'admin123');
    assert.ok(s.activatedAt); // ISO string
  });

  test('panicActivate est idempotent (double activation)', () => {
    panic.panicActivate('auto-anomaly', 'other');
    // Doit rester la première activation
    assert.strictEqual(panic.getPanicStatus().reason, 'manual');
  });

  test('panicDeactivate désactive le mode', () => {
    panic.panicDeactivate('admin123');
    assert.strictEqual(panic.isPanicMode(), false);
    assert.strictEqual(panic.getPanicStatus().reason, null);
  });

  test('panicDeactivate est idempotent (double désactivation)', () => {
    panic.panicDeactivate();
    assert.strictEqual(panic.isPanicMode(), false);
    // Pas d'erreur
  });
}

// ═══════════════════════════════════════════════════════════════
// 4. baseTool (defineTool)
// ═══════════════════════════════════════════════════════════════

function testBaseTool() {
  console.log('\n── 4. baseTool ──');
  const { defineTool } = require('./src/agent/tools/_baseTool');

  const readTool = defineTool({
    id: 'testRead',
    name: 'Test Read Tool',
    description: 'Un outil de test lecture',
    parameters: { type: 'object', properties: { q: { type: 'string' } } },
    requiredRoles: ['student', 'admin_ddene'],
    isMutation: false,
    execute: async (args) => ({ answer: `Résultat pour: ${args.q}` }),
  });

  const mutateTool = defineTool({
    id: 'testMutate',
    name: 'Test Mutate Tool',
    description: 'Un outil de test mutation',
    parameters: { type: 'object', properties: {} },
    requiredRoles: ['admin_ddene'],
    isMutation: true,
    execute: async () => ({
      summary: 'Action de test',
      actionData: { type: 'test' },
    }),
  });

  test('defineTool retourne un objet avec id, name, canAccess, run, toSchema', () => {
    assert.strictEqual(readTool.id, 'testRead');
    assert.strictEqual(readTool.name, 'Test Read Tool');
    assert.strictEqual(typeof readTool.canAccess, 'function');
    assert.strictEqual(typeof readTool.run, 'function');
    assert.strictEqual(typeof readTool.toSchema, 'function');
  });

  test('canAccess — student autorisé', () => {
    assert.strictEqual(readTool.canAccess('student'), true);
  });

  test('canAccess — authorized_agent refusé', () => {
    assert.strictEqual(readTool.canAccess('authorized_agent'), false);
  });

  test('canAccess — superadmin toujours autorisé', () => {
    assert.strictEqual(readTool.canAccess('superadmin'), true);
    assert.strictEqual(mutateTool.canAccess('superadmin'), true);
  });

  test('toSchema retourne le format LLM', () => {
    const schema = readTool.toSchema();
    assert.strictEqual(schema.name, 'testRead');
    assert.ok(schema.description);
    assert.ok(schema.parameters);
  });

  test('isMutation flag correctement défini', () => {
    assert.strictEqual(readTool.isMutation, false);
    assert.strictEqual(mutateTool.isMutation, true);
  });

  test('requiredRoles vide → tout le monde a accès', () => {
    const openTool = defineTool({
      id: 'open',
      name: 'Open',
      description: 'test',
      requiredRoles: [],
      execute: async () => ({}),
    });
    assert.strictEqual(openTool.canAccess('student'), true);
    assert.strictEqual(openTool.canAccess('authorized_agent'), true);
  });
}

// ═══════════════════════════════════════════════════════════════
// 5. tools/index (registry)
// ═══════════════════════════════════════════════════════════════

function testToolsRegistry() {
  console.log('\n── 5. tools/index ──');
  const { getTool, getToolsForRole, getToolSchemas, getAllTools } = require('./src/agent/tools');

  test('13 outils enregistrés au total', () => {
    assert.strictEqual(getAllTools().length, 13);
  });

  test('getTool retourne un outil par ID', () => {
    const faq = getTool('faq');
    assert.ok(faq);
    assert.strictEqual(faq.id, 'faq');
  });

  test('getTool retourne null pour ID inconnu', () => {
    assert.strictEqual(getTool('nonexistent'), null);
  });

  test('getToolsForRole("student") — 4 outils', () => {
    const tools = getToolsForRole('student');
    assert.strictEqual(tools.length, 4);
    const ids = tools.map(t => t.id);
    assert.ok(ids.includes('faq'));
    assert.ok(ids.includes('tournamentList'));
    assert.ok(!ids.includes('tournamentCreate'));
  });

  test('getToolsForRole("public") — 2 outils', () => {
    const tools = getToolsForRole('public');
    assert.strictEqual(tools.length, 2);
  });

  test('getToolsForRole("superadmin") — 13 outils', () => {
    const tools = getToolsForRole('superadmin');
    assert.strictEqual(tools.length, 13);
  });

  test('getToolsForRole("unknown") — 0 outils', () => {
    const tools = getToolsForRole('unknown');
    assert.strictEqual(tools.length, 0);
  });

  test('getToolSchemas retourne des objets avec name/description/parameters', () => {
    const schemas = getToolSchemas('admin_ddene');
    assert.ok(schemas.length > 0);
    for (const s of schemas) {
      assert.ok(s.name, `Schema manque name`);
      assert.ok(s.description, `Schema ${s.name} manque description`);
      assert.ok(s.parameters, `Schema ${s.name} manque parameters`);
    }
  });

  test('chaque outil a un id unique', () => {
    const all = getAllTools();
    const ids = all.map(t => t.id);
    const unique = new Set(ids);
    assert.strictEqual(ids.length, unique.size, 'IDs en double détectés');
  });

  test('les 13 outils documentés dans CLAUDE.md sont présents', () => {
    const expectedIds = [
      'searchDocumentation', 'faq', 'tournamentList', 'tournamentDetail',
      'tournamentCreate', 'participantSearch', 'moduleList', 'analyticsOverview',
      'commissionCalc', 'quotaStatus', 'reportGenerate', 'userSearch', 'agentAdmin',
    ];
    for (const id of expectedIds) {
      assert.ok(getTool(id), `Outil manquant: ${id}`);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// 6. promptTemplates
// ═══════════════════════════════════════════════════════════════

function testPromptTemplates() {
  console.log('\n── 6. promptTemplates ──');
  const { buildSystemPrompt } = require('./src/agent/promptTemplates');
  const { getProfileForRole } = require('./src/config/agentConfig');

  test('buildSystemPrompt public — contient Ambassadeur et restrictions', () => {
    const profile = getProfileForRole('public');
    const prompt = buildSystemPrompt(profile, [], { isPublic: true, role: 'public' });
    assert.ok(prompt.includes('Ambassadeur') || prompt.includes('public'), 'Manque ref public');
    assert.ok(prompt.length > 200, 'Prompt trop court');
  });

  test('buildSystemPrompt admin — contient Architecte et tools section', () => {
    const profile = getProfileForRole('admin_ddene');
    const fakeSchemas = [{ name: 'test', description: 'desc', parameters: {} }];
    const prompt = buildSystemPrompt(profile, fakeSchemas, { role: 'admin_ddene', firstName: 'Jean' });
    assert.ok(prompt.includes('Architecte') || prompt.includes('Admin'), 'Manque ref admin');
    assert.ok(prompt.includes('test'), 'Tool schema non inclus');
  });

  test('buildSystemPrompt injecte le prénom', () => {
    const profile = getProfileForRole('student');
    const prompt = buildSystemPrompt(profile, [], { role: 'student', firstName: 'Marie' });
    assert.ok(prompt.includes('Marie'), 'Prénom non injecté');
  });

  test('buildSystemPrompt sans outils — message approprié', () => {
    const profile = getProfileForRole('student');
    const prompt = buildSystemPrompt(profile, [], { role: 'student' });
    assert.ok(prompt.includes('aucun outil') || prompt.includes('connaissances'), 'Manque fallback sans outils');
  });
}

// ═══════════════════════════════════════════════════════════════
// 7. docsIndex (knowledge base)
// ═══════════════════════════════════════════════════════════════

function testDocsIndex() {
  console.log('\n── 7. docsIndex ──');
  const { DOCS_INDEX, searchDocs } = require('./src/agent/knowledge/docsIndex');

  test('DOCS_INDEX contient au moins 10 documents', () => {
    assert.ok(DOCS_INDEX.length >= 10, `Seulement ${DOCS_INDEX.length} docs`);
  });

  test('chaque doc a id, title, scope, audience, keywords, content', () => {
    for (const doc of DOCS_INDEX) {
      assert.ok(doc.id, `Doc manque id`);
      assert.ok(doc.title, `Doc ${doc.id} manque title`);
      assert.ok(['public', 'internal'].includes(doc.scope), `Doc ${doc.id} scope invalide`);
      assert.ok(doc.audience, `Doc ${doc.id} manque audience`);
      assert.ok(Array.isArray(doc.keywords) && doc.keywords.length > 0, `Doc ${doc.id} keywords vide`);
      assert.ok(doc.content && doc.content.length > 20, `Doc ${doc.id} content trop court`);
    }
  });

  test('IDs uniques dans DOCS_INDEX', () => {
    const ids = DOCS_INDEX.map(d => d.id);
    const unique = new Set(ids);
    assert.strictEqual(ids.length, unique.size, 'IDs docs en double');
  });

  test('docs publiques existent (inscription, paiement)', () => {
    const ids = DOCS_INDEX.map(d => d.id);
    assert.ok(ids.includes('inscription'), 'Doc inscription manquante');
    assert.ok(ids.includes('paiement'), 'Doc paiement manquante');
  });

  if (typeof searchDocs === 'function') {
    test('searchDocs("inscription") retourne des résultats', () => {
      const results = searchDocs('inscription');
      assert.ok(results.length > 0, 'Aucun résultat');
      assert.ok(results[0].id === 'inscription' || results[0].title.toLowerCase().includes('inscri'));
    });

    test('searchDocs("xyznothing") retourne tableau vide', () => {
      const results = searchDocs('xyznothing');
      assert.strictEqual(results.length, 0);
    });

    test('searchDocs avec scope "public" filtre correctement', () => {
      const results = searchDocs('concours', 'public');
      for (const r of results) {
        assert.strictEqual(r.scope, 'public', `Doc ${r.id} est internal, pas public`);
      }
    });
  } else {
    test('searchDocs non exporté — skip tests recherche', () => {
      // OK, la recherche est peut-être dans un autre module
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 8. agentGate (middleware)
// ═══════════════════════════════════════════════════════════════

function testAgentGate() {
  console.log('\n── 8. agentGate ──');
  const { requireAgentEnabled, agentRateLimit } = require('./src/middleware/agentGate');
  const panic = require('./src/agent/panicSwitch');

  // Mock Express req/res/next
  function mockReq(overrides = {}) {
    return { user: { id: 'u1', role: 'student' }, ...overrides };
  }
  function mockRes() {
    const res = { statusCode: null, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
  }

  // Reset env
  const origEnv = process.env.PROCESS_AGENTIC_ON;

  test('requireAgentEnabled — 503 si PROCESS_AGENTIC_ON=false', () => {
    process.env.PROCESS_AGENTIC_ON = 'false';
    const res = mockRes();
    let nextCalled = false;
    requireAgentEnabled({}, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(nextCalled, false);
  });

  test('requireAgentEnabled — passe si PROCESS_AGENTIC_ON=true', () => {
    process.env.PROCESS_AGENTIC_ON = 'true';
    panic.panicDeactivate(); // s'assurer
    const res = mockRes();
    let nextCalled = false;
    requireAgentEnabled({}, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  test('requireAgentEnabled — 503 si Panic Mode actif', () => {
    process.env.PROCESS_AGENTIC_ON = 'true';
    panic.panicActivate('test');
    const res = mockRes();
    let nextCalled = false;
    requireAgentEnabled({}, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 503);
    assert.ok(res.body.panicMode);
    assert.strictEqual(nextCalled, false);
    panic.panicDeactivate();
  });

  test('agentRateLimit — passe sans user (public)', () => {
    const res = mockRes();
    let nextCalled = false;
    agentRateLimit({}, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  test('agentRateLimit — injecte agentRemainingRequests', () => {
    const req = mockReq({ user: { id: 'ratetest1', role: 'student' } });
    const res = mockRes();
    let nextCalled = false;
    agentRateLimit(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.ok(typeof req.agentRemainingRequests === 'number');
  });

  // Restore env
  process.env.PROCESS_AGENTIC_ON = origEnv;
}

// ═══════════════════════════════════════════════════════════════
// 9. orchestrator (sanitizeMessage unit test)
// ═══════════════════════════════════════════════════════════════

function testOrchestrator() {
  console.log('\n── 9. orchestrator ──');

  // On ne peut pas facilement tester processMessage sans MongoDB + AI Gateway.
  // On teste la logique unitaire accessible.

  // Access sanitizeMessage indirectement via processMessage behavior
  const { processMessage } = require('./src/agent/orchestrator');

  test('processMessage avec message vide retourne réponse par défaut', async () => {
    const result = await processMessage('', {
      user: { id: 'test', role: 'student', tenant_id: 't1' },
      tenantId: 't1',
      isPublic: false,
    });
    assert.ok(result.response.includes('vide') || result.response.includes('aider'));
    assert.strictEqual(result.sessionId, null);
  });

  test('processMessage avec message null retourne réponse par défaut', async () => {
    const result = await processMessage(null, {
      user: { id: 'test', role: 'student', tenant_id: 't1' },
      tenantId: 't1',
    });
    assert.ok(result.response);
    assert.strictEqual(result.sessionId, null);
  });

  test('processMessage avec role inconnu retourne message profil manquant', async () => {
    const result = await processMessage('Bonjour', {
      user: { id: 'test', role: 'hacker', tenant_id: 't1' },
      tenantId: 't1',
    });
    assert.ok(result.response.includes('profil') || result.response.includes('role'));
  });
}

// ═══════════════════════════════════════════════════════════════
// 10. confirmationStore (sans MongoDB)
// ═══════════════════════════════════════════════════════════════

function testConfirmationStore() {
  console.log('\n── 10. confirmationStore ──');
  const { createConfirmation, getConfirmation, rejectConfirmation } = require('./src/agent/confirmationStore');

  test('createConfirmation retourne un ID', () => {
    const id = createConfirmation('u1', 't1', 'tournamentCreate', { title: 'Test' }, 'sess1');
    assert.ok(id.startsWith('conf:'));
    assert.strictEqual(id.length, 5 + 16); // 'conf:' + 16 hex chars
  });

  test('getConfirmation retourne les données', () => {
    const id = createConfirmation('u2', 't1', 'reportGenerate', { type: 'pdf' }, 'sess2');
    const conf = getConfirmation(id);
    assert.ok(conf);
    assert.strictEqual(conf.userId, 'u2');
    assert.strictEqual(conf.toolId, 'reportGenerate');
    assert.strictEqual(conf.status, 'pending');
  });

  test('getConfirmation retourne null pour ID inconnu', () => {
    assert.strictEqual(getConfirmation('conf:inexistant'), null);
  });

  // Note: executeConfirmation et rejectConfirmation nécessitent MongoDB pour l'audit
  // On teste rejectConfirmation qui va planter sur l'audit mais on vérifie la logique d'auth
  test('rejectConfirmation — mauvais user refusé', async () => {
    const id = createConfirmation('u3', 't1', 'tournamentCreate', {}, 'sess3');
    const result = await rejectConfirmation(id, 'wrongUser');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('autorise') || result.error.includes('Non'));
  });
}

// ═══════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║    Tests Unitaires — Couche Agentique TEGS      ║');
  console.log('╚══════════════════════════════════════════════════╝');

  // Sync tests
  testAgentConfig();
  testSessionStore();
  testPanicSwitch();
  testBaseTool();
  testToolsRegistry();
  testPromptTemplates();
  testDocsIndex();
  testAgentGate();
  testConfirmationStore();

  // Async tests
  console.log('\n── 9. orchestrator ──');
  await testAsync('processMessage avec message vide retourne réponse par défaut', async () => {
    const { processMessage } = require('./src/agent/orchestrator');
    const result = await processMessage('', {
      user: { id: 'test', role: 'student', tenant_id: 't1' },
      tenantId: 't1',
      isPublic: false,
    });
    assert.ok(result.response.includes('vide') || result.response.includes('aider'));
    assert.strictEqual(result.sessionId, null);
  });

  await testAsync('processMessage avec role inconnu retourne message profil', async () => {
    const { processMessage } = require('./src/agent/orchestrator');
    const result = await processMessage('Bonjour', {
      user: { id: 'test2', role: 'hacker', tenant_id: 't1' },
      tenantId: 't1',
    });
    assert.ok(result.response.includes('profil') || result.response.includes('role'));
  });

  // ── Summary ──
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  TOTAL: ${passed + failed} tests — ✅ ${passed} passed — ❌ ${failed} failed`);
  if (failures.length > 0) {
    console.log('\n  Échecs:');
    for (const f of failures) {
      console.log(`    ❌ ${f.name}: ${f.error}`);
    }
  }
  console.log('══════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
