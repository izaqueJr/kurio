import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useNfts } from "../../api/queries";
import { eth } from "../../domain";

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SearchAutocomplete({
  query,
  onSelect,
}: {
  query: string;
  onSelect: () => void;
}) {
  const normalizedQuery = useDebouncedValue(query.trim());
  const enabled = normalizedQuery.length >= 2;
  const suggestions = useNfts(
    { q: normalizedQuery, page: 1, pageSize: 4, sort: "recent" },
    { enabled },
  );

  if (query.trim().length < 2) return null;

  return (
    <div className="header-autocomplete" role="status" aria-live="polite">
      {!enabled || suggestions.isPending ? (
        <p>Buscando NFTs…</p>
      ) : suggestions.isError ? (
        <p>Não foi possível buscar agora. Tente novamente.</p>
      ) : suggestions.data?.items.length ? (
        <div role="listbox" aria-label="Sugestões de NFTs">
          {suggestions.data.items.map((nft) => (
            <Link
              key={nft.id}
              to="/nft/$nftId"
              params={{ nftId: nft.id }}
              role="option"
              aria-selected={false}
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
              <strong>{eth(nft.price)}</strong>
            </Link>
          ))}
        </div>
      ) : (
        <p>Nenhum NFT encontrado.</p>
      )}
    </div>
  );
}
