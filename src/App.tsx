import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "./components/ui/button";
import { Skeleton } from "./components/ui/feedback";
import { cn } from "./lib/utils";
import { useNfts } from "./api/queries";
import { toApiError } from "./api/client";
import { announce } from "./lib/announcer";
import type { Network, NftListParams } from "./domain";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { MobileHomeNavigation } from "./components/mobile-home-navigation";
import {
  DEFAULT_PRICE_RANGE,
  heroSlides,
  journalEntries,
  type Artwork,
  type SortValue,
} from "./features/marketplace/content";
import {
  ArtworkCard,
  FigmaIcon,
  FilterPanel,
  getPaginationItems,
  MobileFilterDialog,
  MobileMarketControls,
  Promo,
  SortOptionsGroup,
  SortSelect,
} from "./features/marketplace/components";

const ASSETS = "/assets/figma";

type SearchPatch = {
  q?: string;
  category?: string;
  network?: Network;
  sort?: SortValue;
  tab?: "all" | "new" | "trending";
  min?: number;
  max?: number;
  page?: number;
};

function App() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const activeCategory = search.category;
  const activeSort = search.sort ?? "recent";
  const activeTab = search.tab ?? "all";
  const activePage = search.page ?? 1;
  const params: NftListParams = Object.fromEntries(
    Object.entries({
      q: search.q,
      category: activeCategory,
      network: search.network,
      sort: activeSort,
      min: search.min,
      max: search.max,
      page: activePage,
    }).filter(([, value]) => value !== undefined && value !== ""),
  );
  // Cada combinação de parâmetros tem sua própria chave de cache e a consulta anterior é
  // cancelada (AbortSignal): uma resposta antiga nunca sobrescreve o resultado atual.
  const nftQuery = useNfts(params, { keepPrevious: true });
  const priceRange = nftQuery.data?.facets.priceRange ?? DEFAULT_PRICE_RANGE;
  const activeMin = search.min ?? priceRange.min;
  const activeMax = search.max ?? priceRange.max;
  const tabs = [
    { label: "Todos os NFTs", category: undefined, sort: "recent" as const, tab: "all" as const },
    { label: "Novos lançamentos", category: undefined, sort: "recent" as const, tab: "new" as const },
    { label: "Em alta", category: undefined, sort: "price-desc" as const, tab: "trending" as const },
  ];
  const activeSlide = heroSlides[slideIndex];
  const visibleArtworks: Artwork[] = (nftQuery.data?.items ?? []).map((artwork) => ({
    id: artwork.id,
    name: artwork.name,
    token: artwork.token,
    price: `${artwork.price} ETH`,
    previous: artwork.previousPrice ? `${artwork.previousPrice} ETH` : undefined,
    image: artwork.image,
    category: artwork.category,
    network: artwork.network,
    soldOut: artwork.available === 0,
  }));
  const totalPages = Math.max(1, Math.ceil((nftQuery.data?.total ?? 0) / (nftQuery.data?.pageSize ?? 9)));
  const paginationItems = getPaginationItems(totalPages, activePage);
  const categoryCounts = nftQuery.data?.facets.categories;
  const networkCounts = nftQuery.data?.facets.networks;
  const hasFilters = Boolean(
    search.q || search.category || search.network || search.min !== undefined || search.max !== undefined,
  );
  const resultsLabel = nftQuery.data
    ? `${nftQuery.data.total} ${nftQuery.data.total === 1 ? "NFT encontrado" : "NFTs encontrados"}${search.q ? ` para "${search.q}"` : ""}, página ${activePage} de ${totalPages}.`
    : "";
  const updateSearch = (patch: SearchPatch) => {
    const scrollPosition = window.scrollY;
    void navigate({
      // Qualquer mudança de filtro, busca ou ordenação reinicia a paginação.
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? undefined }),
      resetScroll: false,
    }).then(() => {
      window.scrollTo({ top: scrollPosition, left: 0, behavior: "auto" });
    });
  };
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setSlideIndex((current) => (current + 1) % heroSlides.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const filterPanelProps = {
    selected: activeCategory,
    network: search.network,
    categoryCounts,
    networkCounts,
    priceRange,
    appliedMinimum: activeMin,
    appliedMaximum: activeMax,
  };
  return (
    <div className="page-shell">
      <SiteHeader currentSection="Início" showDivider />
      <MobileMarketControls onOpenFilters={() => setFiltersOpen(true)} />
      <main id="inicio">
        <span id="conteudo" tabIndex={-1} />
        <section className="hero">
          <Link
            to="/"
            hash="mercado"
            className="hero__mobile-banner"
            aria-label="Explorar NFTs no mercado"
          >
            <img
              src={`${ASSETS}/hero-banner-mobile.webp`}
              alt="Seja dono da cultura digital"
              width={366}
              height={190}
              {...{ fetchpriority: "high" }}
            />
          </Link>
          <div className="hero__copy">
            <p className="kicker">Bem-vindo a Kurio</p>
            <h1>
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>
            <p className="hero__description">
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              Colecione arte digital rara, apoie artistas e tenha uma parte da
              cultura da internet.
            </p>
            <Button asChild className="explore-button">
              <Link to="/" hash="mercado">Explorar</Link>
            </Button>
          </div>
          <div className="hero__feature">
            {/* Art direction: abaixo de 900 px o destaque fica oculto (o banner mobile o substitui),
                então nenhuma imagem é baixada nessa faixa. */}
            <picture key={activeSlide.image}>
              <source media="(max-width: 900px)" srcSet="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" />
              <img
                src={`${ASSETS}/${activeSlide.image}`}
                alt={activeSlide.alt}
                {...{ fetchpriority: slideIndex === 0 ? "high" : "auto" }}
              />
            </picture>
          </div>
          <div className="hero__dots" role="group" aria-label="Slides em destaque">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.image}
                type="button"
                aria-label={`Mostrar slide ${index + 1}`}
                aria-current={slideIndex === index ? "true" : undefined}
                className={cn(slideIndex === index && "is-active")}
                onClick={() => setSlideIndex(index)}
              />
            ))}
          </div>
        </section>
        <section id="mercado" className="marketplace" aria-label="Mercado de NFTs">
          <div className="market-sidebar">
            <FilterPanel
              {...filterPanelProps}
              onCategoryChange={(category) => updateSearch({ category })}
              onNetworkChange={(network) => updateSearch({ network })}
              onPriceApply={(minimum, maximum) => updateSearch({ min: minimum, max: maximum })}
            />
            <article className="featured-nft">
              <p>NFT EM DESTAQUE</p>
              <h2>OFERTA LIMITADA</h2>
              <img
                src={`${ASSETS}/ape-purple.webp`}
                alt="Cosmic Bloom, NFT em destaque"
                loading="lazy" decoding="async" {...{ fetchpriority: "low" }}
              />
            </article>
          </div>
          <MobileFilterDialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SortOptionsGroup
              value={activeSort}
              onChange={(sort) => {
                updateSearch({ sort });
                setFiltersOpen(false);
              }}
            />
            <FilterPanel
              {...filterPanelProps}
              onCategoryChange={(category) => {
                updateSearch({ category });
                setFiltersOpen(false);
              }}
              onNetworkChange={(network) => updateSearch({ network })}
              onPriceApply={(minimum, maximum) => {
                updateSearch({ min: minimum, max: maximum });
                setFiltersOpen(false);
              }}
            />
          </MobileFilterDialog>
          <div className="catalog">
            <div className="catalog__bar">
              <div className="tabs" role="group" aria-label="Seleção do catálogo">
                {tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.label}
                    aria-pressed={activeTab === tab.tab}
                    onClick={() => updateSearch({ category: tab.category, sort: tab.sort, tab: tab.tab })}
                    className={cn(activeTab === tab.tab && "is-active")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <SortSelect value={activeSort} onChange={(sort) => updateSearch({ sort })} />
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              {nftQuery.isFetching ? "Atualizando catálogo..." : resultsLabel}
            </p>
            {nftQuery.isPending ? (
              <div className="artwork-grid" aria-busy="true" aria-label="Carregando catálogo" data-testid="catalog-skeleton">
                {Array.from({ length: 9 }, (_, index) => (
                  <div className="artwork-card artwork-card--skeleton" key={index} aria-hidden="true">
                    <Skeleton className="artwork-card__image" />
                    <Skeleton className="artwork-skeleton__title" />
                    <Skeleton className="artwork-skeleton__price" />
                  </div>
                ))}
              </div>
            ) : nftQuery.isError && !nftQuery.data ? (
              <div className="catalog-state catalog-state--error" role="alert">
                <p>Não foi possível carregar o catálogo. {toApiError(nftQuery.error).message}</p>
                <Button type="button" size="sm" onClick={() => void nftQuery.refetch()} disabled={nftQuery.isFetching}>
                  {nftQuery.isFetching ? "Tentando novamente..." : "Tentar novamente"}
                </Button>
              </div>
            ) : visibleArtworks.length === 0 ? (
              <div className="catalog-state" role="status">
                <p>Nenhum NFT encontrado para estes filtros.</p>
                {hasFilters && (
                  <Button type="button" size="sm" variant="outline" onClick={() => void navigate({ search: {}, hash: "mercado" })}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn("artwork-grid", nftQuery.isFetching && "is-fetching")} aria-busy={nftQuery.isFetching}>
                {visibleArtworks.map((artwork) => (
                  <ArtworkCard key={artwork.id} artwork={artwork} />
                ))}
              </div>
            )}
            {nftQuery.isError && nftQuery.data && (
              <p className="catalog-inline-error" role="alert">
                Não foi possível atualizar o catálogo. Exibindo o último resultado carregado.{" "}
                <button type="button" onClick={() => void nftQuery.refetch()}>
                  Tentar novamente
                </button>
              </p>
            )}
            <nav className="pagination" aria-label="Paginação do catálogo">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={activePage === 1}
                className="pagination__arrow pagination__arrow--previous"
                onClick={() => updateSearch({ page: activePage - 1 })}
              >
                <FigmaIcon name="pagination-arrow.svg" />
              </button>
              {paginationItems.map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-label={`Página ${item}`}
                  aria-current={activePage === item ? "page" : undefined}
                  className={cn(activePage === item && "is-active")}
                  onClick={() => updateSearch({ page: item })}
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                aria-label="Próxima página"
                disabled={activePage >= totalPages}
                className="pagination__arrow"
                onClick={() => updateSearch({ page: activePage + 1 })}
              >
                <FigmaIcon name="pagination-arrow.svg" />
              </button>
            </nav>
          </div>
        </section>
        <section id="criadores" className="promotions" aria-label="Destaques de criadores">
          <Promo
            image="ape-green.webp"
            title="Lançamentos gênesis de edição limitada"
            description="Colecione edições escassas diretamente dos criadores antes de serem reveladas ao público."
          />
          <Promo
            image="ape-gold.webp"
            title="Arte digital selecionada e muito mais"
            description="Explore novos artistas, coleções verificadas e obras digitais que inspiram a comunidade."
          />
        </section>
        <section id="aprenda" className="journal" aria-labelledby="journal-title">
          <div className="section-heading">
            <h2 id="journal-title">Diário da Cunhagem</h2>
            <p>
              Histórias, guias e insights para colecionadores sobre o universo
              da propriedade digital.
            </p>
          </div>
          <div className="journal-grid">
            {journalEntries.map(({ image, date, duration, title, text }) => (
              <article className="journal-card" key={title}>
                <img src={`${ASSETS}/${image}`} alt="" loading="lazy" decoding="async" {...{ fetchpriority: "low" }} />
                <div>
                  <p className="journal-card__meta">
                    <span>{date}</span>
                    <span>{duration}</span>
                  </p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <button
                    type="button"
                    className="journal-card__more"
                    aria-disabled="true"
                    aria-describedby="journal-unavailable"
                    onClick={() => announce("O conteúdo editorial não faz parte desta demonstração.")}
                  >
                    Ler mais →
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p id="journal-unavailable" className="sr-only">
            Artigos editoriais indisponíveis nesta demonstração.
          </p>
        </section>
      </main>
      <SiteFooter />
      <MobileHomeNavigation />
    </div>
  );
}
export default App;
