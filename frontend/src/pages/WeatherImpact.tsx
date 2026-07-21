import { useEffect, useState } from 'react';
import { getWeather, getWeatherImpact } from '../services/api';
import { CloudRain, Wind, Droplets, AlertTriangle, ArrowRight } from 'lucide-react';

export default function WeatherImpact() {
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulator states
  const [simCondition, setSimCondition] = useState('clear');
  const [simBaseMinutes, setSimBaseMinutes] = useState(60);
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    getWeather()
      .then(res => setWeatherData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSimulate = async () => {
    try {
      const res = await getWeatherImpact({ condition: simCondition, base_minutes: simBaseMinutes });
      setSimResult(res.data);
    } catch (e) {
      alert("Hata oluştu");
    }
  };

  return (
    <div className="page-container">
      <div className="topbar">
        <div>
          <div className="topbar-title">Hava Durumu Etki Modülü</div>
          <div className="topbar-subtitle">Hava koşullarına göre dinamik ETA güncellemeleri ve lojistik etki analizi</div>
        </div>
      </div>

      <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Canlı Hava Durumu (5 Şehir) */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Büyük Şehirler - Canlı Durum</h3>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
          ) : (
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
              {weatherData.map((w, idx) => (
                <div key={idx} style={{
                  minWidth: 200, flex: 1, padding: 16, borderRadius: 12,
                  background: 'var(--surface-container)',
                  border: `1px solid ${w.impact_color}40`,
                  boxShadow: `0 4px 12px ${w.impact_color}15`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{w.city}</div>
                    <div style={{ fontSize: 24 }}>{w.icon}</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    {w.temperature}°C
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Droplets size={12}/> %{w.humidity}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Wind size={12}/> {w.wind_speed} km/s</span>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4,
                    background: `${w.impact_color}20`, color: w.impact_color, textAlign: 'center'
                  }}>
                    {w.impact_label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kurallar Tablosu & Simülatör */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Etki Kuralları</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Koşul</th>
                  <th>Görsel</th>
                  <th>Etki (Gecikme)</th>
                  <th>Risk Seviyesi</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Açık / Bulutlu</td><td>☀️ ⛅</td><td>Normal (%0)</td><td><span className="badge badge-success">Düşük</span></td></tr>
                <tr><td>Hafif Yağmur</td><td>🌦️</td><td>+%15 Süre</td><td><span className="badge badge-primary">Orta</span></td></tr>
                <tr><td>Sis</td><td>🌫️</td><td>+%20 Süre</td><td><span className="badge badge-warning">Orta-Yüksek</span></td></tr>
                <tr><td>Kar</td><td>❄️</td><td>+%40 Süre</td><td><span style={{color:'var(--accent-purple)', fontWeight:600}}>Yüksek</span></td></tr>
                <tr><td>Fırtına / Şiddetli Yağış</td><td>⛈️ 🌪️</td><td>+%60 Süre</td><td><span className="badge badge-danger">Kritik</span></td></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>ETA Simülatörü</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Hava Koşulu</label>
                <select className="form-select" value={simCondition} onChange={e => setSimCondition(e.target.value)}>
                  <option value="clear">Açık / Normal</option>
                  <option value="rain">Yağmur (+%15)</option>
                  <option value="fog">Sis (+%20)</option>
                  <option value="snow">Kar (+%40)</option>
                  <option value="storm">Fırtına (+%60)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Normal Tahmini Süre (Dakika)</label>
                <input type="number" className="form-input" value={simBaseMinutes} onChange={e => setSimBaseMinutes(Number(e.target.value))} />
              </div>
              <button className="btn btn-primary" onClick={handleSimulate}>Simüle Et</button>

              {simResult && (
                <div style={{
                  marginTop: 8, padding: 16, borderRadius: 8,
                  background: `color-mix(in srgb, ${simResult.color} 15%, transparent)`,
                  border: `1px solid ${simResult.color}40`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Normal</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{simResult.base_minutes} <span style={{fontSize:12}}>dk</span></div>
                    </div>
                    <ArrowRight color="var(--text-muted)" />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: simResult.color }}>Yeni ETA</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: simResult.color }}>{simResult.total_minutes} <span style={{fontSize:12}}>dk</span></div>
                    </div>
                  </div>

                  {simResult.warning && (
                    <div style={{ display: 'flex', gap: 8, color: '#EF4444', fontSize: 12, alignItems: 'center', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 4 }}>
                      <AlertTriangle size={16} /> {simResult.message}
                    </div>
                  )}
                  {!simResult.warning && simResult.extra_minutes > 0 && (
                     <div style={{ fontSize: 12, color: simResult.color, textAlign: 'center' }}>
                       {simResult.message}
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
