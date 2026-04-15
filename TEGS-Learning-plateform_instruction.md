# Structure dÃ©taillÃ©e de la plateforme de formation OpenCrea Learning

## 1. Vue dâ€™ensemble

OpenCrea Learning est une plateforme en ligne de type outil auteur (LCMS) permettant de crÃ©er des modules de formation multimÃ©dias exportables en SCORM 1.2.  
Elle sâ€™adresse aux formateurs, concepteurs pÃ©dagogiques et crÃ©ateurs de contenus qui souhaitent produire rapidement des modules eâ€‘learning et les intÃ©grer ensuite dans un LMS compatible SCORM.

---

## 2. Architecture fonctionnelle

Lâ€™architecture fonctionnelle de la plateforme peut Ãªtre dÃ©coupÃ©e en cinq grands blocs :

### 2.1 Couche auteur / Ã©dition de contenus

- CrÃ©ation de modules ou â€œdocumentsâ€ de formation.
- Interface dâ€™Ã©dition web avec organisation des Ã©crans et des sections.
- Utilisation de gabarits graphiques (templates) pour structurer les pages.
- PrÃ©visualisation des contenus dans le navigateur.

![AperÃ§u de l'Ã©diteur de modules](captures/05-module-editor.png)

### 2.2 Gestion des ressources pÃ©dagogiques

- Insertion de textes, images, sons, vidÃ©os et autres mÃ©dias.
- CrÃ©ation dâ€™activitÃ©s interactives (notamment quiz).
- RÃ©utilisation de ressources dans plusieurs modules (logique LCMS).
- Gestion centralisÃ©e des mÃ©dias (bibliothÃ¨que de ressources).

![Mediatheque — gestion des medias et ressources pedagogiques](captures/19-mediatheque.png)

### 2.3 Moteur SCORM / exportation vers LMS

- GÃ©nÃ©ration automatique de paquets SCORM 1.2 Ã  partir des modules crÃ©Ã©s.
- Production du manifest SCORM et des fichiers associÃ©s.
- CompatibilitÃ© avec les principaux LMS supportant SCORM 1.2.
- Fonctions avancÃ©es de partage vers un LMS disponibles dans les offres payantes.

![Configuration du module — onglets Proprietes, Exporter, Partager](captures/20-settings.png)

### 2.4 Couche prÃ©sentation / diffusion directe

- Consultation directe des contenus dans OpenCrea Learning (lecture en ligne).
- PossibilitÃ© dâ€™utiliser les modules comme :
  - Tutoriels interactifs,
  - CV crÃ©atifs,
  - Supports de formation,
  - Plaquettes de prÃ©sentation,
  - Albums de souvenirs.

![Diffusion directe via la plateforme Arena](captures/07-live-arena-tv.png)

### 2.5 Services commerciaux et support

- Offre dâ€™abonnement mensuel (formule payante Ã  partir dâ€™un certain montant).
- Mise Ã  disposition dâ€™une version gratuite, limitÃ©e sur certaines fonctionnalitÃ©s.
- Support via formulaire de contact / canaux dÃ©diÃ©s.

![Plans d'abonnement et facturation](captures/18-facturation.png)

---

## 3. ModÃ¨le dâ€™usage pÃ©dagogique

Plusieurs scÃ©narios dâ€™usage typiques sont supportÃ©s par la structure de la plateforme :

- Tutoriels pas Ã  pas illustrÃ©s.
- CV interactifs avec navigation et mÃ©dias.
- Modules de formation structurÃ©s (chapitres, sections, quiz).
- Supports visuels enrichis (plaquettes, prÃ©sentations).
- RÃ©cits multimÃ©dias ou albums de souvenirs.

Chaque scÃ©nario repose sur la mÃªme logique : un module structurÃ© en Ã©crans, chaque Ã©cran utilisant un template et intÃ©grant des blocs de contenu et dâ€™interactivitÃ©.

![Structure de modules dans le gestionnaire](captures/02-admin-dashboard.png)

---

## 4. Structure interne dâ€™un module

La structure dâ€™un module dans OpenCrea Learning peut se dÃ©crire comme suit :

### 4.1 Niveau module

- MÃ©tadonnÃ©es :
  - Titre et sous-titre,
  - Langue,
  - Description,
  - Auteur.
- ParamÃ¨tres de navigation :
  - Navigation linÃ©aire ou libre,
  - Affichage de la progression,
  - Retour arriÃ¨re autorisÃ© ou non.
- ParamÃ¨tres SCORM :
  - Mode de complÃ©tion,
  - Gestion du score,
  - RÃ¨gles de tentative et de suivi.

### 4.2 Niveau sections / chapitres

- DÃ©coupage du module en parties logiques (chapitres, sÃ©quences).
- PossibilitÃ© de regrouper plusieurs Ã©crans sous une mÃªme section.
- Organisation hiÃ©rarchique (ordre des sections, prÃ©requis Ã©ventuels).

### 4.3 Niveau Ã©crans / pages

- Chaque Ã©cran correspond Ã  une page affichÃ©e Ã  lâ€™apprenant.
- Structure dÃ©finie par un template (mise en page prÃ©dÃ©finie).
- Zones de contenu typiques :
  - Zone de titre,
  - Zones de texte,
  - Zone dâ€™image,
  - Zone vidÃ©o,
  - Zone pour une activitÃ© (quiz, interaction, etc.).

![AperÃ§u d'un Ã©cran avec blocs de contenu](captures/05-module-editor.png)

### 4.4 Niveaux contenus et activitÃ©s

- Contenus :
  - Texte riche (titres, listes, paragraphes),
  - Images fixes (illustrations, schÃ©mas),
  - VidÃ©os (dÃ©monstrations, tutoriels),
  - Audio (commentaires, narrations).
- ActivitÃ©s :
  - Questions Ã  choix multiples (QCM),
  - Vrai / Faux,
  - Possibles autres types selon le moteur dâ€™activitÃ©.
- ParamÃ¨tres dâ€™activitÃ© :
  - Score,
  - Feedback,
  - CritÃ¨res de rÃ©ussite.

![Interface de quiz interactif dans le War Room](captures/08-mobile-warroom.png)

---

## 5. Vue technique macro (SaaS auteur SCORM)

### 5.1 Front-end (interface utilisateur)

- Application web accessible via un navigateur.
- Ã‰diteur de contenus (drag & drop ou formulaires de configuration).
- Ã‰cran de gestion des modules (listing, duplication, suppression).
- Pages publiques :
  - Page dâ€™accueil,
  - Conditions dâ€™utilisation,
  - Formulaire de contact,
  - Inscription / connexion.

![Page de connexion](captures/01-login-page.png)

### 5.2 Back-end (serveur et logique mÃ©tier)

- Gestion des utilisateurs et des droits.
- Stockage des modules, Ã©crans, sections et contenus.
- GÃ©nÃ©ration des paquets SCORM (archive + manifest + ressources).
- Gestion des plans d'abonnement et de la facturation (cÃ´tÃ© offres payantes).

![Terminal de paiement POS Agent](captures/06-agent-pos-terminal.png)

### 5.3 Stockage des donnÃ©es

- Base de donnÃ©es :
  - Utilisateurs,
  - Modules,
  - Structures de pages,
  - ActivitÃ©s et paramÃ¨tres.
- Stockage de fichiers :
  - Images,
  - VidÃ©os,
  - Audios,
  - Ressources statiques.

![Mediatheque — stockage cloud GCS](captures/19-mediatheque.png)

### 5.4 IntÃ©gration avec des LMS externes

- Export des modules au format SCORM 1.2.
- Import manuel du paquet SCORM dans un LMS (Moodle, etc.).
- Pour certaines offres : mÃ©canisme de partage / publication plus automatisÃ©.

![Configuration du module — onglet Exporter (SCORM/cmi5)](captures/20-settings.png)

---

## 6. Exemple de module structurÃ©

### 6.1 Description du module

- Titre : *Initiation Ã  la cybersÃ©curitÃ©*
- Public cible : dÃ©butants.
- Objectif : sensibiliser aux notions de base et aux bonnes pratiques.

### 6.2 Structure des Ã©crans

1. **Ã‰cran 1 â€“ Accueil**
   - Titre du module, image dâ€™illustration, court texte dâ€™introduction.

2. **Ã‰cran 2 â€“ Objectifs de la formation**
   - Liste des objectifs pÃ©dagogiques.
   - VidÃ©o courte prÃ©sentant le contenu du module.

3. **Ã‰cran 3 â€“ Concepts clÃ©s**
   - Texte structurÃ© en sections (mots de passe, phishing, mises Ã  jour).
   - SchÃ©mas / infographies.

4. **Ã‰cran 4 â€“ Cas pratiques**
   - Mise en situation avec exemples.
   - Questions intermÃ©diaires pour impliquer lâ€™apprenant.

5. **Ã‰cran 5 â€“ Quiz final**
   - QCM avec plusieurs questions.
   - Score calculÃ© et renvoyÃ© via SCORM au LMS.

![Reporting — resultats du quiz avec scores par participant](captures/16-reporting.png)

---

## 7. IdÃ©es de documentation complÃ©mentaire

Pour aller plus loin, la documentation dÃ©taillÃ©e dâ€™OpenCrea Learning pourrait inclure :

- Un guide de prise en main pour les auteurs :
  - CrÃ©ation dâ€™un premier module,
  - Utilisation des templates,
  - Ajout de mÃ©dias et dâ€™activitÃ©s.
- Un guide dâ€™intÃ©gration SCORM pour les administrateurs de LMS :
  - Export dâ€™un module,
  - Import dans diffÃ©rents LMS,
  - VÃ©rification du suivi et des scores.
- Des modÃ¨les de bonnes pratiques pÃ©dagogiques :
  - Structuration dâ€™un module,
  - Utilisation Ã©quilibrÃ©e des mÃ©dias,
  - Conception de quiz efficaces.

![Dashboard analytique pour le suivi des rÃ©sultats](captures/10-analytics-dashboard.png)
