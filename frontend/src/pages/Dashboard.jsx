import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Unlock, Check, Zap, Target, Award, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Pill } from "../components/ui";

const DIFF_COLOR = { Easy: "#39FF7A", Medium: "#FFD23D", Hard: "#FF6B3D", Insane: "#E8283F", Impossible: "#B026FF" };

function StatBlock({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-panel2/60 backdrop-blur-md border border-white/5 rounded-2xl px-6 py-6 flex-1 min-w-[160px] shadow-glass relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 blur-[30px] group-hover:opacity-40 transition-opacity duration-500" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2 mb-3 relative z-10" style={{ color }}>
        <Icon size={16} /><span className="font-mono text-[11px] uppercase tracking-widest text-ash">{label}</span>
      </div>
      <div className="font-mono text-3xl font-bold relative z-10">{value}</div>
    </div>
  );
}

function LabCard({ lab, locked, onOpen }) {
  const diffColor = DIFF_COLOR[lab.difficulty];
  return (
    <button onClick={() => !locked && onOpen(lab)} disabled={locked}
      className={`text-left border rounded-2xl p-6 w-full transition-all duration-500 relative overflow-hidden group shadow-glass
        ${lab.solved ? "bg-panel2/80 border-term/40 shadow-[0_0_15px_rgba(57,255,122,0.15)] backdrop-blur-xl" : "bg-panel2/60 border-white/5 backdrop-blur-xl"} 
        ${locked ? "opacity-50 cursor-not-allowed grayscale" : "hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] hover:border-white/10"}`}>
      
      {!locked && !lab.solved && (
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-0 group-hover:opacity-15 transition-opacity duration-700" style={{ backgroundColor: diffColor }} />
      )}
      
      {lab.solved && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-term rounded-full blur-[60px] opacity-10" />
      )}

      {/* Left colored border accent */}
      <div className="absolute top-0 left-0 w-1 h-full opacity-60 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: lab.solved ? '#39FF7A' : diffColor }} />
      
      <div className="flex justify-between items-center mb-4 relative z-10">
        <Pill color={diffColor}>{lab.difficulty}</Pill>
        {locked ? <Lock size={15} className="text-[#5A5F68]" /> : lab.solved ? <Check size={16} className="text-term drop-shadow-[0_0_5px_#39FF7A]" /> : <Unlock size={15} className="text-ash/50 group-hover:text-bone/50 transition-colors" />}
      </div>
      <div className="font-mono text-[17px] mb-2 font-bold leading-tight break-words text-bone group-hover:text-white transition-colors relative z-10">{lab.name}</div>
      <div className="font-body text-[13px] text-ash leading-relaxed mb-5 line-clamp-3 relative z-10">{lab.summary}</div>
      
      <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5 relative z-10">
        <span className="font-mono text-sm font-bold text-blood drop-shadow-[0_0_3px_rgba(232,40,63,0.3)]">{lab.points} <span className="text-[10px] text-blood/70">pts</span></span>
        <span className="font-mono text-[10px] text-[#5A5F68] uppercase tracking-widest">{lab.mode === "chat" ? "live chat" : "written · graded"}</span>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState(null);
  const [error, setError] = useState(null);
  const [rank, setRank] = useState("—");

  useEffect(() => {
    api.tiers(token).then(d => setTiers(d.tiers)).catch(e => setError(e.message));
    api.leaderboard(token).then(d => {
      const idx = d.leaderboard.findIndex(r => r.handle === user?.handle);
      if (idx !== -1) setRank(`#${idx + 1}`);
    }).catch(console.error);
  }, [token, user?.handle]);

  const solvedCount = tiers ? tiers.flatMap(t => t.labs).filter(l => l.solved).length : 0;
  const totalLabs = tiers ? tiers.flatMap(t => t.labs).length : 30;

  if (error) {
    return (
      <div className="max-w-[1180px] mx-auto flex items-start gap-3 bg-blood/10 border border-blood/40 rounded-lg p-5 mt-6">
        <AlertTriangle className="text-blood shrink-0 mt-0.5" size={18} />
        <div>
          <div className="font-mono text-sm text-blood mb-1">Couldn't load the battle ground</div>
          <div className="font-body text-[13px] text-ash">{error}</div>
        </div>
      </div>
    );
  }

  if (!tiers) {
    return <div className="flex items-center gap-3 text-ash font-mono text-sm py-32 justify-center"><Loader2 size={18} className="spin text-blood" /> INITIALIZING BATTLE GROUND…</div>;
  }

  return (
    <div className="relative min-h-[calc(100vh-60px)] bg-void overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed top-20 left-0 w-[500px] h-[500px] bg-agentic/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-blood/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-6 py-8 relative z-10">
        <div className="flex gap-4 mb-10 flex-wrap">
          <StatBlock label="Points" value={user?.points ?? 0} icon={Zap} color="#E8283F" />
          <StatBlock label="Labs solved" value={`${solvedCount}/${totalLabs}`} icon={Target} color="#39FF7A" />
          <StatBlock label="Rank" value={rank} icon={TrendingUp} color="#3DAFFF" />
          <StatBlock label="Tiers" value={tiers.length} icon={Award} color="#FFD23D" />
        </div>

        <div className="flex flex-col gap-12">
          {tiers.map(tier => (
            <div key={tier.id}>
              <div className="flex items-center gap-4 mb-5">
                <span className="font-mono text-[14px] font-bold" style={{ color: tier.color, textShadow: `0 0 10px ${tier.color}66` }}>{String(tier.index).padStart(2, "0")}</span>
                <h2 className="font-mono text-2xl font-bold">{tier.name}</h2>
                <span className="font-body text-sm text-ash/70 hidden sm:inline-block">{tier.tagline}</span>
                {!tier.unlocked && <Pill color="#5A5F68">Locked</Pill>}
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {tier.labs.map(lab => (
                  <LabCard key={lab.id} lab={lab} locked={!tier.unlocked} onOpen={(l) => navigate(`/lab/${l.id}`)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
