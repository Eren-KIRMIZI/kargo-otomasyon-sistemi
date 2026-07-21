import { useState, useEffect, useRef } from 'react';
import {
  QrCode, Barcode, ScanLine, Printer, Download, Search,
  Package, CheckCircle, AlertCircle, RefreshCw, X,
  Tag, Zap, Eye, Copy, ExternalLink
} from 'lucide-react';
import {
  getOrders,
  downloadOrderLabel,
  getBarcodeImageUrl,
  getQRCodeUrl,
  scanBarcode,
} from '../services/api';

// ──────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────
interface Order {
  id: number;
  tracking_number: string;
  customer_name: string;
  receiver_name: string;
  receiver_phone?: string;
  receiver_address?: string;
  status: string;
  weight_kg: number;
  desi?: number;
  total_price?: number;
  province_name?: string;
  district_name?: string;
  created_at?: string;
}

interface ScanResult {
  found: boolean;
  order_id: number;
  tracking_number: string;
  status: string;
  customer_name: string;
  receiver_name: string;
  receiver_phone?: string;
  receiver_address?: string;
  province_name?: string;
  district_name?: string;
  depot_name?: string;
  weight_kg: number;
  desi?: number;
  total_price?: number;
  created_at?: string;
  estimated_delivery?: string;
}

// ──────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Bekliyor',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  in_transit:       { label: 'Transfer',         color: '#ffb5a0', bg: 'rgba(255,87,34,0.12)' },
  out_for_delivery: { label: 'Dağıtımda',        color: '#A78BFA', bg: 'rgba(139,92,246,0.12)' },
  delivered:        { label: 'Teslim Edildi',    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  failed:           { label: 'Başarısız',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  returned:         { label: 'İade',             color: '#94A3B8', bg: 'rgba(100,116,139,0.12)' },
};

// ──────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────
export default function BarcodeManager() {
  // tabs: 'generate' | 'scan' | 'print'
  const [activeTab, setActiveTab] = useState<'generate' | 'scan' | 'print'>('generate');

  // Order list & selection
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Barcode/QR mode toggle
  const [codeMode, setCodeMode] = useState<'barcode' | 'qr'>('barcode');
  const [barcodeLoaded, setBarcodeLoaded] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);

  // Scan tab
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Print/label tab
  const [printOrders, setPrintOrders] = useState<Order[]>([]);
  const [printQueue, setPrintQueue] = useState<number[]>([]);
  const [printLoading, setPrintLoading] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Load orders ──────────────────────────────────────────────────
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await getOrders({ limit: 200 });
      const data = res.data as Order[];
      setOrders(data);
      setPrintOrders(data);
    } catch {
      // silent
    } finally {
      setOrdersLoading(false);
    }
  };

  // ── Filtered orders ──────────────────────────────────────────────
  const filteredOrders = orders.filter(o =>
    o.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.receiver_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Select order → reset image loaded states ──────────────────────
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setBarcodeLoaded(false);
    setQrLoaded(false);
  };

  // ── Copy tracking number ─────────────────────────────────────────
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Download label ───────────────────────────────────────────────
  const handleDownloadLabel = async (orderId: number) => {
    setPrintLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      await downloadOrderLabel(orderId);
    } catch {
      // silent
    } finally {
      setPrintLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // ── Print queue ──────────────────────────────────────────────────
  const togglePrintQueue = (orderId: number) => {
    setPrintQueue(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBatchPrint = async () => {
    for (const id of printQueue) {
      setPrintLoading(prev => ({ ...prev, [id]: true }));
      try {
        await downloadOrderLabel(id);
        await new Promise(r => setTimeout(r, 600));
      } catch {
        // silent
      } finally {
        setPrintLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  // ── Scan ─────────────────────────────────────────────────────────
  const handleScan = async () => {
    const q = scanInput.trim();
    if (!q) return;
    setScanLoading(true);
    setScanResult(null);
    setScanError('');
    try {
      const res = await scanBarcode(q);
      setScanResult(res.data as ScanResult);
    } catch (err: any) {
      setScanError(err?.response?.data?.detail || 'Kargo bulunamadı');
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan();
  };

  // ── Stats (counts) ───────────────────────────────────────────────
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  // ──────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="page-content" style={{ maxWidth: 1400 }}>

      {/* ── PAGE HEADER ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #FF5722, #E64A19)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(255,87,34,0.35)',
          }}>
            <Tag size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Hanken Grotesk', sans-serif" }}>
              Barkod & Etiket Yönetimi
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Barkod oluştur, QR kod üret, barkod oku ve kargo etiketi bas
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI STRIP ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Toplam Kargo', value: totalOrders, icon: Package, color: '#FF5722' },
          { label: 'Bekleyen',     value: pendingOrders, icon: AlertCircle, color: '#F59E0B' },
          { label: 'Teslim Edildi', value: deliveredOrders, icon: CheckCircle, color: '#10B981' },
        ].map(stat => (
          <div key={stat.label} className="kpi-card" style={{ '--kpi-color': stat.color } as React.CSSProperties}>
            <div className="kpi-icon" style={{ background: `${stat.color}18` }}>
              <stat.icon size={20} color={stat.color} />
            </div>
            <div className="kpi-value">{stat.value}</div>
            <div className="kpi-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── TAB BAR ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 24,
        background: 'var(--surface-container)', padding: 5,
        borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
        width: 'fit-content',
      }}>
        {[
          { key: 'generate', label: 'Barkod / QR Oluştur', icon: QrCode },
          { key: 'scan',     label: 'Barkod Oku',          icon: ScanLine },
          { key: 'print',    label: 'Etiket Bas',           icon: Printer },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === tab.key
                ? 'var(--accent-orange)'
                : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? '0 4px 14px rgba(255,87,34,0.35)' : 'none',
            }}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB 1: GENERATE BARCODE / QR
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>

          {/* LEFT: Order selector */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Search */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Takip no, müşteri adı..."
                  style={{
                    width: '100%', padding: '8px 10px 8px 32px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Order list */}
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              {ordersLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                  <div style={{ fontSize: 12 }}>Yükleniyor...</div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Sipariş bulunamadı
                </div>
              ) : filteredOrders.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                const st = STATUS_CONFIG[order.status] || { label: order.status, color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };
                return (
                  <div
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(46,46,46,0.5)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(255,87,34,0.07)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent-orange)' : '3px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{
                        fontFamily: "'Geist Mono', monospace", fontSize: 11,
                        color: isSelected ? 'var(--accent-orange-light)' : 'var(--text-secondary)',
                        fontWeight: 600,
                      }}>
                        {order.tracking_number}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px',
                        borderRadius: 99, background: st.bg, color: st.color,
                        border: `1px solid ${st.color}40`,
                      }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{order.customer_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Alıcı: {order.receiver_name} · {order.province_name || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Barcode/QR viewer */}
          <div>
            {!selectedOrder ? (
              <div className="card" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: 340, gap: 16,
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 18,
                  background: 'var(--surface-high)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Barcode size={34} color="var(--text-muted)" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Sipariş Seçin
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Sol listeden bir kargo seçerek barkod veya QR kod oluşturun
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Code mode toggle */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { key: 'barcode', label: 'Barkod (Code128)', icon: Barcode },
                    { key: 'qr',      label: 'QR Kod',           icon: QrCode },
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => {
                        setCodeMode(m.key as any);
                        setBarcodeLoaded(false);
                        setQrLoaded(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', borderRadius: 10,
                        border: codeMode === m.key ? '1.5px solid var(--accent-orange)' : '1px solid var(--border)',
                        background: codeMode === m.key ? 'rgba(255,87,34,0.08)' : 'var(--surface-container)',
                        color: codeMode === m.key ? 'var(--accent-orange-light)' : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                      }}
                    >
                      <m.icon size={16} />
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Order info card */}
                <div className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{
                          fontFamily: "'Geist Mono', monospace", fontSize: 15, fontWeight: 700,
                          color: 'var(--accent-orange-light)',
                          letterSpacing: '0.04em',
                        }}>
                          {selectedOrder.tracking_number}
                        </span>
                        <button
                          onClick={() => handleCopy(selectedOrder.tracking_number)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--surface-high)', color: 'var(--text-muted)',
                            cursor: 'pointer', fontSize: 11, fontWeight: 500, transition: 'all 0.2s',
                          }}
                        >
                          {copiedId === selectedOrder.tracking_number ? (
                            <><CheckCircle size={11} color="#10B981" /> Kopyalandı</>
                          ) : (
                            <><Copy size={11} /> Kopyala</>
                          )}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 12 }}>
                        {[
                          { label: 'Gönderici', value: selectedOrder.customer_name },
                          { label: 'Alıcı', value: selectedOrder.receiver_name },
                          { label: 'İl', value: selectedOrder.province_name || '—' },
                          { label: 'Ağırlık', value: `${selectedOrder.weight_kg} kg` },
                          { label: 'Desi', value: selectedOrder.desi?.toString() || '—' },
                          { label: 'Tutar', value: selectedOrder.total_price ? `₺${selectedOrder.total_price}` : '—' },
                        ].map(f => (
                          <div key={f.label}>
                            <span style={{ color: 'var(--text-muted)' }}>{f.label}: </span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                      background: (STATUS_CONFIG[selectedOrder.status]?.bg || 'rgba(148,163,184,0.1)'),
                      color: (STATUS_CONFIG[selectedOrder.status]?.color || '#94A3B8'),
                      border: `1px solid ${STATUS_CONFIG[selectedOrder.status]?.color || '#94A3B8'}40`,
                      whiteSpace: 'nowrap',
                    }}>
                      {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                    </div>
                  </div>
                </div>

                {/* Code image preview */}
                <div className="card" style={{ textAlign: 'center', padding: 28 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: '#fff', borderRadius: 12, padding: codeMode === 'qr' ? 16 : '20px 28px',
                    boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
                    minWidth: codeMode === 'qr' ? 200 : 300,
                    minHeight: codeMode === 'qr' ? 200 : 120,
                    position: 'relative', marginBottom: 16,
                  }}>
                    {codeMode === 'barcode' ? (
                      <img
                        key={`bc-${selectedOrder.id}`}
                        src={getBarcodeImageUrl(selectedOrder.id)}
                        alt="Barkod"
                        onLoad={() => setBarcodeLoaded(true)}
                        style={{
                          maxWidth: 320, height: 'auto',
                          opacity: barcodeLoaded ? 1 : 0,
                          transition: 'opacity 0.3s',
                        }}
                      />
                    ) : (
                      <img
                        key={`qr-${selectedOrder.id}`}
                        src={getQRCodeUrl(selectedOrder.id)}
                        alt="QR Kod"
                        onLoad={() => setQrLoaded(true)}
                        style={{
                          width: 200, height: 200,
                          opacity: qrLoaded ? 1 : 0,
                          transition: 'opacity 0.3s',
                        }}
                      />
                    )}
                    {((codeMode === 'barcode' && !barcodeLoaded) || (codeMode === 'qr' && !qrLoaded)) && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <RefreshCw size={20} color="#999" style={{ animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    {codeMode === 'barcode'
                      ? 'Code128 standart barkod — herhangi bir barkod okuyucuyla taranabilir'
                      : 'QR Kod — kargo takip URL\'si içerir, telefon kamerasıyla taranabilir'}
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={codeMode === 'barcode' ? getBarcodeImageUrl(selectedOrder.id) : getQRCodeUrl(selectedOrder.id)}
                      download={`${codeMode === 'barcode' ? 'barkod' : 'qr'}_${selectedOrder.tracking_number}.png`}
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <Download size={14} />
                      PNG İndir
                    </a>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownloadLabel(selectedOrder.id)}
                      disabled={!!printLoading[selectedOrder.id]}
                    >
                      {printLoading[selectedOrder.id]
                        ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Printer size={14} />
                      }
                      PDF Etiket İndir
                    </button>
                    <a
                      href={`/track/${selectedOrder.tracking_number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} />
                      Takip Sayfası
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 2: SCAN / READ BARCODE
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'scan' && (
        <div style={{ maxWidth: 700 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(255,87,34,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ScanLine size={20} color="var(--accent-orange)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Barkod / QR Kod Okuyucu</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Takip numarasını girin veya barkod okuyucuyla taratın</div>
              </div>
            </div>

            {/* Scan input area */}
            <div style={{
              background: 'var(--surface-container)',
              border: '2px dashed var(--border)',
              borderRadius: 14, padding: 28,
              textAlign: 'center', marginBottom: 16,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ marginBottom: 12 }}>
                <ScanLine size={40} color="var(--accent-orange)" style={{ opacity: 0.7 }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Barkod okuyucuyla taratın veya aşağıya takip numarasını yazın
              </div>
              <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto' }}>
                <input
                  ref={scanInputRef}
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={handleScanKeyDown}
                  placeholder="KRG1234567890..."
                  autoFocus
                  style={{
                    flex: 1, padding: '11px 14px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: 14,
                    outline: 'none', fontFamily: "'Geist Mono', monospace",
                    letterSpacing: '0.05em',
                  }}
                />
                <button
                  onClick={handleScan}
                  disabled={scanLoading || !scanInput.trim()}
                  className="btn btn-primary"
                  style={{ minWidth: 90 }}
                >
                  {scanLoading
                    ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    : <><Search size={15} /> Ara</>
                  }
                </button>
              </div>
            </div>

            {/* Clear */}
            {(scanResult || scanError) && (
              <button
                onClick={() => { setScanResult(null); setScanError(''); setScanInput(''); scanInputRef.current?.focus(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', border: '1px solid var(--border)',
                  borderRadius: 8, background: 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
                  marginBottom: 16,
                }}
              >
                <X size={13} /> Temizle
              </button>
            )}

            {/* Error */}
            {scanError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 18px', borderRadius: 10,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#EF4444',
              }}>
                <AlertCircle size={18} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Kargo Bulunamadı</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{scanError}</div>
                </div>
              </div>
            )}

            {/* Scan result */}
            {scanResult && (
              <div style={{
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid rgba(16,185,129,0.25)',
                background: 'rgba(16,185,129,0.04)',
              }}>
                {/* Result header */}
                <div style={{
                  padding: '14px 20px',
                  background: 'rgba(16,185,129,0.08)',
                  borderBottom: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <CheckCircle size={18} color="#10B981" />
                  <span style={{ fontWeight: 700, color: '#10B981', fontSize: 13 }}>Kargo Bulundu</span>
                  <span style={{
                    marginLeft: 'auto', fontFamily: "'Geist Mono', monospace",
                    fontSize: 12, color: '#10B981', fontWeight: 600,
                  }}>
                    {scanResult.tracking_number}
                  </span>
                </div>

                {/* Result fields */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                    {[
                      { label: 'Sipariş No', value: `#${scanResult.order_id}` },
                      { label: 'Durum', value: STATUS_CONFIG[scanResult.status]?.label || scanResult.status,
                        color: STATUS_CONFIG[scanResult.status]?.color },
                      { label: 'Gönderici', value: scanResult.customer_name },
                      { label: 'Alıcı', value: scanResult.receiver_name },
                      { label: 'Telefon', value: scanResult.receiver_phone || '—' },
                      { label: 'İl / İlçe', value: [scanResult.province_name, scanResult.district_name].filter(Boolean).join(' / ') || '—' },
                      { label: 'Depo', value: scanResult.depot_name || '—' },
                      { label: 'Ağırlık', value: `${scanResult.weight_kg} kg` },
                      { label: 'Desi', value: scanResult.desi?.toString() || '—' },
                      { label: 'Tutar', value: scanResult.total_price ? `₺${scanResult.total_price}` : '—' },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: f.color || 'var(--text-primary)' }}>
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Address */}
                  {scanResult.receiver_address && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(16,185,129,0.15)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Teslimat Adresi
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{scanResult.receiver_address}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownloadLabel(scanResult.order_id)}
                      disabled={!!printLoading[scanResult.order_id]}
                    >
                      {printLoading[scanResult.order_id]
                        ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Printer size={13} />
                      }
                      Etiket Bas
                    </button>
                    <a
                      href={`/track/${scanResult.tracking_number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} />
                      Takibi Aç
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tip cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              {
                icon: Zap,
                title: 'Hızlı Tarama',
                desc: 'Barkod okuyucunuzu kullanıyorsanız direkt kutuya taratabilirsiniz — Enter otomatik gelir.',
                color: '#F59E0B',
              },
              {
                icon: Eye,
                title: 'QR Kod ile Takip',
                desc: 'QR kodları telefonun kamerasıyla tarayarak doğrudan takip sayfasına erişebilirsiniz.',
                color: '#8B5CF6',
              },
            ].map(tip => (
              <div key={tip.title} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: `${tip.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <tip.icon size={18} color={tip.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{tip.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tip.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 3: PRINT LABELS
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'print' && (
        <div>
          {/* Batch print bar */}
          {printQueue.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 20px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.25)',
            }}>
              <Printer size={18} color="var(--accent-orange)" />
              <span style={{ fontSize: 13, color: 'var(--accent-orange-light)', fontWeight: 600, flex: 1 }}>
                {printQueue.length} etiket seçildi
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleBatchPrint}
              >
                <Printer size={14} />
                Tümünü İndir
              </button>
              <button
                onClick={() => setPrintQueue([])}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Print orders table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="card-title">
                <Printer size={16} />
                Kargo Etiketleri
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{printOrders.length} sipariş</div>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}>Seç</th>
                    <th>Takip No</th>
                    <th>Gönderici</th>
                    <th>Alıcı</th>
                    <th>İl</th>
                    <th>Durum</th>
                    <th>Ağırlık</th>
                    <th style={{ textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {printOrders.map(order => {
                    const st = STATUS_CONFIG[order.status] || { label: order.status, color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };
                    const inQueue = printQueue.includes(order.id);
                    return (
                      <tr key={order.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={inQueue}
                            onChange={() => togglePrintQueue(order.id)}
                            style={{ accentColor: 'var(--accent-orange)', width: 15, height: 15, cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <span style={{
                            fontFamily: "'Geist Mono', monospace", fontSize: 11,
                            color: 'var(--accent-orange-light)', fontWeight: 600,
                          }}>
                            {order.tracking_number}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{order.customer_name}</td>
                        <td style={{ fontSize: 12 }}>{order.receiver_name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.province_name || '—'}</td>
                        <td>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 10px',
                            borderRadius: 99, background: st.bg, color: st.color,
                            border: `1px solid ${st.color}40`,
                          }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{order.weight_kg} kg</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => { setSelectedOrder(order); setActiveTab('generate'); setBarcodeLoaded(false); setQrLoaded(false); }}
                              className="btn-icon"
                              title="Barkod Görüntüle"
                            >
                              <Barcode size={13} />
                            </button>
                            <button
                              onClick={() => handleDownloadLabel(order.id)}
                              disabled={!!printLoading[order.id]}
                              className="btn btn-primary btn-sm"
                              style={{ minWidth: 100 }}
                            >
                              {printLoading[order.id]
                                ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                : <><Download size={13} /> PDF Etiket</>
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
