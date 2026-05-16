#!/bin/bash
set -e

LOGDIR="$(pwd)/log"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/setup-$(date +%Y%m%d-%H%M%S).log"

# Log everything to file AND terminal
exec > >(tee -a "$LOGFILE") 2>&1

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║        🎵  Orkestria Setup  🎵        ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""
echo "📝 Log: $LOGFILE"
echo ""

command -v docker >/dev/null 2>&1 || { echo "❌ Docker não encontrado."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm não encontrado."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js não encontrado."; exit 1; }
echo "✅ Pré-requisitos: docker=$(docker --version), node=$(node -v), pnpm=$(pnpm -v)"
echo ""

echo "🧹 Limpando containers antigos..."
docker compose down -v 2>/dev/null || true
echo ""

echo "🐳 Subindo PostgreSQL, Redis e MinIO..."
docker compose up -d
echo "   Aguardando PostgreSQL..."
sleep 3
until docker exec orkestria-postgres pg_isready -U postgres -q 2>/dev/null; do
  sleep 1
done
echo "✅ Infra pronta"
echo ""

echo "📦 Instalando dependências..."
pnpm install
echo "✅ Dependências instaladas"
echo ""

echo "🔧 Gerando Prisma Client..."
cd apps/api
npx prisma generate
echo "✅ Prisma Client gerado"
echo ""

echo "🗄️  Criando banco de dados..."
npx prisma migrate dev --name init
echo "✅ Migrations aplicadas"
echo ""

echo "📊 Aplicando índices de busca full-text..."
if [ -f prisma/fts_indexes.sql ]; then
  docker exec -i orkestria-postgres psql -U postgres -d orkestria < prisma/fts_indexes.sql 2>&1 || echo "⚠ FTS indexes: alguns podem já existir"
fi
echo ""

echo "🌱 Populando banco com dados demo..."
docker exec -i orkestria-postgres psql -U postgres -d orkestria < prisma/seed.sql
echo "✅ Seed completo"
echo ""

cd ../..

echo ""
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║           ✅  Setup completo!             ║"
echo "  ╠═══════════════════════════════════════════╣"
echo "  ║  Para iniciar:  pnpm dev                  ║"
echo "  ║  Frontend:  http://localhost:3000          ║"
echo "  ║  API Docs:  http://localhost:4000/api/docs ║"
echo "  ║  Login:  admin@orkestria.com / Admin@2025! ║"
echo "  ╚═══════════════════════════════════════════╝"
echo ""
echo "📝 Log salvo em: $LOGFILE"
