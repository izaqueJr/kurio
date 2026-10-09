import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "./ui/button";
import { api } from "../api/client";
import type { User } from "../domain";

type AuthMode = "login" | "register";
type AuthModalValue = {
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
};
const AuthModalContext = createContext<AuthModalValue | null>(null);

export function useAuthModal() {
  const value = useContext(AuthModalContext);
  if (!value)
    throw new Error("useAuthModal precisa estar dentro de AuthModalProvider.");
  return value;
}

function AuthDialog({
  mode,
  onModeChange,
  onClose,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const register = mode === "register";
  const mutation = useMutation({
    mutationFn: async () =>
      register
        ? (
            await api.post<User>("/account", {
              name: form.name,
              email: form.email,
              password: form.password,
            })
          ).data
        : (
            await api.post<User>("/session/login", {
              email: form.email,
              password: form.password,
            })
          ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      localStorage.removeItem("kurio-return-to");
      onClose();
    },
    onError: () =>
      setError(
        register
          ? "Não foi possível criar sua conta. Revise os dados."
          : "E-mail ou senha inválidos.",
      ),
  });

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const switchMode = (next: AuthMode) => {
    setError("");
    setShowPassword(false);
    onModeChange(next);
  };

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`auth-modal ${register ? "auth-modal--register" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="auth-modal__close"
          aria-label="Fechar autenticação"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div
          className="auth-modal__tabs"
          role="tablist"
          aria-label="Autenticação"
        >
          <button
            id="auth-login-tab"
            type="button"
            role="tab"
            aria-selected={!register}
            onClick={() => switchMode("login")}
          >
            Entrar
          </button>
          <span aria-hidden="true" />
          <button
            id="auth-register-tab"
            type="button"
            role="tab"
            aria-selected={register}
            onClick={() => switchMode("register")}
          >
            Criar conta
          </button>
        </div>
        <p id="auth-modal-title" className="auth-modal__intro">
          {register
            ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
            : "Entre para gerenciar sua carteira, coleção e perfil de criador."}
        </p>
        <form
          className="auth-modal__form"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              register &&
              (!form.name ||
                !form.email ||
                !form.password ||
                form.password !== form.confirmPassword)
            ) {
              setError(
                form.password !== form.confirmPassword
                  ? "As senhas precisam ser iguais."
                  : "Preencha todos os campos para criar sua conta.",
              );
              return;
            }
            if (!register && (!form.email || !form.password)) {
              setError("Informe e-mail e senha para continuar.");
              return;
            }
            mutation.mutate();
          }}
        >
          {register && (
            <input
              aria-label="Nome de usuário"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Nome de usuário"
              autoComplete="username"
            />
          )}
          <input
            aria-label="E-mail de acesso"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            placeholder={register ? "Digite seu e-mail" : "contato@email.com"}
            autoComplete="email"
          />
          <label className="auth-modal__password">
            <input
              aria-label="Senha de acesso"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder={register ? "Senha" : "***********"}
              autoComplete={register ? "new-password" : "current-password"}
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>
          {register && (
            <input
              aria-label="Confirmar senha"
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm({ ...form, confirmPassword: event.target.value })
              }
              placeholder="Confirmar senha"
              autoComplete="new-password"
            />
          )}
          {!register && (
            <button type="button" className="auth-modal__forgot">
              Esqueceu a senha?
            </button>
          )}
          {error && (
            <p className="auth-modal__error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Aguarde..."
              : register
                ? "Criar conta"
                : "Entrar"}
          </Button>
        </form>
        <div className="auth-modal__social">
          <div>
            <i />
            <span>Ou continue com</span>
            <i />
          </div>
          <button type="button">
            <b aria-hidden="true">G</b>Continuar com Google
          </button>
          <button type="button">
            <b aria-hidden="true">f</b>Continuar com Facebook
          </button>
        </div>
      </section>
    </div>
  );
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [open, setOpen] = useState(false);
  const value: AuthModalValue = {
    openAuth: (next = "login") => {
      setMode(next);
      setOpen(true);
    },
    closeAuth: () => setOpen(false),
  };
  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {open && (
        <AuthDialog
          mode={mode}
          onModeChange={setMode}
          onClose={value.closeAuth}
        />
      )}
    </AuthModalContext.Provider>
  );
}
