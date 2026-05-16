import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Orkestria API')
  .setDescription(`
## Visão geral

API REST para o sistema de gestão de projetos de marketing Orkestria.

### Autenticação

Todas as rotas (exceto login e forgot-password) requerem um Bearer Token JWT.

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

O access token expira em 15 minutos. Use o endpoint \`/auth/refresh\` com o refresh token para obter um novo par de tokens.

### Perfis (RBAC)

| Perfil | Descrição |
|--------|-----------|
| ADMIN | Acesso total ao sistema |
| STRATEGIST | Cria e gerencia projetos e equipes |
| COPYWRITER | Executa tarefas de redação |
| TRAFFIC_MANAGER | Gerencia campanhas de tráfego |
| SOCIAL_MEDIA | Gerencia redes sociais |
| DESIGNER | Executa tarefas de design |
| CLIENT | Acesso restrito ao portal do cliente |

### Paginação

Endpoints que retornam listas usam paginação:

\`\`\`json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
\`\`\`

### Erros

\`\`\`json
{
  "statusCode": 400,
  "message": "Erro de validação",
  "errors": ["email must be an email"],
  "timestamp": "2025-10-15T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
\`\`\`
  `)
  .setVersion('1.0.0')
  .setContact('Orkestria', 'https://orkestria.com', 'contato@orkestria.com')
  .addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Access token obtido via POST /auth/login',
  })
  .addTag('Auth', 'Autenticação e gerenciamento de sessão')
  .addTag('Users', 'CRUD de usuários (Admin)')
  .addTag('Roles', 'Listagem de perfis')
  .addTag('Clients', 'Gerenciamento de clientes')
  .addTag('Projects', 'CRUD de projetos e membros')
  .addTag('Stages', 'Etapas do workflow do projeto')
  .addTag('Tasks', 'CRUD de tarefas e subtarefas')
  .addTag('Comments', 'Comentários em tarefas')
  .addTag('Files', 'Upload e download de arquivos via S3')
  .addTag('Approvals', 'Fluxo de aprovação interno e do cliente')
  .addTag('Notifications', 'Notificações in-app')
  .addTag('Automations', 'Regras de automação trigger/condition/action')
  .addTag('Audit', 'Logs de auditoria')
  .addTag('Reports', 'Relatórios e exportações')
  .addTag('Search', 'Busca global full-text')
  .addTag('Client Portal', 'Portal do cliente (visão restrita)')
  .addTag('Health', 'Health checks para monitoramento')
  .build();

export const swaggerOptions: SwaggerCustomOptions = {
  customSiteTitle: 'Orkestria API Docs',
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { font-size: 28px; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
  },
};
