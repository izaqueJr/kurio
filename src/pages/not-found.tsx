import { Link } from "@tanstack/react-router";
import { DetailLayout } from "../components/layout";

export function NotFoundContent({
  title = "Página não encontrada",
  description = "O endereço acessado não existe ou foi removido.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="empty-state not-found" aria-labelledby="not-found-title">
      <p className="not-found__code" aria-hidden="true">404</p>
      <h1 id="not-found-title">{title}</h1>
      <p>{description}</p>
      <Link to="/" hash="mercado">
        Voltar ao mercado
      </Link>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <DetailLayout>
      <NotFoundContent />
    </DetailLayout>
  );
}
