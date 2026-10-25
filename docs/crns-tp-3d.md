# TP 3D CRNS : composants, qualité et intégration

Branche : `feature/component-qa-linter` (TEGS et CRNS), issue de `feature/threejs-engine`
(jalon C1). Rien n'est sur `master` : ce guide sert à l'y intégrer sans rien refaire.

## 1. Principe : un composant = un manifeste

Un composant 3D interactif (disjoncteur, prise, borne...) est un paquet de deux fichiers :

```
component.glb    modèle (Draco, textures cuites, noeuds nommés)
component.json   manifeste crns-component/1 : électrique, cinématique, TP
```

Le même manifeste est lu par trois consommateurs, sans code spécifique au composant :

| Consommateur | Rôle |
|---|---|
| `backend/src/qa/` (linter) | refuse un composant incohérent (verrou n°1) |
| `backend/src/routes/components.js` | cycle de vie, catalogue `APPROVED` |
| `frontend/components/CrnsTpPlayer.vue` + `composables/useCrnsTp.ts` | joue le TP (démo, cockpit, futur bloc de module) |

Schéma : `backend/src/qa/schema/component.schema.json`. Exemple complet :
`frontend/public/components/disjoncteur_c16_1pn/component.json` (source CRNS :
`blender_scripts/demo/disjoncteur_c16.component.json`, paquet produit par
`blender_scripts/demo/disjoncteur_c1.py --output <dossier>`).

### Sections du manifeste

- `electrical` : `conductors` (id logique -> noeud GLB, `borne_amont` / `borne_aval`
  obligatoires), `links` (contacts permanents), `switch` (contact fixe / mobile, actionneur,
  états fermé / ouvert, écart minimal), `path` (chaîne attendue), `connections` (fil, vis,
  câble de chaque borne).
- `kinematics` : `actuators` (noeud, rotation / translation, axe glTF, états) et `driven`
  (pièce entraînée : `child` = enfant du noeud de l'actionneur dans le GLB, ou `declared`).
- `interaction` : `pickable`, `frame`, `focus`, `capot` (rayons X), `explode` (décalages
  glTF en mètres) et `explode_hide`, `labels` (option `point` pour un noeud allongé),
  `states` (couleurs / émissions par état), `circuit` (U, calibre, charges), `faults`
  (panne de serrage : résistances, R_th, constante de temps, seuils), `trip`, `xapi`, `texts`.

## 2. Verrou n°1 : linter 3D

```
node scripts/qa/validate-component.js <dossier | component.json> [--json] [--budget-polygons N]
```

Code de sortie 0 = conforme, 1 = erreur bloquante, 2 = usage. Sans WebGL ni décodage Draco :
boîtes englobantes des accesseurs glTF (min/max obligatoires) + transformations des noeuds,
actionneurs placés dans chaque état. Tolérance de contact : 0,5 mm (`tolerance_m`).

| Code | Bloquant | Contrôle |
|---|---|---|
| `ERR_OPEN_CIRCUIT` | oui | chaîne borne amont -> aval, conducteur orphelin, intervalle sans contact (interrupteur fermé) |
| `ERR_SWITCH_STUCK` | oui | contacts pas assez écartés en position ouverte |
| `ERR_CONNECTION` | oui | fil hors de sa cage, vis ne touchant pas le fil, câble décollé |
| `ERR_KINEMATIC_CHAIN` | oui | pièce entraînée sans lien réel, actionneur n'entraînant pas le contact mobile, organe animé non déclaré |
| `ERR_PERF_BUDGET` | oui | > 10 000 polygones, texture > 1024 px ou externe, Draco absent |
| `ERR_MODEL_HASH`, `ERR_SCHEMA`, `ERR_UNKNOWN_NODE`, `ERR_MODEL` | oui | paquet incohérent |
| `WARN_*` | non | proche du budget, enfant d'actionneur non déclaré, image illisible |

Le serveur exécute le même code au dépôt : un rapport fourni par le client ne compte pas.
Forge CRNS : `python core/qa_gate.py <dossier> [--upload]` (bloque l'envoi si non conforme).

**Piège Blender rencontré** : des pièces créées déjà tournées puis rattachées à un parent
tourné perdent leur rotation à l'export glTF. Construire les enfants parent en position neutre,
les rattacher, puis tourner le parent (voir `mechanism()` dans `disjoncteur_c1.py`).

## 3. Cycle de vie et API (`/api/v1/components`)

```
DRAFT --linter OK--> CI_PASSED --submit--> REVIEW_PENDING --approve--> APPROVED
  ^                                              └──reject (rapport)--> REJECTED
  └─────── tout nouveau dépôt modifié (GLB ou manifeste) ───────────────┘
```

| Route | Accès |
|---|---|
| `GET /catalog` | public : **uniquement APPROVED** |
| `GET /:id/model.glb`, `/:id/manifest.json` | public si APPROVED, sinon teacher / admin_ddene / superadmin |
| `POST /` `{ manifest, glb_base64 }` | teacher, admin_ddene, superadmin (linter serveur, GLB ≤ 3 Mo) |
| `GET /`, `GET /:id` | teacher, admin_ddene, superadmin |
| `POST /:id/submit` | idem |
| `POST /:id/approve` `{ checklist, comment }` | admin_ddene, superadmin : 4 points requis, linter relancé |
| `POST /:id/reject` `{ comment }` | admin_ddene, superadmin : rapport de 10 caractères minimum |

Sur un noeud de salle (`EDGE_MODE=1`), les écritures répondent 409 (catalogue géré sur le
cloud). Modèle : `SimulationComponent` (GLB stocké dans le document ; à déplacer vers le
stockage objet si le catalogue grossit).

## 4. Verrou n°2 : cockpit de revue (`/qa`, `/qa/review/:id`)

`CrnsTpPlayer` en mode `qa` + aides : rayons X à opacité 25 % (`interaction.qa_opacity`),
chemin conducteur lumineux (`electrical.path` + fils et câbles), test de déclenchement,
rapport du linter, historique. Check-list (`componentLifecycle.CHECKLIST`) : chaîne
cinématique, raccordements, lisibilité des organes, comportement sous déclenchement.
« Approuver pour le catalogue » n'est actif qu'à 4/4 ; le serveur le revérifie.

## 5. Intégrer dans master (le moment venu)

Tout est additif ; les seuls fichiers existants modifiés sont `backend/src/server.js`
(une ligne de montage), `backend/package.json` (script `test`), `frontend/package.json`
(script `test:unit`, dépendance déjà présente), `frontend/public/vendor/README.md`,
`.github/workflows/edge.yml` (étapes de CI). Étapes :

1. Fusionner `master` dans la branche (déjà fait une fois, sans conflit), relancer la CI.
2. PR `feature/component-qa-linter` -> `master` après le gel du 6 novembre.
3. Choisir l'exposition de `/demo-3d` (vitrine publique ou à retirer) et lier `/qa` depuis
   le menu admin.
4. Bloc de module : ajouter un `kind` `crns_component_3d` dans `EmbedBlockPreview.vue` qui
   rend `<CrnsTpPlayer :manifest-url="data.manifest_url" />` (URLs du catalogue).
5. Noeuds edge : ajouter le catalogue `APPROVED` au pull (`edge-sync.js`), comme les
   simulations (empreinte `glb_sha256`).
6. Suivi : relier l'événement `crns-sim-event` (verbe xAPI fourni) au traceur existant de
   `SimulationViewer.vue`.

Jalons suivants du CDC : C2 = ce catalogue (MongoDB) ; C3 (snap points, physique) et C4
(auteur WYSIWYG) produiront des manifestes crns-component/1 validés par le même linter.

## 6. Tests

| Commande | Contenu |
|---|---|
| `cd backend && npm test` | dont 19 tests du linter (fixtures à défaut unique) et du cycle de vie |
| `node backend/tests/integration/test-components.js` | 24 tests : dépôt, transitions, catalogue |
| `cd frontend && npm run test:unit` | calculs électriques (P = U × I, P = R × I², température) |
| `for d in frontend/public/components/*/; do node scripts/qa/validate-component.js $d; done` | linter sur les composants livrés (CI) |
