import React, { useEffect, useState } from 'react';
import { RefreshCcw, Plus, Copy, CheckCircle } from 'lucide-react';
import { getReturnCodes, createReturnCode } from '../../services/api';

interface ReturnCode {
  id: number;
  code: string;
  description: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export default function CustomerReturns() {
  const [codes, setCodes] = useState<ReturnCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [desc, setDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const res = await getReturnCodes();
      setCodes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      await createReturnCode({ description: desc });
      setDesc('');
      fetchCodes();
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">İade Yönetimi</div>
          <div className="topbar-subtitle">Müşterileriniz için iade kodları oluşturun ve yönetin</div>
        </div>
      </div>

      <div className="page-content">
        <div className="card mb-6">
          <div className="card-header">
            <div className="card-title"><Plus size={16} className="text-blue" /> Yeni İade Kodu Üret</div>
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Açıklama / Kampanya Adı</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Örn: Yaz Sonu İndirimi İadeleri" 
                value={desc}
                onChange={e => setDesc(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={createLoading} style={{ whiteSpace: 'nowrap' }}>
              {createLoading ? 'Üretiliyor...' : 'Kod Üret (7 Gün Geçerli)'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><RefreshCcw size={16} className="text-orange" /> Aktif ve Geçmiş İade Kodları</div>
          </div>
          <div className="table-container">
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
            ) : codes.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Henüz oluşturulmuş iade kodu bulunmamaktadır.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>İade Kodu</th>
                    <th>Açıklama</th>
                    <th>Oluşturulma</th>
                    <th>Son Kullanma (Geçerlilik)</th>
                    <th>Durum</th>
                    <th style={{ textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(c => {
                    const isExpired = new Date(c.expires_at) < new Date();
                    return (
                      <tr key={c.id}>
                        <td>
                          <code style={{ fontSize: 13, color: 'var(--accent-orange)', fontWeight: 700, padding: '4px 8px', background: 'rgba(255,87,34,0.1)', borderRadius: 6 }}>
                            {c.code}
                          </code>
                        </td>
                        <td>{c.description}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {new Date(c.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td style={{ color: isExpired ? 'var(--accent-red)' : 'var(--text-secondary)', fontSize: 13 }}>
                          {c.expires_at ? new Date(c.expires_at).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td>
                          {isExpired ? (
                            <span className="badge badge-failed">Süresi Doldu</span>
                          ) : c.is_active ? (
                            <span className="badge badge-delivered">Aktif</span>
                          ) : (
                            <span className="badge">Pasif</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => copyToClipboard(c.id, c.code)}
                            title="Kodu Kopyala"
                          >
                            {copied === c.id ? <CheckCircle size={14} className="text-green" /> : <Copy size={14} />} 
                            {copied === c.id ? 'Kopyalandı' : 'Kopyala'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
