import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/feedback";
import { useAnnouncement } from "../lib/announcer";
import { toApiError } from "../api/client";

export const ASSETS = "/assets/figma";

export function DetailHeader() {
  return <SiteHeader className="detail-header" currentSection="Mercado" />;
}

export function DetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="detail-shell">
      <DetailHeader />
      <main className="detail-page" id="conteudo">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function CartLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cart-shell">
      <DetailHeader />
      <main className="cart-page" id="conteudo">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="checkout-shell">
      <DetailHeader />
      <main className="checkout-page" id="conteudo">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function AccountMobileHeader({ title }: { title: string }) {
  return (
    <header className="account-mobile-header">
      <Link to="/" hash="inicio" aria-label="Voltar ao início">
        <ChevronLeft size={20} />
      </Link>
      <p aria-hidden="true">{title}</p>
      <Link to="/cart" aria-label="Abrir carrinho">
        <ShoppingBag size={18} />
      </Link>
    </header>
  );
}

/** Navegação da conta em telas pequenas, onde a barra lateral do desktop fica oculta. */
export function AccountMobileNav({ onLogout, loggingOut }: { onLogout: () => void; loggingOut?: boolean }) {
  return (
    <nav className="account-mobile-nav" aria-label="Seções da conta (mobile)">
      <Link to="/perfil" activeProps={{ "aria-current": "page", className: "is-active" }}>
        Perfil
      </Link>
      <Link to="/carteiras" activeProps={{ "aria-current": "page", className: "is-active" }}>
        Carteiras
      </Link>
      <Link to="/favoritos" activeProps={{ "aria-current": "page", className: "is-active" }}>
        Favoritos
      </Link>
      <button type="button" onClick={onLogout} disabled={loggingOut}>
        {loggingOut ? "Saindo..." : "Sair"}
      </button>
    </nav>
  );
}

/** Estado de erro com ação de nova tentativa e mensagem acessível. */
export function ErrorState({
  error,
  title = "Não foi possível carregar este conteúdo",
  onRetry,
  retrying,
  children,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="empty-state state-error" role="alert">
      <h2>{title}</h2>
      <p>{toApiError(error).message}</p>
      {onRetry && (
        <Button type="button" onClick={onRetry} disabled={retrying}>
          {retrying ? "Tentando novamente..." : "Tentar novamente"}
        </Button>
      )}
      {children}
    </section>
  );
}

/** Rótulo visualmente oculto para leitores de tela durante o carregamento. */
export function LoadingLabel({ children }: { children: ReactNode }) {
  return (
    <span className="sr-only" role="status">
      {children}
    </span>
  );
}

export function DetailSkeleton() {
  return (
    <section className="detail-top" aria-busy="true">
      <LoadingLabel>Carregando NFT</LoadingLabel>
      <div className="detail-product">
        <Skeleton className="detail-skeleton__gallery" />
        <div className="detail-info detail-skeleton__info">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </section>
  );
}

export function CartSkeleton() {
  return (
    <div className="cart-body" aria-busy="true">
      <LoadingLabel>Carregando carrinho</LoadingLabel>
      <section className="cart-table">
        <div className="cart-table__items">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="cart-skeleton__row" />
          ))}
        </div>
      </section>
      <SummarySkeleton />
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <aside className="cart-summary cart-summary--loading" aria-hidden="true">
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-12 w-full" />
    </aside>
  );
}

export function PageSkeleton({ label = "Carregando conteúdo" }: { label?: string }) {
  return (
    <section className="page-skeleton" aria-busy="true">
      <LoadingLabel>{label}</LoadingLabel>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </section>
  );
}

/** Regiões `aria-live` persistentes para feedback de mutations e de eventos em tempo real. */
export function LiveAnnouncer() {
  const announcement = useAnnouncement();
  const [visible, setVisible] = useState(announcement);
  useEffect(() => {
    if (!announcement) return;
    setVisible(null);
    const frame = window.requestAnimationFrame(() => setVisible(announcement));
    return () => window.cancelAnimationFrame(frame);
  }, [announcement]);
  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="live-polite">
        {visible?.tone === "polite" ? visible.message : ""}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="live-assertive">
        {visible?.tone === "assertive" ? visible.message : ""}
      </div>
    </>
  );
}
