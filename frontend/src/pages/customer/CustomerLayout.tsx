import { Outlet } from 'react-router-dom';
import CustomerSidebar from '../../components/CustomerSidebar';
import ChatbotWidget from '../../components/ChatbotWidget';

export default function CustomerLayout() {
  return (
    <div className="app-layout">
      <CustomerSidebar />
      <div className="main-content">
        <Outlet />
      </div>

      {/* Akıllı Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
}
