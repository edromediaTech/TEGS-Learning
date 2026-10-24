# Pilote TEGS-Edge a Fort-Liberte : protocole (etape E7)

Objectif : valider en conditions reelles qu'une salle de 20 postes fonctionne a 100 % hors
ligne (connexion, cours, quiz, TP, simulations 3D, surveillance) et que les resultats
remontent au cloud sans perte au retour d'Internet ; puis dupliquer sur un 2e centre.

Materiel : serveur Lenovo 16 Go (Ubuntu Server), switch Gigabit, 20 postes Windows 11 en
kiosque. Guides : `docs/edge-deploiement.md` (installation), `docs/edge-sync-api.md` (synchro).

## 1. Preparation sur le cloud (J-7, depuis n'importe ou)

| # | Action | Ou | Fait |
|---|---|---|---|
| 1 | Creer la (les) classe(s) du pilote | Mes Classes CRNS | ☐ |
| 2 | Ajouter les eleves, **imprimer la fiche** matricule + PIN | Mes Classes CRNS > Ajouter des eleves | ☐ |
| 3 | Relire et **publier** les modules du TP (quiz, simulations) | Studio | ☐ |
| 4 | Creer le centre `CRNS-NORD-EST-01`, cocher les classes et les modules | Centres de salle | ☐ |
| 5 | **Noter le jeton** affiche une seule fois (ou le donner au technicien sur place) | Centres de salle | ☐ |
| 6 | Verifier que l'enseignant du pilote connait son e-mail et son mot de passe TEGS | — | ☐ |

## 2. Installation du serveur (J-1, avec Internet)

```bash
git clone https://github.com/edromediaTech/TEGS-Learning.git
cd TEGS-Learning/deploy/edge
bash install.sh --dnsmasq <interface-salle> 192.168.10.1 --ufw 192.168.10.0/24
```
`install.sh` verifie memoire, disque et **chiffrement du disque**, installe Docker, demande le
centre et le jeton, genere le secret local, configure `tegs.local` et le pare-feu, construit
et demarre le noeud, puis lance `check.sh`.

Critere de fin d'installation (`bash check.sh`) : services `[OK]`, API et page de connexion
`[OK]`, derniere reception recente, contenu local = classes, eleves et modules attendus.
Sur le cloud, page **Centres de salle** : le centre passe « En ligne ».

## 3. Deroule du jour J

| Temps | Etape | Resultat attendu |
|---|---|---|
| T-30 min | `bash check.sh` ; ouvrir `http://tegs.local` sur 2 postes | Noeud en service, page de connexion |
| T0 | Les 20 eleves se connectent (onglet Eleve, matricule + PIN) **en meme temps** | Toute la classe connectee en quelques secondes, aucun echec |
| T+5 | Ouverture du module de TP depuis `/eleve` | Le module s'ouvre, images presentes |
| T+10 | Simulation 3D (rotation, zoom, interactions) | Fluide, aucune ressource externe |
| **T+15** | **Coupure d'Internet** : debrancher le cable WAN du serveur (ou couper la liaison) | La salle continue normalement ; `/admin/edge` : synchro « En echec », resultats « en attente » qui augmentent |
| T+20 | Quiz et fin de TP (« Valider et Terminer ») | Copies enregistrees localement |
| T+35 | **Retour d'Internet** : rebrancher | Sous quelques minutes (ou bouton « Synchroniser ») : en attente -> 0, envoyes = total |
| T+45 | Sur le cloud : Mes Classes CRNS > Rapport d'integrite | Toutes les copies presentes, salle `CRNS-NORD-EST-01`, niveaux d'alerte coherents |

Pendant la coupure, l'enseignant peut aussi se connecter sur le noeud (onglet Personnel) et
suivre la salle depuis `/admin/edge`.

## 4. Criteres de reussite

| Critere | Seuil | Mesure |
|---|---|---|
| Connexion simultanee de la classe | 20/20, moins de 10 s pour toute la classe | Observation + chronometre |
| Affichage d'une page / d'un module | moins de 1 s | Observation |
| Fonctionnement pendant la coupure | aucune interruption cote eleve | Observation, aucun message d'erreur |
| Perte de donnees | **0** : chaque copie faite pendant la coupure est au cloud | Rapport d'integrite vs nombre d'eleves |
| Reprise apres coupure | resultats remontes sans intervention (moins de 15 min) | `/admin/edge`, `check.sh` |
| Surveillance | pertes de focus visibles dans le rapport | Rapport d'integrite |

Reference de laboratoire (Mac M5, `node tests/load/edge-classroom-load.js 20`) : connexion
de 20 eleves simultanes 1,1 s au total, pages et module 13-17 ms, traces xAPI 15-30 ms,
200 traces remontees en 1 s, 0 erreur. Le Lenovo etant plus lent, viser les seuils ci-dessus.

## 5. Duplication sur un 2e centre

1. Cloud : **Centres de salle** > Nouveau centre (`CRNS-NORD-EST-02`, ses classes) -> jeton.
2. Second serveur : memes commandes que la section 2, seul le centre et le jeton changent.
3. Verifier : chaque salle ne voit que ses eleves ; un eleve d'une salle ne se connecte pas
   dans l'autre ; les copies arrivent au cloud marquees de leur centre.
   (Teste en laboratoire : `node tests/integration/test-edge-multicenter.js`.)

## 6. En cas de probleme

| Symptome | Action |
|---|---|
| Un poste n'ouvre pas `tegs.local` | Le poste a-t-il recu une adresse 192.168.10.x ? Tester `http://192.168.10.1` |
| Un eleve « Compte verrouille » | 5 PIN errones : attendre 15 min, ou « Regenerer les PIN » sur le cloud (synchro) |
| Synchro en echec alors qu'Internet est revenu | `/admin/edge` > Synchroniser ; sinon `docker compose -f docker-compose.edge.yml logs --tail 100 backend` |
| Copies « refusees » dans `/admin/edge` | Noter le motif affiche ; les copies restent sur le noeud (rien n'est supprime) |
| Serveur arrete pendant le TP | Redemarrer : les services repartent seuls ; les copies deja enregistrees sont conservees |
| Abandon du pilote | Les copies du noeud restent remontables plus tard ; repli sur tegslearning.com en ligne |

## 7. Rapport de pilote (a remplir)

- Date, salle, nombre d'eleves presents, enseignant.
- Resultat de chaque critere (section 4) : atteint / non atteint, valeur mesuree.
- Sorties de `bash check.sh` avant, pendant la coupure et apres le retour d'Internet.
- Capture de `/admin/edge` pendant la coupure et apres la reprise.
- Capture du rapport d'integrite du cloud.
- Incidents (heure, symptome, action), retours de l'enseignant et des eleves.
- Decision : generalisation, corrections avant un 2e pilote, ou abandon.
