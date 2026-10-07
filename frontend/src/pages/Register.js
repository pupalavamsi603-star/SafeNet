import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authIntent, authLink } from "../lib/journey";
import { Loader2, Eye, EyeOff, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AuthLayout } from "../components/AuthLayout";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { next, context } = authIntent(search);

  const passOk = form.password.length >= 6;
  const matchOk = form.confirm.length > 0 && form.password === form.confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!passOk) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name: form.name, email: form.email, password: form.password });
      setUser(data);
      toast.success(`Welcome to SafeNet, ${data.name}!`);
      navigate(next === "/dashboard" && data.role === "admin" ? "/admin" : next, { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout testId="register-page" returnTo={next.startsWith("/ai") ? next : "/"}>
      <p className="auth-form-kicker">YOUR SAFETY WORKSPACE</p>
      <h1 className="font-heading text-[1.75rem] font-bold tracking-tighter">Make safety a habit.</h1>
      <p className="text-sm text-muted-foreground mt-2">Create a free account for your private safety plan, activity and learning progress.</p>
      {next !== "/dashboard" && <p className="text-sm text-primary mt-3">{context.replace("Sign in", "Create an account").replace("signing in", "creating an account")}</p>}

      <div className="mt-8">
        <GoogleSignInButton text="signup_with" />
      </div>

      <div className="flex items-center gap-4 my-7">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-5" data-testid="register-form">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700" data-testid="register-error">{error}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="reg-name">Full name</Label>
          <Input id="reg-name" required minLength={2} autoComplete="name" className="h-12 rounded-lg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" data-testid="register-name-input" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-email">Email address</Label>
          <Input id="reg-email" required type="email" autoComplete="email" className="h-12 rounded-lg" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="register-email-input" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <div className="relative">
            <Input id="reg-password" required type={showPass ? "text" : "password"} autoComplete="new-password" className="h-12 rounded-lg pr-11" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" data-testid="register-password-input" />
            <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPass ? "Hide password" : "Show password"} data-testid="register-toggle-password">
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {form.password.length > 0 && (
            <p className={`text-xs flex items-center gap-1.5 ${passOk ? "text-emerald-700" : "text-muted-foreground"}`}>
              {passOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} At least 6 characters
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-confirm">Confirm password</Label>
          <Input id="reg-confirm" required type={showPass ? "text" : "password"} autoComplete="new-password" className="h-12 rounded-lg" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat password" data-testid="register-confirm-input" />
          {form.confirm.length > 0 && (
            <p className={`text-xs flex items-center gap-1.5 ${matchOk ? "text-emerald-700" : "text-red-700"}`}>
              {matchOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} {matchOk ? "Passwords match" : "Passwords do not match"}
            </p>
          )}
        </div>
        <Button type="submit" disabled={loading} className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-[0.9rem] font-medium" data-testid="register-submit-button">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Create account <ArrowRight className="w-4 h-4 ml-2" /></>)}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center mt-5 leading-relaxed">
        By creating an account you agree to use SafeNet responsibly and keep your credentials private.
      </p>

      <p className="text-sm text-center text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link to={authLink("login", next)} className="text-primary font-medium hover:underline" data-testid="register-login-link">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
