import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import ScamTypes from "./pages/ScamTypes";
import ScamDetail from "./pages/ScamDetail";
import SafetyTips from "./pages/SafetyTips";
import AIChat from "./pages/AIChat";
import Quiz from "./pages/Quiz";
import ReportScam from "./pages/ReportScam";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col grain-overlay bg-background text-foreground">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/scams" element={<ScamTypes />} />
                <Route path="/scams/:slug" element={<ScamDetail />} />
                <Route path="/tips" element={<SafetyTips />} />
                <Route path="/ai" element={<AIChat />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/report" element={<ReportScam />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
