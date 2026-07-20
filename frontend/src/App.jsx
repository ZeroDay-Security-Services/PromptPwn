import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import NavBar from "./components/NavBar";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import LabPage from "./pages/LabPage";
import Leaderboard from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";

function ProtectedShell({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <div className="flex items-center gap-2 text-ash font-mono text-sm">
          <Loader2 size={16} className="spin" /> checking session…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-void font-body">
      <NavBar />
      <div className="px-7 py-8 pb-20">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/ground" element={<ProtectedShell><Dashboard /></ProtectedShell>} />
        <Route path="/lab/:labId" element={<ProtectedShell><LabPage /></ProtectedShell>} />
        <Route path="/board" element={<ProtectedShell><Leaderboard /></ProtectedShell>} />
        <Route path="/achievements" element={<ProtectedShell><Achievements /></ProtectedShell>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
