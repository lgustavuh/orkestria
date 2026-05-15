# Orkestria — Arquitetura Técnica Completa

## 1. Visão Geral da Solução

**Orkestria** é um SaaS de gestão de projetos de marketing com dois ambientes distintos:

- **Ambiente Interno**: usado pela equipe (estrategistas, copywriters, designers, gestores de tráfego, social media, admins)
- **Portal do Cliente**: acesso restrito para acompanhamento, aprovações e feedback

### Princípios Arquiteturais

| Princípio | Aplicação |
|---|---|
| Separação de responsabilidades | Monorepo com apps isolados (web, api, worker) |
| RBAC granular | Permissões por perfil + escopo de projeto |
| Event-driven | Automações via filas/eventos assíncronos |
| Multi-tenant por projeto | Dados segregados por projeto, não por instância |
| API-first | Backend expõe REST, frontend consome |
| Cloud-native | Containerizado, stateless, horizontal scaling |

---

## 2. Decisões Técnicas e Justificativas

### Front-end: Next.js 14+ (App Router) + TypeScript

**Por quê**: SSR para SEO do portal público, RSC para performance, App Router para layouts aninhados que refletem a hierarquia projeto > tarefa > subtarefa. Alternativa descartada: SPA puro (Vite+React) — perdemos SSR e middleware de auth no edge.

### Back-end: NestJS + TypeScript

**Por quê**: Framework opinado com DI, módulos, guards, interceptors — mapeia diretamente para RBAC, audit logging e validação. Alternativa descartada: Express puro — menos estrutura para um sistema deste porte.

### Banco: PostgreSQL 16

**Por quê**: JSONB para metadados flexíveis (campos customizáveis de projeto), CTEs recursivas para subtarefas/dependências, Row Level Security possível para multi-tenancy futuro. Alternativa descartada: MongoDB — relacionamentos fortes entre entidades exigem integridade referencial.

### ORM: Prisma

**Por quê**: Type-safety end-to-end, migrations versionadas, schema declarativo. Limitação conhecida: queries complexas de relatório usarão raw SQL via `$queryRaw`.

### Auth: JWT próprio + Refresh Token + MFA via TOTP

**Por quê**: Controle total sobre claims customizados (roles, projectScope), sem vendor lock-in. Access token: 15min. Refresh token: 7d, rotativo, armazenado em httpOnly cookie. MFA: TOTP com speakeasy. Alternativa descartada: Cognito — overhead operacional e custo para o MVP.

### Cache/Filas: Redis + BullMQ

**Por quê**: Redis para cache de sessão, rate limiting, e como broker do BullMQ. BullMQ para jobs de automação, notificações, processamento de arquivos. Alternativa descartada: SQS — BullMQ é mais simples para MVP, migrar para SQS depois é trivial.

### Storage: S3 (MinIO local)

**Por quê**: Presigned URLs para upload/download seguro, lifecycle policies para versionamento, CDN via CloudFront.

### API: REST

**Por quê**: Mais simples de documentar (OpenAPI/Swagger), cachear, e debugar. GraphQL descartado para MVP: overhead de schema, N+1 em resolvers, complexidade de autorização por campo. Pode ser adicionado como camada em fase futura.

### Monorepo: Turborepo

**Por quê**: Build caching, task orchestration, dependency graph. Mais leve que Nx para o tamanho atual.

---

## 3. Arquitetura do Sistema

```
┌─────────────┐     ┌─────────────┐
│  Next.js     │     │  Client      │
│  (Internal)  │     │  Portal      │
│  App Router  │     │  (Next.js)   │
└──────┬───────┘     └──────┬───────┘
       │                     │
       └────────┬────────────┘
                │ HTTPS
       ┌────────▼────────┐
       │   API Gateway    │
       │   (NestJS)       │
       │   ┌────────────┐ │
       │   │ Auth Guard  │ │
       │   │ RBAC Guard  │ │
       │   │ Rate Limit  │ │
       │   │ Audit Log   │ │
       │   └────────────┘ │
       └────────┬─────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼──┐  ┌────▼───┐  ┌───▼───┐
│Postgre│  │ Redis  │  │  S3   │
│  SQL  │  │Cache/Q │  │Files  │
└───────┘  └────┬───┘  └───────┘
                │
          ┌─────▼─────┐
          │  Worker    │
          │  (BullMQ)  │
          │  Jobs:     │
          │  - Notify  │
          │  - Automate│
          │  - Process │
          └────────────┘
```

---

## 4. Arquitetura Cloud AWS

### MVP (custo ~$150-300/mês)

| Componente | Serviço AWS | Justificativa |
|---|---|---|
| Frontend | Vercel ou S3 + CloudFront | SSR no edge, zero config |
| API | ECS Fargate (1 task) | Serverless containers, sem EC2 |
| Worker | ECS Fargate (1 task) | Mesmo cluster, task separada |
| Banco | RDS PostgreSQL (db.t4g.micro) | Managed, backups automáticos |
| Cache | ElastiCache Redis (cache.t4g.micro) | Managed Redis |
| Storage | S3 Standard | Arquivos de projeto |
| Secrets | SSM Parameter Store | Variáveis de ambiente |
| DNS | Route 53 | DNS + health checks |
| CDN | CloudFront | Cache de assets e presigned URLs |
| Logs | CloudWatch | Centralização |
| CI/CD | GitHub Actions | Build + deploy |

### Escala (>100 usuários simultâneos)

| Evolução | Serviço |
|---|---|
| API auto-scaling | ECS + Application Load Balancer |
| Read replicas | RDS Multi-AZ + Read Replica |
| Filas robustas | SQS + Lambda ou manter BullMQ |
| Search | OpenSearch para busca full-text |
| CDN agressivo | CloudFront + S3 Transfer Acceleration |
| Observabilidade | Datadog ou Grafana Cloud |
| IaC | AWS CDK (TypeScript) |
| WAF | AWS WAF no ALB |

---

## 5. Modelagem de Domínio

### Entidades Principais

```
User ──< UserRole >── Role
User ──< ProjectMember >── Project
Client ──< ClientUser >── User
Client ──< Project
Project ──< ProjectStage
Project ──< Task ──< Task (subtarefas, self-ref)
Task ──< TaskDependency
Task ──< TaskComment
Task ──< TaskChecklist ──< ChecklistItem
Project/Task ──< File
Task ──< Approval
User ──< Notification
Project ──< Automation ──< AutomationAction
* ──< AuditLog
```

---

## 6. Matriz de Permissões (RBAC)

| Recurso | Admin | Estrategista | Copy | Tráfego | Social | Designer | Cliente |
|---|---|---|---|---|---|---|---|
| **Projetos** |
| Criar projeto | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver todos os projetos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver projetos atribuídos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* |
| Editar projeto | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deletar projeto | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Tarefas** |
| Criar tarefa | ✅ | ✅ | ✅** | ✅** | ✅** | ✅** | ❌ |
| Editar tarefa própria | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar qualquer tarefa | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver tarefas do projeto | ✅ | ✅ | ✅** | ✅** | ✅** | ✅** | ❌ |
| **Arquivos** |
| Upload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅*** |
| Download interno | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Download compartilhado | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compartilhar com cliente | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Aprovações** |
| Enviar para aprovação | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Aprovar (interno) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Aprovar (cliente) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Admin** |
| Gerenciar usuários | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar automações | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver auditoria | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Portal Cliente** |
| Ver projetos vinculados | — | — | — | — | — | — | ✅ |
| Ver entregas liberadas | — | — | — | — | — | — | ✅ |
| Comentar (se habilitado) | — | — | — | — | — | — | ✅ |
| Aprovar entregas | — | — | — | — | — | — | ✅ |
| Abrir solicitação | — | — | — | — | — | — | ✅ |

`*` Apenas projetos onde é cliente vinculado, com visão restrita
`**` Dentro do escopo do projeto em que é membro
`***` Apenas em áreas de feedback/solicitação

---

## 7. Fluxo do Portal do Cliente

```
Login Cliente → Dashboard Cliente
  │
  ├─ Lista de Projetos (vinculados)
  │   └─ Detalhe do Projeto
  │       ├─ Progresso geral (barra %)
  │       ├─ Timeline/Etapas (macro)
  │       ├─ Entregas liberadas
  │       │   ├─ Download de arquivos aprovados
  │       │   └─ Aprovar / Solicitar ajustes
  │       ├─ Comentários (apenas os marcados como visíveis)
  │       ├─ Responsáveis principais
  │       └─ Histórico resumido
  │
  ├─ Aprovações Pendentes
  │   └─ Aprovar / Reprovar / Pedir ajustes
  │
  ├─ Solicitações / Feedback
  │   └─ Abrir nova solicitação
  │
  └─ Notificações
```

**Regra de visibilidade**: Todo conteúdo no portal do cliente passa por um filtro `visibility: 'client'` ou `shared_with_client: true`. Comentários internos, arquivos não compartilhados e tarefas internas nunca aparecem.

---

## 8. Endpoints da API (Resumo)

### Auth
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | /auth/register | Admin | Criar usuário |
| POST | /auth/login | Público | Login |
| POST | /auth/refresh | Autenticado | Renovar token |
| POST | /auth/logout | Autenticado | Logout |
| POST | /auth/forgot-password | Público | Solicitar reset |
| POST | /auth/reset-password | Público (com token) | Resetar senha |
| POST | /auth/mfa/enable | Autenticado | Habilitar MFA |
| POST | /auth/mfa/verify | Autenticado | Verificar MFA |

### Users
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| GET | /users | Admin | Listar usuários |
| GET | /users/:id | Admin, Self | Detalhe do usuário |
| PATCH | /users/:id | Admin, Self | Atualizar |
| DELETE | /users/:id | Admin | Desativar |
| GET | /users/:id/roles | Admin | Roles do usuário |
| POST | /users/:id/roles | Admin | Atribuir role |

### Clients
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | /clients | Admin, Estrategista | Criar cliente |
| GET | /clients | Admin, Estrategista | Listar |
| GET | /clients/:id | Admin, Estrategista | Detalhe |
| PATCH | /clients/:id | Admin, Estrategista | Atualizar |
| POST | /clients/:id/users | Admin | Vincular usuário-cliente |

### Projects
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | /projects | Admin, Estrategista | Criar projeto |
| GET | /projects | Membro | Listar (filtrado por acesso) |
| GET | /projects/:id | Membro | Detalhe |
| PATCH | /projects/:id | Admin, Estrategista | Atualizar |
| DELETE | /projects/:id | Admin | Soft delete |
| POST | /projects/:id/members | Admin, Estrategista | Adicionar membro |
| GET | /projects/:id/stages | Membro | Listar etapas |
| PATCH | /projects/:id/stages/:stageId | Admin, Estrategista | Atualizar etapa |

### Tasks
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | /projects/:id/tasks | Membro | Criar tarefa |
| GET | /projects/:id/tasks | Membro | Listar tarefas |
| GET | /tasks/:id | Membro | Detalhe |
| PATCH | /tasks/:id | Membro (owner/admin/estrategista) | Atualizar |
| DELETE | /tasks/:id | Admin, Estrategista | Soft delete |
| POST | /tasks/:id/comments | Membro | Comentar |
| POST | /tasks/:id/checklist | Membro | Adicionar checklist |
| POST | /tasks/:id/time-entries | Membro | Apontar tempo |

### Files
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | /files/presigned-url | Membro | Gerar URL de upload |
| POST | /files | Membro | Registrar arquivo |
| GET | /files/:id/download | Membro/Cliente* | URL de download |
| PATCH | /files/:id | Admin, Estrategista | Atualizar metadados |
| DELETE | /files/:id | Admin | Soft delete |

### Approvals
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | /approvals | Membro | Enviar para aprovação |
| GET | /approvals | Membro/Cliente | Listar pendentes |
| PATCH | /approvals/:id | Aprovador | Aprovar/reprovar/ajustes |

### Notifications
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| GET | /notifications | Autenticado | Listar |
| PATCH | /notifications/:id/read | Autenticado | Marcar como lida |
| PATCH | /notifications/read-all | Autenticado | Marcar todas |

### Automations
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | /automations | Admin, Estrategista | Criar |
| GET | /automations | Admin, Estrategista | Listar |
| PATCH | /automations/:id | Admin, Estrategista | Atualizar |
| DELETE | /automations/:id | Admin | Deletar |

### Client Portal
| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| GET | /portal/projects | Cliente | Projetos vinculados |
| GET | /portal/projects/:id | Cliente | Detalhe (visão restrita) |
| GET | /portal/projects/:id/deliverables | Cliente | Entregas liberadas |
| GET | /portal/approvals | Cliente | Aprovações pendentes |
| POST | /portal/projects/:id/feedback | Cliente | Enviar feedback |
| GET | /portal/notifications | Cliente | Notificações |

---

## 9. Plano de Automações

### Arquitetura de Automações

```
Evento (trigger) → Engine de Automação → Avaliar condições → Executar ações

Triggers:
  - project.created
  - project.stage.changed
  - task.created / task.updated / task.completed
  - task.overdue (scheduler)
  - task.deadline.approaching (scheduler)
  - file.uploaded
  - approval.submitted / approval.approved / approval.rejected
  - project.completed

Conditions (avaliadas em runtime):
  - stage == 'x'
  - role == 'y'
  - priority >= 'high'
  - days_until_deadline <= 3

Actions:
  - create_task
  - create_checklist
  - send_notification
  - change_status
  - advance_stage
  - assign_user
  - share_with_client
  - send_email
  - webhook
```

Automações são definidas como JSON no banco e processadas pelo Worker via BullMQ.

---

## 10. Roadmap

### Fase 1 — MVP (8-10 semanas)
- Auth com JWT + RBAC
- CRUD de projetos, tarefas, subtarefas
- Upload de arquivos com S3
- Workflow por etapas
- Comentários
- Dashboard básico
- Portal do cliente (read-only)
- Notificações in-app

### Fase 2 — Produtividade (6-8 semanas)
- Aprovações completas
- Automações básicas (templates de tarefa)
- Menções em comentários
- Apontamento de tempo
- Filtros e busca avançada
- Notificações por e-mail
- Versionamento de arquivos

### Fase 3 — Escala (6-8 semanas)
- Automações avançadas (engine completa)
- Dashboard analítico
- Relatórios exportáveis
- Webhooks
- API pública
- Integrações (Slack, Google Drive)
- MFA completo
- Auditoria avançada

---

## 11. Riscos Técnicos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Complexidade do RBAC | Bugs de autorização | Guards centralizados + testes automatizados por perfil |
| Performance com muitos projetos | Lentidão | Índices compostos, paginação cursor-based, cache Redis |
| Upload de arquivos grandes | Timeout | Presigned URLs (upload direto para S3) |
| Automações em loop | Recursos esgotados | Rate limit por automação, profundidade máxima, circuit breaker |
| Segregação cliente/interno | Vazamento de dados | Middleware de visibilidade obrigatório, testes de isolamento |
| Dependência de Redis | SPOF | ElastiCache Multi-AZ, fallback graceful |
| Schema migrations em prod | Downtime | Migrations non-breaking, blue-green deploy |
| Custo AWS crescente | Orçamento | Alertas de billing, right-sizing mensal |

---

## 12. Telas e Componentes

### Área Interna
1. **Login** — email/senha, MFA
2. **Dashboard** — cards de resumo, projetos recentes, tarefas urgentes, gráfico de progresso
3. **Projetos** — tabela com filtros, busca, criação rápida
4. **Detalhe Projeto** — tabs: overview, tarefas (board/lista), arquivos, aprovações, equipe, histórico
5. **Board de Tarefas** — Kanban ou lista, drag-and-drop por status
6. **Detalhe Tarefa** — sidebar ou modal: info, checklist, comentários, anexos, tempo
7. **Arquivos** — grid/lista, preview, versões, compartilhamento
8. **Aprovações** — lista de pendentes, ação inline
9. **Automações** — lista de regras, editor de trigger/condition/action
10. **Admin** — CRUD de usuários, roles, clientes
11. **Perfil** — dados pessoais, senha, MFA

### Portal do Cliente
1. **Login** — mesmo sistema, rota diferente
2. **Dashboard** — projetos ativos, progresso, notificações
3. **Projeto** — timeline visual, entregas, status
4. **Aprovações** — cards de entrega pendente
5. **Feedback** — formulário de solicitação
6. **Notificações** — lista cronológica
