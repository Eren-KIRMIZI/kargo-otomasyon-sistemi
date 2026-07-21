import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Clock, MapPin, Package, TrendingDown, Eye, Shield, Zap, BellRing, CheckCircle, XCircle, Radio } from 'lucide-react';

type AnomalyType = 'long_wait' | 'suspicious_route' | 'delay_region' | 'unusual_movement';
type Severity = 'critical' | 'warning' | 'info';

interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  title: string;
  detail: string;
  location: string;
  time: string;
  tracking?: string;
  courier?: string;
  resolved: boolean;
  age_minutes: number;
}

const ANOMALY_CONFIGS: Record<AnomalyType, { icon: string; label: string; color: string }> = {
  long_wait:         { icon: '⏳', label: 'Uzun Bekleme',        color: '#F97316' },
  suspicious_route:  { icon: '🗺️', label: 'Şüpheli Rota',       color: '#EF4444' },
  delay_region:      { icon: '📍', label: 'Geciken Bölge',       color: '#F59E0B' },
  unusual_movement:  { icon: '🚨', label: 'Olağandışı Hareket',  color: '#8B5CF6' },
};

const SEV_CONFIG: Record<Severity, { color: string; bg: string; label: string }> = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  label: 'KRİTİK' },
  warning:  { color: '#F97316', bg: 'rgba(249,115,22,0.1)', label: 'UYARI'  },
  info:     { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', label: 'BİLGİ'  },
};

function generateAnomaly(): Anomaly {
  const types: AnomalyType[] = ['long_wait', 'suspicious_route', 'delay_region', 'unusual_movement'];
  const type = types[Math.floor(Math.random() * types.length)];
  const couriers = ['Ahmet Yılmaz', 'Fatma Kaya', 'Mehmet Demir', 'Ali Şahin', 'Can Öztürk', 'Selin Yıldız'];
  const regions = ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Bağcılar', 'Maltepe', 'Pendik', 'Ataşehir', 'Sarıyer'];
  const courier = couriers[Math.floor(Math.random() * couriers.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  const trackNum = `TRK${Math.floor(Math.random() * 9000000 + 1000000)}`;
  const age = Math.floor(Math.random() * 120 + 5);

  const templates: Record<AnomalyType, { sev: Severity; titles: string[]; details: string[] }> = {
    long_wait: {
      sev: 'warning',
      titles: [
        `Paket ${age}+ dakikadır beklemede`,
        'Bekleme süresi normalin 3 katını aştı',
        'Uzun süreli depo bekleme tespit edildi',
      ],
      details: [
        `${trackNum} numaralı paket ${region} deposunda ${age} dakikadır hareket etmedi. Standart bekleme süresi 15 dakikadır.`,
        `Kurye ${courier} son ${age} dakikadır aynı konumda. Teslimat noktasından uzaklaşmadı.`,
        `Müşteri teslimat onayı bekleniyor ancak ${age} dakikadır iletişim sağlanamıyor.`,
      ]
    },
    suspicious_route: {
      sev: 'critical',
      titles: [
        'Rota sapması tespit edildi',
        'Atanan güzergahtan ciddi sapma var',
        'Yetkisiz bölge girişi algılandı',
      ],
      details: [
        `Kurye ${courier}, ${region} üzerinden geçmesi gereken rotasından ${Math.floor(Math.random()*8+2)} km saptı. Optimize edilmiş rotaya uyum sağlanmıyor.`,
        `${trackNum} numaralı paket, kargo deposu yerine atanmamış bir konuma doğru ilerledi. Acil kontrol önerilir.`,
        `Kurye normal güzergahının dışına çıktı ve ${Math.floor(Math.random()*20+10)} dakikadır kapsama alanı dışında.`,
      ]
    },
    delay_region: {
      sev: 'warning',
      titles: [
        `${region} bölgesinde yoğun gecikme`,
        'Bölgesel teslimat süresi 2 kat arttı',
        'Sistematik gecikme örüntüsü tespit edildi',
      ],
      details: [
        `${region} bölgesinde son 2 saatte teslimat süresi ortalama %${Math.floor(Math.random()*50+30)} arttı. ${Math.floor(Math.random()*8+3)} kurye etkileniyor.`,
        `Bu bölgedeki ${Math.floor(Math.random()*20+10)} sipariş tutarlı gecikme yaşıyor. Trafik veya adres sorunu olabilir.`,
        `Hava durumu + trafik kombinasyonu nedeniyle ${region} güzergahlarında kritik yavaşlama gözlemlendi.`,
      ]
    },
    unusual_movement: {
      sev: age > 60 ? 'critical' : 'info',
      titles: [
        'Olağandışı hız değişimi algılandı',
        'Beklenmedik durma/hızlanma döngüsü',
        'Araç davranışı anomali gösteriyor',
      ],
      details: [
        `Kurye ${courier} son ${Math.floor(Math.random()*10+5)} dakikada ${Math.floor(Math.random()*8+3)} kez durdu. Bu döngü normalin ${Math.floor(Math.random()*3+2)} katıdır.`,
        `Araç hız telemetrisi anormal: 0 km/s ile 80 km/s arasında hızlı geçişler tespit edildi (${region} yakını).`,
        `GPS verisi: Kurye aynı 200m² alanda ${Math.floor(Math.random()*10+5)} kez dönüyor. Adres bulunamıyor olabilir.`,
      ]
    },
  };

  const tpl = templates[type];
  const titleIdx = Math.floor(Math.random() * tpl.titles.length);
  const detailIdx = Math.floor(Math.random() * tpl.details.length);

  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    severity: tpl.sev,
    title: tpl.titles[titleIdx],
    detail: tpl.details[detailIdx],
    location: region,
    time: new Date(Date.now() - age * 60000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    tracking: trackNum,
    courier,
    resolved: false,
    age_minutes: age,
  };
}

const INITIAL_ANOMALIES: Anomaly[] = Array.from({ length: 12 }, generateAnomaly);

const STATS = {
  total: INITIAL_ANOMALIES.length,
  critical: INITIAL_ANOMALIES.filter(a => a.severity === 'critical').length,
  warning: INITIAL_ANOMALIES.filter(a => a.severity === 'warning').length,
  resolved_today: 47,
  avg_resolve_time: '8.4 dk',
};

export default function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>(INITIAL_ANOMALIES);
  const [filter, setFilter] = useState<'all' | AnomalyType | Severity>('all');
  const [selected, setSelected] = useState<Anomaly | null>(null);
  const [liveMode, setLiveMode] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!liveMode) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (Math.random() > 0.4) {
        const newAnomaly = generateAnomaly();
        setAnomalies(prev => [newAnomaly, ...prev.slice(0, 49)]);
        setNewCount(prev => prev + 1);
        setTimeout(() => setNewCount(prev => Math.max(0, prev - 1)), 5000);
      }
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, [liveMode]);

  const filtered = anomalies.filter(a => {
    if (filter === 'all') return true;
    return a.type === filter || a.severity === filter;
  });

  const resolve = (id: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, resolved: true } : null);
  };

  const dismiss = (id: string) => {
    setAnomalies(prev => prev.filter(a => a.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const activeCount = anomalies.filter(a => !a.resolved).length;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">🔴 Anomali Tespit Merkezi</div>
          <div className="topbar-subtitle">Gerçek zamanlı şüpheli örüntü, gecikme ve hareket analizi</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {newCount > 0 && (
            <div style={{ fontSize: 12, color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 12px', borderRadius: 20, animation: 'pulse-dot 1s infinite', fontWeight: 700 }}>
              +{newCount} yeni anomali
            </div>
          )}
          <button
            onClick={() => setLiveMode(l => !l)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${liveMode ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
              background: liveMode ? 'rgba(239,68,68,0.1)' : 'var(--surface-high)',
              color: liveMode ? 'var(--accent-red)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <Radio size={13} style={{ animation: liveMode ? 'pulse-dot 1.5s infinite' : 'none' }} />
            {liveMode ? 'CANLI' : 'DURAKLADI'}
          </button>
        </div>
      </div>

      <div className="page-content">

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Aktif Anomali',     value: activeCount,              color: 'var(--accent-red)',          icon: <AlertTriangle size={18} /> },
            { label: 'Kritik',            value: anomalies.filter(a=>!a.resolved&&a.severity==='critical').length, color: '#EF4444', icon: <Zap size={18} /> },
            { label: 'Uyarı',            value: anomalies.filter(a=>!a.resolved&&a.severity==='warning').length,  color: '#F97316', icon: <BellRing size={18} /> },
            { label: 'Bugün Çözüldü',    value: STATS.resolved_today,    color: 'var(--accent-green)',         icon: <CheckCircle size={18} /> },
            { label: 'Ort. Çözüm Süresi', value: STATS.avg_resolve_time, color: 'var(--accent-blue)',          icon: <Clock size={18} /> },
          ].map(s => (
            <div key={s.label} className="kpi-card" style={{ '--kpi-color': s.color } as any}>
              <div className="kpi-icon" style={{ color: s.color }}>{s.icon}</div>
              <div className="kpi-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
              <div className="kpi-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 20, transition: 'all 0.3s', alignItems: 'start' }}>

          {/* Sol: Liste */}
          <div>
            {/* Filtreler */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {([
                ['all', '🔍 Tümü'],
                ['critical', '🔴 Kritik'],
                ['warning', '🟠 Uyarı'],
                ['long_wait', '⏳ Uzun Bekleme'],
                ['suspicious_route', '🗺️ Şüpheli Rota'],
                ['delay_region', '📍 Geciken Bölge'],
                ['unusual_movement', '🚨 Olağandışı'],
              ] as const).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                    background: filter === f ? 'var(--accent-orange)' : 'var(--surface-high)',
                    color: filter === f ? 'white' : 'var(--text-secondary)',
                    boxShadow: filter === f ? '0 4px 12px rgba(255,87,34,0.3)' : 'none',
                  }}
                >{label}</button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                {filtered.filter(a => !a.resolved).length} aktif / {filtered.length} toplam
              </span>
            </div>

            {/* Anomali Listesi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--surface-container)', borderRadius: 16 }}>
                  <Shield size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <div>Bu filtre için anomali bulunamadı</div>
                </div>
              )}

              {filtered.map(a => {
                const cfg = ANOMALY_CONFIGS[a.type];
                const sev = SEV_CONFIG[a.severity];
                const isActive = selected?.id === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelected(isActive ? null : a)}
                    style={{
                      background: a.resolved
                        ? 'rgba(16,185,129,0.04)'
                        : isActive
                          ? `linear-gradient(135deg, ${sev.bg}, rgba(26,26,26,0.9))`
                          : 'linear-gradient(135deg, rgba(30,30,30,0.9), rgba(26,26,26,0.9))',
                      border: `1px solid ${isActive ? sev.color + '60' : a.resolved ? 'rgba(16,185,129,0.2)' : 'rgba(46,46,46,1)'}`,
                      borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14,
                      opacity: a.resolved ? 0.6 : 1,
                      boxShadow: isActive && !a.resolved ? `0 0 20px ${sev.color}20` : 'none',
                    }}
                  >
                    {/* Severity göstergesi */}
                    <div style={{ width: 4, height: 48, borderRadius: 99, background: a.resolved ? 'var(--accent-green)' : sev.color, flexShrink: 0 }} />

                    <div style={{ fontSize: 22 }}>{cfg.icon}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: a.resolved ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {a.title}
                        </span>
                        {a.resolved && <span style={{ fontSize: 10, color: 'var(--accent-green)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99, fontFamily: "'Geist Mono', monospace" }}>ÇÖZÜLDÜ</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{a.location}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{a.time}</span>
                        <span style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                    </div>

                    {/* Severity badge */}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, flexShrink: 0,
                      color: sev.color, background: sev.bg, border: `1px solid ${sev.color}40`,
                      fontFamily: "'Geist Mono', monospace",
                    }}>{sev.label}</span>

                    {/* Yaş */}
                    <span style={{ fontSize: 11, color: a.age_minutes > 60 ? 'var(--accent-red)' : 'var(--text-muted)', minWidth: 52, textAlign: 'right', fontFamily: "'Geist Mono', monospace" }}>
                      {a.age_minutes >= 60 ? `${Math.floor(a.age_minutes / 60)}s ${a.age_minutes % 60}dk` : `${a.age_minutes}dk`}
                    </span>

                    {/* Aksiyonlar */}
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {!a.resolved && (
                        <button
                          onClick={() => resolve(a.id)}
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                        >
                          ✓ Çöz
                        </button>
                      )}
                      <button
                        onClick={() => dismiss(a.id)}
                        style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(46,46,46,1)', background: 'var(--surface-high)', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <XCircle size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ: Detay Paneli */}
          {selected && (
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ fontSize: 22 }}>{ANOMALY_CONFIGS[selected.type].icon}</div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                  <XCircle size={18} />
                </button>
              </div>

              <div style={{
                padding: '14px 16px', borderRadius: 12, marginBottom: 20,
                background: SEV_CONFIG[selected.severity].bg,
                border: `1px solid ${SEV_CONFIG[selected.severity].color}40`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: SEV_CONFIG[selected.severity].color, marginBottom: 6, fontFamily: "'Geist Mono', monospace" }}>
                  {SEV_CONFIG[selected.severity].label} — {ANOMALY_CONFIGS[selected.type].label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {selected.title}
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, padding: '12px 16px', background: 'var(--surface-high)', borderRadius: 10, border: '1px solid var(--border)' }}>
                {selected.detail}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {[
                  { label: 'Bölge',        value: selected.location, icon: <MapPin size={13} /> },
                  { label: 'Algılama',     value: selected.time,     icon: <Clock size={13} /> },
                  { label: 'Takip No',     value: selected.tracking || '—', icon: <Package size={13} /> },
                  { label: 'Kurye',        value: selected.courier || '—',  icon: <Eye size={13} /> },
                  { label: 'Süre',         value: `${selected.age_minutes} dakika önce`, icon: <TrendingDown size={13} /> },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>{r.icon}{r.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Önerilen aksiyon */}
              <div style={{ padding: '14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--accent-amber)', fontWeight: 700, marginBottom: 8, fontFamily: "'Geist Mono', monospace" }}>
                  ⚡ ÖNERİLEN AKSİYON
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {selected.type === 'long_wait' && 'Kurye ile iletişime geçin ve teslimat engeli olup olmadığını kontrol edin. 15 dakika yanıt alınamazsa yöneticiye bildirim gönderin.'}
                  {selected.type === 'suspicious_route' && 'GPS verisini gerçek zamanlı izleyin. Kurye ile irtibat kurun. Yanıt alınamazsa acil protokol devreye alın.'}
                  {selected.type === 'delay_region' && 'Bu bölgeye atanan yeni siparişleri geçici olarak askıya alın. Trafik durumunu kontrol edin ve alternatif güzergah önerin.'}
                  {selected.type === 'unusual_movement' && 'Kuryeye mesaj gönderin: adres sorununu bildirin. Destek hattından müşteri ile tekrar iletişim kurun.'}
                </div>
              </div>

              {!selected.resolved ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={() => resolve(selected.id)}>
                    <CheckCircle size={14} /> Çözüldü Olarak İşaretle
                  </button>
                  <button className="btn btn-secondary" onClick={() => dismiss(selected.id)} style={{ padding: '9px 14px' }}>
                    <XCircle size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: 'var(--accent-green)', fontWeight: 700, fontSize: 13 }}>
                  ✓ Bu anomali çözüldü
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
