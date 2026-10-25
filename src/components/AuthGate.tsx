import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/drzewo-logo.png";

type Mode = "in" | "up" | "forgot";

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-foreground";
const primaryBtnCls = "w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60";
const linkBtnCls = "w-full text-sm text-muted-foreground underline";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [mode, setMode] = useState<Mode>("in");
  const [recovery, setRecovery] = useState(false); // wejście z linku „reset hasła” z e-maila
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // link z e-maila wraca na stronę z #...type=recovery w adresie
    if (/type=recovery/.test(window.location.hash)) setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") window.location.reload();
    });
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (session && !recovery) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Jeśli konto istnieje, wysłaliśmy na ten adres link do ustawienia nowego hasła.");
      setMode("in");
      return;
    }

    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (mode === "up" && !res.data.session) toast.success("Sprawdź e-mail i kliknij link potwierdzający.");
  }

  async function saveNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) {
      toast.error("Hasła nie są takie same.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Hasło zostało zmienione.");
    window.history.replaceState(null, "", window.location.pathname);
    setPassword("");
    setPassword2("");
    setRecovery(false); // sesja już istnieje, więc pokaże się aplikacja
  }

  // Ekran ustawiania nowego hasła (po kliknięciu w link z e-maila)
  if (recovery && session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <form onSubmit={saveNewPassword} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <img src={logo} alt="Logo Drzewo" className="mx-auto size-20" />
          <h1 className="text-center font-serif text-2xl font-semibold text-foreground">Nowe hasło</h1>
          <p className="text-sm text-muted-foreground">Wpisz nowe hasło do swojego konta.</p>
          <input
            type="password" required minLength={6} placeholder="Nowe hasło" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={inputCls}
          />
          <input
            type="password" required minLength={6} placeholder="Powtórz nowe hasło" value={password2}
            onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" className={inputCls}
          />
          <button disabled={busy} className={primaryBtnCls}>Zapisz hasło</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <img src={logo} alt="Logo Drzewo" className="mx-auto size-20" />
        <h1 className="text-center font-serif text-2xl font-semibold text-foreground">Drzewo rodzinne</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "in" && "Zaloguj się, aby zobaczyć swoje drzewo."}
          {mode === "up" && "Załóż konto — drzewo zapisze się w chmurze."}
          {mode === "forgot" && "Podaj e-mail konta — wyślemy link do ustawienia nowego hasła."}
        </p>
        <input
          type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email" className={inputCls}
        />
        {mode !== "forgot" && (
          <input
            type="password" required minLength={6} placeholder="Hasło" value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "in" ? "current-password" : "new-password"} className={inputCls}
          />
        )}
        <button disabled={busy} className={primaryBtnCls}>
          {mode === "in" && "Zaloguj"}
          {mode === "up" && "Załóż konto"}
          {mode === "forgot" && "Wyślij link do resetu"}
        </button>
        {mode === "in" && (
          <button type="button" onClick={() => setMode("forgot")} className={linkBtnCls}>
            Nie pamiętasz hasła?
          </button>
        )}
        <button type="button" onClick={() => setMode(mode === "up" ? "in" : mode === "in" ? "up" : "in")} className={linkBtnCls}>
          {mode === "in" && "Nie masz konta? Zarejestruj się"}
          {mode === "up" && "Masz konto? Zaloguj się"}
          {mode === "forgot" && "Wróć do logowania"}
        </button>
      </form>
    </div>
  );
}