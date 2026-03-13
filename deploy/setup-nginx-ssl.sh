#!/bin/bash
# ============================================================
# Nginx + SSL Configuration for Theralib
# Run AFTER setup-vps.sh and AFTER DNS is pointed to this IP
# ============================================================
set -e

echo "========================================"
echo "  Configuration Nginx + SSL"
echo "========================================"

# Copy Nginx config
cp /var/www/theralib-app/deploy/nginx-theralib.conf /etc/nginx/sites-available/theralib
ln -sf /etc/nginx/sites-available/theralib /etc/nginx/sites-enabled/theralib

# Remove default config
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx

echo "✅ Nginx configuré"
echo ""

# SSL with Let's Encrypt
echo "Installation du certificat SSL..."
echo "⚠️  IMPORTANT: Le DNS doit pointer vers ce serveur (195.35.1.142)"
echo ""
read -p "Le DNS est configuré ? (o/n) " dns_ready

if [ "$dns_ready" = "o" ]; then
  certbot --nginx -d theralib.net -d www.theralib.net --non-interactive --agree-tos -m contact@theralib.net
  echo ""
  echo "✅ SSL activé ! https://theralib.net est prêt"

  # Auto-renewal
  systemctl enable certbot.timer
  echo "✅ Renouvellement automatique SSL activé"
else
  echo "⏳ Configure d'abord le DNS sur Hostinger :"
  echo "   A Record: theralib.net → 195.35.1.142"
  echo "   A Record: www.theralib.net → 195.35.1.142"
  echo ""
  echo "   Puis relance : certbot --nginx -d theralib.net -d www.theralib.net"
fi
