# TEGS-Learning — Instructions Agent

> Derniere mise a jour : 2026-04-17

## 1. Presentation

**TEGS-Learning** est une plateforme educative complete pour Haiti (DDENE) :
concours academiques en ligne, studio de contenu, suivi pedagogique, assistant intelligent, analytics.

| Element | Valeur |
|---------|--------|
| **Backend** | Node.js, Express, MongoDB (Mongoose), Socket.io |
| **Frontend** | Nuxt 3.21 (SSR: false), Pinia, Tailwind CSS |
| **Hebergement** | Backend → Cloud Run (`tegs-backend`), Frontend → Firebase Hosting |
| **GCP Project** | `luminous-mesh-459718-p4` (region: `us-central1`) |
| **GitHub** | `edromediaTech/TEGS-Learning` (branche: `master`) |
| **Ports locaux** | Backend: `3000`, Frontend: `3002` |
| **MongoDB** | Windows local (dev), Atlas via Secret Manager (prod) |
| **Prod Backend** | `https://tegs-backend-746425674533.us-central1.run.app` |
| **Prod Frontend** | `https://tegs-learning.web.app` |
| **Cloud Run** | min-instances=0 (pre-prod), remettre a 1 en production |

---

## 2. Backend (`backend/`)

### Entree
`src/server.js` — Express, CORS, compression, Socket.io, 23 routes

### Routes (23 — `src/routes/`)
| Route | Path | Description |
|-------|------|-------------|
| auth | `/api/auth` | Register, login, /me |
| tenants | `/api/tenants` | CRUD organisations (multi-tenant) |
| users | `/api/users` | CRUD utilisateurs, roles |
| modules | `/api/modules` | CRUD modules, sections, screens, blocs |
| tournaments | `/api/tournaments` | CRUD tournois, inscription, quiz play |
| payment | `/api/payment` | MonCash/Natcash, webhooks |
| sponsors | `/api/sponsors` | CRUD sponsors, ROI |
| sponsorship | `/api/sponsorship` | Packs bourses (BOURSE-XXX) |
| reporting | `/api/reporting` | Export PDF/Excel, remediation IA |
| share | `/api/modules/public` | Quiz player public |
| live-arena | `/api/live-arena` | Spectateur TV/projecteur |
| cmi5 | `/api/cmi5` | Launch sessions, player |
| xapi | `/api/xapi` | Statements (LRS) |
| analytics | `/api/analytics` | KPIs, exports CSV/Excel |
| upload | `/api/upload` | GCS Cloud Storage |
| sync | `/api/sync` | Batch sync mobile |
| notifications | `/api/notifications` | FCM push |
| subscription | `/api/subscription` | Plans, feature gates |
| votes | `/api/votes` | Vote popularite |
| queue | `/api/queue` | File d'attente |
| qrcode | `/api/qr` | QR codes |
| agent | `/api/agent` | Assistant chat, confirmations, panic, settings, audit |
| knowledge-to-form | `/api/knowledge-to-form` | Generation quiz/formulaire depuis PDF/DOCX/URL (mode DATA/STRUCTURE) |

### Modeles (17 — `src/models/`)
`Tenant` `User` `Module` `Tournament` `Participant` `QuizResult` `Sponsor` `SponsorshipPack` `Transaction` `Statement` `LaunchSession` `LiveSession` `Vote` `DeviceToken` `GuaranteeLog` `ProctoringEvidence` `AgentAuditLog`

### Middleware (`src/middleware/`)
- `auth.js` — JWT → `req.user`, `req.tenantId`, `req.isSuperAdmin`
- `tenantIsolation.js` — `req.tenantFilter()`
- `featureGate.js` — `requireFeature()`, `requireLimit()`
- `agentGate.js` — `requireAgentEnabled`, `agentRateLimit`

### Services (`src/services/`)
`cmi5Xml` `fcm` `moncash` `natcash` `trafficController` `aiGateway` `knowledgeExtractor`

### Assistant (`src/agent/`)
| Fichier | Description |
|---------|-------------|
| `orchestrator.js` | Boucle LLM + tool calling (max 3 iterations) |
| `sessionStore.js` | Sessions en memoire (TTL 2h) |
| `confirmationStore.js` | Proposals mutations (TTL 5min) |
| `promptTemplates.js` | System prompts Public/Prive |
| `panicSwitch.js` | Arret d'urgence + broadcast |
| `tenantSettings.js` | Config par tenant (cache 5min) |
| `knowledge/docsIndex.js` | Base de connaissances (39 documents) |
| `tools/` | 14 outils avec RBAC + audit (inclut `knowledgeToForm` — generation quiz depuis document) |

### Socket.io (`src/socket/`)
- `index.js` — 5 namespaces
- `tournament.js` — `/tournament`
- `agent.js` — `/agent` (chat, confirm, reject, panic)

### Tests (`backend/tests/`)
- `unit/agent.js` — 67 tests unitaires (10 modules) — `npm test` (tourne en CI avant build)
- `integration/test-*.js` — 16 tests (backend + MongoDB live requis) — `node tests/integration/<name>.js`

---

## 3. Frontend (`frontend/`)

### Pages cles
| Page | Description |
|------|-------------|
| `/` | Lobby Arena (grille concours) |
| `/login` | Connexion (email + organisation) |
| `/tournament/[token]` | Inscription, paiement, ticket QR |
| `/tournament/[token]/play` | Quiz via TKT-XXX |
| `/tournament/waiting-room` | File d'attente |
| `/live-tournament/[token]` | Spectateur live |
| `/live-arena/[token]` | Affichage TV/OBS |
| `/share/[token]` | Quiz player public |
| `/docs/` | Centre d'Aide (hub + 14 articles + FAQ) |
| `/vision` | Page Vision & Impact |
| `/admin/tournaments` | Gestion tournois |
| `/admin/modules` | Studio (editeur 3 colonnes, drag-drop, undo/redo) |
| `/admin/users` | CRUD utilisateurs |
| `/admin/tenants` | CRUD organisations |
| `/admin/analytics` | Dashboard KPIs |
| `/admin/billing` | Facturation / plans |
| `/admin/media` | Mediatheque |
| `/admin/agent` | Surveillance assistant, audit, arret d'urgence |
| `/admin/agent-settings` | Config assistant : limites, outils, moteur, couts |
| `/admin/knowledge-to-form` | Wizard : generer un quiz/formulaire depuis PDF, DOCX ou URL |

### Stores Pinia
`auth.ts` `modules.ts` `tournaments.ts` `agent.ts`

### Composables
`useApi.ts` `useTournamentSocket.ts` `useLiveSocket.ts` `useSpectatorSocket.ts` `useAgentSocket.ts` `useNativeBridge.ts`

### Composants cles
- `blocks/` — 18 types x (Edit + Preview) = 36+ composants
- `agent/` — `AgentChatPanel`, `AgentBubble`, `AgentMessageBubble`, `AgentProposalCard`, `AgentThinkingIndicator`
- `admin/` — `FormGenerationWizard` (wizard 3 etapes Source/Mode/Revision pour knowledge-to-form)

---

## 4. Roles

| Role | Acces |
|------|-------|
| `superadmin` | Tout, cross-tenant |
| `admin_ddene` | Son organisation : tournois, modules, users, sponsors |
| `teacher` | Modules, tournois de son organisation |
| `student` | Modules assignes, quiz |
| `authorized_agent` | Caisse, collecte paiements, quota |

---

## 5. Deploiement

### CI/CD (`cloudbuild.yaml`)
Pipeline sur push master :
1. `test-backend` — `npm ci && npm test` (fail fast)
2. `build-backend` — Docker build + push GCR
3. `deploy-backend` — Cloud Run (min-instances=1 en CI, override manuel a 0 en pre-prod)
4. `build-and-deploy-frontend` — Nuxt generate + Firebase Hosting

### Deploiement manuel
```bash
# Backend → Cloud Run
gcloud builds submit ./backend --tag gcr.io/luminous-mesh-459718-p4/tegs-backend:TAG
gcloud run deploy tegs-backend --image=gcr.io/luminous-mesh-459718-p4/tegs-backend:TAG \
  --region=us-central1 --port=3000 --memory=1Gi --cpu=2 --min-instances=0

# Frontend → Firebase Hosting
cd frontend
NUXT_PUBLIC_API_BASE="https://tegs-backend-746425674533.us-central1.run.app/api" npx nuxi generate
npx firebase-tools deploy --only hosting --project=luminous-mesh-459718-p4
```

### Secrets (Secret Manager)
- Backend Cloud Run : `tegs-mongo-uri` `tegs-jwt-secret` `tegs-gcs-jwt-secret` `tegs-moncash-client-id` `tegs-moncash-client-secret` `tegs-natcash-merchant-id` `tegs-natcash-api-key`
- CI Firebase : `firebase-ci-token`
- Agent LLM (via backend env) : `GATEWAY_AUTH_TOKEN`

---

## 6. Conventions

### Commits (SIGEPRO — OBLIGATOIRE)
```
<prefix>: <description> [TAG]
```
Prefixes : `feat:` `fix:` `docs:` `ui:` `refactor:` `test:` `chore:`
Tags : `[DONE]` (toujours quand fini), `[REVIEW]`, `[TASK:ObjectId]`
**Sans `[DONE]`, l'avancement N'AUGMENTE PAS.**

### Code
- Backend : CommonJS, Express Router, try/catch + `next(err)`
- Frontend : TypeScript, `<script setup lang="ts">`, Tailwind
- Auth : Cookie `__session` (seul forwarded par Firebase Hosting)
- Multi-tenant : `req.tenantFilter()` sur CHAQUE requete
- XSS : Sanitisation sur content save
- Terme **"organisation"** : NE PAS utiliser "ecole"

### Nommage
Routes: kebab-case — Modeles: PascalCase — Composants: PascalCase — Stores: camelCase

### Interface utilisateur
- **NE PAS** utiliser de jargon technique dans les pages publiques/utilisateurs
- Termes interdits en UI : LLM, Gemini, RBAC, JWT, xAPI, MongoDB, Firebase, WebSocket, API, token, RAG, tenant, bcrypt, FCM, SDK, Node.js
- Utiliser : "assistant" (pas "agent IA"), "moteur de reponse" (pas "LLM"), "organisation" (pas "tenant"), "unites" (pas "tokens")

---

## 7. Variables d'Environnement

> Templates : `backend/.env.example` et `frontend/.env.example` (copier en `.env`)

### Backend (`.env`)
```
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/tegs
JWT_SECRET=<secret>
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:3002
GCS_ENABLED=true
GCS_SERVICE_URL=https://dp-storage-service-746425674533.us-central1.run.app
GCS_JWT_SECRET=<secret>
MONCASH_CLIENT_ID=<id>
MONCASH_CLIENT_SECRET=<secret>
MONCASH_MODE=sandbox
NATCASH_MERCHANT_ID=<id>
NATCASH_API_KEY=<key>
NATCASH_MODE=sandbox
PROCESS_AGENTIC_ON=true
AI_GATEWAY_URL=https://dp-ai-gateway-service-746425674533.us-central1.run.app
GATEWAY_AUTH_TOKEN=<secret>
```

### Frontend (`.env`)
```
NUXT_PUBLIC_API_BASE=http://127.0.0.1:3000/api
NUXT_PUBLIC_PIXABAY_KEY=<key>
```
