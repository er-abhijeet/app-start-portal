import { useState, useEffect, useRef, useCallback } from "react";
const API_BASE = "http://localhost:5000";

export default function CoOccurrenceGraph() {
  const canvasRef = useRef(null);
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/co-occurrence`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.nodes.length) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // Init positions
    const nodes = data.nodes.map((n, i) => ({
      ...n,
      x: W / 2 + Math.cos(i / data.nodes.length * Math.PI * 2) * 150,
      y: H / 2 + Math.sin(i / data.nodes.length * Math.PI * 2) * 150,
      vx: 0, vy: 0,
    }));
    nodesRef.current = nodes;

    const maxW = Math.max(1, ...data.edges.map(e => e.weight));

    function tick() {
      const ns = nodesRef.current;
      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x, dy = ns[j].y - ns[i].y;
          const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const f = 3000 / (d * d);
          ns[i].vx -= f * dx / d; ns[i].vy -= f * dy / d;
          ns[j].vx += f * dx / d; ns[j].vy += f * dy / d;
        }
      }
      // Attraction along edges
      for (const e of data.edges) {
        const a = ns.find(n => n.id === e.source);
        const b = ns.find(n => n.id === e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const strength = (e.weight / maxW) * 0.05;
        a.vx += dx * strength; a.vy += dy * strength;
        b.vx -= dx * strength; b.vy -= dy * strength;
      }
      // Center pull + damping + bounds
      for (const n of ns) {
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x = Math.max(30, Math.min(W - 30, n.x + n.vx));
        n.y = Math.max(30, Math.min(H - 30, n.y + n.vy));
      }

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080d14";
      ctx.fillRect(0, 0, W, H);

      // Edges
      for (const e of data.edges) {
        const a = ns.find(n => n.id === e.source);
        const b = ns.find(n => n.id === e.target);
        if (!a || !b) continue;
        const alpha = 0.2 + 0.6 * (e.weight / maxW);
        ctx.strokeStyle = `rgba(246,173,16,${alpha})`;
        ctx.lineWidth = 1 + 3 * (e.weight / maxW);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        // weight label
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.fillStyle = "#f6ad1080";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(e.weight, mx, my);
      }

      // Nodes
      for (const n of ns) {
        const r = n.isStranger ? 12 : 16;
        const col = n.isStranger ? "#a78bfa" : "#60a5fa";
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2);
        grd.addColorStop(0, col + "40"); grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.isStranger ? "#2d1f4a" : "#0f2937";
        ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 9px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.label.slice(0, 8), n.x, n.y);
      }

      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [data]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    for (const n of nodesRef.current) {
      const dx = mx * scaleX - n.x, dy = my * scaleY - n.y;
      if (Math.sqrt(dx * dx + dy * dy) < 18) {
        setTooltip({ label: n.label, x: e.clientX, y: e.clientY, isStranger: n.isStranger });
        return;
      }
    }
    setTooltip(null);
  }, []);

  if (loading) return <div style={{ color: "#4b5563", textAlign: "center", padding: 40, fontFamily: "monospace" }}>Loading co-occurrence data...</div>;
  if (err) return <div style={{ color: "#e53e3e", padding: 20, fontFamily: "monospace" }}>Error: {err}</div>;
  if (!data.nodes.length) return <div style={{ color: "#4b5563", textAlign: "center", padding: 60, fontFamily: "monospace" }}>No co-occurrence data yet. Upload photos with multiple people.</div>;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 500 }}>
      <canvas ref={canvasRef} onMouseMove={handleMouseMove}
        style={{ width: "100%", height: "100%", borderRadius: 12, display: "block", cursor: "crosshair" }} />
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x + 12, top: tooltip.y - 10,
          background: "#0f1623", border: `1px solid ${tooltip.isStranger ? "#4a3060" : "#1e4f72"}`,
          borderRadius: 8, padding: "6px 12px", pointerEvents: "none", zIndex: 200,
          color: tooltip.isStranger ? "#a78bfa" : "#60a5fa", fontFamily: "monospace", fontSize: 12
        }}>
          {tooltip.label}
        </div>
      )}
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#60a5fa" }} />
          <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace" }}>Registered</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#a78bfa" }} />
          <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace" }}>Stranger</span>
        </div>
        <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace" }}>
          {data.nodes.length} people · {data.edges.length} connections
        </span>
      </div>
    </div>
  );
}
