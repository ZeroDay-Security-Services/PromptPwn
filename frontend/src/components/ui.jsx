import React, { useState } from "react";

export function GlowButton({ children, onClick, variant = "primary", disabled, className = "", icon: Icon, type = "button" }) {
  const [hover, setHover] = useState(false);
  const variants = {
    primary: "bg-blood text-bone border border-blood hover:bg-blood/90",
    default: "bg-panel2 border border-white/10 text-bone hover:bg-panel",
    ghost: "bg-transparent text-ash border border-transparent hover:text-bone hover:bg-white/5",
    term: "bg-term/10 text-term border border-term/30 hover:bg-term/20 hover:border-term/50",
  };
  const glow = {
    primary: "shadow-[0_4px_20px_rgba(232,40,63,0.45)]",
    default: "shadow-[0_4px_15px_rgba(255,255,255,0.05)]",
    ghost: "",
    term: "shadow-[0_4px_20px_rgba(57,255,122,0.25)]",
  };
  
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      className={`font-mono text-[12px] font-bold tracking-widest uppercase px-6 py-3 rounded-xl inline-flex items-center justify-center gap-2.5 transition-all
        ${variants[variant]} ${disabled ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer"} ${hover && !disabled ? `-translate-y-px ${glow[variant]}` : ""} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function Pill({ children, color = "#8A8F98", filled }) {
  return (
    <span
      className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-bold transition-all hover:scale-105"
      style={{ border: `1px solid ${filled ? color : color + '40'}`, color: filled ? "#0A0B0D" : color, background: filled ? color : color + '10' }}
    >
      {children}
    </span>
  );
}
