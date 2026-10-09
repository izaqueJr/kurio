# Kurio Marketplace

Marketplace de NFTs em React, TypeScript e Tailwind, implementado a partir do Figma. A aplicação roda inteiramente com APIs simuladas pelo MSW.

## Comandos

```bash
npm install
npm run dev
npm run preview
npm run build
npm run typecheck
npm run lint
npm run test:e2e
npm run test:e2e:update
npm run audit
```

O worker do MSW é iniciado por padrão. Acrescente `?no-mocks` à URL para desativá-lo durante uma integração externa.

## Credenciais e cenários

Use `demo@kurio.test` e `123456` para entrar. O cupom `KURIO10` aplica 10% de desconto; `EXPIRADO` e qualquer outro valor exercitam os erros. O estado simulado de carrinho, sessão, favoritos, perfil, carteiras e pedidos fica em `localStorage`; limpe as chaves `kurio-mock-store-v1` e `kurio-session` para voltar ao cenário inicial.

Para reproduzir estados de rede, defina `localStorage.setItem('kurio-mock-scenario', '<cenário>')` e recarregue a página. Os cenários disponíveis são `slow`, `timeout`, `offline`, `empty`, `session-expired`, `price-changed`, `payment-pending` e `payment-declined`; remova a chave para retornar ao padrão. O checkout envia a cotação e a versão do carrinho, e reutiliza a mesma chave de idempotência enquanto a tentativa está em aberto.

## Contratos e arquitetura

Os handlers REST estão em `src/mocks/handlers.ts`. Eles representam sessão, catálogo, favoritos, carrinho, cotação, pedido, perfil e carteiras. O Axios concentra o transporte em `src/api/client.ts`, TanStack Query controla cache e mutations, e TanStack Router protege o acesso visual a perfil e carteiras. Os valores em ETH são strings e os cálculos de cotação usam inteiros de precisão fixa — nunca `Number`.

Os componentes de interface reutilizam os primitives shadcn adaptados em `src/components/ui/`; as páginas compartilham componentes de autenticação, conta, confirmação e catálogo. Os testes Playwright executam os fluxos em desktop e no viewport de 390 px, com baselines de regressão visual em `tests/marketplace.spec.ts-snapshots/`. `npm run audit` cria seis auditorias (início e detalhe, desktop e mobile, três execuções cada) e grava a mediana em `output/lighthouse/summary.json`. Veja `ARCHITECTURE.md` para decisões e limitações conhecidas.
