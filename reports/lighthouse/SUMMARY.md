# Auditoria Lighthouse

Gerado em 2026-10-09T22:50:52.425Z. Mediana de 3 execuções por página e perfil.

| Página / perfil | Performance | Accessibility | Best Practices | SEO | Agentic Browsing | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop-home | 100 ✅ | 96 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.80 s | 0.001 | 0 ms |
| desktop-detail | 99 ✅ | 97 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.82 s | 0.047 | 0 ms |
| mobile-home | 88 ⚠️ | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 3.51 s | 0 | 39 ms |
| mobile-detail | 85 ⚠️ | 97 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 3.73 s | 0 | 48 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90, Agentic Browsing = 100.

## Ambiente

- Lighthouse: 13.5.0
- Navegador: Chrome/152.0.0.0
- Node.js: v22.20.0
- Vite: vite/6.4.4 win32-x64 node-v22.20.0
- Sistema: Windows_NT 10.0.26200 (x64)
- CPU: 13th Gen Intel(R) Core(TM) i5-13420H
- Condições: Build de produção (vite build + preview em 127.0.0.1:4173), MSW ativo no cenário padrão, Chrome headless, throttling padrão do Lighthouse para cada formFactor, 3 execuções por página e perfil (mediana).

Relatórios individuais (`<perfil>-<página>-<execução>.report.html` / `.report.json`) são gerados nesta pasta por `npm run audit` e versionados junto com este resumo.
