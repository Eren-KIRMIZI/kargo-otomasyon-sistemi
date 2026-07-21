import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Map, BookUser, LogOut, Truck, LifeBuoy, DollarSign, Menu, X, Wallet, RefreshCcw } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

export default function CustomerSidebar() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo" style={{ background: 'var(--accent-orange)', padding: 8, borderRadius: 8 }}>
            <Truck size={24} color="white" />
          </div>
          <div className="logo-text">
            <h2 style={{ fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>KargOne</h2>
            <p style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Müşteri Paneli</p>
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

      <nav className="sidebar-nav">
        <NavLink to="/customer" end onClick={() => setIsMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Genel Bakış</span>
        </NavLink>
        
        <NavLink to="/customer/orders" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={20} />
          <span>Kargolarım</span>
        </NavLink>

        <NavLink to="/customer/track" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Map size={20} />
          <span>Kargo Takip</span>
        </NavLink>

        <NavLink to="/customer/billing" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <DollarSign size={20} />
          <span>Faturalarım</span>
        </NavLink>

        <NavLink to="/customer/wallet" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Wallet size={20} />
          <span>Cüzdanım</span>
        </NavLink>

        <NavLink to="/customer/returns" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <RefreshCcw size={20} />
          <span>İade Yönetimi</span>
        </NavLink>

        <NavLink to="/customer/address-book" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BookUser size={20} />
          <span>Adres Defterim</span>
        </NavLink>

        <NavLink to="/customer/support" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LifeBuoy size={20} />
          <span>Destek Merkezi</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
        <button 
          onClick={handleLogout} 
          className="nav-item text-red" 
          style={{ 
            width: '100%', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: 'none', 
            cursor: 'pointer', 
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 10,
            color: 'var(--accent-red)',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
        >
          <LogOut size={20} />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
}
