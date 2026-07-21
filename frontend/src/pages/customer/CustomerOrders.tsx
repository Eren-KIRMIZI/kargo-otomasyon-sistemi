import React, { useEffect, useState } from 'react';
import {
  getCustomerOrders, createCustomerOrder, createReturnOrder,
  getProvinces, getDistricts
} from '../../services/api';
import { Package, Plus, X, Search, MapPin, RotateCcw, Bell, Star, Brain, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Bekliyor',         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  in_transit:       { label: 'Yolda',             color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  out_for_delivery: { label: 'Dağıtımda',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  delivered:        { label: 'Teslim Edildi',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  failed:           { label: 'Teslim Edilemedi', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  returned:         { label: 'İade Edildi',      color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low:    { label: 'Düşük',  color: '#6b7280' },
  normal: { label: 'Normal', color: '#3b82f6' },
  high:   { label: 'Yüksek', color: '#f59e0b' },
  urgent: { label: 'Acil',   color: '#ef4444' },
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

/* ────── Create Order Modal ────── */
function CreateOrderModal({ onClose, onSuccess, provinces }: {
  onClose: () => void;
  onSuccess: () => void;
  provinces: any[];
}) {
  const user = useAuthStore(s => s.user);
  const [loading,   setLoading]   = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_name:      user?.username || '',
    customer_phone:     '',
    receiver_name:      '',
    receiver_phone:     '',
    province_id:        '',
    district_id:        '',
    recipient_address:  '',
    weight_kg:          1,
    priority:           'normal',
    payment_method:     'cash',
    notes:              '',
  });

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    set('province_id', id);
    set('district_id', '');
    setDistricts([]);
    if (id) {
      try {
        const res = await getDistricts(Number(id));
        setDistricts(res.data);
      } catch { /* ignore */ }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createCustomerOrder({
        customer_name:     form.customer_name,
        customer_phone:    form.customer_phone,
        receiver_name:     form.receiver_name,
        receiver_phone:    form.receiver_phone,
        province_id:       Number(form.province_id),
        ...(form.district_id ? { district_id: Number(form.district_id) } : {}),
        recipient_address: form.recipient_address,
        weight_kg:         form.weight_kg,
        priority:          form.priority,
        payment_method:    form.payment_method,
        latitude:          41.0,
        longitude:         28.9,
        ...(form.notes ? { notes: form.notes } : {}),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) 
        ? detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join('\n') 
        : detail || 'Kargo oluşturulamadı. Lütfen tekrar deneyin.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><Package size={18} /> Yeni Kargo Oluştur</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Bölüm: Gönderici */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              👤 Gönderici Bilgileri
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Ad Soyad">
                <input type="text" className="form-input" value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)} required />
              </Field>
              <Field label="Telefon">
                <input type="tel" className="form-input" placeholder="05xx xxx xx xx"
                  value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} required />
              </Field>
            </div>
          </div>

          {/* Bölüm: Alıcı */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              📬 Alıcı Bilgileri
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Alıcı Adı Soyadı">
                <input type="text" className="form-input" value={form.receiver_name}
                  onChange={e => set('receiver_name', e.target.value)} required />
              </Field>
              <Field label="Alıcı Telefon">
                <input type="tel" className="form-input" placeholder="05xx xxx xx xx"
                  value={form.receiver_phone} onChange={e => set('receiver_phone', e.target.value)} required />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Field label="İl">
                <select className="form-select" value={form.province_id} onChange={handleProvinceChange} required>
                  <option value="">Seçiniz</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="İlçe">
                <select className="form-select" value={form.district_id}
                  onChange={e => set('district_id', e.target.value)} disabled={districts.length === 0}>
                  <option value="">{districts.length === 0 ? 'Önce il seçin' : 'Seçiniz'}</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Açık Adres">
              <textarea className="form-input" rows={2} placeholder="Mahalle, cadde, no, daire..."
                value={form.recipient_address} onChange={e => set('recipient_address', e.target.value)} required />
            </Field>
          </div>

          {/* Bölüm: Kargo Detayları */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              📦 Kargo Detayları
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Ağırlık (kg)">
                <input type="number" className="form-input" min="0.1" step="0.1"
                  value={form.weight_kg} onChange={e => set('weight_kg', parseFloat(e.target.value))} required />
              </Field>
              <Field label="Öncelik">
                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
              <Field label="Ödeme Yöntemi">
                <select className="form-select" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                  <option value="cash">Nakit (Şubede Ödeme)</option>
                  <option value="card">Kredi Kartı</option>
                  <option value="wallet">Cüzdanım İle Öde (Bakiyeden Düşer)</option>
                </select>
              </Field>
            </div>
            <Field label="Not (Opsiyonel)">
              <textarea className="form-input" rows={2} placeholder="Teslimata dair özel notunuz..."
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Oluşturuluyor...' : '✓ Kargo Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────── Create Return Modal ────── */
function CreateCustomerReturnModal({ onClose, onSuccess, orderId }: {
  onClose: () => void;
  onSuccess: () => void;
  orderId: number;
}) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    try {
      await createReturnOrder({ original_order_id: orderId, reason });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('İade oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><RotateCcw size={18} /> İade Talebi Oluştur</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">İade Nedeni</label>
            <select className="form-select" value={reason} onChange={e => setReason(e.target.value)} required>
              <option value="">-- Seçiniz --</option>
              <option value="Hasarlı Paket">Hasarlı Paket</option>
              <option value="Yanlış Ürün">Yanlış Ürün</option>
              <option value="Müşteri Vazgeçti">Müşteri Vazgeçti</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Gönderiliyor...' : 'Talebi Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────── Order Details Modal ────── */
function OrderDetailsModal({ order, onClose, onReturn }: { order: any, onClose: () => void, onReturn: (id: number) => void }) {
  const [rating, setRating] = useState(0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            Kargo Detayı <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", marginLeft: 8 }}>{order.tracking_number}</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Akıllı Tahmin (AI ETA) */}
          {order.status !== 'delivered' && order.status !== 'returned' && order.status !== 'failed' && (
            <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.05) 100%)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-purple)', fontWeight: 700, marginBottom: 12, fontSize: 13 }}>
                <Brain size={16} /> Akıllı Tahmin (AI)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tahmini Teslim</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' }) : 'Hesaplanıyor...'}
                  </div>
                </div>
                {order.estimated_delivery && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Güven Skoru</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-purple)' }}>%94</div>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Alıcı</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{order.receiver_name || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Durum</div>
              <span className={`badge badge-${order.status}`}>
                {STATUS_MAP[order.status]?.label || order.status}
              </span>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: 8 }}>
            {order.status === 'delivered' && (
              <button className="btn btn-secondary" style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }} onClick={() => { onClose(); onReturn(order.id); }}>
                İade Talebi Oluştur
              </button>
            )}
            <button className="btn btn-primary" onClick={onClose} style={{ marginLeft: 'auto' }}>Kapat</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────── Ana Sayfa ────── */
export default function CustomerOrders() {
  const [orders,    setOrders]    = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [oRes, pRes] = await Promise.all([getCustomerOrders(), getProvinces()]);
      setOrders(oRes.data);
      if (provinces.length === 0) setProvinces(pRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = orders.filter(o => {
    const matchSearch =
      o.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
      (o.receiver_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || o.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <>
      {/* Header */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Kargolarım</div>
          <div className="topbar-subtitle">Gönderdiğiniz ve size gelen tüm kargolar</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Yeni Kargo Gönder
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Filtreler & Arama */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Takip no veya alıcı adı ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', 'pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'].map(status => {
            const s = status === 'all'
              ? { label: 'Tümü', color: 'var(--text-primary)', bg: 'rgba(255,255,255,0.07)' }
              : STATUS_MAP[status] || { label: status, color: '#888', bg: 'rgba(136,136,136,0.1)' };
            const isActive = filter === status;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? `1px solid ${s.color}` : '1px solid transparent',
                  background: isActive ? s.bg : 'transparent',
                  color: isActive ? s.color : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
          <span>Kargolarınız yükleniyor...</span>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Takip No</th>
                <th>Alıcı</th>
                <th>Teslimat Adresi</th>
                <th>Ağırlık</th>
                <th>Öncelik</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const s = STATUS_MAP[o.status] || { label: o.status, color: '#888', bg: 'rgba(136,136,136,0.1)' };
                const p = PRIORITY_MAP[o.priority] || { label: o.priority, color: '#888' };
                return (
                  <tr key={o.id}>
                    <td>
                      <span className="badge" style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
                        {o.tracking_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{o.receiver_name || o.customer_name || '—'}</div>
                      {o.receiver_phone && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{o.receiver_phone}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <MapPin size={11} />
                        {o.province_name || '—'}
                        {o.district_name ? ` / ${o.district_name}` : ''}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {o.weight_kg ? `${o.weight_kg} kg` : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: p.color }}>{p.label}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(o.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: '6px 10px' }} onClick={() => setSelectedOrder(o)}>
                        Detay <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    {search || filter !== 'all' ? 'Arama kriterlerine uygun kargo bulunamadı.' : 'Henüz kargo kaydınız bulunmuyor.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CreateOrderModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchData}
          provinces={provinces}
        />
      )}

      {showReturnModal && returnOrderId && (
        <CreateCustomerReturnModal
          onClose={() => setShowReturnModal(false)}
          onSuccess={fetchData}
          orderId={returnOrderId}
        />
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReturn={(id) => {
            setReturnOrderId(id);
            setShowReturnModal(true);
          }}
        />
      )}
      </div>
    </>
  );
}
