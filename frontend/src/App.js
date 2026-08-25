import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import Home from "./pages/Home";
import About from "./pages/About";
import ScamTypes from "./pages/ScamTypes";
import ScamDetail from "./pages/ScamDetail";
import SafetyTips from "./pages/SafetyTips";
import AIChat from "./pages/AIChat";
import Quiz from "./pages/Quiz";
import ReportScam from "./pages/ReportScam";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// The auth pages use their own full-height split layout and already carry a
// copyright line, so the site footer is duplicate chrome there.
const NO_FOOTER_ROUTES = ["/login", "/register"];
// Login renders its own standalone shell (see AuthLayout `standalone`).
const NO_NAVBAR_ROUTES = ["/login"];

function SiteFooter() {
  const { pathname } = useLocation();
  if (NO_FOOTER_ROUTES.includes(pathname)) return null;
  return <Footer />;
}

function SiteNavbar() {
  const { pathname } = useLocation();
  if (NO_NAVBAR_ROUTES.includes(pathname)) return null;
  return <Navbar />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col grain-overlay bg-background text-foreground">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <SiteNavbar />
            <main id="main-content" tabIndex={-1} className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
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
              </Routes>
            </main>
            <SiteFooter />
          </div>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
