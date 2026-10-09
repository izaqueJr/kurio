export type Artwork = {
  id: string;
  name: string;
  token: string;
  price: string;
  previous?: string;
  image: string;
  category?: string;
  network?: string;
  soldOut?: boolean;
};

export type SortValue = "recent" | "price-asc" | "price-desc";

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

/** Faixa usada até a primeira resposta da API (substituída pelas facetas retornadas). */
export const DEFAULT_PRICE_RANGE = { min: 0, max: 8 };

export const journalEntries = [
  { image: "ape-gold.webp", date: "12 de setembro", duration: "Leitura de 6 min", title: "Como funciona a propriedade de NFTs", text: "Aprenda a colecionar, negociar e verificar ativos digitais." },
  { image: "ape-green.webp", date: "13 de setembro", duration: "Leitura de 2 min", title: "10 artistas digitais para acompanhar", text: "Conheça criadores que moldam a cultura digital." },
  { image: "ape-purple.webp", date: "15 de setembro", duration: "Leitura de 3 min", title: "Raridade, atributos e procedência", text: "Entenda raridade, procedência, direitos autorais e utilidade." },
  { image: "ape-dark.webp", date: "15 de setembro", duration: "Leitura de 2 min", title: "Como proteger sua carteira", text: "Proteja sua carteira, seus ativos e sua identidade." },
];

export const heroSlides = [
  { image: "ape-green.webp", alt: "Emerald Ape em destaque" },
  { image: "ape-purple.webp", alt: "Sage Nomad em destaque" },
  { image: "ape-gold.webp", alt: "Neon Vessel em destaque" },
];

export const sortOptions: Array<{ value: SortValue; label: string }> = [
  { value: "recent", label: "Listados recentemente" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
];
