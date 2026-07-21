import { useEffect, useState } from 'react';
import { getCouriers, getDepots } from '../services/api';
import { Search, Phone, Mail, MapPin, Star, Package, Users, Route, X, DollarSign, Activity, AlertCircle, Clock, ChevronRight, Briefcase } from 'lucide-react';


const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: 'Motosiklet',
  car:        'Otomobil',
  van:        'Minivan',
  truck:      'Kamyon',
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusChip({ status }: { status: string }) {
  if (status === 'on_delivery') {
    return (
      <span className="chip chip-on-duty">
        <span className="chip-dot pulse" />
        <Route size={11} />
        Dağıtımda
      </span>
    );
  }
  if (status === 'available') {
    return (
      <span className="chip chip-delivering">
        Müsait
      </span>
    );
  }
  return (
    <span className="chip chip-off-duty">
      Mesai Dışı
    </span>
  );
}

export default function Couriers() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [depots,   setDepots]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [depotFilter,  setDepotFilter]  = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedCourier, setSelectedCourier] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([
        getCouriers({ status: statusFilter || undefined, depot_id: depotFilter ? Number(depotFilter) : undefined }),
        getDepots(),
      ]);
      setCouriers(c.data);
      if (depots.length === 0) setDepots(d.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter, depotFilter]);

  const filtered = couriers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.vehicle_plate && c.vehicle_plate.toLowerCase().includes(search.toLowerCase()))
  );

  const onDutyCount  = couriers.filter(c => c.status === 'on_delivery').length;
  const availCount   = couriers.filter(c => c.status === 'available').length;
  const offDutyCount = couriers.filter(c => c.status === 'off_duty').length;

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Fleet Command</div>
          <div className="topbar-subtitle">Kurye ve personel durumu — anlık izleme</div>
        </div>
      </div>

      <div className="page-content">
        {/* KPI Mini-Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-orange)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(255,87,34,0.1)', color: 'var(--accent-orange-light)' }}>
              <Users size={22} />
            </div>
            <div className="kpi-value highlight">{couriers.length}</div>
            <div className="kpi-label">Toplam Kurye</div>
            <div className="kpi-change neutral">Kayıtlı personel</div>
          </div>

          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-orange)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(255,87,34,0.1)', color: 'var(--accent-orange-light)' }}>
              <Route size={22} />
            </div>
            <div className="kpi-value">{onDutyCount}</div>
            <div className="kpi-label">Aktif Dağıtımda</div>
            <div className="kpi-change up">Sahada</div>
          </div>

          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-green)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>
              <Users size={22} />
            </div>
            <div className="kpi-value">{availCount}</div>
            <div className="kpi-label">Müsait Kurye</div>
            <div className="kpi-change up">Dispatch'e hazır</div>
          </div>

          <div className="kpi-card" style={{ '--kpi-color': '#64748b' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(100,116,139,0.1)', color: '#94A3B8' }}>
              <Users size={22} />
            </div>
            <div className="kpi-value">{offDutyCount}</div>
            <div className="kpi-label">Mesai Dışı</div>
            <div className="kpi-change neutral">Aktif değil</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group search-wrapper">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Kurye adı veya plaka..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="form-group">
              <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Tüm Durumlar</option>
                <option value="available">Müsait</option>
                <option value="on_delivery">Dağıtımda</option>
                <option value="off_duty">Mesai Dışı</option>
              </select>
            </div>
            <div className="form-group">
              <select className="form-select" value={depotFilter} onChange={e => setDepotFilter(e.target.value)}>
                <option value="">Tüm Depolar</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('cards')}
              >
                Kartlar
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('table')}
              >
                Tablo
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            <span>Kuryeler yükleniyor...</span>
          </div>
        ) : viewMode === 'cards' ? (
          /* ── CARD VIEW ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {filtered.map(c => {
              const isActive = c.status === 'on_delivery';
              return (
                <div key={c.id} className={`courier-card ${isActive ? 'on-duty' : ''}`}>
                  {/* Avatar */}
                  <div className="courier-avatar">
                    <div className="courier-avatar-initials">{getInitials(c.name)}</div>
                    <div className={`courier-status-dot ${isActive ? 'active' : 'idle'}`} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Hanken Grotesk', sans-serif" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>ID #{c.id} · {VEHICLE_LABELS[c.vehicle_type] ?? c.vehicle_type}</div>
                      </div>
                      <StatusChip status={c.status} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                      {c.depot_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <MapPin size={12} style={{ color: 'var(--accent-orange-light)', flexShrink: 0 }} />
                          {c.depot_name}
                        </div>
                      )}
                      {c.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                          <Phone size={12} style={{ flexShrink: 0 }} />
                          {c.phone}
                        </div>
                      )}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      {c.vehicle_plate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: "'Geist Mono', monospace", color: 'var(--text-muted)' }}>
                          <span style={{ padding: '1px 6px', background: 'var(--surface-high)', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            {c.vehicle_plate}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent-orange-light)', marginLeft: 'auto' }}>
                        <Star size={12} fill="currentColor" />
                        <span style={{ fontWeight: 600 }}>4.8</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                        <Package size={12} />
                        <span>{c.daily_delivery_limit} lim.</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setSelectedCourier(c)}>
                        Detaylar <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div>Kurye bulunamadı.</div>
              </div>
            )}
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Kurye</th>
                  <th>İletişim</th>
                  <th>Depo</th>
                  <th>Araç</th>
                  <th>Durum</th>
                  <th>Günlük Limit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--surface-high)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, color: 'var(--accent-orange-light)',
                          flexShrink: 0,
                        }}>
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: #{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Phone size={11} style={{ color: 'var(--text-muted)' }} /> {c.phone}
                        </div>
                        {c.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
                            <Mail size={11} /> {c.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <MapPin size={13} style={{ color: 'var(--accent-orange-light)' }} />
                        {c.depot_name}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontSize: 13 }}>{VEHICLE_LABELS[c.vehicle_type] ?? c.vehicle_type}</div>
                        <code style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace" }}>{c.vehicle_plate}</code>
                      </div>
                    </td>
                    <td>
                      <StatusChip status={c.status} />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-orange-light)', fontFamily: "'Geist Mono', monospace" }}>
                      {c.daily_delivery_limit}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      Kurye bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Drawer */}
      {selectedCourier && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedCourier(null)} />
          <div className="drawer">
            <div className="drawer-header">
              <div className="drawer-title">{selectedCourier.name} - Detaylar</div>
              <button className="drawer-close" onClick={() => setSelectedCourier(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {/* Personel Bilgileri */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Users size={15} className="text-orange" /> Personel Bilgileri</div>
                <div className="drawer-row"><span className="drawer-label">Ad Soyad</span><span className="drawer-value">{selectedCourier.name}</span></div>
                <div className="drawer-row"><span className="drawer-label">Personel No</span><span className="drawer-value">P-{selectedCourier.id.toString().padStart(4, '0')}</span></div>
                <div className="drawer-row"><span className="drawer-label">TC Kimlik</span><span className="drawer-value">123****890</span></div>
                <div className="drawer-row"><span className="drawer-label">Telefon</span><span className="drawer-value">{selectedCourier.phone}</span></div>
                <div className="drawer-row"><span className="drawer-label">E-posta</span><span className="drawer-value">{selectedCourier.email || '-'}</span></div>
                <div className="drawer-row"><span className="drawer-label">İşe Giriş Tarihi</span><span className="drawer-value">12.01.2024</span></div>
                <div className="drawer-row"><span className="drawer-label">Çalışma Tipi</span><span className="drawer-value">Tam Zamanlı</span></div>
                <div className="drawer-row"><span className="drawer-label">Bağlı Depo</span><span className="drawer-value">{selectedCourier.depot_name || '-'}</span></div>
                <div className="drawer-row"><span className="drawer-label">Vardiya</span><span className="drawer-value">08:00 - 17:00</span></div>
              </div>

              {/* Maaş & Finans */}
              <div className="drawer-section">
                <div className="drawer-section-title"><DollarSign size={15} className="text-green" /> Maaş & Finans</div>
                <div className="drawer-row"><span className="drawer-label">Maaş</span><span className="drawer-value">42.000 TL</span></div>
                <div className="drawer-row"><span className="drawer-label">Prim</span><span className="drawer-value">3.200 TL</span></div>
                <div className="drawer-row"><span className="drawer-label">Bu Ayki Bonus</span><span className="drawer-value">1.500 TL</span></div>
                <div className="drawer-row" style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
                  <span className="drawer-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Toplam Ödeme</span>
                  <span className="drawer-value" style={{ fontWeight: 700, color: 'var(--accent-green)' }}>46.700 TL</span>
                </div>
              </div>

              {/* Operasyon Performansı */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Activity size={15} className="text-blue" /> Operasyon Performansı</div>
                <div className="drawer-row"><span className="drawer-label">Toplam Teslimat</span><span className="drawer-value">4.281</span></div>
                <div className="drawer-row"><span className="drawer-label">Başarı Oranı</span><span className="drawer-value text-green">%97.4</span></div>
                <div className="drawer-row"><span className="drawer-label">İade Oranı</span><span className="drawer-value text-red">%1.2</span></div>
                <div className="drawer-row"><span className="drawer-label">Ortalama Teslim Süresi</span><span className="drawer-value">22 dk</span></div>
              </div>

              {/* Canlı Durum */}
              <div className="drawer-section">
                <div className="drawer-section-title"><MapPin size={15} className="text-orange" /> Canlı Durum</div>
                <div className="drawer-row"><span className="drawer-label">Son Konum</span><span className="drawer-value">Nevşehir Merkez</span></div>
                <div className="drawer-row"><span className="drawer-label">Durum</span><span className="drawer-value"><StatusChip status={selectedCourier.status} /></span></div>
                <div className="drawer-row"><span className="drawer-label">Son Hareket</span><span className="drawer-value"><Clock size={12} style={{ display: 'inline', marginRight: 4 }}/> 20:54</span></div>
              </div>

              {/* Aktif Görevler */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Briefcase size={15} className="text-amber" /> Aktif Görevler</div>
                <div className="drawer-row"><span className="drawer-label">Aktif Teslimat</span><span className="drawer-value">12</span></div>
                <div className="drawer-row"><span className="drawer-label">Bekleyen</span><span className="drawer-value text-amber">5</span></div>
                <div className="drawer-row"><span className="drawer-label">Tamamlanan</span><span className="drawer-value text-green">7</span></div>
              </div>

              {/* Araç Bilgisi */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Route size={15} className="text-purple" /> Araç Bilgisi</div>
                <div className="drawer-row"><span className="drawer-label">Plaka</span><span className="drawer-value" style={{ fontFamily: "'Geist Mono', monospace" }}>{selectedCourier.vehicle_plate || '34 ABC 123'}</span></div>
                <div className="drawer-row"><span className="drawer-label">Model</span><span className="drawer-value">Renault Kangoo 2023</span></div>
                <div className="drawer-row"><span className="drawer-label">Yakıt Durumu</span><span className="drawer-value text-green">%84</span></div>
              </div>

              {/* Olay Geçmişi */}
              <div className="drawer-section">
                <div className="drawer-section-title"><AlertCircle size={15} className="text-red" /> Olay Geçmişi</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, width: 70 }}>15.06.2026</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>Teslimat gecikmesi</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, width: 70 }}>09.06.2026</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>Müşteri şikayeti</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, width: 70 }}>01.06.2026</div>
                    <div style={{ fontSize: 12, color: 'var(--accent-green)' }}>Performans ödülü</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
