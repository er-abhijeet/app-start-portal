import { useState, useEffect, useRef, useCallback } from "react";
const API_BASE = "http://localhost:5000";

function DrawableMap({ onRegionChange, onCenterChange }) {
  const canvasRef = useRef(null);
  const [viewport, setViewport] = useState({ zoom: 5, cx: 78, cy: 20 });
  const dragging = useRef(false);
  const lastMouse = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [polygon, setPolygon] = useState([]); // array of {px,py} canvas coords
  const polygonRef = useRef([]);
  const [center, setCenter] = useState(null);

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

  const unproject = useCallback((px, py, W, H) => {
    const z = viewport.zoom;
    const totalPx = Math.pow(2, z) * 256;
    const cx = ((viewport.cx + 180) / 360) * totalPx;
    const cyRad = (viewport.cy * Math.PI) / 180;
    const mercCy = Math.log(Math.tan(Math.PI / 4 + cyRad / 2));
    const centerPxY = ((Math.PI - mercCy) / (2 * Math.PI)) * totalPx;
    const worldX = px - W / 2 + cx;
    const worldY = py - H / 2 + centerPxY;
    const lon = (worldX / totalPx) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * worldY) / totalPx;
    const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
    return { lat, lon };
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

    // Grid lat/lon labels
    ctx.fillStyle = "#374151"; ctx.font = "10px monospace"; ctx.textAlign = "left";
    const latLines = [-60, -30, 0, 30, 60];
    for (const la of latLines) {
      const { py } = project(la, viewport.cx, W, H);
      if (py > 0 && py < H) {
        ctx.beginPath(); ctx.strokeStyle = "#1e2535"; ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
        ctx.fillStyle = "#374151"; ctx.fillText(`${la}°`, 4, py - 3);
      }
    }

    // Polygon
    const pts = polygonRef.current;
    if (pts.length > 0) {
      ctx.beginPath();
      ctx.moveTo(pts[0].px, pts[0].py);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].px, pts[i].py);
      if (pts.length > 2) ctx.closePath();
      ctx.fillStyle = "#e53e3e20"; ctx.fill();
      ctx.strokeStyle = "#e53e3e"; ctx.lineWidth = 2; ctx.stroke();
      for (const pt of pts) {
        ctx.beginPath(); ctx.arc(pt.px, pt.py, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#e53e3e"; ctx.fill();
      }
    }

    // Center pin
    if (center) {
      const { px, py } = project(center.lat, center.lon, W, H);
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#f6ad1030"; ctx.fill();
      ctx.strokeStyle = "#f6ad10"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#f6ad10"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("●", px, py);
    }
  }, [polygon, center, project, viewport]);

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const W = canvas.width, H = canvas.height;
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const coords = unproject(px, py, W, H);

    if (drawing) {
      const newPts = [...polygonRef.current, { px, py, ...coords }];
      polygonRef.current = newPts;
      setPolygon(newPts);
      onRegionChange && onRegionChange(newPts.map(p => ({ lat: p.lat, lon: p.lon })));
    } else {
      setCenter(coords);
      onCenterChange && onCenterChange(coords);
    }
  }, [drawing, unproject, onRegionChange, onCenterChange]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid #1f2937" }}>
      <canvas ref={canvasRef} width={800} height={400}
        style={{ width: "100%", height: "100%", cursor: drawing ? "crosshair" : "move", display: "block" }}
        onClick={handleClick}
        onWheel={e => { e.preventDefault(); setViewport(v => ({ ...v, zoom: Math.max(2, Math.min(18, v.zoom - Math.sign(e.deltaY))) })); }}
        onMouseDown={e => { if (!drawing) { dragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; } }}
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
      <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 8 }}>
        <button onClick={() => { setDrawing(d => !d); }}
          style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${drawing ? "#e53e3e" : "#374151"}`, background: drawing ? "#e53e3e20" : "#1f2937", color: drawing ? "#e53e3e" : "#9ca3af", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>
          {drawing ? "✏ Drawing Mode ON (click to add points)" : "✏ Enter Drawing Mode"}
        </button>
        {polygon.length > 0 && (
          <button onClick={() => { polygonRef.current = []; setPolygon([]); onRegionChange && onRegionChange([]); }}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #374151", background: "#1f2937", color: "#9ca3af", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>
            Clear Region
          </button>
        )}
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {["+","−"].map((l, i) => (
          <button key={l} onClick={() => setViewport(v => ({ ...v, zoom: Math.max(2, Math.min(18, v.zoom + (i === 0 ? 1 : -1))) }))}
            style={{ width: 32, height: 32, background: "#1a2035", border: "1px solid #2d3748", color: "#a0aec0", borderRadius: 6, cursor: "pointer", fontSize: 18, fontFamily: "monospace" }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 12, right: 12, background: "#0d1117cc", padding: "4px 10px", borderRadius: 6, color: "#4a5568", fontSize: 11, fontFamily: "monospace" }}>
        Zoom {viewport.zoom} · {polygon.length} region points · {center ? `Pin: ${center.lat.toFixed(3)},${center.lon.toFixed(3)}` : "Click to set center"}
      </div>
    </div>
  );
}

export default function GeofenceAlerts() {
  const [persons, setPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [center, setCenter] = useState(null);
  const [polygon, setPolygon] = useState([]);
  const [radiusKm, setRadiusKm] = useState(2);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/persons-list`)
      .then(r => r.json())
      .then(d => { setPersons(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = persons.filter(p =>
    p.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!selectedPerson || !center) { setSaveMsg("Select a person and set a map center pin."); return; }
    setSaving(true); setSaveMsg(null);
    try {
      await fetch(`${API_BASE}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: selectedPerson.id,
          person_label: selectedPerson.label,
          lat: center.lat, lon: center.lon,
          radius_km: radiusKm,
          region_polygon: polygon.length > 2 ? polygon : null
        })
      });
      setSaveMsg("✓ Geofence alert created successfully!");
      setSelectedPerson(null); setCenter(null); setPolygon([]);
    } catch (e) {
      setSaveMsg("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: "100%", minHeight: 500 }}>
      {/* Person selector */}
      <div style={{ background: "#0f1623", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
        <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "monospace", letterSpacing: 1 }}>SELECT PERSON TO TRACK</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 12, outline: "none", fontFamily: "monospace" }} />
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {loading && <div style={{ color: "#4b5563", fontSize: 12, fontFamily: "monospace", padding: 10 }}>Loading persons...</div>}
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelectedPerson(p)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, textAlign: "left",
                background: selectedPerson?.id === p.id ? (p.type === "stranger" ? "#2d1f4a" : "#0f2937") : "#111827",
                border: `1px solid ${selectedPerson?.id === p.id ? (p.type === "stranger" ? "#a78bfa" : "#60a5fa") : "#1f2937"}`,
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {p.image ? (
                <img src={p.image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid #374151" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  {p.type === "stranger" ? "?" : "👤"}
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, color: p.type === "stranger" ? "#a78bfa" : "#e2e8f0", fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "monospace" }}>{p.type}</div>
              </div>
            </button>
          ))}
          {!loading && filtered.length === 0 && <div style={{ color: "#4b5563", fontSize: 12, fontFamily: "monospace", padding: 10 }}>No persons found.</div>}
        </div>
      </div>

      {/* Map + config */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <DrawableMap onRegionChange={setPolygon} onCenterChange={setCenter} />
        <div style={{ background: "#0f1623", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {selectedPerson && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace" }}>TRACKING:</span>
              <span style={{ fontSize: 12, color: selectedPerson.type === "stranger" ? "#a78bfa" : "#60a5fa", fontWeight: 600 }}>{selectedPerson.label}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace" }}>RADIUS:</span>
            <input type="number" min="0.1" max="100" step="0.1" value={radiusKm}
              onChange={e => setRadiusKm(parseFloat(e.target.value))}
              style={{ width: 70, background: "#111827", border: "1px solid #374151", borderRadius: 6, color: "#e2e8f0", padding: "5px 8px", fontSize: 12, outline: "none" }} />
            <span style={{ fontSize: 11, color: "#4b5563" }}>km</span>
          </div>
          <button onClick={handleCreate} disabled={saving || !selectedPerson || !center}
            style={{
              marginLeft: "auto", padding: "8px 20px", borderRadius: 8, border: "none",
              background: (!selectedPerson || !center) ? "#1f2937" : "#e53e3e",
              color: (!selectedPerson || !center) ? "#4b5563" : "#fff",
              fontWeight: 700, fontSize: 13, cursor: (!selectedPerson || !center || saving) ? "default" : "pointer",
            }}>
            {saving ? "Creating..." : "🛡 Create Geofence Alert"}
          </button>
          {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith("✓") ? "#4ade80" : "#e53e3e", fontFamily: "monospace" }}>{saveMsg}</span>}
        </div>
        <div style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace", padding: "0 4px" }}>
          Instructions: 1) Select a person on the left. 2) Click the map to set a center pin. 3) Optionally enter drawing mode to shade a custom region. 4) Set radius and click Create.
        </div>
      </div>
    </div>
  );
}
