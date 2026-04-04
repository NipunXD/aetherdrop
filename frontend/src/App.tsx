import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function formatExpiry(days: number, hours: number, mins: number) {
  const parts: string[] = [];
  if (days > 0)  parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0)  parts.push(`${mins}m`);
  return parts.join(" ") || "0m";
}

function expiryToHours(days: number, hours: number, mins: number) {
  return days * 24 + hours + mins / 60;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function buildRuntimeUrls() {
  const frontendBaseUrl = trimTrailingSlash(
    import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin
  );

  const apiBaseUrlFromEnv = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrlFromEnv) {
    return {
      frontendBaseUrl,
      apiBaseUrl: trimTrailingSlash(apiBaseUrlFromEnv),
    };
  }

  const { protocol, hostname, port } = window.location;
  const apiPort = port === "5173" ? "3001" : port;
  const apiBaseUrl = trimTrailingSlash(
    apiPort ? `${protocol}//${hostname}:${apiPort}` : window.location.origin
  );

  return { frontendBaseUrl, apiBaseUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// DrumRoller — iOS-style scroll picker
// ─────────────────────────────────────────────────────────────────────────────
const ITEM_H  = 40;
const VISIBLE = 5;

interface DrumProps {
  items: string[];
  value: number;       // currently selected index
  onChange: (i: number) => void;
  label?: string;
  accent?: string;
}

function DrumRoller({ items, value, onChange, label, accent = "#38bdf8" }: DrumProps) {
  const ref      = useRef<HTMLDivElement>(null);
  const isDrag   = useRef(false);
  const startY   = useRef(0);
  const startIdx = useRef(0);
  const lastY    = useRef(0);
  const lastT    = useRef(0);
  const vel      = useRef(0);
  const raf      = useRef<number | null>(null);

  const half  = Math.floor(VISIBLE / 2);
  const clamp = useCallback((n: number) => Math.max(0, Math.min(items.length - 1, Math.round(n))), [items.length]);

  // Keep scroll in sync with value prop
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = value * ITEM_H;
  }, [value]);

  const commit = (idx: number) => { const c = clamp(idx); onChange(c); if (ref.current) ref.current.scrollTop = c * ITEM_H; };

  const beginDrag = (y: number) => {
    isDrag.current = true; startY.current = y; lastY.current = y; lastT.current = Date.now();
    startIdx.current = value; vel.current = 0;
    if (raf.current) cancelAnimationFrame(raf.current);
  };
  const moveDrag = (y: number) => {
    if (!isDrag.current) return;
    const now = Date.now(); const dt = Math.max(now - lastT.current, 1);
    vel.current = (lastY.current - y) / dt; lastY.current = y; lastT.current = now;
    const delta = startY.current - y;
    commit(startIdx.current + delta / ITEM_H);
  };
  const endDrag = () => {
    if (!isDrag.current) return; isDrag.current = false;
    let v = vel.current; let idx = value;
    const decay = () => { v *= 0.82; idx = clamp(idx + v * 16); commit(idx); if (Math.abs(v) > 0.04) raf.current = requestAnimationFrame(decay); else commit(idx); };
    if (Math.abs(v) > 0.04) raf.current = requestAnimationFrame(decay); else commit(idx);
  };

  const onNativeScroll = () => {
    if (isDrag.current || !ref.current) return;
    const idx = clamp(ref.current.scrollTop / ITEM_H);
    if (idx !== value) onChange(idx);
  };

  return (
    <div className="flex flex-col items-center select-none" style={{ width: 72 }}>
      {label && (
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, opacity: 0.65, marginBottom: 4 }}>
          {label}
        </p>
      )}
      <div style={{ position: "relative", height: ITEM_H * VISIBLE }}>
        {/* Top fade */}
        <div style={{ position:"absolute", inset:"0 0 auto 0", height: ITEM_H * half, background:`linear-gradient(to bottom, #0d0d10, transparent)`, pointerEvents:"none", zIndex:2 }} />
        {/* Bottom fade */}
        <div style={{ position:"absolute", inset:"auto 0 0 0", height: ITEM_H * half, background:`linear-gradient(to top, #0d0d10, transparent)`, pointerEvents:"none", zIndex:2 }} />
        {/* Selection highlight */}
        <div style={{ position:"absolute", left:0, right:0, top: ITEM_H * half, height: ITEM_H, background:`${accent}16`, border:`1px solid ${accent}2e`, borderRadius:10, pointerEvents:"none", zIndex:3 }} />
        {/* Scroll drum */}
        <div
          ref={ref}
          onScroll={onNativeScroll}
          onMouseDown={(e) => beginDrag(e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => beginDrag(e.touches[0].clientY)}
          onTouchMove={(e) => { e.preventDefault(); moveDrag(e.touches[0].clientY); }}
          onTouchEnd={endDrag}
          style={{ height: ITEM_H * VISIBLE, overflowY:"scroll", scrollSnapType:"y mandatory", WebkitOverflowScrolling:"touch", cursor:"ns-resize", msOverflowStyle:"none", scrollbarWidth:"none" }}
        >
          <div style={{ height: ITEM_H * half }} />
          {items.map((item, i) => (
            <div key={i} onClick={() => commit(i)}
              style={{ height: ITEM_H, scrollSnapAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono',monospace",
                fontSize: i === value ? 21 : 14, fontWeight: i === value ? 700 : 400,
                color: i === value ? "#fff" : "#4b4b52", transition:"font-size 0.12s, color 0.12s", cursor:"pointer" }}>
              {item}
            </div>
          ))}
          <div style={{ height: ITEM_H * half }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pickers
// ─────────────────────────────────────────────────────────────────────────────
const DAYS_LIST  = Array.from({ length: 8  }, (_, i) => String(i));
const HOURS_LIST = Array.from({ length: 24 }, (_, i) => String(i));
const MINS_LIST  = Array.from({ length: 12 }, (_, i) => String(i * 5)); // 0,5,10,...55

function ExpiryPicker({ days, hours, mins, onDays, onHours, onMins }: {
  days: number; hours: number; mins: number;
  onDays: (v: number) => void; onHours: (v: number) => void; onMins: (v: number) => void;
}) {
  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:"#71717a", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Expires after
      </p>
      <div style={{ borderRadius:16, padding:"14px 12px", background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.16)", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
        <DrumRoller items={DAYS_LIST}  value={days}  onChange={onDays}  label="days" accent="#a78bfa" />
        <span style={{ color:"#3f3f46", fontSize:20, fontWeight:300, alignSelf:"center", paddingBottom:4 }}>:</span>
        <DrumRoller items={HOURS_LIST} value={hours} onChange={onHours} label="hrs"  accent="#a78bfa" />
        <span style={{ color:"#3f3f46", fontSize:20, fontWeight:300, alignSelf:"center", paddingBottom:4 }}>:</span>
        <DrumRoller items={MINS_LIST}  value={mins}  onChange={onMins}  label="min"  accent="#a78bfa" />
      </div>
    </div>
  );
}

const DL_LIST = Array.from({ length: 100 }, (_, i) => String(i + 1));

function DownloadsPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:"#71717a", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Max downloads
      </p>
      <div style={{ borderRadius:16, padding:"14px 12px", background:"rgba(14,165,233,0.06)", border:"1px solid rgba(14,165,233,0.16)", display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
        <DrumRoller items={DL_LIST} value={value - 1} onChange={(i) => onChange(i + 1)} label="count" accent="#38bdf8" />
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:12, color:"#52525b", marginBottom:4 }}>selected</p>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:28, fontWeight:700, color:"#38bdf8", lineHeight:1 }}>{value}</p>
          <p style={{ fontSize:11, color:"#52525b", marginTop:4 }}>{value === 1 ? "download" : "downloads"}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// File Row
// ─────────────────────────────────────────────────────────────────────────────
function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <motion.div initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }}
      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:14, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ flexShrink:0, width:36, height:36, borderRadius:10, background:"rgba(14,165,233,0.1)", border:"1px solid rgba(14,165,233,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:9, fontWeight:900, color:"#38bdf8", letterSpacing:"-0.03em" }}>{ext.slice(0,4)}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12, fontWeight:500, color:"#e4e4e7", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>{file.name}</p>
        <p style={{ fontSize:10, color:"#52525b", margin:0 }}>{formatBytes(file.size)}</p>
      </div>
      <button onClick={onRemove} style={{ flexShrink:0, width:24, height:24, borderRadius:8, background:"rgba(255,255,255,0.04)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#52525b" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")} onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [open,    setOpen]    = useState(false);
  const [files,   setFiles]   = useState<File[]>([]);
  const [link,    setLink]    = useState("");
  const [loading, setLoading] = useState(false);
  const [progress,setProgress]= useState(0);
  const [dragging,setDragging]= useState(false);
  const [copied,  setCopied]  = useState(false);

  // Expiry — store as indices
  const [exDays,  setExDays]  = useState(1);
  const [exHours, setExHours] = useState(0);
  const [exMins,  setExMins]  = useState(0);  // index into MINS_LIST

  const [maxDownloads, setMaxDownloads] = useState(3);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const minsVal    = parseInt(MINS_LIST[exMins] ?? "0");
  const expiryLbl  = formatExpiry(exDays, exHours, minsVal);
  const totalHours = expiryToHours(exDays, exHours, minsVal);
  const { apiBaseUrl, frontendBaseUrl } = buildRuntimeUrls();

  const uploadFile = async () => {
    if (!files.length) return;
    setLoading(true); setProgress(0);
    const iv = setInterval(() => setProgress((p) => p < 88 ? p + Math.random() * 12 : p), 250);
    const fd  = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("expiryHours", totalHours.toString());
    fd.append("maxDownloads", maxDownloads.toString());
    try {
      const res  = await fetch(`${apiBaseUrl}/api/upload`, { method:"POST", body:fd });
      const data = await res.json();
      clearInterval(iv); setProgress(100); setLink(data.link);
    } catch { alert("Upload failed. Is the server running?"); clearInterval(iv); }
    setLoading(false);
  };

  const reset = () => { setFiles([]); setLink(""); setProgress(0); setCopied(false); };

  const copyLink = () => {
      const id = link.split("/").pop();
      if (!id) return;

      navigator.clipboard.writeText(
        `${frontendBaseUrl}/download/${id}`
      );
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    const next = Array.from(fl);
    setFiles((prev) => { const ns = new Set(prev.map((f) => f.name)); return [...prev, ...next.filter((f) => !ns.has(f.name))]; });
  };

  const shareId = link.split("/").pop() || "";
  const shareUrl = shareId ? `${frontendBaseUrl}/download/${shareId}` : "";
  const shareUrlLabel = shareUrl.replace(/^https?:\/\//, "");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        body{margin:0;background:#09090b;font-family:'Sora',sans-serif}
        ::-webkit-scrollbar{display:none}
        *{-ms-overflow-style:none;scrollbar-width:none}
        .grain::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          background-size:200px;opacity:0.25}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .float{animation:float 3s ease-in-out infinite}
        .glow-sky{box-shadow:0 0 60px rgba(14,165,233,.1),0 0 120px rgba(14,165,233,.04)}
        .glow-green{box-shadow:0 0 60px rgba(34,197,94,.12),0 0 120px rgba(34,197,94,.05)}
        .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
        .pbar{transition:width .35s ease}
        .btn-upload{transition:all .2s}
        .btn-upload:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px)}
      `}</style>

      <div className="grain min-h-screen text-white overflow-x-hidden" style={{ background:"#09090b" }}>

        {/* NAV */}
        <header style={{ position:"fixed", top:0, left:0, right:0, zIndex:40, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 32px", background:"rgba(9,9,11,0.82)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"#0ea5e9", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="15" height="15" fill="none" stroke="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <span style={{ fontWeight:700, fontSize:15, letterSpacing:"-0.01em" }}>AetherDrop</span>
            <span className="badge" style={{ background:"rgba(14,165,233,0.12)", color:"#38bdf8", border:"1px solid rgba(14,165,233,0.2)" }}>Beta</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <a href="#how" style={{ fontSize:13, color:"#71717a", textDecoration:"none" }}>How it works</a>
            <button onClick={() => setOpen(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:12, fontSize:13, fontWeight:600, background:"#0ea5e9", color:"#fff", border:"none", cursor:"pointer", boxShadow:"0 0 20px rgba(14,165,233,0.35)" }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Upload
            </button>
          </div>
        </header>

        {/* HERO */}
        <section style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", textAlign:"center", padding:"80px 24px 0" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:"20%", left:"50%", transform:"translateX(-50%)", width:600, height:600, background:"radial-gradient(circle,rgba(14,165,233,0.07) 0%,transparent 70%)", borderRadius:"50%" }} />
            <div style={{ position:"absolute", top:"30%", left:"20%", width:300, height:300, background:"radial-gradient(circle,rgba(99,102,241,0.05) 0%,transparent 70%)", borderRadius:"50%" }} />
          </div>
          <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, ease:[0.16,1,0.3,1] }}>
            <div className="float" style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:32, padding:"6px 16px", borderRadius:99, background:"rgba(14,165,233,0.08)", border:"1px solid rgba(14,165,233,0.18)" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#38bdf8", boxShadow:"0 0 6px #38bdf8", display:"inline-block" }} />
              <span style={{ fontSize:12, fontWeight:500, color:"#7dd3fc" }}>Instant encrypted file sharing</span>
            </div>
            <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:"clamp(2.2rem,6.5vw,5rem)", fontWeight:800, lineHeight:1.06, letterSpacing:"-0.03em", margin:"0 0 24px" }}>
              Drop it.<br />
              <span style={{ background:"linear-gradient(135deg,#38bdf8 0%,#818cf8 50%,#34d399 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Share it.</span><br />
              Gone when you say.
            </h1>
            <p style={{ color:"#71717a", maxWidth:480, margin:"0 auto 40px", fontSize:17, lineHeight:1.65, fontWeight:300 }}>
              Secure file transfers with auto-expiry, download limits, and instant ZIP streaming. No accounts. No tracking.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={() => setOpen(true)} style={{ padding:"14px 32px", borderRadius:16, fontSize:15, fontWeight:600, background:"#0ea5e9", color:"#fff", border:"none", cursor:"pointer", boxShadow:"0 0 30px rgba(14,165,233,0.4)" }}>Start Sharing →</button>
              <a href="#how" style={{ padding:"14px 32px", borderRadius:16, fontSize:15, fontWeight:500, color:"#a1a1aa", border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", textDecoration:"none" }}>See how it works</a>
            </div>
          </motion.div>
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} style={{ display:"flex", gap:48, marginTop:72 }}>
            {[["∞","File Types"],["AES-256","Encryption"],["< 1s","Link Gen"]].map(([v,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:700, color:"#fff", margin:"0 0 4px" }}>{v}</p>
                <p style={{ fontSize:11, color:"#52525b", margin:0 }}>{l}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* HOW */}
        <section id="how" style={{ padding:"112px 24px", maxWidth:900, margin:"0 auto" }}>
          <p style={{ textAlign:"center", fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#38bdf8", marginBottom:12 }}>How it works</p>
          <h2 style={{ textAlign:"center", fontSize:30, fontWeight:700, letterSpacing:"-0.02em", marginBottom:56 }}>Ridiculously simple. Seriously secure.</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:20 }}>
            {[
              { e:"☁️", c:"#38bdf8", bg:"rgba(14,165,233,0.07)",  b:"rgba(14,165,233,0.14)",  t:"Drop your files", d:"Drag & drop or click to select. Multiple files get bundled into a ZIP automatically.", s:"01" },
              { e:"⏳", c:"#a78bfa", bg:"rgba(139,92,246,0.07)", b:"rgba(139,92,246,0.14)", t:"Set your rules",  d:"Dial in exact expiry time and max download count. Files self-destruct the moment limits are hit.", s:"02" },
              { e:"🔗", c:"#34d399", bg:"rgba(34,197,94,0.07)",   b:"rgba(34,197,94,0.14)",   t:"Share the link",  d:"One-click shareable link. Recipients download a ZIP instantly. No accounts, no captchas.", s:"03" },
            ].map((c) => (
              <motion.div key={c.s} initial={{ opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
                style={{ position:"relative", padding:24, borderRadius:20, background:c.bg, border:`1px solid ${c.b}` }}>
                <div style={{ position:"absolute", top:20, right:20, fontSize:44, fontWeight:900, opacity:0.06, color:c.c, fontFamily:"'JetBrains Mono',monospace", lineHeight:1 }}>{c.s}</div>
                <div style={{ fontSize:22, marginBottom:14 }}>{c.e}</div>
                <h3 style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>{c.t}</h3>
                <p style={{ fontSize:13, color:"#71717a", lineHeight:1.65, margin:0 }}>{c.d}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <footer style={{ textAlign:"center", padding:"36px 0", fontSize:12, color:"#3f3f46", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          © {new Date().getFullYear()} AetherDrop · Built with ☁️ and 💙
        </footer>
      </div>

      {/* ── MODAL ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.9)", backdropFilter:"blur(14px)" }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>

            <motion.div
              style={{ width:"100%", maxWidth:440, maxHeight:"92vh", display:"flex", flexDirection:"column" }}
              initial={{ scale:0.93, y:20, opacity:0 }} animate={{ scale:1, y:0, opacity:1 }} exit={{ scale:0.93, y:20, opacity:0 }}
              transition={{ type:"spring", stiffness:420, damping:32 }}>

              <div className={link ? "glow-green" : "glow-sky"} style={{ borderRadius:28, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"92vh", background:"linear-gradient(145deg,#111113,#0d0d10)", border:"1px solid rgba(255,255,255,0.07)" }}>

                {/* Sticky header */}
                <div style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 22px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:"#0ea5e9", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="13" height="13" fill="none" stroke="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <span style={{ fontWeight:700, fontSize:13, color: "white" }}>{link ? "Your link is ready" : "New Upload"}</span>
                  </div>
                  <button onClick={() => setOpen(false)} style={{ width:30, height:30, borderRadius:10, background:"rgba(255,255,255,0.05)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#71717a" }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Scrollable body */}
                <div style={{ flex:1, overflowY:"auto", padding:"20px 22px", display:"flex", flexDirection:"column", gap:18 }}>
                  <AnimatePresence mode="wait">
                    {!link ? (
                      <motion.div key="upload" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ display:"flex", flexDirection:"column", gap:18 }}>

                        {/* Drop zone */}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                          style={{ cursor:"pointer", borderRadius:18, padding:"28px 24px", textAlign:"center", border: dragging ? "2px dashed #38bdf8" : "2px dashed rgba(255,255,255,0.08)", background: dragging ? "rgba(14,165,233,0.05)" : "rgba(255,255,255,0.02)", transition:"all 0.2s" }}>
                          <input type="file" multiple ref={fileInputRef} style={{ display:"none" }} onChange={(e) => addFiles(e.target.files)} />
                          <div style={{ width:44, height:44, borderRadius:14, margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center", background: dragging ? "rgba(14,165,233,0.14)" : "rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                            <svg width="22" height="22" fill="none" stroke={dragging ? "#38bdf8" : "#71717a"} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          </div>
                          <p style={{ fontSize:13, fontWeight:600, color:"#d4d4d8", margin:"0 0 4px" }}>{dragging ? "Release to drop" : "Drop files here"}</p>
                          <p style={{ fontSize:11, color:"#52525b", margin:0 }}>or click to browse · any format</p>
                        </div>

                        {/* File list */}
                        <AnimatePresence>
                          {files.length > 0 && (
                            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                              {files.map((f, i) => (
                                <FileRow key={f.name+i} file={f} onRemove={() => setFiles((p) => p.filter((_,j) => j!==i))} />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Expiry picker */}
                        <ExpiryPicker days={exDays} hours={exHours} mins={exMins} onDays={setExDays} onHours={setExHours} onMins={setExMins} />

                        {/* Downloads picker */}
                        <DownloadsPicker value={maxDownloads} onChange={setMaxDownloads} />

                        {/* Summary pills */}
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          <span className="badge" style={{ background:"rgba(139,92,246,0.1)", color:"#a78bfa", border:"1px solid rgba(139,92,246,0.2)" }}>⏳ {expiryLbl}</span>
                          <span className="badge" style={{ background:"rgba(14,165,233,0.1)", color:"#38bdf8", border:"1px solid rgba(14,165,233,0.2)" }}>↓ {maxDownloads} dl</span>
                          {files.length > 0 && (
                            <span className="badge" style={{ background:"rgba(34,197,94,0.1)", color:"#34d399", border:"1px solid rgba(34,197,94,0.2)" }}>
                              📁 {files.length} file{files.length>1?"s":""} · {formatBytes(files.reduce((a,f)=>a+f.size,0))}
                            </span>
                          )}
                        </div>

                        {/* Upload btn */}
                        <button className="btn-upload" onClick={uploadFile} disabled={!files.length || loading}
                          style={{ width:"100%", padding:"13px 0", borderRadius:16, fontSize:14, fontWeight:600, border:"none",
                            background: !files.length ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#0ea5e9,#0284c7)",
                            color: !files.length ? "#3f3f46" : "#fff",
                            boxShadow: files.length ? "0 0 28px rgba(14,165,233,0.32)" : "none",
                            cursor: !files.length ? "not-allowed" : "pointer" }}>
                          {loading
                            ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                                <svg style={{ animation:"spin 1s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24">
                                  <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity:0.25 }} />
                                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" style={{ opacity:0.75 }} />
                                </svg>
                                Uploading…
                              </span>
                            : "Upload Files →"}
                        </button>

                        {/* Progress */}
                        <AnimatePresence>
                          {loading && (
                            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                              <div style={{ height:3, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                                <div className="pbar" style={{ height:"100%", borderRadius:99, width:`${progress}%`, background:"linear-gradient(90deg,#0ea5e9,#818cf8)" }} />
                              </div>
                              <p style={{ textAlign:"center", fontSize:10, color:"#52525b", marginTop:6, fontFamily:"'JetBrains Mono',monospace" }}>{Math.round(progress)}%</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </motion.div>
                    ) : (
                      /* Success */
                      <motion.div key="success" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                        <div style={{ textAlign:"center" }}>
                          <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:"spring", stiffness:300, delay:0.1 }}
                            style={{ width:64, height:64, borderRadius:20, margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.2)" }}>
                            <svg width="30" height="30" fill="none" stroke="#4ade80" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </motion.div>
                          <h3 style={{ fontWeight:700, fontSize:20, margin:"0 0 6px" }}>Files ready!</h3>
                          <p style={{ fontSize:13, color:"#71717a", margin:0 }}>Share the link below. It self-destructs after limits are reached.</p>
                        </div>
                        <div style={{ display:"flex", justifyContent:"center", gap:12 }}>
                          <div style={{ textAlign:"center", padding:"10px 18px", borderRadius:14, background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.16)" }}>
                            <p style={{ fontSize:11, color:"#52525b", margin:"0 0 3px" }}>Expires</p>
                            <p style={{ fontSize:13, fontWeight:700, color:"#c4b5fd", margin:0 }}>{expiryLbl}</p>
                          </div>
                          <div style={{ textAlign:"center", padding:"10px 18px", borderRadius:14, background:"rgba(14,165,233,0.08)", border:"1px solid rgba(14,165,233,0.16)" }}>
                            <p style={{ fontSize:11, color:"#52525b", margin:"0 0 3px" }}>Downloads</p>
                            <p style={{ fontSize:13, fontWeight:700, color:"#38bdf8", margin:0 }}>{maxDownloads} max</p>
                          </div>
                        </div>
                        <div style={{ borderRadius:16, padding:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px" }}>
                         <p style={{ flex:1, fontSize:11, color:"#71717a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0, fontFamily:"'JetBrains Mono',monospace" }}>{shareUrlLabel}</p>
                            <button onClick={copyLink} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:600, border:"none", cursor:"pointer", transition:"all .2s", background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)", color: copied ? "#34d399" : "#a1a1aa" }}>
                              {copied
                                ? <><svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied</>
                                : <><svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                              }
                            </button>
                          </div>
                        </div>
                         <button onClick={() => { if (shareUrl) window.location.href = shareUrl; }}
                          style={{ width:"100%", padding:"13px 0", borderRadius:16, fontSize:14, fontWeight:600, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff", boxShadow:"0 0 24px rgba(34,197,94,0.3)" }}>
                          ↓ Download ZIP
                        </button>
                        <button onClick={reset}
                          style={{ width:"100%", padding:"11px 0", borderRadius:16, fontSize:13, fontWeight:500, border:"1px solid rgba(255,255,255,0.06)", cursor:"pointer", background:"rgba(255,255,255,0.03)", color:"#52525b" }}>
                          Upload another batch
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
