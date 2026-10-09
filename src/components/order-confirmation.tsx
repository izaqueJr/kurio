import { Link } from "@tanstack/react-router";
import { PackageCheck, X } from "lucide-react";
import { Button } from "./ui/button";
import { eth, type Order } from "../domain";

export type OrderConfirmationItem = {
  id: string;
  image: string;
  name: string;
  token: string;
  quantity: number;
  total: string;
};

export function OrderConfirmation({
  order,
  items,
}: {
  order: Order;
  items: OrderConfirmationItem[];
}) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(order.createdAt));
  const transaction = order.transactionId;
  const shortTransaction = `${transaction.slice(0, 6)}…${transaction.slice(-4)}`;

  return (
    <section className="order-confirmation" aria-labelledby="order-title">
      <Link className="order-confirmation__close" to="/" aria-label="Fechar confirmação">
        <X size={18} />
      </Link>
      <header className="order-confirmation__header">
        <PackageCheck aria-hidden="true" size={68} strokeWidth={1.3} />
        <h1 id="order-title">Seus NFTs agora estão na sua carteira</h1>
      </header>

      <div className="order-confirmation__meta" aria-label="Metadados da transação">
        <div>
          <span>ID da transação</span>
          <b>{shortTransaction}</b>
        </div>
        <i aria-hidden="true" />
        <div>
          <span>Data</span>
          <b>{date}</b>
        </div>
        <i aria-hidden="true" />
        <div>
          <span>Total</span>
          <b>{eth(order.quote.total)}</b>
        </div>
        <i aria-hidden="true" />
        <div>
          <span>Carteira</span>
          <b>MetaMask</b>
        </div>
      </div>

      <div className="order-confirmation__details">
        <h2>Detalhes da transação</h2>
        <div className="order-confirmation__table-head">
          <span>NFTs</span>
          <span>Edições</span>
          <span>Subtotal</span>
        </div>
        <div className="order-confirmation__items">
          {items.map((item) => (
            <article key={item.id}>
              <div>
                <img src={`/assets/figma/${item.image}`} alt="" />
                <p>
                  <b>
                    {item.name} {item.token}
                  </b>
                  <span>ID do token: {item.token.replace("#", "#0")}</span>
                </p>
              </div>
              <span>(x {item.quantity})</span>
              <strong>{eth(item.total)}</strong>
            </article>
          ))}
        </div>
        <div className="order-confirmation__totals">
          <div>
            <span>Taxa de rede</span>
            <b>{eth(order.quote.networkFee)}</b>
          </div>
          <div>
            <strong>Total</strong>
            <b>{eth(order.quote.total)}</b>
          </div>
        </div>
      </div>

      <footer className="order-confirmation__footer">
        <p>
          Transação confirmada na Ethereum. A propriedade foi transferida para
          sua carteira conectada e registrada na rede.
        </p>
        <Button asChild>
          <a
            href={`https://etherscan.io/tx/${transaction}`}
            target="_blank"
            rel="noreferrer"
          >
            Ver no Etherscan
          </a>
        </Button>
      </footer>
    </section>
  );
}
