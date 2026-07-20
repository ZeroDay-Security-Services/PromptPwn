import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Trophy, ShieldAlert } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const fireToast = useCallback((t) => {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3400);
  }, []);

  return (
    <ToastContext.Provider value={fireToast}>
      {children}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 bg-panel2/80 backdrop-blur-xl border rounded-2xl px-5 py-4 flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.5)] animate-slide-in"
          style={{ borderColor: toast.ok ? "rgba(57,255,122,0.3)" : "rgba(232,40,63,0.3)", boxShadow: toast.ok ? "0 0 20px rgba(57,255,122,0.1)" : "0 0 20px rgba(232,40,63,0.1)" }}>
          
          <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: toast.ok ? "rgba(57,255,122,0.1)" : "rgba(232,40,63,0.1)" }}>
            {toast.ok ? <Trophy size={18} className="text-term drop-shadow-[0_0_5px_#39FF7A]" /> : <ShieldAlert size={18} className="text-blood drop-shadow-[0_0_5px_#E8283F]" />}
          </div>
          
          <div>
            <div className="font-mono text-[13px] font-bold text-bone mb-0.5 tracking-wide">{toast.title}</div>
            {toast.sub && <div className="font-body text-[12px] text-ash/90">{toast.sub}</div>}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
