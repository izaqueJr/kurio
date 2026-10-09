import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ChevronLeft,
  Heart,
  Minus,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { api } from "./api/client";
import {
  addEth,
  eth,
  multiplyEth,
  products,
  subtractEth,
  type Cart,
  type Nft,
  type Order,
  type Quote,
  type User,
  type Wallet,
} from "./domain";
import { SiteFooter } from "./components/site-footer";
import { useAuthModal } from "./components/auth-modal";
import { SiteHeader } from "./components/site-header";
import { AccountSidebar } from "./components/account/account-sidebar";
import { OrderConfirmation } from "./components/order-confirmation";

const ASSETS = "/assets/figma";
const queryKeys = {
  cart: ["cart"] as const,
  session: ["session"] as const,
  wallets: ["wallets"] as const,
};

function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: async () => (await api.get<User>("/session")).data,
    retry: false,
  });
}
function useCart() {
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: async () => (await api.get<Cart>("/cart")).data,
  });
}
function useWallets() {
  return useQuery({
    queryKey: queryKeys.wallets,
    queryFn: async () => (await api.get<Wallet[]>("/wallets")).data,
    retry: false,
  });
}
function itemFor(id: string) {
  return products.find((item) => item.id === id);
}
function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? "Não foi possível concluir a operação. Tente novamente."
  );
}

function LoadingBlock({ label = "Carregando conteúdo" }: { label?: string }) {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      {label}
    </div>
  );
}
function Alert({
  children,
  type = "error",
}: {
  children: React.ReactNode;
  type?: "error" | "success";
}) {
  return (
    <p className={`feedback feedback--${type}`} role="alert">
      {children}
    </p>
  );
}

function DetailHeader() {
  return <SiteHeader className="detail-header" currentSection="Mercado" />;
}

function DetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="detail-shell">
      <DetailHeader />
      <main className="detail-page">{children}</main>
      <SiteFooter />
    </div>
  );
}

function AccountLayout({ children }: { children: React.ReactNode }) {
  return <DetailLayout>{children}</DetailLayout>;
}

function AccountMobileHeader({ title }: { title: string }) {
  return (
    <header className="account-mobile-header">
      <Link to="/" hash="inicio" aria-label="Voltar ao início">
        <ChevronLeft size={20} />
      </Link>
      <h1>{title}</h1>
      <Link to="/cart" aria-label="Abrir carrinho">
        <ShoppingBag size={18} />
      </Link>
    </header>
  );
}

function DetailRating() {
  return (
    <div
      className="detail-rating"
      aria-label="4.8 de 5 estrelas, 19 avaliações"
    >
      <span className="detail-rating__stars">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} size={15} fill="currentColor" />
        ))}
      </span>
      <span className="detail-rating__full">
        19 avaliações de colecionadores
      </span>
      <span className="detail-rating__compact">4.8 (19)</span>
    </div>
  );
}

function DetailTabs({ nft, edition }: { nft: Nft; edition: string }) {
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");
  const reviews = [
    {
      name: "Luna Matos",
      date: "Há 2 dias",
      score: "5.0",
      text: "A peça chegou exatamente como apresentada. Os metadados e a procedência estão impecáveis.",
    },
    {
      name: "Rafael Lin",
      date: "Há 1 semana",
      score: "4.8",
      text: "Arte marcante e ótima experiência de compra. Uma das minhas favoritas da coleção.",
    },
    {
      name: "Nina Costa",
      date: "Há 2 semanas",
      score: "5.0",
      text: "Excelente curadoria. A paleta e os detalhes da edição ficam ainda melhores em alta resolução.",
    },
  ];

  return (
    <section className="detail-description">
      <div
        className="detail-description__heading"
        role="tablist"
        aria-label="Informações do NFT"
      >
        <button
          type="button"
          role="tab"
          id="nft-details-tab"
          aria-selected={activeTab === "details"}
          aria-controls="nft-details-panel"
          className={activeTab === "details" ? "is-active" : ""}
          onClick={() => setActiveTab("details")}
        >
          Detalhes do NFT
        </button>
        <button
          type="button"
          role="tab"
          id="nft-reviews-tab"
          aria-selected={activeTab === "reviews"}
          aria-controls="nft-reviews-panel"
          className={activeTab === "reviews" ? "is-active" : ""}
          onClick={() => setActiveTab("reviews")}
        >
          Avaliações de colecionadores (19)
        </button>
      </div>

      {activeTab === "details" ? (
        <div
          id="nft-details-panel"
          role="tabpanel"
          aria-labelledby="nft-details-tab"
          className="detail-tab-panel detail-tab-panel--details"
        >
          <p>
            <strong>
              {nft.name} {nft.token}
            </strong>{" "}
            é uma obra digital {edition} finalizada à mão da coleção{" "}
            {nft.collection}. Cada atributo fica armazenado nos metadados do
            token e verificado na {nft.network}. A obra explora identidade,
            movimento e luz em um mundo digital sem fronteiras.
            <br />
            <br />A propriedade inclui a arte em alta resolução, lançamentos
            exclusivos para colecionadores e um registro permanente de
            procedência registrada na rede. Nova Sato recebe 5% de direitos
            autorais nas vendas secundárias, apoiando novos trabalhos e
            lançamentos da comunidade.
          </p>
          <dl>
            <div>
              <dt>Rede:</dt>
              <dd>
                Cunhado na {nft.network} com procedência imutável e metadados
                armazenados no IPFS.
              </dd>
            </div>
            <div>
              <dt>Contrato:</dt>
              <dd>
                Direitos autorais do criador: 5% nas vendas secundárias, pagos
                automaticamente pelos mercados compatíveis.
              </dd>
            </div>
            <div>
              <dt>Direitos autorais:</dt>
              <dd>0x7A42...19E8 • Contrato inteligente ERC-721 verificado.</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div
          id="nft-reviews-panel"
          role="tabpanel"
          aria-labelledby="nft-reviews-tab"
          className="detail-tab-panel detail-reviews"
        >
          <div className="detail-reviews__summary">
            <strong>4.8</strong>
            <div>
              <span>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} size={14} fill="currentColor" />
                ))}
              </span>
              <p>Baseado em 19 avaliações de colecionadores</p>
            </div>
          </div>
          <div className="detail-reviews__list">
            {reviews.map((review) => (
              <article className="detail-review-card" key={review.name}>
                <div className="detail-review-card__head">
                  <div>
                    <b>{review.name}</b>
                    <span>{review.date}</span>
                  </div>
                  <span className="detail-review-card__score">
                    <Star size={13} fill="currentColor" /> {review.score}
                  </span>
                </div>
                <p>{review.text}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DetailRelatedCarousel({ items }: { items: Nft[] }) {
  const pages = useMemo(() => {
    const result: Nft[][] = [];
    for (let index = 0; index < items.length; index += 5)
      result.push(items.slice(index, index + 5));
    return result;
  }, [items]);
  const [page, setPage] = useState(0);
  const activePage = Math.min(page, Math.max(pages.length - 1, 0));

  if (!pages.length) return null;

  const move = (direction: -1 | 1) => {
    setPage((current) => (current + direction + pages.length) % pages.length);
  };

  return (
    <section className="detail-related" aria-label="Mais desta coleção">
      <div className="detail-related__heading">
        <h2>Mais desta coleção</h2>
        <hr />
      </div>
      <div
        className="detail-related__viewport"
        tabIndex={0}
        aria-roledescription="carrossel"
        aria-label={`Página ${activePage + 1} de ${pages.length} da coleção`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") move(-1);
          if (event.key === "ArrowRight") move(1);
        }}
      >
        <div
          className="detail-related__track"
          style={{
            transform: `translateX(-${(activePage * 100) / pages.length}%)`,
          }}
        >
          {pages.map((collectionPage, pageIndex) => (
            <div
              className="detail-related__page"
              key={`collection-page-${pageIndex}`}
              aria-hidden={pageIndex !== activePage}
            >
              {collectionPage.map((item) => (
                <Link
                  to="/nft/$nftId"
                  params={{ nftId: item.id }}
                  className="detail-related-card"
                  key={item.id}
                  tabIndex={pageIndex === activePage ? 0 : -1}
                >
                  <div className="detail-related-card__image">
                    <img
                      src={`${ASSETS}/${item.image}`}
                      alt={`${item.name} ${item.token}`}
                    />
                  </div>
                  <div>
                    <p>
                      {item.name} {item.token}
                    </p>
                    <strong>{eth(item.price)}</strong>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      {pages.length > 1 && (
        <div className="detail-related__dots" aria-label="Navegação da coleção">
          {pages.map((_, index) => (
            <button
              type="button"
              key={index}
              className={index === activePage ? "is-active" : ""}
              aria-current={index === activePage ? "true" : undefined}
              aria-label={`Ver página ${index + 1} da coleção`}
              onClick={() => setPage(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function NftPage() {
  const { nftId } = useParams({ from: "/nft/$nftId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedEdition, setSelectedEdition] = useState("");
  const nftQuery = useQuery({
    queryKey: ["nft", nftId],
    queryFn: async () => (await api.get<Nft>(`/nfts/${nftId}`)).data,
  });
  const favorites = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => (await api.get<string[]>("/favorites")).data,
    retry: false,
  });
  const add = useMutation({
    mutationFn: () =>
      api.post("/cart/items", {
        nftId,
        quantity,
        edition: selectedEdition || nftQuery.data?.edition,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      navigate({ to: "/cart" });
    },
  });
  const favorite = useMutation({
    mutationFn: async () => {
      const enabled = favorites.data?.includes(nftId);
      return enabled
        ? api.delete(`/favorites/${nftId}`)
        : api.put(`/favorites/${nftId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });
  if (nftQuery.isPending)
    return (
      <DetailLayout>
        <LoadingBlock label="Carregando NFT" />
      </DetailLayout>
    );
  if (nftQuery.isError || !nftQuery.data)
    return (
      <DetailLayout>
        <section className="empty-state">
          <h1>NFT não encontrado</h1>
          <p>Esta obra não está disponível ou o link está incorreto.</p>
          <Link to="/">Voltar ao mercado</Link>
        </section>
      </DetailLayout>
    );
  const nft = nftQuery.data;
  const images = [nft.image, "ape-purple.png", "ape-dark.png", "ape-gold.png"];
  const editions = ["1/1", "1/10", "1/50", "Aberta"];
  const activeEdition = selectedEdition || nft.edition;
  const related = products
    .filter((item) => item.id !== nft.id && item.collection === nft.collection)
    .slice(0, 15);
  return (
    <DetailLayout>
      <section className="detail-top">
        <p className="detail-breadcrumb">Início / Mercado</p>
        <div className="detail-product">
          <div className="detail-gallery">
            <div className="detail-mobile-actions">
              <button
                aria-label="Voltar ao mercado"
                onClick={() => navigate({ to: "/", hash: "mercado" })}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Favoritar NFT"
                onClick={() => favorite.mutate()}
              >
                <Heart
                  size={18}
                  fill={
                    favorites.data?.includes(nftId) ? "currentColor" : "none"
                  }
                />
              </button>
            </div>
            <div className="detail-gallery__thumbs">
              {images.map((image, index) => (
                <button
                  aria-label={`Ver imagem ${index + 1}`}
                  className={selectedImage === index ? "is-selected" : ""}
                  key={`${image}-${index}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={`${ASSETS}/${image}`} alt="" />
                </button>
              ))}
            </div>
            <div className="detail-gallery__main">
              <img
                src={`${ASSETS}/${images[selectedImage]}`}
                alt={`${nft.name} ${nft.token}`}
              />
              <button
                className="detail-gallery__zoom"
                aria-label="Ampliar imagem"
              >
                <Search size={18} />
              </button>
            </div>
            <div className="detail-gallery__dots" aria-hidden="true">
              <span />
              <span className="is-active" />
              <span />
            </div>
          </div>
          <div className="detail-info">
            <div className="detail-info__header">
              <h1>
                {nft.name} {nft.token}
              </h1>
              <div className="detail-price-row">
                <strong>{eth(nft.price)}</strong>
                <DetailRating />
              </div>
              <hr />
            </div>
            <section className="detail-about">
              <h2>Sobre este NFT:</h2>
              <p>{nft.description}</p>
            </section>
            <section className="detail-edition">
              <h2>Edição:</h2>
              <div>
                {editions.map((edition) => (
                  <button
                    key={edition}
                    className={edition === activeEdition ? "is-selected" : ""}
                    onClick={() => setSelectedEdition(edition)}
                  >
                    {edition.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>
            <div className="detail-buy">
              <div className="detail-buy__top">
                <span>Qtd.</span>
                <div className="detail-quantity">
                  <button
                    aria-label="Diminuir quantidade"
                    disabled={quantity === 1}
                    onClick={() => setQuantity((value) => value - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <b>{quantity}</b>
                  <button
                    aria-label="Aumentar quantidade"
                    disabled={quantity >= nft.available}
                    onClick={() => setQuantity((value) => value + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <strong>{eth(nft.price)}</strong>
              </div>
              <div className="detail-buy__actions">
                <Button
                  onClick={() => add.mutate()}
                  disabled={add.isPending || nft.available === 0}
                >
                  COMPRAR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => favorite.mutate()}
                  aria-pressed={favorites.data?.includes(nftId)}
                >
                  <Heart
                    size={17}
                    fill={
                      favorites.data?.includes(nftId) ? "currentColor" : "none"
                    }
                  />
                  Favoritar
                </Button>
              </div>
            </div>
            {add.isError && <Alert>{errorMessage(add.error)}</Alert>}
            {favorite.isError && <Alert>{errorMessage(favorite.error)}</Alert>}
            <div className="detail-meta">
              <div>
                <span>ID do token</span>
                <b>{nft.token}</b>
              </div>
              <div>
                <span>Coleção</span>
                <b>{nft.collection}</b>
              </div>
              <div>
                <span>Atributos</span>
                <b>Óculos, Esmeralda, Raro</b>
              </div>
              <div className="detail-share">
                <b>Compartilhar este NFT:</b>
                <button aria-label="Compartilhar">
                  <Share2 size={15} />
                </button>
                <button aria-label="Compartilhar no Twitter">
                  <span>𝕏</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <DetailTabs nft={nft} edition={activeEdition} />
      <DetailRelatedCarousel items={related} />
    </DetailLayout>
  );
}

function CartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cart-shell">
      <DetailHeader />
      <main className="cart-page">
        <h1 className="cart-accessible-title" aria-label="Seu carrinho">
          Carrinho de NFTs
        </h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function CartSummaryPanel({
  cart,
  quote,
  coupon,
  setCoupon,
  message,
  onApply,
  pending,
  isAuthenticated,
}: {
  cart: Cart;
  quote?: Quote;
  coupon: string;
  setCoupon: (value: string) => void;
  message: string;
  onApply: () => void;
  pending: boolean;
  isAuthenticated: boolean;
}) {
  const rows = cart.items
    .map((item) => itemFor(item.nftId))
    .filter(Boolean) as Nft[];
  const subtotal = quote?.subtotal ?? addEth(...rows.map((nft) => multiplyEth(nft.price, cart.items.find((item) => item.nftId === nft.id)?.quantity ?? 0)));
  const discount = quote?.discount ?? "0";
  const networkFee = quote?.networkFee ?? (rows.length ? "0.12" : "0");
  const total = quote?.total ?? addEth(subtractEth(subtotal, discount), networkFee);
  return (
    <aside className="cart-summary">
      <div className="cart-summary__heading">
        <h2>Resumo da carteira</h2>
        <hr />
      </div>
      <form
        className="cart-summary__promo"
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <label htmlFor="cart-promo">Código promocional</label>
        <div>
          <input
            id="cart-promo"
            aria-label="Cupom de desconto"
            value={coupon}
            onChange={(event) => setCoupon(event.target.value)}
            placeholder="Digite o código promocional..."
          />
          <Button type="submit" size="sm" disabled={pending}>
            Aplicar
          </Button>
        </div>
        {message && <p role="status">{message}</p>}
      </form>
      <div className="cart-summary__fees">
        <div>
          <span>Subtotal</span>
          <b>{eth(subtotal)}</b>
        </div>
        <div>
          <span>Desconto do lançamento</span>
          <b>- {eth(discount)}</b>
        </div>
        <div className="cart-summary__network">
          <div>
            <span>Taxa de rede</span>
            <b>{eth(networkFee)}</b>
          </div>
          <small>Taxa estimada</small>
        </div>
      </div>
      <div className="cart-summary__total">
        <span>Total</span>
        <b>{eth(total)}</b>
      </div>
      <div className="cart-summary__cta">
        <Button asChild>
          <Link aria-label="Continuar para pagamento" to="/checkout">
            {isAuthenticated ? "Finalizar pedido" : "Conectar e finalizar"}
          </Link>
        </Button>
        <Link to="/" hash="mercado">
          Continuar explorando
        </Link>
      </div>
    </aside>
  );
}

function CartRelatedProducts() {
  const ids = [
    "cosmic-118",
    "violet-314",
    "ivory-088",
    "golden-207",
    "golden-160",
  ];
  const related = ids
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean) as Nft[];
  return (
    <section className="cart-related">
      <div className="cart-related__heading">
        <h2>Colecionadores também viram</h2>
        <hr />
      </div>
      <div className="cart-related__grid">
        {related.map((item) => (
          <Link
            to="/nft/$nftId"
            params={{ nftId: item.id }}
            className="cart-related-card"
            key={item.id}
          >
            <div className="cart-related-card__image">
              <img
                src={`${ASSETS}/${item.image}`}
                alt={`${item.name} ${item.token}`}
              />
            </div>
            <div>
              <p>
                {item.name} {item.token}
              </p>
              <strong>{eth(item.price)}</strong>
            </div>
          </Link>
        ))}
      </div>
      <div className="cart-related__dots">
        <span />
        <span className="is-active" />
        <span />
      </div>
    </section>
  );
}

export function CartPage() {
  const cartQuery = useCart();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<Quote>();
  const [message, setMessage] = useState("");
  const update = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.patch("/cart/items/" + id, { quantity }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.cart }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete("/cart/items/" + id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.cart }),
  });
  const couponMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<Quote>("/quote", {
          coupon: coupon.trim().toUpperCase() || undefined,
        })
      ).data,
    onSuccess: (value) => {
      setQuote(value);
      setMessage(coupon ? "Cupom aplicado." : "Cupom removido.");
    },
    onError: (error) => setMessage(errorMessage(error)),
  });
  if (cartQuery.isPending)
    return (
      <CartLayout>
        <LoadingBlock label="Carregando carrinho" />
      </CartLayout>
    );
  const cart = cartQuery.data!;
  const rows = cart.items
    .map((item) => ({ item, nft: itemFor(item.nftId) }))
    .filter((row): row is { item: (typeof cart.items)[number]; nft: Nft } =>
      Boolean(row.nft),
    );
  return (
    <CartLayout>
      <section className="cart-top">
        <div className="cart-mobile-header">
          <button
            aria-label="Voltar ao mercado"
            onClick={() => window.history.back()}
          >
            <ChevronLeft size={20} />
          </button>
          <h1 aria-label="Seu carrinho">Carrinho de NFTs</h1>
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
        {!rows.length ? (
          <section className="empty-state cart-empty">
            <ShoppingBag size={38} />
            <h2>Seu carrinho está vazio</h2>
            <p>Explore obras digitais selecionadas para começar sua coleção.</p>
            <Link to="/" hash="mercado">
              Explorar NFTs
            </Link>
          </section>
        ) : (
          <div className="cart-body">
            <section className="cart-table">
              <div className="cart-table__header">
                <span>NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
                <span aria-hidden="true" />
              </div>
              <hr />{" "}
              <div className="cart-table__items">
                {rows.map(({ item, nft }) => (
                  <article className="cart-table__item" key={item.nftId}>
                    <div className="cart-table__product">
                      <img
                        src={`${ASSETS}/${nft.image}`}
                        alt={`${nft.name} ${nft.token}`}
                      />
                      <div>
                        <h2>
                          {nft.name} {nft.token}
                        </h2>
                        <p>ID do token: {nft.token}</p>
                      </div>
                    </div>
                    <strong className="cart-table__price">
                      {eth(nft.price)}
                    </strong>
                    <span className="cart-table__edition">{item.edition}</span>
                    <strong className="cart-table__line-total">
                      {eth(multiplyEth(nft.price, item.quantity))}
                    </strong>
                    <div className="cart-table__quantity">
                      <button
                        aria-label={`Diminuir quantidade de ${nft.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          update.mutate({
                            id: item.nftId,
                            quantity: item.quantity - 1,
                          })
                        }
                      >
                        <Minus size={12} />
                      </button>
                      <b>{item.quantity}</b>
                      <button
                        aria-label={`Aumentar quantidade de ${nft.name}`}
                        disabled={item.quantity >= nft.available}
                        onClick={() =>
                          update.mutate({
                            id: item.nftId,
                            quantity: item.quantity + 1,
                          })
                        }
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      className="cart-table__remove"
                      aria-label={`Remover ${nft.name}`}
                      onClick={() => remove.mutate(item.nftId)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
            <CartSummaryPanel
              cart={cart}
              quote={quote}
              coupon={coupon}
              setCoupon={setCoupon}
              message={message}
              onApply={() => couponMutation.mutate()}
              pending={couponMutation.isPending}
              isAuthenticated={Boolean(session)}
            />
          </div>
        )}
      </section>
      <CartRelatedProducts />
    </CartLayout>
  );
}

function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="checkout-shell">
      <DetailHeader />
      <main className="checkout-page">{children}</main>
      <SiteFooter />
    </div>
  );
}

function CheckoutSummary({
  cart,
  quote,
  network,
  wallets,
  walletId,
  setWalletId,
  pending,
}: {
  cart: Cart;
  quote?: Quote;
  network: string;
  wallets?: Wallet[];
  walletId: string;
  setWalletId: (value: string) => void;
  pending: boolean;
}) {
  const rows = cart.items
    .map((item) => ({ item, nft: itemFor(item.nftId) }))
    .filter((row): row is { item: Cart["items"][number]; nft: Nft } =>
      Boolean(row.nft),
    );
  const subtotal = quote?.subtotal ?? addEth(...rows.map(({ item, nft }) => multiplyEth(nft.price, item.quantity)));
  const discount = quote?.discount ?? "0";
  const networkFee = quote?.networkFee ?? (rows.length ? "0.12" : "0");
  const total = quote?.total ?? addEth(subtractEth(subtotal, discount), networkFee);
  const compatibleWallets =
    wallets?.filter((wallet) => wallet.network === network) ?? [];

  return (
    <aside className="checkout-summary" aria-label="Resumo do pagamento">
      <section className="checkout-summary__nfts">
        <h2>Seus NFTs</h2>
        <div className="checkout-summary__table-head">
          <span>NFTs</span>
          <span>Subtotal</span>
        </div>
        <div className="checkout-summary__items">
          {rows.map(({ item, nft }) => (
            <article key={item.nftId} className="checkout-summary__item">
              <img
                src={`${ASSETS}/${nft.image}`}
                alt={`${nft.name} ${nft.token}`}
              />
              <div>
                <h3>
                  {nft.name} {nft.token}
                </h3>
                <p>
                  {item.edition} · {item.quantity} edição
                  {item.quantity > 1 ? "ões" : ""}
                </p>
              </div>
              <strong>
                {eth(multiplyEth(nft.price, item.quantity))}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <Link className="checkout-summary__coupon" to="/cart">
        Tem um código promocional? Aplique aqui
      </Link>
      <div className="checkout-summary__totals">
        <div>
          <span>Subtotal</span>
          <b>{eth(subtotal)}</b>
        </div>
        <div>
          <span>Desconto do lançamento</span>
          <b>- {eth(discount)}</b>
        </div>
        <div className="checkout-summary__network">
          <div>
            <span>Taxa de rede</span>
            <b>{eth(networkFee)}</b>
          </div>
          <small>Taxa estimada</small>
        </div>
        <hr />
        <div className="checkout-summary__total">
          <strong>Total</strong>
          <b>{eth(total)}</b>
        </div>
      </div>

      <section className="checkout-wallet">
        <h2>Carteira e rede</h2>
        <div
          role="radiogroup"
          aria-label={`Carteiras em ${network}`}
          className="checkout-wallet__choices"
        >
          {compatibleWallets.map((wallet) => (
            <label
              className={wallet.id === walletId ? "is-selected" : ""}
              key={wallet.id}
            >
              <input
                type="radio"
                name="checkout-wallet"
                value={wallet.id}
                checked={wallet.id === walletId}
                onChange={() => setWalletId(wallet.id)}
              />
              <span>
                <b>{wallet.label}</b>
                <small>
                  {wallet.address} · {wallet.network}
                </small>
              </span>
            </label>
          ))}
          {!compatibleWallets.length && (
            <Link to="/carteiras">Cadastrar uma carteira em {network}</Link>
          )}
        </div>
        <Button type="submit" form="checkout-form" disabled={pending}>
          {pending ? "Confirmando..." : "Confirmar pedido"}
        </Button>
      </section>
    </aside>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { openAuth } = useAuthModal();
  const cartQuery = useCart();
  const { data: wallets, isPending: walletsPending } = useWallets();
  const { data: session } = useSession();
  const [network, setNetwork] = useState("Ethereum");
  const [walletId, setWalletId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    profileName: "",
    address: "",
    walletType: "",
    secondaryAddress: "",
    referralCode: "",
    ens: "",
    note: "",
    terms: false,
  });
  const [useOtherWallet, setUseOtherWallet] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!session) return;
    setForm((current) => ({
      ...current,
      name: current.name || session.name,
      email: current.email || session.email,
      username:
        current.username || session.name.toLocaleLowerCase().replace(/\s+/g, "."),
      profileName: current.profileName || session.name,
    }));
  }, [session]);
  useEffect(() => {
    if (useOtherWallet || !wallets?.length || walletId) return;
    const compatible = wallets.find((wallet) => wallet.network === network);
    setWalletId((compatible ?? wallets[0]).id);
  }, [network, useOtherWallet, walletId, wallets]);
  useEffect(() => {
    if (useOtherWallet) return;
    const selectedWallet = wallets?.find((wallet) => wallet.id === walletId);
    if (!selectedWallet) return;
    setForm((current) => ({
      ...current,
      address: selectedWallet.address,
      walletType: current.walletType || "MetaMask",
    }));
  }, [useOtherWallet, walletId, wallets]);
  const quoteQuery = useQuery({
    queryKey: ["quote", cartQuery.data?.version],
    enabled: Boolean(cartQuery.data?.items.length),
    queryFn: async () =>
      (await api.post<Quote>("/quote", { coupon: cartQuery.data?.coupon }))
        .data,
  });
  const order = useMutation({
    mutationFn: async () =>
      (await api.post<Order>("/orders", {
        idempotencyKey: sessionStorage.getItem('kurio-checkout-key') ?? (() => { const key = crypto.randomUUID(); sessionStorage.setItem('kurio-checkout-key', key); return key })(),
        network,
        walletId: useOtherWallet ? form.address : walletId,
        quote: quoteQuery.data,
        cartVersion: cartQuery.data?.version,
      })).data,
    onSuccess: (value) => { sessionStorage.removeItem('kurio-checkout-key'); navigate({ to: "/order/$orderId", params: { orderId: value.id } }); },
    onError: (error) => setMessage(errorMessage(error)),
  });
  if (cartQuery.isPending || walletsPending)
    return (
      <CheckoutLayout>
        <LoadingBlock label="Preparando pagamento" />
      </CheckoutLayout>
    );
  const cart = cartQuery.data!;
  if (!cart.items.length)
    return (
      <CheckoutLayout>
        <section className="empty-state">
          <h1>Nenhum item para pagar</h1>
          <Link to="/" hash="mercado">
            Voltar ao mercado
          </Link>
        </section>
      </CheckoutLayout>
    );
  return (
    <CheckoutLayout>
      <section className="checkout-content">
        <nav className="checkout-breadcrumb" aria-label="Caminho de navegação">
          <Link to="/" hash="inicio">
            Início
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/" hash="mercado">
            Mercado
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Pagamento</span>
        </nav>
        <Link
          className="checkout-mobile-back"
          to="/cart"
          aria-label="Voltar ao carrinho"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="checkout-layout">
          <form
            id="checkout-form"
            className="checkout-profile"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session) {
                localStorage.setItem("kurio-return-to", "/checkout");
                openAuth('login');
                return;
              }
              if (
                !form.name ||
                !form.email ||
                !form.terms ||
                !form.address ||
                (!useOtherWallet && !walletId)
              ) {
                setMessage(
                  "Preencha os dados, selecione uma carteira e aceite os termos.",
                );
                return;
              }
              order.mutate();
            }}
          >
            <h1>Perfil do colecionador</h1>
            <div className="checkout-profile__fields">
              <div className="checkout-profile__column">
                <label>
                  <span>
                    Nome de exibição <em>*</em>
                  </span>
                  <input
                    aria-label="Nome"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="Seu nome"
                  />
                </label>
                <label>
                  <span>
                    Rede <em>*</em>
                  </span>
                  <select
                    aria-label="Rede"
                    value={network}
                    onChange={(event) => {
                      setNetwork(event.target.value);
                      setWalletId("");
                    }}
                  >
                    <option>Ethereum</option>
                    <option>Polygon</option>
                    <option>Solana</option>
                  </select>
                </label>
                <label>
                  <span>
                    Endereço da carteira <em>*</em>
                  </span>
                  <input
                    aria-label="Endereço da carteira"
                    value={form.address}
                    onChange={(event) =>
                      setForm({ ...form, address: event.target.value })
                    }
                    placeholder="Endereço 0x da carteira"
                    readOnly={!useOtherWallet && Boolean(walletId)}
                  />
                </label>
                <label>
                  <span>
                    Tipo de carteira <em>*</em>
                  </span>
                  <select
                    aria-label="Tipo de carteira"
                    value={form.walletType}
                    onChange={(event) =>
                      setForm({ ...form, walletType: event.target.value })
                    }
                    disabled={!useOtherWallet && Boolean(walletId)}
                  >
                    <option value="">Selecione uma carteira</option>
                    <option>MetaMask</option>
                    <option>WalletConnect</option>
                    <option>Carteira de contrato</option>
                  </select>
                </label>
                <label>
                  <span>
                    E-mail <em>*</em>
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="voce@exemplo.com"
                  />
                </label>
              </div>
              <div className="checkout-profile__column">
                <label>
                  <span>
                    Nome de usuário <em>*</em>
                  </span>
                  <input
                    aria-label="Usuário"
                    value={form.username}
                    onChange={(event) =>
                      setForm({ ...form, username: event.target.value })
                    }
                    placeholder="Seu @usuário"
                  />
                </label>
                <label>
                  <span>
                    Nome do perfil <em>*</em>
                  </span>
                  <input
                    aria-label="Perfil público"
                    value={form.profileName}
                    onChange={(event) =>
                      setForm({ ...form, profileName: event.target.value })
                    }
                    placeholder="Como será exibido"
                  />
                </label>
                <label>
                  ENS ou carteira secundária
                  <input
                    value={form.secondaryAddress}
                    onChange={(event) =>
                      setForm({ ...form, secondaryAddress: event.target.value })
                    }
                    placeholder="Opcional"
                  />
                </label>
                <label>
                  Código de indicação
                  <input
                    value={form.referralCode}
                    onChange={(event) =>
                      setForm({ ...form, referralCode: event.target.value })
                    }
                    placeholder="Opcional"
                  />
                </label>
                <label>
                  Nome ENS{" "}
                  <span className="checkout-input-suffix">
                    <input
                      aria-label="Identificador ENS"
                      value={form.ens}
                      onChange={(event) =>
                        setForm({ ...form, ens: event.target.value })
                      }
                      placeholder="nome"
                    />
                    <b>.eth</b>
                  </span>
                </label>
              </div>
            </div>
            <label className="checkout-other-wallet">
              <input
                type="checkbox"
                checked={useOtherWallet}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setUseOtherWallet(checked);
                  if (checked) {
                    setWalletId("");
                    setForm((current) => ({
                      ...current,
                      address: "",
                      walletType: "",
                    }));
                  }
                }}
              />
              Usar outra carteira?
            </label>
            <label className="checkout-note">
              Observação do colecionador (opcional)
              <textarea
                value={form.note}
                onChange={(event) =>
                  setForm({ ...form, note: event.target.value })
                }
                placeholder="Conte algo para o criador..."
              />
            </label>
            <label className="checkout-terms">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(event) =>
                  setForm({ ...form, terms: event.target.checked })
                }
              />
              Li e concordo com os termos da compra.
            </label>
            {message && <Alert>{message}</Alert>}
          </form>
          <CheckoutSummary
            cart={cart}
            quote={quoteQuery.data}
            network={network}
            wallets={wallets}
            walletId={walletId}
            setWalletId={setWalletId}
            pending={order.isPending}
          />
        </div>
      </section>
    </CheckoutLayout>
  );
}

export function OrderPage() {
  const { orderId } = useParams({ from: "/order/$orderId" });
  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => (await api.get<Order>("/orders/" + orderId)).data,
  });
  if (orderQuery.isPending)
    return (
      <DetailLayout>
        <LoadingBlock label="Consultando confirmação" />
      </DetailLayout>
    );
  if (orderQuery.isError || !orderQuery.data)
    return (
      <DetailLayout>
        <section className="empty-state">
          <h1>Pedido não encontrado</h1>
          <Link to="/">Voltar ao início</Link>
        </section>
      </DetailLayout>
    );
  const order = orderQuery.data;
  if (order.status === 'pending')
    return (
      <DetailLayout>
        <section className="empty-state" role="status" aria-live="polite">
          <h1>Pagamento em processamento</h1>
          <p>Estamos aguardando a confirmação da simulação. Esta página pode ser recarregada sem duplicar a compra.</p>
        </section>
      </DetailLayout>
    );
  if (order.status === 'declined')
    return (
      <DetailLayout>
        <section className="empty-state" role="alert">
          <h1>Pagamento recusado</h1>
          <p>Os itens continuam reservados no seu carrinho. Revise a carteira ou tente novamente.</p>
          <Link to="/checkout">Voltar ao pagamento</Link>
        </section>
      </DetailLayout>
    );
  const items = order.items
    .map((item) => {
      const nft = itemFor(item.nftId);
      return nft
        ? {
            id: item.nftId,
            image: nft.image,
            name: nft.name,
            token: nft.token,
            quantity: item.quantity,
            total: multiplyEth(nft.price, item.quantity),
          }
        : null;
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        image: string;
        name: string;
        token: string;
        quantity: number;
        total: string;
      } => Boolean(item),
    );
  return (
    <DetailLayout>
      <main className="order-page">
        <OrderConfirmation order={order} items={items} />
      </main>
    </DetailLayout>
  );
}

function RequireSession({ children }: { children: React.ReactNode }) {
  const { data, isPending } = useSession();
  const { openAuth } = useAuthModal();
  if (isPending)
    return (
      <DetailLayout>
        <LoadingBlock />
      </DetailLayout>
    );
  return data ? (
    <>{children}</>
  ) : (
    <DetailLayout>
      <section className="empty-state">
        <h1>Entre para continuar</h1>
        <p>Esta área guarda dados privados da sua coleção.</p>
        <Button type="button" onClick={() => openAuth('login')}>Entrar</Button>
      </section>
    </DetailLayout>
  );
}
export function ProfilePage() {
  const profile = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    ens: "",
    walletAlias: "",
    currentPassword: "",
    nextPassword: "",
    confirmation: "",
  });
  const [avatar, setAvatar] = useState("");
  const [message, setMessage] = useState("");
  const logout = useMutation({
    mutationFn: () => api.post("/session/logout"),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.session });
      queryClient.removeQueries({ queryKey: queryKeys.wallets });
      navigate({ to: "/" });
    },
  });
  useEffect(() => {
    if (!profile.data) return;
    setForm((current) => ({
      ...current,
      name: current.name || profile.data.name,
      username:
        current.username ||
        profile.data.username || profile.data.name.toLocaleLowerCase().replace(/\s+/g, "."),
      email: current.email || profile.data.email,
      ens: current.ens || profile.data.ens || "",
      walletAlias: current.walletAlias || profile.data.walletAlias || "",
    }));
    setAvatar((current) => current || profile.data.avatar || "");
  }, [profile.data]);
  const save = useMutation({
    mutationFn: () =>
      api.patch<User>("/profile", {
        name: form.name || profile.data?.name,
        email: form.email || profile.data?.email,
        username: form.username,
        ens: form.ens,
        walletAlias: form.walletAlias,
        avatar,
        currentPassword: form.currentPassword || undefined,
        nextPassword: form.nextPassword || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
      setForm((current) => ({
        ...current,
        currentPassword: "",
        nextPassword: "",
        confirmation: "",
      }));
      setMessage("Perfil atualizado com sucesso.");
    },
    onError: (error) => setMessage(errorMessage(error)),
  });
  return (
    <RequireSession>
      <AccountLayout>
        <section className="account-page">
          <AccountMobileHeader title="Meu perfil" />
          <div className="account-layout">
            <AccountSidebar
              active="profile"
              onLogout={() => logout.mutate()}
              loggingOut={logout.isPending}
            />
            <form
              className="account-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  form.nextPassword &&
                  form.nextPassword !== form.confirmation
                ) {
                  setMessage("A confirmação da nova senha não corresponde.");
                  return;
                }
                if (form.nextPassword && !form.currentPassword) {
                  setMessage("Informe a senha atual para alterá-la.");
                  return;
                }
                save.mutate();
              }}
            >
              <h1>Perfil do colecionador</h1>
              <div className="account-form__grid">
                <label>
                  <span>Nome de exibição <em>*</em></span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  <span>Nome de usuário <em>*</em></span>
                  <input
                    value={form.username}
                    onChange={(event) =>
                      setForm({ ...form, username: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  <span>E-mail <em>*</em></span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  <span>Nome ENS <em>*</em></span>
                  <div className="account-ens">
                    <span>.eth</span>
                    <input
                      value={form.ens}
                      onChange={(event) =>
                        setForm({ ...form, ens: event.target.value })
                      }
                      aria-label="Nome ENS"
                    />
                  </div>
                </label>
                <label>
                  <span>Apelido da carteira <em>*</em></span>
                  <input
                    value={form.walletAlias}
                    onChange={(event) =>
                      setForm({ ...form, walletAlias: event.target.value })
                    }
                  />
                </label>
                <div className="account-avatar-field">
                  <span>Avatar</span>
                  <div>
                    <i className={avatar ? "has-image" : ""}>
                      {avatar ? <img src={avatar} alt="Preview do avatar" /> : profile.data?.name.slice(0, 1).toUpperCase()}
                    </i>
                    <label className="account-avatar-field__choose">
                      Alterar
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            setAvatar(String(reader.result));
                            setMessage("Avatar selecionado. Salve para confirmar.");
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => { setAvatar(""); setMessage("Avatar removido. Salve para confirmar."); }}>Remover</button>
                  </div>
                </div>
              </div>
              <section className="account-passwords">
                <h2>Alterar senha</h2>
                <label>
                  <span>Senha atual</span>
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) =>
                      setForm({ ...form, currentPassword: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Nova senha</span>
                  <input
                    type="password"
                    value={form.nextPassword}
                    onChange={(event) =>
                      setForm({ ...form, nextPassword: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Confirmar nova senha</span>
                  <input
                    type="password"
                    value={form.confirmation}
                    onChange={(event) =>
                      setForm({ ...form, confirmation: event.target.value })
                    }
                  />
                </label>
              </section>
              {message && <p className="account-form__message" role="status">{message}</p>}
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </div>
        </section>
      </AccountLayout>
    </RequireSession>
  );
}

export function WalletsPage() {
  const walletsQuery = useWallets();
  const profile = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const wallets = walletsQuery.data ?? [];
  const primary = wallets.find((wallet) => wallet.primary);
  const [adding, setAdding] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const activeWallet = wallets.find((wallet) => wallet.id === editingWalletId) ?? primary;
  const secondaryWallets = wallets.filter((wallet) => !wallet.primary);
  const [copyPrimary, setCopyPrimary] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    label: "",
    network: "Ethereum",
    profileName: "",
    address: "",
    secondaryAddress: "",
    walletType: "",
    referralCode: "",
    email: "",
    ens: "",
  });
  const [message, setMessage] = useState("");
  const logout = useMutation({
    mutationFn: () => api.post("/session/logout"),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.session });
      queryClient.removeQueries({ queryKey: queryKeys.wallets });
      navigate({ to: "/" });
    },
  });
  useEffect(() => {
    if (adding) return;
    setForm({
      displayName: profile.data?.name ?? "",
      label: activeWallet?.label ?? "",
      network: activeWallet?.network ?? "Ethereum",
      profileName: profile.data?.name ?? "",
      address: activeWallet?.address ?? "",
      secondaryAddress: "",
      walletType: activeWallet ? "MetaMask" : "",
      referralCode: "",
      email: profile.data?.email ?? "",
      ens: "",
    });
  }, [activeWallet?.id, adding, profile.data?.email, profile.data?.name]);
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        label: form.label,
        address: form.address,
        network: form.network as Wallet["network"],
      };
      return adding || !activeWallet
        ? (await api.post<Wallet>("/wallets", payload)).data
        : (await api.patch<Wallet>(`/wallets/${activeWallet.id}`, payload)).data;
    },
    onSuccess: (wallet) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      setAdding(false);
      setCopyPrimary(false);
      setEditingWalletId(wallet.id);
      setMessage("Carteira salva com sucesso.");
    },
    onError: (error) => setMessage(errorMessage(error)),
  });
  const startAdding = () => {
    setAdding(true);
    setEditingWalletId(null);
    setCopyPrimary(false);
    setForm({
      displayName: profile.data?.name ?? "",
      label: "",
      network: "Ethereum",
      profileName: profile.data?.name ?? "",
      address: "",
      secondaryAddress: "",
      walletType: "",
      referralCode: "",
      email: profile.data?.email ?? "",
      ens: "",
    });
    setMessage("");
  };
  const editWallet = (wallet: Wallet) => {
    setAdding(false);
    setEditingWalletId(wallet.id);
    setCopyPrimary(false);
    setMessage("");
  };
  return (
    <RequireSession>
      <AccountLayout>
        <section className="account-page">
          <AccountMobileHeader title="Carteiras" />
          <div className="account-layout">
            <AccountSidebar
              active="wallets"
              onLogout={() => logout.mutate()}
              loggingOut={logout.isPending}
            />
            <form
              className="account-form account-wallet-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!form.label || !form.address || !form.walletType) {
                  setMessage("Preencha os campos obrigatórios da carteira.");
                  return;
                }
                save.mutate();
              }}
            >
              <header className="account-wallet-form__heading">
                <div>
                  <h1>
                    {adding
                      ? "Adicionar carteira"
                      : activeWallet?.primary
                        ? "Carteira principal"
                        : "Carteira secundária"}
                  </h1>
                  <p>Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
                </div>
                <button type="button" aria-label="Adicionar carteira" onClick={startAdding}>Adicionar</button>
              </header>
              <div className="account-form__grid">
                <label>
                  <span>Nome de exibição <em>*</em></span>
                  <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required />
                </label>
                <label>
                  <span>Apelido da carteira <em>*</em></span>
                  <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required />
                </label>
                <label>
                  <span>Rede <em>*</em></span>
                  <select value={form.network} onChange={(event) => setForm({ ...form, network: event.target.value })}>
                    <option>Ethereum</option>
                    <option>Polygon</option>
                    <option>Solana</option>
                  </select>
                </label>
                <label>
                  <span>Nome do perfil <em>*</em></span>
                  <input value={form.profileName} onChange={(event) => setForm({ ...form, profileName: event.target.value })} />
                </label>
                <label>
                  <span>Endereço da carteira <em>*</em></span>
                  <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Endereço 0x da carteira" required />
                </label>
                <label>
                  <span className="account-form__screen-reader">Endereço secundário</span>
                  <input value={form.secondaryAddress} onChange={(event) => setForm({ ...form, secondaryAddress: event.target.value })} placeholder="ENS ou carteira secundária (opcional)" />
                </label>
                <label>
                  <span>Tipo de carteira <em>*</em></span>
                  <select value={form.walletType} onChange={(event) => setForm({ ...form, walletType: event.target.value })} required>
                    <option value="">Selecione uma carteira</option>
                    <option>MetaMask</option>
                    <option>WalletConnect</option>
                    <option>Carteira de contrato</option>
                  </select>
                </label>
                <label>
                  <span>Código de indicação <em>*</em></span>
                  <input value={form.referralCode} onChange={(event) => setForm({ ...form, referralCode: event.target.value })} />
                </label>
                <label>
                  <span>E-mail <em>*</em></span>
                  <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </label>
                <label>
                  <span>Nome ENS <em>*</em></span>
                  <div className="account-ens"><span>.eth</span><input value={form.ens} onChange={(event) => setForm({ ...form, ens: event.target.value })} aria-label="Nome ENS" /></div>
                </label>
              </div>
              {message && <p className="account-form__message" role="status">{message}</p>}
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar carteira"}</Button>
              <section className="account-secondary-wallet">
                <div className="account-secondary-wallet__heading">
                  <h2>Carteira secundária</h2>
                  <label>
                    <input
                      type="checkbox"
                      checked={copyPrimary}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setCopyPrimary(checked);
                        if (checked && primary) {
                          setAdding(true);
                          setEditingWalletId(null);
                          setForm((current) => ({
                            ...current,
                            label: `${primary.label} secundária`,
                            network: primary.network,
                            address: primary.address,
                            walletType: "MetaMask",
                          }));
                        }
                      }}
                    />
                    Igual à carteira principal
                  </label>
                  <button type="button" aria-label="Adicionar carteira secundária" onClick={startAdding}>Adicionar</button>
                </div>
                {secondaryWallets.length ? (
                  <div className="account-secondary-wallet__list">
                    {secondaryWallets.map((wallet) => (
                      <button
                        className={wallet.id === activeWallet?.id && !adding ? "is-active" : ""}
                        type="button"
                        key={wallet.id}
                        onClick={() => editWallet(wallet)}
                      >
                        <b>{wallet.label}</b>
                        <span>{wallet.address} · {wallet.network}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>Você ainda não adicionou uma carteira secundária.</p>
                )}
              </section>
            </form>
          </div>
        </section>
      </AccountLayout>
    </RequireSession>
  );
}
