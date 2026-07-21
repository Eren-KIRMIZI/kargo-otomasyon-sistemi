import React, { useEffect, useState } from 'react';
import { Package, Truck, CheckCircle, Clock, Search, AlertCircle, ArrowRight, TrendingUp, Home, Briefcase, Heart, Calculator } from 'lucide-react';
import { getCustomerStats, getCustomerOrders, trackOrder, getTariffs } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Bekliyor',      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  in_transit:        { label: 'Taşımada',      color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  out_for_delivery:  { label: 'Dağıtımda',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  delivered:         { label: 'Teslim Edildi', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  failed:            { label: 'Başarısız',     color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

export default function CustomerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [tariffs, setTariffs] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([getCustomerStats(), getCustomerOrders({ limit: 5 }), getTariffs()])
      .then(([sRes, oRes, tRes]) => {
        setStats(sRes.data);
        setRecentOrders(oRes.data);
        setTariffs(tRes.data);
      })
      .catch(console.error);
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await trackOrder(trackInput.trim());
      setTrackResult(res.data);
    } catch {
      setTrackError('Kargo bulunamadı. Takip numarasını kontrol edin.');
    } finally {
      setTrackLoading(false);
    }
  };

  const statCards = [
    { label: 'Toplam Kargo',  value: stats?.total ?? 0,      icon: Package,     color: '#FF5722', change: 'Kayıtlı Gönderi', highlight: true },
    { label: 'Yolda',         value: stats?.in_transit ?? 0, icon: Truck,       color: '#3B82F6', change: 'Dağıtım Bekleyen' },
    { label: 'Teslim Edildi', value: stats?.delivered ?? 0,  icon: CheckCircle, color: '#10B981', change: 'Başarılı Teslimat' },
    { label: 'Beklemede',     value: stats?.pending ?? 0,    icon: Clock,       color: '#F59E0B', change: 'Şubede Bekliyor' },
  ];

  const [calcFrom, setCalcFrom] = useState('');
  const [calcTo, setCalcTo] = useState('');
  const [calcWeight, setCalcWeight] = useState('');
  const [calcResult, setCalcResult] = useState<string | null>(null);

  const handleCalc = (e: React.FormEvent) => {
    e.preventDefault();
    if (calcFrom && calcTo && calcWeight) {
      const weight = parseFloat(calcWeight);
      if (!isNaN(weight)) {
        const activeTariff = tariffs.find(t => t.is_active) || { base_price: 65, price_per_kg: 18.5 };
        const basePrice = activeTariff.base_price;
        const pricePerKg = activeTariff.price_per_kg;
        const total = basePrice + (weight * pricePerKg);
        setCalcResult(`₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Hoş Geldiniz, {user?.username} 👋</div>
          <div className="topbar-subtitle">Kargolarınızın güncel durumu ve özet bilgiler</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/customer/orders')} style={{ marginLeft: 'auto' }}>
          <Package size={14} /> Yeni Gönderi
        </button>
      </div>

      <div className="page-content">
        {/* İstatistik Kartları */}
        <div className="kpi-grid">
          {statCards.map((k, i) => (
            <div key={i} className="kpi-card" style={{ '--kpi-color': k.color } as any}>
              <div className="kpi-icon" style={{ background: `${k.color}18`, color: k.color }}>
                <k.icon size={22} />
              </div>
              <div className={`kpi-value ${k.highlight ? 'highlight' : ''}`}>{k.value}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-change neutral">
                <TrendingUp size={11} /> {k.change}
              </div>
            </div>
          ))}
        </div>

        {/* Yeni: Favori Adresler ve Kargo Ücret Hesaplama */}
        <div className="grid-2 mb-6" style={{ gap: 24 }}>
          {/* Favori Adresler */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
              <div>
                <div className="card-title"><Heart size={16} className="text-red" /> Hızlı Gönderi: Favori Adresler</div>
                <div className="card-subtitle">Tek tıkla yeni kargo oluşturun</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, flex: 1 }}>
              <button className="card" onClick={() => navigate('/customer/addresses')} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Home size={20} className="text-blue" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Ev</span>
              </button>
              <button className="card" onClick={() => navigate('/customer/addresses')} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={20} className="text-orange" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>İş Yeri</span>
              </button>
              <button className="card" onClick={() => navigate('/customer/addresses')} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={20} className="text-pink" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Aile</span>
              </button>
            </div>
          </div>

          {/* Kargo Ücret Hesaplama */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
              <div>
                <div className="card-title"><Calculator size={16} className="text-green" /> Kargo Ücret Hesaplama</div>
                <div className="card-subtitle">Gönderi öncesi tahmini fiyat alın</div>
              </div>
            </div>
            <form onSubmit={handleCalc} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="text" className="form-input" placeholder="Nereden (Örn: İstanbul)" value={calcFrom} onChange={e => setCalcFrom(e.target.value)} required />
                <input type="text" className="form-input" placeholder="Nereye (Örn: Ankara)" value={calcTo} onChange={e => setCalcTo(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="number" className="form-input" placeholder="Ağırlık (Kg)" style={{ width: 120 }} value={calcWeight} onChange={e => setCalcWeight(e.target.value)} min="0.1" step="0.1" required />
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>
                  Hesapla
                </button>
              </div>
            </form>
            {calcResult && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tahmini Ücret:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-green)' }}>{calcResult}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid-2 mb-6">
          {/* Hızlı Kargo Takip */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><Search size={16} className="text-blue" /> Hızlı Kargo Takip</div>
                <div className="card-subtitle">Gönderilerinizin anlık durumunu öğrenin</div>
              </div>
            </div>
            
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: trackResult || trackError ? 16 : 0 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Takip no girin (KRG...)"
                  value={trackInput}
                  onChange={e => setTrackInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={trackLoading} style={{ whiteSpace: 'nowrap' }}>
                {trackLoading ? 'Aranıyor...' : 'Sorgula'}
              </button>
            </form>

            {trackError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--accent-red)', fontSize: 13 }}>
                <AlertCircle size={15} /> {trackError}
              </div>
            )}

            {trackResult && (
              <div style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Takip No</div>
                    <div style={{ fontWeight: 700, fontFamily: "'Geist Mono', monospace", color: 'var(--accent-orange)' }}>{trackResult.tracking_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alıcı</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{trackResult.customer_name || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Durum</div>
                    <span className={`badge badge-${trackResult.status}`}>
                      {STATUS_MAP[trackResult.status]?.label || trackResult.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Son Siparişler Kısa Görünüm */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><Package size={16} className="text-orange" /> Son İşlemler</div>
                <div className="card-subtitle">Hesabınızdaki son kargo hareketleri</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/customer/orders')}>
                Tümü <ArrowRight size={13} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentOrders.slice(0, 4).map(order => (
                <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,87,34,0.1)', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={18} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{order.tracking_number}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{order.receiver_name || order.customer_name || 'Alıcı Belirtilmemiş'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`badge badge-${order.status}`}>
                      {STATUS_MAP[order.status]?.label || order.status}
                    </span>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleDateString('tr-TR')}</div>
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  Kayıtlı işlem bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tablo Görünümü */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Truck size={16} className="text-amber" /> Son Teslimatlar</div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Takip No</th>
                  <th>Alıcı</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id}>
                    <td><code style={{ fontSize: 12, color: 'var(--accent-blue-light)' }}>{order.tracking_number}</code></td>
                    <td style={{ fontWeight: 500 }}>{order.receiver_name || order.customer_name || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {new Date(order.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td>
                      <span className={`badge badge-${order.status}`}>
                        {STATUS_MAP[order.status]?.label || order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
