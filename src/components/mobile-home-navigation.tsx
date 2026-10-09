import { Heart, House, ScanLine, ShoppingCart, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useViewer } from "../api/queries";
import { useAuthModal } from "./auth-modal";

export function MobileHomeNavigation() {
  const { openAuth } = useAuthModal();
  const { user: session } = useViewer();

  return (
    <nav className="mobile-home-navigation" aria-label="Navegação principal">
      <svg
        className="mobile-home-navigation__surface"
        viewBox="0 0 414 126"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M282.85 31c-13.76 0-25.98 8.2-31.83 20.65-7.76 16.52-24.56 27.97-44.02 27.97s-36.26-11.44-44.02-27.97C157.13 39.2 144.9 31 131.15 31H28.93C12.95 31 0 43.95 0 59.93v66.02h414V59.93C414 43.95 401.05 31 385.07 31H282.85Z" />
      </svg>
      <Link activeOptions={{ exact: true, includeHash: true }} to="/" hash="inicio" aria-label="Início" className="mobile-home-navigation__item mobile-home-navigation__item--home is-active">
        <House size={20} fill="currentColor" />
      </Link>
      <Link to="/favoritos" aria-label="Favoritos" className="mobile-home-navigation__item mobile-home-navigation__item--favorites">
        <Heart size={20} fill="currentColor" />
      </Link>
      <Link
        activeOptions={{ exact: true, includeHash: true }}
        to="/"
        hash="mercado"
        aria-label="Explorar o marketplace"
        className="mobile-home-navigation__primary"
      >
        <ScanLine size={27} />
      </Link>
      <Link to="/cart" aria-label="Carrinho" className="mobile-home-navigation__item mobile-home-navigation__item--cart">
        <ShoppingCart size={20} fill="currentColor" />
      </Link>
      {session ? (
        <Link to="/perfil" aria-label="Perfil" className="mobile-home-navigation__item mobile-home-navigation__item--profile">
          <UserRound size={20} fill="currentColor" />
        </Link>
      ) : (
        <button type="button" aria-label="Perfil" className="mobile-home-navigation__item mobile-home-navigation__item--profile" onClick={() => openAuth("login")}>
          <UserRound size={20} fill="currentColor" />
        </button>
      )}
    </nav>
  );
}
