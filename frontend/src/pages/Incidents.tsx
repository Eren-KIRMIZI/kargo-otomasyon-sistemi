import React, { useEffect, useState } from 'react';
import {
  getIncidents, getIncidentStats, createIncident, updateIncident, deleteIncident
} from '../services/api';
import {
  AlertTriangle, Package, MessageSquare, Truck, Plus, X, Search,
  CheckCircle, Clock, Loader, Trash2, Edit2, RefreshCw, Eye, FileText, 
  User, MapPin, Camera, Image, Activity, Timer, Settings2, BarChart2, ShieldAlert
} from 'lucide-react';

/* ─────────── Types ─────────── */
interface Incident {
  id: number;
  type: string;
  status: string;
  tracking_number?: string;
  order_id?: number;
  courier_id?: number;
  customer_id?: number;
  description: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

/* ─────────── Helpers ─────────── */
const TYPE_MAP: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  lost:           { label: 'Kayıp Kargo',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    Icon: Package },
  damaged:        { label: 'Hasarlı Kargo',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   Icon: AlertTriangle },
  complaint:      { label: 'Müşteri Şikayeti',color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',   Icon: MessageSquare },
  courier_report: { label: 'Kurye İhlali',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   Icon: Truck },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  open:          { label: 'Açık',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    Icon: AlertTriangle },
  investigating: { label: 'İnceleniyor',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   Icon: Loader },
  resolved:      { label: 'Çözüldü',      color: '#10b981', bg: 'rgba(16,185,129,0.1)',   Icon: CheckCircle },
};

/* ─────────── Yeni Olay Modalı ─────────── */
function CreateIncidentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    type: 'lost',
    description: '',
    tracking_number: '',
    order_id: '',
    courier_id: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createIncident({
        type: form.type,
        description: form.description,
        ...(form.tracking_number ? { tracking_number: form.tracking_number } : {}),
        ...(form.order_id ? { order_id: Number(form.order_id) } : {}),
        ...(form.courier_id ? { courier_id: Number(form.courier_id) } : {}),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Kayıt oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><AlertTriangle size={18} /> Yeni Olay Kaydı Oluştur</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Olay Türü</label>
            <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="lost">Kayıp Kargo</option>
              <option value="damaged">Hasarlı Kargo</option>
              <option value="complaint">Müşteri Şikayeti</option>
              <option value="courier_report">Kurye İhlali</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Takip No (Opsiyonel)</label>
              <input className="form-input" value={form.tracking_number}
                onChange={e => set('tracking_number', e.target.value)} placeholder="TRK..." />
            </div>
            <div className="form-group">
              <label className="form-label">Sipariş ID (Opsiyonel)</label>
              <input className="form-input" type="number" value={form.order_id}
                onChange={e => set('order_id', e.target.value)} placeholder="123" />
            </div>
          </div>

          {form.type === 'courier_report' && (
            <div className="form-group">
              <label className="form-label">Kurye ID</label>
              <input className="form-input" type="number" value={form.courier_id}
                onChange={e => set('courier_id', e.target.value)} placeholder="Kurye ID" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Olay Açıklaması *</label>
            <textarea className="form-input" rows={4}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Olayı detaylı olarak açıklayın..." required />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Kaydediliyor...' : '✓ Kaydı Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Güncelle Modalı ─────────── */
function UpdateIncidentModal({ incident, onClose, onSuccess }: {
  incident: Incident; onClose: () => void; onSuccess: () => void;
}) {
  const [status, setStatus] = useState(incident.status);
  const [notes, setNotes] = useState(incident.admin_notes || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateIncident(incident.id, { status, admin_notes: notes });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const t = TYPE_MAP[incident.type] || { label: incident.type, color: '#888', bg: 'transparent', Icon: AlertTriangle };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><Edit2 size={18} /> Olay Güncelle — #{incident.id}</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: t.bg, border: `1px solid ${t.color}22` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.color, marginBottom: 6 }}>{t.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{incident.description}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Durum</label>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="open">Açık</option>
              <option value="investigating">İnceleniyor</option>
              <option value="resolved">Çözüldü</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Admin Notları</label>
            <textarea className="form-input" rows={4} value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="İç notlarınızı buraya girebilirsiniz..." />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Kaydediliyor...' : '✓ Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Ana Sayfa ─────────── */
export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Incident | null>(null);
  const [selectedIncidentDetails, setSelectedIncidentDetails] = useState<Incident | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [iRes, sRes] = await Promise.all([getIncidents({ limit: 200 }), getIncidentStats()]);
      setIncidents(iRes.data);
      setStats(sRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Bu olay kaydını silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteIncident(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Silinemedi.');
    }
  };

  const filtered = incidents.filter(i => {
    const matchSearch =
      i.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase()) ||
      String(i.id).includes(search);
    const matchType = typeFilter === 'all' || i.type === typeFilter;
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <>
      {/* Header */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Olay & İhlal Yönetimi</div>
          <div className="topbar-subtitle">Kayıp, hasarlı kargo ve kurye ihlal kayıtları</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Yenile
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Yeni Kayıt
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* İstatistik Kartları */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Toplam Olay', value: stats.total, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', Icon: AlertTriangle },
              { label: 'Açık',        value: stats.open,  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  Icon: AlertTriangle },
              { label: 'İnceleniyor', value: stats.investigating, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', Icon: Clock },
              { label: 'Çözüldü',    value: stats.resolved, color: '#10b981', bg: 'rgba(16,185,129,0.1)', Icon: CheckCircle },
            ].map(card => (
              <div key={card.label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <card.Icon size={20} color={card.color} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tür Dağılımı */}
        {stats?.by_type && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {Object.entries(TYPE_MAP).map(([key, t]) => (
              <div key={key} className="card" style={{
                padding: '12px 16px', cursor: 'pointer', border: typeFilter === key ? `1px solid ${t.color}` : '1px solid transparent',
                transition: 'all 0.2s',
              }} onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <t.Icon size={16} color={t.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: t.color }}>{stats.by_type[key] ?? 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kök Neden Analizi */}
        {stats && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,fontWeight:600}}><BarChart2 size={16} className="text-blue"/> Kök Neden Analizi</div>
            <div className="grid-3" style={{gap:16}}>
              <div style={{background:'rgba(239,68,68,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(239,68,68,0.1)'}}>
                <div style={{fontSize:12,color:'var(--accent-red)',fontWeight:600,marginBottom:8}}>Hasarlı Kargolar</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><span style={{fontSize:13}}>Yetersiz Paketleme</span><span style={{fontWeight:600,color:'var(--text-primary)'}}>%48</span></div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13}}>Transfer Hatası</span><span style={{fontWeight:600,color:'var(--text-primary)'}}>%22</span></div>
              </div>
              <div style={{background:'rgba(245,158,11,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(245,158,11,0.1)'}}>
                <div style={{fontSize:12,color:'var(--accent-amber)',fontWeight:600,marginBottom:8}}>Kayıp Kargolar</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><span style={{fontSize:13}}>Adres Hatası</span><span style={{fontWeight:600,color:'var(--text-primary)'}}>%34</span></div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13}}>Kurye Kaynaklı</span><span style={{fontWeight:600,color:'var(--text-primary)'}}>%18</span></div>
              </div>
              <div style={{background:'rgba(139,92,246,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(139,92,246,0.1)'}}>
                <div style={{fontSize:12,color:'var(--accent-purple)',fontWeight:600,marginBottom:8}}>Gecikmeler</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><span style={{fontSize:13}}>Operasyon Hatası</span><span style={{fontWeight:600,color:'var(--text-primary)'}}>%41</span></div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13}}>Sistem Kaynaklı</span><span style={{fontWeight:600,color:'var(--text-primary)'}}>%15</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Filtreler */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" style={{ paddingLeft: 34 }}
              placeholder="ID, takip no veya açıklama ara..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', 'open', 'investigating', 'resolved'].map(s => {
              const info = s === 'all'
                ? { label: 'Tüm Durumlar', color: 'var(--text-primary)' }
                : STATUS_MAP[s] ?? { label: s, color: '#888' };
              return (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: statusFilter === s ? `1px solid ${info.color}` : '1px solid transparent',
                  background: statusFilter === s ? `${info.color}18` : 'transparent',
                  color: statusFilter === s ? info.color : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}>
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tablo */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /><span>Yükleniyor...</span></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Tür</th>
                  <th>Durum</th>
                  <th>Takip No / Sipariş</th>
                  <th>Açıklama</th>
                  <th>Admin Notu</th>
                  <th>Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inc => {
                  const t = TYPE_MAP[inc.type] || { label: inc.type, color: '#888', bg: 'transparent', Icon: AlertTriangle };
                  const s = STATUS_MAP[inc.status] || { label: inc.status, color: '#888', bg: 'transparent', Icon: Clock };
                  return (
                    <tr key={inc.id}>
                      <td>
                        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: 'var(--text-muted)' }}>
                          #{inc.id}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: t.bg, color: t.color,
                        }}>
                          <t.Icon size={11} /> {t.label}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: s.bg, color: s.color,
                        }}>
                          <s.Icon size={11} /> {s.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--text-secondary)' }}>
                          {inc.tracking_number || (inc.order_id ? `Sipariş #${inc.order_id}` : '—')}
                        </div>
                        {inc.courier_id && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Kurye #{inc.courier_id}
                          </div>
                        )}
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {inc.description}
                        </div>
                      </td>
                      <td style={{ maxWidth: 180 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: inc.admin_notes ? 'normal' : 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {inc.admin_notes || 'Not yok'}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(inc.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setSelectedIncidentDetails(inc)}
                            style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={12} /> Detay
                          </button>
                          <button
                            onClick={() => setEditTarget(inc)}
                            style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Edit2 size={12} /> Düzenle
                          </button>
                          <button
                            onClick={() => handleDelete(inc.id)}
                            style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {search || typeFilter !== 'all' || statusFilter !== 'all'
                        ? 'Arama kriterlerine uygun olay kaydı bulunamadı.'
                        : 'Henüz olay kaydı bulunmuyor.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateIncidentModal onClose={() => setShowCreate(false)} onSuccess={fetchData} />}
      {editTarget && <UpdateIncidentModal incident={editTarget} onClose={() => setEditTarget(null)} onSuccess={fetchData} />}

      {/* ── Incident Details Drawer ── */}
      {selectedIncidentDetails && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedIncidentDetails(null)} />
          <div className="drawer" style={{ maxWidth: 650 }}>
            <div className="drawer-header">
              <div className="drawer-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <AlertTriangle size={18} style={{color:'var(--accent-red)'}}/> 
                Olay Detayı <code style={{fontFamily:"'Geist Mono',monospace",fontSize:14,background:'var(--bg-secondary)',padding:'2px 6px',borderRadius:4}}>#INC-2026-{String(selectedIncidentDetails.id).padStart(3, '0')}</code>
              </div>
              <button className="drawer-close" onClick={() => setSelectedIncidentDetails(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {(() => {
                const inc = selectedIncidentDetails;
                const priority = inc.type === 'courier_report' ? { label: 'Kritik', color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.1)' } 
                              : inc.type === 'lost' || inc.type === 'damaged' ? { label: 'Yüksek', color: 'var(--accent-orange)', bg: 'rgba(255,87,34,0.1)' } 
                              : { label: 'Orta', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.1)' };
                return (
                  <>
                    {/* 📋 Genel Bilgiler */}
                    <div className="drawer-section">
                      <div className="drawer-section-title"><FileText size={15} className="text-orange" /> Genel Bilgiler</div>
                      <div className="grid-2" style={{gap:12}}>
                        <div className="drawer-row"><span className="drawer-label">Olay ID</span><span className="drawer-value"><code style={{fontFamily:"'Geist Mono',monospace"}}>#INC-2026-{String(inc.id).padStart(3, '0')}</code></span></div>
                        <div className="drawer-row"><span className="drawer-label">Oluşturan</span><span className="drawer-value">Sistem</span></div>
                        <div className="drawer-row"><span className="drawer-label">Oluşturulma</span><span className="drawer-value">{new Date(inc.created_at).toLocaleString('tr-TR')}</span></div>
                        <div className="drawer-row"><span className="drawer-label">Son Güncelleme</span><span className="drawer-value">{new Date(inc.updated_at).toLocaleString('tr-TR')}</span></div>
                        <div className="drawer-row" style={{gridColumn:'span 2'}}>
                          <span className="drawer-label">Öncelik</span>
                          <span className="drawer-value" style={{display:'inline-flex',alignItems:'center',gap:6,background:priority.bg,color:priority.color,padding:'2px 8px',borderRadius:12,fontSize:12,fontWeight:600}}>
                            <div style={{width:8,height:8,borderRadius:'50%',background:priority.color}}/> {priority.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 👤 Sorumlu & Lokasyon */}
                    <div className="grid-2" style={{gap:16}}>
                      <div className="drawer-section">
                        <div className="drawer-section-title"><User size={15} className="text-blue" /> Sorumlu Atama</div>
                        <div style={{background:'var(--bg-secondary)',padding:16,borderRadius:10,border:'1px solid var(--border)'}}>
                          <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>Atanan Operatör</div>
                          <div style={{fontSize:15,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>Ahmet <span style={{fontSize:12,fontWeight:400,color:'var(--text-secondary)'}}>(Operasyon Müdürü)</span></div>
                        </div>
                      </div>
                      <div className="drawer-section">
                        <div className="drawer-section-title"><MapPin size={15} className="text-green" /> Olay Lokasyonu</div>
                        <div style={{background:'var(--bg-secondary)',padding:16,borderRadius:10,border:'1px solid var(--border)'}}>
                          <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>Son Görülen Nokta</div>
                          <div style={{fontSize:15,fontWeight:600}}>Ankara Transfer Merkezi</div>
                        </div>
                      </div>
                    </div>

                    {/* 📦 Sipariş & Kanıt Dosyaları */}
                    <div className="grid-2" style={{gap:16}}>
                      <div className="drawer-section">
                        <div className="drawer-section-title"><Package size={15} className="text-purple" /> İlgili Sipariş Bilgisi</div>
                        <div style={{background:'var(--bg-secondary)',padding:16,borderRadius:10,border:'1px solid var(--border)'}}>
                          {inc.tracking_number || inc.order_id ? (
                            <>
                              <div style={{fontSize:11,color:'var(--text-muted)'}}>Sipariş / Takip No</div>
                              <div style={{fontSize:15,fontWeight:600,fontFamily:"'Geist Mono',monospace",marginBottom:8}}>{inc.tracking_number || `ORD-${inc.order_id}`}</div>
                              <div style={{fontSize:13,color:'var(--text-secondary)'}}>Müşteri: Eren22</div>
                              <div style={{fontSize:13,color:'var(--text-secondary)'}}>Durum: Transfer Aşamasında</div>
                            </>
                          ) : (
                            <div style={{color:'var(--text-muted)',fontSize:13,fontStyle:'italic'}}>Sipariş bağlantısı yok.</div>
                          )}
                        </div>
                      </div>
                      <div className="drawer-section">
                        <div className="drawer-section-title"><Camera size={15} className="text-amber" /> Kanıt Dosyaları</div>
                        <div className="grid-2" style={{gap:8}}>
                          <div style={{border:'1px solid var(--border)',borderRadius:8,padding:12,textAlign:'center',background:'rgba(255,255,255,0.02)',cursor:'pointer'}} className="hover-bg-secondary">
                            <Image size={20} style={{color:'var(--accent-blue-light)',margin:'0 auto 6px auto'}}/>
                            <div style={{fontSize:11,fontWeight:500}}>Teslim Fotoğrafı</div>
                          </div>
                          <div style={{border:'1px solid var(--border)',borderRadius:8,padding:12,textAlign:'center',background:'rgba(255,255,255,0.02)',cursor:'pointer'}} className="hover-bg-secondary">
                            <FileText size={20} style={{color:'var(--accent-red)',margin:'0 auto 6px auto'}}/>
                            <div style={{fontSize:11,fontWeight:500}}>Hasar Raporu</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 📝 Çözüm Süreci (Timeline) & Çözüm Süresi */}
                    <div className="grid-2" style={{gap:16}}>
                      <div className="drawer-section">
                        <div className="drawer-section-title"><Activity size={15} className="text-orange" /> Çözüm Süreci</div>
                        <div style={{background:'var(--bg-secondary)',padding:'20px 24px',borderRadius:10,border:'1px solid var(--border)'}}>
                          <div className="timeline" style={{position:'relative',paddingLeft:20}}>
                            <div style={{position:'absolute',left:6,top:8,bottom:8,width:2,background:'var(--border)'}}/>
                            {(() => {
                              const cAt = new Date(inc.created_at);
                              const d1 = new Date(cAt.getTime() + 10*60000);
                              const d2 = new Date(cAt.getTime() + 35*60000);
                              const d3 = new Date(cAt.getTime() + 70*60000);
                              const s = inc.status;
                              
                              const tItem = (title:string, time:Date, isActive:boolean, isPast:boolean, color:string) => (
                                <div style={{position:'relative',marginBottom:16,opacity:isPast||isActive?1:0.4}}>
                                  <div style={{position:'absolute',left:-24,top:2,width:10,height:10,borderRadius:'50%',background:isActive?color:isPast?'var(--text-muted)':'var(--bg-card)',border:`2px solid ${isActive?color:isPast?'var(--text-muted)':'var(--border)'}`,zIndex:1}}/>
                                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                                    <div style={{fontSize:14,fontWeight:isActive?600:500,color:isActive?color:'var(--text-primary)'}}>{title}</div>
                                    <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:"'Geist Mono',monospace"}}>20 Haz {time.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</div>
                                  </div>
                                </div>
                              );

                              return (
                                <>
                                  {tItem('Müşteri kayıt oluşturdu', cAt, s==='open', s!=='open', 'var(--accent-red)')}
                                  {tItem('Operatör atandı', d1, false, s!=='open', 'var(--accent-orange-light)')}
                                  {tItem('İnceleme başladı', d2, s==='investigating', s==='resolved', 'var(--accent-amber)')}
                                  {tItem('Çözüm sağlandı', d3, s==='resolved', false, 'var(--accent-green)')}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="drawer-section">
                        <div className="drawer-section-title"><Timer size={15} className="text-blue" /> Çözüm Süresi</div>
                        <div style={{display:'flex',flexDirection:'column',gap:12}}>
                          <div style={{background:'rgba(59,130,246,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(59,130,246,0.2)'}}>
                            <div style={{fontSize:12,color:'var(--accent-blue-light)',fontWeight:600,marginBottom:4}}>Açık Kalma Süresi</div>
                            <div style={{fontSize:18,fontWeight:700}}>{inc.status === 'resolved' ? '1 Saat 10 Dakika' : '3 Saat 12 Dakika'}</div>
                          </div>
                          <div style={{background:'rgba(16,185,129,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(16,185,129,0.2)'}}>
                            <div style={{fontSize:12,color:'var(--accent-green)',fontWeight:600,marginBottom:4}}>Ortalama Çözüm Süresi</div>
                            <div style={{fontSize:18,fontWeight:700}}>4.6 Saat</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </>
  );
}
