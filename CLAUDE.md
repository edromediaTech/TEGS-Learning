# TEGS-Learning — Instructions Agent

> Dernière mise à jour : 2026-04-14

## 1. Présentation du Projet

**TEGS-Arena** est une plateforme de concours académiques en ligne pour Haïti (DDENE).
Les candidats s'inscrivent, passent des quiz éliminatoires en rounds, et les meilleurs remportent des primes.

| Élément | Valeur |
|---------|--------|
| **Stack Backend** | Node.js, Express, MongoDB (Mongoose), Socket.io |
| **Stack Frontend** | Nuxt 3 (SSR: false), Pinia, Tailwind CSS |
| **Hébergement** | Backend → Cloud Run (`tegs-backend`), Frontend → Firebase Hosting |
| **GCP Project** | `luminous-mesh-459718-p4` (region: `us-central1`) |
| **GitHub** | `edromediaTech/TEGS-Learning` (branche: `master`) |
| **Ports locaux** | Backend: `3000`, Frontend: `3002` |
| **MongoDB** | Service Windows local (dev), Atlas/secret (prod) |

---

## 2. Architecture Backend (`backend/`)

### Entrée
- `src/server.js` — Express app, CORS, compression, Socket.io, montage de toutes les routes

### Routes (21 fichiers — `src/routes/`)
| Route | Path | Auth | Description |
|-------|------|------|-------------|
| auth | `/api/auth` | Public | Register, login, /me |
| tenants | `/api/tenants` | SuperAdmin | CRUD organisations (multi-tenant) |
| users | `/api/users` | Admin+ | CRUD utilisateurs, assignation roles |
| modules | `/api/modules` | Auth | CRUD modules, sections, screens, contentBlocks |
| tournaments | `/api/tournaments` | Mixte | CRUD tournois, inscription publique, quiz play, advance |
| payment | `/api/payment` | Public | MonCash/Natcash initiation, webhooks, verification |
| sponsors | `/api/sponsors` | Mixte | CRUD sponsors, analytics ROI |
| sponsorship | `/api/sponsorship` | Mixte | Packs bourses (BOURSE-XXX), validation codes |
| reporting | `/api/reporting` | Mixte | Soumission quiz (public + auth), export PDF/Excel |
| share | `/api/modules/public` | Public | Quiz player HTML interactif (rendu serveur) |
| live-arena | `/api/live-arena` | Public | Affichage spectateur TV/projecteur |
| cmi5 | `/api/cmi5` | Auth | Launch sessions, player xAPI |
| xapi | `/api/xapi` | Auth | Statements xAPI (LRS) |
| analytics | `/api/analytics` | Auth | KPIs, dashboard, séries temporelles |
| upload | `/api/upload` | Auth | GCS Cloud Storage, signed URLs |
| sync | `/api/sync` | Auth | Batch sync mobile, déduplication |
| notifications | `/api/notifications` | Auth | FCM push notifications |
| subscription | `/api/subscription` | Auth | Plans, feature gates |
| votes | `/api/votes` | Public | Fan vote, jauge popularité |
| queue | `/api/queue` | Public | File d'attente virtuelle (waiting room) |
| qrcode | `/api/qr` | Auth | Génération QR codes |

### Modèles (16 — `src/models/`)
`Tenant` `User` `Module` `Tournament` `Participant` `QuizResult` `Sponsor` `SponsorshipPack` `Transaction` `Statement` `LaunchSession` `LiveSession` `Vote` `DeviceToken` `GuaranteeLog` `ProctoringEvidence`

### Middleware (`src/middleware/`)
- **auth.js** — JWT verify → `req.user`, `req.tenantId`, `req.isSuperAdmin`
- **tenantIsolation.js** — `req.tenantFilter()` pour isolation MongoDB
- **featureGate.js** — `requireFeature()`, `requireLimit()` par plan

### Services (`src/services/`)
`cmi5Xml` `fcm` `moncash` `natcash` `trafficController`

### Socket.io (`src/socket/`)
- `index.js` — init socket
- `tournament.js` — namespace `/tournament` (join, start_round, advance, leaderboard)

---

## 3. Architecture Frontend (`frontend/`)

### Configuration
- **Nuxt 3.21** — `ssr: false` (static generation via `nuxi generate`)
- **Modules** : `@nuxtjs/tailwindcss`, `@pinia/nuxt`
- **API Base** : `NUXT_PUBLIC_API_BASE` (env var)

### Pages (`pages/`)
| Répertoire | Pages | Description |
|------------|-------|-------------|
| `/` | `index.vue` | Lobby Arena public (grille concours, animations) |
| `/login` | `login.vue` | Connexion (email + tenant_id) |
| `/tournament/[token]` | Inscription, paiement, ticket QR |
| `/tournament/[token]/rules` | Règlement dynamique du concours |
| `/tournament/[token]/play` | Accès quiz via competitionToken (TKT-XXX) |
| `/tournament/waiting-room` | File d'attente virtuelle |
| `/live-tournament/[token]` | Spectateur live (bracket, podium) |
| `/live-arena/[token]` | Affichage TV/OBS broadcast |
| `/share/[token]` | Quiz player public (modules partagés) |
| `/docs/` | Centre d'Aide (hub, 11 articles, FAQ) |
| `/docs/candidat/*` | 4 guides : inscription, quiz, résultats, badge |
| `/docs/agent/*` | 2 guides : collecte, quota |
| `/docs/sponsor/*` | 2 guides : packs, bourses |
| `/docs/admin/*` | 3 guides : tournois, users, live |
| `/docs/faq` | FAQ interactive (accordions, anchor links) |
| `/admin/tournaments` | Liste + création + gestion tournois |
| `/admin/modules` | Studio (bloc builder) |
| `/admin/users` | CRUD utilisateurs |
| `/admin/tenants` | CRUD organisations |
| `/admin/analytics` | Dashboard KPIs |
| `/admin/billing` | Facturation / plans |
| `/admin/media` | Médiathèque GCS |
| `/agent/collection` | Caisse agent collecteur |
| `/mobile/` | Vue mobile + warroom |

### Stores Pinia (`stores/`)
- `auth.ts` — login, JWT, cookie `__session`, roles
- `modules.ts` — CRUD modules, 18 types de blocs
- `tournaments.ts` — CRUD tournois, bracket, podium

### Composables (`composables/`)
- `useApi.ts` — fetch avec JWT auto
- `useTournamentSocket.ts` — WebSocket `/tournament`
- `useLiveSocket.ts` / `useSpectatorSocket.ts` — WebSocket live
- `useNativeBridge.ts` — pont mobile Capacitor

### Layouts (`layouts/`)
- `admin.vue` — sidebar gradient bleu, nav dynamique par rôle
- `default.vue` — layout simple

### Composants notables (`components/`)
- `blocks/` — 18 types × (Edit + Preview) = 36+ composants
- `tournament/` — `TournamentTree`, `SponsorCarousel`, `RegistrationModal`
- `docs/` — `Callout`, `StepByStep`, `DocVideo`, `DocImage`, `DocsLayout`, `CommandPalette`
- `share/` — 8 composants quiz interactifs

---

## 4. Rôles Utilisateur

| Rôle | Accès |
|------|-------|
| `superadmin` | Tout. Cross-tenant. Crée orgas, admins, tournois pour n'importe quel tenant. |
| `admin_ddene` | Son organisation. Tournois, modules, users, sponsors, agents. |
| `teacher` | Modules, tournois de son organisation. |
| `student` | Accès aux modules assignés. |
| `authorized_agent` | Caisse agent. Collecte paiements, quota. |

---

## 5. Flux Concours (A → Z)

```
1. Créer Organisation (/admin/tenants)
2. Créer Module Quiz (/admin/modules) — questions par round
3. Créer Tournoi (/admin/tournaments/new) — rounds liés aux modules
4. Ouvrir Inscriptions (statut → registration)
5. Candidats s'inscrivent (/tournament/[token]) → TKT-XXX + QR
6. Paiement MonCash/Natcash ou Code BOURSE
7. Admin démarre Round (/admin/tournaments/[id] → "Démarrer")
8. Candidats passent le quiz (/tournament/[token]/play → TKT-XXX)
9. Admin clôture → système qualifie Top X, élimine le reste
10. Répéter rounds 7-9 jusqu'au dernier
11. Podium (/live-tournament/[token])
12. Certificats PDF (GET /api/tournaments/:id/certificate/:participantId)
```

---

## 6. Déploiement

### Production
```bash
# Backend → Cloud Run
gcloud builds submit ./backend --tag gcr.io/luminous-mesh-459718-p4/tegs-backend:TAG
gcloud run deploy tegs-backend --image=gcr.io/luminous-mesh-459718-p4/tegs-backend:TAG \
  --region=us-central1 --port=3000 --memory=1Gi --cpu=2 --min-instances=1

# Frontend → Firebase Hosting
cd frontend
NUXT_PUBLIC_API_BASE="https://tegs-backend-746425674533.us-central1.run.app/api" npx nuxi generate
npx firebase-tools deploy --only hosting --project=luminous-mesh-459718-p4
```

### URLs Production
- **Backend** : `https://tegs-backend-746425674533.us-central1.run.app`
- **Frontend** : `https://tegs-learning.web.app`
- **Alt** : `https://luminous-mesh-459718-p4.web.app`

### Secrets Cloud Run (via Secret Manager)
- `tegs-mongo-uri`, `tegs-jwt-secret`, `tegs-gcs-jwt-secret`
- MonCash/Natcash : actuellement en env vars placeholder (secrets non créés)

---

## 7. Conventions & Règles

### SIGEPRO Tracking (OBLIGATOIRE)
Chaque commit DOIT respecter ce format :
```
<prefix>: <description> [TAG]
```

**Préfixes** : `feat:` `fix:` `docs:` `ui:` `refactor:` `test:` `chore:`

**Tags** (au moins un par commit) :
- `[DONE]` — tâche terminée (TOUJOURS utiliser quand le travail est fini)
- `[REVIEW]` — en review
- `[TASK:ObjectId]` — cible une tâche SIGEPRO

**IMPORTANT** : Sans `[DONE]`, la tâche reste "en_cours" et l'avancement N'AUGMENTE PAS.

### Conventions Code
- **Backend** : CommonJS (`require`), Express Router, try/catch + `next(err)`
- **Frontend** : TypeScript, Composition API (`<script setup lang="ts">`), Tailwind classes
- **Auth** : Cookie `__session` (seul cookie forwarded par Firebase Hosting)
- **Multi-tenant** : `req.tenantFilter()` sur CHAQUE requête MongoDB
- **XSS** : Sanitisation sur content save
- **Terme "organisation"** : NE PAS utiliser "école" — le système est générique

### Conventions Nommage
- Routes : kebab-case (`live-arena.js`)
- Modèles : PascalCase (`Tournament.js`)
- Composants Vue : PascalCase (`RegistrationModal.vue`)
- Stores : camelCase (`useTournamentStore`)

---

## 8. Variables d'Environnement

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
```

### Frontend (`.env`)
```
NUXT_PUBLIC_API_BASE=http://127.0.0.1:3000/api
NUXT_PUBLIC_PIXABAY_KEY=<key>
```

---

## 9. Dépendances Clés

### Backend
`express` `mongoose` `jsonwebtoken` `bcryptjs` `socket.io` `cors` `compression` `multer` `express-validator` `jspdf` `exceljs` `qrcode` `undici`

### Frontend
`nuxt@3.21` `pinia` `tailwindcss` `vue@3.5` `chart.js` `vue-chartjs` `@capacitor/*`
