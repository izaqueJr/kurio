import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Link2, Link2Off, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/feedback";
import { Field } from "../components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";
import { ASSETS, CheckoutLayout, ErrorState, PageSkeleton } from "../components/layout";
import { RealtimeNoticeList } from "./cart";
import {
  queryKeys,
  useCart,
  useCreateOrder,
  useQuote,
  useViewer,
  useWalletConnection,
  useWallets,
} from "../api/queries";
import { toApiError } from "../api/client";
import { clearAttempt, clearDraft, idempotencyKeyFor, readDraft, writeDraft } from "../lib/idempotency";
import { clearNotices } from "../lib/realtime-notices";
import { announce } from "../lib/announcer";
import { eth, NETWORKS, shortAddress, type Cart, type Network, type Quote, type Wallet } from "../domain";

const DRAFT_KEY = "kurio-checkout-draft";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome de exibição."),
  email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
  username: z
    .string()
    .trim()
    .min(3, "Informe um nome de usuário com ao menos 3 caracteres.")
    .regex(/^@?[a-z0-9._-]+$/i, "Use apenas letras, números, ponto, hífen ou sublinhado."),
  profileName: z.string().trim().min(2, "Informe o nome do perfil."),
  network: z.enum(["Ethereum", "Polygon", "Solana"]),
  walletId: z.string().min(1, "Selecione uma carteira cadastrada para esta rede."),
  secondaryAddress: z.string().trim().optional(),
  referralCode: z.string().trim().max(20, "O código de indicação tem no máximo 20 caracteres.").optional(),
  ens: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/i, "O nome ENS aceita letras, números e hífen.")
    .optional(),
  note: z.string().max(500, "A observação tem no máximo 500 caracteres.").optional(),
  terms: z.literal(true, { message: "Aceite os termos para continuar." }),
});
type CheckoutValues = z.infer<typeof checkoutSchema>;

function CheckoutSummary({
  cart,
  quote,
  quoteLoading,
  network,
  wallets,
  walletId,
  onWalletChange,
  walletError,
  userId,
  confirmDisabled,
  pending,
}: {
  cart: Cart;
  quote?: Quote;
  quoteLoading: boolean;
  network: Network;
  wallets: Wallet[];
  walletId: string;
  onWalletChange: (id: string) => void;
  walletError?: string;
  userId: string;
  confirmDisabled: boolean;
  pending: boolean;
}) {
  const connection = useWalletConnection(userId);
  const compatible = wallets.filter((wallet) => wallet.network === network);
  const selected = compatible.find((wallet) => wallet.id === walletId);
  const values = quote ?? cart.quote;
  return (
    <aside className="checkout-summary" aria-label="Resumo do pagamento">
      <section className="checkout-summary__nfts">
        <h2>Seus NFTs</h2>
        <div className="checkout-summary__table-head" aria-hidden="true">
          <span>NFTs</span>
          <span>Subtotal</span>
        </div>
        <ul className="checkout-summary__items">
          {cart.lines.map((line) => (
            <li key={line.id} className="checkout-summary__item">
              <img src={`${ASSETS}/${line.nft.image}`} alt={`${line.nft.name} ${line.nft.token}`} />
              <div>
                <h3>
                  {line.nft.name} {line.nft.token}
                </h3>
                <p>
                  {line.edition} · {line.quantity} {line.quantity > 1 ? "edições" : "edição"}
                </p>
              </div>
              <strong>{eth(line.lineTotal)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <Link className="checkout-summary__coupon" to="/cart">
        {cart.coupon ? `Cupom ${cart.coupon} aplicado — alterar no carrinho` : "Tem um código promocional? Aplique aqui"}
      </Link>
      <div className="checkout-summary__totals" aria-busy={quoteLoading}>
        <div>
          <span>Subtotal</span>
          <b>{eth(values.subtotal)}</b>
        </div>
        <div>
          <span>Desconto do lançamento</span>
          <b>- {eth(values.discount)}</b>
        </div>
        <div className="checkout-summary__network">
          <div>
            <span>Taxa de rede</span>
            <b>{eth(values.networkFee)}</b>
          </div>
          <small>Taxa estimada</small>
        </div>
        <hr />
        <div className="checkout-summary__total" aria-live="polite">
          <strong>Total</strong>
          <b>{eth(values.total)}</b>
        </div>
      </div>

      <section className="checkout-wallet" aria-labelledby="checkout-wallet-title">
        <h2 id="checkout-wallet-title">Carteira e rede</h2>
        <div
          role="radiogroup"
          aria-label={`Carteiras em ${network}`}
          aria-invalid={walletError ? true : undefined}
          aria-describedby={walletError ? "checkout-wallet-error" : undefined}
          className="checkout-wallet__choices"
        >
          {compatible.map((wallet) => (
            <label className={wallet.id === walletId ? "is-selected" : ""} key={wallet.id}>
              <input
                type="radio"
                name="checkout-wallet"
                value={wallet.id}
                checked={wallet.id === walletId}
                onChange={() => onWalletChange(wallet.id)}
              />
              <span>
                <b>{wallet.label}</b>
                <small>
                  {shortAddress(wallet.address)} · {wallet.network} · {wallet.walletType}
                </small>
                <small className={wallet.connected ? "wallet-status is-connected" : "wallet-status"}>
                  {wallet.connected ? "● Conectada" : "○ Não conectada"}
                </small>
              </span>
            </label>
          ))}
          {!compatible.length && (
            <Link to="/carteiras" search={{ redirect: "/checkout" }}>
              Cadastrar uma carteira em {network}
            </Link>
          )}
        </div>
        {walletError && (
          <p id="checkout-wallet-error" className="form-field__error" role="alert">
            ⚠ {walletError}
          </p>
        )}
        {selected && (
          <div className="checkout-wallet__connection">
            {selected.connected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={connection.isPending}
                onClick={() => connection.mutate({ id: selected.id, connect: false })}
              >
                <Link2Off size={15} aria-hidden="true" /> Desconectar {selected.label}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={connection.isPending}
                onClick={() => connection.mutate({ id: selected.id, connect: true })}
              >
                <Link2 size={15} aria-hidden="true" />
                {connection.isPending ? "Aguardando a carteira..." : `Conectar ${selected.label}`}
              </Button>
            )}
            {connection.isError && <Alert>{toApiError(connection.error).message}</Alert>}
          </div>
        )}
        <Button type="submit" form="checkout-form" disabled={confirmDisabled || pending}>
          {pending ? "Confirmando..." : "Confirmar pedido"}
        </Button>
      </section>
    </aside>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userId, owner } = useViewer();
  const cartQuery = useCart(owner, { enabled: Boolean(userId) });
  const walletsQuery = useWallets(userId);
  const cart = cartQuery.data;
  const quoteQuery = useQuote(userId, cart?.version, Boolean(cart?.lines.length));
  const order = useCreateOrder();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [acceptedQuoteId, setAcceptedQuoteId] = useState<string>();
  const [orderError, setOrderError] = useState<{ message: string; code: string } | null>(null);
  const draft = useMemo(() => readDraft<CheckoutValues>(DRAFT_KEY), []);
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: draft.name ?? "",
      email: draft.email ?? "",
      username: draft.username ?? "",
      profileName: draft.profileName ?? "",
      network: draft.network ?? "Ethereum",
      walletId: draft.walletId ?? "",
      secondaryAddress: draft.secondaryAddress ?? "",
      referralCode: draft.referralCode ?? "",
      ens: draft.ens ?? "",
      note: draft.note ?? "",
      terms: (draft.terms ?? false) as true,
    },
  });
  const values = useWatch({ control: form.control });
  const network = (values.network ?? "Ethereum") as Network;
  const walletId = values.walletId ?? "";
  const wallets = walletsQuery.data ?? [];
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
  const quote = quoteQuery.data;

  // Rascunho do formulário: sobrevive a refresh e à reautenticação após expirar a sessão.
  useEffect(() => {
    writeDraft(DRAFT_KEY, values);
  }, [values]);

  // Pré-preenche com o perfil da sessão sem sobrescrever o que o usuário já digitou.
  useEffect(() => {
    if (!user) return;
    const current = form.getValues();
    if (!current.name) form.setValue("name", user.name);
    if (!current.email) form.setValue("email", user.email);
    if (!current.username) form.setValue("username", user.username ?? user.name.toLowerCase().replace(/\s+/g, "."));
    if (!current.profileName) form.setValue("profileName", user.name);
    if (!current.ens && user.ens) form.setValue("ens", user.ens);
  }, [user, form]);

  // Seleciona a carteira principal compatível com a rede escolhida.
  useEffect(() => {
    if (!wallets.length) return;
    const compatible = wallets.filter((wallet) => wallet.network === network);
    if (compatible.some((wallet) => wallet.id === walletId)) return;
    const preferred = compatible.find((wallet) => wallet.primary) ?? compatible[0];
    form.setValue("walletId", preferred?.id ?? "", { shouldValidate: form.formState.isSubmitted });
  }, [wallets, network, walletId, form]);

  // A primeira cotação vista é a aceita; mudanças posteriores exigem nova confirmação.
  useEffect(() => {
    if (quote && !acceptedQuoteId) setAcceptedQuoteId(quote.id);
  }, [quote, acceptedQuoteId]);
  const quoteChanged = Boolean(quote && acceptedQuoteId && quote.id !== acceptedQuoteId);
  useEffect(() => {
    if (quoteChanged) {
      setReviewOpen(false);
      announce("Os valores do pedido mudaram. Revise o novo total antes de confirmar.", "assertive");
    }
  }, [quoteChanged]);

  if (!cart || walletsQuery.isPending) {
    if (cartQuery.isError || walletsQuery.isError)
      return (
        <CheckoutLayout>
          <ErrorState
            error={cartQuery.error ?? walletsQuery.error}
            onRetry={() => {
              void cartQuery.refetch();
              void walletsQuery.refetch();
            }}
          />
        </CheckoutLayout>
      );
    return (
      <CheckoutLayout>
        <PageSkeleton label="Preparando pagamento" />
      </CheckoutLayout>
    );
  }
  if (!cart.lines.length)
    return (
      <CheckoutLayout>
        <section className="empty-state">
          <h1>Nenhum item para pagar</h1>
          <p>Seu carrinho está vazio. Os pedidos concluídos ficam disponíveis na confirmação.</p>
          <Link to="/" hash="mercado">
            Voltar ao mercado
          </Link>
        </section>
      </CheckoutLayout>
    );

  const quoteBlocked = !quote || !quote.valid || quoteChanged || quoteQuery.isFetching;
  const walletReady = Boolean(selectedWallet?.connected);
  const errors = form.formState.errors;

  const submitOrder = () => {
    if (order.isPending || !quote || !selectedWallet) return;
    const formValues = form.getValues();
    const fingerprint = JSON.stringify([quote.id, cart.version, formValues.network, formValues.walletId]);
    const idempotencyKey = idempotencyKeyFor(fingerprint);
    setOrderError(null);
    order.mutate(
      {
        idempotencyKey,
        quoteId: quote.id,
        cartVersion: cart.version,
        network: formValues.network,
        walletId: formValues.walletId,
        buyer: {
          name: formValues.name,
          email: formValues.email,
          username: formValues.username.replace(/^@/, ""),
          profileName: formValues.profileName,
          ens: formValues.ens || undefined,
          note: formValues.note || undefined,
        },
      },
      {
        onSuccess: (created) => {
          clearAttempt();
          clearDraft(DRAFT_KEY);
          clearNotices();
          setReviewOpen(false);
          void navigate({ to: "/order/$orderId", params: { orderId: created.id }, replace: true });
        },
        onError: (error) => {
          const apiError = toApiError(error);
          setReviewOpen(false);
          if (apiError.code === "QUOTE_CHANGED" && apiError.body?.quote) {
            queryClient.setQueryData(queryKeys.quote(userId!, cart.version), apiError.body.quote);
          }
          if (["QUOTE_CHANGED", "AVAILABILITY_CONFLICT", "COUPON_EXPIRED", "CONFLICT"].includes(apiError.code)) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot });
            void queryClient.invalidateQueries({ queryKey: queryKeys.quoteRoot });
          }
          if (apiError.code === "WALLET_NOT_CONNECTED") void queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId!) });
          if (apiError.code === "IDEMPOTENCY_CONFLICT") clearAttempt();
          for (const [name, message] of Object.entries(apiError.fields)) {
            if (name in checkoutSchema.shape) form.setError(name as keyof CheckoutValues, { message });
          }
          setOrderError({ message: apiError.message, code: apiError.code });
          announce(apiError.message, "assertive");
        },
      },
    );
  };

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
          <Link to="/cart">Carrinho</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Pagamento</span>
        </nav>
        <Link className="checkout-mobile-back" to="/cart" aria-label="Voltar ao carrinho">
          <ChevronLeft size={20} />
        </Link>
        <RealtimeNoticeList />
        {quoteChanged && quote && (
          <Alert
            tone="info"
            title="Os valores do pedido mudaram"
            action={
              <Button type="button" size="sm" onClick={() => { setAcceptedQuoteId(quote.id); setOrderError(null); clearNotices(); announce(`Novo total aceito: ${eth(quote.total)}.`); }}>
                Aceitar novo total de {eth(quote.total)}
              </Button>
            }
          >
            Preço, disponibilidade, cupom ou taxas foram atualizados. Confira o resumo e aceite o novo total para
            continuar.
          </Alert>
        )}
        {quote && !quote.valid && (
          <Alert title="O carrinho precisa de ajustes" action={<Link className="text-link" to="/cart">Revisar carrinho</Link>}>
            <ul>
              {quote.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}
        {quoteQuery.isError && (
          <ErrorState error={quoteQuery.error} title="Não foi possível validar os valores" onRetry={() => void quoteQuery.refetch()} retrying={quoteQuery.isFetching} />
        )}
        {orderError && (
          <Alert
            title="Não foi possível concluir a compra"
            action={
              orderError.code === "TIMEOUT" || orderError.code === "NETWORK" || orderError.code === "TRANSIENT" ? (
                <Button type="button" size="sm" onClick={submitOrder} disabled={order.isPending}>
                  <RefreshCw size={14} aria-hidden="true" /> Tentar novamente sem duplicar
                </Button>
              ) : orderError.code === "AVAILABILITY_CONFLICT" ? (
                <Link className="text-link" to="/cart">Revisar carrinho</Link>
              ) : undefined
            }
          >
            {orderError.message}
            {(orderError.code === "TIMEOUT" || orderError.code === "NETWORK") &&
              " Seu pedido pode já ter sido registrado: a nova tentativa usa a mesma chave e recupera o mesmo pedido."}
          </Alert>
        )}
        <div className="checkout-layout">
          <form
            id="checkout-form"
            className="checkout-profile"
            noValidate
            onSubmit={form.handleSubmit(
              () => {
                if (quoteBlocked) return;
                if (!walletReady) {
                  form.setError("walletId", { message: "Conecte a carteira selecionada para continuar." });
                  return;
                }
                setOrderError(null);
                setReviewOpen(true);
              },
              () => announce("Revise os campos destacados no formulário.", "assertive"),
            )}
          >
            <h1>Perfil do colecionador</h1>
            <div className="checkout-profile__fields">
              <div className="checkout-profile__column">
                <Field label="Nome de exibição" required error={errors.name?.message}>
                  {(props) => <input {...props} {...form.register("name")} autoComplete="name" placeholder="Seu nome" />}
                </Field>
                <Field label="Rede" required error={errors.network?.message}>
                  {(props) => (
                    <select {...props} {...form.register("network")}>
                      {NETWORKS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Endereço da carteira" required hint="Definido pela carteira selecionada no resumo.">
                  {(props) => <input {...props} value={selectedWallet?.address ?? ""} readOnly placeholder="Selecione uma carteira" />}
                </Field>
                <Field label="Tipo de carteira" required>
                  {(props) => <input {...props} value={selectedWallet?.walletType ?? ""} readOnly placeholder="—" />}
                </Field>
                <Field label="E-mail" required error={errors.email?.message}>
                  {(props) => <input {...props} {...form.register("email")} type="email" autoComplete="email" placeholder="voce@exemplo.com" />}
                </Field>
              </div>
              <div className="checkout-profile__column">
                <Field label="Nome de usuário" required error={errors.username?.message}>
                  {(props) => <input {...props} {...form.register("username")} autoComplete="username" placeholder="Seu @usuário" />}
                </Field>
                <Field label="Nome do perfil" required error={errors.profileName?.message}>
                  {(props) => <input {...props} {...form.register("profileName")} placeholder="Como será exibido" />}
                </Field>
                <Field label="ENS ou carteira secundária" error={errors.secondaryAddress?.message}>
                  {(props) => <input {...props} {...form.register("secondaryAddress")} placeholder="Opcional" />}
                </Field>
                <Field label="Código de indicação" error={errors.referralCode?.message}>
                  {(props) => <input {...props} {...form.register("referralCode")} placeholder="Opcional" />}
                </Field>
                <Field label="Nome ENS" error={errors.ens?.message}>
                  {(props) => (
                    <span className="checkout-input-suffix">
                      <input {...props} {...form.register("ens")} placeholder="nome" />
                      <b aria-hidden="true">.eth</b>
                    </span>
                  )}
                </Field>
              </div>
            </div>
            <p className="checkout-other-wallet">
              Usar outra carteira?{" "}
              <Link to="/carteiras" search={{ redirect: "/checkout" }} className="text-link">
                Cadastre-a em Carteiras
              </Link>
            </p>
            <Field label="Observação do colecionador (opcional)" className="checkout-note" error={errors.note?.message}>
              {(props) => <textarea {...props} {...form.register("note")} placeholder="Conte algo para o criador..." />}
            </Field>
            <div className="form-field">
              <label className="checkout-terms">
                <input
                  type="checkbox"
                  {...form.register("terms")}
                  aria-invalid={errors.terms ? true : undefined}
                  aria-describedby={errors.terms ? "checkout-terms-error" : undefined}
                />
                Li e concordo com os termos da compra.
              </label>
              {errors.terms && (
                <small id="checkout-terms-error" className="form-field__error">
                  ⚠ {errors.terms.message}
                </small>
              )}
            </div>
          </form>
          <CheckoutSummary
            cart={cart}
            quote={quote}
            quoteLoading={quoteQuery.isFetching}
            network={network}
            wallets={wallets}
            walletId={walletId}
            onWalletChange={(id) => {
              form.setValue("walletId", id, { shouldValidate: form.formState.isSubmitted });
              form.clearErrors("walletId");
            }}
            walletError={errors.walletId?.message}
            userId={userId!}
            confirmDisabled={quoteBlocked}
            pending={order.isPending}
          />
        </div>
      </section>

      <Dialog open={reviewOpen} onOpenChange={(open) => !order.isPending && setReviewOpen(open)}>
        <DialogContent className="checkout-review" closeLabel="Voltar ao formulário">
          <DialogTitle>Revise seu pedido</DialogTitle>
          <DialogDescription>Confira itens, carteira e total. A compra só é enviada ao confirmar.</DialogDescription>
          <ul className="checkout-review__items">
            {cart.lines.map((line) => (
              <li key={line.id}>
                <span>
                  {line.nft.name} {line.nft.token} · {line.edition} × {line.quantity}
                </span>
                <b>{eth(line.lineTotal)}</b>
              </li>
            ))}
          </ul>
          <dl className="checkout-review__meta">
            <div>
              <dt>Carteira</dt>
              <dd>
                {selectedWallet?.label} ({selectedWallet ? shortAddress(selectedWallet.address) : "—"})
              </dd>
            </div>
            <div>
              <dt>Rede</dt>
              <dd>{network}</dd>
            </div>
            {quote && (
              <>
                <div>
                  <dt>Desconto</dt>
                  <dd>- {eth(quote.discount)}</dd>
                </div>
                <div>
                  <dt>Taxa de rede</dt>
                  <dd>{eth(quote.networkFee)}</dd>
                </div>
                <div className="checkout-review__total">
                  <dt>Total</dt>
                  <dd>{eth(quote.total)}</dd>
                </div>
              </>
            )}
          </dl>
          <div className="checkout-review__actions">
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)} disabled={order.isPending}>
              Voltar
            </Button>
            <Button type="button" onClick={submitOrder} disabled={order.isPending || quoteBlocked}>
              {order.isPending ? "Confirmando compra..." : "Confirmar compra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CheckoutLayout>
  );
}
