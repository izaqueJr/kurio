import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";

/** Drawer de filtros (shadcn/ui Dialog): foco preso, Escape fecha e o foco volta ao gatilho. */
export default function FilterDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="bare"
        className="mobile-filter-dialog__panel mobile-filter-dialog__panel--dialog"
        overlayClassName="mobile-filter-dialog__backdrop"
        closeLabel="Fechar filtros"
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          // Toque em telas sensíveis não move o foco: devolve-o explicitamente ao gatilho.
          const trigger = document.querySelector<HTMLElement>(".mobile-filter-trigger");
          if (trigger) {
            event.preventDefault();
            trigger.focus();
          }
        }}
      >
        <header>
          <DialogTitle asChild>
            <h2>Filtros</h2>
          </DialogTitle>
        </header>
        {children}
      </DialogContent>
    </Dialog>
  );
}

