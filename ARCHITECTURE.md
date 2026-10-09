# Arquitetura

## Dados e cache

- Axios é o único cliente HTTP da interface.
- MSW intercepta `/api/*` e persiste o cenário no navegador para suportar refresh.
- TanStack Query usa `staleTime` de 15 segundos, uma tentativa de retry para consultas e invalidação de carrinho, sessão, carteiras e cotação após mutations e reconexão.
- O carrinho visitante sobrevive ao login porque o mesmo cenário de mock é mantido; dados privados dependem de sessão.
- ETH permanece como string entre transporte e interface. O cálculo usa inteiros de 18 casas (`BigInt`) e somente arredonda a apresentação contratada em duas casas.

## Fluxos

As rotas cobrem início, detalhe, carrinho, pagamento, confirmação, login, cadastro, perfil e carteiras. Pedidos recebem uma chave de idempotência persistida durante a tentativa, validam versão do carrinho e snapshot de cotação e preservam itens e valores no recibo. Reutilizar a mesma chave com conteúdo diferente retorna conflito; uma cotação alterada exige revisão.

- A autenticação é apresentada como modal nas telas que a acionam; não há rota isolada para login ou cadastro.
- O checkout preenche nome, e-mail, perfil e carteira a partir da sessão simulada. O usuário pode optar por informar outra carteira.
- Perfil e carteiras persistem no cenário local. O upload de avatar é salvo como data URL no mock, e os campos de senha passam por validação sem armazenar a senha no perfil.
- O catálogo foi separado em conteúdo e componentes (`src/features/marketplace/`); os componentes de conta e a confirmação de pedido vivem em módulos próprios para evitar uma página monolítica.
- `Button` e os demais primitives em `src/components/ui/` seguem a composição do shadcn/ui e são tematizados para a identidade Kurio.

## Tempo real simulado

O cliente usa `socket.io-client` em `src/realtime.ts`, com os eventos versionados `nft.updated` e `order.updated`. No ambiente de mocks, o handler WebSocket do MSW é adaptado com `@mswjs/socket.io-binding`; após a inscrição ele emite uma atualização de disponibilidade/preço para exercitar a reconciliação. Eventos antigos são ignorados pela versão do recurso e o cleanup remove listeners e encerra a conexão ao desmontar a árvore.

Após `connect` e `reconnect`, a assinatura é refeita e carrinho/cotação são invalidados para reconciliação REST. Os cenários reprodutíveis de MSW são selecionados pela chave `kurio-mock-scenario` e incluem lentidão, timeout, indisponibilidade, sessão expirada, resultado vazio, alteração de preço, pedido pendente e pedido recusado.

Em uma entrega com backend, os handlers MSW seriam trocados pela URL do serviço Socket.IO, sem alterar a camada de cache ou os contratos de eventos.
