import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PackageCheck, X } from "lucide-react";
import { Button } from "./ui/button";
import { eth, shortAddress, type Order } from "../domain";

/** Recibo: reproduz exclusivamente o snapshot gravado no pedido (preços, itens, taxas e carteira). */
export function OrderConfirmation({ order }: { order: Order }) {
  const [explorerOpen, setExplorerOpen] = useState(false);
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(order.createdAt));
  const transaction = order.transactionHash;
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

      <dl className="order-confirmation__meta" aria-label="Metadados da transação">
        <div>
          <dt>ID da transação</dt>
          <dd>
            <b title={transaction}>{shortTransaction}</b>
          </dd>
        </div>
        <i aria-hidden="true" />
        <div>
          <dt>Data</dt>
          <dd>
            <b>{date}</b>
          </dd>
        </div>
        <i aria-hidden="true" />
        <div>
          <dt>Total</dt>
          <dd>
            <b>{eth(order.quote.total)}</b>
          </dd>
        </div>
        <i aria-hidden="true" />
        <div>
          <dt>Carteira</dt>
          <dd>
            <b>{order.wallet.walletType}</b>
          </dd>
        </div>
      </dl>

      <div className="order-confirmation__details">
        <h2>Detalhes da transação</h2>
        <div className="order-confirmation__table-head" aria-hidden="true">
          <span>NFTs</span>
          <span>Edições</span>
          <span>Subtotal</span>
        </div>
        <ul className="order-confirmation__items">
          {order.items.map((item) => (
            <li key={`${item.nftId}:${item.edition}`}>
              <div>
                <img src={`/assets/figma/${item.image}`} alt="" />
                <p>
                  <b>
                    {item.name} {item.token}
                  </b>
                  <span>
                    Edição {item.edition} · {eth(item.unitPrice)} cada
                  </span>
                </p>
              </div>
              <span aria-label={`${item.quantity} unidade(s)`}>(x {item.quantity})</span>
              <strong>{eth(item.lineTotal)}</strong>
            </li>
          ))}
        </ul>
        <div className="order-confirmation__totals">
          {order.quote.discount !== "0.00" && (
            <div>
              <span>Desconto{order.quote.coupon ? ` (${order.quote.coupon})` : ""}</span>
              <b>- {eth(order.quote.discount)}</b>
            </div>
          )}
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
          Transação confirmada na {order.network} (simulação). A propriedade foi transferida para a carteira{" "}
          {order.wallet.label} ({shortAddress(order.wallet.address)}).
        </p>
        <Button type="button" aria-expanded={explorerOpen} aria-controls="order-explorer" onClick={() => setExplorerOpen((open) => !open)}>
          {explorerOpen ? "Ocultar explorador simulado" : "Ver no explorador (simulado)"}
        </Button>
        {explorerOpen && (
          <dl id="order-explorer" className="order-confirmation__explorer">
            <div>
              <dt>Hash</dt>
              <dd>{transaction}</dd>
            </div>
            <div>
              <dt>Rede</dt>
              <dd>{order.network} (ambiente simulado, sem registro em blockchain real)</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Confirmada</dd>
            </div>
            <div>
              <dt>Pedido</dt>
              <dd>{order.id}</dd>
            </div>
          </dl>
        )}
      </footer>
    </section>
  );
}
