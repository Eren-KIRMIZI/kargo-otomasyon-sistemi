import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Package, CheckCircle2, Clock, Truck, RotateCcw, AlertCircle, MapPin, ArrowLeft } from 'lucide-react';
import { trackOrder } from '../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const courierIcon = new L.DivIcon({
  className: 'custom-courier-icon',
  html: `<div style="background:var(--accent-orange); color:#fff; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:2px solid #fff; box-shadow:0 0 10px rgba(245,158,11,0.5);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const destIcon = new L.DivIcon({
  className: 'custom-dest-icon',
  html: `<div style="background:var(--accent-blue); width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 8px rgba(59,130,246,0.5);"></div>`,
  iconSize: [16,16],
  iconAnchor: [8,8]
});

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:          { label: 'Bekliyor',         color: '#94a3b8', icon: <Clock size={18}/> },
  in_transit:       { label: 'Taşımada',         color: '#f59e0b', icon: <Truck size={18}/> },
  out_for_delivery: { label: 'Dağıtımda',        color: '#3b82f6', icon: <Truck size={18}/> },
  delivered:        { label: 'Teslim Edildi',    color: '#10b981', icon: <CheckCircle2 size={18}/> },
  failed:           { label: 'Teslim Başarısız', color: '#ef4444', icon: <AlertCircle size={18}/> },
  returned:         { label: 'İade',             color: '#8b5cf6', icon: <RotateCcw size={18}/> },
};

export default function Tracking() {
  const [query, setQuery]     = useState('');
  const [result, setResult]   = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await trackOrder(query.trim().toUpperCase());
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Takip numarası bulunamadı.');
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = result ? STATUS_INFO[result.status] ?? { label: result.status, color: '#94a3b8', icon: <Package size={18}/> } : null;

  const location = useLocation();
  const isCustomerPanel = location.pathname.startsWith('/customer');

  return (
    <div style={{ 
      height: isCustomerPanel ? '100%' : '100vh', 
      overflowY: 'auto',
      background: 'var(--bg-primary)', 
      padding: isCustomerPanel ? '20px' : '40px 20px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      width: '100%'
    }}>
      {/* Header */}
      {!isCustomerPanel && (
        <a href="/" className="btn btn-secondary" style={{ position: 'absolute', top: 20, left: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, zIndex: 10 }}>
          <ArrowLeft size={14}/> Panele Dön
        </a>
      )}
      <div style={{ textAlign: 'center', marginBottom: 40, marginTop: isCustomerPanel ? 0 : 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16, background: 'var(--gradient-primary)', marginBottom: 16 }}>
          <Package size={32} color="#fff"/>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Kargo Takip</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Takip numaranızı girerek kargonuzun durumunu öğrenin</p>
      </div>

      {/* Search Box */}
      <div className="card" style={{ width: '100%', maxWidth: 620, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
            <input
              className="form-input"
              style={{ paddingLeft: 44, fontSize: 16, letterSpacing: '0.05em' }}
              placeholder="KRG1234567890"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading} style={{ minWidth: 120 }}>
            {loading ? 'Aranıyor...' : 'Sorgula'}
          </button>
        </div>
        {error && <p style={{ color: 'var(--accent-red)', marginTop: 12, fontSize: 14 }}>{error}</p>}
      </div>

      {/* Result */}
      {result && statusInfo && (
        <div className="card" style={{ width: '100%', maxWidth: 620, padding: 0, overflow: 'hidden' }}>
          {/* Status Banner */}
          <div style={{ background: `${statusInfo.color}20`, borderBottom: `2px solid ${statusInfo.color}40`, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: statusInfo.color }}>{statusInfo.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: statusInfo.color }}>{statusInfo.label}</div>
                <code style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'Geist Mono', monospace" }}>{result.tracking_number}</code>
              </div>
              {result.delivered_at && (
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Teslim Tarihi</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-green)' }}>
                    {format(new Date(result.delivered_at), 'dd MMMM yyyy HH:mm', { locale: tr })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gönderici</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{result.customer_name}</div>
            </div>
            {result.receiver_name && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Alıcı</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{result.receiver_name}</div>
              </div>
            )}
            {(result.province_name || result.district_name) && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Teslimat Yeri</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} color="var(--accent-orange-light)"/> {result.province_name}{result.district_name ? ` / ${result.district_name}` : ''}
                </div>
              </div>
            )}
            {result.estimated_delivery && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tahmini Teslimat</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                  {format(new Date(result.estimated_delivery), 'dd MMM yyyy', { locale: tr })}
                </div>
              </div>
            )}
          </div>

          {/* Live Map Module */}
          {(result.status === 'in_transit' || result.status === 'out_for_delivery') && (
            <div style={{ position: 'relative', width: '100%', height: 320, borderBottom: '1px solid var(--border-subtle)', background: '#111827' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 8, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <span className="live-dot" style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Son 10 km • Tahmini 14 Dk</span>
              </div>
              <MapContainer center={[41.0291, 28.9892]} zoom={13} style={{ height: '100%', width: '100%', background: '#111827', zIndex: 0 }} zoomControl={false} scrollWheelZoom={false}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                />
                <Polyline positions={[ [41.0082, 28.9784], [41.0200, 28.9850], [41.0291, 28.9892], [41.0400, 28.9950], [41.0500, 29.0000] ]} color="#3b82f6" weight={3} dashArray="8, 8" />
                <Marker position={[41.0291, 28.9892]} icon={courierIcon} />
                <Marker position={[41.0500, 29.0000]} icon={destIcon} />
              </MapContainer>
              <style>{`
                @keyframes pulse {
                  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129, 0.7); }
                  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16,185,129, 0); }
                  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129, 0); }
                }
              `}</style>
            </div>
          )}

          {/* Timeline */}
          {result.status_logs?.length > 0 && (
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Kargo Hareketleri</div>
              <div style={{ position: 'relative' }}>
                {[...result.status_logs].reverse().map((log: any, i: number) => {
                  const info = STATUS_INFO[log.status] ?? { color: '#94a3b8', label: log.status };
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: 16, marginBottom: 20, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: i === 0 ? info.color : 'var(--border-subtle)', border: `2px solid ${info.color}`, flexShrink: 0, zIndex: 1 }}/>
                        {i < result.status_logs.length - 1 && (
                          <div style={{ width: 2, flex: 1, background: 'var(--border-subtle)', marginTop: 4 }}/>
                        )}
                      </div>
                      <div style={{ paddingBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: i === 0 ? info.color : 'var(--text-primary)' }}>{info.label}</div>
                        {log.location_note && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{log.location_note}</div>}
                        {log.note && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{log.note}</div>}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: "'Geist Mono', monospace" }}>
                          {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
