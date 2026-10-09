import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCart, useViewer } from "../api/queries";
import { SearchAutocomplete } from "../features/marketplace/search-autocomplete";
import { FigmaIcon } from "../features/marketplace/components";
import { cn } from "../lib/utils";
import { useAuthModal } from "./auth-modal";
import { Button } from "./ui/button";

type HeaderSection = "Início" | "Mercado";

const navigation = [
  { label: "Início", hash: "inicio" },
  { label: "Mercado", hash: "mercado" },
  { label: "Criadores", hash: "criadores" },
  { label: "Aprenda", hash: "aprenda" },
] as const;

export function SiteHeader({
  className,
  currentSection = "Mercado",
  showDivider = false,
}: {
  className?: string;
  currentSection?: HeaderSection;
  showDivider?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const navigate = useNavigate();
  const { openAuth } = useAuthModal();
  const { user: session, owner, isPending } = useViewer();
  const { data: cart } = useCart(owner, { enabled: !isPending });
  const cartCount = cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;

  const closeSearch = () => {
    setSearchOpen(false);
    setQueryText("");
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchTerm = queryText.trim();
    void navigate({
      to: "/",
      hash: "mercado",
      search: searchTerm ? { q: searchTerm } : {},
    });
    closeSearch();
  };

  return (
    <header className={cn("site-header", className)}>
      <Link to="/" hash="inicio" className="brand">
        KURIO
      </Link>
      <nav className={cn("site-nav", menuOpen && "is-open")}>
        {navigation.map(({ label, hash }) => (
          <Link
            key={label}
            to="/"
            hash={hash}
            onClick={() => setMenuOpen(false)}
            className={label === currentSection ? "is-current" : undefined}
          >
            {label}
            {label === currentSection && <FigmaIcon name="nav-underline.svg" />}
          </Link>
        ))}
        {session ? (
          <Link to="/perfil" className="mobile-profile-button">
            Perfil
          </Link>
        ) : (
          <button
            type="button"
            className="mobile-auth-button"
            onClick={() => openAuth("login")}
          >
            Entrar
          </button>
        )}
      </nav>
      <div className="header-actions">
        {searchOpen && (
          <form className="header-search" onSubmit={submitSearch}>
            <input
              autoFocus
              aria-label="Buscar NFTs"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="buscar..."
            />
            <SearchAutocomplete query={queryText} onSelect={closeSearch} />
          </form>
        )}
        <button
          type="button"
          aria-label="Pesquisar"
          className="icon-button"
          aria-expanded={searchOpen}
          onClick={() => {
            if (searchOpen) closeSearch();
            else setSearchOpen(true);
          }}
        >
          <FigmaIcon name="search.svg" />
        </button>
        <Link
          to="/cart"
          aria-label={`Carrinho com ${cartCount} ${cartCount === 1 ? "item" : "itens"}`}
          className="icon-button cart-icon"
        >
          <FigmaIcon name="cart.svg" />
          <FigmaIcon name="badge.svg" />
          <span aria-hidden="true">{cartCount}</span>
        </Link>
        {session ? (
          <Button asChild size="sm" className="login">
            <Link to="/perfil">Perfil</Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="login"
            onClick={() => openAuth("login")}
          >
            <FigmaIcon name="logout.svg" />
            Entrar
          </Button>
        )}
        <button
          type="button"
          className="mobile-menu"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <i />
          <i />
          <i />
        </button>
      </div>
      {showDivider && <FigmaIcon name="divider.svg" />}
    </header>
  );
}
