import React, { useEffect, useState } from 'react';
import {
  getTariffs, createTariff, updateTariff, deleteTariff,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign
} from '../services/api';
import {
  Tag, Plus, X, Edit2, Trash2, RefreshCw, Percent, Package,
  ToggleLeft, ToggleRight, BadgeCheck, Calendar
} from 'lucide-react';

/* ─────────── Types ─────────── */
interface Tariff {
  id: number;
  name: string;
  base_price: number;
  price_per_kg: number;
  price_per_desi: number;
  is_active: boolean;
  created_at: string;
}

interface Campaign {
  id: number;
  name: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

/* ─────────── Tarife Modalı ─────────── */
function TariffModal({ tariff, onClose, onSuccess }: {
  tariff?: Tariff | null; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!tariff;
  const [form, setForm] = useState({
    name:            tariff?.name            ?? '',
    base_price:      tariff?.base_price      ?? 50,
    price_per_kg:    tariff?.price_per_kg    ?? 10,
    price_per_desi:  tariff?.price_per_desi  ?? 12,
    is_active:       tariff?.is_active       ?? true,
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateTariff(tariff!.id, form);
      } else {
        await createTariff(form);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><Tag size={18} /> {isEdit ? 'Tarifeyi Düzenle' : 'Yeni Tarife Oluştur'}</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Tarife Adı *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Açılış Ücreti (₺)</label>
              <input className="form-input" type="number" step="0.01" min="0"
                value={form.base_price} onChange={e => set('base_price', parseFloat(e.target.value))} required />
            </div>
            <div className="form-group">
              <label className="form-label">₺ / kg</label>
              <input className="form-input" type="number" step="0.01" min="0"
                value={form.price_per_kg} onChange={e => set('price_per_kg', parseFloat(e.target.value))} required />
            </div>
            <div className="form-group">
              <label className="form-label">₺ / desi</label>
              <input className="form-input" type="number" step="0.01" min="0"
                value={form.price_per_desi} onChange={e => set('price_per_desi', parseFloat(e.target.value))} required />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aktif</span>
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {form.is_active
                ? <ToggleRight size={28} color="#10b981" />
                : <ToggleLeft size={28} color="var(--text-muted)" />}
            </button>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Kaydediliyor...' : (isEdit ? '✓ Güncelle' : '✓ Oluştur')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Kampanya Modalı ─────────── */
function CampaignModal({ campaign, onClose, onSuccess }: {
  campaign?: Campaign | null; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!campaign;
  const [form, setForm] = useState({
    name:                campaign?.name                ?? '',
    code:                campaign?.code                ?? '',
    discount_percentage: campaign?.discount_percentage ?? 0,
    is_active:           campaign?.is_active           ?? true,
    start_date:          campaign?.start_date ? campaign.start_date.split('T')[0] : '',
    end_date:            campaign?.end_date   ? campaign.end_date.split('T')[0]   : '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload: any = {
      name: form.name,
      code: form.code.toUpperCase(),
      discount_percentage: form.discount_percentage,
      is_active: form.is_active,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date:   form.end_date   ? new Date(form.end_date).toISOString()   : null,
    };
    try {
      if (isEdit) {
        await updateCampaign(campaign!.id, payload);
      } else {
        await createCampaign(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><Percent size={18} /> {isEdit ? 'Kampanyayı Düzenle' : 'Yeni Kampanya Oluştur'}</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Kampanya Adı *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Kampanya Kodu *</label>
              <input className="form-input" value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())} required
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Geist Mono', monospace" }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">İndirim Oranı (%)</label>
            <input className="form-input" type="number" min="0" max="100" step="0.1"
              value={form.discount_percentage} onChange={e => set('discount_percentage', parseFloat(e.target.value))} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Başlangıç Tarihi</label>
              <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bitiş Tarihi</label>
              <input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aktif</span>
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {form.is_active
                ? <ToggleRight size={28} color="#10b981" />
                : <ToggleLeft size={28} color="var(--text-muted)" />}
            </button>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Kaydediliyor...' : (isEdit ? '✓ Güncelle' : '✓ Oluştur')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Ana Sayfa ─────────── */
export default function Tariffs() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tariffs' | 'campaigns'>('tariffs');
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editTariff, setEditTariff] = useState<Tariff | null>(null);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([getTariffs(), getCampaigns()]);
      setTariffs(tRes.data);
      setCampaigns(cRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteTariff = async (id: number) => {
    if (!confirm('Bu tarifeyi silmek istediğinizden emin misiniz?')) return;
    try { await deleteTariff(id); fetchData(); }
    catch (err: any) { alert(err.response?.data?.detail || 'Silinemedi.'); }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return;
    try { await deleteCampaign(id); fetchData(); }
    catch (err: any) { alert(err.response?.data?.detail || 'Silinemedi.'); }
  };

  const activeTariffs  = tariffs.filter(t => t.is_active).length;
  const activeCampaigns = campaigns.filter(c => c.is_active).length;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Tarife Yönetimi</div>
          <div className="topbar-subtitle">Fiyatlandırma tarifeleri ve kampanya kodları</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}><RefreshCw size={14} /> Yenile</button>
          {activeTab === 'tariffs' ? (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditTariff(null); setShowTariffModal(true); }}>
              <Plus size={14} /> Yeni Tarife
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditCampaign(null); setShowCampaignModal(true); }}>
              <Plus size={14} /> Yeni Kampanya
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Özet Kartları */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Toplam Tarife',  value: tariffs.length,   color: '#6366f1', bg: 'rgba(99,102,241,0.1)', Icon: Tag },
            { label: 'Aktif Tarife',   value: activeTariffs,    color: '#10b981', bg: 'rgba(16,185,129,0.1)', Icon: BadgeCheck },
            { label: 'Toplam Kampanya',value: campaigns.length, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', Icon: Percent },
            { label: 'Aktif Kampanya', value: activeCampaigns,  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', Icon: BadgeCheck },
          ].map(card => (
            <div key={card.label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.Icon size={20} color={card.color} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Seçimi */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 12, border: '1px solid var(--border-color)', width: 'fit-content' }}>
          {(['tariffs', 'campaigns'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)',
            }}>
              {tab === 'tariffs' ? '📦 Tarifeler' : '🎁 Kampanyalar'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : activeTab === 'tariffs' ? (
          /* ─── Tarifeler ─── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {tariffs.map(tariff => (
              <div key={tariff.id} className="card" style={{
                padding: '20px 22px',
                border: tariff.is_active ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-color)',
                position: 'relative', overflow: 'hidden',
              }}>
                {tariff.is_active && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0, background: '#10b981',
                    color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px',
                    borderRadius: '0 0 0 8px', letterSpacing: '0.05em',
                  }}>AKTİF</div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} color="#6366f1" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{tariff.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      #{tariff.id} · {new Date(tariff.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Açılış', value: `₺${tariff.base_price.toFixed(2)}` },
                    { label: '/ kg',   value: `₺${tariff.price_per_kg.toFixed(2)}` },
                    { label: '/ desi', value: `₺${tariff.price_per_desi.toFixed(2)}` },
                  ].map(p => (
                    <div key={p.label} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{p.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{p.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditTariff(tariff); setShowTariffModal(true); }}
                    className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                    <Edit2 size={13} /> Düzenle
                  </button>
                  <button onClick={() => handleDeleteTariff(tariff.id)}
                    style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {tariffs.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Henüz tarife kaydı bulunmuyor. Yeni tarife oluşturun.
              </div>
            )}
          </div>
        ) : (
          /* ─── Kampanyalar ─── */
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kampanya Adı</th>
                  <th>Kod</th>
                  <th>İndirim</th>
                  <th>Tarih Aralığı</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const now = new Date();
                  const start = c.start_date ? new Date(c.start_date) : null;
                  const end   = c.end_date   ? new Date(c.end_date)   : null;
                  const expired = end && end < now;
                  return (
                    <tr key={c.id}>
                      <td><span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: 'var(--text-muted)' }}>#{c.id}</span></td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                      <td>
                        <span style={{
                          fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                          letterSpacing: '0.08em',
                        }}>
                          {c.code}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>%{c.discount_percentage}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={11} />
                          {start ? start.toLocaleDateString('tr-TR') : '—'}
                          {' → '}
                          {end ? end.toLocaleDateString('tr-TR') : '∞'}
                        </div>
                        {expired && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>Süresi doldu</div>}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: c.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                          color: c.is_active ? '#10b981' : '#64748b',
                        }}>
                          {c.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditCampaign(c); setShowCampaignModal(true); }}
                            style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Edit2 size={12} /> Düzenle
                          </button>
                          <button onClick={() => handleDeleteCampaign(c.id)}
                            style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Henüz kampanya kaydı bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showTariffModal && (
        <TariffModal
          tariff={editTariff}
          onClose={() => { setShowTariffModal(false); setEditTariff(null); }}
          onSuccess={fetchData}
        />
      )}
      {showCampaignModal && (
        <CampaignModal
          campaign={editCampaign}
          onClose={() => { setShowCampaignModal(false); setEditCampaign(null); }}
          onSuccess={fetchData}
        />
      )}
    </>
  );
}
