import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronLeft, Heart, Minus, Plus, Search, Share2, Star } from "lucide-react";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/feedback";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { ASSETS, DetailLayout, DetailSkeleton, ErrorState } from "../components/layout";
import { useAuthModal } from "../components/auth-modal";
import { NotFoundContent } from "./not-found";
import {
  nftQuery,
  useAddToCart,
  useFavorites,
  useNfts,
  useToggleFavorite,
  useViewer,
} from "../api/queries";
import { toApiError } from "../api/client";
import { announce } from "../lib/announcer";
import { eth, type Nft } from "../domain";

function DetailRating() {
  return (
    <div className="detail-rating" role="img" aria-label="4.8 de 5 estrelas, 19 avaliações">
      <span className="detail-rating__stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} size={15} fill="currentColor" />
        ))}
      </span>
      <span className="detail-rating__full" aria-hidden="true">19 avaliações de colecionadores</span>
      <span className="detail-rating__compact" aria-hidden="true">4.8 (19)</span>
    </div>
  );
}

const reviews = [
  { name: "Luna Matos", date: "Há 2 dias", score: "5.0", text: "A peça chegou exatamente como apresentada. Os metadados e a procedência estão impecáveis." },
  { name: "Rafael Lin", date: "Há 1 semana", score: "4.8", text: "Arte marcante e ótima experiência de compra. Uma das minhas favoritas da coleção." },
  { name: "Nina Costa", date: "Há 2 semanas", score: "5.0", text: "Excelente curadoria. A paleta e os detalhes da edição ficam ainda melhores em alta resolução." },
];

function DetailTabs({ nft, edition }: { nft: Nft; edition: string }) {
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");
  const select = (tab: "details" | "reviews") => {
    setActiveTab(tab);
    document.getElementById(tab === "details" ? "nft-details-tab" : "nft-reviews-tab")?.focus();
  };
  return (
    <section className="detail-description">
      <div
        className="detail-description__heading"
        role="tablist"
        aria-label="Informações do NFT"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") select(activeTab === "details" ? "reviews" : "details");
        }}
      >
        <button
          type="button"
          role="tab"
          id="nft-details-tab"
          aria-selected={activeTab === "details"}
          aria-controls="nft-details-panel"
          tabIndex={activeTab === "details" ? 0 : -1}
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
          tabIndex={activeTab === "reviews" ? 0 : -1}
          className={activeTab === "reviews" ? "is-active" : ""}
          onClick={() => setActiveTab("reviews")}
        >
          Avaliações de colecionadores (19)
        </button>
      </div>

      {activeTab === "details" ? (
        <div id="nft-details-panel" role="tabpanel" aria-labelledby="nft-details-tab" tabIndex={0} className="detail-tab-panel detail-tab-panel--details">
          <p>
            <strong>
              {nft.name} {nft.token}
            </strong>{" "}
            é uma obra digital {edition} finalizada à mão da coleção {nft.collection}. Cada atributo fica armazenado
            nos metadados do token e verificado na {nft.network}. A obra explora identidade, movimento e luz em um
            mundo digital sem fronteiras.
            <br />
            <br />A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um
            registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas
            vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.
          </p>
          <dl>
            <div>
              <dt>Rede:</dt>
              <dd>Cunhado na {nft.network} com procedência imutável e metadados armazenados no IPFS.</dd>
            </div>
            <div>
              <dt>Contrato:</dt>
              <dd>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
            </div>
            <div>
              <dt>Direitos autorais:</dt>
              <dd>0x7A42...19E8 • Contrato inteligente ERC-721 verificado.</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div id="nft-reviews-panel" role="tabpanel" aria-labelledby="nft-reviews-tab" tabIndex={0} className="detail-tab-panel detail-reviews">
          <div className="detail-reviews__summary">
            <strong>4.8</strong>
            <div>
              <span aria-hidden="true">
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
                  <span className="detail-review-card__score" aria-label={`Nota ${review.score}`}>
                    <Star size={13} fill="currentColor" aria-hidden="true" /> {review.score}
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
    for (let index = 0; index < items.length; index += 5) result.push(items.slice(index, index + 5));
    return result;
  }, [items]);
  const [page, setPage] = useState(0);
  const activePage = Math.min(page, Math.max(pages.length - 1, 0));
  if (!pages.length) return null;
  const move = (direction: -1 | 1) => setPage((current) => (current + direction + pages.length) % pages.length);
  return (
    <section className="detail-related" aria-label="Mais desta coleção">
      <div className="detail-related__heading">
        <h2>Mais desta coleção</h2>
        <hr />
      </div>
      <div
        className="detail-related__viewport"
        tabIndex={0}
        role="region"
        aria-roledescription="carrossel"
        aria-label={`Página ${activePage + 1} de ${pages.length} da coleção`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") move(-1);
          if (event.key === "ArrowRight") move(1);
        }}
      >
        <div className="detail-related__track" style={{ transform: `translateX(-${(activePage * 100) / pages.length}%)` }}>
          {pages.map((collectionPage, pageIndex) => (
            <div className="detail-related__page" key={`collection-page-${pageIndex}`} aria-hidden={pageIndex !== activePage}>
              {collectionPage.map((item) => (
                <Link
                  to="/nft/$nftId"
                  params={{ nftId: item.id }}
                  className="detail-related-card"
                  key={item.id}
                  tabIndex={pageIndex === activePage ? 0 : -1}
                >
                  <div className="detail-related-card__image">
                    <img src={`${ASSETS}/${item.image}`} alt={`${item.name} ${item.token}`} loading="lazy" decoding="async" {...{ fetchpriority: "low" }} />
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
        <div className="detail-related__dots" role="group" aria-label="Navegação da coleção">
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
  const { openAuth } = useAuthModal();
  const { user, userId, owner } = useViewer();
  const detail = useQuery(nftQuery(nftId));
  const favorites = useFavorites(userId);
  const toggleFavorite = useToggleFavorite(userId);
  const add = useAddToCart(owner);
  const related = useNfts(
    { collection: detail.data?.collection, exclude: nftId, pageSize: 15, page: 1 },
    { enabled: Boolean(detail.data) },
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedEdition, setSelectedEdition] = useState("");
  const [zoomOpen, setZoomOpen] = useState(false);

  if (detail.isPending)
    return (
      <DetailLayout>
        <DetailSkeleton />
      </DetailLayout>
    );
  if (detail.isError) {
    const error = toApiError(detail.error);
    return (
      <DetailLayout>
        {error.code === "NOT_FOUND" ? (
          <NotFoundContent title="NFT não encontrado" description="Esta obra não existe ou o link está incorreto." />
        ) : (
          <ErrorState error={error} title="Não foi possível carregar este NFT" onRetry={() => void detail.refetch()} retrying={detail.isFetching} />
        )}
      </DetailLayout>
    );
  }
  const nft = detail.data;
  const images = [nft.image, "ape-purple.webp", "ape-dark.webp", "ape-gold.webp"];
  const preferredEdition = nft.editions.find((edition) => edition.label === nft.edition && edition.available > 0)
    ?? nft.editions.find((edition) => edition.available > 0);
  const activeEdition = nft.editions.find((edition) => edition.label === selectedEdition) ?? preferredEdition ?? nft.editions[0];
  const available = activeEdition?.available ?? 0;
  const safeQuantity = Math.max(1, Math.min(quantity, Math.max(available, 1)));
  const isFavorite = Boolean(favorites.data?.includes(nftId));
  const soldOut = nft.available === 0;
  const onFavorite = () => {
    if (!user) {
      openAuth("login", () => toggleFavorite.mutate({ nftId, favorite: true, name: nft.name }));
      return;
    }
    toggleFavorite.mutate({ nftId, favorite: !isFavorite, name: nft.name });
  };
  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      announce("Link do NFT copiado para a área de transferência.");
    } catch {
      announce("Não foi possível copiar o link. Copie o endereço da página.", "assertive");
    }
  };
  const favoriteLabel = isFavorite ? "Remover dos favoritos" : "Favoritar NFT";

  return (
    <DetailLayout>
      <section className="detail-top">
        <nav className="detail-breadcrumb" aria-label="Caminho de navegação">
          <Link to="/" hash="inicio">Início</Link> / <Link to="/" hash="mercado">Mercado</Link>
        </nav>
        <div className="detail-product">
          <div className="detail-gallery">
            <div className="detail-mobile-actions">
              <button type="button" aria-label="Voltar ao mercado" onClick={() => navigate({ to: "/", hash: "mercado" })}>
                <ChevronLeft size={20} />
              </button>
              <button type="button" aria-label={favoriteLabel} aria-pressed={isFavorite} onClick={onFavorite}>
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            <div className="detail-gallery__thumbs" role="group" aria-label="Imagens do NFT">
              {images.map((image, index) => (
                <button
                  type="button"
                  aria-label={`Ver imagem ${index + 1}`}
                  aria-pressed={selectedImage === index}
                  className={selectedImage === index ? "is-selected" : ""}
                  key={`${image}-${index}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={`${ASSETS}/${image}`} alt="" />
                </button>
              ))}
            </div>
            <div className="detail-gallery__main">
              <img src={`${ASSETS}/${images[selectedImage]}`} alt={`${nft.name} ${nft.token}`} />
              <button type="button" className="detail-gallery__zoom" aria-label="Ampliar imagem" onClick={() => setZoomOpen(true)}>
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
                <strong aria-label={`Preço: ${eth(nft.price)}`}>{eth(nft.price)}</strong>
                <DetailRating />
              </div>
              <hr />
            </div>
            <section className="detail-about">
              <h2>Sobre este NFT:</h2>
              <p>{nft.description}</p>
            </section>
            <section className="detail-edition">
              <h2 id="edition-label">Edição:</h2>
              <div role="radiogroup" aria-labelledby="edition-label">
                {nft.editions.map((edition) => {
                  const unavailable = edition.available === 0;
                  const selected = edition.label === activeEdition?.label;
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      key={edition.id}
                      disabled={unavailable}
                      title={unavailable ? `Edição ${edition.label} esgotada` : `${edition.available} disponível(is)`}
                      aria-label={`${edition.label}${unavailable ? " (esgotada)" : `, ${edition.available} disponível(is)`}`}
                      className={[selected ? "is-selected" : "", unavailable ? "is-unavailable" : ""].join(" ")}
                      onClick={() => {
                        setSelectedEdition(edition.label);
                        setQuantity(1);
                      }}
                    >
                      {edition.label.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <p className="detail-edition__availability" aria-live="polite">
                {soldOut
                  ? "Todas as edições estão esgotadas."
                  : `${available} ${available === 1 ? "unidade disponível" : "unidades disponíveis"} na edição ${activeEdition?.label}.`}
              </p>
            </section>
            <div className="detail-buy">
              <div className="detail-buy__top">
                <span id="quantity-label">Qtd.</span>
                <div className="detail-quantity" role="group" aria-labelledby="quantity-label">
                  <button type="button" aria-label="Diminuir quantidade" disabled={safeQuantity <= 1} onClick={() => setQuantity(safeQuantity - 1)}>
                    <Minus size={16} />
                  </button>
                  <b aria-live="polite" aria-label={`Quantidade: ${safeQuantity}`}>{safeQuantity}</b>
                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    disabled={safeQuantity >= available}
                    onClick={() => setQuantity(safeQuantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <strong>{eth(nft.price)}</strong>
              </div>
              <div className="detail-buy__actions">
                <Button
                  type="button"
                  onClick={() =>
                    activeEdition &&
                    add.mutate(
                      { nftId, edition: activeEdition.label, quantity: safeQuantity, name: nft.name },
                      { onSuccess: () => void navigate({ to: "/cart" }) },
                    )
                  }
                  disabled={add.isPending || soldOut || available === 0}
                >
                  {soldOut ? "ESGOTADO" : add.isPending ? "ADICIONANDO..." : "COMPRAR"}
                </Button>
                <Button type="button" variant="outline" onClick={onFavorite} aria-pressed={isFavorite} disabled={toggleFavorite.isPending}>
                  <Heart size={17} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
                  {isFavorite ? "Favoritado" : "Favoritar"}
                </Button>
              </div>
            </div>
            {add.isError && <Alert>{toApiError(add.error).message}</Alert>}
            {toggleFavorite.isError && <Alert live={false}>{toApiError(toggleFavorite.error).message} O favorito voltou ao estado anterior.</Alert>}
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
                <button type="button" aria-label="Copiar link do NFT" onClick={() => void onShare()}>
                  <Share2 size={15} />
                </button>
                <a
                  aria-label="Compartilhar no X (abre em nova aba)"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${nft.name} ${nft.token} na Kurio`)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span aria-hidden="true">𝕏</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <DetailTabs nft={nft} edition={activeEdition?.label ?? nft.edition} />
      <DetailRelatedCarousel items={related.data?.items ?? []} />
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="detail-zoom" closeLabel="Fechar imagem ampliada" aria-describedby={undefined}>
          <DialogTitle>
            {nft.name} {nft.token}
          </DialogTitle>
          <img src={`${ASSETS}/${images[selectedImage]}`} alt={`${nft.name} ${nft.token} ampliado`} />
        </DialogContent>
      </Dialog>
    </DetailLayout>
  );
}
