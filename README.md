# Orkestria

Sistema SaaS de gestão de projetos para agências de marketing digital. Orquestra o fluxo de trabalho entre equipe interna e clientes.

## Stack

- **API:** NestJS 10 + TypeScript, Prisma 7 (PostgreSQL 16), BullMQ + Redis
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Armazenamento:** S3/MinIO (arquivos), PostgreSQL (dados)
- **Infraestrutura:** Docker Compose, Turborepo + pnpm (monorepo)

## Pré-requisitos

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker Desktop

## Instalação

### 1. Subir os containers

```bash
docker compose up -d
```

Sobe PostgreSQL (5432), MinIO (9000/9001) e Redis (6379).

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

**`apps/api/.env`**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orkestria
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=orkestria-files
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
REDIS_URL=redis://localhost:6379
JWT_SECRET=orkestria-secret-key-dev
JWT_REFRESH_SECRET=orkestria-refresh-secret-dev
NODE_ENV=development
PORT=4000
PG_CONTAINER=orkestria-postgres
```

**`apps/web/.env`**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 4. Criar banco e tabelas

```bash
cd apps/api
npx prisma migrate dev --name init
```

### 5. Popular dados iniciais

```powershell
# PowerShell (Windows)
Get-Content prisma/seed.sql | docker exec -i orkestria-postgres psql -U postgres -d orkestria
```

```bash
# Linux / Mac
docker exec -i orkestria-postgres psql -U postgres -d orkestria < prisma/seed.sql
```

### 6. Iniciar

```bash
cd ../..
pnpm dev --filter @orkestria/api --filter @orkestria/web
```

### 7. Acessar

- **App:** http://localhost:3000
- **API Docs (Swagger):** http://localhost:4000/api/docs
- **MinIO Console:** http://localhost:9001 (minioadmin / minioadmin)

## Login padrão

| Email | Senha | Perfil |
|-------|-------|--------|
| admin@orkestria.com | Admin@2025! | Admin + Estrategista |

## Estrutura do projeto

```
orkestria/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 27 modelos, 16 enums
│   │   │   └── seed.sql        # Dados iniciais
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/       # Login, registro, JWT, MFA, refresh tokens
│   │       │   ├── users/      # CRUD usuários, perfil, avatar
│   │       │   ├── tenants/    # Multi-tenancy, cadastro de agências
│   │       │   ├── billing/    # Integração Asaas (Pix, boleto, cartão)
│   │       │   ├── projects/   # Projetos, pipeline, etapas, membros
│   │       │   ├── tasks/      # Tarefas, kanban, checklist, dependências
│   │       │   ├── comments/   # Comentários estilo chat
│   │       │   ├── approvals/  # Fluxo de aprovação (equipe + cliente)
│   │       │   ├── files/      # Upload S3, preview, download presigned
│   │       │   ├── clients/    # Cadastro de clientes PF/PJ
│   │       │   ├── client-portal/ # Portal do cliente (projetos, aprovações, feedback)
│   │       │   ├── notifications/ # Notificações em tempo real
│   │       │   ├── templates/  # Templates de projeto com tarefas automáticas
│   │       │   ├── automations/ # Motor de automações
│   │       │   ├── backup/     # Backup e restauração do banco
│   │       │   ├── reports/    # Dashboard e relatórios
│   │       │   ├── scheduler/  # Cron jobs (limpeza de tokens, notificações)
│   │       │   ├── search/     # Busca global
│   │       │   └── roles/      # Gerenciamento de perfis
│   │       └── common/
│   │           ├── guards/     # JWT, Roles
│   │           ├── filters/    # Exception filter (erros sanitizados)
│   │           ├── decorators/ # @CurrentUser, @Roles, @Public
│   │           └── helpers/    # Audit log helper
│   │
│   └── web/                    # Frontend Next.js
│       ├── public/
│       │   ├── logo-icon.svg   # Logo vetorial
│       │   ├── favicon.ico     # Favicon multi-resolução
│       │   └── icon-192.png    # Ícone PWA
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # Login, registro, recuperação de senha
│           │   ├── (client-portal)/ # Portal do cliente
│           │   └── dashboard/  # Painel da equipe
│           ├── components/ui/  # Avatar, KanbanBoard, NotificationBell, etc
│           ├── hooks/          # useAuth, useToast
│           └── lib/            # API client
│
├── docker-compose.yml
├── turbo.json
└── .env.production.example
```

## Funcionalidades

### Painel da equipe
- **Dashboard** — Métricas (projetos ativos, tarefas concluídas, aprovações, atrasadas), tabela de projetos com progresso, gráfico donut, feed de atividade, filtro por período
- **Projetos** — Pipeline com 6 etapas (Backlog → Concluído), barra de progresso, equipe com avatares, briefing, canais, orçamento
- **Tarefas** — Kanban drag-and-drop, prioridades (baixa/média/alta/urgente), atribuição, prazos, checklist, dependências, time tracking
- **Comentários** — Estilo chat com balões, aprovações aparecem como mensagens coloridas (✅❌🔄)
- **Aprovações** — Enviar para aprovação do cliente com 1 clique, nome do cliente visível
- **Arquivos** — Upload para S3/MinIO, preview de imagens, organização por projeto, permissões de exclusão
- **Automações** — Templates de projeto com tarefas automáticas (prazo calculado + atribuição por perfil)
- **Clientes** — Cadastro PF/PJ com CPF/CNPJ, endereço, contrato, logo/foto
- **Calendário** — Visualização de prazos e entregas
- **Backup** — Backup completo do banco com 1 clique, download, restauração (drag & drop de .sql), exclusão
- **Administração** — Gestão de usuários e perfis
- **Notificações** — Em tempo real para tarefas, comentários, aprovações, feedback do cliente
- **Busca global** — Pesquisa em projetos, tarefas e clientes

### Portal do cliente
- Acompanhar progresso dos projetos e etapas
- Ver equipe responsável com fotos
- Aprovar, reprovar ou pedir ajustes nas entregas
- Enviar feedback sobre o andamento
- Alterar senha via menu do avatar

### Multi-tenancy (SaaS)
- Cadastro público de novas agências (`/register`)
- 3 planos: Starter (R$97), Pro (R$247), Agência (R$497)
- Trial de 14 dias automático
- Limites por plano (usuários, projetos, armazenamento)
- Integração Asaas (Pix, boleto, cartão recorrente)
- Webhook para ativar/suspender conta por pagamento

## Segurança

- Refresh token em cookie httpOnly (SameSite=lax)
- Rate limiting: 30 req/min global, 5/min login
- CORS com validação estrita de origin
- Helmet com CSP, HSTS, X-Frame-Options DENY
- DTO tipado no PATCH /users/me (previne escalação de privilégios)
- ADMIN bloqueado no registro
- Verificação de acesso em downloads de arquivo
- IDOR corrigido no portal do cliente
- Blocklist de extensões perigosas (.exe, .bat, .sh, etc)
- Body limit 1MB padrão, 10MB só para avatares
- Erros do Prisma sanitizados em produção
- Audit log em operações críticas
- Limpeza automática de tokens expirados (cron diário)
- Política de senha forte (8+ chars, maiúscula, minúscula, número, especial)

## Produção

Copie `.env.production.example` e gere senhas únicas:

```bash
openssl rand -hex 64  # Para JWT_SECRET e JWT_REFRESH_SECRET
```

Configure `CORS_ORIGINS` com o domínio da aplicação e `ENABLE_SWAGGER=false`.

Para integração com Asaas, configure no `.env`:
```env
ASAAS_API_URL=https://api.asaas.com/api/v3
ASAAS_API_KEY=sua_chave_api
```

## Licença

Proprietário — Todos os direitos reservados.
