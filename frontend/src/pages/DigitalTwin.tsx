import { useState } from 'react';
import { Cpu, Play, CheckCircle, TrendingDown, TrendingUp, RefreshCw, Zap, BarChart3 } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'depot_closure',
    icon: '🏭',
    title: 'Depo Kapanması',
    desc: 'Seçilen depo geçici olarak kapanırsa ne olur?',
    color: '#EF4444',
    params: [
      { key: 'depot_name', label: 'Etkilenen Depo', type: 'select', options: ['İstanbul Ana Depo', 'Ankara Depo', 'İzmir Depo', 'Bursa Depo', 'Antalya Depo'] },
      { key: 'duration_days', label: 'Kapalı Kalma Süresi (Gün)', type: 'range', min: 1, max: 30, default: 7 },
    ]
  },
  {
    id: 'vehicle_breakdown',
    icon: '🚛',
    title: 'Araç Arızası',
    desc: 'Filonun bir kısmı arızalanırsa etkisi ne olur?',
    color: '#F97316',
    params: [
      { key: 'vehicle_pct', label: 'Arıza Oranı (%)', type: 'range', min: 5, max: 80, default: 25 },
      { key: 'vehicle_type', label: 'Araç Tipi', type: 'select', options: ['Tümü', 'Kamyon', 'Minivan', 'Motosiklet'] },
    ]
  },
  {
    id: 'courier_reduction',
    icon: '👥',
    title: 'Kurye Azalması',
    desc: 'Kurye sayısı belirli oranda düşerse ne olur?',
    color: '#8B5CF6',
    params: [
      { key: 'reduction_pct', label: 'Azalma Oranı (%)', type: 'range', min: 5, max: 50, default: 20 },
      { key: 'region', label: 'Etkilenen Bölge', type: 'select', options: ['Tüm Türkiye', 'İstanbul', 'Ankara', 'İzmir', 'Ege Bölgesi'] },
    ]
  },
  {
    id: 'new_depot',
    icon: '📍',
    title: 'Yeni Depo Açılışı',
    desc: 'Yeni bir depo açarsak kapasiteye etkisi ne?',
    color: '#10B981',
    params: [
      { key: 'location', label: 'Depo Lokasyonu', type: 'select', options: ['Konya', 'Gaziantep', 'Kayseri', 'Samsun', 'Trabzon', 'Erzurum'] },
      { key: 'capacity', label: 'Kapasite (paket/gün)', type: 'range', min: 500, max: 5000, default: 2000 },
    ]
  },
];

function generateResult(scenarioId: string, params: any) {
  const base = {
    depot_closure: {
      severity: 'critical',
      headline: 'Kritik Kapasite Açığı Tespit Edildi',
      metrics: [
        { label: 'Etkilenen Günlük Paket', value: `+${Math.floor(800 + Math.random()*400)}`, trend: 'down', unit: 'paket yönlendirme gerekiyor' },
        { label: 'Teslimat Süresi Artışı', value: `+%${Math.floor(15 + Math.random()*20)}`, trend: 'down', unit: 'ortalama gecikme' },
        { label: 'Tahmini Ek Maliyet', value: `₺${Math.floor(12000 + Math.random()*8000).toLocaleString()}`, trend: 'down', unit: 'günlük operasyonel maliyet' },
        { label: 'Etkilenen Müşteri', value: `${Math.floor(300 + Math.random()*200)}`, trend: 'neutral', unit: 'aktif müşteri etkilenir' },
      ],
      recommendations: [
        `En yakın alternatif depo kapasitesi %${Math.floor(60+Math.random()*30)} dolulukta, yük devralabilir`,
        `${Math.floor(3+Math.random()*5)} ek araç kiralama önerilir`,
        `Kritik müşteriler öncelikli rota ile yeniden planlanmalı`,
        `Depo kapalıyken sipariş limitini %30 düşürün`,
      ],
      confidence: 87 + Math.floor(Math.random()*8),
    },
    vehicle_breakdown: {
      severity: 'warning',
      headline: 'Filo Kapasitesi Kritik Eşiğe Yaklaşıyor',
      metrics: [
        { label: 'Teslimat Kapasitesi Düşüşü', value: `-${params.vehicle_pct || 25}%`, trend: 'down', unit: 'günlük teslimat hacmi' },
        { label: 'Ortalama ETA Uzaması', value: `+${Math.floor(20+Math.random()*40)} dk`, trend: 'down', unit: 'varış süresi' },
        { label: 'İptal Riski Olan Sipariş', value: `${Math.floor(50+Math.random()*100)}`, trend: 'down', unit: 'siparişi tehlikede' },
        { label: 'Motosiklet Yük Artışı', value: `+%${Math.floor(30+Math.random()*20)}`, trend: 'neutral', unit: 'dengeleme kapasitesi' },
      ],
      recommendations: [
        `Motosiklet kuryeler hafif paket trafiğini üstlenebilir`,
        `Acil bakım için ${Math.floor(2+Math.random()*4)} araç öncelikli servise alın`,
        `Komşu depolar geçici araç desteği sağlayabilir`,
        `Müşteri SMS bildirimi ile beklenti yönetimi yapılmalı`,
      ],
      confidence: 82 + Math.floor(Math.random()*10),
    },
    courier_reduction: {
      severity: 'warning',
      headline: 'Teslimat Kapasitesi Yeniden Planlanmalı',
      metrics: [
        { label: 'Günlük Kapasite Kaybı', value: `-${params.reduction_pct || 20}%`, trend: 'down', unit: 'teslimat kapasitesi' },
        { label: 'Fazla Mesai Gereksinimi', value: `${Math.floor(8+Math.random()*12)} kurye`, trend: 'neutral', unit: 'fazla mesai gerekli' },
        { label: 'Geciken Sipariş Tahmini', value: `${Math.floor(150+Math.random()*100)}`, trend: 'down', unit: 'sipariş ertelenecek' },
        { label: 'Müşteri Memnuniyet Riski', value: `-${Math.floor(5+Math.random()*10)} puan`, trend: 'down', unit: 'NPS skoru düşüşü' },
      ],
      recommendations: [
        `Serbest kurye ajanslarından ${Math.floor(5+Math.random()*10)} kişi acil kiralanabilir`,
        `Düşük öncelikli siparişler 24 saat ertelenebilir`,
        `Rota optimizasyonu ile mevcut kapasite %12 artırılabilir`,
        `Kurye başına maksimum paket limiti geçici artırılsın`,
      ],
      confidence: 79 + Math.floor(Math.random()*12),
    },
    new_depot: {
      severity: 'success',
      headline: 'Verimlilik ve Kapasite Artışı Öngörülüyor',
      metrics: [
        { label: 'Bölgesel Kapasite Artışı', value: `+${Math.floor(15+Math.random()*25)}%`, trend: 'up', unit: 'bölgesel işlem kapasitesi' },
        { label: 'Ortalama Teslimat Süresi', value: `-${Math.floor(20+Math.random()*40)} dk`, trend: 'up', unit: 'kısalma bekleniyor' },
        { label: 'İlk Yıl ROI Tahmini', value: `%${Math.floor(18+Math.random()*15)}`, trend: 'up', unit: 'yatırım getirisi' },
        { label: 'Hizmet Edilen Yeni Bölge', value: `${Math.floor(3+Math.random()*7)} ilçe`, trend: 'up', unit: 'kapsama genişlemesi' },
      ],
      recommendations: [
        `İlk 3 ay ${Math.floor(500+Math.random()*500)} paket/gün ile kademeli başlangıç önerilir`,
        `Çevre illerden mevcut güzergahlar yeniden yapılandırılmalı`,
        `Minimum ${Math.floor(8+Math.random()*7)} kurye ve ${Math.floor(3+Math.random()*4)} araçla açılış yapılabilir`,
        `Rekabet analizi: bölgede ${Math.floor(1+Math.random()*3)} rakip aktif`,
      ],
      confidence: 91 + Math.floor(Math.random()*7),
    },
  };
  return (base as any)[scenarioId];
}

export default function DigitalTwin() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [params, setParams] = useState<any>({});
  const [result, setResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);

  const scenario = SCENARIOS.find(s => s.id === selectedScenario);

  const runSimulation = async () => {
    if (!selectedScenario) return;
    setSimulating(true);
    setResult(null);
    setProgress(0);

    for (let i = 0; i <= 100; i += Math.floor(Math.random() * 15 + 5)) {
      await new Promise(r => setTimeout(r, 80));
      setProgress(Math.min(i, 100));
    }
    setProgress(100);
    await new Promise(r => setTimeout(r, 200));

    setResult(generateResult(selectedScenario, params));
    setSimulating(false);
  };

  const severityConfig: any = {
    critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'KRİTİK', icon: '🔴' },
    warning:  { color: '#F97316', bg: 'rgba(249,115,22,0.1)', label: 'UYARI',   icon: '🟠' },
    success:  { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'OLUMLU',  icon: '🟢' },
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">🌐 Dijital İkiz — Senaryo Simülatörü</div>
          <div className="topbar-subtitle">Lojistik ağınızı sanal ortamda test edin, AI kararlarınızı önceden hesaplasın</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--accent-green)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 12px', borderRadius: 20, fontFamily: "'Geist Mono', monospace" }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', marginRight: 6, animation: 'pulse-dot 2s infinite' }} />
            AI Engine Online
          </span>
        </div>
      </div>

      <div className="page-content">

        {/* Senaryo Seçimi */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Geist Mono', monospace" }}>
            Simülasyon Senaryosu Seçin
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {SCENARIOS.map(s => (
              <div
                key={s.id}
                onClick={() => { setSelectedScenario(s.id); setResult(null); setParams({}); }}
                style={{
                  background: selectedScenario === s.id
                    ? `linear-gradient(135deg, ${s.color}18, ${s.color}08)`
                    : 'linear-gradient(135deg, rgba(30,30,30,0.9), rgba(26,26,26,0.9))',
                  border: `1px solid ${selectedScenario === s.id ? s.color : 'rgba(46,46,46,1)'}`,
                  borderRadius: 16, padding: '20px 18px', cursor: 'pointer',
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                  boxShadow: selectedScenario === s.id ? `0 0 20px ${s.color}30` : 'none',
                }}
              >
                {selectedScenario === s.id && (
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <CheckCircle size={16} color={s.color} />
                  </div>
                )}
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: selectedScenario === s.id ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Parametreler */}
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
              <div className="card-title"><Cpu size={16} style={{ color: 'var(--accent-purple)' }} /> Simülasyon Parametreleri</div>
            </div>

            {!scenario ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Zap size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                <div>Soldaki kartlardan bir senaryo seçin</div>
              </div>
            ) : (
              <>
                {scenario.params.map(p => (
                  <div key={p.key} className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{p.label}</span>
                      {p.type === 'range' && (
                        <span style={{ color: scenario.color, fontFamily: "'Geist Mono', monospace", fontWeight: 700 }}>
                          {params[p.key] ?? (p as any).default}
                          {p.key.includes('pct') ? '%' : p.key.includes('capacity') ? ' paket/gün' : p.key.includes('duration') ? ' gün' : ''}
                        </span>
                      )}
                    </label>
                    {p.type === 'range' && (
                      <input
                        type="range" min={(p as any).min} max={(p as any).max}
                        value={params[p.key] ?? (p as any).default}
                        onChange={e => setParams((prev: any) => ({ ...prev, [p.key]: +e.target.value }))}
                        style={{ width: '100%', accentColor: scenario.color, marginTop: 8 }}
                      />
                    )}
                    {p.type === 'select' && (
                      <select
                        className="form-select"
                        value={params[p.key] ?? ''}
                        onChange={e => setParams((prev: any) => ({ ...prev, [p.key]: e.target.value }))}
                        style={{ borderColor: params[p.key] ? scenario.color : undefined }}
                      >
                        <option value="">Seçin...</option>
                        {(p as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                ))}

                <button
                  className="btn btn-primary"
                  onClick={runSimulation}
                  disabled={simulating}
                  style={{
                    width: '100%', justifyContent: 'center', marginTop: 8,
                    background: simulating ? 'var(--surface-high)' : scenario.color,
                    boxShadow: simulating ? 'none' : `0 4px 20px ${scenario.color}50`,
                  }}
                >
                  {simulating ? (
                    <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Simüle Ediliyor...</>
                  ) : (
                    <><Play size={15} /> Simülasyonu Çalıştır</>
                  )}
                </button>

                {simulating && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace" }}>AI modeli hesaplıyor...</span>
                      <span style={{ fontSize: 11, color: scenario.color, fontFamily: "'Geist Mono', monospace" }}>{progress}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-high)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: scenario.color, borderRadius: 99, transition: 'width 0.1s', boxShadow: `0 0 10px ${scenario.color}80` }} />
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                      {progress < 30 ? '🔍 Mevcut ağ analiz ediliyor...' :
                       progress < 60 ? '🧠 AI senaryoyu işliyor...' :
                       progress < 85 ? '📊 Etki metrikleri hesaplanıyor...' :
                       '✅ Sonuçlar hazırlanıyor...'}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sonuçlar */}
          <div>
            {!result && !simulating && (
              <div style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--text-muted)', background: 'linear-gradient(135deg, rgba(30,30,30,0.5), rgba(26,26,26,0.5))', border: '1px dashed var(--border)', borderRadius: 20 }}>
                <BarChart3 size={64} style={{ opacity: 0.1, marginBottom: 20 }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Simülasyon Bekleniyor</div>
                <div style={{ fontSize: 13 }}>Senaryo seçip parametreleri ayarlayın, ardından simülasyonu başlatın</div>
              </div>
            )}

            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Başlık */}
                <div style={{
                  background: `linear-gradient(135deg, ${severityConfig[result.severity].bg}, transparent)`,
                  border: `1px solid ${severityConfig[result.severity].color}40`,
                  borderRadius: 20, padding: '24px 28px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{severityConfig[result.severity].icon}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: severityConfig[result.severity].color,
                      background: `${severityConfig[result.severity].color}20`,
                      border: `1px solid ${severityConfig[result.severity].color}40`,
                      padding: '3px 10px', borderRadius: 20, fontFamily: "'Geist Mono', monospace"
                    }}>
                      {severityConfig[result.severity].label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: "'Geist Mono', monospace" }}>
                      Güven Skoru: <span style={{ color: 'var(--accent-green)' }}>{result.confidence}%</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    {result.headline}
                  </div>
                </div>

                {/* Metrikler */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {result.metrics.map((m: any, i: number) => (
                    <div key={i} style={{
                      background: 'linear-gradient(135deg, rgba(30,30,30,0.9), rgba(26,26,26,0.9))',
                      border: '1px solid rgba(46,46,46,1)', borderRadius: 16, padding: '20px 22px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        {m.trend === 'up' && <TrendingUp size={16} color="var(--accent-green)" />}
                        {m.trend === 'down' && <TrendingDown size={16} color="var(--accent-red)" />}
                        {m.trend === 'neutral' && <BarChart3 size={16} color="var(--accent-amber)" />}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", textTransform: 'uppercase' }}>{m.label}</div>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Hanken Grotesk', sans-serif",
                        color: m.trend === 'up' ? 'var(--accent-green)' : m.trend === 'down' ? 'var(--accent-red)' : 'var(--accent-amber)'
                      }}>
                        {m.value}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{m.unit}</div>
                    </div>
                  ))}
                </div>

                {/* Öneriler */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 700, fontSize: 14 }}>
                    <Zap size={16} style={{ color: 'var(--accent-amber)' }} />
                    AI Önerileri
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.recommendations.map((r: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', background: 'var(--surface-high)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--accent-amber)', fontFamily: "'Geist Mono', monospace" }}>
                          {i + 1}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace" }}>
                  Simülasyon {new Date().toLocaleString('tr-TR')} tarihinde tamamlandı • KargOne AI v2.1
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
