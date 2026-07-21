import React, { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Trophy } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const RANK_COLORS = {
  1: { text: "text-[#FFD700]", bg: "bg-[#FFD700]/10", border: "border-[#FFD700]/50", shadow: "shadow-[0_0_15px_rgba(255,215,0,0.3)]" },
  2: { text: "text-[#C0C0C0]", bg: "bg-[#C0C0C0]/10", border: "border-[#C0C0C0]/50", shadow: "shadow-[0_0_15px_rgba(192,192,192,0.3)]" },
  3: { text: "text-[#CD7F32]", bg: "bg-[#CD7F32]/10", border: "border-[#CD7F32]/50", shadow: "shadow-[0_0_15px_rgba(205,127,50,0.3)]" }
};

export default function Leaderboard() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.leaderboard(token).then(d => setRows(d.leaderboard)).catch(e => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="max-w-[800px] mx-auto flex items-start gap-3 bg-blood/10 border border-blood/40 rounded-lg p-5 mt-8">
        <AlertTriangle className="text-blood shrink-0 mt-0.5" size={18} />
        <div>
          <div className="font-mono text-sm text-blood mb-1">Couldn't load the scoreboard</div>
          <div className="font-body text-[13px] text-ash">{error}</div>
        </div>
      </div>
    );
  }
  
  if (!rows) return <div className="flex items-center gap-3 text-ash font-mono text-sm py-32 justify-center"><Loader2 size={18} className="spin text-blood" /> FETCHING LIVE RANKS…</div>;

  return (
    <div className="relative min-h-[calc(100vh-60px)] bg-void overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed top-[-10%] right-[10%] w-[500px] h-[500px] bg-boss/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-amber/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[800px] mx-auto px-6 py-12 relative z-10">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="w-16 h-16 rounded-full bg-panel2 border border-white/10 flex items-center justify-center mb-6 shadow-glass">
            <Trophy size={32} className="text-amber drop-shadow-[0_0_10px_rgba(255,210,61,0.5)]" />
          </div>
          <h1 className="font-mono text-4xl mb-3 font-bold">Global Scoreboard</h1>
          <p className="font-body text-[14px] text-ash max-w-[400px]">Top operators on the battle ground, ranked by points. Every solve is live-graded.</p>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const self = r.handle === user?.handle;
            const rank = i + 1;
            const style = RANK_COLORS[rank] || { text: "text-[#5A5F68]", bg: "bg-panel2/60 backdrop-blur-md", border: "border-white/10", shadow: "" };
            
            return (
              <div key={r.handle} className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-glass group relative overflow-hidden ${self ? "bg-blood/10 border-blood/50 shadow-glow-blood" : `${style.bg} ${style.border} ${style.shadow}`}`}>
                {self && <div className="absolute top-0 left-0 w-1 h-full bg-blood" />}
                <span className={`font-mono text-base sm:text-lg font-bold w-6 sm:w-10 text-center shrink-0 ${style.text}`}>#{rank}</span>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
                  <span className="font-mono text-sm sm:text-base font-semibold group-hover:text-bone transition-colors text-bone truncate">
                    {r.handle}
                  </span>
                  {self && <span className="text-blood text-[10px] sm:text-xs uppercase tracking-wider shrink-0">(you)</span>}
                </div>
                <span className="font-body text-xs sm:text-sm text-[#8A8F98] bg-void/50 px-2 sm:px-3 py-1 rounded-full border border-white/5 whitespace-nowrap shrink-0">{r.solved} <span className="hidden sm:inline">solved</span></span>
                <span className="font-mono text-base sm:text-lg font-bold text-blood min-w-[50px] sm:min-w-[80px] text-right drop-shadow-[0_0_5px_rgba(232,40,63,0.3)] shrink-0">{r.points} <span className="text-[10px] sm:text-xs text-blood/60">pts</span></span>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="font-body text-sm text-ash bg-panel2/40 backdrop-blur-md border border-white/5 rounded-2xl p-10 text-center">
              The battle ground is quiet. Be the first to secure a solve.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
