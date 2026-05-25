import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Polyline, Polygon, useMap, useMapEvents, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:5069";
// const API_BASE = "https://gallery.snorlax.codes";

const getValidImageUrl = (url) => {
  if (!url) return "";

  // 1. Target the consistent part of the path, regardless of stored IP/Port
  const pathIndex = url.indexOf("/uploads/");
  if (pathIndex !== -1) {
    const path = url.substring(pathIndex); // Extracts '/uploads/filename.jpg'
    return `${API_BASE}${path}`;
  }

  // 2. Pass through already valid absolute URLs (e.g., external links)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // 3. Fallback for other relative paths
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
};

// ─── ICONS ─────────────────────────────────────────────────────────────────
const Icon = {
  Search:      p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Upload:      p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  MapIcon:     p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>,
  ImageIcon:   p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Person:      p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Close:       p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevLeft:    p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  Pin:         p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Calendar:    p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Grid:        p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Spinner:     p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  AlertTri:    p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Eye:         p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Crosshair:   p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
  Network:     p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Heatmap:     p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" strokeOpacity="0.4"/><circle cx="12" cy="12" r="11" strokeOpacity="0.2"/></svg>,
  Bell:        p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Plus:        p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash:       p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Check:       p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Draw:        p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Eraser:      p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16l11-11 6 6-4.5 4.5"/><path d="M6.5 17.5l4-4"/></svg>,
  Radar:       p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12L22 2"/><path d="M12 6a6 6 0 0 1 6 6"/><circle cx="12" cy="12" r="2"/></svg>,
  Refresh:     p => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
};

// ─── UTILS ─────────────────────────────────────────────────────────────────
const fmt = {
  date: (iso) => {
    if (!iso) return "Unknown";
    try { return new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }); }
    catch { return String(iso); }
  },
  datetime: (iso) => {
    if (!iso) return "Unknown";
    try { return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
    catch { return String(iso); }
  },
  coords: (loc) => {
    if (!loc) return null;
    const c = loc.coords || loc;
    const lat = c.latitude ?? c.lat;
    const lon = c.longitude ?? c.lon ?? c.lng;
    if (lat == null || lon == null) return null;
    return { lat: parseFloat(lat), lon: parseFloat(lon) };
  },
  isStranger: (id) => typeof id === "string" && id.startsWith("stranger_"),
  personLabel: (id, email) => {
    if (!id) return "Unknown";
    if (email) return email;
    if (fmt.isStranger(id)) return "Unknown ·" + id.slice(-6);
    return id;
  },
};

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── API ───────────────────────────────────────────────────────────────────
const api = {
  searchByFace: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API_BASE}/search-by-face`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  searchByText: async ({ query, dateFrom, dateTo }) => {
    const body = { query };
    if (dateFrom) body.date_from = dateFrom;
    if (dateTo) body.date_to = dateTo;
    const r = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  getAllPhotos: async () => {
    const r = await fetch(`${API_BASE}/photos?status=done`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  getPersonPhotos: async (personId) => {
    const photos = await api.getAllPhotos();
    return photos.filter(p =>
      (p.persons_present || []).includes(personId) ||
      (p.ai_info || []).some(f => f.id === personId)
    );
  },
  getAlerts: async () => {
    const r = await fetch(`${API_BASE}/alerts`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  markAlertSeen: async (id) => {
    const r = await fetch(`${API_BASE}/alerts/${id}/seen`, { method: "PATCH" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  getGeofences: async () => {
    const r = await fetch(`${API_BASE}/geofences`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  createGeofence: async (payload) => {
    const r = await fetch(`${API_BASE}/geofences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  deleteGeofence: async (id) => {
    const r = await fetch(`${API_BASE}/geofences/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  checkGeofences: async () => {
    const r = await fetch(`${API_BASE}/geofences/check`, { method: "POST" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

// ─── SHARED ATOMS ──────────────────────────────────────────────────────────
function Pill({ label, color }) {
  return (
    <div style={{ background: color + "20", border: `1px solid ${color}50`, color, fontSize: 11, padding: "3px 10px", borderRadius: 20, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </div>
  );
}
function LoadingState({ msg = "Fetching data…" }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "#4b5563", padding: 60 }}>
      <Icon.Spinner style={{ width: 20, height: 20 }} />
      <span style={{ fontFamily: "monospace", fontSize: 13 }}>{msg}</span>
    </div>
  );
}
function ErrorState({ msg }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#e53e3e", padding: 40 }}>
      <Icon.AlertTri style={{ width: 18, height: 18 }} />
      <span style={{ fontFamily: "monospace", fontSize: 13 }}>{msg}</span>
    </div>
  );
}
function SectionLabel({ title }) {
  return <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 8 }}>{title}</div>;
}
function MetaRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#4b5563", fontFamily: "monospace", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ─── MAP COMPONENTS (react-leaflet) ────────────────────────────────────────
const getBounds = (points) => {
  if (!points || !points.length) return [[20, 78], [21, 79]]; // Default center
  const lats = points.map(p => p.lat).filter(l => l != null);
  const lons = points.map(p => p.lon).filter(l => l != null);
  if (!lats.length) return [[20, 78], [21, 79]];
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  // Add some padding to bounds so points aren't exactly on the edge
  const dLat = Math.max(0.01, (maxLat - minLat) * 0.1);
  const dLon = Math.max(0.01, (maxLon - minLon) * 0.1);
  return [
    [minLat - dLat, minLon - dLon],
    [maxLat + dLat, maxLon + dLon]
  ];
};

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter(p => p.lat != null && p.lon != null);
    if (valid.length > 0) {
      map.fitBounds(getBounds(valid), { padding: [50, 50], maxZoom: 16 });
    }
  }, [points, map]);
  return null;
}

// ─── LOCATION MAP ──────────────────────────────────────────────────────────
function LocationMap({ points, onPointClick, selectedPoint }) {
  const valid = points.filter(p => p.lat != null && p.lon != null);
  const path = valid.map(p => [p.lat, p.lon]);
  
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer bounds={getBounds(valid)} style={{ width: "100%", height: "100%", background: "#0d1117" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />
        <FitBounds points={valid} />
        {path.length > 1 && (
          <Polyline positions={path} pathOptions={{ color: "#f6ad10", weight: 2, dashArray: "6, 6", opacity: 0.6 }} />
        )}
        {valid.map((p, i) => {
          const sel = selectedPoint && selectedPoint._id === p._id;
          return (
            <CircleMarker
              key={p._id || i}
              center={[p.lat, p.lon]}
              radius={sel ? 8 : 6}
              pathOptions={{
                color: sel ? "#fff" : "#c0392b",
                fillColor: sel ? "#f6ad10" : "#e53e3e",
                fillOpacity: 1,
                weight: 2
              }}
              eventHandlers={{ click: () => onPointClick && onPointClick(p) }}
            >
              <Popup>
                <div style={{color:"#000", fontFamily:"monospace", fontWeight: "bold"}}>Point {i+1}</div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div style={{ position: "absolute", bottom: 10, left: 12, background: "#0d1117cc", padding: "3px 9px", borderRadius: 5, color: "#4a5568", fontSize: 10, fontFamily: "monospace", zIndex: 1000 }}>
        {valid.length} pts
      </div>
      <style>{`
        .map-tiles-dark { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }
        .leaflet-container { background: #0d1117 !important; }
        .leaflet-popup-content-wrapper { background: #f6ad10; border-radius: 4px; padding: 1px; }
        .leaflet-popup-tip { background: #f6ad10; }
        .leaflet-popup-close-button { display: none; }
      `}</style>
    </div>
  );
}

// ─── HEATMAP ──────────────────────────────────────────────────────────────
function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || !points.length) return;
    const valid = points.filter(p => p.lat != null && p.lon != null);
    if (!valid.length) return;
    const heatData = valid.map(p => [p.lat, p.lon, 1]);
    let heat;
    if (L.heatLayer) {
      heat = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.4: '#60a5fa', 0.6: '#4ade80', 0.8: '#f6ad10', 1.0: '#e53e3e' }
      }).addTo(map);
    }
    return () => { if (heat) map.removeLayer(heat); };
  }, [points, map]);
  return null;
}

function HeatmapCanvas({ points }) {
  const valid = points.filter(p => p.lat != null && p.lon != null);
  
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer bounds={getBounds(valid)} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />
        <FitBounds points={valid} />
        <HeatmapLayer points={valid} />
        {valid.map((p, i) => (
          <CircleMarker
            key={i}
            center={[p.lat, p.lon]}
            radius={2}
            pathOptions={{ color: "#e53e3e", fillColor: "#e53e3e", fillOpacity: 0.8, weight: 1 }}
          />
        ))}
      </MapContainer>
      <div style={{ position: "absolute", top: 12, left: 12, background: "#0d1117cc", padding: "5px 10px", borderRadius: 7, fontSize: 10, color: "#6b7280", fontFamily: "monospace", zIndex: 1000 }}>
        DENSITY HEATMAP · {valid.length} geotagged photos
      </div>
      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 10, alignItems: "center", background: "#0d1117cc", padding: "5px 10px", borderRadius: 7, zIndex: 1000 }}>
        {[["#e53e3e", "High"], ["#f6ad10", "Med"], ["#60a5fa", "Low"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>{l}</span>
          </div>
        ))}
      </div>
      <style>{`
        .map-tiles-dark { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }
        .leaflet-container { background: #0d1117 !important; }
      `}</style>
    </div>
  );
}

// ─── GEOFENCE DRAW MAP ─────────────────────────────────────────────────────
function DrawEvents({ mode, onPolygonComplete }) {
  const [polygon, setPolygon] = useState([]);
  const polygonRef = useRef([]);

  useEffect(() => {
    polygonRef.current = polygon;
  }, [polygon]);
  
  useEffect(() => {
    if (mode === "view") setPolygon([]);
  }, [mode]);

  useMapEvents({
    click(e) {
      if (mode !== "draw") return;
      const { lat, lng } = e.latlng;
      const prev = polygonRef.current;
      
      if (prev.length >= 2) {
        const first = prev[0];
        const map = e.target;
        const p1 = map.latLngToLayerPoint(e.latlng);
        const p2 = map.latLngToLayerPoint([first.lat, first.lon]);
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist < 20) { // 20 pixels radius to close
          if (onPolygonComplete) onPolygonComplete(prev);
          setPolygon([]);
          return;
        }
      }
      setPolygon([...prev, { lat, lon: lng }]);
    }
  });

  const positions = polygon.map(p => [p.lat, p.lon]);
  
  return (
    <>
      {positions.length > 0 && (
        <>
          <Polyline positions={positions} pathOptions={{ color: "#4ade80", dashArray: "5, 5", weight: 2 }} />
          {positions.map((pos, i) => (
            <CircleMarker key={i} center={pos} radius={i === 0 ? 7 : 5} pathOptions={{ fillColor: i === 0 ? "#4ade80" : "#86efac", color: "transparent", fillOpacity: 1 }} />
          ))}
          {positions.length >= 3 && (
            <Polyline positions={[positions[positions.length - 1], positions[0]]} pathOptions={{ color: "#4ade80", dashArray: "3, 3", weight: 1, opacity: 0.4 }} />
          )}
        </>
      )}
    </>
  );
}

function GeofenceDrawMap({ onRegionDrawn, existingGeofences = [] }) {
  const [mode, setMode] = useState("view");

  const handleComplete = (polygon) => {
    if (onRegionDrawn) onRegionDrawn(polygon);
    setMode("view");
  };

  const allPoints = [];
  existingGeofences.forEach(gf => {
    if (gf.polygon) gf.polygon.forEach(p => allPoints.push(p));
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer bounds={getBounds(allPoints)} style={{ width: "100%", height: "100%", cursor: mode === "draw" ? "crosshair" : "grab" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />
        <FitBounds points={allPoints} />
        
        {existingGeofences.map((gf, i) => {
          if (!gf.polygon || gf.polygon.length < 3) return null;
          const pos = gf.polygon.map(p => [p.lat, p.lon]);
          return (
            <Polygon key={i} positions={pos} pathOptions={{ color: "#f6ad10", fillColor: "#f6ad10", fillOpacity: 0.15, weight: 2, dashArray: "6, 3" }}>
               <Popup><div style={{fontFamily: "monospace", color: "#000", fontWeight: "bold"}}>{gf.name || `Zone ${i+1}`}</div></Popup>
            </Polygon>
          );
        })}
        
        <DrawEvents mode={mode} onPolygonComplete={handleComplete} />
      </MapContainer>
      
      {onRegionDrawn && (
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8, zIndex: 1000 }}>
          <button onClick={() => { setMode(m => m === "draw" ? "view" : "draw"); }}
            style={{ background: mode === "draw" ? "#4ade80" : "#1f2937", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: mode === "draw" ? "#000" : "#9ca3af", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, pointerEvents: "auto" }}>
            <Icon.Draw style={{ width: 13, height: 13 }} />
            {mode === "draw" ? "Drawing — click near start to close" : "Draw Zone"}
          </button>
          {mode === "draw" && (
            <button onClick={() => setMode("view")}
              style={{ background: "#e53e3e20", border: "1px solid #e53e3e50", borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: "#e53e3e", fontSize: 12, display: "flex", alignItems: "center", gap: 6, pointerEvents: "auto" }}>
              <Icon.Eraser style={{ width: 13, height: 13 }} /> Cancel
            </button>
          )}
        </div>
      )}
      {mode === "draw" && onRegionDrawn && (
        <div style={{ position: "absolute", bottom: 12, left: 12, background: "#0d1117dd", padding: "5px 12px", borderRadius: 7, fontSize: 11, color: "#4ade80", fontFamily: "monospace", zIndex: 1000 }}>
          Click map to place points — click near first point to close
        </div>
      )}
      <style>{`
        .map-tiles-dark { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }
        .leaflet-container { background: #0d1117 !important; }
        .leaflet-popup-content-wrapper { background: #f6ad10; border-radius: 4px; padding: 1px; }
        .leaflet-popup-tip { background: #f6ad10; }
        .leaflet-popup-close-button { display: none; }
      `}</style>
    </div>
  );
}

// ─── CO-OCCURRENCE GRAPH ───────────────────────────────────────────────────
function CoOccurrenceGraph({ photos, onPersonClick }) {
  const canvasRef = useRef();
  const nodesRef = useRef([]);
  const [renderTick, setRenderTick] = useState(0);
  const [edges, setEdges] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const simRunning = useRef(false);

  useEffect(() => {
    if (!photos.length) return;
    const personMap = {};
    const edgeMap = {};

    photos.forEach(photo => {
      const faces = photo.ai_info || [];
      const ids = [...new Set(faces.map(f => f.id).filter(Boolean))];
      ids.forEach(id => {
        if (!personMap[id]) {
          const face = faces.find(f => f.id === id);
          personMap[id] = { id, email: face?.email, type: face?.type, photoCount: 0 };
        }
        personMap[id].photoCount++;
      });
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = [ids[i], ids[j]].sort();
          const key = `${a}|${b}`;
          if (!edgeMap[key]) edgeMap[key] = { source: a, target: b, count: 0 };
          edgeMap[key].count++;
        }
      }
    });

    const nodeList = Object.values(personMap);
    const W = 800, H = 500;
    const layoutNodes = nodeList.map((n, i) => {
      const angle = (i / nodeList.length) * Math.PI * 2;
      const r = Math.min(W, H) * 0.32;
      return { ...n, x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle), vx: 0, vy: 0 };
    });

    nodesRef.current = layoutNodes;
    const edgeList = Object.values(edgeMap);
    setEdges(edgeList);
    setIsSimulating(true);

    // Force simulation
    simRunning.current = true;
    let frame;
    const simulate = () => {
      if (!simRunning.current) return;
      const ns = nodesRef.current;
      
      // Run multiple steps per frame to settle faster
      for (let step = 0; step < 5; step++) {
        for (let i = 0; i < ns.length; i++) {
          for (let j = i + 1; j < ns.length; j++) {
            const dx = ns[j].x - ns[i].x, dy = ns[j].y - ns[i].y;
            const d = Math.max(Math.hypot(dx, dy), 1);
            const f = 4000 / (d * d);
            ns[i].vx -= (dx / d) * f; ns[i].vy -= (dy / d) * f;
            ns[j].vx += (dx / d) * f; ns[j].vy += (dy / d) * f;
          }
        }
        edgeList.forEach(e => {
          const s = ns.find(n => n.id === e.source), t = ns.find(n => n.id === e.target);
          if (!s || !t) return;
          const dx = t.x - s.x, dy = t.y - s.y, d = Math.max(Math.hypot(dx, dy), 1);
          const targetDist = 80 + e.count * 8;
          const f = (d - targetDist) * 0.012;
          s.vx += (dx / d) * f; s.vy += (dy / d) * f;
          t.vx -= (dx / d) * f; t.vy -= (dy / d) * f;
        });
        ns.forEach(n => {
          n.vx += (W / 2 - n.x) * 0.003; n.vy += (H / 2 - n.y) * 0.003;
          n.vx *= 0.85; n.vy *= 0.85;
          n.x = Math.max(50, Math.min(W - 50, n.x + n.vx));
          n.y = Math.max(50, Math.min(H - 50, n.y + n.vy));
        });
      }
      
      // Skip render tick during simulation to prevent the "dancing" graph
      frame = requestAnimationFrame(simulate);
    };
    frame = requestAnimationFrame(simulate);
    
    // Stop after 1.5 seconds (effectively 7.5 seconds of simulation with 5x multiplier)
    const stopTimer = setTimeout(() => { 
      simRunning.current = false; 
      cancelAnimationFrame(frame); 
      setRenderTick(t => t + 1); // Render final state
      setIsSimulating(false);
    }, 1500); 
    
    return () => { simRunning.current = false; cancelAnimationFrame(frame); clearTimeout(stopTimer); };
  }, [photos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nodesRef.current.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#080d14"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1a1f2e"; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 70) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let j = 0; j < H; j += 70) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

    const nodes = nodesRef.current;
    const maxEdge = Math.max(...edges.map(e => e.count), 1);

    edges.forEach(e => {
      const s = nodes.find(n => n.id === e.source), t = nodes.find(n => n.id === e.target);
      if (!s || !t) return;
      const isHov = hovered && (hovered === e.source || hovered === e.target);
      const alpha = 0.15 + 0.55 * (e.count / maxEdge);
      ctx.strokeStyle = isHov ? `rgba(246,173,16,${alpha + 0.3})` : `rgba(99,102,241,${alpha})`;
      ctx.lineWidth = isHov ? 2.5 : 1 + (e.count / maxEdge) * 3;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      if (e.count > 1 || isHov) {
        const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
        ctx.fillStyle = isHov ? "#f6ad10" : "#4b5563";
        ctx.font = `${isHov ? "bold " : ""}${isHov ? 11 : 9}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(e.count, mx, my);
      }
    });

    const maxCount = Math.max(...nodes.map(n => n.photoCount), 1);
    nodes.forEach(n => {
      const r = 10 + Math.sqrt(n.photoCount / maxCount) * 18;
      const isStr = fmt.isStranger(n.id), isHov = hovered === n.id;
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.2);
      g.addColorStop(0, isHov ? "rgba(246,173,16,0.55)" : isStr ? "rgba(107,114,128,0.3)" : "rgba(96,165,250,0.3)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHov ? "#f6ad10" : isStr ? "#374151" : "#1e4f72"; ctx.fill();
      ctx.strokeStyle = isHov ? "#fff" : isStr ? "#6b7280" : "#60a5fa"; ctx.lineWidth = 2; ctx.stroke();
      const lbl = fmt.personLabel(n.id, n.email);
      const short = lbl.length > 14 ? lbl.slice(0, 13) + "…" : lbl;
      ctx.fillStyle = isHov ? "#f6ad10" : "#9ca3af";
      ctx.font = `${isHov ? "bold " : ""}11px monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(short, n.x, n.y + r + 5);
    });
  }, [renderTick, edges, hovered]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sy;
    let found = null;
    for (const n of nodesRef.current) {
      const r = 10 + Math.sqrt(n.photoCount / Math.max(...nodesRef.current.map(x => x.photoCount), 1)) * 18;
      if (Math.hypot(mx - n.x, my - n.y) < r + 8) {
        found = n.id;
        setTooltip({ x: e.clientX, y: e.clientY, node: n });
        break;
      }
    }
    if (!found) setTooltip(null);
    setHovered(found);
  };

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sy;
    for (const n of nodesRef.current) {
      if (Math.hypot(mx - n.x, my - n.y) < 28) {
        onPersonClick && onPersonClick({ id: n.id, email: n.email });
        return;
      }
    }
  };

  if (!photos.length) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontSize: 13, fontFamily: "monospace" }}>No photos loaded.</div>;

  const nodeCount = nodesRef.current.length;
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {isSimulating && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "#080d14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 12, border: "1px solid #1f2937" }}>
          <Icon.Spinner style={{ width: 32, height: 32, color: "#f6ad10", marginBottom: 16 }} />
          <div style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>ANALYZING NETWORK RELATIONS</div>
          <div style={{ color: "#6b7280", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>Computing optimal layout...</div>
        </div>
      )}
      <canvas ref={canvasRef} width={800} height={500}
        style={{ width: "100%", height: "100%", borderRadius: 12, cursor: "pointer", display: "block", border: "1px solid #1f2937", opacity: isSimulating ? 0 : 1, transition: "opacity 0.4s ease" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHovered(null); setTooltip(null); }}
        onClick={handleClick}
      />
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 10, background: "#111827", border: "1px solid #374151", borderRadius: 8, padding: "8px 12px", pointerEvents: "none", zIndex: 300 }}>
          <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 700 }}>{fmt.personLabel(tooltip.node.id, tooltip.node.email)}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{tooltip.node.photoCount} photo{tooltip.node.photoCount !== 1 ? "s" : ""}</div>
          {!fmt.isStranger(tooltip.node.id) && <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>Click to open profile</div>}
        </div>
      )}
      <div style={{ position: "absolute", bottom: 12, left: 12, background: "#0d1117cc", padding: "5px 10px", borderRadius: 7, fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>
        {nodeCount} persons · {edges.length} co-occurrences · hover to inspect · click to profile
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
        {[["#60a5fa", "Registered"], ["#6b7280", "Unidentified"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", gap: 5, alignItems: "center", background: "#0d1117cc", padding: "4px 8px", borderRadius: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PHOTO CARD ────────────────────────────────────────────────────────────
function PhotoCard({ photo, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const loc = fmt.coords(photo.location_data);
  return (
    <div onClick={() => onClick(photo)}
      style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#f6ad10"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1f2937"; e.currentTarget.style.transform = "none"; }}>
      <div style={{ aspectRatio: "16/10", background: "#0d1117", position: "relative", overflow: "hidden" }}>
        {imgErr
          ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.ImageIcon style={{ width: 32, height: 32, color: "#374151" }} /></div>
          : <img src={getValidImageUrl(photo.image_url)} alt="" onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        {photo.match_similarity != null && (
          <div style={{ position: "absolute", top: 6, right: 6, background: "#e53e3e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, fontFamily: "monospace" }}>
            FACE {(photo.match_similarity * 100).toFixed(0)}%
          </div>
        )}
        {photo.relevance != null && photo.match_similarity == null && (
          <div style={{ position: "absolute", top: 6, right: 6, background: "#f6ad10", color: "#000", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, fontFamily: "monospace" }}>
            {(photo.relevance * 100).toFixed(0)}%
          </div>
        )}
        {loc && (
          <div style={{ position: "absolute", bottom: 6, left: 6, background: "#0d1117cc", color: "#9ca3af", fontSize: 10, padding: "2px 7px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
            <Icon.Pin style={{ width: 9, height: 9 }} />{loc.lat.toFixed(3)},{loc.lon.toFixed(3)}
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>{fmt.date(photo.created_at)}</div>
        {photo.description && (
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {photo.description}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "auto" }}>
          {(photo.ai_info || []).slice(0, 4).map((f, i) => (
            <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 12, background: fmt.isStranger(f.id) ? "#1f2937" : "#1a2e1a", color: fmt.isStranger(f.id) ? "#6b7280" : "#4ade80", border: `1px solid ${fmt.isStranger(f.id) ? "#374151" : "#166534"}` }}>
              {fmt.isStranger(f.id) ? "Unknown" : (f.email || f.id)}
            </span>
          ))}
          {(photo.ai_info || []).length > 4 && <span style={{ fontSize: 10, color: "#4b5563" }}>+{photo.ai_info.length - 4}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── PHOTO MODAL ──────────────────────────────────────────────────────────
function PhotoModal({ photo, onClose, onPersonClick, personCtx }) {
  const [imgErr, setImgErr] = useState(false);
  const [showAllBboxes, setShowAllBboxes] = useState(false);
  const [showTargetBbox, setShowTargetBbox] = useState(false);
  
  useEffect(() => { 
    setImgErr(false); 
    setShowAllBboxes(false); 
    setShowTargetBbox(false); 
  }, [photo?._id]);

  if (!photo) return null;
  const loc = fmt.coords(photo.location_data);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000000e0", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0f1623", border: "1px solid #1f2937", borderRadius: 16, maxWidth: 920, width: "100%", maxHeight: "90vh", overflow: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #1f2937" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon.ImageIcon style={{ width: 15, height: 15, color: "#f6ad10" }} />
            <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 12 }}>{photo.filename || photo._id}</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {personCtx && (
              <button onClick={() => setShowTargetBbox(!showTargetBbox)} style={{ background: showTargetBbox ? "#f6ad10" : "#1f2937", color: showTargetBbox ? "#000" : "#9ca3af", border: "none", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "monospace", transition: "all 0.15s" }}>
                Target BBox
              </button>
            )}
            <button onClick={() => setShowAllBboxes(!showAllBboxes)} style={{ background: showAllBboxes ? "#4ade80" : "#1f2937", color: showAllBboxes ? "#000" : "#9ca3af", border: "none", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "monospace", transition: "all 0.15s" }}>
              All BBoxes
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 0, marginLeft: 8 }}>
              <Icon.Close style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ background: "#050810", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, padding: 10 }}>
            {imgErr ? (
              <Icon.ImageIcon style={{ width: 56, height: 56, color: "#374151" }} />
            ) : (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={getValidImageUrl(photo.image_url)} alt="" onError={() => setImgErr(true)} style={{ maxWidth: "100%", maxHeight: 420, display: "block" }} />
                {(showAllBboxes || showTargetBbox) && photo.ai_info && photo.ai_info.map((face, idx) => {
                  const b = face.bbox;
                  if (!b) return null;
                  const isTarget = personCtx && face.id === personCtx.id;
                  
                  // Only render if showAllBboxes is true OR (showTargetBbox is true AND this is the target face)
                  const shouldShow = showAllBboxes || (showTargetBbox && isTarget);
                  if (!shouldShow) return null;

                  const left = ((b.x - b.w) / b.img_w) * 100;
                  const top = (b.y / b.img_h) * 100;
                  const width = (b.w / b.img_w) * 100;
                  const height = (b.h / b.img_h) * 100;
                  
                  const color = isTarget ? "#f6ad10" : "#4ade80";
                  const label = face.email || (fmt.isStranger(face.id) ? "Unknown" : face.id.slice(0, 8));

                  return (
                    <div key={idx} style={{ 
                      position: "absolute", 
                      left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
                      border: `2px solid ${color}`,
                      boxShadow: "0 0 0 1px #000, inset 0 0 0 1px #000",
                      pointerEvents: "none"
                    }}>
                      <div style={{
                        position: "absolute",
                        bottom: "100%", left: -2,
                        background: color, color: "#000",
                        fontSize: 10, fontWeight: 700,
                        padding: "2px 5px", whiteSpace: "nowrap",
                        fontFamily: "monospace"
                      }}>
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: 420 }}>
            <div>
              <SectionLabel title="METADATA" />
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <MetaRow label="Captured" value={fmt.datetime(photo.created_at)} />
                <MetaRow label="Owner" value={photo.owner_email || "—"} />
                <MetaRow label="Status" value={photo.status || "—"} />
                <MetaRow label="Faces" value={photo.faces_found ?? (photo.ai_info || []).length} />
                {photo.match_similarity != null && <MetaRow label="Face match" value={`${(photo.match_similarity * 100).toFixed(1)}%`} />}
              </div>
            </div>
            {loc && (
              <div>
                <SectionLabel title="LOCATION" />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <MetaRow label="Lat" value={loc.lat.toFixed(6)} />
                  <MetaRow label="Lon" value={loc.lon.toFixed(6)} />
                  {photo.location_data?.address && <MetaRow label="Address" value={typeof photo.location_data.address === 'object' ? Object.values(photo.location_data.address).filter(Boolean).join(', ') : photo.location_data.address} />}
                  <a href={`https://maps.google.com/?q=${loc.lat},${loc.lon}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: "#f6ad10", textDecoration: "none" }}>↗ Google Maps</a>
                </div>
              </div>
            )}
            {photo.description && (
              <div>
                <SectionLabel title="AI DESCRIPTION" />
                <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{photo.description}</p>
              </div>
            )}
            {photo.tags?.length > 0 && (
              <div>
                <SectionLabel title="TAGS" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {photo.tags.map((t, i) => <span key={i} style={{ fontSize: 11, background: "#1a2035", color: "#60a5fa", padding: "3px 8px", borderRadius: 4, fontFamily: "monospace" }}>#{t}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
        {(photo.ai_info || []).length > 0 && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #1f2937" }}>
            <SectionLabel title="PERSONS DETECTED" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {photo.ai_info.map((face, i) => {
                const isStr = fmt.isStranger(face.id);
                return (
                  <button key={i} onClick={() => onPersonClick(face)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, background: isStr ? "#111827" : "#0f2937", border: `1px solid ${isStr ? "#374151" : "#1e4f72"}`, color: isStr ? "#6b7280" : "#60a5fa", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = isStr ? "#1a1a1a" : "#1a3a50"}
                    onMouseLeave={e => e.currentTarget.style.background = isStr ? "#111827" : "#0f2937"}>
                    <Icon.Person style={{ width: 14, height: 14 }} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{isStr ? "Unknown ·" + face.id.slice(-6) : (face.email || face.id)}</div>
                      <div style={{ fontSize: 10, color: "#4a5568" }}>{face.type || "detected"}</div>
                    </div>
                    <Icon.Eye style={{ width: 12, height: 12, marginLeft: 4 }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PERSON PROFILE ───────────────────────────────────────────────────────
function PersonProfile({ personId, personEmail, onBack, onPhotoClick, onPersonClick }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [mapView, setMapView] = useState(false);
  const [selPt, setSelPt] = useState(null);

  useEffect(() => {
    setLoading(true); setErr(null);
    api.getPersonPhotos(personId).then(setPhotos).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [personId]);

  const mapPts = photos.map(p => ({ ...p, ...fmt.coords(p.location_data) })).filter(p => p.lat != null);
  const label = personEmail || personId;
  const isReg = !fmt.isStranger(personId);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: "#090e19" }}>
        <button onClick={onBack} style={{ background: "#1f2937", border: "none", color: "#9ca3af", cursor: "pointer", padding: "6px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Icon.ChevLeft style={{ width: 14, height: 14 }} /> Back
        </button>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: isReg ? "#0f2937" : "#1f2937", border: `2px solid ${isReg ? "#1e4f72" : "#374151"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon.Person style={{ width: 18, height: 18, color: isReg ? "#60a5fa" : "#6b7280" }} />
        </div>
        <div>
          <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>{label}</div>
          <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "monospace" }}>{isReg ? "REGISTERED" : "UNIDENTIFIED · " + personId}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Pill label={`${photos.length} photos`} color="#f6ad10" />
          <Pill label={`${mapPts.length} locations`} color="#e53e3e" />
          <button onClick={() => setMapView(!mapView)}
            style={{ background: mapView ? "#f6ad10" : "#1f2937", border: "none", color: mapView ? "#000" : "#9ca3af", cursor: "pointer", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.MapIcon style={{ width: 14, height: 14 }} />{mapView ? "Gallery" : "Map Timeline"}
          </button>
        </div>
      </div>
      {loading && <LoadingState />}
      {err && <ErrorState msg={err} />}
      {!loading && !err && (
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {mapView ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
              <div style={{ flex: 1, minHeight: 350, borderRadius: 12, overflow: "hidden", border: "1px solid #1f2937" }}>
                <LocationMap points={mapPts} selectedPoint={selPt} onPointClick={p => { setSelPt(p); onPhotoClick(p); }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "monospace", marginBottom: 2 }}>LOCATION TIMELINE</div>
                {mapPts.map((p, i) => (
                  <div key={p._id} onClick={() => { setSelPt(p); onPhotoClick(p); }}
                    style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 14px", background: selPt?._id === p._id ? "#1a2e1a" : "#111827", border: `1px solid ${selPt?._id === p._id ? "#166534" : "#1f2937"}`, borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e53e3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <Icon.Pin style={{ width: 12, height: 12, color: "#e53e3e", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{fmt.datetime(p.created_at)}</div>
                      <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "monospace" }}>{p.lat?.toFixed(5)}, {p.lon?.toFixed(5)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
              {photos.map(p => <PhotoCard key={p._id} photo={p} onClick={onPhotoClick} />)}
              {photos.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#4b5563", padding: 60 }}>No photos found for this person.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GEOFENCE PANEL ───────────────────────────────────────────────────────
function GeofencePanel({ allPhotos }) {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newGf, setNewGf] = useState({ name: "", personId: "", polygon: null });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [err, setErr] = useState(null);

  // Build persons list from photos
  const persons = (() => {
    const pm = {};
    allPhotos.forEach(p => {
      (p.ai_info || []).forEach(f => {
        if (f.id && !pm[f.id]) pm[f.id] = { id: f.id, email: f.email, type: f.type };
      });
    });
    return Object.values(pm);
  })();

  const loadGeofences = () => {
    setLoading(true);
    api.getGeofences().then(setGeofences).catch(() => setGeofences([])).finally(() => setLoading(false));
  };
  useEffect(loadGeofences, []);

  const handleSave = async () => {
    if (!newGf.name || !newGf.personId || !newGf.polygon) { setErr("Name, person, and a drawn zone are all required."); return; }
    setSaving(true); setErr(null);
    try {

      await api.createGeofence({ name: newGf.name, person_id: newGf.personId, polygon: newGf.polygon });
      loadGeofences();
      setCreating(false); setNewGf({ name: "", personId: "", polygon: null });
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await api.deleteGeofence(id); setGeofences(gs => gs.filter(g => g._id !== id)); }
    catch (e) { setErr(e.message); }
  };

  const handleCheck = async () => {
    setChecking(true); setCheckResult(null); setErr(null);
    try { const r = await api.checkGeofences(); setCheckResult(r); }
    catch (e) { setErr(e.message); } finally { setChecking(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <Icon.Radar style={{ width: 18, height: 18, color: "#f6ad10" }} />
        <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>GEOFENCE ALERTS</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={handleCheck} disabled={checking}
            style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: "#9ca3af", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            {checking ? <Icon.Spinner style={{ width: 13, height: 13 }} /> : <Icon.Crosshair style={{ width: 13, height: 13 }} />}
            Run Check
          </button>
          <button onClick={() => { setCreating(!creating); setErr(null); setNewGf({ name: "", personId: "", polygon: null }); }}
            style={{ background: creating ? "#374151" : "#f6ad10", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: creating ? "#9ca3af" : "#000", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.Plus style={{ width: 13, height: 13 }} />{creating ? "Cancel" : "New Geofence"}
          </button>
        </div>
      </div>

      {checkResult && (
        <div style={{ background: "#1a2e1a", border: "1px solid #166534", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "#4ade80", fontFamily: "monospace" }}>
          ✓ Check complete — {checkResult.alerts_created ?? 0} new alert{checkResult.alerts_created !== 1 ? "s" : ""} generated
        </div>
      )}
      {err && <div style={{ background: "#2d1515", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "#fca5a5" }}>{err}</div>}

      {/* Create form */}
      {creating && (
        <div style={{ background: "#111827", border: "1px solid #2d3748", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 11, color: "#f6ad10", fontFamily: "monospace", letterSpacing: 1 }}>NEW GEOFENCE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 5, fontFamily: "monospace" }}>Alert Name</div>
              <input value={newGf.name} onChange={e => setNewGf(n => ({ ...n, name: e.target.value }))}
                placeholder="e.g. City Centre Watch"
                style={{ width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 6, color: "#e2e8f0", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "monospace" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 5, fontFamily: "monospace" }}>Track Person</div>
              <select value={newGf.personId} onChange={e => setNewGf(n => ({ ...n, personId: e.target.value }))}
                style={{ width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 6, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, outline: "none", fontFamily: "monospace" }}>
                <option value="">— Select person —</option>
                {persons.map(p => <option key={p.id} value={p.id}>{fmt.personLabel(p.id, p.email)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, fontFamily: "monospace" }}>Draw Zone on Map</div>
            <div style={{ height: 380, borderRadius: 10, overflow: "hidden", border: "1px solid #1f2937" }}>
              <GeofenceDrawMap onRegionDrawn={poly => setNewGf(n => ({ ...n, polygon: poly }))} existingGeofences={geofences} />
            </div>
            {newGf.polygon && <div style={{ fontSize: 11, color: "#4ade80", marginTop: 5, fontFamily: "monospace" }}>✓ Zone drawn ({newGf.polygon.length} points)</div>}
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ background: "#f6ad10", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", color: "#000", fontSize: 13, fontWeight: 700, alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? <Icon.Spinner style={{ width: 14, height: 14 }} /> : <Icon.Check style={{ width: 14, height: 14 }} />}
            {saving ? "Saving…" : "Save Geofence"}
          </button>
        </div>
      )}

      {/* Map overview when not creating */}
      {!creating && (
        <div style={{ height: 300, borderRadius: 12, overflow: "hidden", border: "1px solid #1f2937", flexShrink: 0 }}>
          <GeofenceDrawMap existingGeofences={geofences} onRegionDrawn={null} />
        </div>
      )}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "monospace", letterSpacing: 1 }}>ACTIVE GEOFENCES ({geofences.length})</div>
        {loading && <LoadingState />}
        {!loading && geofences.length === 0 && <div style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: 30 }}>No geofences yet. Create one above.</div>}
        {geofences.map(gf => {
          const person = persons.find(p => p.id === gf.person_id);
          return (
            <div key={gf._id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <Icon.Radar style={{ width: 15, height: 15, color: "#f6ad10", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{gf.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", marginTop: 2 }}>
                  {fmt.personLabel(gf.person_id, person?.email)} · {gf.polygon?.length || 0} pts · {fmt.date(gf.created_at)}
                </div>
              </div>
              <button onClick={() => handleDelete(gf._id)} style={{ background: "none", border: "1px solid #374151", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#e53e3e" }}>
                <Icon.Trash style={{ width: 13, height: 13 }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ALERTS PANEL ─────────────────────────────────────────────────────────
function AlertsPanel({ allPhotos, onAlertPhotoClick }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = () => {
    setLoading(true); setErr(null);
    api.getAlerts().then(setAlerts).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const markSeen = async (id) => {
    try {
      await api.markAlertSeen(id);
      setAlerts(as => as.map(a => a._id === id ? { ...a, status: "seen" } : a));
    } catch { }
  };
  console.log("here: ",alerts[0])
  const unseen = alerts.filter(a => a?.seen !== true);
  const seen = alerts.filter(a => a?.seen === true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <Icon.Bell style={{ width: 18, height: 18, color: unseen.length > 0 ? "#e53e3e" : "#4b5563" }} />
        <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>ALERTS</span>
        {unseen.length > 0 && <Pill label={`${unseen.length} unread`} color="#e53e3e" />}
        <button onClick={load} style={{ marginLeft: "auto", background: "#1f2937", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#6b7280", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
          <Icon.Refresh style={{ width: 12, height: 12 }} /> Refresh
        </button>
      </div>
      {loading && <LoadingState />}
      {err && <ErrorState msg={err} />}
      {!loading && !err && (
        <>
          {alerts.length === 0 && (
            <div style={{ color: "#4b5563", textAlign: "center", padding: 60, fontSize: 13 }}>
              <Icon.Bell style={{ width: 32, height: 32, margin: "0 auto 12px", display: "block", color: "#374151" }} />
              No alerts yet. Configure geofences and run a check.
            </div>
          )}
          {unseen.length > 0 && <div style={{ fontSize: 10, color: "#e53e3e", fontFamily: "monospace", letterSpacing: 1 }}>UNREAD ({unseen.length})</div>}
          {unseen.map(a => (
            <AlertRow key={a._id} alert={a} unseen
              onView={() => {
                markSeen(a._id);
                const photo = allPhotos.find(p => p._id === a.photo_id);
                if (photo) onAlertPhotoClick(photo);
              }} />
          ))}
          {seen.length > 0 && <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "monospace", letterSpacing: 1, marginTop: 8 }}>SEEN ({seen.length})</div>}
          {seen.map(a => (
            <AlertRow key={a._id} alert={a}
              onView={() => {
                const photo = allPhotos.find(p => p._id === a.photo_id);
                if (photo) onAlertPhotoClick(photo);
              }} />
          ))}
        </>
      )}
    </div>
  );
}

function AlertRow({ alert, unseen, onView }) {
  return (
    <div onClick={onView}
      style={{ background: unseen ? "#16120a" : "#111827", border: `1px solid ${unseen ? "#78350f" : "#1f2937"}`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = unseen ? "#f6ad10" : "#374151"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = unseen ? "#78350f" : "#1f2937"; }}>
      <div style={{ flexShrink: 0, marginTop: 4 }}>
        {unseen
          ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e53e3e", boxShadow: "0 0 8px #e53e3e" }} />
          : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#374151" }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: unseen ? "#fbbf24" : "#9ca3af", marginBottom: 4 }}>
          {alert.geofence_name || "Geofence Alert"}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          <span style={{ color: "#9ca3af", fontWeight: 600 }}>{fmt.personLabel(alert.person_id, alert.person_email)}</span> detected inside zone
        </div>
        <div style={{ fontSize: 11, color: "#4b5563", marginTop: 3, fontFamily: "monospace" }}>
          {fmt.datetime(alert.triggered_at)}
          {alert.photo_location && ` · ${alert.photo_location}`}
        </div>
      </div>
      {unseen && <span style={{ fontSize: 10, color: "#f6ad10", fontFamily: "monospace", alignSelf: "center", flexShrink: 0 }}>VIEW →</span>}
    </div>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────
function SearchBar({ onSearch, loading }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const fileRef = useRef();

  const pickImage = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setImage(f); setPreview(await fileToBase64(f));
    e.target.value = "";
  };

  const submit = () => {
    if (!text.trim() && !image) return;
    onSearch({ text: text.trim(), image, dateFrom, dateTo });
  };

  const canSearch = text.trim() || image;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "8px 12px" }}>
        {preview ? (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img src={preview} alt="" style={{ width: 42, height: 42, borderRadius: 6, objectFit: "cover", border: "2px solid #f6ad10" }} />
            <button onClick={() => { setImage(null); setPreview(null); }}
              style={{ position: "absolute", top: -6, right: -6, background: "#e53e3e", border: "none", borderRadius: "50%", width: 16, height: 16, cursor: "pointer", color: "#fff", fontSize: 12, lineHeight: "16px", textAlign: "center", padding: 0 }}>×</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} title="Upload face image"
            style={{ flexShrink: 0, background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: 8, cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }}>
            <Icon.Upload style={{ width: 16, height: 16 }} />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: "none" }} />
        <Icon.Search style={{ width: 16, height: 16, color: "#4b5563", flexShrink: 0 }} />
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
          placeholder={preview ? "Add text to refine (optional)…" : "Search by scene, activity, person name, location…"}
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e2e8f0", fontSize: 14, fontFamily: "monospace" }} />
        <button onClick={() => setShowFilters(!showFilters)}
          style={{ background: showFilters ? "#f6ad1020" : "none", border: showFilters ? "1px solid #f6ad1050" : "1px solid transparent", borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: showFilters ? "#f6ad10" : "#6b7280", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
          <Icon.Calendar style={{ width: 13, height: 13 }} />Date
        </button>
        <button onClick={submit} disabled={loading || !canSearch}
          style={{ background: !canSearch ? "#1f2937" : "#f6ad10", border: "none", borderRadius: 8, padding: "8px 18px", cursor: loading || !canSearch ? "default" : "pointer", color: !canSearch ? "#4b5563" : "#000", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
          {loading ? <Icon.Spinner style={{ width: 14, height: 14 }} /> : <Icon.Crosshair style={{ width: 14, height: 14 }} />}
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {showFilters && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "10px 14px" }}>
          <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>DATE RANGE</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6, color: "#9ca3af", padding: "5px 8px", fontSize: 12, outline: "none" }} />
          <span style={{ color: "#4b5563" }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6, color: "#9ca3af", padding: "5px 8px", fontSize: 12, outline: "none" }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 11, fontFamily: "monospace" }}>Clear</button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["group gathering", "night market", "protest", "religious event", "shopping mall", "beach"].map(q => (
          <button key={q} onClick={() => setText(q)}
            style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: "3px 10px", color: "#4b5563", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>{q}</button>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "search",   label: "Search",    Icon: Icon.Search   },
  { id: "graph",    label: "Network",   Icon: Icon.Network  },
  { id: "heatmap",  label: "Heatmap",   Icon: Icon.Heatmap  },
  { id: "geofence", label: "Geofences", Icon: Icon.Radar    },
  { id: "alerts",   label: "Alerts",    Icon: Icon.Bell     },
];

export default function App() {
  const [tab, setTab] = useState("search");
  const [page, setPage] = useState("main"); // "main" | "person"
  const [allPhotos, setAllPhotos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [personCtx, setPersonCtx] = useState(null);
  const [mapSel, setMapSel] = useState(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    api.getAllPhotos().then(setAllPhotos).catch(() => { }).finally(() => setGalleryLoading(false));
    const pollAlerts = () => api.getAlerts().then(as => setAlertCount(as.filter(a => a.status !== "seen").length)).catch(() => { });
    pollAlerts();
    const iv = setInterval(pollAlerts, 300000);
    return () => clearInterval(iv);
  }, []);

  const handleSearch = async ({ text, image, dateFrom, dateTo }) => {
    setSearchLoading(true); setSearchErr(null); setSearched(true);
    try {
      let res = [];
      if (image) {
        res = await api.searchByFace(image);
        // Optionally narrow by text client-side
        if (text) {
          const q = text.toLowerCase();
          res = res.filter(p =>
            (p.description || "").toLowerCase().includes(q) ||
            (p.tags || []).some(t => t.toLowerCase().includes(q))
          );
        }
      } else {
        res = await api.searchByText({ query: text, dateFrom, dateTo });
      }
      // Client-side date filter (belt-and-suspenders)
      if (dateFrom || dateTo) {
        res = res.filter(p => {
          if (!p.created_at) return true;
          const d = new Date(p.created_at);
          if (dateFrom && d < new Date(dateFrom)) return false;
          if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
          return true;
        });
      }
      setResults(res);
    } catch (e) { setSearchErr(e.message); } finally { setSearchLoading(false); }
  };

  const openPerson = (face) => {
    setPersonCtx({ id: face.id, email: face.email });
    setPage("person");
    setSelectedPhoto(null);
  };
  const closePerson = () => { setPage("main"); setPersonCtx(null); };

  const displayPhotos = searched ? results : allPhotos;
  const mapPts = displayPhotos.map(p => ({ ...p, ...fmt.coords(p.location_data) })).filter(p => p.lat != null);
  const heatPts = allPhotos.map(p => ({ ...p, ...fmt.coords(p.location_data) })).filter(p => p.lat != null);

  const switchTab = (id) => { setTab(id); if (page === "person") closePerson(); };

  return (
    <div style={{ minHeight: "100vh", height: "100vh", background: "#080d14", color: "#e2e8f0", fontFamily: "'IBM Plex Mono','Courier New',monospace", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#1f2937;border-radius:3px}
        *{box-sizing:border-box}input,select,button{font-family:inherit}
      `}</style>

      {/* NAV */}
      <nav style={{ borderBottom: "1px solid #1f2937", padding: "0 20px", display: "flex", alignItems: "center", height: 50, flexShrink: 0, background: "#060b14" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 20 }}>
          <Icon.Crosshair style={{ width: 17, height: 17, color: "#e53e3e" }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0", letterSpacing: 3 }}>VIGIL</span>
          <span style={{ fontSize: 9, color: "#374151", letterSpacing: 2 }}>INTEL PLATFORM</span>
        </div>
        {TABS.map(t => {
          const active = tab === t.id && page === "main";
          const isAlert = t.id === "alerts";
          return (
            <button key={t.id} onClick={() => switchTab(t.id)}
              style={{ height: "100%", padding: "0 15px", background: "none", border: "none", borderBottom: `2px solid ${active ? "#f6ad10" : "transparent"}`, color: active ? "#f6ad10" : "#4b5563", cursor: "pointer", fontSize: 12, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s", position: "relative" }}>
              <t.Icon style={{ width: 13, height: 13 }} />
              {t.label}
              {isAlert && alertCount > 0 && (
                <span style={{ background: "#e53e3e", color: "#fff", borderRadius: "50%", width: 15, height: 15, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{alertCount}</span>
              )}
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Pill label={`${allPhotos.length} indexed`} color="#4ade80" />
          {searched && <Pill label={`${results.length} results`} color="#f6ad10" />}
        </div>
      </nav>

      {/* BODY */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* PERSON PROFILE */}
        {page === "person" && personCtx && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease" }}>
            <PersonProfile personId={personCtx.id} personEmail={personCtx.email}
              onBack={closePerson} onPhotoClick={setSelectedPhoto} onPersonClick={openPerson} />
          </div>
        )}

        {/* SEARCH TAB */}
        {page === "main" && tab === "search" && (
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #1f2937", background: "#090e19", flexShrink: 0 }}>
              <SearchBar onSearch={handleSearch} loading={searchLoading} />
              {searchErr && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, color: "#e53e3e", fontSize: 12 }}>
                  <Icon.AlertTri style={{ width: 14, height: 14 }} /> {searchErr} — is backend running at {API_BASE}?
                </div>
              )}
            </div>
            <div style={{ padding: "9px 24px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1f2937", flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: "#4b5563" }}>
                {galleryLoading ? "Loading…" : searched ? `${results.length} results` : `${allPhotos.length} photos indexed`}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {[["grid", Icon.Grid], ["map", Icon.MapIcon]].map(([id, Ico]) => (
                  <button key={id} onClick={() => setViewMode(id)}
                    style={{ background: viewMode === id ? "#1f2937" : "none", border: viewMode === id ? "1px solid #374151" : "1px solid transparent", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: viewMode === id ? "#e2e8f0" : "#4b5563" }}>
                    <Ico style={{ width: 14, height: 14 }} />
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, padding: "18px 24px", overflow: "auto" }}>
              {searchLoading && <LoadingState msg="Searching database…" />}
              {!searchLoading && viewMode === "grid" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                  {displayPhotos.map(p => <PhotoCard key={p._id} photo={p} onClick={setSelectedPhoto} />)}
                  {displayPhotos.length === 0 && searched && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#4b5563" }}>
                      <Icon.Search style={{ width: 32, height: 32, margin: "0 auto 12px", display: "block" }} />
                      No results. Try different terms or upload a face photo.
                    </div>
                  )}
                  {displayPhotos.length === 0 && !searched && !galleryLoading && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#4b5563" }}>
                      <Icon.ImageIcon style={{ width: 32, height: 32, margin: "0 auto 12px", display: "block" }} />
                      No photos in database yet.
                    </div>
                  )}
                </div>
              )}
              {!searchLoading && viewMode === "map" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, height: "calc(100vh - 280px)", minHeight: 400 }}>
                  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1f2937" }}>
                    <LocationMap points={mapPts} selectedPoint={mapSel} onPointClick={p => { setMapSel(p); setSelectedPhoto(p); }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                    <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "monospace", marginBottom: 4 }}>GEOTAGGED ({mapPts.length})</div>
                    {mapPts.map((p, i) => (
                      <div key={p._id} onClick={() => { setMapSel(p); setSelectedPhoto(p); }}
                        style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: mapSel?._id === p._id ? "#1a2e1a" : "#111827", border: `1px solid ${mapSel?._id === p._id ? "#166534" : "#1f2937"}`, borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#e53e3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.description || "No description"}</div>
                          <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "monospace" }}>{fmt.date(p.created_at)}</div>
                        </div>
                      </div>
                    ))}
                    {mapPts.length === 0 && <div style={{ color: "#4b5563", fontSize: 12, textAlign: "center", padding: 24 }}>No geotagged photos.</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NETWORK GRAPH TAB */}
        {page === "main" && tab === "graph" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 12, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <Icon.Network style={{ width: 18, height: 18, color: "#818cf8" }} />
              <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>CO-OCCURRENCE NETWORK</span>
              <span style={{ fontSize: 12, color: "#4b5563" }}>who appears together in photos</span>
              <Pill label={`${allPhotos.length} photos`} color="#818cf8" />
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {galleryLoading ? <LoadingState msg="Building network…" /> : <CoOccurrenceGraph photos={allPhotos} onPersonClick={openPerson} />}
            </div>
          </div>
        )}

        {/* HEATMAP TAB */}
        {page === "main" && tab === "heatmap" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 14, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <Icon.Heatmap style={{ width: 18, height: 18, color: "#e53e3e" }} />
              <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>LOCATION DENSITY HEATMAP</span>
              <span style={{ fontSize: 12, color: "#4b5563" }}>geographic photo concentration</span>
              <Pill label={`${heatPts.length} geotagged`} color="#e53e3e" />
            </div>
            <div style={{ flex: 1, minHeight: 0, borderRadius: 12, overflow: "hidden", border: "1px solid #1f2937" }}>
              {galleryLoading ? <LoadingState msg="Plotting coordinates…" /> : <HeatmapCanvas points={heatPts} />}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, flexShrink: 0 }}>
              {[
                ["Total Photos", allPhotos.length, "#60a5fa"],
                ["Geotagged", heatPts.length, "#e53e3e"],
                ["Unique Persons", [...new Set(allPhotos.flatMap(p => (p.persons_present || [])))].length, "#f6ad10"],
                ["With Faces", allPhotos.filter(p => (p.ai_info || []).length > 0).length, "#4ade80"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "monospace" }}>{val}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GEOFENCES TAB */}
        {page === "main" && tab === "geofence" && (
          <div style={{ flex: 1, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
            <GeofencePanel allPhotos={allPhotos} />
          </div>
        )}

        {/* ALERTS TAB */}
        {page === "main" && tab === "alerts" && (
          <div style={{ flex: 1, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
            <AlertsPanel allPhotos={allPhotos} onAlertPhotoClick={p => { setSelectedPhoto(p); }} />
          </div>
        )}
      </div>

      {/* PHOTO MODAL */}
      <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} onPersonClick={openPerson} personCtx={personCtx} />
    </div>
  );
}