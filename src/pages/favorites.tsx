import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AccountMobileHeader, AccountMobileNav, DetailLayout, ErrorState, PageSkeleton } from "../components/layout";
import { AccountSidebar } from "../components/account/account-sidebar";
import { ArtworkCard } from "../features/marketplace/components";
import { useFavorites, useLogout, useNfts, useToggleFavorite, useViewer } from "../api/queries";

export function FavoritesPage() {
  const { userId } = useViewer();
  const navigate = useNavigate();
  const logout = useLogout();
  const favorites = useFavorites(userId);
  const ids = favorites.data ?? [];
  const items = useNfts({ ids, pageSize: 30 }, { enabled: ids.length > 0 });
  const toggle = useToggleFavorite(userId);

  return (
    <DetailLayout>
      <section className="account-page">
        <AccountMobileHeader title="Favoritos" />
        <AccountMobileNav
          onLogout={() => logout.mutate(undefined, { onSuccess: () => void navigate({ to: "/" }) })}
          loggingOut={logout.isPending}
        />
        <div className="account-layout">
          <AccountSidebar
            active="favorites"
            onLogout={() => logout.mutate(undefined, { onSuccess: () => void navigate({ to: "/" }) })}
            loggingOut={logout.isPending}
          />
          <div className="account-form favorites-page">
            <h1>Lista de interesse</h1>
            {favorites.isPending || (ids.length > 0 && items.isPending) ? (
              <PageSkeleton label="Carregando favoritos" />
            ) : favorites.isError || items.isError ? (
              <ErrorState
                error={favorites.error ?? items.error}
                onRetry={() => {
                  void favorites.refetch();
                  void items.refetch();
                }}
              />
            ) : !ids.length ? (
              <section className="empty-state">
                <Heart size={32} aria-hidden="true" />
                <h2>Você ainda não favoritou nenhum NFT</h2>
                <Link to="/" hash="mercado">
                  Explorar o mercado
                </Link>
              </section>
            ) : (
              <ul className="favorites-grid">
                {(items.data?.items ?? []).map((nft) => (
                  <li key={nft.id}>
                    <ArtworkCard
                      artwork={{
                        id: nft.id,
                        name: nft.name,
                        token: nft.token,
                        price: `${nft.price} ETH`,
                        image: nft.image,
                        soldOut: nft.available === 0,
                      }}
                    />
                    <button
                      type="button"
                      className="favorites-grid__remove"
                      aria-label={`Remover ${nft.name} dos favoritos`}
                      onClick={() => toggle.mutate({ nftId: nft.id, favorite: false, name: nft.name })}
                    >
                      <Heart size={16} fill="currentColor" aria-hidden="true" /> Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </DetailLayout>
  );
}
