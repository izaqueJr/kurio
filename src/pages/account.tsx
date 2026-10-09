import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/feedback";
import { Field } from "../components/ui/form";
import { AccountMobileHeader, AccountMobileNav, DetailLayout, ErrorState, PageSkeleton } from "../components/layout";
import { AccountSidebar } from "../components/account/account-sidebar";
import {
  useChangePassword,
  useLogout,
  useSaveWallet,
  useUpdateProfile,
  useViewer,
  useWallets,
} from "../api/queries";
import { toApiError } from "../api/client";
import { ADDRESS_PATTERNS, NETWORKS, shortAddress, type Network, type Wallet } from "../domain";

const MAX_AVATAR_BYTES = 1_000_000;

function useAccountLogout() {
  const logout = useLogout();
  const navigate = useNavigate();
  return {
    logout: () => logout.mutate(undefined, { onSuccess: () => void navigate({ to: "/" }) }),
    pending: logout.isPending,
  };
}

// ---------- Perfil ----------

const profileSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome de exibição."),
    username: z
      .string()
      .trim()
      .regex(/^[a-z0-9._-]{3,30}$/i, "Use de 3 a 30 letras, números, ponto, hífen ou sublinhado."),
    email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
    ens: z
      .string()
      .trim()
      .regex(/^([a-z0-9-]{3,})?$/i, "O nome ENS deve ter ao menos 3 caracteres (letras, números ou hífen)."),
    walletAlias: z.string().trim().max(40, "Use até 40 caracteres."),
    currentPassword: z.string(),
    nextPassword: z.string(),
    confirmation: z.string(),
  })
  .superRefine((value, context) => {
    const changing = Boolean(value.currentPassword || value.nextPassword || value.confirmation);
    if (!changing) return;
    if (!value.currentPassword) context.addIssue({ code: "custom", path: ["currentPassword"], message: "Informe a senha atual." });
    if (value.nextPassword.length < 6)
      context.addIssue({ code: "custom", path: ["nextPassword"], message: "A nova senha precisa de pelo menos 6 caracteres." });
    if (value.nextPassword !== value.confirmation)
      context.addIssue({ code: "custom", path: ["confirmation"], message: "A confirmação não corresponde à nova senha." });
  });
type ProfileValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { user } = useViewer();
  const account = useAccountLogout();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [avatar, setAvatar] = useState<string>("");
  const [avatarError, setAvatarError] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", username: "", email: "", ens: "", walletAlias: "", currentPassword: "", nextPassword: "", confirmation: "" },
  });
  useEffect(() => {
    if (!user) return;
    form.reset({
      name: user.name,
      username: user.username ?? user.name.toLowerCase().replace(/\s+/g, "."),
      email: user.email,
      ens: user.ens ?? "",
      walletAlias: user.walletAlias ?? "",
      currentPassword: "",
      nextPassword: "",
      confirmation: "",
    });
    setAvatar(user.avatar ?? "");
  }, [user, form]);
  if (!user)
    return (
      <DetailLayout>
        <PageSkeleton label="Carregando perfil" />
      </DetailLayout>
    );
  const errors = form.formState.errors;
  const pending = updateProfile.isPending || changePassword.isPending;

  const onSubmit = form.handleSubmit(
    async (values) => {
      setStatus(null);
      try {
        await updateProfile.mutateAsync({
          name: values.name,
          username: values.username,
          email: values.email,
          ens: values.ens,
          walletAlias: values.walletAlias,
          avatar,
        });
      } catch (error) {
        const apiError = toApiError(error);
        for (const [name, message] of Object.entries(apiError.fields)) {
          if (name === "avatar") setAvatarError(message);
          else form.setError(name as keyof ProfileValues, { message });
        }
        setStatus({ tone: "error", message: apiError.message });
        return;
      }
      if (values.currentPassword) {
        try {
          await changePassword.mutateAsync({ currentPassword: values.currentPassword, nextPassword: values.nextPassword });
        } catch (error) {
          const apiError = toApiError(error);
          for (const [name, message] of Object.entries(apiError.fields)) form.setError(name as keyof ProfileValues, { message });
          setStatus({ tone: "error", message: `Perfil salvo, mas a senha não foi alterada: ${apiError.message}` });
          return;
        }
      }
      form.setValue("currentPassword", "");
      form.setValue("nextPassword", "");
      form.setValue("confirmation", "");
      setStatus({ tone: "success", message: values.currentPassword ? "Perfil atualizado e senha alterada com sucesso." : "Perfil atualizado com sucesso." });
    },
    () => setStatus({ tone: "error", message: "Revise os campos destacados." }),
  );

  return (
    <DetailLayout>
      <section className="account-page">
        <AccountMobileHeader title="Meu perfil" />
        <AccountMobileNav onLogout={account.logout} loggingOut={account.pending} />
        <div className="account-layout">
          <AccountSidebar active="profile" onLogout={account.logout} loggingOut={account.pending} />
          <form className="account-form" onSubmit={onSubmit} noValidate aria-labelledby="profile-title">
            <h1 id="profile-title">Perfil do colecionador</h1>
            <div className="account-form__grid">
              <Field label="Nome de exibição" required error={errors.name?.message}>
                {(props) => <input {...props} {...form.register("name")} autoComplete="name" />}
              </Field>
              <Field label="Nome de usuário" required error={errors.username?.message}>
                {(props) => <input {...props} {...form.register("username")} autoComplete="username" />}
              </Field>
              <Field label="E-mail" required error={errors.email?.message}>
                {(props) => <input {...props} {...form.register("email")} type="email" autoComplete="email" />}
              </Field>
              <Field label="Nome ENS" error={errors.ens?.message}>
                {(props) => (
                  <div className="account-ens">
                    <span aria-hidden="true">.eth</span>
                    <input {...props} {...form.register("ens")} />
                  </div>
                )}
              </Field>
              <Field label="Apelido da carteira" error={errors.walletAlias?.message}>
                {(props) => <input {...props} {...form.register("walletAlias")} />}
              </Field>
              <div className="account-avatar-field" role="group" aria-labelledby="avatar-label">
                <span id="avatar-label">Avatar</span>
                <div>
                  <i className={avatar ? "has-image" : ""}>
                    {avatar ? <img src={avatar} alt="Pré-visualização do avatar" /> : <span aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>}
                  </i>
                  <label className="account-avatar-field__choose">
                    Alterar
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      aria-label="Escolher imagem de avatar"
                      aria-invalid={avatarError ? true : undefined}
                      aria-describedby={avatarError ? "avatar-error" : "avatar-hint"}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (!file.type.startsWith("image/")) {
                          setAvatarError("Escolha um arquivo de imagem (PNG, JPG, WebP ou GIF).");
                          return;
                        }
                        if (file.size > MAX_AVATAR_BYTES) {
                          setAvatarError("A imagem deve ter no máximo 1 MB.");
                          return;
                        }
                        setAvatarError("");
                        const reader = new FileReader();
                        reader.onload = () => {
                          setAvatar(String(reader.result));
                          setStatus({ tone: "success", message: "Avatar selecionado. Salve para confirmar." });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatar("");
                        setStatus({ tone: "success", message: "Avatar removido. Salve para confirmar." });
                      }}
                    >
                      Remover
                    </button>
                  )}
                </div>
                <small id="avatar-hint" className="form-field__hint">PNG, JPG, WebP ou GIF de até 1 MB.</small>
                {avatarError && (
                  <small id="avatar-error" className="form-field__error" role="alert">
                    ⚠ {avatarError}
                  </small>
                )}
              </div>
            </div>
            <fieldset className="account-passwords">
              <legend>
                <h2>Alterar senha</h2>
              </legend>
              <Field label="Senha atual" error={errors.currentPassword?.message}>
                {(props) => <input {...props} {...form.register("currentPassword")} type="password" autoComplete="current-password" />}
              </Field>
              <Field label="Nova senha" error={errors.nextPassword?.message} hint="Mínimo de 6 caracteres.">
                {(props) => <input {...props} {...form.register("nextPassword")} type="password" autoComplete="new-password" />}
              </Field>
              <Field label="Confirmar nova senha" error={errors.confirmation?.message}>
                {(props) => <input {...props} {...form.register("confirmation")} type="password" autoComplete="new-password" />}
              </Field>
            </fieldset>
            {status && (
              <Alert tone={status.tone} className="account-form__status">
                {status.message}
              </Alert>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </div>
      </section>
    </DetailLayout>
  );
}

// ---------- Carteiras ----------

const walletSchema = z
  .object({
    displayName: z.string().trim().min(2, "Informe o nome de exibição."),
    label: z.string().trim().min(2, "Informe o apelido da carteira."),
    network: z.enum(["Ethereum", "Polygon", "Solana"]),
    profileName: z.string().trim().min(2, "Informe o nome do perfil."),
    address: z.string().trim().min(1, "Informe o endereço da carteira."),
    secondaryAddress: z.string().trim(),
    walletType: z.string().min(1, "Selecione o tipo de carteira."),
    referralCode: z.string().trim().max(20, "Use até 20 caracteres."),
    email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
    ens: z
      .string()
      .trim()
      .regex(/^([a-z0-9-]{3,})?$/i, "O nome ENS deve ter ao menos 3 caracteres (letras, números ou hífen)."),
  })
  .superRefine((value, context) => {
    if (value.address && !ADDRESS_PATTERNS[value.network].test(value.address)) {
      context.addIssue({
        code: "custom",
        path: ["address"],
        message:
          value.network === "Solana"
            ? "Endereço Solana inválido (base58, 32 a 44 caracteres)."
            : "Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.",
      });
    }
  });
type WalletValues = z.infer<typeof walletSchema>;

const WALLET_TYPES = ["MetaMask", "WalletConnect", "Coinbase Wallet", "Phantom", "Carteira de contrato"];

function walletDefaults(wallet: Wallet | undefined, fallback: { name: string; email: string }): WalletValues {
  return {
    displayName: wallet?.displayName ?? fallback.name,
    label: wallet?.label ?? "",
    network: wallet?.network ?? "Ethereum",
    profileName: wallet?.profileName ?? fallback.name,
    address: wallet?.address ?? "",
    secondaryAddress: wallet?.secondaryAddress ?? "",
    walletType: wallet?.walletType ?? "",
    referralCode: wallet?.referralCode ?? "",
    email: wallet?.email ?? fallback.email,
    ens: wallet?.ens ?? "",
  };
}

export function WalletsPage() {
  const { user, userId } = useViewer();
  const search = useSearch({ from: "/carteiras" });
  const account = useAccountLogout();
  const walletsQuery = useWallets(userId);
  const save = useSaveWallet(userId);
  const wallets = walletsQuery.data ?? [];
  const primary = wallets.find((wallet) => wallet.primary);
  const secondaryWallets = wallets.filter((wallet) => !wallet.primary);
  const [mode, setMode] = useState<{ type: "edit"; id?: string } | { type: "add"; primary: boolean }>({ type: "edit" });
  const [copyPrimary, setCopyPrimary] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const activeWallet = mode.type === "edit" ? wallets.find((wallet) => wallet.id === mode.id) ?? primary : undefined;
  const form = useForm<WalletValues>({ resolver: zodResolver(walletSchema), defaultValues: walletDefaults(undefined, { name: "", email: "" }) });
  const network = useWatch({ control: form.control, name: "network" }) as Network;
  const fallback = { name: user?.name ?? "", email: user?.email ?? "" };

  useEffect(() => {
    if (mode.type === "add") return;
    form.reset(walletDefaults(activeWallet, { name: user?.name ?? "", email: user?.email ?? "" }));
  }, [activeWallet?.id, mode.type, user?.name, user?.email, form, activeWallet]);

  const startAdding = (asPrimary: boolean) => {
    setMode({ type: "add", primary: asPrimary });
    setCopyPrimary(false);
    setStatus(null);
    form.reset(walletDefaults(undefined, fallback));
    window.requestAnimationFrame(() => form.setFocus("label"));
  };

  const errors = form.formState.errors;
  const heading = mode.type === "add" ? (mode.primary ? "Adicionar carteira principal" : "Adicionar carteira secundária") : activeWallet?.primary ? "Carteira principal" : "Carteira secundária";

  const onSubmit = form.handleSubmit(
    (values) => {
      setStatus(null);
      const input = { ...values, primary: mode.type === "add" ? mode.primary || !wallets.length : activeWallet?.primary };
      save.mutate(
        { id: mode.type === "edit" ? activeWallet?.id : undefined, input },
        {
          onSuccess: (wallet) => {
            setMode({ type: "edit", id: wallet.id });
            setCopyPrimary(false);
            setStatus({ tone: "success", message: `Carteira ${wallet.label} salva com sucesso.` });
          },
          onError: (error) => {
            const apiError = toApiError(error);
            for (const [name, message] of Object.entries(apiError.fields)) form.setError(name as keyof WalletValues, { message });
            setStatus({ tone: "error", message: apiError.message });
          },
        },
      );
    },
    () => setStatus({ tone: "error", message: "Revise os campos destacados da carteira." }),
  );

  if (walletsQuery.isPending)
    return (
      <DetailLayout>
        <PageSkeleton label="Carregando carteiras" />
      </DetailLayout>
    );

  return (
    <DetailLayout>
      <section className="account-page">
        <AccountMobileHeader title="Carteiras" />
        <AccountMobileNav onLogout={account.logout} loggingOut={account.pending} />
        <div className="account-layout">
          <AccountSidebar active="wallets" onLogout={account.logout} loggingOut={account.pending} />
          {walletsQuery.isError ? (
            <ErrorState error={walletsQuery.error} onRetry={() => void walletsQuery.refetch()} retrying={walletsQuery.isFetching} />
          ) : (
            <form className="account-form account-wallet-form" onSubmit={onSubmit} noValidate aria-labelledby="wallet-form-title">
              <header className="account-wallet-form__heading">
                <div>
                  <h1 id="wallet-form-title">{heading}</h1>
                  <p>Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
                </div>
                <button type="button" aria-label="Adicionar carteira" onClick={() => startAdding(!wallets.length)}>
                  Adicionar
                </button>
              </header>
              {search.redirect === "/checkout" && (
                <Alert tone="info" live={false}>
                  Depois de salvar, <Link className="text-link" to="/checkout">volte ao pagamento</Link> para usar a carteira.
                </Alert>
              )}
              <div className="account-form__grid">
                <Field label="Nome de exibição" required error={errors.displayName?.message}>
                  {(props) => <input {...props} {...form.register("displayName")} />}
                </Field>
                <Field label="Apelido da carteira" required error={errors.label?.message}>
                  {(props) => <input {...props} {...form.register("label")} />}
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
                <Field label="Nome do perfil" required error={errors.profileName?.message}>
                  {(props) => <input {...props} {...form.register("profileName")} />}
                </Field>
                <Field
                  label="Endereço da carteira"
                  required
                  error={errors.address?.message}
                  hint={network === "Solana" ? "Endereço base58 (32 a 44 caracteres)." : "0x seguido de 40 caracteres hexadecimais."}
                >
                  {(props) => <input {...props} {...form.register("address")} placeholder="Endereço da carteira" autoComplete="off" spellCheck={false} />}
                </Field>
                <Field label="ENS ou carteira secundária" error={errors.secondaryAddress?.message}>
                  {(props) => <input {...props} {...form.register("secondaryAddress")} placeholder="Opcional" />}
                </Field>
                <Field label="Tipo de carteira" required error={errors.walletType?.message}>
                  {(props) => (
                    <select {...props} {...form.register("walletType")}>
                      <option value="">Selecione uma carteira</option>
                      {WALLET_TYPES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Código de indicação" error={errors.referralCode?.message}>
                  {(props) => <input {...props} {...form.register("referralCode")} />}
                </Field>
                <Field label="E-mail" required error={errors.email?.message}>
                  {(props) => <input {...props} {...form.register("email")} type="email" />}
                </Field>
                <Field label="Nome ENS" error={errors.ens?.message}>
                  {(props) => (
                    <div className="account-ens">
                      <span aria-hidden="true">.eth</span>
                      <input {...props} {...form.register("ens")} />
                    </div>
                  )}
                </Field>
              </div>
              {status && (
                <Alert tone={status.tone} className="account-form__status">
                  {status.message}
                </Alert>
              )}
              <div className="account-wallet-form__actions">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Salvando..." : "Salvar carteira"}
                </Button>
                {mode.type === "edit" && activeWallet && !activeWallet.primary && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={save.isPending}
                    onClick={() =>
                      save.mutate(
                        { id: activeWallet.id, input: { ...walletDefaults(activeWallet, fallback), primary: true } },
                        { onSuccess: (wallet) => setStatus({ tone: "success", message: `${wallet.label} agora é a carteira principal.` }) },
                      )
                    }
                  >
                    Tornar principal
                  </Button>
                )}
                {mode.type === "add" && (
                  <Button type="button" variant="ghost" onClick={() => setMode({ type: "edit" })}>
                    Cancelar
                  </Button>
                )}
              </div>
              <section className="account-secondary-wallet" aria-labelledby="secondary-wallets-title">
                <div className="account-secondary-wallet__heading">
                  <h2 id="secondary-wallets-title">Carteira secundária</h2>
                  <label>
                    <input
                      type="checkbox"
                      checked={copyPrimary}
                      disabled={!primary}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setCopyPrimary(checked);
                        if (checked && primary) {
                          setMode({ type: "add", primary: false });
                          form.reset({
                            ...walletDefaults(primary, fallback),
                            label: `${primary.label} secundária`,
                          });
                        }
                      }}
                    />
                    Igual à carteira principal
                  </label>
                  <button type="button" aria-label="Adicionar carteira secundária" onClick={() => startAdding(false)}>
                    Adicionar
                  </button>
                </div>
                {primary && (
                  <div className="account-secondary-wallet__list">
                    <button
                      type="button"
                      className={mode.type === "edit" && activeWallet?.id === primary.id ? "is-active" : ""}
                      aria-current={mode.type === "edit" && activeWallet?.id === primary.id ? "true" : undefined}
                      onClick={() => setMode({ type: "edit", id: primary.id })}
                    >
                      <b>{primary.label} · principal</b>
                      <span>
                        {shortAddress(primary.address)} · {primary.network}
                      </span>
                    </button>
                  </div>
                )}
                {secondaryWallets.length ? (
                  <div className="account-secondary-wallet__list">
                    {secondaryWallets.map((wallet) => (
                      <button
                        className={mode.type === "edit" && wallet.id === activeWallet?.id ? "is-active" : ""}
                        aria-current={mode.type === "edit" && wallet.id === activeWallet?.id ? "true" : undefined}
                        type="button"
                        key={wallet.id}
                        onClick={() => {
                          setStatus(null);
                          setMode({ type: "edit", id: wallet.id });
                        }}
                      >
                        <b>{wallet.label}</b>
                        <span>
                          {shortAddress(wallet.address)} · {wallet.network}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>Você ainda não adicionou uma carteira secundária.</p>
                )}
              </section>
            </form>
          )}
        </div>
      </section>
    </DetailLayout>
  );
}
