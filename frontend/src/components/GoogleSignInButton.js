import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

// Loads the Google Identity Services script once, shared across mounts.
let gsiPromise = null;
function loadGsi() {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { gsiPromise = null; reject(new Error("Failed to load Google Sign-In")); };
    document.head.appendChild(s);
  });
  return gsiPromise;
}

export function GoogleSignInButton({ text = "continue_with" }) {
  const btnRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !btnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            try {
              const { data } = await api.post("/auth/google", { credential });
              setUser(data);
              toast.success(`Welcome, ${data.name}!`);
              navigate(data.role === "admin" ? "/admin" : "/");
            } catch (err) {
              toast.error(formatApiErrorDetail(err.response?.data?.detail));
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "pill",
          logo_alignment: "left",
          width: 368,
        });
      })
      .catch(() => setFailed(true));
    return () => { cancelled = true; };
  }, [navigate, setUser, text]);

  if (!GOOGLE_CLIENT_ID || failed) {
    return (
      <button
        type="button"
        onClick={() => toast.info(failed ? "Google Sign-In could not load. Check your connection." : "Google Sign-In isn't set up on this server yet — please use email below.")}
        className="w-full h-11 rounded-full border bg-background text-sm font-medium flex items-center justify-center gap-2.5 hover:bg-secondary/60 transition-colors duration-200"
        data-testid="google-signin-unavailable"
      >
        <GoogleLogo /> Continue with Google
      </button>
    );
  }

  return <div ref={btnRef} className="flex justify-center [color-scheme:light]" data-testid="google-signin-button" />;
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
