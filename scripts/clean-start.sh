#!/bin/bash
# ──────────────────────────────────────────────────────
# Theralib — Clean Start Script
# Résout les problèmes de CSS manquant, cache corrompu,
# manifests manquants, et Service Worker stale.
#
# Usage: bash scripts/clean-start.sh
# ──────────────────────────────────────────────────────

set -e

echo "🧹 Theralib Clean Start"
echo "══════════════════════════════════════"

# 1. Remove .next build cache
echo ""
echo "1/5 — Suppression du cache .next..."
rm -rf .next
echo "   ✅ .next supprimé"

# 2. Remove node_modules caches
echo ""
echo "2/5 — Nettoyage des caches node_modules..."
rm -rf node_modules/.cache
echo "   ✅ node_modules/.cache supprimé"

# 3. Remove TypeScript build info
echo ""
echo "3/5 — Nettoyage TypeScript..."
rm -f tsconfig.tsbuildinfo
rm -f .next/cache/tsbuildinfo.json 2>/dev/null || true
echo "   ✅ TypeScript build info supprimé"

# 4. Pre-create manifest placeholders
echo ""
echo "4/5 — Création des manifests placeholder..."
node scripts/fix-manifests.mjs
echo "   ✅ Manifests prêts"

# 5. Run TypeScript check
echo ""
echo "5/5 — Vérification TypeScript..."
npx tsc --noEmit 2>&1 | tail -5
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "   ✅ Aucune erreur TypeScript"
else
  echo "   ⚠️  Erreurs TypeScript détectées (voir ci-dessus)"
fi

echo ""
echo "══════════════════════════════════════"
echo "🚀 Prêt ! Lance maintenant :"
echo ""
echo "   npm run dev"
echo ""
echo "⚠️  IMPORTANT — Dans ton navigateur :"
echo "   1. Ouvre DevTools (F12)"
echo "   2. Onglet Application > Service Workers"
echo "   3. Clique 'Unregister' sur tous les SW"
echo "   4. Onglet Application > Cache Storage"
echo "   5. Clique droit > Delete sur chaque cache"
echo "   6. Fais un Hard Refresh: Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)"
echo ""
echo "   Ou plus simple : coche 'Update on reload' dans"
echo "   Service Workers, puis Hard Refresh."
echo "══════════════════════════════════════"
