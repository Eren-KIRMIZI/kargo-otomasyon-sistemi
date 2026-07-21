import { useEffect, useState } from 'react';
import { getDashboardAnalytics } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  FileText, TrendingUp, Truck, CheckCircle, Clock, AlertCircle, 
  Calendar, DollarSign, Bot, Download, User, X, Building, 
  ShieldAlert, BarChart2, Activity, MapPin, Package
} from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(91,64,57,0.4)', borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color || 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>
            {entry.name === 'revenue' ? 'Gelir: ' : ''}{entry.value} {entry.name === 'revenue' ? '₺' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const COLORS = ['#FF5722', '#10B981', '#3b82f6', '#F59E0B', '#EF4444'];

export default function Reports() {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoReport, setAutoReport] = useState(true);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardAnalytics(days);
      setAnalytics(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  if (loading && !analytics) {
    return (
      <div className="page-content">
        <div className="loading-center">
          <div className="spinner" />
          <span>Raporlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  // Calculate totals from trend_data
  const totalDeliveries = analytics?.trend_data?.reduce((acc: number, item: any) => acc + item.orders, 0) || 0;
  const successfulDeliveries = analytics?.trend_data?.reduce((acc: number, item: any) => acc + item.delivered, 0) || 0;
  const delayedDeliveries = totalDeliveries - successfulDeliveries;

  const fleetData = [
    { name: 'Aktif', value: analytics?.fleet_status?.active || 0 },
    { name: 'Bakımda', value: analytics?.fleet_status?.maintenance || 0 },
    { name: 'Boşta', value: (analytics?.fleet_status?.total || 0) - (analytics?.fleet_status?.active || 0) - (analytics?.fleet_status?.maintenance || 0) }
  ].filter(d => d.value > 0);

  const returnsData = [
    { name: 'Teslim Alınmadı', value: 45 },
    { name: 'Hasarlı Ürün', value: 30 },
    { name: 'Adres Hatası', value: 25 },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Raporlar ve Analitik (BI)</div>
          <div className="topbar-subtitle">Detaylı iş zekası, finansal metrikler ve operasyon raporları</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <Calendar size={14} color="var(--text-muted)" />
            <select
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: 12, fontWeight: 600, fontFamily: "'Geist Mono', monospace", cursor: 'pointer' }}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Son 7 Gün</option>
              <option value={30}>Son 30 Gün</option>
              <option value={90}>Son 90 Gün</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={autoReport} onChange={() => setAutoReport(!autoReport)} style={{ accentColor: 'var(--accent-blue)' }} />
              Haftalık Rapor
            </label>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchData} title="CSV İndir"><FileText size={14} /> CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={fetchData} title="Excel İndir"><FileText size={14} /> Excel</button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()} title="PDF İndir"><Download size={14} /> PDF</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        
        {/* 🤖 AI İçgörü Paneli */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.05) 100%)', border: '1px solid rgba(139,92,246,0.2)', padding: '16px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={24} className="text-purple" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 4 }}>AI İş Zekası (İçgörü)</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <strong>Ankara Bölgesi'nde</strong> gecikmeler son 14 günde <strong>%18 arttı</strong>. Muhtemel neden: <strong>Kurye yoğunluğu ve trafik artışı</strong>. Bu bölgeye geçici kapasite kaydırılması önerilir.
            </div>
          </div>
        </div>

        {/* Finansal Metrikler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{'--kpi-color':'#10B981'} as any}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={16} style={{color:'#10B981'}}/> Toplam Gelir</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>₺1.248.000</div>
            <div style={{ fontSize: 12, color: '#10B981', marginTop: 8 }}>+ %12 Geçen aya göre</div>
          </div>
          <div className="card" style={{'--kpi-color':'var(--accent-blue)'} as any}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} style={{color:'var(--accent-blue)'}}/> Ort. Sipariş Geliri</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>₺182</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Geçen aya göre sabit</div>
          </div>
          <div className="card" style={{'--kpi-color':'var(--accent-purple)'} as any}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} style={{color:'var(--accent-purple)'}}/> En Karlı Bölge</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>İstanbul</div>
            <div style={{ fontSize: 12, color: 'var(--accent-purple)', marginTop: 8 }}>%45 ciro payı</div>
          </div>
          <div className="card" style={{'--kpi-color':'var(--accent-orange)'} as any}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} style={{color:'var(--accent-orange)'}}/> En Karlı Müşteri</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Trendyol</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>B2B Kurumsal</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid-2 mb-6">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><TrendingUp size={16} className="text-blue" /> Sipariş ve Teslimat Trendi</div>
                <div className="card-subtitle">Zaman içindeki değişim</div>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.trend_data ?? []}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="orders" name="Alınan Sipariş" stroke="#3b82f6" strokeWidth={2} fill="url(#colorOrders)" />
                  <Area type="monotone" dataKey="delivered" name="Teslim Edilen" stroke="#10B981" strokeWidth={2} fill="url(#colorDelivered)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><Truck size={16} className="text-orange" /> Kurye Performansı <span style={{fontSize:11,fontWeight:400,color:'var(--text-muted)'}}>(Detay için tıklayın)</span></div>
                <div className="card-subtitle">En çok teslimat yapan kuryeler</div>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.courier_performance ?? []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="deliveries" name="Teslimat" fill="#FF5722" radius={[0, 4, 4, 0]} barSize={24}>
                    {analytics?.courier_performance?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{cursor:'pointer'}} onClick={() => setSelectedCourier(entry)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Depo Performansı & SLA Detay */}
        <div className="grid-2 mb-6">
          {/* Depo & Bölge Tablosu */}
          <div className="card">
            <div className="card-header" style={{borderBottom:'1px solid var(--border)',paddingBottom:12,marginBottom:12}}>
              <div className="card-title"><Building size={16} className="text-purple" /> Depo ve Bölge Performans Raporu</div>
            </div>
            <div className="table-container" style={{overflow:'visible'}}>
              <table className="table" style={{minWidth:'100%'}}>
                <thead>
                  <tr>
                    <th>Depo / Bölge</th>
                    <th>Sipariş</th>
                    <th>SLA Başarısı</th>
                    <th>İade Oranı</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><div style={{fontWeight:600}}>Ankara Merkez Depo</div><div style={{fontSize:11,color:'var(--text-muted)'}}>Bölge 1</div></td>
                    <td>1.250</td>
                    <td><span className="badge" style={{background:'rgba(16,185,129,0.1)',color:'#10b981'}}>%96</span></td>
                    <td>%2.1</td>
                  </tr>
                  <tr>
                    <td><div style={{fontWeight:600}}>İzmir Lojistik Hub</div><div style={{fontSize:11,color:'var(--text-muted)'}}>Bölge 2</div></td>
                    <td>890</td>
                    <td><span className="badge" style={{background:'rgba(245,158,11,0.1)',color:'#f59e0b'}}>%89</span></td>
                    <td>%3.4</td>
                  </tr>
                  <tr>
                    <td><div style={{fontWeight:600}}>Antalya Dağıtım Yeri</div><div style={{fontSize:11,color:'var(--text-muted)'}}>Bölge 3</div></td>
                    <td>730</td>
                    <td><span className="badge" style={{background:'rgba(16,185,129,0.1)',color:'#10b981'}}>%98</span></td>
                    <td>%1.2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SLA Detay Raporu */}
          <div className="card">
            <div className="card-header" style={{borderBottom:'1px solid var(--border)',paddingBottom:12,marginBottom:12}}>
              <div className="card-title"><Clock size={16} className="text-blue" /> SLA Detay Raporu</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>SLA İçinde (Zamanında)</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Hedef süre aşılmadı</div>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--accent-green)'}}>447</div>
              </div>
              <div style={{height:1,background:'var(--border)'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>0-1 Saat Gecikme</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Kabul edilebilir gecikme</div>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--accent-amber)'}}>21</div>
              </div>
              <div style={{height:1,background:'var(--border)'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>1-3 Saat Gecikme</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Orta riskli gecikme</div>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--accent-orange)'}}>9</div>
              </div>
              <div style={{height:1,background:'var(--border)'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>3+ Saat Gecikme</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Kritik gecikme</div>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--accent-red)'}}>2</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid-2 mb-6">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><AlertCircle size={16} className="text-red" /> Araç & Verimlilik Raporu</div>
                <div className="card-subtitle">Filo genel sağlık durumu ve tüketim</div>
              </div>
            </div>
            <div className="chart-container" style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fleetData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                      {fleetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Aktif' ? '#10B981' : entry.name === 'Bakımda' ? '#EF4444' : '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v:any, n:any) => [v, n]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Toplam Mesafe</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>42.500 km</div>
                </div>
                <div style={{ background: 'rgba(59,130,246,0.05)', padding: 12, borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Yakıt Tüketimi</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-blue)' }}>7.2 L/100km</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.05)', padding: 12, borderRadius: 12, border: '1px solid rgba(239,68,68,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-red)', textTransform: 'uppercase' }}>Bakım Gecikmesi</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-red)' }}>0</div>
                </div>
              </div>
            </div>
          </div>

          {/* İade & İhlal Analitiği */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><ShieldAlert size={16} className="text-orange" /> İade ve Olay Analitiği</div>
                <div className="card-subtitle">İade nedenleri ve ihlallerin dağılımı</div>
              </div>
            </div>
            <div className="chart-container" style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontSize:13,color:'var(--text-secondary)'}}>Toplam İade</span>
                  <span style={{fontSize:16,fontWeight:700,color:'var(--text-primary)'}}>24</span>
                </div>
                <div style={{height:1,background:'var(--border)'}}/>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontSize:13,color:'var(--text-secondary)'}}>İade Oranı</span>
                  <span style={{fontSize:16,fontWeight:700,color:'var(--accent-red)'}}>%3.1</span>
                </div>
                <div style={{height:1,background:'var(--border)'}}/>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontSize:13,color:'var(--text-secondary)'}}>Hasarlı Kargo</span>
                  <span style={{fontSize:16,fontWeight:700,color:'var(--accent-orange)'}}>14 Olay</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontSize:13,color:'var(--text-secondary)'}}>Kurye İhlali</span>
                  <span style={{fontSize:16,fontWeight:700,color:'var(--accent-purple)'}}>5 Olay</span>
                </div>
              </div>
              <div style={{ flex: 1, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={returnsData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value">
                      {returnsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v:any, n:any) => [v, n]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Drill-Down Drawer for Courier Performance ── */}
      {selectedCourier && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedCourier(null)} />
          <div className="drawer" style={{ maxWidth: 550 }}>
            <div className="drawer-header">
              <div className="drawer-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <BarChart2 size={18} style={{color:'var(--accent-blue)'}}/> 
                Kurye Verimlilik Endeksi (BI)
              </div>
              <button className="drawer-close" onClick={() => setSelectedCourier(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,background:'var(--bg-secondary)',padding:20,borderRadius:12,border:'1px solid var(--border)'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(59,130,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <User size={32} className="text-blue"/>
                </div>
                <div>
                  <div style={{fontSize:13,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>Drill Down Analiz</div>
                  <div style={{fontSize:24,fontWeight:700}}>{selectedCourier.name}</div>
                  <div style={{fontSize:13,color:'var(--text-secondary)'}}>Son 30 Günlük Veri Özeti</div>
                </div>
              </div>

              <div className="grid-2" style={{gap:16,marginBottom:24}}>
                <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,padding:16}}>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}><Package size={12} style={{display:'inline',marginRight:4}}/> Toplam Teslimat</div>
                  <div style={{fontSize:28,fontWeight:800,color:'var(--text-primary)'}}>{selectedCourier.deliveries}</div>
                </div>
                <div style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:10,padding:16}}>
                  <div style={{fontSize:12,color:'var(--accent-green)',fontWeight:600,marginBottom:4}}><CheckCircle size={12} style={{display:'inline',marginRight:4}}/> Teslimat Başarısı</div>
                  <div style={{fontSize:28,fontWeight:800,color:'var(--accent-green)'}}>%96</div>
                </div>
                <div style={{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:16}}>
                  <div style={{fontSize:12,color:'var(--accent-amber)',fontWeight:600,marginBottom:4}}><Clock size={12} style={{display:'inline',marginRight:4}}/> Ort. Teslim Süresi</div>
                  <div style={{fontSize:28,fontWeight:800,color:'var(--accent-amber)'}}>24 dk</div>
                </div>
                <div style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,padding:16}}>
                  <div style={{fontSize:12,color:'var(--accent-red)',fontWeight:600,marginBottom:4}}><ShieldAlert size={12} style={{display:'inline',marginRight:4}}/> İhlal Sayısı</div>
                  <div style={{fontSize:28,fontWeight:800,color:'var(--accent-red)'}}>1</div>
                </div>
              </div>

              <div style={{background:'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:12,padding:24,textAlign:'center'}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--accent-blue-light)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Genel Verimlilik Skoru</div>
                <div style={{fontSize:48,fontWeight:800,color:'var(--text-primary)',margin:'8px 0'}}>
                  91<span style={{fontSize:20,color:'var(--text-muted)'}}>/100</span>
                </div>
                <div style={{fontSize:13,color:'var(--text-secondary)'}}>Kurye şirket ortalamasının üzerinde performans sergiliyor.</div>
              </div>

            </div>
          </div>
        </>
      )}
    </>
  );
}
