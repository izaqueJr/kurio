import { createContext, lazy, Suspense, useContext, useMemo, useRef, useState } from "react";
import type { AuthMode } from "./auth-form";

// Diálogo, formulário (react-hook-form + zod) e Radix só são carregados na primeira abertura.
const AuthDialog = lazy(() => import("./auth-dialog"));

type AuthModalValue = {
  openAuth: (mode?: AuthMode, onAuthenticated?: () => void) => void;
  closeAuth: () => void;
};
const AuthModalContext = createContext<AuthModalValue | null>(null);

export function useAuthModal() {
  const value = useContext(AuthModalContext);
  if (!value) throw new Error("useAuthModal precisa estar dentro de AuthModalProvider.");
  return value;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const [afterAuth, setAfterAuth] = useState<(() => void) | undefined>();
  const returnFocus = useRef<HTMLElement | null>(null);
  const value = useMemo<AuthModalValue>(
    () => ({
      openAuth: (next = "login", onAuthenticated) => {
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setMode(next);
        setAfterAuth(() => onAuthenticated);
        setRequested(true);
        setOpen(true);
      },
      closeAuth: () => setOpen(false),
    }),
    [],
  );
  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {requested && (
        <Suspense fallback={null}>
          <AuthDialog
            open={open}
            mode={mode}
            onOpenChange={setOpen}
            onModeChange={setMode}
            returnFocus={returnFocus}
            onAuthenticated={() => {
              setOpen(false);
              afterAuth?.();
            }}
          />
        </Suspense>
      )}
    </AuthModalContext.Provider>
  );
}
