# Kurio — Marketplace de NFTs

Marketplace de NFTs em React + TypeScript implementado a partir do Figma, com descoberta, compra e conta do
colecionador em desktop e mobile. API REST, autenticação, carteiras, pagamentos e eventos em tempo real são
simulados com **MSW** (inclusive Socket.IO, via `@mswjs/socket.io-binding`), também no build de demonstração.

Stack: React 18, TypeScript, Vite, TanStack Router, TanStack Query, Axios, Socket.IO client, Tailwind CSS,
shadcn/ui (Radix), react-hook-form + zod, MSW, Playwright e Lighthouse.

## Setup

Requisitos: Node.js 20+ (testado com 22.20) e npm.

```bash
npm install
npx playwright install chromium   # navegador dos testes E2E (e da auditoria, se não houver Chrome)
npm run dev                        # http://localhost:5173 com mocks ativos
```

### Variáveis de ambiente

Copie `.env.example` para `.env` se quiser alterar os padrões:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | `false` desliga o MSW (para apontar para um backend real). `?no-mocks` na URL também desliga. |
| `VITE_API_URL` | `/api` | Base da API REST. |
| `VITE_SOCKET_URL` | origem da página | Servidor Socket.IO (path `/realtime`). |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Verificação de tipos + build de produção (mocks incluídos) |
| `npm run preview` | Serve o build em `http://localhost:4173` |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright contra o build (desktop 1440 px e mobile 390 px, Chromium) |
| `npm run test:e2e:dev` | Mesmos testes contra o servidor de desenvolvimento |
| `npm run test:e2e:update` | Regenera as baselines de regressão visual |
| `npm run test:e2e:report` | Abre o relatório HTML (`playwright-report/`); traces das falhas em `test-results/` |
| `npm run audit` | Lighthouse (início e detalhe, mobile e desktop, 3 execuções) → `reports/lighthouse/` |

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Colecionador Demo | `demo@kurio.test` | `123456` |
| Ana Ribeiro | `ana@kurio.test` | `colecao123` |

Cupons: `KURIO10` (10% de desconto) e `EXPIRADO` (expirado). Qualquer outro código é inválido.
Senhas são armazenadas apenas como hash SHA-256 com sal.

## Cenários da simulação

O estado da API simulada (catálogo, usuários, sessões, carrinhos, favoritos, carteiras e pedidos) persiste no
`localStorage` para sobreviver a refresh.

O jeito mais simples é o **painel de simulação**: a aba "Simulação: &lt;cenário&gt;" na borda esquerda da tela
(presente sempre que o MSW está ativo, inclusive no deploy). Ela mostra o cenário atual (destacada quando não é o
`default`), permite escolher outro com a descrição do efeito, aplicar e recarregar, ou resetar todos os dados.

Também é possível selecionar cenários pela URL ou pelo console:

```text
http://localhost:5173/?scenario=slow          # aplica o cenário e recarrega normalmente
http://localhost:5173/?reset-mocks            # restaura integralmente o cenário conhecido
```

```js
__kurioMocks.setScenario('payment-declined')   // troca o cenário em tempo de execução
__kurioMocks.reset()                           // reset completo (dados + cenário)
__kurioMocks.scenarios                         // lista com descrição de cada cenário
```

| Cenário | Efeito |
| --- | --- |
| `default` | Latência curta; pagamento confirmado após 1,5 s |
| `slow` | Todas as respostas em 1,5 s (skeletons) |
| `variable-latency` | Página 1 do catálogo em 1,8 s, demais em 150 ms (respostas fora de ordem) |
| `timeout` | Catálogo e detalhe excedem o timeout do cliente (8 s) |
| `offline` | Falha de conexão em todas as chamadas |
| `server-error` | Catálogo e detalhe respondem HTTP 500 |
| `empty` | Catálogo vazio |
| `session-expired` | Toda chamada autenticada responde 401 `SESSION_EXPIRED` |
| `price-changed` | O preço do 1º item do carrinho sobe ao confirmar o pedido |
| `sold-out` | A edição do 1º item esgota ao confirmar o pedido |
| `order-timeout` | O pedido é criado, mas a 1ª resposta excede o timeout |
| `payment-pending` | Pagamento pendente por 8 s antes de confirmar |
| `payment-declined` | Pagamento recusado |
| `favorites-fail` | Incluir/remover favorito responde 503 (rollback otimista) |
| `wallet-reject` | A carteira recusa a conexão |
| `live-market` | Preços dos itens em carrinhos mudam a cada 15 s via Socket.IO |

### Links diretos por cenário (deploy)

Cada link aplica o cenário e abre a tela onde o efeito aparece. O cenário fica salvo no navegador até ser trocado;
volte ao normal com https://kurio.izaque.dev/?reset-mocks ou pelo botão "Resetar dados" do painel. Os cenários de
checkout pedem login (`demo@kurio.test` / `123456`) e um item no carrinho. Localmente, troque o domínio por
`http://localhost:5173`.

| Cenário | Link | O que observar |
| --- | --- | --- |
| `default` | https://kurio.izaque.dev/?scenario=default | Fluxo normal; pagamento confirmado após 1,5 s |
| `slow` | https://kurio.izaque.dev/?scenario=slow | Skeletons no catálogo (também em `/nft/sage-009?scenario=slow` e `/cart?scenario=slow`) |
| `variable-latency` | https://kurio.izaque.dev/?scenario=variable-latency | Troque de página rapidamente: a resposta antiga não sobrescreve a nova |
| `timeout` | https://kurio.izaque.dev/?scenario=timeout | Catálogo excede o timeout (8 s) e mostra erro com "Tentar novamente" |
| `offline` | https://kurio.izaque.dev/nft/sage-009?scenario=offline | "Sem conexão com o servidor" com "Tentar novamente" |
| `server-error` | https://kurio.izaque.dev/?scenario=server-error | HTTP 500 após as novas tentativas automáticas (~15 s) |
| `empty` | https://kurio.izaque.dev/?scenario=empty | Catálogo vazio com opção de limpar filtros |
| `session-expired` | https://kurio.izaque.dev/account?scenario=session-expired | Com login feito, a sessão expira e o app pede novo login, voltando à tela anterior |
| `price-changed` | https://kurio.izaque.dev/checkout?scenario=price-changed | Ao confirmar, o preço muda e exige nova confirmação |
| `sold-out` | https://kurio.izaque.dev/checkout?scenario=sold-out | Ao confirmar, a edição esgota; a compra é bloqueada e o carrinho preservado |
| `order-timeout` | https://kurio.izaque.dev/checkout?scenario=order-timeout | A resposta excede o timeout; o app reenvia e recupera o mesmo pedido |
| `payment-pending` | https://kurio.izaque.dev/checkout?scenario=payment-pending | Pedido pendente por 8 s; recarregue no meio para ver a retomada |
| `payment-declined` | https://kurio.izaque.dev/checkout?scenario=payment-declined | Pagamento recusado; os itens continuam no carrinho |
| `favorites-fail` | https://kurio.izaque.dev/nft/sage-009?scenario=favorites-fail | Com login, favoritar volta ao estado anterior e mostra aviso de erro |
| `wallet-reject` | https://kurio.izaque.dev/checkout?scenario=wallet-reject | A carteira recusa a conexão e o envio fica bloqueado |
| `live-market` | https://kurio.izaque.dev/cart?scenario=live-market | Com item no carrinho, o preço muda a cada 15 s e o resumo é atualizado |

### Reproduzindo os fluxos de falha

- **Tempo real no checkout**: com um item no carrinho e o checkout aberto, rode
  `__kurioMocks.updateNft('sage-009', { price: '1.80' })`. O aviso aparece, o resumo é atualizado e a confirmação
  fica bloqueada até aceitar o novo total. Para esgotar uma edição:
  `__kurioMocks.updateNft('sage-009', { editions: [{ label: '1/10', available: 0 }] })`.
- **Eventos duplicados/antigos**: `__kurioMocks.replayLastEvent()` e `__kurioMocks.emitStaleNftEvent('sage-009', '0.50')`.
- **Queda de conexão com pedido pendente**: cenário `payment-pending`, confirme a compra e rode
  `__kurioMocks.dropConnections()` (ou recarregue a página). Para liquidar na hora:
  `__kurioMocks.settleOrder('<id>', 'confirmed')`. `__kurioMocks.orders()` lista os pedidos criados.
- **Timeout com recuperação**: cenário `order-timeout` e confirme a compra; após o timeout o cliente reenvia com a
  mesma chave e recupera o mesmo pedido.
- **Sessão expirada**: cenário `session-expired` em qualquer tela privada (os dados do checkout são preservados
  para depois do login), ou aguarde 30 min sem atividade.

## Deploy

O build é estático (`dist/`) e inclui o worker do MSW (`public/mockServiceWorker.js`), então mocks e tempo real
funcionam no ambiente publicado. `vercel.json` (Vercel) e `public/_redirects` (Netlify/Cloudflare Pages) reescrevem
as rotas para `index.html`, permitindo acesso direto e refresh em qualquer rota.

**URL pública:** https://kurio.izaque.dev/

## Documentação

- [ARCHITECTURE.md](ARCHITECTURE.md) — decisões, cache, sessão, carrinho, tempo real, limitações e desvios do Figma.
- [docs/API.md](docs/API.md) — contratos REST, erros e eventos Socket.IO.
- [reports/lighthouse/SUMMARY.md](reports/lighthouse/SUMMARY.md) — resultados da auditoria (gerado por `npm run audit`).
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md) — análise de LCP/CLS/TBT, otimizações e justificativa do item abaixo da meta.
