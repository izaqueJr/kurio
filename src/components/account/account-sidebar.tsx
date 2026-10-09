import { Activity, Download, Heart, HelpCircle, LogOut, MapPin, ShoppingBag, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";

type AccountSidebarProps = {
  active: "profile" | "wallets" | "favorites";
  onLogout: () => void;
  loggingOut?: boolean;
};

/** Itens fora do escopo da entrega: visíveis como no Figma, mas sinalizados e sem simular sucesso. */
const unavailableItems = [
  { label: "Atividade", icon: ShoppingBag },
  { label: "Ofertas", icon: Activity },
  { label: "Arquivos baixados", icon: Download },
  { label: "Suporte", icon: HelpCircle },
];

export function AccountSidebar({ active, onLogout, loggingOut = false }: AccountSidebarProps) {
  return (
    <aside className="account-sidebar" aria-label="Navegação da conta">
      <h2 className="account-sidebar__title">Meu perfil</h2>
      <nav aria-label="Seções da conta">
        <Link to="/perfil" className={active === "profile" ? "is-active" : ""} aria-current={active === "profile" ? "page" : undefined}>
          <UserRound size={18} aria-hidden="true" />
          Dados do perfil
        </Link>
        <Link to="/carteiras" className={active === "wallets" ? "is-active" : ""} aria-current={active === "wallets" ? "page" : undefined}>
          <MapPin size={18} aria-hidden="true" />
          Carteiras
        </Link>
        <Link to="/favoritos" className={active === "favorites" ? "is-active" : ""} aria-current={active === "favorites" ? "page" : undefined}>
          <Heart size={18} aria-hidden="true" />
          Lista de interesse
        </Link>
        {unavailableItems.map(({ label, icon: Icon }) => (
          <span key={label} className="account-sidebar__item is-unavailable" aria-disabled="true" title="Indisponível nesta demonstração">
            <Icon size={18} aria-hidden="true" />
            {label}
            <small>(em breve)</small>
          </span>
        ))}
      </nav>
      <button className="account-sidebar__logout" type="button" onClick={onLogout} disabled={loggingOut}>
        <LogOut size={20} aria-hidden="true" />
        {loggingOut ? "Saindo..." : "Sair"}
      </button>
    </aside>
  );
}
