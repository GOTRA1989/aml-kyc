import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — SATYA KYC Compliance Platform" },
      { name: "description", content: "Secure sign-in for analysts and clients of the SATYA KYC / AML platform." },
    ],
  }),
});

type Mode = "signin" | "signup";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email },
          },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in now.");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#0a1530] text-white font-sans">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#0a1530] via-[#0d1d44] to-[#061027] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-10 rounded-md bg-white text-[#0a1530] grid place-items-center font-bold shadow-lg">V</div>
          <div>
            <div className="font-semibold tracking-tight text-lg">SATYA KYC</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Compliance Platform</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/70 border border-white/20 rounded-full px-3 py-1">
            <Shield className="size-3.5" /> Tier-1 Banking Grade
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Secure access to your KYC &amp; AML workspace.
          </h1>
          <p className="text-sm text-white/70 leading-relaxed">
            Audit-ready onboarding, sanctions screening and analyst review built for institutions
            like Citi, HSBC and JPMorgan. Every action is logged, signed and exportable.
          </p>
          <ul className="text-sm space-y-2 text-white/75">
            <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-400" /> FATF / Wolfsberg aligned controls</li>
            <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-400" /> Role-based access · Client &amp; Analyst</li>
            <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-400" /> Encrypted in transit and at rest</li>
          </ul>
        </div>

        <div className="relative z-10 text-[11px] text-white/50 tracking-wide">
          © {new Date().getFullYear()} SATYA · Simulated environment · v1.0
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#f6f8fc] text-slate-900">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="size-10 rounded-md bg-[#0a1530] text-white grid place-items-center font-bold">V</div>
            <div>
              <div className="font-semibold tracking-tight">SATYA KYC</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Compliance Platform</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              {mode === "signin" ? "Sign in" : "Create account"}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#0a1530]">
              {mode === "signin" ? "Access your secure portal" : "Register a new compliance account"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === "signin"
                ? "Enter your corporate credentials to continue."
                : "New accounts default to the Client role. Analysts must be elevated by an administrator."}
            </p>
          </div>

          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 mb-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`px-4 py-1.5 rounded-[5px] transition ${mode === "signin" ? "bg-[#0a1530] text-white shadow-sm" : "text-slate-600 hover:text-[#0a1530]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`px-4 py-1.5 rounded-[5px] transition ${mode === "signup" ? "bg-[#0a1530] text-white shadow-sm" : "text-slate-600 hover:text-[#0a1530]"}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                  className="auth-input"
                  autoComplete="name"
                />
              </Field>
            )}

            <Field label="Username / Email" icon={<Mail className="size-4" />}>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@bank.com"
                className="auth-input pl-9"
                autoComplete="username"
              />
            </Field>

            <Field label="Password" icon={<Lock className="size-4" />}>
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input pl-9"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-[#0a1530] text-white text-sm font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-[#13245a] transition-colors shadow-sm disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              {mode === "signin" ? "Sign in securely" : "Create account"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
            Protected by enterprise-grade authentication. By continuing you agree to the
            institution's <span className="text-[#0a1530] font-medium">Acceptable Use Policy</span> and
            consent to compliance monitoring.
          </div>

          <div className="mt-4 text-xs text-slate-500">
            <Link to="/" className="hover:text-[#0a1530]">← Back to overview</Link>
          </div>
        </div>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          height: 2.5rem;
          border-radius: 6px;
          border: 1px solid #d6dde9;
          background: #fff;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: #0a1530;
          transition: border-color .15s, box-shadow .15s;
          font-family: inherit;
        }
        .auth-input:focus {
          outline: none;
          border-color: #0a1530;
          box-shadow: 0 0 0 3px rgba(10,21,48,0.08);
        }
      `}</style>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">{label}</span>
      <div className="relative mt-1.5">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        {children}
      </div>
    </label>
  );
}
