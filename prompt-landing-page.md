# Prompt — Landing Page do Orkestria

> Documento para o Claude Design construir a landing page do Orkestria.
> Contém: briefing do produto, funcionalidades, identidade visual, design system, estrutura da página, referências e copy sugerida.

---

## 1. O QUE É O ORKESTRIA

Orkestria é uma plataforma de gestão de projetos feita para agências de marketing digital. Ela organiza o fluxo de trabalho entre a equipe interna (estrategistas, copywriters, designers, gestores de tráfego, social media) e os clientes da agência.

O nome vem de "orquestrar" — como um maestro que coordena cada instrumento para que a música funcione. O Orkestria é o maestro que garante que cada membro da equipe saiba o que fazer, quando fazer, e que o cliente acompanhe tudo sem precisar ligar ou mandar mensagem no WhatsApp.

**Público-alvo:** donos e gestores de agências de marketing digital com 2 a 50 funcionários.

**Problema que resolve:** agências perdem tempo e clientes quando gerenciam projetos por WhatsApp, planilhas e e-mails soltos. Entregas atrasam, clientes ficam sem resposta, e a equipe não sabe a prioridade do dia.

**Diferencial:** além de gerenciar projetos, o Orkestria tem um portal exclusivo para o cliente da agência acompanhar entregas, aprovar peças e enviar feedback — sem precisar de WhatsApp.

---

## 2. FUNCIONALIDADES PRINCIPAIS

### Para a equipe da agência

**Dashboard inteligente**
Visão geral com métricas em tempo real: projetos ativos, tarefas concluídas, aprovações pendentes, tarefas atrasadas. Gráfico de progresso geral e feed de atividade recente.

**Gestão de projetos com pipeline visual**
Pipeline com 6 etapas: Backlog → Planejamento → Produção → Revisão → Aprovação → Concluído. Barra de progresso por projeto, equipe visível com avatares, descrição do projeto, canais e orçamento.

**Kanban de tarefas**
Quadro drag-and-drop com colunas: A fazer, Em andamento, Em revisão, Bloqueada, Concluída. Cada tarefa tem prioridade (baixa, média, alta, urgente), prazo, checklist, responsável e comentários.

**Comentários estilo chat**
Conversa em tempo real dentro de cada tarefa, com balões estilo mensageiro. Aprovações aparecem como mensagens coloridas (verde para aprovado, vermelho para reprovado, amarelo para ajustes).

**Fluxo de aprovação com 1 clique**
Envie entregas para o cliente aprovar. O cliente recebe no portal, analisa e responde com aprovado, reprovado ou "precisa de ajustes". A equipe recebe notificação instantânea.

**Automações e templates**
Crie templates de projeto com tarefas pré-configuradas. Ao criar um novo projeto, selecione o template e o sistema gera todas as tarefas com prazos calculados e responsáveis atribuídos automaticamente pelo perfil.

**Gestão de arquivos**
Upload direto com organização por projeto. Preview de imagens, vídeos e PDFs. Cada agência tem seu espaço próprio isolado — arquivos nunca se misturam entre clientes.

**Calendário de entregas**
Visualização de todos os prazos e entregas em formato de calendário mensal.

**Notificações em tempo real**
Alertas para tarefas atribuídas, comentários, aprovações resolvidas, feedback do cliente e prazos próximos.

**Administração de equipe**
Cadastre membros com perfis específicos: Administrador, Estrategista, Copywriter, Designer, Gestor de Tráfego, Social Media. Cada perfil vê apenas o que precisa.

### Para o cliente da agência (Portal do Cliente)

**Acompanhamento em tempo real**
O cliente acessa o portal com login próprio e vê o progresso dos projetos, etapas concluídas, equipe responsável com fotos e entregas realizadas.

**Aprovações diretas**
O cliente aprova, reprova ou solicita ajustes nas entregas sem sair do portal. A equipe recebe notificação instantânea.

**Entregas visíveis**
Todas as tarefas concluídas pela equipe aparecem automaticamente na aba "Entregas" do portal, com data e responsável.

**Feedback estruturado**
O cliente envia observações sobre o andamento do projeto de forma organizada, sem precisar de WhatsApp ou email.

---

## 3. PLANOS E PREÇOS

| | Starter | Pro | Agência |
|---|---|---|---|
| **Preço** | R$ 97/mês | R$ 247/mês | R$ 497/mês |
| **Usuários** | 3 | 10 | Ilimitado |
| **Projetos** | 5 | 20 | Ilimitado |
| **Armazenamento** | 2 GB | 10 GB | 50 GB |
| **Suporte** | Email | Email + Chat | Prioritário |
| **Portal do cliente** | ✅ | ✅ | ✅ |
| **Automações** | ✅ | ✅ | ✅ |
| **Trial grátis** | 14 dias | 14 dias | 14 dias |

Todos os planos incluem portal do cliente, automações, kanban, aprovações e notificações. Sem cartão de crédito para começar.

---

## 4. IDENTIDADE VISUAL

### Logo
Hexágono azul sálvia com constelação de pontos brancos conectados (representando a rede de equipe e clientes). Arquivo SVG disponível em `/public/logo-icon.svg`.

### Paleta de cores

| Variável | Cor | Uso |
|----------|-----|-----|
| Brand | `#4B7B9C` | Botões, links, elementos principais |
| Brand hover | `#3D6A88` | Estado hover |
| Brand light | `#EBF3F7` | Backgrounds suaves, badges |
| Brand text | `#3A6280` | Texto sobre fundos claros |
| Sidebar | `#2A3F4E` | Menu lateral, headers escuros |
| Sidebar hover | `#354D5E` | Item ativo do menu |
| Background | `#FAF9F7` | Fundo geral warm |
| Card | `#FFFFFF` | Cards e containers |
| Text primary | `#1a1a1a` | Títulos |
| Text secondary | `#6b7280` | Textos auxiliares |
| Text hint | `#a09b8e` | Placeholders, timestamps |
| Success | `#059669` | Aprovado, ativo, concluído |
| Warning | `#D97706` | Trial, alertas |
| Danger | `#DC2626` | Erros, reprovado, urgente |

### Tipografia
- **Títulos:** Inter ou equivalente, peso 500-600, tracking tight (-0.5px)
- **Corpo:** Inter, peso 400, tamanho 13-14px
- **Labels/tags:** 10-11px, uppercase para badges

### Componentes visuais
- Border-radius dos cards: 18px (radius-lg)
- Border-radius dos botões: 10px
- Borders: 0.5px solid, tom suave
- Sombras: sutis (0 4px 24px rgba(0,0,0,0.06))
- Avatares: quadrados arredondados com cor consistente por nome

---

## 5. ESTRUTURA DA LANDING PAGE

### Header fixo
Logo Orkestria + nav (Funcionalidades, Planos, FAQ) + botão "Começar grátis"

### Seção 1 — Hero
- **Headline:** "Orquestre seus projetos de marketing. Sem perder o controle."
- **Subheadline:** "A plataforma que organiza sua equipe, automatiza entregas e deixa seu cliente acompanhar tudo — sem WhatsApp, sem planilha, sem caos."
- **CTA primário:** "Começar grátis por 14 dias"
- **CTA secundário:** "Ver como funciona" (âncora para seção de features)
- **Visual:** mockup do dashboard com sidebar escura e metric cards (pode ser ilustração estilizada ou screenshot com sobreposição)

### Seção 2 — Problema / Dor
Título: "Sua agência ainda gerencia projetos assim?"
3 cards de dor:
1. "Entregas atrasadas sem ninguém saber" — ícone de relógio
2. "Cliente cobrando atualização no WhatsApp" — ícone de celular
3. "Equipe sem saber a prioridade do dia" — ícone de lista confusa

### Seção 3 — Funcionalidades principais
Título: "Tudo que sua agência precisa em um só lugar"
6 cards com ícone + título + descrição curta:
1. Dashboard inteligente
2. Kanban de tarefas
3. Portal do cliente
4. Aprovações com 1 clique
5. Automações de fluxo
6. Arquivos organizados

### Seção 4 — Portal do Cliente (diferencial principal)
Título: "Seu cliente acompanha tudo. Sem precisar te ligar."
Subtítulo: "Portal exclusivo onde o cliente vê o progresso, aprova entregas e envia feedback — tudo em tempo real."
Visual: mockup do portal com projetos, equipe e botão de aprovação.

### Seção 5 — Como funciona (3 passos)
1. "Crie sua conta em 30 segundos" — cadastro simples
2. "Monte seu primeiro projeto" — adicione equipe, tarefas e prazos
3. "Seu cliente acompanha tudo" — compartilhe o portal

### Seção 6 — Planos e preços
Tabela dos 3 planos com destaque no "Pro" (badge "Popular"). CTA "Começar grátis" em cada card.

### Seção 7 — Social proof
"Agências que já usam o Orkestria" (placeholder para logos e depoimentos futuros). Pode usar números: "+200 projetos gerenciados", "+50 agências", "14 dias grátis sem cartão".

### Seção 8 — FAQ
6-8 perguntas: "Posso testar grátis?", "Como funciona o portal do cliente?", "Meus dados estão seguros?", "Posso cancelar quando quiser?", "Quantos clientes posso ter?", "Funciona no celular?"

### Seção 9 — CTA final
"Comece a orquestrar seus projetos hoje"
Subtítulo: "14 dias grátis. Sem cartão. Cancele quando quiser."
Botão: "Criar conta grátis"

### Footer
Logo + links (Funcionalidades, Planos, FAQ, Contato) + "© 2026 Orkestria. Todos os direitos reservados."

---

## 6. REFERÊNCIAS DE DESIGN E DIRETRIZES

### Sites para se inspirar (estilo, não copiar)
- **Linear.app** — dark sections, tipografia bold, animações sutis, gradientes de fundo
- **Notion.so** — clareza, hierarquia visual, whitespace generoso
- **Stripe.com** — dados apresentados com elegância, micro-interações
- **Monday.com** — energia, cores vibrantes nos cards de features
- **Vercel.com** — hero minimalista, contraste forte, código como visual
- **Raycast.com** — dark hero com glow effects, transições suaves

### O que NÃO fazer
- ❌ Não usar gradientes neon ou cores saturadas demais
- ❌ Não usar ilustrações genéricas de banco de imagem
- ❌ Não colocar texto demais — ser conciso e direto
- ❌ Não parecer feito por IA (evitar simetria perfeita, cards idênticos, padrões repetitivos)
- ❌ Não usar mais de 2 fontes
- ❌ Não carregar lento — sem imagens pesadas, usar SVG e CSS

### O que fazer
- ✅ Design assimétrico e dinâmico (cards com tamanhos diferentes, grids quebrados)
- ✅ Whitespace generoso entre seções
- ✅ Hero com impacto visual forte (gradient mesh sutil ou glow)
- ✅ Microinterações em hover (cards que sobem 2px, botões que mudam de sombra)
- ✅ Usar a paleta azul sálvia como base, com acentos em branco e tons escuros
- ✅ Mobile-first: tudo responsivo, menu hamburger, cards empilham
- ✅ Scroll animations sutis (fade-in, slide-up ao entrar na viewport)
- ✅ Bento grid para funcionalidades (estilo Apple, cards de tamanhos variados)

---

## 7. TOM DE VOZ

- Profissional mas acessível
- Falar diretamente com o dono/gestor da agência
- Usar "você" e "sua agência"
- Evitar jargões técnicos
- Transmitir organização, controle e profissionalismo
- Frases curtas e diretas
- Verbos de ação: "Organize", "Automatize", "Acompanhe", "Controle"

---

## 8. REQUISITOS TÉCNICOS

- HTML + CSS + JavaScript (ou React/Next.js)
- Totalmente responsivo (mobile, tablet, desktop)
- Performance: Lighthouse 90+
- SEO: meta tags, Open Graph, heading hierarchy, alt texts
- Acessibilidade: contraste WCAG AA, foco visível, semântico
- Animações com CSS/JS leve (IntersectionObserver para scroll animations)
- Fontes: Google Fonts (Inter, ou alternativa como Satoshi, General Sans)

---

## 9. ASSETS DISPONÍVEIS

- Logo SVG: hexágono com constelação (`/public/logo-icon.svg`)
- Favicon: `/public/favicon.ico`
- Ícones PWA: `/public/icon-192.png`, `/public/icon-512.png`
- Paleta de cores: definida nas CSS variables acima
- Sem screenshots do sistema — o designer pode criar mockups estilizados ou usar wireframes abstratos

---

## 10. OBJETIVO DE CONVERSÃO

A landing page tem um único objetivo: **fazer o visitante clicar em "Começar grátis"** e ir para a página de registro (`/register`).

Métricas de sucesso:
- Taxa de conversão do hero CTA > 5%
- Tempo de permanência > 2 minutos
- Taxa de rejeição < 50%
- Mobile conversion rate > 3%

Toda decisão de design deve servir a esse objetivo. Cada seção deve aproximar o visitante do clique.
