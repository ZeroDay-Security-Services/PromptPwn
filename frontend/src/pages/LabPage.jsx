import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Send, RotateCcw, ShieldCheck, AlertTriangle, Loader2, Lock, Unlock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { api } from "../api/client";
import { GlowButton, Pill } from "../components/ui";

const DIFF_COLOR = { Easy: "#39FF7A", Medium: "#FFD23D", Hard: "#FF6B3D", Insane: "#E8283F", Impossible: "#B026FF" };

function HintsPanel({ lab, token, userPoints, onHintBought }) {
  const [busyIdx, setBusyIdx] = useState(null);
  const [err, setErr] = useState(null);
  const ownedCount = lab.hints.filter(h => h.owned).length;

  const buy = async (idx) => {
    setBusyIdx(idx); setErr(null);
    try {
      const res = await api.buyHint(token, lab.id, idx);
      onHintBought(idx, res.text, res.pointsRemaining);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyIdx(null);
    }
  };

  return (
    <div className="bg-[#0D0E11] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group transition-all duration-300 hover:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-[11px] text-ash uppercase tracking-widest">Hints ({ownedCount}/{lab.hints.length})</h3>
        <div className="flex gap-1.5 opacity-40">
          <div className="w-2 h-2 rounded-full bg-blood"></div>
          <div className="w-2 h-2 rounded-full bg-amber"></div>
          <div className="w-2 h-2 rounded-full bg-[#39FF7A]"></div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {lab.hints.map((h) => (
          <div key={h.idx} className={`border rounded-xl px-4 py-3.5 transition-all ${h.owned ? "bg-panel border-white/10" : "bg-[#0A0B0D] border-white/5"}`}>
            {h.owned ? (
              <div className="flex items-start gap-3">
                <Unlock size={14} className="text-amber shrink-0 mt-0.5" />
                <p className="m-0 font-body text-[13px] text-bone leading-relaxed">{h.text}</p>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-[#5A5F68]" />
                  <span className="font-body text-[12.5px] text-[#5A5F68]">Hint #{h.idx + 1} locked</span>
                </div>
                <button
                  disabled={busyIdx !== null || userPoints < h.cost || h.idx !== ownedCount}
                  onClick={() => buy(h.idx)}
                  className="font-mono text-[11px] border border-amber/30 text-amber bg-amber/10 hover:bg-amber/20 hover:border-amber/50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {busyIdx === h.idx ? "…" : `−${h.cost} pts`}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {err && <div className="mt-3 text-blood text-[12px] font-body flex items-center gap-1.5 bg-blood/10 p-2 rounded-lg"><AlertTriangle size={14} />{err}</div>}
    </div>
  );
}

export default function LabPage() {
  const { labId } = useParams();
  const { token, user, addPoints, bumpSolved } = useAuth();
  const fireToast = useToast();
  const navigate = useNavigate();

  const [lab, setLab] = useState(null);
  const [tierColor, setTierColor] = useState("#8A8F98");
  const [loadError, setLoadError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const bottomRef = useRef(null);
  const [allLabIds, setAllLabIds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const loadLab = useCallback(async () => {
    try {
      const { tiers } = await api.tiers(token);
      let found = null, color = "#8A8F98";
      for (const t of tiers) {
        const l = t.labs.find(x => x.id === labId);
        if (l) { found = l; color = t.color; break; }
      }
      if (!found) { setLoadError("Lab not found."); return; }
      setLab(found);
      setTierColor(color);

      // Build flat ordered list of all lab IDs for prev/next navigation
      const flatIds = tiers.flatMap(t => t.labs.map(l => l.id));
      setAllLabIds(flatIds);
      setCurrentIndex(flatIds.indexOf(labId));

      if (found.mode === "chat") {
        const s = await api.session(token, labId);
        setMessages(s.messages || []);
      }
    } catch (e) {
      setLoadError(e.message);
    }
  }, [token, labId]);

  useEffect(() => { loadLab(); }, [loadLab]);

  // Reset transient state when navigating between labs
  useEffect(() => {
    setMessages([]);
    setInput("");
    setAnswer("");
    setVerdict(null);
    setApiError(null);
    setSending(false);
    setChecking(false);
    setConfirmRestart(false);
  }, [labId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const handleHintBought = (idx, text, pointsRemaining) => {
    setLab(l => ({ ...l, hints: l.hints.map(h => h.idx === idx ? { ...h, owned: true, text } : h) }));
    addPoints(pointsRemaining - user.points);
  };

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setApiError(null);
    setInput("");
    setSending(true);
    setMessages(m => [...m, { role: "user", content }]);
    try {
      const res = await api.sendMessage(token, labId, content);
      if (res.blocked) {
        setMessages(m => [...m, { role: "blocked", content: `Blocked by keyword filter: message contains "${res.bannedWord}". It never reached the target.` }]);
      } else {
        setMessages(m => [...m, { role: "assistant", content: res.reply }]);
      }
    } catch (e) {
      setApiError(e.message);
    } finally {
      setSending(false);
    }
  };

  const checkVerdict = async () => {
    if (checking) return;
    setChecking(true); setApiError(null);
    try {
      const res = await api.verify(token, labId, lab.mode === "written" ? answer.trim() : undefined);
      if (res.success) {
        setVerdict({ success: true, reason: res.alreadySolved ? "Already solved." : res.reason });
        if (!res.alreadySolved) {
          addPoints(res.pointsAwarded);
          bumpSolved();
          setLab(l => ({ ...l, solved: true }));
          if (res.newAchievements?.length) {
            fireToast({ ok: true, title: "Achievement unlocked!", sub: `${res.newAchievements.length} new achievement(s) — check the Achievements tab` });
          } else {
            fireToast({ ok: true, title: `${lab.name} solved`, sub: `+${res.pointsAwarded} points` });
          }
        }
      } else {
        setVerdict({ success: false, reason: res.reason });
      }
    } catch (e) {
      setApiError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const restartLab = async () => {
    if (!confirmRestart) {
      setConfirmRestart(true);
      setTimeout(() => setConfirmRestart(false), 3000);
      return;
    }
    setConfirmRestart(false);
    setResetting(true);
    try {
      if (lab.mode === "chat") {
        await api.resetSession(token, labId);
        setMessages([]);
      }
      setAnswer("");
      setVerdict(null);
      setApiError(null);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setResetting(false);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-[880px] mx-auto flex items-start gap-3 bg-blood/10 border border-blood/40 rounded-lg p-5 mt-8">
        <AlertTriangle className="text-blood shrink-0 mt-0.5" size={18} />
        <div>
          <div className="font-mono text-sm text-blood mb-1">Error Loading Lab</div>
          <div className="font-body text-[13px] text-ash">{loadError}</div>
        </div>
      </div>
    );
  }
  if (!lab) return <div className="flex items-center gap-3 text-ash font-mono text-sm py-32 justify-center"><Loader2 size={18} className="spin text-blood" /> INITIALIZING LAB…</div>;

  return (
    <div className="min-h-[calc(100vh-60px)] bg-void flex flex-col">
      <div className={`flex-1 ${lab.mode === "chat" ? "w-full max-w-[1400px]" : "max-w-[840px]"} mx-auto px-6 py-6 w-full flex flex-col`}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/ground")} className="flex items-center gap-1.5 text-ash hover:text-bone font-mono text-xs transition-colors group">
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> back to battle ground
          </button>
          <div className="flex gap-2">
            <button
              disabled={currentIndex <= 0}
              onClick={() => currentIndex > 0 && navigate(`/lab/${allLabIds[currentIndex - 1]}`)}
              className="flex items-center gap-1 font-mono text-[11px] text-ash hover:text-bone border border-white/10 hover:border-white/20 bg-panel rounded-lg px-3 py-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              disabled={currentIndex < 0 || currentIndex >= allLabIds.length - 1}
              onClick={() => currentIndex < allLabIds.length - 1 && navigate(`/lab/${allLabIds[currentIndex + 1]}`)}
              className="flex items-center gap-1 font-mono text-[11px] text-ash hover:text-bone border border-white/10 hover:border-white/20 bg-panel rounded-lg px-3 py-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-start flex-wrap gap-4 mb-5">
          <div>
            <div className="flex gap-2.5 mb-3">
              <Pill color={tierColor}>{lab.mode === "chat" ? "Live Chat" : "Written · Graded"}</Pill>
              <Pill color={DIFF_COLOR[lab.difficulty]}>{lab.difficulty}</Pill>
              {lab.solved && <Pill color="#39FF7A" filled>Solved</Pill>}
            </div>
            <h1 className="font-mono text-4xl font-bold">{lab.name}</h1>
          </div>
          <div className="text-right bg-[#0D0E11] border border-white/5 rounded-2xl px-6 py-3 shadow-lg">
            <div className="font-mono text-3xl text-blood font-bold drop-shadow-[0_0_8px_rgba(232,40,63,0.4)]">{lab.points}</div>
            <div className="font-mono text-[10px] text-ash uppercase tracking-widest mt-1">points</div>
          </div>
        </div>

        <div className="bg-panel border border-white/5 rounded-2xl p-6 mb-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blood to-boss" />
          <p className="font-body text-[15px] text-bone leading-relaxed m-0">{lab.brief}</p>
          {lab.mode === "chat" && (
            <div className="font-mono text-[11.5px] text-ash border-t border-white/10 pt-4 mt-4 flex gap-2">
              <span className="font-bold text-bone tracking-wider uppercase shrink-0">WIN CONDITION ·</span> 
              <span className="text-term/90">{lab.winCondition}</span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-[2.5fr_1fr] gap-6 flex-1">
          {lab.mode === "chat" ? (
            <div className="bg-[#0D0E11] border border-white/5 rounded-2xl flex flex-col min-h-[400px] h-[600px] max-h-[calc(100vh-220px)] shadow-[0_15px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_30px_rgba(232,40,63,0.1)] hover:border-blood/30">
              <div className="bg-[#1A1B23] border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0 z-20 relative">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-blood/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber/80"></div>
                  <div className="w-3 h-3 rounded-full bg-[#39FF7A]/80"></div>
                </div>
                <h3 className="font-mono text-[10px] text-ash/70 uppercase tracking-widest">target_session.exe</h3>
                <div className="w-10"></div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 relative">
                {messages.length === 0 && (
                  <div className="font-body text-[14px] text-ash text-center mt-10 italic">
                    Connection established. Say hello to begin.
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`max-w-[80%] px-5 py-3.5 font-body text-[14.5px] leading-relaxed whitespace-pre-wrap shadow-[0_5px_20px_rgba(0,0,0,0.2)]
                      ${m.role === "user" ? "self-end bg-[#1A1112] border border-blood/30 rounded-2xl rounded-tr-sm text-bone" : 
                        m.role === "blocked" ? "self-start bg-[#1A1810] border border-amber/30 text-amber/90 rounded-2xl rounded-tl-sm" : 
                        "self-start bg-panel border border-white/5 rounded-2xl rounded-tl-sm text-bone/90"}`}>
                    <div className="font-mono text-[10px] uppercase mb-1.5 tracking-widest font-bold" 
                         style={{ color: m.role === "user" ? "#E8283F" : m.role === "blocked" ? "#FFD23D" : "#8A8F98" }}>
                      {m.role === "user" ? "You" : m.role === "blocked" ? "System Filter" : "Target"}
                    </div>
                    {m.content}
                  </div>
                ))}
                {sending && (
                  <div className="self-start flex items-center gap-2 text-ash font-body text-[13px] bg-panel px-4 py-2 rounded-full border border-white/5 shadow-md">
                    <Loader2 size={14} className="spin" /> Target is typing…
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              
              <div className="bg-panel border-t border-white/5 p-3 sm:p-5 flex gap-2 sm:gap-3 relative z-10">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }}
                  placeholder="Type your message to the target…"
                  className="flex-1 min-w-0 bg-void border border-white/10 rounded-xl px-3 sm:px-5 py-3.5 text-bone font-body text-[14px] outline-none focus:border-blood focus:ring-1 focus:ring-blood/50 shadow-inner transition-all placeholder:text-ash/50" />
                <GlowButton onClick={send} disabled={sending || !input.trim()} icon={Send} className="px-4 sm:px-7 shrink-0">Send</GlowButton>
              </div>
            </div>
          ) : (
            <div className="bg-[#0D0E11] border border-white/5 rounded-2xl flex flex-col shadow-lg relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_30px_rgba(232,40,63,0.1)] hover:border-blood/30">
              <div className="bg-[#1A1B23] border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-blood/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber/80"></div>
                  <div className="w-3 h-3 rounded-full bg-[#39FF7A]/80"></div>
                </div>
                <h3 className="font-mono text-[10px] text-ash/70 uppercase tracking-widest">security_analysis.md</h3>
                <div className="w-10"></div>
              </div>
              <div className="p-6">
                <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={15} placeholder="// Name the techniques and propose your one-line system-prompt patch here..."
                  className="w-full bg-void border border-white/5 rounded-xl p-5 text-bone font-mono text-[13px] leading-relaxed outline-none focus:border-blood/50 focus:ring-1 focus:ring-blood/20 resize-y placeholder:text-ash/40 transition-all shadow-inner" 
                  spellCheck="false" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-5 h-fit">
            <div className="bg-[#0D0E11] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group transition-all duration-300 hover:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-[11px] text-ash uppercase tracking-widest">Verdict</h3>
                <div className="flex gap-1.5 opacity-40">
                  <div className="w-2 h-2 rounded-full bg-blood"></div>
                  <div className="w-2 h-2 rounded-full bg-amber"></div>
                  <div className="w-2 h-2 rounded-full bg-[#39FF7A]"></div>
                </div>
              </div>
              
              <GlowButton variant={lab.solved ? "default" : "term"} className="w-full justify-center h-12" icon={ShieldCheck}
                disabled={checking || lab.solved || (lab.mode === "chat" ? messages.filter(m => m.role === "assistant").length === 0 : !answer.trim())}
                onClick={checkVerdict}>
                {checking ? "Judging…" : lab.solved ? "Already solved" : lab.mode === "chat" ? "Check transcript" : "Submit for grading"}
              </GlowButton>
              
              {verdict && (
                <div className="mt-4 p-4 rounded-xl border animate-slide-in" 
                     style={{ background: verdict.success ? "rgba(57,255,122,0.08)" : "rgba(232,40,63,0.08)", borderColor: verdict.success ? "rgba(57,255,122,0.2)" : "rgba(232,40,63,0.2)" }}>
                  <div className="font-mono text-[11px] font-bold tracking-widest mb-1.5" 
                       style={{ color: verdict.success ? "#39FF7A" : "#E8283F" }}>
                    {verdict.success ? "MISSION SUCCESS" : "MISSION FAILED"}
                  </div>
                  <div className="font-body text-[13px] text-bone leading-relaxed">{verdict.reason}</div>
                </div>
              )}
              
              {apiError && (
                <div className="mt-4 flex gap-2 items-start p-3 rounded-xl bg-blood/10 border border-blood/30">
                  <AlertTriangle size={15} className="text-blood shrink-0 mt-0.5" />
                  <div className="font-body text-[13px] text-blood leading-relaxed">{apiError}</div>
                </div>
              )}
              
              {lab.mode === "chat" && verdict && (
                <button onClick={() => setVerdict(null)}
                  className="mt-4 w-full flex items-center justify-center gap-2 border border-white/5 hover:border-white/10 hover:bg-white/5 rounded-xl py-2.5 text-ash hover:text-bone font-mono text-[10px] tracking-wider uppercase transition-all">
                  <RotateCcw size={12} /> Clear Verdict
                </button>
              )}
            </div>
            
            <HintsPanel lab={lab} token={token} userPoints={user?.points ?? 0} onHintBought={handleHintBought} />

            <button onClick={restartLab} disabled={resetting} className={`w-full flex items-center justify-center gap-2 border font-mono text-[11px] tracking-widest uppercase rounded-2xl py-4 transition-all ${confirmRestart ? "border-blood bg-blood/40 text-bone shadow-[0_0_20px_rgba(232,40,63,0.4)]" : "border-blood/40 bg-blood/10 hover:bg-blood/20 text-blood shadow-[0_0_15px_rgba(232,40,63,0.1)] hover:shadow-[0_0_20px_rgba(232,40,63,0.2)]"}`}>
              <RotateCcw size={14} className={resetting ? "spin" : ""} /> {resetting ? "Resetting Transcript..." : confirmRestart ? "Click again to confirm wipe" : "Restart Lab"}
            </button>
          </div>
        </div>

        {/* Bottom Prev / Next navigation */}
        <div className="flex justify-between items-center mt-6 pb-4">
          <button
            disabled={currentIndex <= 0}
            onClick={() => currentIndex > 0 && navigate(`/lab/${allLabIds[currentIndex - 1]}`)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-ash hover:text-bone border border-white/10 hover:border-white/20 bg-panel rounded-xl px-5 py-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} /> Previous Lab
          </button>
          <span className="font-mono text-[10px] text-ash/60 tracking-wider">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${allLabIds.length}` : ""}
          </span>
          <button
            disabled={currentIndex < 0 || currentIndex >= allLabIds.length - 1}
            onClick={() => currentIndex < allLabIds.length - 1 && navigate(`/lab/${allLabIds[currentIndex + 1]}`)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-ash hover:text-bone border border-white/10 hover:border-white/20 bg-panel rounded-xl px-5 py-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next Lab <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

