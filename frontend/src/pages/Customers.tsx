import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Building, User, Eye, Wallet, RefreshCcw, X, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { getCustomers, getAdminCustomerWallet, getAdminCustomerReturnCodes } from '../services/api';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerWallet, setCustomerWallet] = useState<any>(null);
  const [customerReturns, setCustomerReturns] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (c: any) => {
    setSelectedCustomer(c);
    setDetailsLoading(true);
    try {
      const [walletRes, returnsRes] = await Promise.all([
        getAdminCustomerWallet(c.id),
        getAdminCustomerReturnCodes(c.id)
      ]);
      setCustomerWallet(walletRes.data);
      setCustomerReturns(returnsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Müşteriler</h1>
          <p className="page-subtitle">Bireysel ve kurumsal müşteri yönetimi</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} />
          <span>Yeni Müşteri Ekle</span>
        </button>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '16px', display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Müşteri adı, şirket veya telefon ile ara..." className="form-input" style={{ paddingLeft: 36, width: '100%' }} />
          </div>
          <select className="form-input" style={{ width: '200px' }}>
            <option value="">Tümü</option>
            <option value="individual">Bireysel</option>
            <option value="corporate">Kurumsal</option>
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tür</th>
                <th>Ad Soyad / Şirket</th>
                <th>İletişim</th>
                <th>Kayıt Tarihi</th>
                <th className="text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Yükleniyor...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Kayıtlı müşteri bulunamadı.</td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id}>
                    <td>
                      {c.customer_type === 'corporate' ? (
                        <div className="badge badge-success"><Building size={12}/> Kurumsal</div>
                      ) : (
                        <div className="badge badge-info"><User size={12}/> Bireysel</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {c.customer_type === 'corporate' ? c.company_name : `${c.first_name} ${c.last_name}`}
                      </div>
                    </td>
                    <td>{c.phone || '-'}</td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleViewDetails(c)} style={{ padding: '6px 10px' }}>
                          <Eye size={14} style={{ marginRight: 4 }} /> Detay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal" style={{ maxWidth: 700, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ fontSize: 18 }}>
                Müşteri Detayları: <span style={{ color: 'var(--accent-blue)' }}>{selectedCustomer.customer_type === 'corporate' ? selectedCustomer.company_name : `${selectedCustomer.first_name} ${selectedCustomer.last_name}`}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedCustomer(null)}><X size={18} /></button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxHeight: '70vh', overflowY: 'auto' }}>
              {detailsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
                  Detaylar yükleniyor...
                </div>
              ) : (
                <>
                  {/* Cüzdan Bölümü */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 12 }}>
                      <Wallet size={18} /> Cüzdan Durumu
                    </div>
                    <div className="grid-2" style={{ gap: 16 }}>
                      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(59,130,246,0.2)', padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mevcut Bakiye</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>₺{(customerWallet?.balance || 0).toFixed(2)}</div>
                      </div>
                      <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} className="text-orange"/> Son Hareketler</div>
                        {customerWallet?.transactions?.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {customerWallet.transactions.slice(0, 3).map((tx: any) => (
                              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                  {tx.transaction_type === 'deposit' ? <ArrowDownLeft size={14} className="text-green"/> : <ArrowUpRight size={14} className="text-red"/>}
                                  {tx.description || '-'}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: 13, color: tx.amount > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                  {tx.amount > 0 ? '+' : ''}₺{tx.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>İşlem geçmişi yok.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* İade Kodları Bölümü */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: 'var(--accent-orange)', marginBottom: 12 }}>
                      <RefreshCcw size={18} /> Müşterinin İade Kodları
                    </div>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Kod</th>
                              <th>Açıklama</th>
                              <th>Oluşturulma</th>
                              <th>Durum / Son Kullanma</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerReturns.length > 0 ? customerReturns.map((r: any) => {
                              const isExpired = new Date(r.expires_at) < new Date();
                              return (
                                <tr key={r.id}>
                                  <td><code style={{ fontFamily: "'Geist Mono', monospace", background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 6, fontWeight: 600, color: 'var(--text-primary)' }}>{r.code}</code></td>
                                  <td>{r.description || '-'}</td>
                                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString('tr-TR')}</td>
                                  <td>
                                    {isExpired ? (
                                      <span className="badge badge-failed">Süresi Doldu</span>
                                    ) : (
                                      <span className="badge badge-delivered">Aktif ({new Date(r.expires_at).toLocaleDateString('tr-TR')})</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Bu müşteri henüz iade kodu üretmemiş.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: 0 }}>
              <button className="btn btn-primary" onClick={() => setSelectedCustomer(null)} style={{ marginLeft: 'auto' }}>Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
