import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Package, Warehouse, Truck, MapPin, TrendingUp,
  Clock, AlertTriangle, RefreshCw, Activity, Zap
} from 'lucide-react';
import { getOrderStats, getOrders, getDepots, getCouriers, getDashboardAnalytics } from '../services/api';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor', in_transit: 'Taşımada', out_for_delivery: 'Dağıtımda',
  delivered: 'Teslim', failed: 'Başarısız'
};
const STATUS_COLORS = ['#F59E0B','#FF5722','#8B5CF6','#10B981','#EF4444'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(91,64,57,0.4)', borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</p>
        <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>
          {payload[0].value} {payload[0].name === 'revenue' ? '₺' : ''}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, o, d, c, a] = await Promise.all([
        getOrderStats(), getOrders({ limit: 200 }), getDepots({ is_active: true }), getCouriers(), getDashboardAnalytics(7)
      ]);
      setStats(s.data);
      setOrders(o.data);
      setDepots(d.data);
      setCouriers(c.data);
      setAnalytics(a.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const recentOrders = orders.slice(0, 8);
  const pieData = stats ? [
    { name: 'Bekliyor', value: stats.pending },
    { name: 'Taşımada', value: stats.in_transit },
    { name: 'Dağıtımda', value: stats.out_for_delivery },
    { name: 'Teslim', value: stats.delivered },
    { name: 'Başarısız', value: stats.failed },
  ].filter(d => d.value > 0) : [];

  const activeCouriers = couriers.filter(c => c.status === 'on_delivery').length;
  const availableCouriers = couriers.filter(c => c.status === 'available').length;

  const kpis = [
    { label: 'Toplam Sipariş', value: stats?.total ?? 0, icon: Package, color: '#FF5722', change: 'Genel', dir: 'neutral', highlight: true },
    { label: 'SLA Başarısı', value: `%${analytics?.sla_percentage ?? 0}`, icon: Zap, color: '#10B981', change: 'Zamanında Teslim', dir: 'up', highlight: false },
    { label: 'Aktif Depolar', value: depots.length, icon: Warehouse, color: '#8B5CF6', change: `${depots.length} şehir`, dir: 'neutral', highlight: false },
    { label: 'Aktif Kuryeler', value: activeCouriers, icon: Truck, color: '#F59E0B', change: `${availableCouriers} müsait`, dir: 'neutral', highlight: false },
    { label: 'Bekleyen Sipariş', value: stats?.pending ?? 0, icon: Clock, color: '#F59E0B', change: 'İşlem gerekli', dir: 'down', highlight: false },
    { label: 'Bakımdaki Araçlar', value: analytics?.fleet_status?.maintenance ?? 0, icon: AlertTriangle, color: '#EF4444', change: `Toplam ${analytics?.fleet_status?.total ?? 0} araç`, dir: 'up', highlight: false },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-subtitle">Genel sistem özeti — analitikler ve anlık veri</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            <span>Veriler yükleniyor...</span>
          </div>
        ) : (
          <>
            {/* KPI Kartlar */}
            <div className="kpi-grid">
              {kpis.map((k) => (
                <div key={k.label} className="kpi-card" style={{ '--kpi-color': k.color } as any}>
                  <div className="kpi-icon" style={{ background: `${k.color}18`, color: k.color }}>
                    <k.icon size={22} />
                  </div>
                  <div className={`kpi-value ${k.highlight ? 'highlight' : ''}`}>{typeof k.value === 'number' ? k.value.toLocaleString('tr-TR') : k.value}</div>
                  <div className="kpi-label">{k.label}</div>
                  <div className={`kpi-change ${k.dir}`}>
                    <TrendingUp size={11} />
                    {k.change}
                  </div>
                </div>
              ))}
            </div>

            {/* Grafikler */}
            <div className="grid-2 mb-6">
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title"><TrendingUp size={16} className="text-orange" /> Günlük Sipariş Hacmi</div>
                    <div className="card-subtitle">Son 7 gün</div>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.trend_data ?? []}>
                      <defs>
                        <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF5722" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FF5722" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="orders" stroke="#FF5722" strokeWidth={2} fill="url(#orangeGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title"><Activity size={16} className="text-green" /> Gelir Trendi (₺)</div>
                    <div className="card-subtitle">Son 7 gün</div>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.trend_data ?? []}>
                      <XAxis dataKey="date" tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid-2 mb-6">
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title"><Package size={16} className="text-amber" /> Sipariş Dağılımı</div>
                    <div className="card-subtitle">Anlık durum</div>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title"><Truck size={16} className="text-blue" /> Kurye Performansı</div>
                    <div className="card-subtitle">En çok teslimat yapan 5 kurye (Son 7 gün)</div>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.courier_performance ?? []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#ab8980', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="deliveries" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Son Siparişler */}
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Package size={16} className="text-orange" /> Son Siparişler</div>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Takip No</th>
                      <th>Müşteri</th>
                      <th>İl</th>
                      <th>Depo</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td><code style={{ fontSize: 12, color: 'var(--accent-blue-light)' }}>{o.tracking_number}</code></td>
                        <td>{o.customer_name}</td>
                        <td><MapPin size={12} style={{ marginRight: 4, opacity: 0.6 }} />{o.province_name ?? '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{o.depot_name ?? <span style={{ opacity: 0.4 }}>Atanmamış</span>}</td>
                        <td><span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status] ?? o.status}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
