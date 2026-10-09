import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
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
      className="artwork-card"
    >
      <img
        className="artwork-card__image"
        src={`${ASSETS}/${artwork.image}`}
        alt={`${artwork.name} ${artwork.token}`}
      />
      <p className="artwork-card__title">
        {artwork.name} <span>{artwork.token}</span>
      </p>
      <p className="artwork-card__price">
        {artwork.price} {artwork.previous && <s>{artwork.previous}</s>}
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
  onNetworkChange: (network?: "Ethereum" | "Polygon" | "Solana") => void;
  categoryCounts: Record<string, number>;
  networkCounts: Record<string, number>;
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

  return (
    <aside className="filters">
      <section>
        <h2>Coleções</h2>
        <div className="filters__list">
          {categoryLabels.map((label) => (
            <button
              key={label}
              onClick={() => onCategoryChange(label)}
              className={cn(selected === label && "is-active")}
            >
              <span>{label}</span>
              <b>({categoryCounts[label] ?? 0})</b>
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
          className="filter-apply"
          size="sm"
          onClick={() => onPriceApply(minimum / 100, maximum / 100)}
        >
          Aplicar
        </Button>
      </section>
      <section>
        <h2>Rede</h2>
        <div className="filters__list filters__list--network">
          {networkLabels.map((networkName) => (
            <button
              type="button"
              key={networkName}
              className={cn(network === networkName && "is-active")}
              onClick={() =>
                onNetworkChange(network === networkName ? undefined : networkName)
              }
            >
              <span>{networkName}</span>
              <b>({networkCounts[networkName] ?? 0})</b>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export function MobileMarketControls({
  onOpenFilters,
}: {
  onOpenFilters: () => void;
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
      <form className="mobile-market-search" onSubmit={submitSearch}>
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
        className="mobile-filter-trigger"
        aria-label="Abrir filtros"
        onClick={onOpenFilters}
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        <span>Filtros</span>
      </Button>
    </div>
  );
}

export function MobileFilterDialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="mobile-filter-dialog" role="presentation">
      <button
        type="button"
        className="mobile-filter-dialog__backdrop"
        aria-label="Fechar filtros"
        onClick={onClose}
      />
      <section
        className="mobile-filter-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Filtros do marketplace"
      >
        <header>
          <h2>Filtros</h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Fechar filtros"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </header>
        {children}
      </section>
    </div>
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
  const current =
    sortOptions.find((option) => option.value === value) ?? sortOptions[0];
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="sort-select" ref={ref}>
      <span>Ordenar por:</span>
      <button
        type="button"
        className="sort-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        {current.label}
        <FigmaIcon name="arrow-down.svg" />
      </button>
      {open && (
        <div
          className="sort-select__menu"
          role="listbox"
          aria-label="Opções de ordenação"
        >
          {sortOptions.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              className={cn(option.value === value && "is-selected")}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
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
        <img src={`${ASSETS}/${image}`} alt="Colecionável em destaque" />
      </div>
      <div className="promo__copy">
        <FigmaIcon name="mask-group.svg" />
        <h3>{title}</h3>
        <p>{description}</p>
        <Button size="sm">
          Explorar <FigmaIcon name="promo-arrow.svg" />
        </Button>
      </div>
    </article>
  );
}
