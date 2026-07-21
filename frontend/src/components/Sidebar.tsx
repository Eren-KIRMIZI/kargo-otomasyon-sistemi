import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Warehouse, Package, Grid3x3,
  Brain, Truck, ChevronRight, Users, LogOut, HelpCircle, Search, Tag, BarChart2,
  AlertTriangle, DollarSign, Navigation, Building2, RotateCcw, CloudRain,
  Cpu, Trophy, ScanSearch, ClipboardList, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { section: 'Overview', items: [
    { to: '/',      icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/map',   icon: Map,             label: 'Operations Map' },
    { to: '/live-tracking', icon: Navigation, label: 'Canlı Takip' },
  ]},
  { section: 'Management', items: [
    { to: '/customers',icon: Users,     label: 'Müşteriler' },
    { to: '/corporate',icon: Building2, label: 'Kurumsal' },
    { to: '/depots',   icon: Warehouse, label: 'Depolar' },
    { to: '/couriers', icon: Users,     label: 'Kuryeler' },
    { to: '/vehicles', icon: Truck,     label: 'Araçlar' },
  ]},
  { section: 'Operasyonlar', items: [
    { to: '/orders',   icon: Package,   label: 'Siparişler' },
    { to: '/returns',  icon: RotateCcw, label: 'İadeler' },
    { to: '/barcodes', icon: Tag,       label: 'Barkod & Etiket' },
    { to: '/track',    icon: Search,    label: 'Kargo Takip' },
    { to: '/incidents', icon: AlertTriangle, label: 'Olay Yönetimi' },
  ]},
  { section: 'Optimization', items: [
    { to: '/zones',          icon: Grid3x3,       label: 'Teslimat Bölgeleri' },
    { to: '/ai',             icon: Brain,         label: 'AI Tahmin Modülü' },
    { to: '/weather-impact', icon: CloudRain,     label: 'Hava Durumu' },
    { to: '/digital-twin',   icon: Cpu,           label: 'Dijital İkiz' },
  ]},
  { section: 'Finans', items: [
    { to: '/tariffs',   icon: DollarSign,   label: 'Tarife Yönetimi' },
  ]},
  { section: 'Analitik', items: [
    { to: '/reports',      icon: BarChart2,  label: 'Raporlar' },
    { to: '/gamification', icon: Trophy,     label: 'Kurye Motivasyon' },
    { to: '/anomaly',      icon: ScanSearch, label: 'Anomali Tespiti' },
  ]},
  { section: 'Sistem', items: [
    { to: '/audit-log',    icon: ClipboardList, label: 'Audit Log' },
  ]},
];

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon">K</div>
          <div className="sidebar-logo-text">
            <h1>KargOne</h1>
            <span>Command Center</span>
          </div>
        </div>
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          style={{ marginLeft: 'auto' }}
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" size={17} />
                <span>{item.label}</span>
                <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.3 }} />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink
            to="/support"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={({ isActive }) => ({ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' })}
          >
            <HelpCircle size={17} className="nav-icon" />
            <span>Destek Merkezi</span>
          </NavLink>
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              window.location.href = '/login';
            }}
            className="nav-item"
            style={{ color: 'var(--accent-red)' }}
          >
            <LogOut size={17} className="nav-icon" />
            <span>Çıkış Yap</span>
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12, fontFamily: "'Geist Mono', monospace", letterSpacing: '0.05em' }}>
          v1.0.0 · FastAPI + React
        </div>
      </div>
    </aside>
  );
}
