# Arquitetura

## Organização

```
src/
  domain.ts              contratos tipados (REST, eventos) + aritmética de ETH em BigInt
  api/client.ts          Axios: token, id do visitante, normalização de erros (ApiError), detecção de sessão expirada
  api/queries.ts         chaves de cache, hooks de consulta/mutation e troca de identidade
  api/session-storage.ts token de sessão, id do visitante e marcador de expiração
  realtime.ts            cliente Socket.IO: deduplicação, versões, reconexão e reconciliação com o REST
  router.tsx             rotas, validação de search params, proteção (beforeLoad), 404, política de cache
  pages/                 telas (detalhe, carrinho, checkout, pedido, conta, favoritos, login/cadastro, 404)
  features/marketplace/  catálogo (filtros, ordenação, busca, cards)
  components/            layout, cabeçalho, rodapé, autenticação, recibo; ui/ = primitives shadcn/ui
  lib/                   anúncios acessíveis, avisos em tempo real, idempotência e rascunhos
  mocks/                 MSW: fixtures, "banco" persistente, handlers REST, servidor Socket.IO, cenários, controles
tests/                   Playwright (E2E + regressão visual), baselines em tests/__screenshots__/
scripts/audit.mjs        auditoria Lighthouse reproduzível
```

Interface, hooks e cliente Axios **não contêm dados fictícios**: tudo vem da API (simulada pelo MSW ou real).
As fixtures vivem apenas em `src/mocks/` e só são carregadas quando o MSW está ativo.

## Dados, cache e estado assíncrono

- **Axios** é o único transporte REST. O interceptor injeta `Authorization` e `x-guest-id`, converte qualquer falha
  em `ApiError { code, message, fields }` e dispara o fluxo de sessão expirada em `SESSION_EXPIRED`.
- **TanStack Query** — política padrão (`router.tsx`):
  - `staleTime` de 15 s; sem refetch ao focar a janela (o tempo real cobre as mudanças relevantes);
  - retry apenas para falhas transitórias (rede, timeout, 5xx), até 2 vezes com backoff exponencial;
  - mutations nunca são repetidas, exceto a criação de pedido em timeout/queda de rede (é idempotente);
  - pedido pendente consulta o REST a cada 5 s como salvaguarda; o Socket.IO é a fonte principal.
- **Isolamento**: chaves privadas incluem o usuário (`['favorites', userId]`, `['wallets', userId]`,
  `['order', userId, id]`, `['quote', userId, cartVersion]`) e o carrinho inclui o dono (`['cart', 'user:<id>' | 'guest']`).
  Na troca de identidade (login, cadastro, logout, expiração) as consultas inativas são removidas e as ativas são
  zeradas e refeitas (`resetQueries`) — nada da sessão anterior permanece visível. O socket é recriado.
- **Respostas obsoletas**: toda consulta recebe o `AbortSignal` do Query; cada combinação de filtros tem sua chave,
  então uma resposta atrasada nunca sobrescreve a consulta atual (coberto pelo cenário `variable-latency`).
- **Invalidação**: mutations do carrinho gravam a resposta (o `Cart` completo com cotação) e invalidam a cotação;
  favoritos e carteiras invalidam suas listas; eventos invalidam carrinho/cotação/pedido afetados.
- **Atualização otimista**: favoritar/desfavoritar aplica o resultado na hora, faz rollback em caso de erro e anuncia
  o resultado em `aria-live` (cenário `favorites-fail`).
- **ETH**: strings decimais do transporte à interface; somas e multiplicações em `BigInt` com 18 casas
  (`domain.ts`). A cotação do servidor é a referência para finalizar o pedido.

## Rotas e sessão

- Search params do catálogo (`q, category, network, sort, tab, min, max, page`) são validados com zod e são a
  única fonte do estado de filtros: sobrevivem a refresh e ao histórico. Mudar filtro/busca/ordenação reinicia a página.
- `/checkout`, `/order/$id`, `/perfil`, `/carteiras` e `/favoritos` são protegidas no `beforeLoad`: sem sessão,
  redirecionam para `/login?redirect=<destino>` (motivo `required` ou `expired`).
- Sessão: token opaco em `localStorage`, 30 min deslizantes no servidor, recuperada no carregamento via `GET /session`.
- **Expiração** em qualquer chamada: limpa o cache privado, anuncia e redireciona ao login preservando o destino.
  O checkout grava um rascunho do formulário em `sessionStorage`, restaurado após o novo login.
- Login e cadastro existem como páginas (`/login`, `/cadastro`, acesso direto) e como modal no cabeçalho.

## Carrinho

- O servidor é dono do carrinho e da cotação. Visitantes têm um carrinho anônimo (`x-guest-id`), mesclado ao da
  conta no login/cadastro respeitando a disponibilidade. Após logout é gerado um novo id de visitante.
- Linhas são por NFT + edição; a disponibilidade é validada por edição em toda alteração e na criação do pedido.
- Linhas acima da disponibilidade (ex.: após um evento) são sinalizadas e bloqueiam a finalização.

## Pagamento e pedidos

1. O checkout busca a cotação (`POST /quote`); a primeira cotação vista é a "aceita".
2. Qualquer mudança posterior (evento em tempo real ou `409 QUOTE_CHANGED`) desativa a confirmação até o usuário
   aceitar o novo total.
3. A carteira cadastrada precisa ser conectada (simulação de aprovação, recusa e desconexão).
4. Validação dos campos → diálogo de revisão → `POST /orders` com `idempotencyKey`.
5. A chave é derivada da tentativa (cotação + carteira + rede + versão do carrinho) e guardada em `sessionStorage`:
   cliques repetidos, reenvio após timeout e refresh reutilizam a mesma chave; o servidor devolve o mesmo pedido.
6. O pedido nasce `pending`; a tela acompanha por Socket.IO (com consulta REST de salvaguarda). Confirmação e
   recusa são terminais. O recibo só aparece para pedido `confirmed` e usa o snapshot gravado no pedido.

## Tempo real (Socket.IO)

- **Transporte**: o cliente usa `socket.io-client` com `transports: ['websocket']` no path `/realtime`. Em
  demonstração o MSW intercepta o WebSocket (`ws.link`) e o `@mswjs/socket.io-binding` codifica o protocolo
  Engine.IO/Socket.IO. O servidor simulado envia pings do Engine.IO para manter a conexão.
- **Eventos**: `nft.updated` (broadcast) e `order.updated` (apenas para conexões autenticadas do dono), com
  `eventId`, recurso e `version`. Toda mudança passa pelo "banco" simulado, então REST e eventos ficam consistentes.
- **Ordem e duplicatas**: o cliente descarta `eventId` repetidos e versões ≤ à última conhecida (inclusive versões
  vistas em respostas REST), sem regredir estado nem reaplicar efeitos.
- **Reconexão**: após reconectar, carrinho, cotação, pedidos e NFTs ativos são revalidados no REST.
- **Sessão**: trocar de token fecha a conexão, limpa o registro de eventos e reassina com a nova identidade; os
  listeners são removidos quando a árvore desmonta.

### Limitações do transporte simulado

- O binding não suporta namespaces, salas nem polling HTTP: o cliente usa apenas WebSocket no namespace `/`.
- O handshake é emulado (`sid` fixo); não há ack nem compressão.
- O "servidor" roda na própria aba: eventos não cruzam abas e timers de liquidação são recriados ao recarregar
  (pedidos vencidos são liquidados na próxima consulta ou assinatura).
- O `socket.io-client` é importado depois que o MSW inicia, porque o Engine.IO captura `globalThis.WebSocket` ao ser
  avaliado. Em produção com backend real basta definir `VITE_SOCKET_URL` e `VITE_ENABLE_MOCKS=false`.

## Mocks (MSW)

- `mocks/db.ts`: estado único (produtos, usuários, sessões, carrinhos, favoritos, carteiras, pedidos) persistido em
  `localStorage`; `reset` restaura o cenário conhecido. `mocks/fixtures.ts`: 100 NFTs com edições, 2 usuários,
  carteiras, favoritos e cupons determinísticos.
- `mocks/scenarios.ts`: latência, falhas e regras de negócio por cenário (lista no README).
- `mocks/control.ts`: `window.__kurioMocks` para demonstração e testes (cenários, reset, eventos, liquidação de
  pedidos, quedas de conexão). Os testes de tempo real passam por esse servidor e pelo `socket.io-client`.

## Acessibilidade

- Link "Pular para o conteúdo", foco visível em todos os controles, navegação completa por teclado
  (abas com setas, menu de ordenação com setas/Escape, carrossel com setas).
- Diálogos e drawer usam o Dialog do shadcn/ui (Radix): foco preso, Escape fecha e o foco volta ao gatilho.
- Campos com `label`, `aria-invalid` e `aria-describedby` apontando para a mensagem de erro; erros da API são
  mapeados para os campos.
- Mutations e eventos em tempo real são anunciados em regiões `aria-live` persistentes; estados não dependem só de
  cor (ícones e textos para erro, esgotado, conectada, etc.).
- Skeletons com shimmer preservam as dimensões do conteúdo e o shimmer, o carrossel do hero e o spinner respeitam
  `prefers-reduced-motion`.

## Decisões de UX e desvios do Figma

- **Fonte**: Roboto Mono servida localmente (`@fontsource/roboto-mono`, subconjunto latino) — antes não era carregada.
- **Imagens**: os PNGs dos NFTs e o banner mobile (exportados do Figma, ~1,9 MB cada) são servidos como WebP
  derivados da mesma arte (`scripts/optimize-images.mjs`); os originais permanecem em `public/assets/figma/`.
- **Rodapé**: links com altura mínima de 24 px (alvo de toque WCAG), alguns pixels mais espaçados que no Figma.
- **Painel de pagamento mobile**: o resumo do carrinho é uma folha fixa no rodapé, como no frame mobile.
- **Ordenação no mobile**: o Figma não mostra o seletor; ele fica dentro do drawer de filtros.
- **Navegação da conta no mobile**: sem barra lateral no frame mobile, há uma barra de atalhos (Perfil, Carteiras,
  Favoritos, Sair).
- **Larguras intermediárias (901–1247 px)**: as colunas fixas do carrinho, checkout e detalhe ficam fluidas para
  evitar overflow horizontal.
- **Carrosséis de produtos** (detalhe e carrinho): Swiper com 5 itens no desktop, 3 no tablet e 2 no mobile,
  arrastar com mouse/toque, setas do teclado e os mesmos dots do Figma. O carrinho mostra 10 sugestões para haver
  paginação.
- **Rodapé no mobile**: "Meu perfil", "Central de ajuda" e "Coleções" viram acordeões nativos (`<details>`), fechados
  por padrão, para encurtar a página; no desktop as colunas seguem abertas como no Figma. A página reserva espaço para a
  navegação inferior fixa não cobrir o fim do rodapé.
- **Menu do cabeçalho**: só a seção da URL atual fica marcada (`/` + âncora); nas demais páginas nenhum item fica ativo.
- **Edições indisponíveis** aparecem tracejadas/riscadas e desativadas; NFTs esgotados exibem selo "Esgotado".
- **Estados não desenhados** (erro, vazio, pendente, recusado, 404, revisão do pedido, cupom aplicado, avisos de
  tempo real) seguem a paleta e a tipografia do Figma.
- **Ações fora do escopo** (artigos, central de ajuda, atividade, ofertas, downloads, login social, recuperação de
  senha, newsletter) ficam visíveis como no layout, mas sinalizadas como indisponíveis — nunca simulam sucesso.
- **Explorador de blocos**: o recibo mostra um painel "explorador (simulado)" em vez de link para um explorer real.
- "Usar outra carteira?" leva ao cadastro de carteiras (o pagamento usa apenas carteiras cadastradas).

## Limitações conhecidas

- Sem backend real: blockchain, extensões de carteira e gateways são simulados por definição do desafio.
- Persistência em `localStorage` por navegador; abrir em outro navegador começa do cenário conhecido.
- SPA sem pré-renderização: no perfil mobile do Lighthouse a Performance fica em 88 (meta 90). Causas, medições e
  otimizações em [docs/PERFORMANCE.md](docs/PERFORMANCE.md); resultados em [reports/lighthouse/SUMMARY.md](reports/lighthouse/SUMMARY.md).
