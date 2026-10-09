# Performance e Lighthouse — análise

Resultados versionados em [`reports/lighthouse/SUMMARY.md`](../reports/lighthouse/SUMMARY.md) (mediana de 3
execuções por página e perfil; HTML/JSON de cada execução na mesma pasta). Reproduza com `npm run audit`.

| Página / perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop · início | 100 | 96 | 100 | 100 | 0,80 s | 0,001 | 0 ms |
| desktop · detalhe | 99 | 97 | 100 | 100 | 0,82 s | 0,047 | 0 ms |
| mobile · início | 88 | 100 | 100 | 100 | 3,51 s | 0 | 39 ms |
| mobile · detalhe | 85 | 97 | 100 | 100 | 3,73 s | 0 | 48 ms |

Todas as categorias atingem a meta na medição local, exceto **Performance no perfil mobile (85–88 contra 90)**.
Em produção o PageSpeed Insights mede **93** no mobile (ver abaixo).

## Por que o mobile local fica em 85–88

O perfil mobile do Lighthouse simula um Moto G Power em "slow 4G": 150 ms de RTT, **~560 ms de latência por
requisição**, 1,6 Mbps e CPU 4× mais lenta. A aplicação é renderizada só no cliente (SPA, sem SSR): o HTML chega
vazio e o primeiro conteúdo só aparece depois de baixar e executar React, TanStack e o código da tela (~150 KB gzip,
três requisições em paralelo). Com a latência simulada, isso sozinho leva o FCP a ~2,3 s; o LCP (banner do hero no
mobile e imagem do NFT no detalhe) vem logo depois da renderização, em ~3,4–3,5 s. TBT (≈30 ms) e CLS (0) estão na
faixa ótima — a nota é limitada pelo tempo até a primeira renderização, não por trabalho na thread principal.

A única forma de fechar a diferença seria **pré-renderizar o HTML** (SSG/SSR) da página inicial e do detalhe, o que
muda a arquitetura de build (Vite SPA). Ficou registrado como próximo passo; não foi adotada nenhuma otimização
exclusiva para a auditoria.

## Medição em produção (PageSpeed Insights)

No deploy público (`https://kurio.izaque.dev/`, CDN da Vercel com HTTP/2, compressão e cache imutável dos
assets), o PageSpeed Insights no perfil **celular** registrou **Desempenho 93**, Acessibilidade 100, Práticas
recomendadas 96 e SEO 100 (FCP 2,2 s, LCP 2,9 s). É o mesmo build e o mesmo
cenário de mocks; a diferença em relação à medição local vem do ambiente de laboratório (máquina e calibração de CPU
dos servidores do PageSpeed, servidor HTTP/2 da Vercel em vez do `vite preview`). Como o FCP/LCP está próximo do
limiar da nota 90, pequenas variações de ambiente mudam o resultado. A mediana local continua sendo o número
reproduzível reportado em `SUMMARY.md`; a medição de produção mostra que a meta é atingida no ambiente publicado,
sem otimizações exclusivas para a auditoria.

## O que foi feito

| Mudança | Efeito |
| --- | --- |
| Perfil desktop do Lighthouse corrigido para o throttling oficial de desktop (antes herdava o throttling mobile) | Medição correta do desktop |
| Imagens dos NFTs convertidas para WebP (mesma arte do Figma): ~1,9 MB → 33–48 KB cada | LCP desktop de 4,1 s para 0,8 s |
| Interface renderiza sem esperar o MSW; Axios e Socket.IO aguardam o transporte ficar pronto | FCP não depende mais da camada de mocks |
| `socket.io-client`, telas secundárias (code splitting por rota), formulário de login (react-hook-form + zod) e Radix Dialog carregados sob demanda; validação de search params sem zod no bundle inicial | Bundle inicial de 111 KB para 45 KB gzip |
| `preload` da imagem de LCP por faixa de largura e art direction (`<picture>`) para o destaque de desktop não ser baixado no mobile | Menos disputa de banda antes do LCP |
| Dimensões intrínsecas no banner mobile e nos ícones | CLS do mobile de 0,159 para 0 |
| Fonte Roboto Mono local (`@fontsource`, só latino, `font-display: swap`) | Sem CDN externo e sem bloqueio de texto |
| `robots.txt`, alvo do "pular para o conteúdo" na home e alvos de toque ≥ 24 px no rodapé | SEO 92 → 100, Accessibility 94 → 96–100 |

## Itens informativos restantes

- **bf-cache**: a página mantém um WebSocket aberto (tempo real), o que impede o back/forward cache por definição.
- **JavaScript não utilizado (~60 KB)**: majoritariamente o MSW e trechos do router usados em outras rotas; o MSW só
  existe no build de demonstração.
- **CLS de 0,047 no detalhe desktop**: o carrossel "Mais desta coleção" chega depois do conteúdo principal (vem de uma
  consulta separada); está dentro da faixa "bom" (< 0,1).
