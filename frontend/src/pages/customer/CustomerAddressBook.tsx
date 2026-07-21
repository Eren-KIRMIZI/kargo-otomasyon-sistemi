import React, { useEffect, useState } from 'react';
import { MapPin, Plus, X, Home, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getCustomerAddresses, addCustomerAddress, getProvinces, deleteCustomerAddress } from '../../services/api';

function AddAddressModal({ onClose, onSuccess, provinces, customerId }: {
  onClose: () => void;
  onSuccess: () => void;
  provinces: any[];
  customerId: number;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', address_line: '', province_id: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addCustomerAddress(customerId, {
        ...form,
        province_id: Number(form.province_id),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Adres eklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><Plus size={18} /> Yeni Adres Ekle</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Adres Başlığı (Ev, İş vb.)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ev"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">İl</label>
            <select
              className="form-select"
              value={form.province_id}
              onChange={e => setForm({ ...form, province_id: e.target.value })}
              required
            >
              <option value="">İl Seçiniz</option>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Açık Adres</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Mahalle, sokak, bina no, daire..."
              value={form.address_line}
              onChange={e => setForm({ ...form, address_line: e.target.value })}
              required
            />
          </div>
          <div className="modal-footer" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Ekleniyor...' : 'Adresi Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerAddressBook() {
  const user = useAuthStore(s => s.user);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const customerId = user?.customer_profile_id;

  const fetchData = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [addrRes, provRes] = await Promise.all([
        getCustomerAddresses(customerId),
        getProvinces(),
      ]);
      setAddresses(addrRes.data);
      setProvinces(provRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [customerId]);

  const handleDelete = async (addressId: number) => {
    if (!customerId) return;
    if (!window.confirm('Bu adresi silmek istediğinize emin misiniz?')) return;
    try {
      await deleteCustomerAddress(customerId, addressId);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Adres silinemedi.');
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Adres Defterim</div>
          <div className="topbar-subtitle">Kayıtlı teslimat ve gönderim adresleriniz</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto' }}>
          <Plus size={14} /> Yeni Adres Ekle
        </button>
      </div>

      <div className="page-content">

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Adresler yükleniyor...</span></div>
      ) : addresses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <MapPin size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Henüz kayıtlı adresiniz bulunmuyor.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> İlk Adresini Ekle
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {addresses.map(addr => (
            <div key={addr.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
              <button 
                onClick={() => handleDelete(addr.id)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                title="Adresi Sil"
              >
                <Trash2 size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,87,34,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-orange)',
                }}>
                  <Home size={18} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{addr.title}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {addr.address_line}
              </p>
              {addr.province_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <MapPin size={12} />
                  {addr.province_name}{addr.district_name ? ` / ${addr.district_name}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && customerId && (
        <AddAddressModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchData}
          provinces={provinces}
          customerId={customerId}
        />
      )}
      </div>
    </>
  );
}
