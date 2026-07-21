import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Depots from './pages/Depots';
import Couriers from './pages/Couriers';
import Vehicles from './pages/Vehicles';
import Orders from './pages/Orders';
import Zones from './pages/Zones';
import AIInsights from './pages/AIInsights';
import Login from './pages/Login';
import Customers from './pages/Customers';
import Tracking from './pages/Tracking';
import Reports from './pages/Reports';
import BarcodeManager from './pages/BarcodeManager';
import Incidents from './pages/Incidents';
import Tariffs from './pages/Tariffs';
import LiveTracking from './pages/LiveTracking';
import Returns from './pages/Returns';
import Corporate from './pages/Corporate';
import WeatherImpact from './pages/WeatherImpact';
import DigitalTwin from './pages/DigitalTwin';
import Gamification from './pages/Gamification';
import AnomalyDetection from './pages/AnomalyDetection';
import AuditLog from './pages/AuditLog';
import Support from './pages/Support';
import { useAuthStore } from './store/authStore';

import CustomerLayout from './pages/customer/CustomerLayout';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerAddressBook from './pages/customer/CustomerAddressBook';
import CustomerSupport from './pages/customer/CustomerSupport';
import CustomerBilling from './pages/customer/CustomerBilling';
import CustomerWallet from './pages/customer/CustomerWallet';
import CustomerReturns from './pages/customer/CustomerReturns';

/**
 * Korumalı rota bileşeni.
 * - initAuth tamamlanana kadar spinner gösterir.
 * - Giriş yapılmamışsa /login'e yönlendirir.
 * - Rol uyuşmazlığında ilgili ana sayfaya yönlendirir.
 */
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, isInitializing, user } = useAuthStore();

  // Başlangıç doğrulaması devam ediyorsa bekle
  if (isInitializing) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  // Giriş yoksa login'e gönder
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Kullanıcı bilgisi henüz gelmemişse (çok nadir ama olası) bekle
  if (!user) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  // Rol kontrolü
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'customer') return <Navigate to="/customer" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  // Uygulama açılınca bir kez çalışır — token'ı sunucuya doğrulat
  useEffect(() => {
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/track" element={<Tracking />} />
        <Route path="/track/:trackingNumber" element={<Tracking />} />

        <Route
          path="/customer/*"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CustomerDashboard />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="address-book" element={<CustomerAddressBook />} />
          <Route path="track" element={<Tracking />} />
          <Route path="support" element={<CustomerSupport />} />
          <Route path="billing" element={<CustomerBilling />} />
          <Route path="wallet" element={<CustomerWallet />} />
          <Route path="returns" element={<CustomerReturns />} />
          <Route path="*" element={<Navigate to="/customer" replace />} />
        </Route>

        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'courier']}>
              <div className="app-layout">
                <Sidebar />
                <div className="main-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/map" element={<MapView />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/depots" element={<Depots />} />
                    <Route path="/couriers" element={<Couriers />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/barcodes" element={<BarcodeManager />} />
                    <Route path="/zones" element={<Zones />} />
                    <Route path="/ai" element={<AIInsights />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/incidents" element={<Incidents />} />
                    <Route path="/tariffs" element={<Tariffs />} />
                    <Route path="/live-tracking" element={<LiveTracking />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="/corporate" element={<Corporate />} />
                    <Route path="/weather-impact" element={<WeatherImpact />} />
                    <Route path="/digital-twin" element={<DigitalTwin />} />
                    <Route path="/gamification" element={<Gamification />} />
                    <Route path="/anomaly" element={<AnomalyDetection />} />
                    <Route path="/audit-log" element={<AuditLog />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
