import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, RefreshCw, Filter, Search, Download,
  UserCheck, Plus, Pencil, Trash2, Link, LogIn, LogOut,
  ChevronLeft, ChevronRight, Activity, Clock, User, Database
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'LOGIN' | 'LOGOUT';

interface AuditLogEntry {
  id: number;
  timestamp: string;
  username: string;
  action: ActionType;
  module: string;
  detail: string | null;
  ip_address: string | null;
  user_id: number | null;
}

interface Stats {
  total: number;
  by_action: Record<ActionType, number>;
  by_module: Record<string, number>;
}

// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<ActionType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  CREATE: { label: 'OLUŞTURMA', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)',  icon: <Plus size={11} /> },
  UPDATE: { label: 'GÜNCELLEME', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: <Pencil size={11} /> },
  DELETE: { label: 'SİLME',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: <Trash2 size={11} /> },
  ASSIGN: { label: 'ATAMA',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', icon: <Link size={11} /> },
  LOGIN:  { label: 'GİRİŞ',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: <LogIn size={11} /> },
  LOGOUT: { label: 'ÇIKIŞ',      color: '#6B7280', bg: 'rgba(107,114,128,0.12)',border: 'rgba(107,114,128,0.3)',icon: <LogOut size={11} /> },
};

const MODULES = ['Tümü', 'Sistem', 'Siparişler', 'Kuryeler', 'Araçlar', 'Depolar', 'Tarifeler', 'Bölgeler', 'Müşteriler', 'Raporlar'];
const ACTIONS: ('Tümü' | ActionType)[] = ['Tümü', 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'LOGIN', 'LOGOUT'];

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function getToken() {
  return sessionStorage.getItem('token') || '';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const [logs, setLogs]       = useState<AuditLogEntry[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch]         = useState('');
  const [filterAction, setFilterAction] = useState<'Tümü' | ActionType>('Tümü');
  const [filterModule, setFilterModule] = useState('Tümü');
  const [filterUser, setFilterUser]     = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [page, setPage]                 = useState(0);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/audit-logs/stats', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) setStats(await r.json());
    } catch { /* ignore */ }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction !== 'Tümü') params.set('action', filterAction);
      if (filterModule !== 'Tümü') params.set('module', filterModule);
      if (filterUser)  params.set('username', filterUser);
      if (search)      params.set('search', search);
      if (dateFrom)    params.set('date_from', dateFrom);
      if (dateTo)      params.set('date_to', dateTo);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));

      const r = await fetch(`/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) {
        const data: AuditLogEntry[] = await r.json();
        setLogs(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterAction, filterModule, filterUser, search, dateFrom, dateTo, page]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(0); }, [filterAction, filterModule, filterUser, search, dateFrom, dateTo]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Export CSV ──
  const exportCSV = () => {
    const header = 'Tarih,Kullanıcı,İşlem,Modül,Detay,IP';
    const rows = logs.map(l =>
      `"${formatDate(l.timestamp)}","${l.username}","${l.action}","${l.module}","${l.detail || ''}","${l.ip_address || ''}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };



  // ── KPI stat cards ──
  const kpiItems = [
    { label: 'Toplam Kayıt',    value: stats?.total ?? '—',                       color: 'var(--accent-orange)', icon: <Database size={18} /> },
    { label: 'Oluşturma',       value: stats?.by_action['CREATE'] ?? 0,           color: '#10B981',              icon: <Plus size={18} /> },
    { label: 'Güncelleme',      value: stats?.by_action['UPDATE'] ?? 0,           color: '#3B82F6',              icon: <Pencil size={18} /> },
    { label: 'Silme',           value: stats?.by_action['DELETE'] ?? 0,           color: '#EF4444',              icon: <Trash2 size={18} /> },
    { label: 'Atama',           value: stats?.by_action['ASSIGN'] ?? 0,           color: '#8B5CF6',              icon: <Link size={18} /> },
    { label: 'Giriş/Çıkış',    value: (stats?.by_action['LOGIN'] ?? 0) + (stats?.by_action['LOGOUT'] ?? 0), color: '#F59E0B', icon: <UserCheck size={18} /> },
  ];

  return (
    <>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="topbar">
        <div>
          <div className="topbar-title">📋 Audit Log — İşlem Kayıtları</div>
          <div className="topbar-subtitle">Sistem genelindeki tüm kritik işlemler kayıt altında</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={fetchLogs}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface-high)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Yenile
          </button>
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)',
              color: '#10B981', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <Download size={13} />
            CSV İndir
          </button>
        </div>
      </div>

      <div className="page-content">

        {/* ── KPI Row ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
          {kpiItems.map(k => (
            <div key={k.label} className="kpi-card" style={{ '--kpi-color': k.color } as any}>
              <div className="kpi-icon" style={{ color: k.color }}>{k.icon}</div>
              <div className="kpi-value" style={{ color: k.color, fontSize: 26 }}>{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ─────────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

            {/* Search */}
            <div style={{ flex: '2 1 200px', minWidth: 160 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>
                🔍 Detay Ara
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Sipariş no, kullanıcı, detay…"
                  style={{
                    width: '100%', paddingLeft: 32, padding: '8px 12px 8px 32px',
                    background: 'var(--surface-high)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* User filter */}
            <div style={{ flex: '1 1 120px', minWidth: 120 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>
                👤 Kullanıcı
              </div>
              <div style={{ position: 'relative' }}>
                <User size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                  placeholder="admin, operator…"
                  style={{
                    width: '100%', paddingLeft: 30, padding: '8px 12px 8px 30px',
                    background: 'var(--surface-high)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Action filter */}
            <div style={{ flex: '1 1 130px', minWidth: 120 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>
                ⚡ İşlem Tipi
              </div>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value as any)}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--surface-high)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer',
                }}
              >
                {ACTIONS.map(a => <option key={a} value={a}>{a === 'Tümü' ? '— Tümü —' : a}</option>)}
              </select>
            </div>

            {/* Module filter */}
            <div style={{ flex: '1 1 130px', minWidth: 120 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>
                📦 Modül
              </div>
              <select
                value={filterModule}
                onChange={e => setFilterModule(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--surface-high)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer',
                }}
              >
                {MODULES.map(m => <option key={m} value={m}>{m === 'Tümü' ? '— Tümü —' : m}</option>)}
              </select>
            </div>

            {/* Date from */}
            <div style={{ flex: '1 1 140px', minWidth: 130 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>
                📅 Başlangıç
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--surface-high)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* Date to */}
            <div style={{ flex: '1 1 140px', minWidth: 130 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>
                📅 Bitiş
              </div>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--surface-high)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* Clear filters */}
            {(filterAction !== 'Tümü' || filterModule !== 'Tümü' || filterUser || search || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setFilterAction('Tümü');
                  setFilterModule('Tümü');
                  setFilterUser('');
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                }}
                style={{
                  padding: '8px 16px', borderRadius: 8, alignSelf: 'flex-end',
                  border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)',
                  color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Filter size={12} />
                Temizle
              </button>
            )}
          </div>

          {/* Action quick-filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            {ACTIONS.map(a => {
              const cfg = a !== 'Tümü' ? ACTION_CONFIG[a] : null;
              const active = filterAction === a;
              return (
                <button
                  key={a}
                  onClick={() => setFilterAction(a)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 20,
                    background: active ? (cfg?.bg ?? 'rgba(255,87,34,0.15)') : 'var(--surface-high)',
                    border: `1px solid ${active ? (cfg?.border ?? 'rgba(255,87,34,0.4)') : 'var(--border)'}`,
                    color: active ? (cfg?.color ?? 'var(--accent-orange-light)') : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    fontFamily: "'Geist Mono', monospace",
                    transition: 'all 0.15s',
                  }}
                >
                  {cfg?.icon}
                  {a === 'Tümü' ? '🔍 Tümü' : a}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Log Table ──────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <div className="card-title">
              <ClipboardList size={16} />
              İşlem Kayıtları
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(255,87,34,0.1)', color: 'var(--accent-orange-light)',
                border: '1px solid rgba(255,87,34,0.25)', fontFamily: "'Geist Mono', monospace",
              }}>
                {logs.length} kayıt
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <Activity size={13} />
              Son güncelleme: {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 14 }}>
              <div className="spinner" />
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Kayıtlar yükleniyor…</span>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
              <ClipboardList size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Kayıt bulunamadı</div>
              <div style={{ fontSize: 12 }}>Seçili filtrelere göre işlem kaydı yok</div>
            </div>
          ) : (
            <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32, paddingLeft: 20 }}>#</th>
                    <th><Clock size={10} style={{ marginRight: 5, verticalAlign: 'middle' }} />Tarih &amp; Saat</th>
                    <th><User size={10} style={{ marginRight: 5, verticalAlign: 'middle' }} />Kullanıcı</th>
                    <th>İşlem</th>
                    <th>Modül</th>
                    <th>Detay</th>
                    <th>IP Adresi</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const cfg = ACTION_CONFIG[log.action];
                    return (
                      <tr key={log.id} style={{ transition: 'background 0.15s' }}>
                        {/* Sıra */}
                        <td style={{ paddingLeft: 20, color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>
                          {page * PAGE_SIZE + i + 1}
                        </td>

                        {/* Tarih */}
                        <td>
                          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: 'var(--text-secondary)' }}>
                            {formatDate(log.timestamp)}
                          </div>
                        </td>

                        {/* Kullanıcı */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: log.username === 'admin'
                                ? 'rgba(255,87,34,0.15)'
                                : 'rgba(59,130,246,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, flexShrink: 0,
                              color: log.username === 'admin' ? 'var(--accent-orange-light)' : '#60A5FA',
                              border: `1px solid ${log.username === 'admin' ? 'rgba(255,87,34,0.3)' : 'rgba(59,130,246,0.3)'}`,
                            }}>
                              {log.username.slice(0, 1).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {log.username}
                            </span>
                          </div>
                        </td>

                        {/* Action badge */}
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 20,
                            background: cfg.bg, border: `1px solid ${cfg.border}`,
                            color: cfg.color, fontSize: 10, fontWeight: 700,
                            fontFamily: "'Geist Mono', monospace",
                          }}>
                            {cfg.icon}
                            {log.action}
                          </span>
                        </td>

                        {/* Module */}
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: 6,
                            background: 'var(--surface-high)', border: '1px solid var(--border)',
                            fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600,
                          }}>
                            {log.module}
                          </span>
                        </td>

                        {/* Detail */}
                        <td style={{ maxWidth: 340 }}>
                          <div style={{
                            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }} title={log.detail || ''}>
                            {log.detail || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                          </div>
                        </td>

                        {/* IP */}
                        <td>
                          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--text-muted)' }}>
                            {log.ip_address || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ───────────────────────────────────────────────── */}
          {!loading && logs.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderTop: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Sayfa {page + 1} &nbsp;·&nbsp; {logs.length} kayıt gösteriliyor
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--surface-high)',
                    color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: page === 0 ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
                    opacity: page === 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={13} /> Önceki
                </button>
                <button
                  disabled={logs.length < PAGE_SIZE}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--surface-high)',
                    color: logs.length < PAGE_SIZE ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: logs.length < PAGE_SIZE ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
                    opacity: logs.length < PAGE_SIZE ? 0.4 : 1,
                  }}
                >
                  Sonraki <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
