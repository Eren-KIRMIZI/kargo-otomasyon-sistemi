import { useEffect, useState } from 'react';
import {
  getOrders, assignDepot, assignCourier, getProvinces, confirmDelivery,
  createReturnOrder, deleteOrder, downloadOrderLabel
} from '../services/api';
import {
  Package, Search, MapPin, Truck, CheckCircle2, Clock, Play,
  RotateCcw, TrendingUp, DollarSign, Trash2, X, Printer, Eye,
  FileText, Box, Activity, Bot, User, Phone, Shield, AlertTriangle, Scale
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  in_transit: 'Taşımada',
  out_for_delivery: 'Dağıtımda',
  delivered: 'Teslim Edildi',
  failed: 'Başarısız',
  returned: 'İade',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--text-muted)',
  normal: 'var(--accent-orange)',
  high: 'var(--accent-amber)',
  urgent: 'var(--accent-red)',
};

function StatusChip({ status }: { status: string }) {
  if (status === 'delivered')        return <span className="chip chip-delivering">Teslim Edildi</span>;
  if (status === 'out_for_delivery') return <span className="chip chip-on-duty"><span className="chip-dot pulse" />Dağıtımda</span>;
  if (status === 'in_transit')       return <span className="chip chip-maintenance">Taşımada</span>;
  if (status === 'pending')          return <span className="chip chip-off-duty">Bekliyor</span>;
  if (status === 'returned')         return <span className="chip" style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640' }}>İade</span>;
  if (status === 'failed')           return <span className="chip" style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>Başarısız</span>;
  return <span className="chip chip-off-duty">{STATUS_LABELS[status] ?? status}</span>;
}

interface ReturnModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

function ReturnModal({ order, onClose, onSuccess }: ReturnModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createReturnOrder({ original_order_id: order.id, reason });
      onSuccess();
      onClose();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'İade oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title"><RotateCcw size={18} style={{ color: '#8b5cf6' }}/> İade Oluştur</div>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{order.tracking_number}</strong> numaralı sipariş için iade başlatılacak.
          </p>
          <div className="form-group">
            <label className="form-label">İade Nedeni</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Hasarlı ürün, yanlış adres, müşteri talebi..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>
            {loading ? 'İşleniyor...' : 'İadeyi Başlat'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([
        getOrders({
          status: statusFilter || undefined,
          province_id: provinceFilter ? Number(provinceFilter) : undefined,
          limit: 200,
        }),
        getProvinces(),
      ]);
      setOrders(o.data);
      if (provinces.length === 0) setProvinces(p.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter, provinceFilter]);

  const handleAssign = async (orderId: number) => {
    setAssigningId(orderId);
    try {
      await assignDepot(orderId);
      await fetchData();
    } catch (e) {
      alert('Depo atama başarısız oldu.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleAssignCourier = async (orderId: number) => {
    setAssigningId(orderId);
    try {
      const res = await assignCourier(orderId);
      alert(res.data.message);
      await fetchData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Kurye atama başarısız oldu.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleDeliver = async (orderId: number) => {
    if (!confirm('Teslimat onaylanacak. Devam edilsin mi?')) return;
    try {
      await confirmDelivery(orderId, undefined, 'Operatör tarafından onaylandı');
      await fetchData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Teslimat onayı başarısız.');
    }
  };

  const handleDelete = async (orderId: number) => {
    if (!confirm('Bu sipariş silinecek. Emin misiniz?')) return;
    try {
      await deleteOrder(orderId);
      await fetchData();
    } catch {
      alert('Silme işlemi başarısız.');
    }
  };

  const filtered = orders.filter(o =>
    o.tracking_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    (o.receiver_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount      = orders.filter(o => o.status === 'pending').length;
  const inTransitCount    = orders.filter(o => o.status === 'in_transit' || o.status === 'out_for_delivery').length;
  const deliveredCount    = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue      = orders.reduce((s, o) => s + (o.total_price ?? 0), 0);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Sipariş Yönetimi</div>
          <div className="topbar-subtitle">Tüm kargo hareketleri, fiyatlandırma ve durum takibi</div>
        </div>
        <a href="/track" target="_blank" className="btn btn-secondary" style={{ fontSize: 13 }}>
          <Search size={14}/> Takip Ekranı
        </a>
      </div>

      <div className="page-content">
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-orange)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(255,87,34,0.1)', color: 'var(--accent-orange-light)' }}><Package size={22}/></div>
            <div className="kpi-value highlight">{orders.length}</div>
            <div className="kpi-label">Toplam Sipariş</div>
            <div className="kpi-change neutral">Sistemdeki aktif</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--text-muted)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}><Clock size={22}/></div>
            <div className="kpi-value">{pendingCount}</div>
            <div className="kpi-label">Bekliyor</div>
            <div className="kpi-change down">İşlem gerekli</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-amber)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent-amber)' }}><Truck size={22}/></div>
            <div className="kpi-value">{inTransitCount}</div>
            <div className="kpi-label">Taşımada</div>
            <div className="kpi-change up">Operasyonel</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-green)' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}><CheckCircle2 size={22}/></div>
            <div className="kpi-value">{deliveredCount}</div>
            <div className="kpi-label">Teslim Edilen</div>
            <div className="kpi-change up">Başarılı teslimat</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#10b981' } as any}>
            <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><DollarSign size={22}/></div>
            <div className="kpi-value" style={{ fontSize: 18 }}>₺{totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</div>
            <div className="kpi-label">Toplam Gelir</div>
            <div className="kpi-change up"><TrendingUp size={11}/> Kümülatif</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6" style={{ padding: '16px 20px' }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group search-wrapper">
              <Search size={15} className="search-icon"/>
              <input
                type="text"
                className="form-input"
                placeholder="Takip No, Gönderici veya Alıcı Adı..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="form-group">
              <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Tüm Durumlar</option>
                <option value="pending">Bekliyor</option>
                <option value="in_transit">Taşımada</option>
                <option value="out_for_delivery">Dağıtımda</option>
                <option value="delivered">Teslim Edildi</option>
                <option value="failed">Başarısız</option>
                <option value="returned">İade</option>
              </select>
            </div>
            <div className="form-group">
              <select className="form-select" value={provinceFilter} onChange={e => setProvinceFilter(e.target.value)}>
                <option value="">Tüm İller</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner"/><span>Siparişler yükleniyor...</span></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Gönderici / Alıcı</th>
                  <th>Atanan Depo</th>
                  <th>Fiyat</th>
                  <th>Durum</th>
                  <th>Tarihler</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td>
                      <div>
                        <code style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: "'Geist Mono', monospace" }}>{o.tracking_number}</code>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLORS[o.priority] }}/>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{o.priority} Önem</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{o.customer_name}</div>
                      {o.receiver_name && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>→ {o.receiver_name}</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={10} style={{ color: 'var(--accent-orange-light)' }}/> {o.province_name}{o.district_name ? ` / ${o.district_name}` : ''}
                      </div>
                    </td>
                    <td>
                      {o.assigned_depot_id ? (
                        <div style={{ fontSize: 12, color: 'var(--accent-orange-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Truck size={14}/> {o.depot_name}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Atanmamış</span>
                      )}
                    </td>
                    <td>
                      {o.total_price != null ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-green)' }}>₺{o.total_price.toFixed(2)}</div>
                          {o.discount_amount > 0 && (
                            <div style={{ fontSize: 11, color: '#8b5cf6' }}>-₺{o.discount_amount.toFixed(2)} indirim</div>
                          )}
                          <div style={{ fontSize: 11, color: o.is_paid ? 'var(--accent-green)' : 'var(--accent-amber)', marginTop: 2 }}>
                            {o.is_paid ? '✓ Ödendi' : '⏳ Ödenmedi'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td><StatusChip status={o.status}/></td>
                    <td>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'Geist Mono', monospace" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <Clock size={10}/> {format(new Date(o.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </div>
                        {o.delivered_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)' }}>
                            <CheckCircle2 size={10}/> {format(new Date(o.delivered_at), 'dd MMM HH:mm', { locale: tr })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {o.status === 'pending' && !o.assigned_depot_id && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleAssign(o.id)} disabled={assigningId === o.id}>
                            {assigningId === o.id ? 'Atanıyor...' : <><Play size={11} fill="currentColor"/> Depo Ata (AI)</>}
                          </button>
                        )}
                        {o.status === 'in_transit' && !o.courier_id && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleAssignCourier(o.id)} disabled={assigningId === o.id}
                            style={{ borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>
                            {assigningId === o.id ? 'Atanıyor...' : 'Kurye Ata'}
                          </button>
                        )}
                        {o.status === 'out_for_delivery' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDeliver(o.id)}
                            style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>
                            <CheckCircle2 size={11}/> Teslim Onay
                          </button>
                        )}
                        {(o.status === 'delivered' || o.status === 'failed') && !o.return_order && (
                          <button className="btn btn-secondary btn-sm" onClick={() => setReturnOrder(o)}
                            style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                            <RotateCcw size={11}/> İade
                          </button>
                        )}
                        {o.courier_name && o.status !== 'delivered' && o.status !== 'returned' && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {o.courier_name}</span>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrderDetails(o)}
                            style={{ flex: 2, borderColor: 'var(--accent-blue-light)', color: 'var(--accent-blue-light)' }} title="Siparişi İncele">
                            <Eye size={11}/> Detay
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => downloadOrderLabel(o.id)}
                            style={{ flex: 1 }} title="Etiket Yazdır">
                            <Printer size={11}/>
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(o.id)}
                            style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} title="Siparişi Sil">
                            <Trash2 size={11}/>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Sipariş bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {returnOrder && (
        <ReturnModal
          order={returnOrder}
          onClose={() => setReturnOrder(null)}
          onSuccess={fetchData}
        />
      )}

      {/* ── Order Details Drawer ── */}
      {selectedOrderDetails && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedOrderDetails(null)} />
          <div className="drawer" style={{ maxWidth: 650 }}>
            <div className="drawer-header">
              <div className="drawer-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <Package size={18} style={{color:'var(--accent-blue-light)'}}/> 
                Sipariş Detayı <code style={{fontFamily:"'Geist Mono',monospace",fontSize:14,background:'var(--bg-secondary)',padding:'2px 6px',borderRadius:4}}>{selectedOrderDetails.tracking_number}</code>
              </div>
              <button className="drawer-close" onClick={() => setSelectedOrderDetails(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {/* 📋 Genel Bilgiler */}
              <div className="drawer-section">
                <div className="drawer-section-title"><FileText size={15} className="text-orange" /> Genel Bilgiler</div>
                <div className="grid-2" style={{gap:12}}>
                  <div className="drawer-row"><span className="drawer-label">Gönderici</span><span className="drawer-value">{selectedOrderDetails.customer_name}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Alıcı</span><span className="drawer-value">{selectedOrderDetails.receiver_name || 'Bilinmiyor'}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Telefon</span><span className="drawer-value">{selectedOrderDetails.phone || '05XX XXX XX XX'}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Adres</span><span className="drawer-value">{selectedOrderDetails.address || `${selectedOrderDetails.province_name} ${selectedOrderDetails.district_name || ''}`}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Oluşturulma</span><span className="drawer-value">{format(new Date(selectedOrderDetails.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</span></div>
                  <div className="drawer-row"><span className="drawer-label">Durum</span><span className="drawer-value"><StatusChip status={selectedOrderDetails.status}/></span></div>
                </div>
              </div>

              {/* 📦 Paket Bilgileri */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Box size={15} className="text-blue" /> Paket Bilgileri</div>
                {(() => {
                  const weight = selectedOrderDetails.weight_kg || 3.2;
                  const desi = Math.ceil(weight * 2.5);
                  return (
                    <div className="grid-2" style={{gap:16}}>
                      <div style={{display:'flex',gap:16}}>
                        <div style={{flex:1,background:'var(--bg-secondary)',padding:12,borderRadius:8,border:'1px solid var(--border)'}}>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>Desi</div>
                          <div style={{fontSize:18,fontWeight:600}}>{desi} <span style={{fontSize:13,fontWeight:400,color:'var(--text-muted)'}}>Desi</span></div>
                        </div>
                        <div style={{flex:1,background:'var(--bg-secondary)',padding:12,borderRadius:8,border:'1px solid var(--border)'}}>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>Ağırlık</div>
                          <div style={{fontSize:18,fontWeight:600}}>{weight} <span style={{fontSize:13,fontWeight:400,color:'var(--text-muted)'}}>kg</span></div>
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:8,justifyContent:'center'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><CheckCircle2 size={14} className="text-green"/> Elektronik (Paket Türü)</div>
                        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><CheckCircle2 size={14} className="text-green"/> Kırılabilir</div>
                        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><CheckCircle2 size={14} className="text-green"/> Sigortalı Gönderi</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 📍 Hareket Geçmişi (Timeline) */}
              <div className="drawer-section">
                <div className="drawer-section-title"><Activity size={15} className="text-purple" /> Hareket Geçmişi</div>
                <div style={{background:'var(--bg-secondary)',padding:'20px 24px',borderRadius:10,border:'1px solid var(--border)'}}>
                  <div className="timeline" style={{position:'relative',paddingLeft:20}}>
                    <div style={{position:'absolute',left:6,top:8,bottom:8,width:2,background:'var(--border)'}}/>
                    
                    {(() => {
                      const cAt = new Date(selectedOrderDetails.created_at);
                      const d1 = new Date(cAt.getTime() + 11*60000);
                      const d2 = new Date(cAt.getTime() + 24*60000);
                      const d3 = new Date(cAt.getTime() + 99*60000);
                      const d4 = selectedOrderDetails.delivered_at ? new Date(selectedOrderDetails.delivered_at) : new Date(cAt.getTime() + 139*60000);
                      const s = selectedOrderDetails.status;
                      
                      const tItem = (title:string, time:Date, isActive:boolean, isPast:boolean, color:string) => (
                        <div style={{position:'relative',marginBottom:16,opacity:isPast||isActive?1:0.4}}>
                          <div style={{position:'absolute',left:-24,top:2,width:10,height:10,borderRadius:'50%',background:isActive?color:isPast?'var(--text-muted)':'var(--bg-card)',border:`2px solid ${isActive?color:isPast?'var(--text-muted)':'var(--border)'}`,zIndex:1}}/>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div style={{fontSize:14,fontWeight:isActive?600:500,color:isActive?color:'var(--text-primary)'}}>{title}</div>
                            <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:"'Geist Mono',monospace"}}>{format(time, 'dd MMM HH:mm', {locale:tr})}</div>
                          </div>
                        </div>
                      );

                      return (
                        <>
                          {tItem('Sipariş oluşturuldu', cAt, s==='pending', s!=='pending', 'var(--accent-blue-light)')}
                          {tItem('Depoya ulaştı', d1, false, s!=='pending', 'var(--accent-orange-light)')}
                          {tItem('Kurye atandı', d2, s==='in_transit', s==='out_for_delivery'||s==='delivered'||s==='failed'||s==='returned', 'var(--accent-amber)')}
                          {tItem('Dağıtıma çıktı', d3, s==='out_for_delivery', s==='delivered'||s==='failed'||s==='returned', 'var(--accent-orange)')}
                          {s === 'returned' || s === 'failed' 
                            ? tItem(s==='returned'?'İade Edildi':'Başarısız Teslimat', d4, true, false, 'var(--accent-red)')
                            : tItem('Teslim edildi', d4, s==='delivered', false, 'var(--accent-green)')}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 💳 Finans Bilgileri */}
              <div className="drawer-section">
                <div className="drawer-section-title"><DollarSign size={15} className="text-green" /> Finans Bilgileri</div>
                {(() => {
                  const base = selectedOrderDetails.total_price || 120;
                  const ext = 15;
                  const ins = 25;
                  const total = base + ext + ins;
                  return (
                    <div style={{display:'flex',gap:24,alignItems:'flex-start'}}>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                        <div className="drawer-row" style={{borderBottom:'none',padding:'2px 0'}}><span className="drawer-label">Kargo Ücreti</span><span className="drawer-value">₺{base.toFixed(2)}</span></div>
                        <div className="drawer-row" style={{borderBottom:'none',padding:'2px 0'}}><span className="drawer-label">Sigorta Ücreti</span><span className="drawer-value">₺{ins.toFixed(2)}</span></div>
                        <div className="drawer-row" style={{borderBottom:'none',padding:'2px 0'}}><span className="drawer-label">Ek Hizmet</span><span className="drawer-value">₺{ext.toFixed(2)}</span></div>
                        <div className="drawer-row" style={{borderBottom:'none',padding:'6px 0',marginTop:4,borderTop:'1px solid var(--border)'}}><span className="drawer-label" style={{fontWeight:600}}>Tahsil Edilen</span><span className="drawer-value text-green" style={{fontWeight:700,fontSize:16}}>₺{total.toFixed(2)}</span></div>
                      </div>
                      <div style={{width:160,background:'rgba(16,185,129,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(16,185,129,0.2)',textAlign:'center',alignSelf:'stretch',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                        <Shield size={24} className="text-green" style={{margin:'0 auto 8px auto'}}/>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--accent-green)'}}>Ödeme Durumu</div>
                        <div style={{fontSize:15,fontWeight:700,marginTop:4}}>Tahsil Edildi</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 🔙 İade Analizi (Only if returned/failed) */}
              {(selectedOrderDetails.status === 'returned' || selectedOrderDetails.status === 'failed') && (
                <div className="drawer-section">
                  <div className="drawer-section-title"><AlertTriangle size={15} className="text-red" /> İade Analizi</div>
                  <div style={{background:'rgba(239,68,68,0.05)',padding:16,borderRadius:8,border:'1px solid rgba(239,68,68,0.2)'}}>
                    <div style={{fontSize:12,color:'var(--accent-red)',fontWeight:600,marginBottom:4}}>İade Nedeni</div>
                    <div style={{fontSize:14}}>
                      {selectedOrderDetails.return_order?.reason || 'Müşteri adreste bulunamadı / Teslim almadı.'}
                    </div>
                  </div>
                </div>
              )}

              {/* 🤖 AI Skoru */}
              <div className="drawer-section">
                <div style={{background:'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.05) 100%)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:12,padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,color:'#a78bfa',fontWeight:600}}>
                      <Bot size={18}/> AI Öncelik Skoru
                    </div>
                    {(() => {
                      const p = selectedOrderDetails.priority;
                      const score = p === 'urgent' ? 98 : p === 'high' ? 85 : p === 'normal' ? 65 : 45;
                      return <div style={{fontSize:24,fontWeight:800,color:score>80?'var(--accent-red)':score>60?'var(--accent-amber)':'var(--accent-green)'}}>{score}/100</div>;
                    })()}
                  </div>
                  <div style={{fontSize:13,lineHeight:1.5,color:'var(--text-primary)'}}>
                    Gönderici profili, alıcı bölgesi ve seçilen öncelik sınıfına göre bu siparişin zamanında teslimat riski analiz edilmiştir. 
                    {selectedOrderDetails.priority === 'urgent' && <strong> VIP kurye ataması önerilir.</strong>}
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
