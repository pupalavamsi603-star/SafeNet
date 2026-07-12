import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      navigate(data.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-10 h-10 text-sky-500 mx-auto" strokeWidth={1.4} />
          <h1 className="font-heading text-2xl font-bold tracking-tighter mt-4">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Log in to your SafeNet account</p>
        </div>
        <form onSubmit={submit} className="glass-panel rounded-xl p-8 space-y-5" data-testid="login-form">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500" data-testid="login-error">{error}</div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="login-email-input" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" data-testid="login-password-input" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full bg-sky-500 hover:bg-sky-600 text-white h-11" data-testid="login-submit-button">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><LogIn className="w-4 h-4 mr-2" /> Login</>)}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            New to SafeNet? <Link to="/register" className="text-sky-500 hover:underline" data-testid="login-register-link">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
