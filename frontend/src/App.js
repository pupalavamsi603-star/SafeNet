import "@/App.css";
import "@/experience.css";
import "@/redesign.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import { SplashGate } from "./components/SplashGate";
import Home from "./pages/Home";
import { FloatingSafeNetAI } from "./components/FloatingSafeNetAI";
import { WorkspaceLayout } from "./components/WorkspaceLayout";

const PhoneQR = lazy(() => import("./pages/PhoneQR"));
const About = lazy(() => import("./pages/About"));
const ScamTypes = lazy(() => import("./pages/ScamTypes"));
const ScamDetail = lazy(() => import("./pages/ScamDetail"));
const SafetyTips = lazy(() => import("./pages/SafetyTips"));
const AIChat = lazy(() => import("./pages/AIChat"));
const Quiz = lazy(() => import("./pages/Quiz"));
const ReportScam = lazy(() => import("./pages/ReportScam"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

// The auth pages use their own full-height split layout and already carry a
// copyright line, so the site footer is duplicate chrome there.
const NO_FOOTER_ROUTES = ["/login", "/register"];
// Account pages share their own full-height shell.
const NO_NAVBAR_ROUTES = ["/login", "/register"];

function SiteFooter() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/qr/phone/") || NO_FOOTER_ROUTES.includes(pathname)) return null;
  return <Footer />;
}

function SiteNavbar() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/qr/phone/") || NO_NAVBAR_ROUTES.includes(pathname)) return null;
  return <Navbar />;
}

function App() {
  return (
      <SplashGate>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-background text-foreground">
              <a href="#main-content" className="skip-link">Skip to main content</a>
              <SiteNavbar />
              <main id="main-content" tabIndex={-1} className="flex-1">
                <WorkspaceLayout><Suspense fallback={<div className="route-loading" role="status">Loading page…</div>}><Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/qr/phone/:id" element={<PhoneQR />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/scams" element={<ScamTypes />} />
                  <Route path="/scams/:slug" element={<ScamDetail />} />
                  <Route path="/tips" element={<SafetyTips />} />
                  <Route path="/ai" element={<AIChat />} />
                  <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
                  <Route path="/report" element={<ReportScam />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes></Suspense></WorkspaceLayout>
              </main>
              <SiteFooter />
            </div>
            <FloatingSafeNetAI />
            <Toaster theme="light" position="top-right" richColors />
          </BrowserRouter>
        </AuthProvider>
      </SplashGate>
  );
}

export default App;
