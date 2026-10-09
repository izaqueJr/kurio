import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { Loader2, WifiOff } from "lucide-react";
import { DetailLayout, ErrorState, PageSkeleton } from "../components/layout";
import { OrderConfirmation } from "../components/order-confirmation";
import { NotFoundContent } from "./not-found";
import { orderQuery, useViewer } from "../api/queries";
import { toApiError } from "../api/client";
import { useConnectionState } from "../lib/realtime-notices";
import { eth } from "../domain";

export function OrderPage() {
  const { orderId } = useParams({ from: "/order/$orderId" });
  const { userId } = useViewer();
  const order = useQuery({ ...orderQuery(userId ?? "guest", orderId), enabled: Boolean(userId) });
  const connection = useConnectionState();

  if (order.isPending)
    return (
      <DetailLayout>
        <PageSkeleton label="Consultando pedido" />
      </DetailLayout>
    );
  if (order.isError) {
    const error = toApiError(order.error);
    return (
      <DetailLayout>
        {error.code === "NOT_FOUND" ? (
          <NotFoundContent title="Pedido não encontrado" description="Confira o link ou acesse seus pedidos a partir do perfil." />
        ) : error.code === "FORBIDDEN" ? (
          <section className="empty-state" role="alert">
            <h1>Acesso não autorizado</h1>
            <p>{error.message}</p>
            <Link to="/">Voltar ao início</Link>
          </section>
        ) : (
          <ErrorState error={error} title="Não foi possível consultar o pedido" onRetry={() => void order.refetch()} retrying={order.isFetching} />
        )}
      </DetailLayout>
    );
  }
  const data = order.data;
  if (data.status === "pending")
    return (
      <DetailLayout>
        <section className="empty-state order-pending" role="status" aria-live="polite" aria-busy="true">
          <Loader2 className="order-pending__spinner" size={36} aria-hidden="true" />
          <h1>Pagamento em processamento</h1>
          <p>
            Pedido {data.id} · {eth(data.quote.total)} · carteira {data.wallet.label}.
          </p>
          <p>Estamos aguardando a confirmação da rede. Você pode recarregar esta página: a compra não será duplicada.</p>
          {connection !== "connected" && (
            <p className="order-pending__connection">
              <WifiOff size={15} aria-hidden="true" /> Conexão em tempo real interrompida. Reconectando e consultando o
              status...
            </p>
          )}
        </section>
      </DetailLayout>
    );
  if (data.status === "declined")
    return (
      <DetailLayout>
        <section className="empty-state order-declined" role="alert">
          <h1>Pagamento recusado</h1>
          <p>{data.failureReason ?? "A transação não foi autorizada."}</p>
          <p>Nenhum valor foi cobrado e os itens continuam no seu carrinho.</p>
          <Link to="/checkout">Voltar ao pagamento</Link>
        </section>
      </DetailLayout>
    );
  return (
    <DetailLayout>
      <div className="order-page">
        <OrderConfirmation order={data} />
      </div>
    </DetailLayout>
  );
}
