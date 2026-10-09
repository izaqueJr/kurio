import { products } from "../../domain";

export type Artwork = {
  id: string;
  name: string;
  token: string;
  price: string;
  previous?: string;
  image: string;
  category?: string;
  network?: string;
};

export type SortValue = "recent" | "price-asc" | "price-desc";

export const fallbackArtworks: Artwork[] = [
  { id: "emerald-042", name: "Emerald Ape", token: "#042", price: "1.19 ETH", image: "ape-green.png", category: "Arte digital", network: "Ethereum" },
  { id: "sage-009", name: "Sage Nomad", token: "#009", price: "1.69 ETH", image: "ape-purple.png", category: "Arte digital", network: "Ethereum" },
  { id: "neon-552", name: "Neon Vessel", token: "#552", price: "1.99 ETH", previous: "2.29 ETH", image: "ape-gold.png", category: "Fotografia", network: "Polygon" },
  { id: "cosmic-118", name: "Cosmic Bloom", token: "#118", price: "1.29 ETH", image: "ape-purple.png", category: "Música", network: "Ethereum" },
  { id: "violet-314", name: "Violet Nomad", token: "#314", price: "1.39 ETH", image: "ape-purple.png", category: "Arte 3D", network: "Solana" },
  { id: "ivory-088", name: "Ivory Baron", token: "#088", price: "1.79 ETH", image: "ape-gold.png", category: "Colecionáveis", network: "Ethereum" },
  { id: "golden-207", name: "Golden Beat", token: "#207", price: "0.99 ETH", image: "ape-dark.png", category: "Generativa", network: "Polygon" },
  { id: "golden-160", name: "Golden Signal", token: "#160", price: "0.39 ETH", image: "ape-dark.png", category: "Jogos", network: "Solana" },
  { id: "golden-195", name: "Golden Echo", token: "#195", price: "0.59 ETH", image: "ape-dark.png", category: "Utilidade", network: "Ethereum" },
];

export const categoryLabels = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];
export const networkLabels = ["Ethereum", "Polygon", "Solana"] as const;

export const fallbackFacets = {
  categories: Object.fromEntries(
    categoryLabels.map((label) => [
      label,
      products.filter((nft) => nft.category === label).length,
    ]),
  ),
  networks: Object.fromEntries(
    networkLabels.map((label) => [
      label,
      products.filter((nft) => nft.network === label).length,
    ]),
  ),
  priceRange: {
    min: Math.min(...products.map((nft) => Number(nft.price))),
    max: Math.max(...products.map((nft) => Number(nft.price))),
  },
};

export const journalEntries = [
  { image: "ape-gold.png", date: "12 de setembro", duration: "Leitura de 6 min", title: "Como funciona a propriedade de NFTs", text: "Aprenda a colecionar, negociar e verificar ativos digitais." },
  { image: "ape-green.png", date: "13 de setembro", duration: "Leitura de 2 min", title: "10 artistas digitais para acompanhar", text: "Conheça criadores que moldam a cultura digital." },
  { image: "ape-purple.png", date: "15 de setembro", duration: "Leitura de 3 min", title: "Raridade, atributos e procedência", text: "Entenda raridade, procedência, direitos autorais e utilidade." },
  { image: "ape-dark.png", date: "15 de setembro", duration: "Leitura de 2 min", title: "Como proteger sua carteira", text: "Proteja sua carteira, seus ativos e sua identidade." },
];

export const heroSlides = [
  { image: "ape-green.png", alt: "Emerald Ape em destaque" },
  { image: "ape-purple.png", alt: "Sage Nomad em destaque" },
  { image: "ape-gold.png", alt: "Neon Vessel em destaque" },
];

export const sortOptions: Array<{ value: SortValue; label: string }> = [
  { value: "recent", label: "Listados recentemente" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
];
