# API de synchronisation TEGS-Edge (etape E3)

Contrat entre le cloud TEGS et un noeud TEGS-Edge (une salle hors ligne). Reference :
`vs-plateforme/cdc.md` (CDC) et `vs-plateforme/analyse-cdc-tegs-edge.md` (decisions).
Tests : `backend/tests/integration/test-edge-sync.js` (42 verifications).

## 1. Centre et jeton du noeud

Un **centre** = une salle / un noeud physique (`center_id`, ex. `CRNS-NORD-EST-01`),
rattache a un etablissement (`tenant_id`). Gere par `admin_ddene` (son etablissement)
ou `superadmin` :

| Requete | Effet |
|---|---|
| `POST /api/centers` `{ center_id, name, classroom_ids, simulation_ids, module_ids, tenant_id* }` | Cree le centre, renvoie `token` **une seule fois** (`*tenant_id` : superadmin seulement) ; `module_ids` vide = modules publies |
| `GET /api/centers` | Liste (sans jeton ni empreinte) + etat du noeud |
| `PATCH /api/centers/:id` | `name`, `classroom_ids`, `simulation_ids` (vide = tout le catalogue), `isActive` |
| `POST /api/centers/:id/rotate-token` | Nouveau jeton ; l'ancien est refuse immediatement |

Le cloud ne stocke que `sha256(jeton)`. Le jeton va dans `TEGS_EDGE_API_KEY` du noeud.

## 2. Authentification du noeud

```
X-Center-ID: CRNS-NORD-EST-01
Authorization: Bearer tegs_edge_...
```

- `401` : centre inconnu ou jeton faux (meme reponse) ; `403` : centre desactive ;
  `400` : `center_id` du corps different de l'en-tete.
- **Push signe** : `X-Edge-Signature: sha256=<hex>` = HMAC-SHA256 du corps brut, avec pour
  cle `sha256(jeton)` en hexadecimal (chaine de 64 caracteres).

## 3. `POST /api/v1/edge/sync/pull`

```json
{
  "center_id": "CRNS-NORD-EST-01",
  "edge_version": "1.0.0",
  "last_roster_sync": "2026-10-24T06:00:00Z",
  "installed_modules": { "ecrou_hexagonal_v1": "<sha256 du paquet installe>" }
}
```

Reponse :

```json
{
  "status": "SUCCESS",
  "server_time": "...",
  "roster_cursor": "...",
  "classrooms": [{ "id": "...", "name": "9e A", "code": "CL-1A2B", "course_id": "..." }],
  "roster_updates": [{ "id": "...", "first_name": "Jean", "last_name": "Baptiste",
                       "classroom_id": "...", "classroom_ids": ["..."],
                       "matricule": "K7QM-3P9X", "access_pin_hash": "$2a$12$...",
                       "action": "UPSERT" }],
  "roster_active_ids": ["..."],
  "module_updates": [{ "id": "ecrou_hexagonal_v1", "title": "...", "version": "1.0.0",
                       "download_url": "https://storage.googleapis.com/.../ecrou_hexagonal_v1_cmi5.zip",
                       "sha256": "...", "size_bytes": 341484, "format": "cmi5" }],
  "modules_removed": ["sim_retiree_v1"]
}
```

- **Roster** : eleves actifs des classes du centre. Avec `last_roster_sync`, seuls les eleves
  modifies depuis, ou tout l'effectif d'une classe modifiee. Renvoyer `roster_cursor` au pull
  suivant. Les eleves absents de `roster_active_ids` sont a **desactiver** en local (jamais
  supprimes : leurs copies en attente doivent pouvoir partir).
- **Simulations** : `installed_modules[id]` = sha256 du paquet installe (recommande) ou sa
  version. Verifier `sha256` apres telechargement avant d'installer.
- **Identifiants eleves (E4)** : `matricule` + `access_pin_hash` (bcrypt, cout 12) ; `null`
  tant que l'enseignant n'a pas genere d'identifiants. Le noeud verifie le PIN en local
  (`bcrypt.compare`) et applique le meme verrouillage que le cloud (5 echecs -> 15 min).
  Un nouveau PIN modifie l'eleve : il repart au pull suivant. Chiffrer le disque du noeud :
  un PIN a 6 chiffres hache peut etre retrouve hors ligne si le disque est vole.

### Complements E5 (noeud complet)

Le corps accepte aussi `last_course_sync`. La reponse contient en plus :

| Champ | Contenu |
|---|---|
| `institution` | `{ id, name, code }` de l'etablissement (recree localement avec le meme `_id`) |
| `center` | `{ center_id, name }` |
| `teachers` | enseignants des classes (references locales, sans mot de passe) |
| `classrooms[].teacher_id`, `classrooms[].student_ids` | proprietaire et effectif actif de chaque classe |
| `course_updates` | documents complets des modules de cours modifies depuis `last_course_sync` |
| `course_active_ids`, `course_cursor` | modules a garder (les autres sont retires du noeud), curseur suivant |

## 4. `POST /api/v1/edge/sync/push` (signe)

```json
{
  "center_id": "CRNS-NORD-EST-01",
  "batch_id": "batch_987654321",
  "edge_sent_at": "2026-10-24T09:45:00Z",
  "submissions": [{
    "submission_id": "sub_local_550e8400",
    "student_id": "...", "module_id": "ecrou_hexagonal_v1", "classroom_id": "...",
    "completed_at": "2026-10-24T09:42:15Z",
    "duration_ms": 125000,
    "score": 18.5, "max_score": 20,
    "submission_payload": { "passed_validation": true },
    "anti_fraud_logs": { "focus_loss_count": 0, "ip_client": "192.168.10.54" }
  }]
}
```

- 1 a 500 elements par lot, `submissions` et `statements` confondus (`413` au-dela) ;
  `submission_payload` + `anti_fraud_logs` <= 64 Ko.
- **`statements`** (E5) : traces xAPI brutes du noeud (outbox), meme idempotence :
  `{ statementId, actor: { user_id }, verb: { id, display }, object, result, context, timestamp }`.
  Auteur : tout utilisateur de l'etablissement ; `timestamp` corrige de l'ecart d'horloge ;
  `context.extensions.edge` ajoute (centre, lot, heure du noeud, ecart). Rejets avec
  `statement_id` au lieu de `submission_id`.
- `module_id` : identifiant de simulation CRNS ou `_id` d'un module de cours de l'etablissement.
- **Horodatage par duree relative** : `edge_sent_at` = horloge du noeud a l'envoi. Le cloud
  mesure l'ecart (heure de reception - `edge_sent_at`) et l'ajoute a `completed_at`.
  `duration_ms` (mesuree localement) ne depend pas de l'horloge.

Reponse (HTTP 200) :

```json
{
  "status": "ACK | PARTIAL | REJECT",
  "batch_id": "batch_987654321",
  "processed_ids": ["sub_local_550e8400"],
  "rejected": [{ "submission_id": "...", "code": "unknown_student", "message": "...", "retryable": false }],
  "duplicates": 0,
  "server_time": "...",
  "clock_offset_ms": 182
}
```

| Code de rejet | Reessayable | Cause |
|---|---|---|
| `invalid_submission_id` | non | 8 a 128 caracteres `[A-Za-z0-9_.:-]` |
| `unknown_student` | non | eleve absent de l'etablissement du centre |
| `unknown_module` | non | ni simulation publiee, ni module de cours de l'etablissement |
| `invalid_completed_at` | non | date non ISO 8601 |
| `invalid_score` | non | score < 0, score > max_score, max_score <= 0, duree < 0 |
| `payload_too_large` | non | plus de 64 Ko |
| `id_conflict` | non | `submission_id` deja pris par un autre etablissement |
| `invalid_payload` | non | trace xAPI refusee par le modele |
| `server_error` | **oui** | erreur passagere : renvoyer plus tard |

Cote noeud : `processed_ids` -> `COMPLETED` ; rejet non reessayable -> `FAILED` (garde en
local pour examen) ; `retryable` ou erreur reseau -> nouvel essai avec repli exponentiel.
Le renvoi d'une copie deja recue est accepte (`duplicates`), sans doublon.

Chaque copie devient une trace xAPI `completed` (`Statement`, `statementId = submission_id`),
avec `context.extensions.edge` (centre, lot, classe, heure du noeud, ecart, duree,
`submission_payload`, `anti_fraud_logs`).
