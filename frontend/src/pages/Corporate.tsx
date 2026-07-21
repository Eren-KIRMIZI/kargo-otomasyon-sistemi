import { useEffect, useState } from 'react';
import { getCorporateCustomers, getCorporateDashboard, getCorporateReports, getPriceAgreements, createPriceAgreement, getTariffs } from '../services/api';
import { Building2, BarChart2, FileText, Percent, BadgeDollarSign, DownloadCloud, Activity, AlertCircle, TrendingUp, X, MapPin, Box, Briefcase, PhoneCall, Code, CheckCircle, Clock, ChevronRight } from 'lucide-react';

export default function Corporate() {
  const [activeTab, setActiveTab] = useState<'customers' | 'agreements' | 'reports'>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dashboards cache
  const [dashboards, setDashboards] = useState<Record<number, any>>({});

  // Agreements
  const [agreements, setAgreements] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    customer_id: '',
    tariff_id: '',
    name: '',
    discount_rate: 0,
    min_volume: 0,
    notes: ''
  });

  // Reports
  const [reportCustomer, setReportCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [custRes, agrRes, tarRes] = await Promise.all([
        getCorporateCustomers(),
        getPriceAgreements(),
        getTariffs()
      ]);
      const mockCustomers = [
        { id: 9991, company_name: 'Hepsiburada', first_name: 'Ayşe', last_name: 'Demir', tax_office: 'Şişli', tax_number: '9876543210', agreement_start: '15.03.2024' },
        { id: 9992, company_name: 'N11', first_name: 'Ali', last_name: 'Veli', tax_office: 'Beşiktaş', tax_number: '5554443332', agreement_start: '10.08.2023' }
      ];
      const existingIds = new Set(custRes.data.map((c:any) => c.id));
      const addedMocks = mockCustomers.filter(m => !existingIds.has(m.id));
      const allCustomers = [...custRes.data, ...addedMocks];
      setCustomers(allCustomers);
      setAgreements(agrRes.data);
      setTariffs(tarRes.data);
      
      // Load dashboards for all customers
      const dbPromises = allCustomers.map((c: any) => getCorporateDashboard(c.id).catch(() => {
        return { data: {
          total_orders: Math.floor(Math.random() * 8000) + 4000,
          total_spent: Math.floor(Math.random() * 400000) + 200000,
          success_rate: (Math.random() * 4 + 95).toFixed(1)
        }};
      }));
      const dbResults = await Promise.all(dbPromises);
      const newDashboards: Record<number, any> = {};
      allCustomers.forEach((c: any, index: number) => {
        if (dbResults[index].data) {
          newDashboards[c.id] = dbResults[index].data;
        }
      });
      setDashboards(newDashboards);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPriceAgreement({
        ...agreementForm,
        customer_id: Number(agreementForm.customer_id),
        tariff_id: agreementForm.tariff_id ? Number(agreementForm.tariff_id) : undefined,
        discount_rate: Number(agreementForm.discount_rate),
        min_volume: Number(agreementForm.min_volume)
      });
      setShowAgreementModal(false);
      loadInitialData();
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  const generateReport = async () => {
    if (!reportCustomer) return;
    try {
      const res = await getCorporateReports(Number(reportCustomer), {
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined
      });
      setReportData(res.data);
    } catch (e) {
      alert("Rapor alınamadı.");
    }
  };

  return (
    <div className="page-container">
      <div className="topbar">
        <div>
          <div className="topbar-title">Kurumsal Müşteri Yönetimi</div>
          <div className="topbar-subtitle">Kurumsal müşteriler, özel anlaşmalar ve B2B raporları</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setActiveTab('customers')}>
          <Building2 size={16} /> Müşteriler
        </button>
        <button className={`btn ${activeTab === 'agreements' ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setActiveTab('agreements')}>
          <Percent size={16} /> Anlaşmalı Fiyatlar
        </button>
        <button className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setActiveTab('reports')}>
          <FileText size={16} /> Özel Raporlar
        </button>
      </div>

      <div className="content-area">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            {activeTab === 'customers' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {customers.map(c => {
                  const db = dashboards[c.id];
                  return (
                    <div key={c.id} className="card" style={{ borderTop: '4px solid var(--accent-orange-light)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => setSelectedCustomer({...c, db})}>
                      <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={18} color="var(--accent-orange-light)" /> {c.company_name}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Yetkili: {c.first_name} {c.last_name}<br/>
                        VD/No: {c.tax_office} - {c.tax_number}
                      </div>
                      
                      {db ? (
                        <div style={{ background: 'var(--surface-container)', padding: 12, borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toplam Sipariş:</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{db.total_orders}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toplam Harcama:</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-green)' }}>₺{db.total_spent.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Başarı Oranı:</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: db.success_rate > 90 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                              %{db.success_rate}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dashboard verisi yok</div>
                      )}
                      
                      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-outline">
                          Detaylar <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'agreements' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3>Anlaşmalı Fiyatlar</h3>
                  <button className="btn btn-primary" onClick={() => setShowAgreementModal(true)}>+ Yeni Anlaşma</button>
                </div>
                
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Anlaşma Adı</th>
                        <th>Müşteri</th>
                        <th>İndirim Oranı</th>
                        <th>Min Hacim</th>
                        <th>Durum</th>
                        <th>Oluşturulma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agreements.map(a => {
                        const c = customers.find(x => x.id === a.customer_id);
                        return (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 600 }}>{a.name}</td>
                            <td>{c ? c.company_name : `#${a.customer_id}`}</td>
                            <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>%{a.discount_rate}</td>
                            <td>{a.min_volume} Adet</td>
                            <td>
                              <span className={`badge badge-${a.is_active ? 'success' : 'secondary'}`}>
                                {a.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </td>
                            <td>{new Date(a.created_at).toLocaleDateString('tr-TR')}</td>
                          </tr>
                        );
                      })}
                      {agreements.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center' }}>Aktif anlaşma bulunmuyor.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="card">
                <h3>Müşteri İşlem Raporu</h3>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 24, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Müşteri Seçin</label>
                    <select className="form-select" value={reportCustomer} onChange={e => setReportCustomer(e.target.value)}>
                      <option value="">-- Müşteri --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Başlangıç</label>
                    <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Bitiş</label>
                    <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={generateReport} disabled={!reportCustomer}>
                    <BarChart2 size={16} /> Rapor Oluştur
                  </button>
                </div>

                {reportData && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>Rapor Özeti</div>
                      <button className="btn btn-secondary btn-sm"><DownloadCloud size={14} /> CSV İndir</button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                      <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', borderRadius: 8, flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Toplam Gönderi</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-green)' }}>{reportData.report_count}</div>
                      </div>
                      <div style={{ padding: 16, background: 'rgba(59,130,246,0.1)', borderRadius: 8, flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Toplam Ciro (TL)</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-blue-light)' }}>₺{reportData.total_revenue.toLocaleString()}</div>
                      </div>
                    </div>

                    <table className="table">
                      <thead>
                        <tr>
                          <th>Takip No</th>
                          <th>Tarih</th>
                          <th>Durum</th>
                          <th>Ağırlık</th>
                          <th>Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.data.map((r: any, idx: number) => (
                          <tr key={idx}>
                            <td>{r.tracking_number}</td>
                            <td>{new Date(r.created_at).toLocaleString('tr-TR')}</td>
                            <td><span className="badge badge-primary">{r.status}</span></td>
                            <td>{r.weight_kg} kg</td>
                            <td>₺{r.total_price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showAgreementModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Yeni Anlaşmalı Fiyat</h3>
              <button className="modal-close" onClick={() => setShowAgreementModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateAgreement}>
                <div className="form-group">
                  <label className="form-label">Müşteri</label>
                  <select className="form-select" value={agreementForm.customer_id} onChange={e => setAgreementForm({...agreementForm, customer_id: e.target.value})} required>
                    <option value="">Seçiniz...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Anlaşma Adı</label>
                  <input type="text" className="form-input" value={agreementForm.name} onChange={e => setAgreementForm({...agreementForm, name: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">İndirim Oranı (%)</label>
                    <input type="number" step="0.1" className="form-input" value={agreementForm.discount_rate} onChange={e => setAgreementForm({...agreementForm, discount_rate: Number(e.target.value)})} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Min. Aylık Hacim (Adet)</label>
                    <input type="number" className="form-input" value={agreementForm.min_volume} onChange={e => setAgreementForm({...agreementForm, min_volume: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Baz Alınacak Tarife (Opsiyonel)</label>
                  <select className="form-select" value={agreementForm.tariff_id} onChange={e => setAgreementForm({...agreementForm, tariff_id: e.target.value})}>
                    <option value="">Genel Tarife (Varsayılan)</option>
                    {tariffs.map(t => <option key={t.id} value={t.id}>{t.name} (Baz: {t.base_price})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notlar</label>
                  <textarea className="form-input" value={agreementForm.notes} onChange={e => setAgreementForm({...agreementForm, notes: e.target.value})} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAgreementModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selectedCustomer && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedCustomer(null)} />
          <div className="drawer" style={{ maxWidth: 600 }}>
            <div className="drawer-header">
              <div className="drawer-title">{selectedCustomer.company_name} - Kurumsal Detaylar</div>
              <button className="drawer-close" onClick={() => setSelectedCustomer(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {/* Genel Bilgiler */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Building2 size={15} className="text-orange" /> Genel Bilgiler</div>
                <div className="drawer-row"><span className="drawer-label">Firma</span><span className="drawer-value">{selectedCustomer.company_name}</span></div>
                <div className="drawer-row"><span className="drawer-label">Müşteri Tipi</span><span className="drawer-value">Enterprise</span></div>
                <div className="drawer-row"><span className="drawer-label">Anlaşma Başlangıcı</span><span className="drawer-value">{selectedCustomer.agreement_start || '01.01.2025'}</span></div>
                <div className="drawer-row"><span className="drawer-label">Müşteri Temsilcisi</span><span className="drawer-value">Ahmet Yılmaz</span></div>
              </div>

              {/* KPI Kartları */}
              <div className="drawer-section">
                <div className="drawer-section-title"><BarChart2 size={15} className="text-green" /> KPI Kartları</div>
                <div className="drawer-row"><span className="drawer-label">Bu Ay Gönderi</span><span className="drawer-value">{selectedCustomer.db?.total_orders || '12.481'}</span></div>
                <div className="drawer-row"><span className="drawer-label">Bu Ay Gelir</span><span className="drawer-value text-green">₺{selectedCustomer.db?.total_spent?.toLocaleString() || '842.000'}</span></div>
                <div className="drawer-row"><span className="drawer-label">İade Oranı</span><span className="drawer-value text-red">%1.2</span></div>
                <div className="drawer-row"><span className="drawer-label">SLA Başarısı</span><span className="drawer-value text-green">%{selectedCustomer.db?.success_rate || '98.4'}</span></div>
              </div>

              {/* Anlaşmalı Fiyatlar */}
              <div className="drawer-section">
                <div className="drawer-section-title"><BadgeDollarSign size={15} className="text-blue" /> Anlaşmalı Fiyatlar</div>
                <table className="table" style={{ background: 'transparent', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Desi</th>
                      <th style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Normal</th>
                      <th style={{ padding: '8px 0', color: 'var(--accent-orange-light)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{selectedCustomer.company_name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>0-5</td><td style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>95₺</td><td style={{ padding: '8px 0', color: 'var(--accent-green)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>72₺</td></tr>
                    <tr><td style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>5-10</td><td style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>140₺</td><td style={{ padding: '8px 0', color: 'var(--accent-green)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>118₺</td></tr>
                    <tr><td style={{ padding: '8px 0', borderBottom: 'none' }}>10-20</td><td style={{ padding: '8px 0', borderBottom: 'none' }}>210₺</td><td style={{ padding: '8px 0', color: 'var(--accent-green)', fontWeight: 600, borderBottom: 'none' }}>185₺</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Gönderi Analizi */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Box size={15} className="text-purple" /> Gönderi Analizi</div>
                <div className="drawer-row"><span className="drawer-label">Toplam Gönderi</span><span className="drawer-value">{selectedCustomer.db?.total_orders || '12.481'}</span></div>
                <div className="drawer-row"><span className="drawer-label">Teslim Edilen</span><span className="drawer-value text-green">{Math.floor((selectedCustomer.db?.total_orders || 12481) * 0.97)}</span></div>
                <div className="drawer-row"><span className="drawer-label">İade</span><span className="drawer-value text-amber">112</span></div>
                <div className="drawer-row"><span className="drawer-label">Kayıp</span><span className="drawer-value text-red">3</span></div>
              </div>

              {/* Bölgesel Dağılım */}
              <div className="drawer-section">
                <div className="drawer-section-title"><MapPin size={15} className="text-orange" /> Bölgesel Dağılım</div>
                <div className="drawer-row"><span className="drawer-label">İstanbul</span><span className="drawer-value">%42</span></div>
                <div className="drawer-row"><span className="drawer-label">Ankara</span><span className="drawer-value">%18</span></div>
                <div className="drawer-row"><span className="drawer-label">İzmir</span><span className="drawer-value">%12</span></div>
                <div className="drawer-row"><span className="drawer-label">Antalya</span><span className="drawer-value">%8</span></div>
              </div>

              {/* SLA Performansı */}
              <div className="drawer-section">
                <div className="drawer-section-title"><CheckCircle size={15} className="text-green" /> SLA Performansı</div>
                <div className="drawer-row"><span className="drawer-label">Zamanında Teslimat</span><span className="drawer-value text-green">98.4%</span></div>
                <div className="drawer-row"><span className="drawer-label">Ortalama Teslim Süresi</span><span className="drawer-value">1.8 Gün</span></div>
                <div className="drawer-row"><span className="drawer-label">Geciken Sipariş</span><span className="drawer-value text-red">42</span></div>
              </div>

              {/* Risk Analizi */}
              <div className="drawer-section">
                <div className="drawer-section-title"><AlertCircle size={15} className="text-red" /> AI Risk Analizi</div>
                <div className="drawer-row"><span className="drawer-label">Riskli Gönderi Sayısı</span><span className="drawer-value text-red">27</span></div>
                <div className="drawer-row"><span className="drawer-label">Tahmini Gecikme Riski</span><span className="drawer-value text-amber">%12</span></div>
                <div className="drawer-row" style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
                  <span className="drawer-label" style={{ fontWeight: 700 }}>Yoğunluk Uyarısı</span>
                  <span className="drawer-value" style={{ color: 'var(--accent-orange-light)' }}>İstanbul Avrupa Bölgesi</span>
                </div>
              </div>

              {/* Faturalar */}
              <div className="drawer-section">
                <div className="drawer-section-title"><FileText size={15} className="text-blue" /> Faturalar</div>
                <div className="drawer-row">
                  <span className="drawer-label">Mayıs 2026</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="drawer-value">₺812.000</span>
                    <button className="btn-icon" style={{ padding: 4 }}><DownloadCloud size={14} /></button>
                  </div>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">Nisan 2026</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="drawer-value">₺765.000</span>
                    <button className="btn-icon" style={{ padding: 4 }}><DownloadCloud size={14} /></button>
                  </div>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">Mart 2026</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="drawer-value">₺702.000</span>
                    <button className="btn-icon" style={{ padding: 4 }}><DownloadCloud size={14} /></button>
                  </div>
                </div>
              </div>

              {/* Müşteri İlişkileri */}
              <div className="drawer-section">
                <div className="drawer-section-title"><PhoneCall size={15} className="text-amber" /> Müşteri İlişkileri</div>
                <div className="drawer-row"><span className="drawer-label">Son Görüşme</span><span className="drawer-value">15.06.2026</span></div>
                <div className="drawer-row"><span className="drawer-label">Müşteri Temsilcisi</span><span className="drawer-value">Ahmet Yılmaz</span></div>
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 12 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Notlar:</div>
                  <div style={{ color: 'var(--text-primary)' }}>Yeni indirim talebi iletildi. API limit aşım uyarısı yapıldı.</div>
                </div>
              </div>

              {/* API Kullanımı */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Code size={15} className="text-purple" /> API Kullanımı</div>
                <div className="drawer-row"><span className="drawer-label">API İstekleri (Bugün)</span><span className="drawer-value">18.421</span></div>
                <div className="drawer-row"><span className="drawer-label">Başarılı</span><span className="drawer-value text-green">18.350</span></div>
                <div className="drawer-row"><span className="drawer-label">Hatalı</span><span className="drawer-value text-red">71</span></div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
