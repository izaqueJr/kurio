import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../../api/client";
import type { Nft } from "../../domain";

type SearchResponse = {
  items: Nft[];
};

export function SearchAutocomplete({
  query,
  onSelect,
}: {
  query: string;
  onSelect: () => void;
}) {
  const normalizedQuery = query.trim();
  const suggestions = useQuery({
    queryKey: ["nft-search-suggestions", normalizedQuery],
    enabled: normalizedQuery.length >= 2,
    queryFn: async () =>
      (
        await api.get<SearchResponse>("/nfts", {
          params: { q: normalizedQuery, page: 1, sort: "recent" },
        })
      ).data,
  });

  if (normalizedQuery.length < 2) return null;

  return (
    <div className="header-autocomplete" role="status" aria-live="polite">
      {suggestions.isPending ? (
        <p>Buscando NFTs…</p>
      ) : suggestions.data?.items.length ? (
        <div role="listbox" aria-label="Sugestões de NFTs">
          {suggestions.data.items.slice(0, 4).map((nft) => (
            <Link
              key={nft.id}
              to="/nft/$nftId"
              params={{ nftId: nft.id }}
              role="option"
              aria-label={`Abrir ${nft.name} ${nft.token}`}
              className="header-autocomplete__item"
              onClick={onSelect}
            >
              <img src={`/assets/figma/${nft.image}`} alt="" />
              <span>
                <b>
                  {nft.name} {nft.token}
                </b>
                <small>{nft.collection}</small>
              </span>
              <strong>{Number(nft.price).toFixed(2)} ETH</strong>
            </Link>
          ))}
        </div>
      ) : (
        <p>Nenhum NFT encontrado.</p>
      )}
    </div>
  );
}
