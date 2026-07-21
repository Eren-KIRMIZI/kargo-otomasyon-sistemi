import { useState, useEffect } from 'react';
import {
  Truck, Plus, Edit2, Trash2, X, Fuel, Wrench, Activity,
  CheckCircle2, DollarSign, ChevronRight, User, MapPin, 
  BarChart2, Bot, Calendar, AlertCircle, Award, Zap, Navigation, Package
} from 'lucide-react';
import {
  getVehicles, createVehicle, updateVehicle, deleteVehicle,
  getAllMaintenance, createMaintenance, updateMaintenance,
  getAllFuelLogs, addFuelLog
} from '../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const TYPE_ICONS: Record<string, string> = { motorcycle: '🏍️', car: '🚗', van: '🚐', truck: '🚛' };
const TYPE_LABELS: Record<string, string> = { motorcycle: 'Motosiklet', car: 'Otomobil', van: 'Minivan', truck: 'Kamyon' };

function VehicleStatusChip({ status }: { status: string }) {
  if (status === 'active')      return <span className="chip chip-delivering"><span className="chip-dot"/>Aktif</span>;
  if (status === 'maintenance') return <span className="chip chip-maintenance"><Wrench size={10}/>Bakımda</span>;
  return <span className="chip chip-off-duty">Pasif</span>;
}

function MaintenanceStatusChip({ status }: { status: string }) {
  if (status === 'completed')   return <span className="chip chip-delivering">Tamamlandı</span>;
  if (status === 'in_progress') return <span className="chip chip-on-duty"><span className="chip-dot pulse"/>Devam Ediyor</span>;
  return <span className="chip chip-off-duty">Planlandı</span>;
}

function getFuelLevel(id: number) { return (((id * 37) % 81) + 15); }

export default function Vehicles() {
  const [tab, setTab] = useState<'fleet' | 'maintenance' | 'fuel'>('fleet');
  const [vehicles, setVehicles]         = useState<any[]>([]);
  const [maintenance, setMaintenance]   = useState<any[]>([]);
  const [fuelLogs, setFuelLogs]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  // Modals
  const [vehicleModal, setVehicleModal]   = useState(false);
  const [editingId, setEditingId]         = useState<number | null>(null);
  const [maintModal, setMaintModal]       = useState(false);
  const [fuelModal, setFuelModal]         = useState(false);

  // Selected Vehicle for Drawer
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<any>(null);

  const [vForm, setVForm] = useState({ plate: '', type: 'car', capacity_kg: 100, brand: '', model: '', status: 'active' });
  const [mForm, setMForm] = useState({ vehicle_id: 0, maintenance_type: '', description: '', cost: '', status: 'scheduled', scheduled_date: '', performed_by: '' });
  const [fForm, setFForm] = useState({ vehicle_id: 0, liters: '', cost_per_liter: '', odometer_km: '', fuel_station: '', filled_by: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [v, m, f] = await Promise.all([getVehicles(), getAllMaintenance(), getAllFuelLogs()]);
      setVehicles(v.data);
      setMaintenance(m.data);
      setFuelLogs(f.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ─── Vehicle CRUD ─── */
  const openVehicleModal = (v?: any) => {
    if (v) { setEditingId(v.id); setVForm({ plate: v.plate, type: v.type, capacity_kg: v.capacity_kg, brand: v.brand||'', model: v.model||'', status: v.status }); }
    else   { setEditingId(null); setVForm({ plate: '', type: 'car', capacity_kg: 100, brand: '', model: '', status: 'active' }); }
    setVehicleModal(true);
  };
  const submitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      editingId ? await updateVehicle(editingId, vForm) : await createVehicle(vForm);
      setVehicleModal(false); fetchAll();
    } catch (err: any) { alert(err.response?.data?.detail || 'Hata'); }
  };
  const handleDeleteVehicle = async (id: number) => {
    if (!confirm('Bu aracı silmek istiyor musunuz?')) return;
    await deleteVehicle(id); fetchAll();
  };

  /* ─── Maintenance ─── */
  const submitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMaintenance({ ...mForm, vehicle_id: Number(mForm.vehicle_id), cost: mForm.cost ? Number(mForm.cost) : null, scheduled_date: mForm.scheduled_date || null });
      setMaintModal(false); setMForm({ vehicle_id: 0, maintenance_type: '', description: '', cost: '', status: 'scheduled', scheduled_date: '', performed_by: '' });
      fetchAll();
    } catch (err: any) { alert(err.response?.data?.detail || 'Hata'); }
  };
  const completeMaintenance = async (id: number) => {
    await updateMaintenance(id, { status: 'completed' }); fetchAll();
  };

  /* ─── Fuel ─── */
  const submitFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addFuelLog({ ...fForm, vehicle_id: Number(fForm.vehicle_id), liters: Number(fForm.liters), cost_per_liter: fForm.cost_per_liter ? Number(fForm.cost_per_liter) : null, odometer_km: fForm.odometer_km ? Number(fForm.odometer_km) : null });
      setFuelModal(false); setFForm({ vehicle_id: 0, liters: '', cost_per_liter: '', odometer_km: '', fuel_station: '', filled_by: '' });
      fetchAll();
    } catch (err: any) { alert(err.response?.data?.detail || 'Hata'); }
  };

  const activeCount      = vehicles.filter(v => v.status === 'active').length;
  const totalFuelCost    = fuelLogs.reduce((s, l) => s + (l.total_cost || 0), 0);
  const pendingMaint     = maintenance.filter(m => m.status !== 'completed').length;

  const TABS = [
    { key: 'fleet',       label: 'Filo', icon: <Truck size={15}/> },
    { key: 'maintenance', label: 'Bakım', icon: <Wrench size={15}/> },
    { key: 'fuel',        label: 'Yakıt', icon: <Fuel size={15}/> },
  ] as const;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Araç & Filo Yönetimi</div>
          <div className="topbar-subtitle">Araç takibi, bakım planları ve yakıt kayıtları</div>
        </div>
        <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
          {tab === 'fleet'       && <button className="btn btn-primary btn-sm" onClick={() => openVehicleModal()}><Plus size={15}/> Yeni Araç</button>}
          {tab === 'maintenance' && <button className="btn btn-primary btn-sm" onClick={() => setMaintModal(true)}><Plus size={15}/> Bakım Ekle</button>}
          {tab === 'fuel'        && <button className="btn btn-primary btn-sm" onClick={() => setFuelModal(true)}><Plus size={15}/> Yakıt Ekle</button>}
        </div>
      </div>

      <div className="page-content">
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
          <div className="kpi-card" style={{'--kpi-color':'var(--accent-orange)'} as any}>
            <div className="kpi-icon" style={{background:'rgba(255,87,34,0.1)',color:'var(--accent-orange-light)'}}><Zap size={22}/></div>
            <div className="kpi-value highlight">{vehicles.length > 0 ? vehicles[0].plate : '34AB5128'}</div>
            <div className="kpi-label">En Çok Kullanılan</div>
            <div className="kpi-change up">%12 daha aktif</div>
          </div>
          <div className="kpi-card" style={{'--kpi-color':'var(--accent-green)'} as any}>
            <div className="kpi-icon" style={{background:'rgba(16,185,129,0.1)',color:'var(--accent-green)'}}><Award size={22}/></div>
            <div className="kpi-value">{vehicles.length > 1 ? vehicles[1].plate : '34C2349'}</div>
            <div className="kpi-label">En Verimli Araç</div>
            <div className="kpi-change up">Optimum tüketim</div>
          </div>
          <div className="kpi-card" style={{'--kpi-color':'var(--accent-amber)'} as any}>
            <div className="kpi-icon" style={{background:'rgba(245,158,11,0.1)',color:'var(--accent-amber)'}}><Wrench size={22}/></div>
            <div className="kpi-value">{pendingMaint}</div>
            <div className="kpi-label">Bakımı Yaklaşan</div>
            <div className="kpi-change down">Önümüzdeki hafta</div>
          </div>
          <div className="kpi-card" style={{'--kpi-color':'#3b82f6'} as any}>
            <div className="kpi-icon" style={{background:'rgba(59,130,246,0.1)',color:'#3b82f6'}}><Fuel size={22}/></div>
            <div className="kpi-value">6.8 L</div>
            <div className="kpi-label">Ortalama Tüketim</div>
            <div className="kpi-change neutral">/ 100km</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--bg-card)',borderRadius:10,padding:4,border:'1px solid var(--border)',width:'fit-content'}}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                background: tab===t.key ? 'var(--accent-orange)' : 'transparent',
                color: tab===t.key ? '#fff' : 'var(--text-secondary)',
                transition:'all 0.2s'}}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner"/><span>Yükleniyor...</span></div>
        ) : (
          <>
            {/* ── FLEET TAB ── */}
            {tab === 'fleet' && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
                {vehicles.length === 0 ? (
                  <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'var(--text-muted)'}}><Truck size={40} style={{marginBottom:12,opacity:0.3}}/><div>Kayıtlı araç yok.</div></div>
                ) : vehicles.map(v => {
                  const fuel = getFuelLevel(v.id);
                  const isLow = fuel < 25;
                  return (
                    <div key={v.id} className={`vehicle-card ${v.status==='active'?'active':''}`}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <div className={`vehicle-icon-box ${v.status==='active'?'active':'idle'}`}><Truck size={20}/></div>
                          <div>
                            <div style={{fontWeight:700,fontSize:15}}>{v.plate}</div>
                            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2,fontFamily:"'Geist Mono',monospace",textTransform:'uppercase',letterSpacing:'0.05em'}}>
                              {TYPE_ICONS[v.type]} {TYPE_LABELS[v.type]??v.type}{v.brand&&` · ${v.brand}${v.model?` ${v.model}`:''}`}
                            </div>
                          </div>
                        </div>
                        <VehicleStatusChip status={v.status}/>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,paddingTop:14,borderTop:'1px solid var(--border)'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-muted)',marginBottom:6}}><Fuel size={12}/>Yakıt</div>
                          <div className="fuel-bar-track"><div className={`fuel-bar-fill ${isLow?'low':'normal'}`} style={{width:`${fuel}%`}}/></div>
                          <div style={{fontSize:12,fontWeight:700,marginTop:4,textAlign:'right',color:isLow?'var(--accent-red)':'var(--text-secondary)',fontFamily:"'Geist Mono',monospace"}}>{fuel}%</div>
                        </div>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-muted)',marginBottom:6}}><Activity size={12}/>Kapasite</div>
                          <div style={{fontSize:16,fontWeight:700,color:'var(--text-primary)',marginTop:2}}>{v.capacity_kg.toLocaleString()} kg</div>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:8,marginTop:14,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                        <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={() => setSelectedVehicleDetails(v)}>
                          Detaylar <ChevronRight size={14}/>
                        </button>
                        <button className="btn btn-secondary btn-sm" title="Düzenle" onClick={() => openVehicleModal(v)}><Edit2 size={13}/></button>
                        <button className="btn btn-sm" title="Sil" style={{color:'var(--accent-red)',borderColor:'rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.06)',border:'1px solid'}} onClick={() => handleDeleteVehicle(v.id)}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── MAINTENANCE TAB ── */}
            {tab === 'maintenance' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Araç</th><th>Bakım Türü</th><th>Açıklama</th><th>Maliyet</th><th>Tarih</th><th>Durum</th><th>İşlem</th></tr>
                  </thead>
                  <tbody>
                    {maintenance.length === 0 ? (
                      <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Kayıtlı bakım yok.</td></tr>
                    ) : maintenance.map(m => {
                      const vehicle = vehicles.find(v => v.id === m.vehicle_id);
                      return (
                        <tr key={m.id}>
                          <td><code style={{fontFamily:"'Geist Mono',monospace",fontSize:13}}>{vehicle?.plate ?? `#${m.vehicle_id}`}</code></td>
                          <td><span style={{fontWeight:600}}>{m.maintenance_type}</span></td>
                          <td style={{fontSize:12,color:'var(--text-secondary)',maxWidth:200}}>{m.description||'—'}</td>
                          <td>{m.cost != null ? <span style={{color:'var(--accent-green)',fontWeight:600}}>₺{Number(m.cost).toFixed(2)}</span> : '—'}</td>
                          <td style={{fontSize:12,fontFamily:"'Geist Mono',monospace",color:'var(--text-secondary)'}}>
                            {m.scheduled_date ? format(new Date(m.scheduled_date),'dd MMM yyyy',{locale:tr}) : '—'}
                          </td>
                          <td><MaintenanceStatusChip status={m.status}/></td>
                          <td>
                            {m.status !== 'completed' && (
                              <button className="btn btn-secondary btn-sm" onClick={() => completeMaintenance(m.id)}
                                style={{borderColor:'var(--accent-green)',color:'var(--accent-green)'}}>
                                <CheckCircle2 size={12}/> Tamamla
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── FUEL TAB ── */}
            {tab === 'fuel' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Araç</th><th>Litre</th><th>L Fiyatı</th><th>Toplam</th><th>Sayaç</th><th>İstasyon</th><th>Sürücü</th><th>Tarih</th></tr>
                  </thead>
                  <tbody>
                    {fuelLogs.length === 0 ? (
                      <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Yakıt kaydı yok.</td></tr>
                    ) : fuelLogs.map(f => {
                      const vehicle = vehicles.find(v => v.id === f.vehicle_id);
                      return (
                        <tr key={f.id}>
                          <td><code style={{fontFamily:"'Geist Mono',monospace",fontSize:13}}>{vehicle?.plate ?? `#${f.vehicle_id}`}</code></td>
                          <td><span style={{fontWeight:600}}>{f.liters} L</span></td>
                          <td style={{color:'var(--text-secondary)',fontSize:13}}>{f.cost_per_liter ? `₺${f.cost_per_liter}` : '—'}</td>
                          <td>{f.total_cost ? <span style={{color:'var(--accent-green)',fontWeight:600}}>₺{Number(f.total_cost).toFixed(2)}</span> : '—'}</td>
                          <td style={{fontSize:12,color:'var(--text-secondary)'}}>{f.odometer_km ? `${f.odometer_km.toLocaleString()} km` : '—'}</td>
                          <td style={{fontSize:12}}>{f.fuel_station||'—'}</td>
                          <td style={{fontSize:12}}>{f.filled_by||'—'}</td>
                          <td style={{fontSize:12,fontFamily:"'Geist Mono',monospace",color:'var(--text-secondary)'}}>
                            {format(new Date(f.filled_at),'dd MMM yyyy HH:mm',{locale:tr})}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Vehicle Modal ── */}
      {vehicleModal && (
        <div className="modal-overlay" onClick={() => setVehicleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><Truck size={18} style={{color:'var(--accent-orange-light)',marginRight:8}}/>{editingId ? 'Araç Düzenle' : 'Yeni Araç'}</div>
              <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:4}} onClick={() => setVehicleModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={submitVehicle} className="modal-body">
              <div className="form-group"><label className="form-label">Plaka</label>
                <input className="form-input" required placeholder="34 ABC 123" value={vForm.plate} onChange={e => setVForm({...vForm,plate:e.target.value})}/></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Tür</label>
                  <select className="form-select" value={vForm.type} onChange={e => setVForm({...vForm,type:e.target.value})}>
                    <option value="motorcycle">🏍️ Motosiklet</option><option value="car">🚗 Otomobil</option><option value="van">🚐 Minivan</option><option value="truck">🚛 Kamyon</option>
                  </select></div>
                <div className="form-group"><label className="form-label">Kapasite (kg)</label>
                  <input type="number" className="form-input" required value={vForm.capacity_kg} onChange={e => setVForm({...vForm,capacity_kg:Number(e.target.value)})}/></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Marka</label>
                  <input className="form-input" placeholder="Ford..." value={vForm.brand} onChange={e => setVForm({...vForm,brand:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">Model</label>
                  <input className="form-input" placeholder="Transit..." value={vForm.model} onChange={e => setVForm({...vForm,model:e.target.value})}/></div>
              </div>
              <div className="form-group"><label className="form-label">Durum</label>
                <select className="form-select" value={vForm.status} onChange={e => setVForm({...vForm,status:e.target.value})}>
                  <option value="active">Aktif</option><option value="maintenance">Bakımda</option><option value="inactive">Pasif</option>
                </select></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setVehicleModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Güncelle' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Maintenance Modal ── */}
      {maintModal && (
        <div className="modal-overlay" onClick={() => setMaintModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><Wrench size={18} style={{color:'var(--accent-amber)',marginRight:8}}/>Bakım Planla</div>
              <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:4}} onClick={() => setMaintModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={submitMaintenance} className="modal-body">
              <div className="form-group"><label className="form-label">Araç</label>
                <select className="form-select" required value={mForm.vehicle_id} onChange={e => setMForm({...mForm,vehicle_id:Number(e.target.value)})}>
                  <option value={0}>Araç Seçin...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} – {TYPE_LABELS[v.type]}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Bakım Türü</label>
                <input className="form-input" required placeholder="Periyodik bakım, lastik, yağ..." value={mForm.maintenance_type} onChange={e => setMForm({...mForm,maintenance_type:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Açıklama</label>
                <textarea className="form-input" rows={2} value={mForm.description} onChange={e => setMForm({...mForm,description:e.target.value})}/></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Maliyet (₺)</label>
                  <input type="number" step="0.01" className="form-input" placeholder="0.00" value={mForm.cost} onChange={e => setMForm({...mForm,cost:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">Planlanan Tarih</label>
                  <input type="datetime-local" className="form-input" value={mForm.scheduled_date} onChange={e => setMForm({...mForm,scheduled_date:e.target.value})}/></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Durum</label>
                  <select className="form-select" value={mForm.status} onChange={e => setMForm({...mForm,status:e.target.value})}>
                    <option value="scheduled">Planlandı</option><option value="in_progress">Devam Ediyor</option><option value="completed">Tamamlandı</option>
                  </select></div>
                <div className="form-group"><label className="form-label">Servis / Yetkili</label>
                  <input className="form-input" placeholder="Servis adı..." value={mForm.performed_by} onChange={e => setMForm({...mForm,performed_by:e.target.value})}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setMaintModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Fuel Modal ── */}
      {fuelModal && (
        <div className="modal-overlay" onClick={() => setFuelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><Fuel size={18} style={{color:'#3b82f6',marginRight:8}}/>Yakıt Alımı Ekle</div>
              <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:4}} onClick={() => setFuelModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={submitFuel} className="modal-body">
              <div className="form-group"><label className="form-label">Araç</label>
                <select className="form-select" required value={fForm.vehicle_id} onChange={e => setFForm({...fForm,vehicle_id:Number(e.target.value)})}>
                  <option value={0}>Araç Seçin...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} – {TYPE_LABELS[v.type]}</option>)}
                </select></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Litre</label>
                  <input type="number" step="0.01" className="form-input" required placeholder="45.00" value={fForm.liters} onChange={e => setFForm({...fForm,liters:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">L Fiyatı (₺)</label>
                  <input type="number" step="0.001" className="form-input" placeholder="42.50" value={fForm.cost_per_liter} onChange={e => setFForm({...fForm,cost_per_liter:e.target.value})}/></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Sayaç (km)</label>
                  <input type="number" className="form-input" placeholder="125000" value={fForm.odometer_km} onChange={e => setFForm({...fForm,odometer_km:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">İstasyon</label>
                  <input className="form-input" placeholder="Petrol Ofisi..." value={fForm.fuel_station} onChange={e => setFForm({...fForm,fuel_station:e.target.value})}/></div>
              </div>
              <div className="form-group"><label className="form-label">Sürücü</label>
                <input className="form-input" placeholder="Sürücü adı..." value={fForm.filled_by} onChange={e => setFForm({...fForm,filled_by:e.target.value})}/></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setFuelModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Vehicle Details Drawer ── */}
      {selectedVehicleDetails && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedVehicleDetails(null)} />
          <div className="drawer" style={{ maxWidth: 650 }}>
            <div className="drawer-header">
              <div className="drawer-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <Truck size={18} style={{color:'var(--accent-orange-light)'}}/> 
                {selectedVehicleDetails.plate} - Detaylar
              </div>
              <button className="drawer-close" onClick={() => setSelectedVehicleDetails(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {/* 🏢 Genel Bilgiler */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Activity size={15} className="text-orange" /> Genel Bilgiler</div>
                <div className="grid-2" style={{gap:12}}>
                  <div className="drawer-row"><span className="drawer-label">Plaka</span><span className="drawer-value"><code style={{fontFamily:"'Geist Mono',monospace",fontSize:14}}>{selectedVehicleDetails.plate}</code></span></div>
                  <div className="drawer-row"><span className="drawer-label">Araç Tipi</span><span className="drawer-value">{TYPE_ICONS[selectedVehicleDetails.type]} {TYPE_LABELS[selectedVehicleDetails.type]}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Marka / Model</span><span className="drawer-value">{selectedVehicleDetails.brand || 'Honda'} {selectedVehicleDetails.model || 'PCX'}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Yıl</span><span className="drawer-value">2024</span></div>
                  <div className="drawer-row"><span className="drawer-label">Şasi No</span><span className="drawer-value"><code style={{fontFamily:"'Geist Mono',monospace"}}>WBA1234567890</code></span></div>
                  <div className="drawer-row"><span className="drawer-label">Durum</span><span className="drawer-value"><VehicleStatusChip status={selectedVehicleDetails.status}/></span></div>
                </div>
              </div>

              {/* 👨💼 Sorumlu Kurye */}
              <div className="drawer-section">
                <div className="drawer-section-title"><User size={15} className="text-blue" /> Sorumlu Kurye</div>
                <div style={{display:'flex',gap:16,alignItems:'center',background:'rgba(255,255,255,0.02)',padding:16,borderRadius:10,border:'1px solid var(--border)'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'var(--bg-secondary)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <User size={24} style={{color:'var(--text-secondary)'}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>Başak Güler</div>
                    <div style={{fontSize:13,color:'var(--text-muted)'}}>0533 123 45 67</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>Bağlı Olduğu Depo</div>
                    <div style={{fontSize:13,fontWeight:600}}>Bursa Lojistik Merkezi</div>
                  </div>
                </div>
              </div>

              {/* ⛽ Yakıt Takibi */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Fuel size={15} className="text-amber" /> Yakıt Takibi</div>
                {(() => {
                  const fuelLvl = getFuelLevel(selectedVehicleDetails.id);
                  const isLow = fuelLvl < 25;
                  return (
                    <div className="grid-2" style={{gap:16}}>
                      <div style={{background:'var(--bg-secondary)',padding:16,borderRadius:10,border:'1px solid var(--border)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                          <span style={{fontSize:13,fontWeight:600}}>Yakıt Seviyesi</span>
                          <span style={{fontSize:14,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:isLow?'var(--accent-red)':'var(--accent-green)'}}>{fuelLvl}%</span>
                        </div>
                        <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${fuelLvl}%`,background:isLow?'var(--accent-red)':'var(--accent-green)',borderRadius:4,transition:'width 1s ease-out'}}/>
                        </div>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:12,textAlign:'right'}}>
                          Son Dolum: 18.06.2026
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <div className="drawer-row" style={{borderBottom:'none',padding:'4px 0'}}><span className="drawer-label">Aylık Yakıt Tüketimi</span><span className="drawer-value" style={{fontWeight:600}}>412 L</span></div>
                        <div className="drawer-row" style={{borderBottom:'none',padding:'4px 0'}}><span className="drawer-label">Yakıt Maliyeti</span><span className="drawer-value text-green" style={{fontWeight:600}}>₺18.420</span></div>
                        <div className="drawer-row" style={{borderBottom:'none',padding:'4px 0',borderTop:'1px solid var(--border)'}}><span className="drawer-label">Ortalama Tüketim</span><span className="drawer-value text-amber">6.8 L / 100km</span></div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 🔧 Bakım Geçmişi */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Wrench size={15} className="text-purple" /> Bakım Geçmişi</div>
                <div className="grid-3" style={{gap:12,marginBottom:16}}>
                  <div style={{padding:12,background:'rgba(139,92,246,0.05)',borderRadius:8,border:'1px solid rgba(139,92,246,0.1)'}}>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>Son Bakım</div>
                    <div style={{fontSize:15,fontWeight:600,marginTop:4}}>02.06.2026</div>
                  </div>
                  <div style={{padding:12,background:'rgba(139,92,246,0.05)',borderRadius:8,border:'1px solid rgba(139,92,246,0.1)'}}>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>Bir Sonraki Bakım</div>
                    <div style={{fontSize:15,fontWeight:600,marginTop:4}}>02.09.2026</div>
                  </div>
                  <div style={{padding:12,background:'rgba(139,92,246,0.05)',borderRadius:8,border:'1px solid rgba(139,92,246,0.1)'}}>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>Kilometre</div>
                    <div style={{fontSize:15,fontWeight:600,marginTop:4}}>48.213 km</div>
                  </div>
                </div>
                
                <table className="table" style={{background:'transparent',fontSize:13}}>
                  <thead>
                    <tr>
                      <th style={{padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.1)',color:'var(--text-muted)'}}>Tarih</th>
                      <th style={{padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.1)',color:'var(--text-muted)'}}>İşlem</th>
                      <th style={{padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.1)',color:'var(--text-muted)',textAlign:'right'}}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>02.06.2026</td>
                      <td style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',fontWeight:500}}>Periyodik Bakım</td>
                      <td style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',textAlign:'right'}}><CheckCircle2 size={14} className="text-green"/></td>
                    </tr>
                    <tr>
                      <td style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>14.03.2026</td>
                      <td style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',fontWeight:500}}>Yağ Değişimi</td>
                      <td style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',textAlign:'right'}}><CheckCircle2 size={14} className="text-green"/></td>
                    </tr>
                    <tr>
                      <td style={{padding:'10px 0',borderBottom:'none'}}>20.01.2026</td>
                      <td style={{padding:'10px 0',borderBottom:'none',fontWeight:500}}>Lastik Değişimi</td>
                      <td style={{padding:'10px 0',borderBottom:'none',textAlign:'right'}}><CheckCircle2 size={14} className="text-green"/></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 📦 Taşıma İstatistikleri & 📍 Son Konum */}
              <div className="grid-2" style={{gap:16}}>
                <div className="drawer-section">
                  <div className="drawer-section-title"><Package size={15} className="text-green" /> Bu Ay Taşıma İstatistikleri</div>
                  <div className="drawer-row"><span className="drawer-label">Toplam Teslimat</span><span className="drawer-value text-green" style={{fontWeight:600}}>284</span></div>
                  <div className="drawer-row"><span className="drawer-label">Taşınan Paket</span><span className="drawer-value">1.932</span></div>
                  <div className="drawer-row"><span className="drawer-label">Toplam Mesafe</span><span className="drawer-value">3.412 km</span></div>
                </div>

                <div className="drawer-section">
                  <div className="drawer-section-title"><Navigation size={15} className="text-blue" /> Canlı Takip Modülü</div>
                  <div style={{background:'var(--bg-secondary)',padding:16,borderRadius:10,border:'1px solid var(--border)',height:'calc(100% - 32px)',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                      <div className="pulse" style={{width:10,height:10,background:'var(--accent-blue)',borderRadius:'50%'}}/>
                      <span style={{fontSize:12,color:'var(--text-muted)'}}>Son Konum</span>
                    </div>
                    <div style={{fontSize:16,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                      <MapPin size={16} className="text-orange"/> Ankara Çankaya
                    </div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:12,fontFamily:"'Geist Mono',monospace"}}>
                      Son Güncelleme: 21:38
                    </div>
                  </div>
                </div>
              </div>

              {/* 🤖 AI Analizi */}
              <div className="drawer-section">
                <div style={{background:'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(245,158,11,0.05) 100%)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:12,padding:16}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,color:'var(--accent-red)',fontWeight:600}}>
                    <Bot size={18}/> AI Analizi & Öneri
                  </div>
                  <div style={{fontSize:14,lineHeight:1.5,color:'var(--text-primary)',marginBottom:12}}>
                    Bu araç son 30 günde ortalamanın <strong>%18 üzerinde yakıt tüketti.</strong> Ayrıca son günlerde fren balataları sensörlerinden standart dışı okumalar alınmıştır.
                  </div>
                  <div style={{background:'rgba(0,0,0,0.2)',padding:12,borderRadius:8,borderLeft:'3px solid var(--accent-red)',fontSize:13}}>
                    <span style={{color:'var(--text-muted)'}}>Öneri:</span><br/>
                    Bir sonraki sefere çıkmadan önce <strong>bakım kontrolü yapılması</strong> şiddetle tavsiye edilir.
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
