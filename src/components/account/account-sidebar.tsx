import {
  Activity,
  Download,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

type AccountSidebarProps = {
  active: "profile" | "wallets";
  onLogout: () => void;
  loggingOut?: boolean;
};

const secondaryItems = [
  { label: "Atividade", icon: ShoppingBag },
  { label: "Lista de interesse", icon: Heart },
  { label: "Ofertas", icon: Activity },
  { label: "Arquivos baixados", icon: Download },
  { label: "Suporte", icon: HelpCircle },
];

export function AccountSidebar({
  active,
  onLogout,
  loggingOut = false,
}: AccountSidebarProps) {
  return (
    <aside className="account-sidebar" aria-label="Navegação da conta">
      <h1>Meu perfil</h1>
      <nav>
        <Link
          to="/perfil"
          className={active === "profile" ? "is-active" : ""}
        >
          <UserRound size={18} />
          Dados do perfil
        </Link>
        <Link
          to="/carteiras"
          className={active === "wallets" ? "is-active" : ""}
        >
          <MapPin size={18} />
          Carteiras
        </Link>
        {secondaryItems.map(({ label, icon: Icon }) => (
          <button type="button" key={label} className="account-sidebar__item">
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <button
        className="account-sidebar__logout"
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
      >
        <LogOut size={20} />
        {loggingOut ? "Saindo..." : "Sair"}
      </button>
    </aside>
  );
}
