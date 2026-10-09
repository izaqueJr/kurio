import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import { api } from "./api/client";
import { type Nft } from "./domain";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { MobileHomeNavigation } from "./components/mobile-home-navigation";
import {
  fallbackArtworks,
  fallbackFacets,
  heroSlides,
  journalEntries,
  type Artwork,
} from "./features/marketplace/content";
import {
  ArtworkCard,
  FigmaIcon,
  FilterPanel,
  getPaginationItems,
  MobileFilterDialog,
  MobileMarketControls,
  Promo,
  SortSelect,
} from "./features/marketplace/components";

type NftListResponse = {
  items: Nft[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    categories: Record<string, number>;
    networks: Record<string, number>;
    priceRange: { min: number; max: number };
  };
};
const ASSETS = "/assets/figma";

function App() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const activeCategory = search.category;
  const activeSort = search.sort ?? "recent";
  const activeTab = search.tab ?? "all";
  const activePage = search.page ?? 1;
  const activeMin = search.min ?? fallbackFacets.priceRange.min;
  const activeMax = search.max ?? fallbackFacets.priceRange.max;
  const nftQuery = useQuery({
    queryKey: [
      "nfts",
      {
        q: search.q ?? "",
        category: activeCategory ?? "",
        network: search.network ?? "",
        sort: activeSort,
        min: activeMin,
        max: activeMax,
        page: activePage,
      },
    ],
    queryFn: async () =>
      (
        await api.get<NftListResponse>("/nfts", {
          params: {
            q: search.q,
            category: activeCategory,
            network: search.network,
            sort: activeSort,
            min: activeMin,
            max: activeMax,
            page: activePage,
          },
        })
      ).data,
    placeholderData: keepPreviousData,
  });
  const tabs = [
    { label: "Todos os NFTs", category: undefined, sort: "recent" as const },
    {
      label: "Novos lançamentos",
      category: undefined,
      sort: "recent" as const,
    },
    { label: "Em alta", category: undefined, sort: "price-desc" as const },
  ];
  const activeSlide = heroSlides[slideIndex];
  const visibleArtworks: Artwork[] = (nftQuery.data?.items ?? fallbackArtworks).map(
    (artwork) =>
      "collection" in artwork
        ? {
            id: artwork.id,
            name: artwork.name,
            token: artwork.token,
            price: `${artwork.price} ETH`,
            previous: artwork.previousPrice
              ? `${artwork.previousPrice} ETH`
              : undefined,
            image: artwork.image,
            category: artwork.category,
            network: artwork.network,
          }
        : artwork,
  );
  const totalPages = Math.max(
    1,
    Math.ceil(
      (nftQuery.data?.total ?? visibleArtworks.length) /
        (nftQuery.data?.pageSize ?? 9),
    ),
  );
  const paginationItems = getPaginationItems(totalPages, activePage);
  const categoryCounts =
    nftQuery.data?.facets.categories ?? fallbackFacets.categories;
  const networkCounts =
    nftQuery.data?.facets.networks ?? fallbackFacets.networks;
  const priceRange = nftQuery.data?.facets.priceRange ?? fallbackFacets.priceRange;
  const updateSearch = (patch: {
    q?: string;
    category?: string;
    network?: "Ethereum" | "Polygon" | "Solana";
    sort?: "recent" | "price-asc" | "price-desc";
    tab?: "all" | "new" | "trending";
    min?: number;
    max?: number;
    page?: number;
  }) => {
    const scrollPosition = window.scrollY;
    void navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 1 }),
      resetScroll: false,
    }).then(() => {
      window.scrollTo({ top: scrollPosition, left: 0, behavior: "auto" });
    });
  };
  useEffect(() => {
    const timer = window.setInterval(
      () => setSlideIndex((current) => (current + 1) % heroSlides.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="page-shell">
      <SiteHeader currentSection="Início" showDivider />
      <MobileMarketControls onOpenFilters={() => setFiltersOpen(true)} />
      <main id="inicio">
        <section className="hero">
          <Link
            to="/"
            hash="mercado"
            className="hero__mobile-banner"
            aria-label="Explorar NFTs no mercado"
          >
            <img
              src={`${ASSETS}/hero-banner-mobile.png`}
              alt="Seja dono da cultura digital"
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
            <img
              key={activeSlide.image}
              src={`${ASSETS}/${activeSlide.image}`}
              alt={activeSlide.alt}
            />
          </div>
          <div className="hero__dots" aria-label="Slides em destaque">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.image}
                aria-label={`Mostrar slide ${index + 1}`}
                aria-current={slideIndex === index}
                className={cn(slideIndex === index && "is-active")}
                onClick={() => setSlideIndex(index)}
              />
            ))}
          </div>
        </section>
        <section id="mercado" className="marketplace">
          <div className="market-sidebar">
            <FilterPanel
              selected={activeCategory}
              network={search.network}
              categoryCounts={categoryCounts}
              networkCounts={networkCounts}
              priceRange={priceRange}
              appliedMinimum={activeMin}
              appliedMaximum={activeMax}
              onCategoryChange={(category) => updateSearch({ category })}
              onNetworkChange={(network) => updateSearch({ network })}
              onPriceApply={(minimum, maximum) =>
                updateSearch({ min: minimum, max: maximum })
              }
            />
            <article className="featured-nft">
              <p>NFT EM DESTAQUE</p>
              <h2>OFERTA LIMITADA</h2>
              <img
                src={`${ASSETS}/ape-purple.png`}
                alt="Cosmic Bloom, NFT em destaque"
              />
            </article>
          </div>
          <MobileFilterDialog
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          >
            <FilterPanel
              selected={activeCategory}
              network={search.network}
              categoryCounts={categoryCounts}
              networkCounts={networkCounts}
              priceRange={priceRange}
              appliedMinimum={activeMin}
              appliedMaximum={activeMax}
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
              <div className="tabs">
                {tabs.map((tab, index) => (
                  <button
                    key={tab.label}
                    onClick={() =>
                      updateSearch({
                        category: tab.category,
                        sort: tab.sort,
                        tab:
                          index === 0
                            ? "all"
                            : index === 1
                              ? "new"
                              : "trending",
                      })
                    }
                    className={cn(
                      (index === 0 && activeTab === "all") ||
                        (index === 1 && activeTab === "new") ||
                        (index === 2 && activeTab === "trending")
                        ? "is-active"
                        : "",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <SortSelect
                value={activeSort}
                onChange={(sort) => updateSearch({ sort })}
              />
            </div>
            {nftQuery.isLoading ? (
              <div className="catalog-state">Carregando obras...</div>
            ) : nftQuery.isError ? (
              <div className="catalog-state">
                Não foi possível carregar o catálogo.
              </div>
            ) : visibleArtworks.length === 0 ? (
              <div className="catalog-state">
                Nenhum NFT encontrado para estes filtros.
              </div>
            ) : (
              <div
                className={cn(
                  "artwork-grid",
                  nftQuery.isFetching && "is-fetching",
                )}
              >
                {visibleArtworks.map((artwork) => (
                  <ArtworkCard
                    key={artwork.name + artwork.token}
                    artwork={artwork}
                  />
                ))}
              </div>
            )}
            <div className="pagination">
              <button
                aria-label="Página anterior"
                disabled={activePage === 1}
                className="pagination__arrow pagination__arrow--previous"
                onClick={() => updateSearch({ page: activePage - 1 })}
              >
                <FigmaIcon name="pagination-arrow.svg" />
              </button>
              {paginationItems.map((item) => (
                <button
                  key={item}
                  aria-current={activePage === item ? "page" : undefined}
                  className={cn(activePage === item && "is-active")}
                  onClick={() => updateSearch({ page: item })}
                >
                  {item}
                </button>
              ))}
              <button
                aria-label="Próxima página"
                disabled={activePage === totalPages}
                className="pagination__arrow"
                onClick={() => updateSearch({ page: activePage + 1 })}
              >
                <FigmaIcon name="pagination-arrow.svg" />
              </button>
            </div>
          </div>
        </section>
        <section id="criadores" className="promotions">
          <Promo
            image="ape-green.png"
            title="Lançamentos gênesis de edição limitada"
            description="Colecione edições escassas diretamente dos criadores antes de serem reveladas ao público."
          />
          <Promo
            image="ape-gold.png"
            title="Arte digital selecionada e muito mais"
            description="Explore novos artistas, coleções verificadas e obras digitais que inspiram a comunidade."
          />
        </section>
        <section id="aprenda" className="journal">
          <div className="section-heading">
            <h2>Diário da Cunhagem</h2>
            <p>
              Histórias, guias e insights para colecionadores sobre o universo
              da propriedade digital.
            </p>
          </div>
          <div className="journal-grid">
            {journalEntries.map(({ image, date, duration, title, text }) => (
              <article className="journal-card" key={title}>
                <img src={`${ASSETS}/${image}`} alt="" />
                <div>
                  <p className="journal-card__meta">
                    <span>{date}</span>
                    <span>{duration}</span>
                  </p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <a href="#inicio">Ler mais →</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
      <MobileHomeNavigation />
    </div>
  );
}
export default App;
