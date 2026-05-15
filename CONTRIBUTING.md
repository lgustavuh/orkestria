# Contribuindo com o Orkestria

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose

## Setup inicial

```bash
# Clone o repositório
git clone <repo-url>
cd orkestria

# Instale dependências
pnpm install

# Suba os serviços de infraestrutura
docker compose up -d

# Configure variáveis de ambiente
cp .env.example .env

# Gere o Prisma Client
cd apps/api && npx prisma generate

# Rode as migrations
npx prisma migrate dev

# Popule o banco com dados demo
npx prisma db seed

# Volte para a raiz e inicie o dev
cd ../..
pnpm dev
```

Acesse:
- Frontend: http://localhost:3000
- API Swagger: http://localhost:4000/api/docs
- MinIO Console: http://localhost:9001

## Estrutura do Projeto

```
apps/
  api/          → NestJS backend (porta 4000)
  web/          → Next.js frontend (porta 3000)
  worker/       → BullMQ job processor
packages/
  types/        → Tipos compartilhados
infra/
  docker/       → Dockerfiles
  aws/cdk/      → IaC para AWS
```

## Convenções

### Código

- TypeScript strict em todo o projeto
- Nomes de variáveis e funções em inglês
- Comentários e strings de UI em português (pt-BR)
- Imports organizados: libs externas → módulos internos → tipos

### API

- REST com prefixo `/api/v1`
- Endpoints em kebab-case: `/api/v1/client-portal`
- Respostas paginadas: `{ data: [...], meta: { total, page, limit, totalPages } }`
- Erros: `{ statusCode, message, errors?, timestamp, path }`
- Soft delete com campo `isDeleted` (nunca DELETE físico em produção)

### Banco de Dados

- Prisma como ORM, raw SQL apenas para queries complexas (relatórios, FTS)
- Tabelas em snake_case (via `@@map`)
- IDs: CUID gerado pelo Prisma
- Sempre incluir `createdAt` e `updatedAt`
- Campos de auditoria: `createdById`, `isDeleted`

### Git

- Branches: `feature/nome`, `fix/nome`, `chore/nome`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`)
- PRs requerem ao menos 1 aprovação
- Squash merge para main

### Testes

- Unit tests: `__tests__/nome.spec.ts` junto ao módulo
- E2E tests: `apps/api/test/nome.e2e-spec.ts`
- Rodar: `pnpm test` (unit) ou `cd apps/api && npx jest --config test/jest-e2e.json` (e2e)
- Mínimo: todo service e guard deve ter testes unitários

## Adicionando um novo módulo

1. Crie a pasta em `apps/api/src/modules/nome/`
2. Crie `nome.module.ts`, `nome.service.ts`, `nome.controller.ts`
3. Crie DTOs em `dto/` com decorators Swagger
4. Adicione guards RBAC: `@Roles('ADMIN', 'STRATEGIST')` conforme necessário
5. Registre o módulo em `app.module.ts`
6. Crie testes em `__tests__/nome.service.spec.ts`
7. Atualize o Prisma schema se necessário: `npx prisma migrate dev --name add_nome`

## Adicionando uma nova página no frontend

1. Crie em `apps/web/src/app/(dashboard)/nome/page.tsx` (ou `(client-portal)` para portal)
2. Use `'use client'` no topo
3. Use `useAuth()` para checar permissões
4. Use `api.ts` para chamadas à API
5. Use componentes de `@/components/ui` (Modal, Toast, Badge, etc.)
6. Adicione link na sidebar em `layout.tsx` se necessário

## Perfis e Permissões

| Perfil | Código | Pode criar projetos | Vê todos os projetos | Admin |
|--------|--------|:---:|:---:|:---:|
| Administrador | ADMIN | ✅ | ✅ | ✅ |
| Estrategista | STRATEGIST | ✅ | ✅ | ❌ |
| Copywriter | COPYWRITER | ❌ | ❌ (só atribuídos) | ❌ |
| Gestor Tráfego | TRAFFIC_MANAGER | ❌ | ❌ (só atribuídos) | ❌ |
| Social Media | SOCIAL_MEDIA | ❌ | ❌ (só atribuídos) | ❌ |
| Designer | DESIGNER | ❌ | ❌ (só atribuídos) | ❌ |
| Cliente | CLIENT | ❌ | ❌ (só portal) | ❌ |

## Deploy

### Staging
```bash
git push origin main  # CI/CD automático via GitHub Actions
```

### Produção
```bash
cd infra/aws/cdk
npx cdk deploy OrkestriaProduction
```

## Contato

Dúvidas? Abra uma issue ou fale com o time de engenharia.
