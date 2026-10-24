# Installer un noeud TEGS-Edge (salle hors ligne)

Un noeud = un serveur de salle (ex. Lenovo 16 Go, Ubuntu Server) + un switch + des postes
Windows 11 en kiosque. Les eleves ouvrent `http://tegs.local` ; tout fonctionne sans
Internet, et le noeud se synchronise avec le cloud TEGS des que la liaison revient.

Fichiers : `deploy/edge/` (Docker Compose, nginx, modele `.env.edge`). Contrat de synchro :
`docs/edge-sync-api.md`. Decisions : `vs-plateforme/analyse-cdc-tegs-edge.md`.

## 1. Sur le cloud (une fois par salle)

1. Les classes de la salle existent dans **Mes Classes CRNS**, avec leurs eleves et leurs
   identifiants (matricule + PIN imprimes et distribues par l'enseignant).
2. Creer le centre : page **Centres de salle** du cloud (admin DDENE) > « + Nouveau centre »
   (identifiant, nom, classes servies, modules de cours, simulations).
   - Modules : aucune case = modules **publies** de l'etablissement.
   - Simulations : aucune case = tout le catalogue CRNS.
3. **Noter le jeton** affiche une seule fois (bloc de configuration a copier). Perdu ->
   « Nouveau jeton » sur la meme page.

## 2. Le serveur

1. **Ubuntu Server LTS avec disque chiffre** : a l'installation, choisir « Use an entire
   disk » + « Set up this disk as an LVM group » + **« Encrypt the LVM group with LUKS »**.
   Le noeud stocke les empreintes des PIN : sans chiffrement, un disque vole permet de
   les retrouver hors ligne.
   - Le chiffrement demande la phrase de passe a chaque demarrage. Pour un redemarrage
     automatique apres coupure de courant, lier le deverrouillage a la puce TPM2 :
     `sudo apt install clevis-tpm2 clevis-luks clevis-initramfs` puis
     `sudo clevis luks bind -d /dev/<partition-luks> tpm2 '{}'` et `sudo update-initramfs -u`
     (protege contre le vol du disque seul, pas de la machine entiere).
2. **Adresse fixe** sur le reseau de la salle, ex. `192.168.10.1/24` (netplan).
3. **Docker** : `curl -fsSL https://get.docker.com | sh` puis `sudo usermod -aG docker $USER`.
4. **Pare-feu** : `sudo ufw allow from 192.168.10.0/24 to any port 80 && sudo ufw allow OpenSSH && sudo ufw enable`.

## 3. Le noeud

**Le plus simple** : `bash deploy/edge/install.sh [--dnsmasq <interface> <ip>] [--ufw <reseau>]`
fait les etapes 2.3, 2.4, 3 et 4 (verifications, Docker, `.env.edge`, dnsmasq, pare-feu,
demarrage) puis lance `check.sh`. Protocole du pilote : `docs/pilote-fort-liberte.md`.

A la main, avec Internet (construction des images) :
```bash
git clone https://github.com/edromediaTech/TEGS-Learning.git && cd TEGS-Learning/deploy/edge
cp .env.edge.example .env.edge && chmod 600 .env.edge
# Remplir : TEGS_CENTER_ID, TEGS_EDGE_API_KEY (jeton du cloud), JWT_SECRET (openssl rand -hex 32)
docker compose -f docker-compose.edge.yml up -d --build
docker compose -f docker-compose.edge.yml logs -f backend   # attendre "[edge] ... sync OK"
```
Les conteneurs redemarrent seuls (`restart: unless-stopped`) ; journaux limites a 5 x 10 Mo
par service.

## 4. Le reseau de la salle : `tegs.local`

dnsmasq sert DHCP et DNS aux postes (si le switch/routeur ne le fait pas deja) :
```bash
sudo apt install dnsmasq
sudo tee /etc/dnsmasq.d/tegs.conf <<'EOF'
interface=<interface-salle>
dhcp-range=192.168.10.50,192.168.10.150,12h
address=/tegs.local/192.168.10.1
EOF
sudo systemctl restart dnsmasq
```
Verifier depuis un poste : `http://tegs.local` affiche la page de connexion.

## 5. Les postes Windows 11 (kiosque)

Parametres > Comptes > Autres utilisateurs > **Configurer un kiosque** : application
**Microsoft Edge**, mode « Navigation publique » ou « Affichage interactif », URL
`http://tegs.local/login`. Le poste ouvre directement TEGS, onglet **Eleve** (le dernier
onglet utilise est retenu).

## 6. Exploitation

- **Enseignants** : ils se connectent sur le noeud (onglet Personnel) avec leur e-mail et
  mot de passe du cloud, s'ils enseignent dans une classe du centre.
- **Eleves** : `http://tegs.local/eleve` liste les cours ; un module **publie** s'ouvre sans
  lien public. Images et PDF des modules sont copies sur le noeud a la synchro.
- **Integrite des copies** : Mes Classes CRNS > « Rapport d'integrite des copies » (pertes
  de focus, temps hors page, plein ecran, copier-coller). Des indices, pas une sanction.

- **Etat du noeud** : `http://tegs.local/admin/edge` (compte enseignant) — derniere synchro,
  resultats en attente / envoyes / refuses, simulations installees, bouton « Synchroniser ».
- **Coupure d'Internet** : rien a faire. La salle continue ; les resultats attendent dans
  l'outbox et partent au retour de la liaison (nouvel essai progressif, de 5 s a 15 min).
- **Classes, eleves, identifiants** : toujours sur le cloud (refuse sur le noeud) ; ils
  arrivent a la synchro suivante. Un eleve retire d'une classe est desactive, pas supprime.
- **Mise a jour** : `git pull && docker compose -f docker-compose.edge.yml up -d --build`.
- **Sauvegarde** : `docker compose -f docker-compose.edge.yml exec -T mongo mongodump --archive > tegs-edge-$(date +%F).archive`.
- **Bilan en une commande** : `bash deploy/edge/check.sh` (services, API, derniere synchro,
  resultats en attente, disque).
- **Diagnostic** : `docker compose -f docker-compose.edge.yml ps` et `... logs --tail 100 backend`.
