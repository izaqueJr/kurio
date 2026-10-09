import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { AuthPanel, type AuthMode } from "./auth-form";

/** Diálogo de autenticação (carregado sob demanda pelo AuthModalProvider). */
export default function AuthDialog({
  open,
  mode,
  onOpenChange,
  onModeChange,
  onAuthenticated,
  returnFocus,
}: {
  open: boolean;
  mode: AuthMode;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: AuthMode) => void;
  onAuthenticated: () => void;
  returnFocus: React.RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="bare"
        className={`auth-modal auth-modal--dialog ${mode === "register" ? "auth-modal--register" : ""}`}
        overlayClassName="auth-modal-backdrop"
        closeLabel="Fechar autenticação"
        aria-describedby="auth-modal-intro"
        onCloseAutoFocus={(event) => {
          // Devolve o foco ao elemento que abriu o diálogo.
          if (returnFocus.current?.isConnected) {
            event.preventDefault();
            returnFocus.current.focus();
          }
        }}
      >
        <DialogTitle className="sr-only">{mode === "register" ? "Criar conta" : "Entrar"}</DialogTitle>
        <AuthPanel mode={mode} onModeChange={onModeChange} titleId="auth-modal-intro" onSuccess={onAuthenticated} />
      </DialogContent>
    </Dialog>
  );
}
