import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AuthLayout } from "../components/AuthLayout";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setUser(data);
      toast.success(`Welcome back, ${data.name}!`);
      navigate(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout testId="login-page">
      <div className="lg:hidden flex justify-center mb-8">
        <Shield className="w-10 h-10 text-sky-500" strokeWidth={1.4} />
      </div>
      <h1 className="font-heading text-[1.75rem] font-bold tracking-tighter">Welcome back</h1>
      <p className="text-sm text-muted-foreground mt-2">Log in to continue to SafeNet.</p>

      <div className="mt-8">
        <GoogleSignInButton text="signin_with" />
      </div>

      <div className="flex items-center gap-4 my-7">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-5" data-testid="login-form">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500" data-testid="login-error">{error}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="login-email">Email address</Label>
          <Input id="login-email" required type="email" autoComplete="email" className="h-12 rounded-lg" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="login-email-input" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Input id="login-password" required type={showPass ? "text" : "password"} autoComplete="current-password" className="h-12 rounded-lg pr-11" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" data-testid="login-password-input" />
            <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPass ? "Hide password" : "Show password"} data-testid="login-toggle-password">
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full rounded-full bg-sky-500 hover:bg-sky-600 text-white h-12 text-[0.9rem] font-medium" data-testid="login-submit-button">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Log in <ArrowRight className="w-4 h-4 ml-2" /></>)}
        </Button>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-8">
        New to SafeNet?{" "}
        <Link to="/register" className="text-sky-500 font-medium hover:underline" data-testid="login-register-link">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
