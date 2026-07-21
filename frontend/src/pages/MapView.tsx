import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { getDepots, getOrders, getZones, runKMeans, runDBSCAN } from '../services/api';
import { Warehouse, Package, MapPin, Play, Settings, Search, BarChart3 } from 'lucide-react';

function HeatmapLayer({ points }: { points: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heatPoints = points.map(p => [p.latitude, p.longitude, 1]);
    const heatLayer = (L as any).heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 10, minOpacity: 0.4 });
    heatLayer.addTo(map);
    return () => { map.removeLayer(heatLayer); };
  }, [map, points]);
  return null;
}

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const depotIcon = L.divIcon({
  html: `<div style="background:linear-gradient(135deg,#FF5722,#E64A19);width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 4px 12px rgba(255,87,34,0.5)"></div>`,
  iconSize: [30, 30], iconAnchor: [15, 30], className: '',
});

const makeOrderIcon = (color: string) => L.divIcon({
  html: `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${color}80"></div>`,
  iconSize: [10, 10], iconAnchor: [5, 5], className: '',
});

const courierIcon = L.divIcon({
  html: `<div style="background:#ffb5a0;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(255,181,160,0.8);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:#FF5722;border-radius:50%;"></div></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], className: '',
});

const CLUSTER_COLORS = ['#FF5722','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899','#84CC16','#6366F1'];

function FitBounds({ depots }: { depots: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (depots.length > 0) {
      const bounds = L.latLngBounds(depots.map(d => [d.latitude, d.longitude]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [depots]);
  return null;
}

export default function MapView() {
  const [depots,        setDepots]        = useState<any[]>([]);
  const [orders,        setOrders]        = useState<any[]>([]);
  const [zones,         setZones]         = useState<any[]>([]);
  const [clusterPoints, setClusterPoints] = useState<any[]>([]);
  const [algorithm,     setAlgorithm]     = useState<'kmeans' | 'dbscan'>('kmeans');
  const [nClusters,     setNClusters]     = useState(5);
  const [eps,           setEps]           = useState(30);
  const [minSamples,    setMinSamples]    = useState(3);
  const [loading,       setLoading]       = useState(true);
  const [running,       setRunning]       = useState(false);
  const [result,        setResult]        = useState<string>('');
  const [showOrders,    setShowOrders]    = useState(true);
  const [showDepots,    setShowDepots]    = useState(true);
  const [showHeatmap,   setShowHeatmap]   = useState(false);
  const [liveCouriers,  setLiveCouriers]  = useState<any[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [courierRoute, setCourierRoute] = useState<[number, number][] | null>(null);

  // Fetch OSRM Route
  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const res = await fetch(`http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        // GeoJSON uses [lon, lat], Leaflet uses [lat, lon]
        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        setCourierRoute(coords);
      } else {
        setCourierRoute(null);
      }
    } catch (e) {
      console.error('OSRM fetch error:', e);
      setCourierRoute(null);
    }
  };

  // Handle Courier Selection
  const handleSelectCourier = (c: any) => {
    if (selectedCourierId === c.id) {
      setSelectedCourierId(null);
      setCourierRoute(null);
    } else {
      setSelectedCourierId(c.id);
      if (c.target_lat && c.target_lon) {
        fetchRoute([c.lat, c.lng], [c.target_lat, c.target_lon]);
      } else {
        setCourierRoute(null);
      }
    }
  };

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/api/ws/couriers');
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'COURIER_LOCATION_UPDATE') setLiveCouriers(message.data);
      } catch (err) {}
    };
    return () => { ws.close(); };
  }, []);

  useEffect(() => {
    Promise.all([getDepots({ is_active: true }), getOrders({ limit: 200 }), getZones()])
      .then(([d, o, z]) => { setDepots(d.data); setOrders(o.data); setZones(z.data); })
      .finally(() => setLoading(false));
  }, []);

  const runAlgorithm = async () => {
    setRunning(true);
    setResult('');
    try {
      let res;
      if (algorithm === 'kmeans') {
        res = await runKMeans({ n_clusters: nClusters });
      } else {
        res = await runDBSCAN({ eps, min_samples: minSamples });
      }
      setClusterPoints(res.data.points);
      setZones(res.data.zones);
      setResult(res.data.message);
    } catch (e: any) {
      setResult(e.response?.data?.detail ?? 'Hata oluştu');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Operations Map</div>
          <div className="topbar-subtitle">İnteraktif Türkiye teslimat haritası — canlı izleme</div>
        </div>
      </div>

      {/* Full-height map canvas */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden', background: '#0a0a0a' }}>

        {/* ── Left floating panel ── */}
        <div style={{
          position: 'absolute',
          left: 16,
          top: 16,
          bottom: 16,
          width: 280,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'none',
        }}>
          {/* Search */}
          <div className="map-glass-panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              className="form-input"
              style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 13 }}
              placeholder="Konum, sipariş veya araç ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Layers panel */}
          <div className="map-glass-panel" style={{ padding: 16, pointerEvents: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Geist Mono', monospace", marginBottom: 12 }}>
              Katmanlar
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Depolar',           icon: Warehouse, checked: showDepots,   onChange: setShowDepots },
                { label: 'Sipariş Noktaları', icon: Package,   checked: showOrders,   onChange: setShowOrders },
                { label: 'Yoğunluk Haritası', icon: MapPin,    checked: showHeatmap,  onChange: setShowHeatmap },
              ].map(({ label, icon: Icon, checked, onChange }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `1.5px solid ${checked ? 'var(--accent-orange)' : 'var(--border)'}`,
                    background: checked ? 'rgba(255,87,34,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}>
                    {checked && <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-orange)' }} />}
                  </div>
                  <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
                  <Icon size={13} style={{ color: checked ? 'var(--accent-orange-light)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: 13, color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Algorithm panel */}
          <div className="map-glass-panel" style={{ padding: 16, pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Settings size={14} style={{ color: 'var(--accent-orange-light)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Geist Mono', monospace" }}>
                Kümeleme
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Algoritma</label>
              <select className="form-select" value={algorithm} onChange={e => setAlgorithm(e.target.value as any)}>
                <option value="kmeans">K-Means</option>
                <option value="dbscan">DBSCAN</option>
              </select>
            </div>

            {algorithm === 'kmeans' ? (
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Küme Sayısı (k): <span style={{ color: 'var(--accent-orange-light)' }}>{nClusters}</span></label>
                <input
                  type="range" min={2} max={15} value={nClusters}
                  onChange={e => setNClusters(+e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--accent-orange)' }}
                />
              </div>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Yarıçap (km): <span style={{ color: 'var(--accent-orange-light)' }}>{eps}</span></label>
                  <input type="range" min={5} max={100} value={eps} onChange={e => setEps(+e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-orange)' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Min Örnek: <span style={{ color: 'var(--accent-orange-light)' }}>{minSamples}</span></label>
                  <input type="range" min={2} max={15} value={minSamples} onChange={e => setMinSamples(+e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-orange)' }} />
                </div>
              </>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={runAlgorithm}
              disabled={running}
              style={{ justifyContent: 'center' }}
            >
              <Play size={13} />
              {running ? 'Çalışıyor...' : 'Algoritmayı Çalıştır'}
            </button>

            {result && (
              <div style={{
                marginTop: 12, padding: '10px 12px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 8, fontSize: 12,
                color: 'var(--accent-green)', lineHeight: 1.5,
              }}>
                {result}
              </div>
            )}
          </div>

          {/* Legend — pushed to bottom */}
          <div className="map-glass-panel" style={{ padding: 16, marginTop: 'auto', pointerEvents: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Geist Mono', monospace", marginBottom: 12 }}>
              Harita Lejantı
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { dot: <Warehouse size={15} style={{ color: 'var(--accent-orange-light)' }} />, label: 'Bölge Deposu' },
                { dot: <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-orange)', boxShadow: '0 0 8px var(--accent-orange)', display: 'inline-block' }} />, label: 'Aktif Sipariş' },
                { dot: <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', display: 'inline-block' }} />, label: 'Teslim Edildi' },
                { dot: <span style={{ width: 14, height: 14, border: '1px solid var(--accent-orange)', background: 'rgba(255,87,34,0.15)', borderRadius: 3, display: 'inline-block' }} />, label: 'Hizmet Bölgesi' },
              ].map(({ dot, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{dot}</div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right floating panel — Active Fleet ── */}
        <div style={{
          position: 'absolute',
          right: 16,
          top: 16,
          bottom: 16,
          width: 300,
          zIndex: 1000,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div className="map-glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Panel header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Hanken Grotesk', sans-serif" }}>Aktif Filo</div>
              <span className="chip chip-on-duty" style={{ fontSize: 10 }}>
                <span className="chip-dot pulse" />
                {liveCouriers.length || 24} Online
              </span>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)', flexShrink: 0 }}>
              {[
                { label: 'Depolar',    value: depots.length },
                { label: 'Siparişler', value: orders.length },
                { label: 'Bölgeler',   value: zones.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 12px', background: 'var(--surface-container)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-orange-light)', fontFamily: "'Hanken Grotesk', sans-serif" }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Geist Mono', monospace" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Courier list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Live couriers from WS */}
              {liveCouriers.map(c => (
                <div key={`live-${c.id}`} style={{
                  background: 'var(--surface-high)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--accent-orange-light)' }}>📍</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                    </div>
                    <span className="chip chip-on-duty" style={{ fontSize: 9 }}>Canlı</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Durum: {c.status}</div>
                  {c.target_lat && c.target_lon && (
                    <div style={{ fontSize: 10, color: 'var(--accent-blue-light)' }}>Aktif Teslimat Rotası Mevcut</div>
                  )}
                  {selectedCourierId !== c.id && c.target_lat && (
                     <button className="btn btn-secondary btn-sm" style={{marginTop: 6, width: '100%', fontSize: 10}} onClick={() => handleSelectCourier(c)}>
                       Rotayı Çiz
                     </button>
                  )}
                  {selectedCourierId === c.id && (
                     <button className="btn btn-primary btn-sm" style={{marginTop: 6, width: '100%', fontSize: 10}} onClick={() => handleSelectCourier(c)}>
                       Rotayı Gizle
                     </button>
                  )}
                </div>
              ))}

              {/* Fallback demo cards when no WS data */}
              {liveCouriers.length === 0 && [
                { id: 'TR-402', icon: '🚛', status: 'In Transit', eta: '14 dk', progress: 75, dest: 'Sector 7G, Kuzey', color: 'var(--accent-orange-light)' },
                { id: 'MC-118', icon: '🏍️', status: 'Delivering',  eta: 'Ulaştı',  progress: 100, dest: 'Şehir Merkezi',    color: 'var(--accent-green)' },
                { id: 'TR-899', icon: '🚛', status: 'Loading',     eta: '—',       progress: 10,  dest: 'Depo – Yükleme',  color: 'var(--accent-amber)' },
                { id: 'VN-031', icon: '🚐', status: 'In Transit', eta: '28 dk', progress: 45, dest: 'Kadıköy, İstanbul', color: 'var(--accent-orange-light)' },
                { id: 'TR-207', icon: '🚛', status: 'Returning',   eta: '8 dk',  progress: 88, dest: 'Ana Depo',         color: 'var(--accent-green)' },
              ].map(item => (
                <div key={item.id} style={{
                  background: 'var(--surface-high)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-orange)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{item.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, fontFamily: "'Geist Mono', monospace", color: 'var(--text-primary)' }}>{item.id}</span>
                    </div>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 99,
                      background: `${item.color}15`, color: item.color,
                      border: `1px solid ${item.color}30`,
                      fontFamily: "'Geist Mono', monospace", fontWeight: 600, textTransform: 'uppercase',
                    }}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.dest}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>ETA: {item.eta}</span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'var(--surface-highest)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${item.progress}%`,
                      background: `linear-gradient(90deg, ${item.color}, ${item.color}99)`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}

              {/* Zones section */}
              {zones.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Geist Mono', monospace", marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BarChart3 size={12} /> Bölgeler ({zones.length})
                  </div>
                  {zones.map((z, i) => (
                    <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(46,46,46,0.5)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color ?? CLUSTER_COLORS[i % CLUSTER_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{z.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MAP ── */}
        {!loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <MapContainer
              center={[39.0, 35.0]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
              />
              {depots.length > 0 && <FitBounds depots={depots} />}

              {/* Depots */}
              {showDepots && depots.map((d) => (
                <Marker key={`depot-${d.id}`} position={[d.latitude, d.longitude]} icon={depotIcon}>
                  <Popup>
                    <div style={{ fontFamily: 'Hanken Grotesk, Inter, sans-serif', minWidth: 180, color: '#e5e2e1', background: '#1a1a1a', margin: -15, padding: 14, borderRadius: 8 }}>
                      <strong style={{ fontSize: 13, color: '#ffb5a0' }}>{d.name}</strong><br />
                      <span style={{ fontSize: 11, color: '#ab8980' }}>Kod: {d.code}</span><br />
                      <span style={{ fontSize: 11 }}>Kapasite: {d.capacity?.toLocaleString()}</span><br />
                      <span style={{ fontSize: 11 }}>Kurye: {d.courier_count}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Orders */}
              {showOrders && clusterPoints.length > 0
                ? clusterPoints.map((p) => (
                    <Marker
                      key={`cp-${p.order_id}`}
                      position={[p.latitude, p.longitude]}
                      icon={makeOrderIcon(CLUSTER_COLORS[p.cluster_id % CLUSTER_COLORS.length])}
                    />
                  ))
                : showOrders && orders.map((o) => (
                    <Marker key={`order-${o.id}`} position={[o.latitude, o.longitude]} icon={makeOrderIcon('#FF5722')}>
                      <Popup>
                        <div style={{ fontFamily: 'Hanken Grotesk, Inter, sans-serif' }}>
                          <strong style={{ fontSize: 12 }}>{o.tracking_number}</strong><br />
                          <span style={{ fontSize: 11 }}>{o.customer_name}</span><br />
                          <span style={{ fontSize: 11, color: '#666' }}>{o.province_name}</span>
                        </div>
                      </Popup>
                    </Marker>
                  ))
              }

              {/* Zone circles */}
              {zones.map((z, i) => z.center_lat && z.center_lon && (
                <Circle
                  key={`zone-${z.id}`}
                  center={[z.center_lat, z.center_lon]}
                  radius={eps * 1000 || 30000}
                  pathOptions={{
                    color: z.color ?? CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                    fillOpacity: 0.08,
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <strong>{z.name}</strong><br />
                    <span style={{ fontSize: 11 }}>Algoritma: {z.algorithm?.toUpperCase()}</span>
                  </Popup>
                </Circle>
              ))}

              {/* Live couriers */}
              {liveCouriers.map((c) => (
                <Marker key={`courier-${c.id}`} position={[c.lat, c.lng]} icon={courierIcon}
                  eventHandlers={{ click: () => handleSelectCourier(c) }}>
                  <Popup>
                    <strong>{c.name}</strong><br />
                    <span style={{ fontSize: 11 }}>Durum: {c.status}</span><br />
                    {c.target_lat && <span style={{ fontSize: 11, color: 'green' }}>Hedefe İlerliyor</span>}
                  </Popup>
                </Marker>
              ))}

              {/* OSRM Route Polyline */}
              {selectedCourierId && courierRoute && (
                <Polyline positions={courierRoute} pathOptions={{ color: '#06B6D4', weight: 4, opacity: 0.8, dashArray: '10, 10' }} />
              )}
              {selectedCourierId && liveCouriers.find(c => c.id === selectedCourierId)?.target_lat && (
                <Marker 
                  position={[
                    liveCouriers.find(c => c.id === selectedCourierId)!.target_lat,
                    liveCouriers.find(c => c.id === selectedCourierId)!.target_lon
                  ]} 
                  icon={makeOrderIcon('#06B6D4')}
                >
                  <Popup>Hedef Noktası</Popup>
                </Marker>
              )}

              {/* Heatmap */}
              {showHeatmap && <HeatmapLayer points={orders} />}
            </MapContainer>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
            <div className="loading-center">
              <div className="spinner" />
              <span>Harita yükleniyor...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
