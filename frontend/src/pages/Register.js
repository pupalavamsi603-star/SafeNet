import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name: form.name, email: form.email, password: form.password });
      setUser(data);
      toast.success(`Welcome to SafeNet, ${data.name}!`);
      navigate("/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-10 h-10 text-sky-500 mx-auto" strokeWidth={1.4} />
          <h1 className="font-heading text-2xl font-bold tracking-tighter mt-4">Join SafeNet</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Create your free account</p>
        </div>
        <form onSubmit={submit} className="glass-panel rounded-xl p-8 space-y-5" data-testid="register-form">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500" data-testid="register-error">{error}</div>
          )}
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" data-testid="register-name-input" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="register-email-input" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" data-testid="register-password-input" />
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <Input required type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat password" data-testid="register-confirm-input" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full bg-sky-500 hover:bg-sky-600 text-white h-11" data-testid="register-submit-button">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><UserPlus className="w-4 h-4 mr-2" /> Create Account</>)}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account? <Link to="/login" className="text-sky-500 hover:underline" data-testid="register-login-link">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
