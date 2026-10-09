import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { DetailLayout } from "../components/layout";
import { AuthPanel, type AuthMode } from "../components/auth-form";
import { Alert } from "../components/ui/feedback";

/** Login e cadastro como páginas: acesso direto, retorno ao fluxo anterior e aviso de sessão expirada. */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const search = useSearch({ strict: false }) as { redirect?: string; reason?: string };
  const redirect = search.redirect && search.redirect.startsWith("/") && !search.redirect.startsWith("//") ? search.redirect : "/";
  return (
    <DetailLayout>
      <section className="auth-page" aria-labelledby="auth-page-title">
        <h1 id="auth-page-title" className="sr-only">
          {mode === "register" ? "Criar conta" : "Entrar"}
        </h1>
        <div className="auth-modal auth-page__card">
          {search.reason === "expired" && (
            <Alert tone="info" title="Sua sessão expirou">
              Entre novamente para continuar de onde parou. Os dados preenchidos foram preservados.
            </Alert>
          )}
          {search.reason === "required" && (
            <Alert tone="info" live={false}>
              Entre na sua conta para acessar esta área.
            </Alert>
          )}
          <AuthPanel
            mode={mode}
            titleId="auth-page-intro"
            onModeChange={(next) =>
              void navigate({ to: next === "register" ? "/cadastro" : "/login", search: { redirect: search.redirect, reason: search.reason as "expired" | "required" | undefined }, replace: true })
            }
            onSuccess={() => router.history.replace(redirect)}
          />
        </div>
      </section>
    </DetailLayout>
  );
}
