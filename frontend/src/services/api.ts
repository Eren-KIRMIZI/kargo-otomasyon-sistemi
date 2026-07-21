import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 saniye timeout (Backend takılırsa sonsuz döngüyü engeller)
});

const requestInterceptorId = api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token geçersiz ya da süresi dolmuşsa logout
const responseInterceptorId = api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      // Login sayfasındayken redirect YAPMA — spinner döngüsünü önler
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Vite HMR: modül yenilenince eski interceptor'ları temizle
// Aksi hâlde sessionStorage okuyan eski interceptor çalışmaya devam eder
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    api.interceptors.request.eject(requestInterceptorId);
    api.interceptors.response.eject(responseInterceptorId);
  });
}

// ─── Auth ───────────────────────────────────────────────────────
export const login = (data: URLSearchParams) => 
  api.post('/auth/login/access-token', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

export const getMe = () => api.get('/auth/me');

// ─── Müşteri Paneli ─────────────────────────────────────────────
export const getCustomerOrders = (params?: { limit?: number; offset?: number }) => 
  api.get('/customer/orders', { params });

export const createCustomerOrder = (data: any) => 
  api.post('/customer/orders', data);

export const getCustomerStats = () => 
  api.get('/customer/stats');

export const getWallet = () => 
  api.get('/customer/wallet');

export const depositWallet = (data: { amount: number }) => 
  api.post('/customer/wallet/deposit', data);

export const getReturnCodes = () => 
  api.get('/customer/return-codes');

export const createReturnCode = (data: { description?: string }) => 
  api.post('/customer/return-codes', data);


// ─── Lokasyonlar ────────────────────────────────────────────────
export const getProvinces = () => api.get('/locations/provinces');
export const getDistricts = (provinceId: number) => api.get(`/locations/districts/${provinceId}`);
export const getNeighborhoods = (districtId: number) => api.get(`/locations/neighborhoods/${districtId}`);

// ─── Depolar ────────────────────────────────────────────────────
export const getDepots = (params?: { is_active?: boolean; province_id?: number }) =>
  api.get('/depots', { params });
export const getDepot = (id: number) => api.get(`/depots/${id}`);
export const getNearestDepot = (lat: number, lon: number) =>
  api.get('/depots/nearest', { params: { lat, lon } });
export const createDepot = (data: any) => api.post('/depots', data);
export const updateDepot = (id: number, data: any) => api.put(`/depots/${id}`, data);
export const deleteDepot = (id: number) => api.delete(`/depots/${id}`);

// ─── Kuryeler ───────────────────────────────────────────────────
export const getCouriers = (params?: { depot_id?: number; status?: string }) =>
  api.get('/couriers', { params });
export const createCourier = (data: any) => api.post('/couriers', data);
export const updateCourier = (id: number, data: any) => api.put(`/couriers/${id}`, data);
export const deleteCourier = (id: number) => api.delete(`/couriers/${id}`);

// ─── Siparişler ─────────────────────────────────────────────────
export const getOrders = (params?: { status?: string; province_id?: number; limit?: number }) =>
  api.get('/orders', { params });
export const getOrderStats = () => api.get('/orders/stats');
export const getOrder = (id: number) => api.get(`/orders/${id}`);
export const createOrder = (data: any) => api.post('/orders', data);
export const updateOrder = (id: number, data: any) => api.put(`/orders/${id}`, data);
export const assignDepot = (id: number) => api.post(`/orders/${id}/assign-depot`);
export const assignCourier = (id: number) => api.post(`/orders/${id}/assign-courier`);
export const confirmDelivery = (id: number, proof?: string, note?: string) =>
  api.post(`/orders/${id}/deliver`, null, { params: { delivery_proof_url: proof, delivery_note: note } });
export const deleteOrder = (id: number) => api.delete(`/orders/${id}`);
export const trackOrder = (trackingNumber: string) => api.get(`/orders/track/${trackingNumber}`);
export const createReturnOrder = (data: { original_order_id: number; reason?: string }) =>
  api.post('/orders/returns', data);


// ─── Optimizasyon ────────────────────────────────────────────────
export const runKMeans = (data: { n_clusters: number; province_id?: number }) =>
  api.post('/optimize/kmeans', data);
export const runDBSCAN = (data: { eps: number; min_samples: number; province_id?: number }) =>
  api.post('/optimize/dbscan', data);
export const getZones = () => api.get('/optimize/zones');

// ─── AI Tahmin ───────────────────────────────────────────────────
export const getDemandForecast = (data: { province_id: number; days_ahead: number }) =>
  api.post('/ai/demand-forecast', data);
export const getDeliveryTime = (data: {
  distance_km: number;
  traffic_level: number;
  weight_kg: number;
  province_id: number;
  day_of_week: number;
  hour_of_day: number;
}) => api.post('/ai/delivery-time', data);
export const retrainModels = () => api.post('/ai/retrain');

// ─── Araçlar ───────────────────────────────────────────────────
export const getVehicles = () => api.get('/vehicles');
export const getVehicle = (id: number) => api.get(`/vehicles/${id}`);
export const createVehicle = (data: any) => api.post('/vehicles', data);
export const updateVehicle = (id: number, data: any) => api.put(`/vehicles/${id}`, data);
export const deleteVehicle = (id: number) => api.delete(`/vehicles/${id}`);

// ─── Müşteriler ────────────────────────────────────────────────
export const getCustomers = () => api.get('/customers');
export const getCustomer = (id: number) => api.get(`/customers/${id}`);
export const createCustomer = (userId: number, data: any) => api.post(`/customers?user_id=${userId}`, data);
export const getCustomerAddresses = (id: number) => api.get(`/customers/${id}/addresses`);
export const getAdminCustomerWallet = (id: number) => api.get(`/customers/${id}/wallet`);
export const getAdminCustomerReturnCodes = (id: number) => api.get(`/customers/${id}/return-codes`);
export const addCustomerAddress = (id: number, data: any) => api.post(`/customers/${id}/addresses`, data);
export const deleteCustomerAddress = (customerId: number, addressId: number) => api.delete(`/customers/${customerId}/addresses/${addressId}`);

// ─── Fiyatlandırma ve Tarifeler ────────────────────────────────
export const getTariffs = () => api.get('/tariffs');
export const createTariff = (data: any) => api.post('/tariffs', data);
export const getCampaigns = () => api.get('/campaigns');
export const createCampaign = (data: any) => api.post('/campaigns', data);

// ─── Raf ve Depo ───────────────────────────────────────────────
export const getRacks = (depotId?: number) => api.get('/racks', { params: { depot_id: depotId } });
export const createRack = (data: any) => api.post('/racks', data);
export const deleteRack = (id: number) => api.delete(`/racks/${id}`);
export const getInventoryLogs = (depotId?: number, action?: string) =>
  api.get('/inventory-logs', { params: { depot_id: depotId, action } });
export const createInventoryLog = (data: any) => api.post('/inventory-logs', data);

// ─── Transfer ──────────────────────────────────────────────────
export const getTransfers = (status?: string) => api.get('/transfers', { params: { status } });
export const createTransfer = (data: any) => api.post('/transfers', data);
export const completeTransfer = (id: number) => api.patch(`/transfers/${id}/complete`);

// ─── Bakım ve Yakıt ────────────────────────────────────────────
export const getVehicleMaintenance = (vehicleId: number) => api.get(`/vehicles/${vehicleId}/maintenance`);
export const getAllMaintenance = (status?: string) => api.get('/maintenance', { params: { status } });
export const createMaintenance = (data: any) => api.post('/maintenance', data);
export const updateMaintenance = (id: number, data: any) => api.patch(`/maintenance/${id}`, data);
export const getVehicleFuelLogs = (vehicleId: number) => api.get(`/vehicles/${vehicleId}/fuel-logs`);
export const getAllFuelLogs = () => api.get('/fuel-logs');
export const addFuelLog = (data: any) => api.post('/fuel-logs', data);

// ─── Analitik ve Raporlama ─────────────────────────────────────
export const getDashboardAnalytics = (days: number = 7) => api.get('/analytics/dashboard', { params: { days } });

// ─── Etiket ────────────────────────────────────────────────────
export const downloadOrderLabel = async (orderId: number) => {
  const response = await api.get(`/orders/${orderId}/label`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `etiket_${orderId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ─── Barkod ve QR Kod ─────────────────────────────────────────
export const getBarcodeImageUrl = (orderId: number) =>
  `${BASE_URL}/orders/${orderId}/barcode-image`;

export const getQRCodeUrl = (orderId: number) =>
  `${BASE_URL}/orders/${orderId}/qrcode`;

export const scanBarcode = (trackingNumber: string) =>
  api.get(`/orders/scan/${trackingNumber}`);

// ─── Olay & İhlal Yönetimi ─────────────────────────────────────
export const getIncidents = (params?: { type?: string; status?: string; limit?: number; offset?: number }) =>
  api.get('/incidents', { params });

export const getIncidentStats = () =>
  api.get('/incidents/stats');

export const getIncident = (id: number) =>
  api.get(`/incidents/${id}`);

export const createIncident = (data: {
  type: string;
  description: string;
  tracking_number?: string;
  order_id?: number;
  courier_id?: number;
}) => api.post('/incidents', data);

export const updateIncident = (id: number, data: { status?: string; admin_notes?: string }) =>
  api.put(`/incidents/${id}`, data);

export const deleteIncident = (id: number) =>
  api.delete(`/incidents/${id}`);

// ─── Destek Merkezi ────────────────────────────────────────────
export const getSupportTickets = (params?: { status?: string; limit?: number; offset?: number }) =>
  api.get('/support', { params });

export const getMyTickets = () =>
  api.get('/support/my-tickets');

export const getSupportStats = () =>
  api.get('/support/stats');

export const createSupportTicket = (data: { subject: string; message: string }) =>
  api.post('/support', data);

export const updateSupportTicket = (id: number, data: { status?: string; admin_response?: string }) =>
  api.put(`/support/${id}`, data);

export const deleteSupportTicket = (id: number) =>
  api.delete(`/support/${id}`);

export const checkSLA = () =>
  api.post('/support/check-sla');

// ─── Chatbot & AI Support ──────────────────────────────────────
export const sendChatbotMessage = (message: string) =>
  api.post('/chatbot/message', { message });

export const escalateToTicket = (data: { message: string; intent: string; priority: string }) =>
  api.post('/chatbot/escalate', data);

// ─── Tarife Yönetimi (Genişletilmiş) ───────────────────────────
export const updateTariff = (id: number, data: any) =>
  api.put(`/tariffs/${id}`, data);

export const deleteTariff = (id: number) =>
  api.delete(`/tariffs/${id}`);

export const updateCampaign = (id: number, data: any) =>
  api.put(`/campaigns/${id}`, data);

export const deleteCampaign = (id: number) =>
  api.delete(`/campaigns/${id}`);

// ─── Canlı Araç Takibi ──────────────────────────────────────────
export const getLiveVehicles = () => api.get('/live-tracking/vehicles');
export const getVehiclePackages = (vehicleId: number) => api.get(`/live-tracking/vehicles/${vehicleId}/packages`);
export const getLiveTrackingStats = () => api.get('/live-tracking/stats');

// ─── İade Yönetimi ──────────────────────────────────────────────
export const getReturns = (params?: { status?: string; reason?: string }) => api.get('/orders/returns', { params });
export const updateReturn = (id: number, data: { status?: string; reason?: string }) => api.put(`/orders/returns/${id}`, data);
export const getReturnAnalytics = () => api.get('/orders/returns-analytics');

// ─── Kurumsal Müşteri Yönetimi ──────────────────────────────────
export const getCorporateCustomers = () => api.get('/corporate/customers');
export const getCorporateDashboard = (customerId: number) => api.get(`/corporate/customers/${customerId}/dashboard`);
export const getCorporateReports = (customerId: number, params?: { start_date?: string; end_date?: string }) => 
  api.get(`/corporate/customers/${customerId}/reports`, { params });
export const getPriceAgreements = () => api.get('/corporate/price-agreements');
export const createPriceAgreement = (data: any) => api.post('/corporate/price-agreements', data);

// ─── Hava Durumu Etki Modülü ────────────────────────────────────
export const getWeather = () => api.get('/weather/current');
export const getWeatherImpact = (data: { condition: string; base_minutes?: number }) => api.post('/weather/delivery-impact', data);
