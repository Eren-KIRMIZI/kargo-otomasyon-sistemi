import { useEffect, useState } from 'react';
import {
  getDepots, getProvinces, getRacks, createRack, deleteRack,
  getInventoryLogs, createInventoryLog, getTransfers, createTransfer, completeTransfer
} from '../services/api';
import {
  Warehouse, MapPin, Users, Plus, Search, Package,
  CheckCircle2, Layers, ArrowLeftRight, X,
  ChevronRight, Activity, Calendar, AlertCircle, Bot, BarChart2, ThermometerSun, Building2, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Depots() {
  const [tab, setTab] = useState<'depots' | 'racks' | 'inventory' | 'transfers'>('depots');
  const [depots, setDepots]     = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [racks, setRacks]       = useState<any[]>([]);
  const [logs, setLogs]         = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const [search, setSearch]     = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [selectedDepot, setSelectedDepot] = useState('');

  // Selected Depot for Drawer
  const [selectedDepotDetails, setSelectedDepotDetails] = useState<any>(null);

  // Rack modal
  const [rackModal, setRackModal] = useState(false);
  const [rForm, setRForm] = useState({ depot_id: '', code: '', description: '', capacity: 50 });

  // Inventory log modal
  const [logModal, setLogModal] = useState(false);
  const [lForm, setLForm] = useState({ depot_id: '', rack_id: '', action: 'in', note: '', created_by: '' });

  // Transfer modal
  const [transferModal, setTransferModal] = useState(false);
  const [tForm, setTForm] = useState({ from_depot_id: '', to_depot_id: '', cargo_count: 1, notes: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, p, r, l, tr_] = await Promise.all([
        getDepots({ province_id: provinceId ? Number(provinceId) : undefined }),
        getProvinces(),
        getRacks(selectedDepot ? Number(selectedDepot) : undefined),
        getInventoryLogs(selectedDepot ? Number(selectedDepot) : undefined),
        getTransfers(),
      ]);
      setDepots(d.data);
      if (provinces.length === 0) setProvinces(p.data);
      setRacks(r.data);
      setLogs(l.data);
      setTransfers(tr_.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [provinceId, selectedDepot]);

  /* ── Rack CRUD ── */
  const submitRack = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRack({ ...rForm, depot_id: Number(rForm.depot_id), capacity: Number(rForm.capacity) });
      setRackModal(false);
      setRForm({ depot_id: '', code: '', description: '', capacity: 50 });
      fetchAll();
    } catch (err: any) { alert(err.response?.data?.detail || 'Hata'); }
  };
  const handleDeleteRack = async (id: number) => {
    if (!confirm('Bu rafı silmek istiyor musunuz?')) return;
    await deleteRack(id); fetchAll();
  };

  /* ── Inventory Log ── */
  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInventoryLog({ ...lForm, depot_id: Number(lForm.depot_id), rack_id: lForm.rack_id ? Number(lForm.rack_id) : null });
      setLogModal(false);
      setLForm({ depot_id: '', rack_id: '', action: 'in', note: '', created_by: '' });
      fetchAll();
    } catch (err: any) { alert(err.response?.data?.detail || 'Hata'); }
  };

  /* ── Transfer ── */
  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransfer({ ...tForm, from_depot_id: Number(tForm.from_depot_id), to_depot_id: Number(tForm.to_depot_id), cargo_count: Number(tForm.cargo_count) });
      setTransferModal(false);
      setTForm({ from_depot_id: '', to_depot_id: '', cargo_count: 1, notes: '' });
      fetchAll();
    } catch (err: any) { alert(err.response?.data?.detail || 'Hata'); }
  };

  const filteredDepots = depots.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );
  const activeDepots = depots.filter(d => d.is_active).length;
  const totalCapacity = racks.reduce((s, r) => s + r.capacity, 0);
  const currentLoad   = racks.reduce((s, r) => s + r.current_load, 0);

  const TABS = [
    { key: 'depots',    label: 'Depolar',     icon: <Warehouse size={15}/> },
    { key: 'racks',     label: 'Raf Sistemi', icon: <Layers size={15}/> },
    { key: 'inventory', label: 'Giriş / Çıkış', icon: <Package size={15}/> },
    { key: 'transfers', label: 'Transfer',    icon: <ArrowLeftRight size={15}/> },
  ] as const;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Depo & Şube Yönetimi</div>
          <div className="topbar-subtitle">Raf sistemi, giriş-çıkış ve şubeler arası transfer</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {tab === 'racks'     && <button className="btn btn-primary btn-sm" onClick={() => setRackModal(true)}><Plus size={15}/> Raf Ekle</button>}
          {tab === 'inventory' && <button className="btn btn-primary btn-sm" onClick={() => setLogModal(true)}><Plus size={15}/> Giriş/Çıkış</button>}
          {tab === 'transfers' && <button className="btn btn-primary btn-sm" onClick={() => setTransferModal(true)}><Plus size={15}/> Transfer Oluştur</button>}
        </div>
      </div>

      <div className="page-content">
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
          <div className="kpi-card" style={{'--kpi-color':'var(--accent-orange)'} as any}>
            <div className="kpi-icon" style={{background:'rgba(255,87,34,0.1)',color:'var(--accent-orange-light)'}}><Warehouse size={22}/></div>
            <div className="kpi-value highlight">{depots.length}</div>
            <div className="kpi-label">Toplam Depo</div>
            <div className="kpi-change neutral">Sistemde kayıtlı</div>
          </div>
          <div className="kpi-card" style={{'--kpi-color':'var(--accent-green)'} as any}>
            <div className="kpi-icon" style={{background:'rgba(16,185,129,0.1)',color:'var(--accent-green)'}}><CheckCircle2 size={22}/></div>
            <div className="kpi-value">{activeDepots}</div>
            <div className="kpi-label">Aktif Depolar</div>
            <div className="kpi-change up">Operasyonel</div>
          </div>
          <div className="kpi-card" style={{'--kpi-color':'#8b5cf6'} as any}>
            <div className="kpi-icon" style={{background:'rgba(139,92,246,0.1)',color:'#a78bfa'}}><Layers size={22}/></div>
            <div className="kpi-value">{racks.length}</div>
            <div className="kpi-label">Toplam Raf</div>
            <div className="kpi-change neutral">{currentLoad}/{totalCapacity} dolu</div>
          </div>
          <div className="kpi-card" style={{'--kpi-color':'var(--accent-amber)'} as any}>
            <div className="kpi-icon" style={{background:'rgba(245,158,11,0.1)',color:'var(--accent-amber)'}}><ArrowLeftRight size={22}/></div>
            <div className="kpi-value">{transfers.filter(t => t.status === 'in_transit').length}</div>
            <div className="kpi-label">Aktif Transfer</div>
            <div className="kpi-change up">Yolda</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--bg-card)',borderRadius:10,padding:4,border:'1px solid var(--border)',width:'fit-content'}}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                background: tab===t.key ? 'var(--accent-orange)' : 'transparent',
                color: tab===t.key ? '#fff' : 'var(--text-secondary)',
                transition:'all 0.2s'}}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        {(tab === 'depots' || tab === 'racks' || tab === 'inventory') && (
          <div className="card mb-6" style={{padding:'14px 18px',marginBottom:16}}>
            <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
              {tab === 'depots' && (
                <div style={{position:'relative',flex:1,minWidth:200}}>
                  <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
                  <input className="form-input" style={{paddingLeft:36}} placeholder="Depo adı veya kodu..." value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
              )}
              <select className="form-select" style={{width:200}} value={provinceId} onChange={e => setProvinceId(e.target.value)}>
                <option value="">Tüm İller</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {(tab === 'racks' || tab === 'inventory') && (
                <select className="form-select" style={{width:220}} value={selectedDepot} onChange={e => setSelectedDepot(e.target.value)}>
                  <option value="">Tüm Depolar</option>
                  {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-center"><div className="spinner"/><span>Yükleniyor...</span></div>
        ) : (
          <>
            {/* ── DEPOTS TAB ── */}
            {tab === 'depots' && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20}}>
                {filteredDepots.map(d => (
                  <div key={d.id} className="vehicle-card" style={{display:'flex',flexDirection:'column'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <div className={`vehicle-icon-box ${d.is_active?'active':'idle'}`}><Warehouse size={18}/></div>
                          <strong style={{fontSize:15}}>{d.name}</strong>
                        </div>
                        <code style={{fontSize:11,color:'var(--text-muted)',fontFamily:"'Geist Mono',monospace",marginLeft:44}}>{d.code}</code>
                      </div>
                      {d.is_active ? <span className="chip chip-delivering"><span className="chip-dot"/>Aktif</span> : <span className="chip chip-off-duty">Pasif</span>}
                    </div>
                    <div style={{fontSize:13,color:'var(--text-secondary)',display:'flex',flexDirection:'column',gap:8,marginBottom:20,flex:1,paddingLeft:44}}>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}><MapPin size={14} style={{color:'var(--accent-orange-light)'}}/>{d.province_name}{d.district_name?` / ${d.district_name}`:''}</div>
                      <div style={{display:'flex',gap:8,alignItems:'center',color:'var(--text-muted)'}}><Users size={14}/>Yönetici: {d.manager_name||'Atanmamış'}</div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,paddingTop:16,borderTop:'1px solid var(--border)'}}>
                      <div>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2,display:'flex',alignItems:'center',gap:5}}><Users size={12}/>Kurye Sayısı</div>
                        <div style={{fontSize:16,fontWeight:700,color:'var(--text-primary)'}}>{d.courier_count || 0}</div>
                      </div>
                      <div>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2,display:'flex',alignItems:'center',gap:5}}><Package size={12}/>Aktif Sipariş</div>
                        <div style={{fontSize:16,fontWeight:700,color:'var(--accent-amber)'}}>{d.active_order_count || 0}</div>
                      </div>
                    </div>
                    <div style={{marginTop:'auto',paddingTop:16,display:'flex',justifyContent:'flex-end'}}>
                      <button className="btn btn-sm btn-outline" onClick={() => setSelectedDepotDetails(d)}>
                        Detaylar <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredDepots.length === 0 && (
                  <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'var(--text-muted)'}}>
                    <Warehouse size={40} style={{marginBottom:12,opacity:0.3}}/><div>Depo bulunamadı.</div>
                  </div>
                )}
              </div>
            )}

            {/* ── RACKS TAB ── */}
            {tab === 'racks' && (
              <div className="table-container">
                <table>
                  <thead><tr><th>Depo</th><th>Raf Kodu</th><th>Açıklama</th><th>Doluluk</th><th>Durum</th><th>İşlem</th></tr></thead>
                  <tbody>
                    {racks.length === 0 ? (
                      <tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Kayıtlı raf yok.</td></tr>
                    ) : racks.map(r => {
                      const depot = depots.find(d => d.id === r.depot_id);
                      const pct = r.capacity > 0 ? Math.round((r.current_load / r.capacity) * 100) : 0;
                      return (
                        <tr key={r.id}>
                          <td style={{fontSize:13}}>{depot?.name ?? `Depo #${r.depot_id}`}</td>
                          <td><code style={{fontFamily:"'Geist Mono',monospace",fontWeight:700,color:'var(--accent-orange-light)'}}>{r.code}</code></td>
                          <td style={{fontSize:12,color:'var(--text-secondary)'}}>{r.description||'—'}</td>
                          <td style={{minWidth:140}}>
                            <div style={{fontSize:12,marginBottom:4,color:'var(--text-secondary)'}}>{r.current_load} / {r.capacity} kargo</div>
                            <div style={{height:6,background:'var(--bg-secondary)',borderRadius:3,overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${pct}%`,background: pct>85?'var(--accent-red)':pct>60?'var(--accent-amber)':'var(--accent-green)',borderRadius:3,transition:'width 0.3s'}}/>
                            </div>
                          </td>
                          <td>{r.is_active ? <span className="chip chip-delivering">Aktif</span> : <span className="chip chip-off-duty">Pasif</span>}</td>
                          <td>
                            <button className="btn btn-sm" style={{color:'var(--accent-red)',borderColor:'rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.06)',border:'1px solid'}} onClick={() => handleDeleteRack(r.id)}>
                              Sil
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── INVENTORY TAB ── */}
            {tab === 'inventory' && (
              <div className="table-container">
                <table>
                  <thead><tr><th>Depo</th><th>İşlem</th><th>Sipariş</th><th>Raf</th><th>Not</th><th>Yetkili</th><th>Tarih</th></tr></thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Kayıt yok.</td></tr>
                    ) : logs.map(l => {
                      const depot = depots.find(d => d.id === l.depot_id);
                      const rack  = racks.find(r => r.id === l.rack_id);
                      return (
                        <tr key={l.id}>
                          <td style={{fontSize:13}}>{depot?.name ?? `#${l.depot_id}`}</td>
                          <td>
                            {l.action === 'in'
                              ? <span className="chip chip-delivering">📥 Kabul</span>
                              : <span className="chip chip-maintenance">📤 Sevk</span>}
                          </td>
                          <td style={{fontSize:12,color:'var(--text-secondary)'}}>{l.order_id ? `#${l.order_id}` : '—'}</td>
                          <td><code style={{fontFamily:"'Geist Mono',monospace",fontSize:12}}>{rack?.code ?? (l.rack_id ? `#${l.rack_id}` : '—')}</code></td>
                          <td style={{fontSize:12,color:'var(--text-secondary)',maxWidth:180}}>{l.note||'—'}</td>
                          <td style={{fontSize:12}}>{l.created_by||'—'}</td>
                          <td style={{fontSize:12,fontFamily:"'Geist Mono',monospace",color:'var(--text-secondary)'}}>
                            {format(new Date(l.created_at),'dd MMM HH:mm',{locale:tr})}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── TRANSFERS TAB ── */}
            {tab === 'transfers' && (
              <div className="table-container">
                <table>
                  <thead><tr><th>Transfer No</th><th>Nereden</th><th>Nereye</th><th>Kargo</th><th>Durum</th><th>Hareket</th><th>İşlem</th></tr></thead>
                  <tbody>
                    {transfers.length === 0 ? (
                      <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Transfer kaydı yok.</td></tr>
                    ) : transfers.map(t => (
                      <tr key={t.id}>
                        <td><code style={{fontFamily:"'Geist Mono',monospace",fontWeight:700,color:'var(--accent-orange-light)',fontSize:13}}>{t.transfer_number}</code></td>
                        <td style={{fontSize:13}}>{t.from_depot_name ?? `#${t.from_depot_id}`}</td>
                        <td style={{fontSize:13}}>{t.to_depot_name ?? `#${t.to_depot_id}`}</td>
                        <td><span style={{fontWeight:600}}>{t.cargo_count}</span> kargo</td>
                        <td>
                          {t.status === 'completed' && <span className="chip chip-delivering">Tamamlandı</span>}
                          {t.status === 'in_transit' && <span className="chip chip-on-duty"><span className="chip-dot pulse"/>Yolda</span>}
                          {t.status === 'pending'    && <span className="chip chip-off-duty">Bekliyor</span>}
                          {t.status === 'cancelled'  && <span className="chip" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>İptal</span>}
                        </td>
                        <td style={{fontSize:12,color:'var(--text-secondary)'}}>
                          {t.departure_time ? format(new Date(t.departure_time),'dd MMM HH:mm',{locale:tr}) : '—'}
                        </td>
                        <td>
                          {t.status !== 'completed' && t.status !== 'cancelled' && (
                            <button className="btn btn-secondary btn-sm" onClick={async () => { await completeTransfer(t.id); fetchAll(); }}
                              style={{borderColor:'var(--accent-green)',color:'var(--accent-green)'}}>
                              <CheckCircle2 size={12}/> Tamamla
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Rack Modal ── */}
      {rackModal && (
        <div className="modal-overlay" onClick={() => setRackModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:460}}>
            <div className="modal-header">
              <div className="modal-title"><Layers size={18} style={{color:'#8b5cf6',marginRight:8}}/>Yeni Raf Ekle</div>
              <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:4}} onClick={() => setRackModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={submitRack} className="modal-body">
              <div className="form-group"><label className="form-label">Depo</label>
                <select className="form-select" required value={rForm.depot_id} onChange={e => setRForm({...rForm,depot_id:e.target.value})}>
                  <option value="">Depo Seçin...</option>
                  {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Raf Kodu</label>
                  <input className="form-input" required placeholder="A-01-03" value={rForm.code} onChange={e => setRForm({...rForm,code:e.target.value})}/></div>
                <div className="form-group"><label className="form-label">Kapasite (kargo)</label>
                  <input type="number" className="form-input" value={rForm.capacity} onChange={e => setRForm({...rForm,capacity:Number(e.target.value)})}/></div>
              </div>
              <div className="form-group"><label className="form-label">Açıklama</label>
                <input className="form-input" placeholder="Soğuk zincir, kırılgan vb." value={rForm.description} onChange={e => setRForm({...rForm,description:e.target.value})}/></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRackModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Log Modal ── */}
      {logModal && (
        <div className="modal-overlay" onClick={() => setLogModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:460}}>
            <div className="modal-header">
              <div className="modal-title"><Package size={18} style={{color:'var(--accent-orange-light)',marginRight:8}}/>Giriş / Çıkış Kaydı</div>
              <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:4}} onClick={() => setLogModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={submitLog} className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Depo</label>
                  <select className="form-select" required value={lForm.depot_id} onChange={e => setLForm({...lForm,depot_id:e.target.value})}>
                    <option value="">Seçin...</option>
                    {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select></div>
                <div className="form-group"><label className="form-label">İşlem Türü</label>
                  <select className="form-select" value={lForm.action} onChange={e => setLForm({...lForm,action:e.target.value})}>
                    <option value="in">📥 Kabul (Giriş)</option>
                    <option value="out">📤 Sevk (Çıkış)</option>
                  </select></div>
              </div>
              <div className="form-group"><label className="form-label">Raf (Opsiyonel)</label>
                <select className="form-select" value={lForm.rack_id} onChange={e => setLForm({...lForm,rack_id:e.target.value})}>
                  <option value="">Raf Seçin...</option>
                  {racks.filter(r => !lForm.depot_id || r.depot_id === Number(lForm.depot_id)).map(r => <option key={r.id} value={r.id}>{r.code}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Not</label>
                <input className="form-input" placeholder="Açıklama..." value={lForm.note} onChange={e => setLForm({...lForm,note:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Yetkili</label>
                <input className="form-input" placeholder="Ad Soyad" value={lForm.created_by} onChange={e => setLForm({...lForm,created_by:e.target.value})}/></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setLogModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transfer Modal ── */}
      {transferModal && (
        <div className="modal-overlay" onClick={() => setTransferModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:460}}>
            <div className="modal-header">
              <div className="modal-title"><ArrowLeftRight size={18} style={{color:'var(--accent-amber)',marginRight:8}}/>Transfer Oluştur</div>
              <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:4}} onClick={() => setTransferModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={submitTransfer} className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Çıkış Deposu</label>
                  <select className="form-select" required value={tForm.from_depot_id} onChange={e => setTForm({...tForm,from_depot_id:e.target.value})}>
                    <option value="">Seçin...</option>
                    {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select></div>
                <div className="form-group"><label className="form-label">Varış Deposu</label>
                  <select className="form-select" required value={tForm.to_depot_id} onChange={e => setTForm({...tForm,to_depot_id:e.target.value})}>
                    <option value="">Seçin...</option>
                    {depots.filter(d => d.id !== Number(tForm.from_depot_id)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select></div>
              </div>
              <div className="form-group"><label className="form-label">Kargo Adedi</label>
                <input type="number" min={1} className="form-input" value={tForm.cargo_count} onChange={e => setTForm({...tForm,cargo_count:Number(e.target.value)})}/></div>
              <div className="form-group"><label className="form-label">Notlar</label>
                <textarea className="form-input" rows={2} placeholder="Acil sevkiyat, soğuk zincir..." value={tForm.notes} onChange={e => setTForm({...tForm,notes:e.target.value})}/></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setTransferModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Transferi Başlat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Depot Details Drawer ── */}
      {selectedDepotDetails && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedDepotDetails(null)} />
          <div className="drawer" style={{ maxWidth: 650 }}>
            <div className="drawer-header">
              <div className="drawer-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <Warehouse size={18} style={{color:'var(--accent-orange-light)'}}/> 
                {selectedDepotDetails.name} - Detaylar
              </div>
              <button className="drawer-close" onClick={() => setSelectedDepotDetails(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {/* 🏢 Genel Bilgiler */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Building2 size={15} className="text-orange" /> Genel Bilgiler</div>
                <div className="grid-2" style={{gap:12}}>
                  <div className="drawer-row"><span className="drawer-label">Depo Adı</span><span className="drawer-value">{selectedDepotDetails.name}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Depo Kodu</span><span className="drawer-value"><code style={{fontFamily:"'Geist Mono',monospace"}}>{selectedDepotDetails.code}</code></span></div>
                  <div className="drawer-row"><span className="drawer-label">Şehir</span><span className="drawer-value">{selectedDepotDetails.province_name}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Yönetici</span><span className="drawer-value">{selectedDepotDetails.manager_name || 'Mehmet Kaya'}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Telefon</span><span className="drawer-value">0312 456 78 90</span></div>
                  <div className="drawer-row"><span className="drawer-label">Açılış Tarihi</span><span className="drawer-value">12.03.2024</span></div>
                </div>
              </div>

              {/* 📦 Kapasite Bilgileri */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Package size={15} className="text-blue" /> Kapasite Bilgileri</div>
                {(() => {
                  const depotRacks = racks.filter(r => r.depot_id === selectedDepotDetails.id);
                  const totCap = depotRacks.reduce((s, r) => s + r.capacity, 0) || 10000;
                  const curLoad = depotRacks.reduce((s, r) => s + r.current_load, 0) || 7420;
                  const pct = Math.round((curLoad / totCap) * 100);
                  return (
                    <div style={{background:'var(--bg-secondary)',padding:16,borderRadius:10,border:'1px solid var(--border)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                        <div>
                          <div style={{fontSize:12,color:'var(--text-muted)'}}>Toplam Kapasite</div>
                          <div style={{fontSize:18,fontWeight:700}}>{totCap.toLocaleString('tr-TR')} Paket</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:12,color:'var(--text-muted)'}}>Mevcut Doluluk</div>
                          <div style={{fontSize:18,fontWeight:700,color:'var(--accent-orange-light)'}}>{curLoad.toLocaleString('tr-TR')} Paket</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:12,color:'var(--text-muted)'}}>Doluluk Oranı</div>
                          <div style={{fontSize:18,fontWeight:700,color: pct > 85 ? 'var(--accent-red)' : 'var(--accent-green)'}}>%{pct}</div>
                        </div>
                      </div>
                      <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background: pct>85?'var(--accent-red)':pct>60?'var(--accent-amber)':'var(--accent-green)',borderRadius:4,transition:'width 1s ease-out'}}/>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 🗂️ Raf Sistemi */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Layers size={15} className="text-purple" /> Raf Sistemi Özeti</div>
                <div className="grid-3" style={{gap:10}}>
                  {(() => {
                    const depotRacks = racks.filter(r => r.depot_id === selectedDepotDetails.id);
                    if(depotRacks.length === 0) {
                      return (
                        <>
                          <div style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px solid var(--border)'}}><div style={{fontSize:12,color:'var(--text-muted)'}}>Raf A1</div><div style={{fontSize:16,fontWeight:600}}>420 Paket</div></div>
                          <div style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px solid var(--border)'}}><div style={{fontSize:12,color:'var(--text-muted)'}}>Raf A2</div><div style={{fontSize:16,fontWeight:600}}>310 Paket</div></div>
                          <div style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px solid var(--border)'}}><div style={{fontSize:12,color:'var(--text-muted)'}}>Raf B1</div><div style={{fontSize:16,fontWeight:600}}>225 Paket</div></div>
                        </>
                      );
                    }
                    return depotRacks.map(r => (
                      <div key={r.id} style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px solid var(--border)'}}>
                        <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:"'Geist Mono',monospace"}}>Raf {r.code}</div>
                        <div style={{fontSize:16,fontWeight:600}}>{r.current_load} Paket</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* 🚚 Transfer Hareketleri & 👨‍💼 Personel Özeti */}
              <div className="grid-2" style={{gap:16}}>
                <div className="drawer-section" style={{marginBottom:0}}>
                  <div className="drawer-section-title"><ArrowLeftRight size={15} className="text-amber" /> Transfer Hareketleri</div>
                  <div className="drawer-row"><span className="drawer-label">Bugün Gelen</span><span className="drawer-value text-green">124</span></div>
                  <div className="drawer-row"><span className="drawer-label">Bugün Giden</span><span className="drawer-value text-blue">98</span></div>
                  <div className="drawer-row"><span className="drawer-label">Aktif Transfer</span><span className="drawer-value text-orange">7</span></div>
                </div>
                <div className="drawer-section" style={{marginBottom:0}}>
                  <div className="drawer-section-title"><Users size={15} className="text-purple" /> Personel Özeti</div>
                  <div className="drawer-row"><span className="drawer-label">Toplam Kurye</span><span className="drawer-value">{selectedDepotDetails.courier_count || 4}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Aktif Görevde</span><span className="drawer-value text-green">{Math.max(0, (selectedDepotDetails.courier_count || 4) - 1)}</span></div>
                  <div className="drawer-row"><span className="drawer-label">İzinli</span><span className="drawer-value text-muted">1</span></div>
                </div>
              </div>

              {/* 📊 Operasyon Performansı */}
              <div className="drawer-section" style={{marginTop:24}}>
                <div className="drawer-section-title"><BarChart2 size={15} className="text-green" /> Operasyon Performansı</div>
                <div className="grid-2" style={{gap:16}}>
                  <div style={{background:'rgba(16,185,129,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(16,185,129,0.1)'}}>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>Aylık İşlenen Sipariş</div>
                    <div style={{fontSize:24,fontWeight:700,color:'var(--accent-green)'}}>4.281</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div className="drawer-row" style={{borderBottom:'none',padding:'4px 0'}}><span className="drawer-label">Teslim Edilen</span><span className="drawer-value">4.030</span></div>
                    <div className="drawer-row" style={{borderBottom:'none',padding:'4px 0'}}><span className="drawer-label">İade Edilen</span><span className="drawer-value text-amber">82</span></div>
                    <div className="drawer-row" style={{borderBottom:'none',padding:'4px 0',borderTop:'1px solid var(--border)'}}><span className="drawer-label">SLA Başarı Oranı</span><span className="drawer-value text-green" style={{fontWeight:700}}>%96.7</span></div>
                  </div>
                </div>
              </div>

              {/* 🚨 Olay Geçmişi */}
              <div className="drawer-section">
                <div className="drawer-section-title"><AlertCircle size={15} className="text-red" /> Olay Geçmişi</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:10,background:'rgba(255,255,255,0.02)',borderRadius:6}}>
                    <Clock size={14} style={{color:'var(--text-muted)',marginTop:2}}/>
                    <div>
                      <div style={{fontSize:13,color:'var(--text-primary)'}}>Transfer gecikmesi yaşandı.</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>18.06.2026 14:30</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:10,background:'rgba(255,255,255,0.02)',borderRadius:6}}>
                    <AlertCircle size={14} style={{color:'var(--accent-red)',marginTop:2}}/>
                    <div>
                      <div style={{fontSize:13,color:'var(--accent-red)'}}>Raf kapasitesi %95'i aştı!</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>12.06.2026 09:15</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:10,background:'rgba(255,255,255,0.02)',borderRadius:6}}>
                    <Clock size={14} style={{color:'var(--text-muted)',marginTop:2}}/>
                    <div>
                      <div style={{fontSize:13,color:'var(--text-primary)'}}>Araç arızası nedeniyle gecikme.</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>05.06.2026 16:45</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🌡️ Doluluk Isı Haritası */}
              <div className="drawer-section">
                <div className="drawer-section-title"><ThermometerSun size={15} className="text-orange" /> Bölgesel Depo Doluluğu</div>
                <div style={{background:'var(--bg-secondary)',padding:16,borderRadius:10,border:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                    <span style={{width:70,fontSize:13,fontWeight:600}}>Ankara</span>
                    <div style={{flex:1,height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:'80%',background:'var(--accent-amber)',borderRadius:4}}/>
                    </div>
                    <span style={{width:40,textAlign:'right',fontSize:13,fontFamily:"'Geist Mono',monospace"}}>80%</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                    <span style={{width:70,fontSize:13,fontWeight:600}}>İzmir</span>
                    <div style={{flex:1,height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:'60%',background:'var(--accent-green)',borderRadius:4}}/>
                    </div>
                    <span style={{width:40,textAlign:'right',fontSize:13,fontFamily:"'Geist Mono',monospace"}}>60%</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{width:70,fontSize:13,fontWeight:600}}>Antalya</span>
                    <div style={{flex:1,height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:'92%',background:'var(--accent-red)',borderRadius:4}}/>
                    </div>
                    <span style={{width:40,textAlign:'right',fontSize:13,fontFamily:"'Geist Mono',monospace"}}>92%</span>
                  </div>
                </div>
              </div>

              {/* 🤖 AI Öngörüleri */}
              <div className="drawer-section">
                <div style={{background:'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.05) 100%)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:12,padding:16}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,color:'#a78bfa',fontWeight:600}}>
                    <Bot size={18}/> AI Öngörüsü & Tavsiyesi
                  </div>
                  <div style={{fontSize:14,lineHeight:1.5,color:'var(--text-primary)',marginBottom:12}}>
                    Son 14 günlük işlem hacmi analizine göre, <strong>3 gün içinde</strong> bu deponun kapasitesinin <strong>%95'e ulaşacağı</strong> öngörülmektedir.
                  </div>
                  <div style={{background:'rgba(0,0,0,0.2)',padding:12,borderRadius:8,borderLeft:'3px solid #a78bfa',fontSize:13}}>
                    <span style={{color:'var(--text-muted)'}}>Öneri:</span><br/>
                    Gelecek olan siparişleri kapasite doluluğu daha düşük olan <strong>İzmir deposuna</strong> yönlendirmeniz tavsiye edilir.
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
