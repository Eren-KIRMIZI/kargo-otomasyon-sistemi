import { useState, useEffect } from 'react';
import { getProvinces, getDemandForecast, getDeliveryTime, retrainModels } from '../services/api';
import { Brain, TrendingUp, Clock, RefreshCw, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AIInsights() {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Talep Tahmini State
  const [demandProvId, setDemandProvId] = useState<string>('34');
  const [demandDays, setDemandDays] = useState<number>(7);
  const [forecast, setForecast] = useState<any>(null);
  
  // Teslimat Süresi State
  const [delivProvId, setDelivProvId] = useState<string>('34');
  const [distance, setDistance] = useState<number>(15);
  const [traffic, setTraffic] = useState<number>(0.5);
  const [weight, setWeight] = useState<number>(1);
  const [delivEst, setDelivEst] = useState<any>(null);

  useEffect(() => {
    getProvinces().then(r => setProvinces(r.data));
  }, []);

  const runDemandForecast = async () => {
    setLoading(true);
    try {
      const res = await getDemandForecast({ province_id: Number(demandProvId), days_ahead: demandDays });
      setForecast(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runDeliveryEstimate = async () => {
    setLoading(true);
    try {
      const res = await getDeliveryTime({
        province_id: Number(delivProvId),
        distance_km: distance,
        traffic_level: traffic,
        weight_kg: weight,
        day_of_week: new Date().getDay(),
        hour_of_day: new Date().getHours()
      });
      setDelivEst(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setLoading(true);
    try {
      await retrainModels();
      alert("Modeller başarıyla geçmiş verilerle eğitildi.");
    } catch (e) {
      alert("Model eğitimi başarısız oldu.");
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,87,34,0.3)', padding: '12px 16px', borderRadius: 12, fontSize: 12, backdropFilter: 'blur(10px)' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontFamily: "'Geist Mono', monospace" }}>{label}</div>
          <div style={{ color: 'var(--accent-orange-light)', fontWeight: 700, fontSize: 16 }}>{payload[0].value} <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>sipariş</span></div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            Güven Aralığı: <span style={{ color: 'var(--text-primary)' }}>{payload[0].payload.confidence_low} - {payload[0].payload.confidence_high}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">AI Tahmin Modülleri</div>
          <div className="topbar-subtitle">Makine öğrenmesi ile geleceğe yönelik operasyonel tahminler</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleRetrain} disabled={loading} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Modelleri Eğit
        </button>
      </div>

      <div className="page-content">
        <div className="grid-2 mb-6">
          {/* Talep Tahmini */}
          <div className="card">
            <div className="card-header border-b pb-4 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title"><TrendingUp size={18} style={{ color: 'var(--accent-orange-light)' }} /> Sipariş Talep Tahmini (XGBoost)</div>
                <div className="card-subtitle">Geçmiş verilere göre gelecek günlerin sipariş yoğunluğu</div>
              </div>
            </div>

            <div className="form-row mb-4">
              <div className="form-group">
                <label className="form-label">İl Seçin</label>
                <select className="form-select" value={demandProvId} onChange={e => setDemandProvId(e.target.value)}>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Gün Sayısı</label>
                <input type="number" className="form-input" min={1} max={30} value={demandDays} onChange={e => setDemandDays(+e.target.value)} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary w-full" onClick={runDemandForecast} disabled={loading} style={{ justifyContent: 'center' }}>
                  <Activity size={16} /> Tahmin Et
                </button>
              </div>
            </div>

            {forecast && (
              <>
                <div className="grid-2 mb-4">
                  <div style={{ background: 'var(--surface-high)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: "'Geist Mono', monospace", textTransform: 'uppercase' }}>Model MAE (Hata Payı)</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-orange-light)', fontFamily: "'Hanken Grotesk', sans-serif" }}>±{forecast.model_mae} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>sipariş</span></div>
                  </div>
                  <div style={{ background: 'var(--surface-high)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: "'Geist Mono', monospace", textTransform: 'uppercase' }}>Model RMSE</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Hanken Grotesk', sans-serif" }}>{forecast.model_rmse}</div>
                  </div>
                </div>

                <div className="chart-container" style={{ height: 280, marginTop: 24 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecast.forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF5722" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FF5722" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#ab8980', fontSize: 11, fontFamily: "'Geist Mono', monospace" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#ab8980', fontSize: 11, fontFamily: "'Geist Mono', monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,87,34,0.5)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="predicted_orders" stroke="#FF5722" strokeWidth={3} fill="url(#colorOrange)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Teslimat Süresi Tahmini */}
          <div className="card">
            <div className="card-header border-b pb-4 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title"><Clock size={18} style={{ color: 'var(--accent-amber)' }} /> Teslimat Süresi Tahmini (Random Forest)</div>
                <div className="card-subtitle">Mesafe, trafik ve ağırlığa göre tahmini teslimat süresi</div>
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">İl Seçin</label>
              <select className="form-select" value={delivProvId} onChange={e => setDelivProvId(e.target.value)}>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mesafe (km)</span>
                <span style={{ color: 'var(--accent-orange-light)', fontFamily: "'Geist Mono', monospace" }}>{distance} km</span>
              </label>
              <input type="range" min={1} max={500} value={distance} onChange={e => setDistance(+e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-orange)' }} />
            </div>

            <div className="form-group mb-4">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Trafik Yoğunluğu</span>
                <span style={{ color: 'var(--accent-orange-light)', fontFamily: "'Geist Mono', monospace" }}>{Math.round(traffic * 100)}%</span>
              </label>
              <input type="range" min={0} max={1} step={0.05} value={traffic} onChange={e => setTraffic(+e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-orange)' }} />
            </div>

            <div className="form-group mb-6">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Kargo Ağırlığı (kg)</span>
                <span style={{ color: 'var(--accent-orange-light)', fontFamily: "'Geist Mono', monospace" }}>{weight} kg</span>
              </label>
              <input type="range" min={0.5} max={50} step={0.5} value={weight} onChange={e => setWeight(+e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-orange)' }} />
            </div>

            <button className="btn btn-secondary w-full" onClick={runDeliveryEstimate} disabled={loading} style={{ justifyContent: 'center' }}>
              <Brain size={16} /> Süre Hesapla
            </button>

            {delivEst && (
              <div style={{ marginTop: 24, background: 'var(--surface-high)', padding: '24px 20px', borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, fontFamily: "'Geist Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tahmini Teslimat Süresi</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent-orange-light)', lineHeight: 1, marginBottom: 12, fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  {delivEst.estimated_hours} <span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>Saat</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, display: 'inline-block', border: '1px solid var(--border)' }}>
                  Güven Aralığı: <strong style={{ color: 'var(--text-primary)' }}>{delivEst.confidence_interval[0]} - {delivEst.confidence_interval[1]}</strong> saat
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
