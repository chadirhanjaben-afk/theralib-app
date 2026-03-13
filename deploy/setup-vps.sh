#!/bin/bash
# ============================================================
# Theralib VPS Deployment Script
# Hostinger KVM - Ubuntu 22.04 - France
# ============================================================
set -e

echo "========================================"
echo "  Theralib VPS Setup - Ubuntu 22.04"
echo "========================================"

# ---- 1. System Update ----
echo "[1/8] Mise à jour du système..."
apt update && apt upgrade -y
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw software-properties-common

# ---- 2. Node.js 20 LTS ----
echo "[2/8] Installation de Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js $(node -v) installé"
echo "npm $(npm -v) installé"

# ---- 3. PM2 ----
echo "[3/8] Installation de PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# ---- 4. Firewall ----
echo "[4/8] Configuration du firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ---- 5. Clone du projet ----
echo "[5/8] Clonage du projet..."
mkdir -p /var/www
cd /var/www

if [ -d "theralib-app" ]; then
  echo "Le dossier existe déjà, on pull..."
  cd theralib-app
  git pull origin main
else
  git clone https://github.com/chadirhanjaben-afk/theralib-app.git
  cd theralib-app
fi

# ---- 6. Variables d'environnement ----
echo "[6/8] Configuration des variables d'environnement..."
if [ ! -f .env.production ]; then
  echo "⚠️  IMPORTANT: Copie le fichier .env.production !"
  echo "   Exécute cette commande depuis ton Mac :"
  echo "   scp .env.production root@195.35.1.142:/var/www/theralib-app/.env.production"
  echo ""
  echo "   Ou crée-le manuellement : nano /var/www/theralib-app/.env.production"
  echo ""
  read -p "Appuie sur Entrée quand .env.production est en place..."
fi

# ---- 7. Build ----
echo "[7/8] Installation des dépendances et build..."
npm ci
npm run build

# ---- 8. PM2 Start ----
echo "[8/8] Démarrage avec PM2..."
pm2 delete theralib 2>/dev/null || true
pm2 start npm --name "theralib" -- start
pm2 save

echo ""
echo "========================================"
echo "  ✅ Theralib est démarré sur le port 3000"
echo "  Prochaine étape : configurer Nginx + SSL"
echo "========================================"
