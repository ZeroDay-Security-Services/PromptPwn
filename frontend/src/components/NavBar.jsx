import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Skull, Target, Trophy, Award, Zap, User, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = [
    { to: "/ground", label: "Battle Ground", icon: Target },
    { to: "/board", label: "Scoreboard", icon: Trophy },
    { to: "/achievements", label: "Achievements", icon: Award },
  ];

  return (
    <div className="sticky top-0 z-50 bg-panel2/60 backdrop-blur-xl border-b border-white/5 px-4 md:px-7 py-3 flex items-center justify-between shadow-glass">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate("/ground")}>
          <Skull size={22} className="text-blood group-hover:drop-shadow-[0_0_8px_rgba(232,40,63,0.8)] transition-all" />
          <span className="font-mono text-[16px] tracking-wider font-bold hidden sm:block">PROMPT<span className="text-blood">PWN</span></span>
        </div>
        <div className="hidden md:flex gap-1">
          {items.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex items-center gap-2 font-mono text-[13px] px-3.5 py-2 rounded-lg tracking-wide transition-all ${isActive ? "bg-white/10 text-bone shadow-glass" : "text-ash hover:text-bone hover:bg-white/5"}`
              }
            >
              <it.icon size={15} /> {it.label}
            </NavLink>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-5">
        {/* Mobile Navigation Icons */}
        <div className="flex md:hidden gap-1 mr-2">
          {items.map(it => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `p-2 rounded-lg ${isActive ? "bg-white/10 text-bone" : "text-ash"}`}>
              <it.icon size={18} />
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[13px] text-blood bg-blood/10 px-3 py-1.5 rounded-full border border-blood/20 shadow-glow-blood">
          <Zap size={14} className="fill-blood/40" /> <span className="font-bold">{user?.points ?? 0}</span>
        </div>
        
        <div className="flex items-center gap-3 bg-panel border border-white/5 rounded-full px-1 py-1 pr-4 shadow-glass">
          <div className="w-8 h-8 rounded-full bg-panel2 border border-white/10 flex items-center justify-center shrink-0">
            <User size={15} className="text-ash" />
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="font-mono text-[13px] font-semibold text-bone leading-none mb-1">{user?.handle}</span>
            {user?.email && <span className="font-body text-[10px] text-ash/80 leading-none truncate max-w-[120px]">{user.email}</span>}
          </div>
        </div>

        <button onClick={logout} className="flex items-center gap-2 text-[#5A5F68] hover:text-blood bg-transparent hover:bg-blood/10 px-3 py-2 rounded-lg transition-all border border-transparent hover:border-blood/20 group">
          <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-mono text-[12px] uppercase tracking-wider font-semibold hidden md:block">Log Out</span>
        </button>
      </div>
    </div>
  );
}
