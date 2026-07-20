import React, { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Flame, ShieldCheck, Eye, GitBranch, Skull, Radio, Trophy, Star, Bot, Award } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const ICONS = {
  first_blood: Flame, no_hints: ShieldCheck, recon_done: Eye, injection_done: GitBranch,
  jailbreak_done: Skull, exfil_done: Radio, agentic_done: Bot, boss_down: Trophy,
  five_hundred: Star, clean_sweep: Trophy,
};

export default function Achievements() {
  const { token } = useAuth();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.achievements(token).then(d => setList(d.achievements)).catch(e => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="max-w-[800px] mx-auto flex items-start gap-3 bg-blood/10 border border-blood/40 rounded-lg p-5 mt-8">
        <AlertTriangle className="text-blood shrink-0 mt-0.5" size={18} />
        <div>
          <div className="font-mono text-sm text-blood mb-1">Couldn't load achievements</div>
          <div className="font-body text-[13px] text-ash">{error}</div>
        </div>
      </div>
    );
  }
  
  if (!list) return <div className="flex items-center gap-3 text-ash font-mono text-sm py-32 justify-center"><Loader2 size={18} className="spin text-blood" /> FETCHING PROGRESS…</div>;

  const unlockedCount = list.filter(a => a.unlocked).length;
  const progress = Math.round((unlockedCount / list.length) * 100) || 0;

  return (
    <div className="relative min-h-[calc(100vh-60px)] bg-void overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed top-[-10%] right-[10%] w-[500px] h-[500px] bg-boss/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-blood/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1000px] mx-auto px-6 py-12 relative z-10">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="w-16 h-16 rounded-full bg-panel2 border border-white/10 flex items-center justify-center mb-6 shadow-glass">
            <Award size={32} className="text-agentic drop-shadow-[0_0_10px_rgba(61,175,255,0.5)]" />
          </div>
          <h1 className="font-mono text-4xl mb-3 font-bold">Achievements</h1>
          <p className="font-body text-[14px] text-ash max-w-[400px]">Unlock unique milestones as you progress through the battle ground.</p>
          
          <div className="mt-8 flex items-center gap-4 w-full max-w-[400px]">
            <div className="flex-1 h-2 bg-panel2 border border-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-agentic to-boss transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <div className="font-mono text-sm font-bold text-bone">{unlockedCount} / {list.length}</div>
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {list.map(a => {
            const Icon = ICONS[a.id] || Star;
            return (
              <div key={a.id} className={`rounded-2xl p-6 border transition-all duration-300 relative overflow-hidden group ${a.unlocked ? "bg-panel2/80 backdrop-blur-md border-blood/40 shadow-glow-blood hover:-translate-y-1" : "bg-panel2/40 backdrop-blur-md border-white/5 opacity-60 grayscale hover:opacity-80"}`}>
                
                {a.unlocked && (
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-blood/10 rounded-full blur-[30px] group-hover:bg-blood/20 transition-colors" />
                )}
                
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${a.unlocked ? "bg-blood/20 border border-blood/30" : "bg-panel border border-white/10"}`}>
                  <Icon size={22} className={a.unlocked ? "text-blood drop-shadow-[0_0_5px_rgba(232,40,63,0.5)]" : "text-[#5A5F68]"} />
                </div>
                
                <div className="font-mono text-base font-bold mb-1.5 text-bone">{a.name}</div>
                <div className="font-body text-[13px] text-ash leading-relaxed">{a.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

