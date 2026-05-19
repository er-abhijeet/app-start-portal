import { useState, useEffect, useRef, useCallback } from "react";
const API_BASE = "http://localhost:5000";

const fmt = {
  coords: (loc) => {
    if (!loc) return null;
    const c = loc.coords || loc;
    const lat = c.latitude ?? c.lat;
    const lon = c.longitude ?? c.lon;
    if (lat == null || lon == null) return null;
    return { lat: parseFloat(lat), lon: parseFloat(lon) };
  },
};

export default function HeatmapView() {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [viewport, setViewport] = useState({ zoom: 2, cx: 20, cy: 20 });
  const dragging = useRef(false);
  const lastMouse = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/heatmap`)
      .then(r => r.json())
      .then(pts => { setPoints(pts); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!points.length) return;
    const lats = points.map(p => p.lat), lons = points.map(p => p.lon);
    const clat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const clon = (Math.min(...lons) + Math.max(...lons)) / 2;
    const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons), 0.01);
    const zoom = Math.min(14, Math.max(2, Math.floor(Math.log2(360 / span))));
    setViewport({ zoom, cx: clon, cy: clat });
  }, [points.length]);

  const project = useCallback((lat, lon, W, H) => {
    const z = viewport.zoom;
    const totalPx = Math.pow(2, z) * 256;
    const x = ((lon + 180) / 360) * totalPx;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = ((Math.PI - mercN) / (2 * Math.PI)) * totalPx;
    const cx = ((viewport.cx + 180) / 360) * totalPx;
    const cyRad = (viewport.cy * Math.PI) / 180;
    const mercCy = Math.log(Math.tan(Math.PI / 4 + cyRad / 2));
    const centerPxY = ((Math.PI - mercCy) / (2 * Math.PI)) * totalPx;
    return { px: x - cx + W / 2, py: y - centerPxY + H / 2 };
  }, [viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#080d14"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1e2535"; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let j = 0; j < H; j += 60) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

    if (!points.length) {
      ctx.fillStyle = "#4a5568"; ctx.font = "14px monospace"; ctx.textAlign = "center";
      ctx.fillText("No geotagged photos found", W / 2, H / 2); return;
    }

    // Cluster points within 20px radius
    const projected = points.map(p => ({ ...p, ...project(p.lat, p.lon, W, H) }));
    const clusters = [];
    for (const pt of projected) {
      let found = false;
      for (const cl of clusters) {
        const dx = pt.px - cl.px, dy = pt.py - cl.py;
        if (Math.sqrt(dx * dx + dy * dy) < 20) { cl.weight += 1; found = true; break; }
      }
      if (!found) clusters.push({ px: pt.px, py: pt.py, weight: 1 });
    }
    const maxW = Math.max(...clusters.map(c => c.weight));

    for (const cl of clusters) {
      const ratio = cl.weight / maxW;
      const r = 20 + ratio * 40;
      const grd = ctx.createRadialGradient(cl.px, cl.py, 0, cl.px, cl.py, r);
      const alpha = Math.round(0.3 + ratio * 0.6, 2);
      if (ratio > 0.7) { grd.addColorStop(0, `rgba(239,68,68,${alpha})`); grd.addColorStop(0.5, `rgba(245,158,11,${alpha * 0.6})`); }
      else if (ratio > 0.3) { grd.addColorStop(0, `rgba(245,158,11,${alpha})`); grd.addColorStop(0.5, `rgba(34,197,94,${alpha * 0.5})`); }
      else { grd.addColorStop(0, `rgba(34,197,94,${alpha})`); grd.addColorStop(0.5, `rgba(59,130,246,${alpha * 0.4})`); }
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cl.px, cl.py, r, 0, Math.PI * 2); ctx.fill();
      if (cl.weight > 1) {
        ctx.fillStyle = "#fff"; ctx.font = `bold ${10 + ratio * 6}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(cl.weight, cl.px, cl.py);
      }
    }
  }, [points, project, viewport]);

  if (loading) return <div style={{ color: "#4b5563", textAlign: "center", padding: 40, fontFamily: "monospace" }}>Loading heatmap...</div>;
  if (err) return <div style={{ color: "#e53e3e", padding: 20, fontFamily: "monospace" }}>Error: {err}</div>;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", minHeight: 500 }}>
      <canvas ref={canvasRef} width={1200} height={600}
        style={{ width: "100%", height: "100%", borderRadius: 12, display: "block", cursor: "crosshair" }}
        onWheel={e => { e.preventDefault(); setViewport(v => ({ ...v, zoom: Math.max(2, Math.min(18, v.zoom - Math.sign(e.deltaY))) })); }}
        onMouseDown={e => { dragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }}
        onMouseMove={e => {
          if (!dragging.current) return;
          const dx = e.clientX - lastMouse.current.x, dy = e.clientY - lastMouse.current.y;
          lastMouse.current = { x: e.clientX, y: e.clientY };
          const scale = 360 / (Math.pow(2, viewport.zoom) * 256);
          setViewport(v => ({ ...v, cx: v.cx - dx * scale, cy: Math.max(-85, Math.min(85, v.cy + dy * scale * 0.6)) }));
        }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
      />
      <div style={{ position: "absolute", top: 12, left: 12, background: "#0d1117cc", padding: "8px 14px", borderRadius: 8, fontFamily: "monospace", fontSize: 11, color: "#9ca3af" }}>
        <div style={{ marginBottom: 6, color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>HOTSPOT HEATMAP</div>
        <div>{points.length} geotagged photos · Zoom {viewport.zoom} · Scroll/drag to navigate</div>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          {[["#ef4444","High density"],["#f59e0b","Medium"],["#22c55e","Low"]].map(([c,l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              <span style={{ fontSize: 10, color: "#6b7280" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {["+","−"].map((l, i) => (
          <button key={l} onClick={() => setViewport(v => ({ ...v, zoom: Math.max(2, Math.min(18, v.zoom + (i === 0 ? 1 : -1))) }))}
            style={{ width: 32, height: 32, background: "#1a2035", border: "1px solid #2d3748", color: "#a0aec0", borderRadius: 6, cursor: "pointer", fontSize: 18, fontFamily: "monospace" }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
