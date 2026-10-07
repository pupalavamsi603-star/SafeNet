import { Navigate, useLocation } from "react-router-dom";
import { authLink } from "../lib/journey";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="auth-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Navigate to={authLink("login", location.pathname + location.search)} replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
};
