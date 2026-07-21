import { useEffect, useState, useRef } from 'react';
import { getReturns, getReturnAnalytics, updateReturn, createReturnOrder, getOrders } from '../services/api';
import { 
  RotateCcw, CheckCircle, PackageSearch, AlertCircle, Eye, FileText, 
  Activity, User, Truck, Camera, Image, ShieldAlert, Bot, TrendingDown, 
  DollarSign, Calendar, MapPin, X, BarChart2, Shield
} from 'lucide-react';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

export default function Returns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [reason, setReason] = useState('');
  const [selectedReturnDetails, setSelectedReturnDetails] = useState<any>(null);

  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [retRes, statRes, ordRes] = await Promise.all([
        getReturns(),
        getReturnAnalytics(),
        getOrders({ limit: 100 })
      ]);
      setReturns(retRes.data);
      setAnalytics(statRes.data);
      setOrders(ordRes.data.filter((o: any) => o.status === 'delivered' || o.status === 'failed'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (analytics && chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const labels = analytics.by_reason.map((r: any) => r.reason);
      const data = analytics.by_reason.map((r: any) => r.count);
      const bgColors = ['#FF5722', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

      chartInstance.current = new Chart(chartRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: bgColors,
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#a0a0a0', font: { family: 'Inter' } }
            }
          }
        }
      });
    }
  }, [analytics]);

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !reason) return;
    try {
      await createReturnOrder({ original_order_id: Number(selectedOrder), reason });
      setShowModal(false);
      setReason('');
      setSelectedOrder('');
      loadData();
    } catch (err) {
      alert("Hata oluştu.");
    }
  };

  const handleUpdateStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'received' : 'completed';
    try {
      await updateReturn(id, { status: nextStatus });
      loadData();
    } catch (err) {
      alert("Güncellenemedi.");
    }
  };

  const pendingCount = analytics?.by_status.find((s:any) => s.status === 'pending')?.count || 0;
  const receivedCount = analytics?.by_status.find((s:any) => s.status === 'received')?.count || 0;
  const completedCount = analytics?.by_status.find((s:any) => s.status === 'completed')?.count || 0;

  return (
    <div className="page-container">
      <div className="topbar">
        <div>
          <div className="topbar-title">İade Yönetimi</div>
          <div className="topbar-subtitle">Tersine lojistik süreçleri ve iade analizi</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Yeni İade Talebi</button>
      </div>

      <div className="content-area">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div className="card" style={{'--kpi-color':'var(--accent-red)'} as any}>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingDown size={16} style={{color:'var(--accent-red)'}}/> İade Oranı</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>%2.3</div>
                <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 8 }}>Geçen aya göre artış</div>
              </div>
              <div className="card" style={{'--kpi-color':'var(--accent-blue)'} as any}>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><RotateCcw size={16} style={{color:'var(--accent-blue)'}}/> Bugünkü İadeler</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>14</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Aktif toplanacak</div>
              </div>
              <div className="card" style={{'--kpi-color':'var(--accent-amber)'} as any}>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16} style={{color:'var(--accent-amber)'}}/> Sorunlu İadeler</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>3</div>
                <div style={{ fontSize: 12, color: 'var(--accent-amber)', marginTop: 8 }}>Eksik ürün şüphesi</div>
              </div>
              <div className="card" style={{'--kpi-color':'#10B981'} as any}>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={16} style={{color:'#10B981'}}/> İade Maliyeti</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>₺12.400</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Bu ayki kümülatif zarar</div>
              </div>
            </div>

            {/* Table */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>İade Talepleri</h3>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>İade Takip No</th>
                      <th>Orijinal Sipariş ID</th>
                      <th>Neden</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.return_tracking_number}</td>
                        <td>#{r.original_order_id}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertCircle size={14} color="var(--accent-orange-light)" /> {r.reason || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${r.status === 'completed' ? 'success' : r.status === 'pending' ? 'warning' : 'primary'}`}>
                            {r.status === 'pending' ? 'Bekliyor' : r.status === 'received' ? 'Depoda' : 'Tamamlandı'}
                          </span>
                        </td>
                        <td>{new Date(r.created_at).toLocaleString('tr-TR')}</td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn btn-sm btn-outline" onClick={() => setSelectedReturnDetails(r)} style={{borderColor:'var(--accent-blue-light)', color:'var(--accent-blue-light)'}}>
                              <Eye size={13} style={{marginRight:4}}/> Detay
                            </button>
                            {r.status !== 'completed' && (
                              <button className="btn btn-sm btn-secondary" onClick={() => handleUpdateStatus(r.id, r.status)}>
                                {r.status === 'pending' ? 'Depoya Al' : 'Tamamla'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {returns.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Henüz iade talebi yok.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Global Analytics & AI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
              {/* Doughnut Chart */}
              <div className="card">
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,fontWeight:600}}><BarChart2 size={16} className="text-orange"/> En Çok İade Nedeni</div>
                <div style={{ height: 180, width: '100%', position: 'relative' }}>
                  <canvas ref={chartRef}></canvas>
                </div>
              </div>
              
              {/* Bölgesel İadeler */}
              <div className="card">
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,fontWeight:600}}><MapPin size={16} className="text-blue"/> Bölgesel İadeler</div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:8,borderBottom:'1px solid var(--border)'}}><span style={{fontSize:13}}>İstanbul</span><span className="badge badge-warning">34 İade</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:8,borderBottom:'1px solid var(--border)'}}><span style={{fontSize:13}}>Ankara</span><span className="badge badge-warning">18 İade</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:8,borderBottom:'1px solid var(--border)'}}><span style={{fontSize:13}}>İzmir</span><span className="badge badge-warning">12 İade</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13}}>Bursa</span><span className="badge badge-warning">7 İade</span></div>
                </div>
              </div>

              {/* AI & Fraud */}
              <div className="card" style={{background:'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(245,158,11,0.05) 100%)',border:'1px solid rgba(239,68,68,0.2)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,fontWeight:600,color:'var(--accent-red)'}}><Bot size={16}/> AI Analizi & Şüpheli İşlemler</div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{background:'rgba(255,255,255,0.02)',padding:12,borderRadius:8,border:'1px solid var(--border)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:11,color:'var(--accent-red)',fontWeight:600,marginBottom:2}}>Riskli Müşteri</div>
                      <div style={{fontSize:11,color:'var(--accent-red)',fontWeight:700,background:'rgba(239,68,68,0.1)',padding:'2px 6px',borderRadius:4}}>Risk: 91/100</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:600,marginTop:2}}>Mehmet Yılmaz</div>
                    <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:4}}>Son 30 günde 8 iade gerçekleştirdi. (Müşteri engellenebilir)</div>
                  </div>
                  <div style={{background:'rgba(255,255,255,0.02)',padding:12,borderRadius:8,border:'1px solid var(--border)'}}>
                    <div style={{fontSize:11,color:'var(--accent-orange)',fontWeight:600,marginBottom:2}}>Şüpheli İade Analizi</div>
                    <div style={{fontSize:14,fontWeight:600,fontFamily:"'Geist Mono',monospace"}}>IRD-001278</div>
                    <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:4}}>Sürekli "Eksik Ürün" bildirimi yapılıyor. Manuel inceleme önerilir.</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Yeni İade Talebi</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateReturn}>
                <div className="form-group">
                  <label className="form-label">Sipariş Seçin (Sadece teslim edilmiş kargolar)</label>
                  <select className="form-select" value={selectedOrder} onChange={e => setSelectedOrder(e.target.value)} required>
                    <option value="">-- Sipariş Seçin --</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>{o.tracking_number} - {o.customer_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">İade Nedeni</label>
                  <select className="form-select" value={reason} onChange={e => setReason(e.target.value)} required>
                    <option value="">-- Neden Seçin --</option>
                    <option value="Hasarlı Paket">Hasarlı Paket</option>
                    <option value="Yanlış Ürün">Yanlış Ürün</option>
                    <option value="Alıcı Kabul Etmedi">Alıcı Kabul Etmedi</option>
                    <option value="Müşteri Vazgeçti">Müşteri Vazgeçti</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Oluştur</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Details Drawer ── */}
      {selectedReturnDetails && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedReturnDetails(null)} />
          <div className="drawer" style={{ maxWidth: 650 }}>
            <div className="drawer-header">
              <div className="drawer-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <RotateCcw size={18} style={{color:'var(--accent-blue)'}}/> 
                İade Detayı <code style={{fontFamily:"'Geist Mono',monospace",fontSize:14,background:'var(--bg-secondary)',padding:'2px 6px',borderRadius:4}}>{selectedReturnDetails.return_tracking_number}</code>
              </div>
              <button className="drawer-close" onClick={() => setSelectedReturnDetails(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {/* 📋 Genel Bilgiler */}
              <div className="drawer-section">
                <div className="drawer-section-title"><FileText size={15} className="text-orange" /> Genel Bilgiler</div>
                <div className="grid-2" style={{gap:12}}>
                  <div className="drawer-row"><span className="drawer-label">Orijinal Sipariş</span><span className="drawer-value"><code style={{fontFamily:"'Geist Mono',monospace"}}>#{selectedReturnDetails.original_order_id}</code></span></div>
                  <div className="drawer-row"><span className="drawer-label">Gönderici</span><span className="drawer-value">TechMarket Elektronik</span></div>
                  <div className="drawer-row"><span className="drawer-label">Alıcı</span><span className="drawer-value">Ahmet Kaya</span></div>
                  <div className="drawer-row"><span className="drawer-label">Tarih</span><span className="drawer-value">{new Date(selectedReturnDetails.created_at).toLocaleString('tr-TR')}</span></div>
                  <div className="drawer-row" style={{gridColumn:'span 2'}}><span className="drawer-label">İade Sebebi</span><span className="drawer-value text-red" style={{fontWeight:600}}>{selectedReturnDetails.reason || 'Bilinmiyor'}</span></div>
                </div>
              </div>

              {/* 📍 İade Süreci (Timeline) */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Activity size={15} className="text-purple" /> İade Süreci</div>
                <div style={{background:'var(--bg-secondary)',padding:'20px 24px',borderRadius:10,border:'1px solid var(--border)'}}>
                  <div className="timeline" style={{position:'relative',paddingLeft:20}}>
                    <div style={{position:'absolute',left:6,top:8,bottom:8,width:2,background:'var(--border)'}}/>
                    {(() => {
                      const cAt = new Date(selectedReturnDetails.created_at);
                      const d1 = new Date(cAt.getTime() + 11*60000);
                      const d2 = new Date(cAt.getTime() + 24*60000);
                      const d3 = new Date(cAt.getTime() + 99*60000);
                      const d4 = new Date(cAt.getTime() + 139*60000);
                      const s = selectedReturnDetails.status;
                      
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
                          {tItem('İade Talebi Açıldı', cAt, s==='pending', s!=='pending', 'var(--accent-blue-light)')}
                          {tItem('Kurye Atandı', d1, false, s!=='pending', 'var(--accent-orange-light)')}
                          {tItem('Ürün Toplandı', d2, false, s==='received'||s==='completed', 'var(--accent-amber)')}
                          {tItem('Depoya Ulaştı', d3, s==='received', s==='completed', 'var(--accent-orange)')}
                          {tItem('İade Tamamlandı', d4, s==='completed', false, 'var(--accent-green)')}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 🚚 İade Operasyonu */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Truck size={15} className="text-blue" /> İade Operasyonu</div>
                <div className="grid-2" style={{gap:16}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,background:'var(--bg-secondary)',padding:12,borderRadius:8,border:'1px solid var(--border)'}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',display:'flex',alignItems:'center',justifyContent:'center'}}><User size={20} className="text-muted"/></div>
                    <div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>Atanan Kurye</div>
                      <div style={{fontSize:14,fontWeight:600}}>Hasan Şen</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12,background:'var(--bg-secondary)',padding:12,borderRadius:8,border:'1px solid var(--border)'}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',display:'flex',alignItems:'center',justifyContent:'center'}}><Truck size={20} className="text-muted"/></div>
                    <div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>Depo & Araç</div>
                      <div style={{fontSize:14,fontWeight:600}}>Merkez Depo <span style={{color:'var(--text-secondary)',fontWeight:400}}>(34 AB 5128)</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📸 Kanıt Belgeleri */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Camera size={15} className="text-amber" /> Kanıt Belgeleri</div>
                <div className="grid-3" style={{gap:12}}>
                  <div style={{border:'1px solid var(--border)',borderRadius:8,padding:16,textAlign:'center',background:'rgba(255,255,255,0.02)',cursor:'pointer'}} className="hover-bg-secondary">
                    <Image size={24} style={{color:'var(--accent-blue-light)',margin:'0 auto 8px auto'}}/>
                    <div style={{fontSize:12,fontWeight:500}}>Teslim Fotoğrafı</div>
                  </div>
                  <div style={{border:'1px solid var(--border)',borderRadius:8,padding:16,textAlign:'center',background:'rgba(255,255,255,0.02)',cursor:'pointer'}} className="hover-bg-secondary">
                    <Image size={24} style={{color:'var(--accent-red)',margin:'0 auto 8px auto'}}/>
                    <div style={{fontSize:12,fontWeight:500}}>Hasar Fotoğrafı</div>
                  </div>
                  <div style={{border:'1px solid var(--border)',borderRadius:8,padding:16,textAlign:'center',background:'rgba(255,255,255,0.02)',cursor:'pointer'}} className="hover-bg-secondary" onClick={() => window.print()}>
                    <FileText size={24} style={{color:'var(--accent-purple)',margin:'0 auto 8px auto'}}/>
                    <div style={{fontSize:12,fontWeight:500}}>İade Formu (PDF)</div>
                  </div>
                </div>
              </div>

              {/* 💰 İade Maliyeti */}
              <div className="drawer-section">
                <div className="drawer-section-title"><DollarSign size={15} className="text-green" /> Operasyon Maliyeti</div>
                <div style={{display:'flex',gap:24,alignItems:'flex-start'}}>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                    <div className="drawer-row" style={{borderBottom:'none',padding:'2px 0'}}><span className="drawer-label">Toplama Maliyeti</span><span className="drawer-value">₺3.400</span></div>
                    <div className="drawer-row" style={{borderBottom:'none',padding:'2px 0'}}><span className="drawer-label">Transfer Maliyeti</span><span className="drawer-value">₺1.900</span></div>
                    <div className="drawer-row" style={{borderBottom:'none',padding:'6px 0',marginTop:4,borderTop:'1px solid var(--border)'}}><span className="drawer-label" style={{fontWeight:600}}>Toplam İade Maliyeti</span><span className="drawer-value text-red" style={{fontWeight:700,fontSize:16}}>₺5.300</span></div>
                  </div>
                  <div style={{width:160,background:'rgba(239,68,68,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(239,68,68,0.2)',textAlign:'center',alignSelf:'stretch',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                    <ShieldAlert size={24} className="text-red" style={{margin:'0 auto 8px auto'}}/>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--accent-red)'}}>Zarar Etkisi</div>
                    <div style={{fontSize:15,fontWeight:700,marginTop:4}}>Yüksek</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
}
