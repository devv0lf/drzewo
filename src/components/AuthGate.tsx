import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/drzewo-logo.png.asset.json";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") window.location.reload();
    });
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (session) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <img src={logoAsset.url} alt="Logo Drzewo" className="mx-auto size-20" />
        <h1 className="text-center font-serif text-2xl font-semibold text-foreground">Drzewo rodzinne</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "in" ? "Zaloguj się, aby zobaczyć swoje drzewo." : "Załóż konto — drzewo zapisze się w chmurze."}
        </p>
        <input
          type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
        />
        <input
          type="password" required minLength={6} placeholder="Hasło" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
        />
        <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
          {mode === "in" ? "Zaloguj" : "Załóż konto"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground underline">
          {mode === "in" ? "Nie masz konta? Zarejestruj się" : "Masz konto? Zaloguj się"}
        </button>
      </form>
    </div>
  );
}
