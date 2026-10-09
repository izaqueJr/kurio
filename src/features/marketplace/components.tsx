import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type { Network } from "../../domain";
import { SearchAutocomplete } from "./search-autocomplete";
import {
  categoryLabels,
  networkLabels,
  sortOptions,
  type Artwork,
  type SortValue,
} from "./content";

const ASSETS = "/assets/figma";

export function FigmaIcon({ name, alt = "" }: { name: string; alt?: string }) {
  return <img src={`${ASSETS}/${name}`} alt={alt} />;
}

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: artwork.id }}
      className={cn("artwork-card", artwork.soldOut && "is-sold-out")}
    >
      <img
        className="artwork-card__image"
        src={`${ASSETS}/${artwork.image}`}
        alt={`${artwork.name} ${artwork.token}`}
        loading="lazy" decoding="async" {...{ fetchpriority: "low" }}
      />
      {artwork.soldOut && <span className="artwork-card__badge">Esgotado</span>}
      <p className="artwork-card__title">
        {artwork.name} <span>{artwork.token}</span>
      </p>
      <p className="artwork-card__price">
        {artwork.price}{" "}
        {artwork.previous && (
          <s>
            <span className="sr-only">Preço anterior: </span>
            {artwork.previous}
          </s>
        )}
      </p>
    </Link>
  );
}

export function getPaginationItems(totalPages: number, currentPage: number) {
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Math.min(Math.max(1, currentPage - 2), totalPages - 4);
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export type FilterPanelProps = {
  selected?: string;
  onCategoryChange: (category?: string) => void;
  network?: string;
  onNetworkChange: (network?: Network) => void;
  categoryCounts?: Record<string, number>;
  networkCounts?: Record<string, number>;
  priceRange: { min: number; max: number };
  appliedMinimum: number;
  appliedMaximum: number;
  onPriceApply: (minimum: number, maximum: number) => void;
};

export function FilterPanel({
  selected,
  onCategoryChange,
  network,
  onNetworkChange,
  categoryCounts,
  networkCounts,
  priceRange,
  appliedMinimum,
  appliedMaximum,
  onPriceApply,
}: FilterPanelProps) {
  const rangeMinimum = Math.round(priceRange.min * 100);
  const rangeMaximum = Math.round(priceRange.max * 100);
  const [minimum, setMinimum] = useState(
    Math.max(rangeMinimum, Math.round(appliedMinimum * 100)),
  );
  const [maximum, setMaximum] = useState(
    Math.min(rangeMaximum, Math.round(appliedMaximum * 100)),
  );
  const toEth = (value: number) =>
    (value / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const rangeStyle = {
    "--range-start": `${(minimum / rangeMaximum) * 100}%`,
    "--range-end": `${(maximum / rangeMaximum) * 100}%`,
  } as CSSProperties;
  useEffect(() => {
    setMinimum(Math.max(rangeMinimum, Math.round(appliedMinimum * 100)));
    setMaximum(Math.min(rangeMaximum, Math.round(appliedMaximum * 100)));
  }, [appliedMinimum, appliedMaximum, rangeMinimum, rangeMaximum]);
  const count = (value?: number) => (value === undefined ? "…" : value);

  return (
    <aside className="filters" aria-label="Filtros do catálogo">
      <section>
        <h2 id="filter-collections">Coleções</h2>
        <div className="filters__list" role="group" aria-labelledby="filter-collections">
          {categoryLabels.map((label) => (
            <button
              type="button"
              key={label}
              aria-pressed={selected === label}
              onClick={() => onCategoryChange(selected === label ? undefined : label)}
              className={cn(selected === label && "is-active")}
            >
              <span>{label}</span>
              <b aria-label={`${count(categoryCounts?.[label])} resultados`}>({count(categoryCounts?.[label])})</b>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>Faixa de preço</h2>
        <div className="price-range" style={rangeStyle}>
          <span className="price-range__active" />
          <input
            aria-label="Preço mínimo"
            aria-valuetext={`${toEth(minimum)} ETH`}
            type="range"
            min={rangeMinimum}
            max={rangeMaximum}
            value={minimum}
            onChange={(event) =>
              setMinimum(Math.min(Number(event.target.value), maximum - 1))
            }
          />
          <input
            aria-label="Preço máximo"
            aria-valuetext={`${toEth(maximum)} ETH`}
            type="range"
            min={rangeMinimum}
            max={rangeMaximum}
            value={maximum}
            onChange={(event) =>
              setMaximum(Math.max(Number(event.target.value), minimum + 1))
            }
          />
        </div>
        <p className="filter-copy">
          Preço: {toEth(minimum)} - {toEth(maximum)} ETH
        </p>
        <Button
          type="button"
          className="filter-apply"
          size="sm"
          onClick={() => onPriceApply(minimum / 100, maximum / 100)}
        >
          Aplicar
        </Button>
      </section>
      <section>
        <h2 id="filter-networks">Rede</h2>
        <div className="filters__list filters__list--network" role="group" aria-labelledby="filter-networks">
          {networkLabels.map((networkName) => (
            <button
              type="button"
              key={networkName}
              aria-pressed={network === networkName}
              className={cn(network === networkName && "is-active")}
              onClick={() =>
                onNetworkChange(network === networkName ? undefined : networkName)
              }
            >
              <span>{networkName}</span>
              <b aria-label={`${count(networkCounts?.[networkName])} resultados`}>({count(networkCounts?.[networkName])})</b>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export function MobileMarketControls({
  onOpenFilters,
  activeFilterCount = 0,
}: {
  onOpenFilters: () => void;
  /** Quantos filtros/ordenação estão aplicados; destaca o gatilho para dar feedback no mobile. */
  activeFilterCount?: number;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchTerm = query.trim();
    void navigate({
      to: "/",
      hash: "mercado",
      search: searchTerm ? { q: searchTerm } : {},
    });
  };

  return (
    <div className="mobile-market-controls">
      <form className="mobile-market-search" role="search" onSubmit={submitSearch}>
        <FigmaIcon name="search.svg" />
        <input
          aria-label="Buscar NFTs no mercado"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Explorar coleções"
        />
        <SearchAutocomplete query={query} onSelect={() => setQuery("")} />
      </form>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("mobile-filter-trigger", activeFilterCount > 0 && "has-active-filters")}
        aria-label={
          activeFilterCount > 0
            ? `Abrir filtros (${activeFilterCount} ${activeFilterCount === 1 ? "aplicado" : "aplicados"})`
            : "Abrir filtros"
        }
        onClick={onOpenFilters}
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        <span>Filtros</span>
        {activeFilterCount > 0 && (
          <b className="mobile-filter-trigger__badge" aria-hidden="true">
            {activeFilterCount}
          </b>
        )}
      </Button>
    </div>
  );
}

const FilterDialog = lazy(() => import("./filter-dialog"));

/** Drawer de filtros do mobile; o Dialog (Radix) é carregado na primeira abertura. */
export function MobileFilterDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const [requested, setRequested] = useState(open);
  useEffect(() => {
    if (open) setRequested(true);
  }, [open]);
  if (!requested) return null;
  return (
    <Suspense fallback={null}>
      <FilterDialog open={open} onOpenChange={onOpenChange}>
        {children}
      </FilterDialog>
    </Suspense>
  );
}

/** Ordenação dentro do drawer de filtros (no mobile o seletor do catálogo fica oculto, como no Figma). */
export function SortOptionsGroup({ value, onChange }: { value: SortValue; onChange: (value: SortValue) => void }) {
  return (
    <section className="mobile-sort" aria-labelledby="mobile-sort-title">
      <h2 id="mobile-sort-title">Ordenar por</h2>
      <div role="group" aria-labelledby="mobile-sort-title">
        {sortOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-pressed={option.value === value}
            className={cn(option.value === value && "is-active")}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function SortSelect({
  value,
  onChange,
}: {
  value: SortValue;
  onChange: (value: SortValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current =
    sortOptions.find((option) => option.value === value) ?? sortOptions[0];
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [open]);
  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") { event.preventDefault(); items[(index + 1) % items.length]?.focus(); }
    if (event.key === "ArrowUp") { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); }
    if (event.key === "Escape" || event.key === "Tab") { setOpen(false); if (event.key === "Escape") triggerRef.current?.focus(); }
  };
  return (
    <div className="sort-select" ref={ref}>
      <span id="sort-label">Ordenar por:</span>
      <button
        ref={triggerRef}
        type="button"
        className="sort-select__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby="sort-label sort-current"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); }
        }}
      >
        <span id="sort-current">{current.label}</span>
        <FigmaIcon name="arrow-down.svg" />
      </button>
      {open && (
        <div
          className="sort-select__menu"
          role="menu"
          aria-label="Opções de ordenação"
          onKeyDown={onMenuKeyDown}
        >
          {sortOptions.map((option) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              key={option.value}
              className={cn(option.value === value && "is-selected")}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Promo({
  image,
  title,
  description,
}: {
  image: string;
  title: string;
  description: string;
}) {
  return (
    <article className="promo">
      <div className="promo__image">
        <img src={`${ASSETS}/${image}`} alt="Colecionável em destaque" loading="lazy" decoding="async" {...{ fetchpriority: "low" }} />
      </div>
      <div className="promo__copy">
        <FigmaIcon name="mask-group.svg" />
        <h3>{title}</h3>
        <p>{description}</p>
        <Button asChild size="sm">
          <Link to="/" hash="mercado">
            Explorar <FigmaIcon name="promo-arrow.svg" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
