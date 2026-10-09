import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Field } from "./ui/form";
import { Alert } from "./ui/feedback";
import { useLogin, useRegister } from "../api/queries";
import { toApiError } from "../api/client";
import type { User } from "../domain";

export type AuthMode = "login" | "register";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});
const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Informe um nome de usuário com ao menos 2 caracteres."),
    email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
    password: z.string().min(6, "A senha precisa de pelo menos 6 caracteres."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais.",
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function PasswordInput({
  fieldProps,
  register,
  autoComplete,
  placeholder,
}: {
  fieldProps: Record<string, unknown>;
  register: UseFormRegisterReturn;
  autoComplete: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="auth-modal__password">
      <input {...fieldProps} {...register} type={visible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} />
      <button type="button" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </span>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const login = useLogin();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const [notice, setNotice] = useState("");
  const submit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: (response) => onSuccess(response.user),
      onError: (error) => {
        const apiError = toApiError(error);
        for (const [name, message] of Object.entries(apiError.fields)) form.setError(name as keyof LoginValues, { message });
      },
    }),
  );
  const errors = form.formState.errors;
  return (
    <form className="auth-modal__form" onSubmit={submit} noValidate>
      <Field label="E-mail de acesso" labelClassName="sr-only" error={errors.email?.message} required>
        {(props) => <input {...props} {...form.register("email")} type="email" autoComplete="email" placeholder="contato@email.com" />}
      </Field>
      <Field label="Senha de acesso" labelClassName="sr-only" error={errors.password?.message} required>
        {(props) => <PasswordInput fieldProps={props} register={form.register("password")} autoComplete="current-password" placeholder="***********" />}
      </Field>
      <button type="button" className="auth-modal__forgot" onClick={() => setNotice("A recuperação de senha não está disponível nesta demonstração.")}>
        Esqueceu a senha?
      </button>
      {notice && <Alert tone="info">{notice}</Alert>}
      {login.isError && <Alert>{toApiError(login.error).message}</Alert>}
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? "Aguarde..." : "Entrar"}
      </Button>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const registerAccount = useRegister();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const submit = form.handleSubmit(({ name, email, password }) =>
    registerAccount.mutate(
      { name, email, password },
      {
        onSuccess: (response) => onSuccess(response.user),
        onError: (error) => {
          const apiError = toApiError(error);
          for (const [name, message] of Object.entries(apiError.fields)) form.setError(name as keyof RegisterValues, { message });
        },
      },
    ),
  );
  const errors = form.formState.errors;
  return (
    <form className="auth-modal__form" onSubmit={submit} noValidate>
      <Field label="Nome de usuário" labelClassName="sr-only" error={errors.name?.message} required>
        {(props) => <input {...props} {...form.register("name")} autoComplete="username" placeholder="Nome de usuário" />}
      </Field>
      <Field label="E-mail de acesso" labelClassName="sr-only" error={errors.email?.message} required>
        {(props) => <input {...props} {...form.register("email")} type="email" autoComplete="email" placeholder="Digite seu e-mail" />}
      </Field>
      <Field label="Senha de acesso" labelClassName="sr-only" error={errors.password?.message} required>
        {(props) => <PasswordInput fieldProps={props} register={form.register("password")} autoComplete="new-password" placeholder="Senha" />}
      </Field>
      <Field label="Confirmar senha" labelClassName="sr-only" error={errors.confirmPassword?.message} required>
        {(props) => <input {...props} {...form.register("confirmPassword")} type="password" autoComplete="new-password" placeholder="Confirmar senha" />}
      </Field>
      {registerAccount.isError && <Alert>{toApiError(registerAccount.error).message}</Alert>}
      <Button type="submit" disabled={registerAccount.isPending}>
        {registerAccount.isPending ? "Aguarde..." : "Criar conta"}
      </Button>
    </form>
  );
}

export function AuthPanel({
  mode,
  onModeChange,
  onSuccess,
  titleId,
  intro,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: (user: User) => void;
  titleId: string;
  intro?: string;
}) {
  const register = mode === "register";
  const [socialNotice, setSocialNotice] = useState("");
  return (
    <>
      <div className="auth-modal__tabs" role="tablist" aria-label="Autenticação">
        <button id="auth-login-tab" type="button" role="tab" aria-selected={!register} onClick={() => onModeChange("login")}>
          Entrar
        </button>
        <span aria-hidden="true" />
        <button id="auth-register-tab" type="button" role="tab" aria-selected={register} onClick={() => onModeChange("register")}>
          Criar conta
        </button>
      </div>
      <p id={titleId} className="auth-modal__intro">
        {intro ??
          (register
            ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
            : "Entre para gerenciar sua carteira, coleção e perfil de criador.")}
      </p>
      <div role="tabpanel" aria-labelledby={register ? "auth-register-tab" : "auth-login-tab"}>
        {register ? <RegisterForm key="register" onSuccess={onSuccess} /> : <LoginForm key="login" onSuccess={onSuccess} />}
      </div>
      <div className="auth-modal__social">
        <div className="auth-modal__divider">
          <i />
          <span>Ou continue com</span>
          <i />
        </div>
        <button type="button" onClick={() => setSocialNotice("O login com Google não está disponível nesta demonstração.")}>
          <b aria-hidden="true">G</b>Continuar com Google
        </button>
        <button type="button" onClick={() => setSocialNotice("O login com Facebook não está disponível nesta demonstração.")}>
          <b aria-hidden="true">f</b>Continuar com Facebook
        </button>
        {socialNotice && <Alert tone="info">{socialNotice}</Alert>}
      </div>
    </>
  );
}
