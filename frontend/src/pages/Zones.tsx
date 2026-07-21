import { useEffect, useState } from 'react';
import { getZones } from '../services/api';
import { 
  Grid3x3, Map as MapIcon, Info, Activity, Layers, Crosshair, 
  Package, Truck, MapPin, BarChart2, ShieldAlert, CloudRain, Bot, 
  X, FileText, Clock, TrendingUp, User, Eye, Thermometer 
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Zones() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneDetails, setSelectedZoneDetails] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getZones();
      setZones(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeCount = zones.filter(z => z.is_active).length;
  const kmeansCount = zones.filter(z => z.algorithm === 'kmeans').length;
  const dbscanCount = zones.filter(z => z.algorithm === 'dbscan').length;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Teslimat Bölgeleri</div>
          <div className="topbar-subtitle">Algoritmalarla oluşturulmuş dinamik bölgeler</div>
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          <MapIcon size={16} /> Haritadan Oluştur
        </button>
      </div>

      <div className="page-content">
        {/* KPI Mini-Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-orange)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(255,87,34,0.1)', color: 'var(--accent-orange-light)' }}>
              <Layers size={22} />
            </div>
            <div className="kpi-value highlight">{zones.length}</div>
            <div className="kpi-label">Toplam Bölge</div>
            <div className="kpi-change neutral">Küme sayısı</div>
          </div>

          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-green)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>
              <Activity size={22} />
            </div>
            <div className="kpi-value">{activeCount}</div>
            <div className="kpi-label">Aktif Bölgeler</div>
            <div className="kpi-change up">Kullanımda</div>
          </div>

          <div className="kpi-card" style={{ '--kpi-color': '#06B6D4' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(6,182,212,0.1)', color: '#22D3EE' }}>
              <Crosshair size={22} />
            </div>
            <div className="kpi-value">{kmeansCount}</div>
            <div className="kpi-label">K-Means Modeli</div>
            <div className="kpi-change neutral">Merkez bazlı</div>
          </div>

          <div className="kpi-card" style={{ '--kpi-color': '#8B5CF6' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#A78BFA' }}>
              <Grid3x3 size={22} />
            </div>
            <div className="kpi-value">{dbscanCount}</div>
            <div className="kpi-label">DBSCAN Modeli</div>
            <div className="kpi-change neutral">Yoğunluk bazlı</div>
          </div>
        </div>

        {zones.length === 0 && !loading && (
          <div style={{ background: 'rgba(255,87,34,0.05)', border: '1px solid rgba(255,87,34,0.2)', padding: '20px', borderRadius: 16, display: 'flex', gap: 16, color: 'var(--text-primary)', marginBottom: 24, alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(255,87,34,0.1)', padding: 8, borderRadius: 10, color: 'var(--accent-orange-light)' }}>
              <Info size={24} />
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, fontFamily: "'Hanken Grotesk', sans-serif" }}>Henüz oluşturulmuş bir teslimat bölgesi bulunmuyor.</h3>
              <span style={{ color: 'var(--text-secondary)' }}>
                Sol menüden <strong>Operations Map</strong> sayfasına giderek <strong>K-Means</strong> veya <strong>DBSCAN</strong> algoritmaları ile mevcut siparişlerinizi kümeleyerek otomatik bölgeler oluşturabilirsiniz.
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            <span>Bölgeler yükleniyor...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {zones.map((z) => (
              <div key={z.id} className="vehicle-card" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Colored accent line on the left edge */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: z.color || 'var(--accent-orange)' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingLeft: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Hanken Grotesk', sans-serif" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${z.color || 'var(--accent-orange)'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={14} style={{ color: z.color || 'var(--accent-orange)' }} />
                      </div>
                      {z.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontFamily: "'Geist Mono', monospace" }}>
                      ID: #{z.id} • Oluşturulma: {format(new Date(z.created_at), 'dd MMM', { locale: tr })}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--surface-high)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: "'Geist Mono', monospace", border: '1px solid var(--border)' }}>
                    {z.algorithm}
                  </span>
                </div>

                <div style={{ paddingLeft: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <Layers size={14} className="text-muted"/>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Ankara Merkez Depo <span style={{color:'var(--text-muted)', fontWeight:500}}>(ANK-M)</span></div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingLeft: 8, marginBottom: 16 }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Package size={12}/> Sipariş</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>284 <span style={{fontSize:11,color:'var(--accent-green)',fontWeight:500}}>(%94)</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>43 Aktif</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Truck size={12}/> Kurye</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>6 <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:500}}>Toplam</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>4 Aktif, 2 Müsait</div>
                  </div>
                </div>

                <div style={{ paddingLeft: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Bölge Yükü (Doluluk)</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-red)' }}>%82</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '82%', background: 'linear-gradient(90deg, var(--accent-orange), var(--accent-red))', borderRadius: 3 }} />
                  </div>
                </div>

                <div style={{ paddingLeft: 8, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {z.is_active ? (
                      <span className="chip chip-delivering" style={{ padding: '2px 8px' }}><span className="chip-dot" />Aktif Bölge</span>
                    ) : (
                      <span className="chip chip-off-duty" style={{ padding: '2px 8px' }}>Pasif Bölge</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedZoneDetails(z)}>
                      <Eye size={14} /> Detay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Zone Details Drawer ── */}
      {selectedZoneDetails && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedZoneDetails(null)} />
          <div className="drawer" style={{ maxWidth: 650 }}>
            <div className="drawer-header">
              <div className="drawer-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <MapPin size={18} style={{color:'var(--accent-blue)'}}/> 
                Bölge Detayı <span style={{color:'var(--text-muted)'}}>—</span> {selectedZoneDetails.name}
              </div>
              <button className="drawer-close" onClick={() => setSelectedZoneDetails(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {/* 🗺️ Harita Önizleme & Genel Bilgiler */}
              <div className="drawer-section">
                <div className="drawer-section-title"><MapIcon size={15} className="text-blue" /> Harita Önizleme & Konum</div>
                <div className="grid-2" style={{gap:16}}>
                  <div style={{background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:12,height:140,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',width:100,height:100,border:'2px dashed var(--accent-blue)',borderRadius:'50%',opacity:0.3}} />
                    <MapPin size={24} className="text-blue" style={{marginBottom:8,zIndex:1}}/>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--accent-blue)',zIndex:1}}>Bölge Sınırı</div>
                    <div style={{fontSize:10,color:'var(--text-muted)',fontFamily:"'Geist Mono',monospace",marginTop:4,zIndex:1}}>r ≈ 4.2 km</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',justifyContent:'center',gap:12}}>
                    <div className="drawer-row" style={{padding:0,border:0}}><span className="drawer-label">Merkez Enlem</span><span className="drawer-value"><code style={{fontFamily:"'Geist Mono',monospace"}}>{selectedZoneDetails.center_lat?.toFixed(5) || '—'}</code></span></div>
                    <div className="drawer-row" style={{padding:0,border:0}}><span className="drawer-label">Merkez Boylam</span><span className="drawer-value"><code style={{fontFamily:"'Geist Mono',monospace"}}>{selectedZoneDetails.center_lon?.toFixed(5) || '—'}</code></span></div>
                    <div className="drawer-row" style={{padding:0,border:0}}><span className="drawer-label">Algoritma</span><span className="drawer-value"><span className="badge badge-warning" style={{textTransform:'uppercase'}}>{selectedZoneDetails.algorithm}</span></span></div>
                  </div>
                </div>
              </div>

              {/* 🤖 AI Analizi & Risk Skoru */}
              <div className="grid-2" style={{gap:16}}>
                <div className="drawer-section">
                  <div className="drawer-section-title"><Bot size={15} className="text-purple" /> AI Bölge Analizi</div>
                  <div style={{background:'rgba(139,92,246,0.05)',padding:16,borderRadius:10,border:'1px solid rgba(139,92,246,0.2)',height:'100%'}}>
                    <div style={{fontSize:13,color:'var(--text-primary)',lineHeight:1.6,marginBottom:12}}>
                      Bu bölgedeki sipariş hacmi son 7 günde <strong>%18 arttı</strong>. Kapasite aşımlarını önlemek için <strong>+2 ek kurye</strong> önerilir.
                    </div>
                    <button className="btn btn-sm btn-outline" style={{width:'100%',borderColor:'var(--accent-purple)',color:'var(--accent-purple)'}}>Kurye Talep Et</button>
                  </div>
                </div>
                <div className="drawer-section">
                  <div className="drawer-section-title"><ShieldAlert size={15} className="text-red" /> Risk Skoru</div>
                  <div style={{background:'rgba(239,68,68,0.05)',padding:16,borderRadius:10,border:'1px solid rgba(239,68,68,0.2)',height:'100%'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                      <div style={{fontSize:28,fontWeight:800,color:'var(--accent-red)'}}>74<span style={{fontSize:14,color:'var(--text-muted)'}}>/100</span></div>
                      <div style={{fontSize:12,color:'var(--accent-red)',fontWeight:600}}>Yüksek Risk</div>
                    </div>
                    <div style={{fontSize:12,color:'var(--text-secondary)'}}>• Yoğun trafik algılandı.<br/>• Yüksek sipariş hacmi.<br/>• Bölgesel yağış uyarısı.</div>
                  </div>
                </div>
              </div>

              {/* 📊 Bölge Performansı & Hava Durumu */}
              <div className="grid-2" style={{gap:16}}>
                <div className="drawer-section">
                  <div className="drawer-section-title"><Activity size={15} className="text-green" /> Bölge Performansı</div>
                  <div style={{background:'var(--bg-secondary)',padding:16,borderRadius:10,border:'1px solid var(--border)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div style={{fontSize:12,color:'var(--text-muted)'}}>Ort. Teslimat</div>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>2.4 Saat</div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div style={{fontSize:12,color:'var(--text-muted)'}}>SLA Başarısı</div>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--accent-green)'}}>%96</div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:12,color:'var(--text-muted)'}}>İade Oranı</div>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--accent-red)'}}>%2.1</div>
                    </div>
                  </div>
                </div>
                <div className="drawer-section">
                  <div className="drawer-section-title"><CloudRain size={15} className="text-blue" /> Bölgesel Hava Durumu</div>
                  <div style={{background:'rgba(59,130,246,0.05)',padding:16,borderRadius:10,border:'1px solid rgba(59,130,246,0.2)',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                      <CloudRain size={24} className="text-blue"/>
                      <div>
                        <div style={{fontSize:14,fontWeight:600}}>Sağanak Yağışlı</div>
                        <div style={{fontSize:12,color:'var(--text-muted)'}}>Yağış Riski: <span style={{color:'var(--accent-blue)',fontWeight:600}}>%70</span></div>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:'var(--accent-orange)',fontWeight:600,marginTop:8}}>
                      ⚠️ Beklenen Gecikme: +25 dk
                    </div>
                  </div>
                </div>
              </div>

              {/* 🔄 Bölge Geçmişi (Timeline) */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Clock size={15} className="text-orange" /> Bölge Geçmişi</div>
                <div style={{background:'var(--bg-secondary)',padding:'20px 24px',borderRadius:10,border:'1px solid var(--border)'}}>
                  <div className="timeline" style={{position:'relative',paddingLeft:20}}>
                    <div style={{position:'absolute',left:6,top:8,bottom:8,width:2,background:'var(--border)'}}/>
                    
                    <div style={{position:'relative',marginBottom:16}}>
                      <div style={{position:'absolute',left:-24,top:2,width:10,height:10,borderRadius:'50%',background:'var(--accent-blue)',border:`2px solid var(--accent-blue)`,zIndex:1}}/>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{fontSize:14,fontWeight:600,color:'var(--accent-blue)'}}>Merkez güncellendi</div>
                        <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:"'Geist Mono',monospace"}}>21 Haz</div>
                      </div>
                    </div>

                    <div style={{position:'relative',marginBottom:16}}>
                      <div style={{position:'absolute',left:-24,top:2,width:10,height:10,borderRadius:'50%',background:'var(--bg-card)',border:`2px solid var(--text-muted)`,zIndex:1}}/>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)'}}>Kurye sayısı artırıldı (+2)</div>
                        <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:"'Geist Mono',monospace"}}>20 Haz</div>
                      </div>
                    </div>

                    <div style={{position:'relative',opacity:0.6}}>
                      <div style={{position:'absolute',left:-24,top:2,width:10,height:10,borderRadius:'50%',background:'var(--bg-card)',border:`2px solid var(--text-muted)`,zIndex:1}}/>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)'}}>{selectedZoneDetails.algorithm.toUpperCase()} Algoritması ile oluşturuldu</div>
                        <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:"'Geist Mono',monospace"}}>19 Haz</div>
                      </div>
                    </div>

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
