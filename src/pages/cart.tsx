import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/feedback";
import { ASSETS, CartLayout, CartSkeleton, ErrorState } from "../components/layout";
import {
  useApplyCoupon,
  useCart,
  useNfts,
  useRemoveCartLine,
  useRemoveCoupon,
  useUpdateCartLine,
  useViewer,
} from "../api/queries";
import { toApiError } from "../api/client";
import { ProductCarousel } from "../components/product-carousel";
import { clearNotices, useRealtimeNotices } from "../lib/realtime-notices";
import { eth, type Cart } from "../domain";

export function RealtimeNoticeList() {
  const notices = useRealtimeNotices();
  if (!notices.length) return null;
  return (
    <Alert
      tone="info"
      title="Valores atualizados em tempo real"
      className="realtime-notices"
      action={
        <button type="button" className="text-link" onClick={clearNotices}>
          Entendi
        </button>
      }
    >
      <ul>
        {notices.map((notice) => (
          <li key={notice.id}>{notice.message}</li>
        ))}
      </ul>
    </Alert>
  );
}

function CartSummaryPanel({ cart, owner, isAuthenticated }: { cart: Cart; owner: string; isAuthenticated: boolean }) {
  const [code, setCode] = useState("");
  const apply = useApplyCoupon(owner);
  const removeCoupon = useRemoveCoupon(owner);
  const { quote } = cart;
  const couponError = apply.isError ? toApiError(apply.error).fields.code ?? toApiError(apply.error).message : "";
  const blocked = !quote.valid;
  return (
    <aside className="cart-summary" aria-labelledby="cart-summary-title">
      <div className="cart-summary__heading">
        <h2 id="cart-summary-title">Resumo da carteira</h2>
        <hr />
      </div>
      {cart.coupon ? (
        <div className="cart-summary__applied">
          <span>
            Cupom <b>{cart.coupon}</b> aplicado
          </span>
          <button
            type="button"
            aria-label={`Remover cupom ${cart.coupon}`}
            onClick={() => removeCoupon.mutate()}
            disabled={removeCoupon.isPending}
          >
            <X size={14} aria-hidden="true" /> Remover
          </button>
        </div>
      ) : (
        <form
          className="cart-summary__promo"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            apply.mutate(code.trim(), { onSuccess: () => setCode("") });
          }}
        >
          <label htmlFor="cart-promo">Código promocional</label>
          <div>
            <input
              id="cart-promo"
              aria-label="Cupom de desconto"
              aria-invalid={couponError ? true : undefined}
              aria-describedby={couponError ? "cart-promo-error" : undefined}
              value={code}
              autoComplete="off"
              onChange={(event) => {
                setCode(event.target.value);
                if (apply.isError) apply.reset();
              }}
              placeholder="Digite o código promocional..."
            />
            <Button type="submit" size="sm" disabled={apply.isPending}>
              {apply.isPending ? "..." : "Aplicar"}
            </Button>
          </div>
          {couponError && (
            <p id="cart-promo-error" className="cart-summary__error" role="alert">
              <AlertTriangle size={13} aria-hidden="true" /> {couponError}
            </p>
          )}
        </form>
      )}
      <dl className="cart-summary__fees">
        <div>
          <dt>Subtotal</dt>
          <dd><b>{eth(quote.subtotal)}</b></dd>
        </div>
        <div>
          <dt>Desconto do lançamento</dt>
          <dd><b>- {eth(quote.discount)}</b></dd>
        </div>
        <div className="cart-summary__network">
          <div>
            <dt>Taxa de rede</dt>
            <dd><b>{eth(quote.networkFee)}</b></dd>
          </div>
          <small>Taxa estimada</small>
        </div>
      </dl>
      <div className="cart-summary__total" aria-live="polite">
        <span>Total</span>
        <b>{eth(quote.total)}</b>
      </div>
      {blocked && (
        <Alert title="Revise o carrinho antes de continuar">
          <ul>
            {quote.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}
      <div className="cart-summary__cta">
        {blocked ? (
          <Button type="button" disabled aria-label="Continuar para pagamento">
            {isAuthenticated ? "Finalizar pedido" : "Conectar e finalizar"}
          </Button>
        ) : (
          <Button asChild>
            <Link aria-label="Continuar para pagamento" to="/checkout">
              {isAuthenticated ? "Finalizar pedido" : "Conectar e finalizar"}
            </Link>
          </Button>
        )}
        <Link to="/" hash="mercado">
          Continuar explorando
        </Link>
      </div>
    </aside>
  );
}

const RELATED_IDS = [
  "cosmic-118",
  "violet-314",
  "ivory-088",
  "golden-207",
  "golden-160",
  "sage-009",
  "neon-552",
  "golden-195",
  "kurio-edition-012",
  "kurio-edition-025",
];

function CartRelatedProducts() {
  const related = useNfts({ ids: RELATED_IDS, pageSize: RELATED_IDS.length });
  if (!related.data?.items.length) return null;
  return (
    <section className="cart-related" aria-labelledby="cart-related-title">
      <div className="cart-related__heading">
        <h2 id="cart-related-title">Colecionadores também viram</h2>
        <hr />
      </div>
      <ProductCarousel items={related.data.items} prefix="cart-related" label="Colecionadores também viram" />
    </section>
  );
}

export function CartPage() {
  const router = useRouter();
  const { user, owner, isPending: sessionPending } = useViewer();
  const cartQuery = useCart(owner, { enabled: !sessionPending });
  const update = useUpdateCartLine(owner);
  const remove = useRemoveCartLine(owner);
  const cart = cartQuery.data;
  const busyLine = (update.isPending ? update.variables?.lineId : undefined) ?? (remove.isPending ? remove.variables?.lineId : undefined);

  return (
    <CartLayout>
      <h1 className="cart-accessible-title">Seu carrinho</h1>
      <section className="cart-top">
        <div className="cart-mobile-header">
          <button type="button" aria-label="Voltar" onClick={() => router.history.back()}>
            <ChevronLeft size={20} />
          </button>
          <p aria-hidden="true">Carrinho de NFTs</p>
        </div>
        <nav className="cart-breadcrumb" aria-label="Caminho de navegação">
          <Link to="/" hash="inicio">
            Início
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/" hash="mercado">
            Mercado
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Carrinho</span>
        </nav>
        <RealtimeNoticeList />
        {!cart && (cartQuery.isPending || sessionPending) ? (
          <CartSkeleton />
        ) : !cart ? (
          <ErrorState error={cartQuery.error} title="Não foi possível carregar seu carrinho" onRetry={() => void cartQuery.refetch()} retrying={cartQuery.isFetching} />
        ) : !cart.lines.length ? (
          <section className="empty-state cart-empty">
            <ShoppingBag size={38} aria-hidden="true" />
            <h2>Seu carrinho está vazio</h2>
            <p>Explore obras digitais selecionadas para começar sua coleção.</p>
            <Link to="/" hash="mercado">
              Explorar NFTs
            </Link>
          </section>
        ) : (
          <div className="cart-body">
            <section className="cart-table" aria-label="Itens do carrinho">
              <div className="cart-table__header" aria-hidden="true">
                <span>NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
                <span />
              </div>
              <hr />
              <div className="cart-table__items">
                {cart.lines.map((line) => {
                  const exceeds = line.quantity > line.available;
                  const busy = busyLine === line.id;
                  return (
                    <article className={`cart-table__item${exceeds ? " has-issue" : ""}`} key={line.id} aria-busy={busy}>
                      <div className="cart-table__product">
                        <img src={`${ASSETS}/${line.nft.image}`} alt={`${line.nft.name} ${line.nft.token}`} />
                        <div>
                          <h2>
                            <Link to="/nft/$nftId" params={{ nftId: line.nftId }}>
                              {line.nft.name} {line.nft.token}
                            </Link>
                          </h2>
                          <p>ID do token: {line.nft.token}</p>
                        </div>
                      </div>
                      <strong className="cart-table__price">{eth(line.nft.price)}</strong>
                      <span className="cart-table__edition">Edição: {line.edition}</span>
                      <strong className="cart-table__line-total">{eth(line.lineTotal)}</strong>
                      <div className="cart-table__quantity" role="group" aria-label={`Quantidade de ${line.nft.name}`}>
                        <button
                          type="button"
                          aria-label={`Diminuir quantidade de ${line.nft.name}`}
                          disabled={line.quantity <= 1 || busy}
                          onClick={() => update.mutate({ lineId: line.id, quantity: line.quantity - 1, name: line.nft.name })}
                        >
                          <Minus size={12} />
                        </button>
                        <b aria-label={`${line.quantity} unidade(s)`}>{line.quantity}</b>
                        <button
                          type="button"
                          aria-label={`Aumentar quantidade de ${line.nft.name}`}
                          disabled={line.quantity >= line.available || busy}
                          onClick={() => update.mutate({ lineId: line.id, quantity: line.quantity + 1, name: line.nft.name })}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-table__remove"
                        aria-label={`Remover ${line.nft.name}`}
                        disabled={busy}
                        onClick={() => remove.mutate({ lineId: line.id, name: line.nft.name })}
                      >
                        <Trash2 size={18} />
                      </button>
                      {exceeds && (
                        <p className="cart-table__issue" role="alert">
                          <AlertTriangle size={13} aria-hidden="true" />
                          {line.available === 0
                            ? "Edição esgotada. Remova o item para continuar."
                            : `Restam ${line.available}. Reduza a quantidade.`}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
              {(update.isError || remove.isError) && (
                <Alert>{toApiError(update.error ?? remove.error).message}</Alert>
              )}
            </section>
            <CartSummaryPanel cart={cart} owner={owner} isAuthenticated={Boolean(user)} />
          </div>
        )}
      </section>
      <CartRelatedProducts />
    </CartLayout>
  );
}
