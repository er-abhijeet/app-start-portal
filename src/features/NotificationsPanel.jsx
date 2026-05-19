import { useState, useEffect } from "react";
const API_BASE = "http://localhost:5000";

const fmt = {
  datetime: (iso) => {
    if (!iso) return "Unknown";
    try { return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
    catch { return iso; }
  }
};

export default function NotificationsPanel({ onCountChange }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    fetch(`${API_BASE}/alerts`)
      .then(r => r.json())
      .then(data => {
        // Only show triggered alerts (those with type=geofence_trigger or triggered_at)
        const triggered = data.filter(a => a.type === "geofence_trigger" || a.triggered_at);
        setAlerts(triggered);
        const unseen = triggered.filter(a => !a.seen).length;
        onCountChange && onCountChange(unseen);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); const id = setInterval(fetchAlerts, 15000); return () => clearInterval(id); }, []);

  const markSeen = async (id) => {
    await fetch(`${API_BASE}/alerts/${id}/seen`, { method: "PATCH" });
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, seen: true } : a));
    const unseen = alerts.filter(a => a._id !== id && !a.seen).length;
    onCountChange && onCountChange(unseen);
  };

  const markAllSeen = async () => {
    await fetch(`${API_BASE}/alerts/mark-all-seen`, { method: "PATCH" });
    setAlerts(prev => prev.map(a => ({ ...a, seen: true })));
    onCountChange && onCountChange(0);
  };

  const deleteAlert = async (id) => {
    await fetch(`${API_BASE}/alerts/${id}`, { method: "DELETE" });
    const next = alerts.filter(a => a._id !== id);
    setAlerts(next);
    onCountChange && onCountChange(next.filter(a => !a.seen).length);
  };

  const unseen = alerts.filter(a => !a.seen).length;

  if (loading) return <div style={{ color: "#4b5563", textAlign: "center", padding: 40, fontFamily: "monospace" }}>Loading alerts...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
        <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "monospace", letterSpacing: 1 }}>
          GEOFENCE NOTIFICATIONS
        </div>
        {unseen > 0 && (
          <div style={{ background: "#e53e3e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, fontFamily: "monospace" }}>
            {unseen} NEW
          </div>
        )}
        {unseen > 0 && (
          <button onClick={markAllSeen}
            style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 6, border: "1px solid #374151", background: "#1f2937", color: "#9ca3af", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
            Mark all seen
          </button>
        )}
      </div>

      {alerts.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#4b5563", fontFamily: "monospace" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛡</div>
          <div>No geofence alerts triggered yet.</div>
          <div style={{ fontSize: 11, marginTop: 6, color: "#374151" }}>Create geofence rules in the Geofence tab.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
        {alerts.map(alert => (
          <div key={alert._id}
            onClick={() => !alert.seen && markSeen(alert._id)}
            style={{
              display: "flex", gap: 14, alignItems: "flex-start", padding: 14, borderRadius: 10,
              background: alert.seen ? "#0f1623" : "#1a0a0a",
              border: `1px solid ${alert.seen ? "#1f2937" : "#7f1d1d"}`,
              cursor: alert.seen ? "default" : "pointer",
              transition: "all 0.2s",
              animation: !alert.seen ? "pulse 2s infinite" : "none",
            }}
          >
            {alert.image_url && (
              <img src={alert.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "2px solid #374151", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {!alert.seen && (
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#e53e3e", animation: "ping 1s ease infinite", flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: alert.seen ? "#9ca3af" : "#fca5a5" }}>
                  🚨 {alert.person_label || "Unknown"} spotted in geofence
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>
                {alert.triggered_at ? fmt.datetime(alert.triggered_at) : fmt.datetime(alert.created_at)}
                {alert.lat != null && ` · ${parseFloat(alert.lat).toFixed(4)}, ${parseFloat(alert.lon).toFixed(4)}`}
                {alert.distance_km != null && ` · ${parseFloat(alert.distance_km).toFixed(2)}km from center`}
              </div>
              {alert.seen && (
                <div style={{ fontSize: 10, color: "#374151", fontFamily: "monospace", marginTop: 4 }}>● Seen</div>
              )}
            </div>
            <button onClick={e => { e.stopPropagation(); deleteAlert(alert._id); }}
              style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", padding: 4, flexShrink: 0 }}
              title="Dismiss">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
