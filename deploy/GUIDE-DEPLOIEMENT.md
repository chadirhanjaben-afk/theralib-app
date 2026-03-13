# Guide de déploiement Theralib - VPS Hostinger

## Prérequis
- VPS Hostinger Ubuntu 22.04 (IP: 195.35.1.142)
- Domaine theralib.net
- Code pushé sur GitHub (chadirhanjaben-afk/theralib-app)

---

## Étape 1 : Configurer le DNS sur Hostinger

Dans le panel Hostinger > DNS Zone :

| Type | Nom | Valeur |
|------|-----|--------|
| A | @ | 195.35.1.142 |
| A | www | 195.35.1.142 |

⏳ Propagation : 5-30 minutes

---

## Étape 2 : Se connecter au VPS

```bash
ssh root@195.35.1.142
```
Mot de passe : `NEbZBQ1Q7rHln;.k`

---

## Étape 3 : Préparer .env.production sur ton Mac

Depuis ton Mac, dans le dossier theralib-app :

```bash
cp .env.local .env.production
```

Modifie `.env.production` :
- `NEXT_PUBLIC_APP_URL=https://theralib.net`
- `EMAIL_FROM=Theralib <noreply@theralib.net>`

---

## Étape 4 : Lancer le script de déploiement

Sur le VPS :

```bash
# Cloner le repo
cd /var/www
git clone https://github.com/chadirhanjaben-afk/theralib-app.git
cd theralib-app

# Rendre les scripts exécutables
chmod +x deploy/*.sh

# Lancer le setup
bash deploy/setup-vps.sh
```

Le script va te demander de copier `.env.production`. Depuis ton Mac :

```bash
scp .env.production root@195.35.1.142:/var/www/theralib-app/.env.production
```

Puis appuie sur Entrée dans le terminal VPS pour continuer le build.

---

## Étape 5 : Configurer Nginx + SSL

Toujours sur le VPS :

```bash
bash deploy/setup-nginx-ssl.sh
```

---

## Étape 6 : Vérifier

Ouvre https://theralib.net dans ton navigateur !

---

## Commandes utiles

```bash
# Voir les logs
pm2 logs theralib

# Redémarrer
pm2 restart theralib

# Mettre à jour (après un git push)
cd /var/www/theralib-app
git pull origin main
npm ci
npm run build
pm2 restart theralib
```

---

## Plus tard : Docker pour n8n et OpenWebUI

```bash
# Installer Docker (si pas déjà fait via Hostinger)
curl -fsSL https://get.docker.com | sh

# n8n
docker run -d --name n8n -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  --restart always \
  n8nio/n8n

# OpenWebUI
docker run -d --name open-webui -p 8080:8080 \
  -v open-webui:/app/backend/data \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

Puis ajouter les configs Nginx pour les sous-domaines (n8n.theralib.net, ai.theralib.net).
