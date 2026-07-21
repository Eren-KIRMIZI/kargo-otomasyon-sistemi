import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { getLiveVehicles, getLiveTrackingStats } from '../services/api';
import { Package, Truck, Navigation, Search, MapPin } from 'lucide-react';

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getVehicleIcon = (type: string, color: string) => {
  let emoji = '🚐';
  if (type === 'truck') emoji = '🚛';
  if (type === 'motorcycle') emoji = '🏍️';

  return L.divIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px ${color}80;display:flex;align-items:center;justify-content:center;font-size:14px;">${emoji}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], className: '',
  });
};

const targetIcon = L.divIcon({
  html: `<div style="background:#06B6D4;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px #06B6D480"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6], className: '',
});

export default function LiveTracking() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [liveCouriers, setLiveCouriers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);

  useEffect(() => {
    Promise.all([getLiveVehicles(), getLiveTrackingStats()])
      .then(([vRes, sRes]) => {
        setVehicles(vRes.data);
        setStats(sRes.data);
      })
      .finally(() => setLoading(false));

    const ws = new WebSocket('ws://localhost:8000/api/ws/couriers');
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'COURIER_LOCATION_UPDATE') {
          setLiveCouriers(message.data);
        }
      } catch (err) {}
    };
    return () => { ws.close(); };
  }, []);

  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const res = await fetch(`http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        setRouteCoords(coords);
      } else {
        setRouteCoords(null);
      }
    } catch (e) {
      console.error('OSRM error:', e);
      setRouteCoords(null);
    }
  };

  const handleSelect = (courierData: any) => {
    if (selectedVehicleId === courierData.vehicle?.id) {
      setSelectedVehicleId(null);
      setRouteCoords(null);
    } else {
      setSelectedVehicleId(courierData.vehicle?.id);
      if (courierData.target_lat && courierData.target_lon) {
        fetchRoute([courierData.lat, courierData.lng], [courierData.target_lat, courierData.target_lon]);
      } else {
        setRouteCoords(null);
      }
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Canlı Araç Takibi</div>
          <div className="topbar-subtitle">Filo araçları, paket durumu ve tahmini varış süresi izleme</div>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden', background: '#0a0a0a' }}>
        
        {/* Right Panel */}
        <div style={{
          position: 'absolute', right: 16, top: 16, bottom: 16, width: 340, zIndex: 1000,
          display: 'flex', flexDirection: 'column', pointerEvents: 'auto'
        }}>
          <div className="map-glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Hanken Grotesk', sans-serif" }}>Canlı Filo Durumu</div>
                <span className="chip chip-on-duty" style={{ fontSize: 11 }}>
                  <span className="chip-dot pulse" /> {liveCouriers.length} Online
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-high)', padding: '8px 12px', borderRadius: 8 }}>
                <Search size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: 13 }}
                  placeholder="Plaka veya kurye ara..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)' }}>
               <div style={{ padding: '12px', background: 'var(--surface-container)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-blue-light)', fontFamily: "'Hanken Grotesk', sans-serif" }}>{stats?.active_vehicles || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktif Araç</div>
               </div>
               <div style={{ padding: '12px', background: 'var(--surface-container)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-orange-light)', fontFamily: "'Hanken Grotesk', sans-serif" }}>{stats?.active_packages || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dağıtımda Paket</div>
               </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {liveCouriers.filter(c => c.vehicle && (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()))).map(c => (
                <div key={c.id} style={{
                  background: selectedVehicleId === c.vehicle.id ? 'var(--surface-highest)' : 'var(--surface-high)',
                  border: `1px solid ${selectedVehicleId === c.vehicle.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                  borderRadius: 12, padding: 14, cursor: 'pointer', transition: 'all 0.2s'
                }} onClick={() => handleSelect(c)}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{c.vehicle.type === 'truck' ? '🚛' : c.vehicle.type === 'motorcycle' ? '🏍️' : '🚐'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{c.vehicle.plate}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Kurye: {c.name}</div>
                        {c.city && (
                          <div style={{ marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)', fontFamily: "'Geist Mono', monospace" }}>
                            📍 {c.city}
                          </div>
                        )}
                      </div>
                    </div>
                    {c.eta && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-orange-light)', background: 'rgba(255,87,34,0.1)', padding: '4px 8px', borderRadius: 6 }}>
                        ETA: {c.eta}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <Package size={14} /> {c.package_count || 0} Paket
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Doluluk: %{c.vehicle.load_pct || 0}</span>
                  </div>

                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99, width: `${c.vehicle.load_pct || 0}%`,
                      background: `linear-gradient(90deg, var(--accent-blue), #3B82F6)`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>

                  {c.target_lat && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent-green)' }}>
                      <Navigation size={12} /> Hedefe ilerliyor
                    </div>
                  )}

                </div>
              ))}

              {liveCouriers.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  Aktif kurye bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        {!loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <MapContainer center={[39.2, 35.5]} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              
              {liveCouriers.map(c => (
                <Marker key={`live-${c.id}`} position={[c.lat, c.lng]} icon={getVehicleIcon(c.vehicle?.type || 'van', selectedVehicleId === c.vehicle?.id ? '#3B82F6' : '#FF5722')}
                  eventHandlers={{ click: () => handleSelect(c) }}>
                  <Popup>
                    <div style={{ fontFamily: 'Hanken Grotesk, Inter, sans-serif' }}>
                      <strong style={{ fontSize: 14 }}>{c.vehicle?.plate || 'Bilinmiyor'}</strong><br />
                      <span style={{ fontSize: 12, color: '#666' }}>Kurye: {c.name}</span><br />
                      {c.city && <span style={{ fontSize: 12, color: '#3B82F6' }}>📍 {c.city}</span>}<br />
                      <span style={{ fontSize: 12 }}>Paket: {c.package_count || 0}</span><br />
                      {c.eta && <span style={{ fontSize: 12, color: '#F97316' }}>ETA: {c.eta}</span>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {selectedVehicleId && routeCoords && (
                <Polyline positions={routeCoords} pathOptions={{ color: '#06B6D4', weight: 4, opacity: 0.8 }} />
              )}

              {selectedVehicleId && liveCouriers.find(c => c.vehicle?.id === selectedVehicleId)?.target_lat && (
                <Marker 
                  position={[
                    liveCouriers.find(c => c.vehicle?.id === selectedVehicleId)!.target_lat,
                    liveCouriers.find(c => c.vehicle?.id === selectedVehicleId)!.target_lon
                  ]} 
                  icon={targetIcon}
                >
                  <Popup>Sıradaki Teslimat</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        )}

      </div>
    </>
  );
}
