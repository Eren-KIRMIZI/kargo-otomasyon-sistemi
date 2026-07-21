import React, { useEffect, useState } from 'react';
import { FileText, Download, CheckCircle, Clock } from 'lucide-react';
import { getCustomerOrders } from '../../services/api';

interface Invoice {
  id: string;
  period: string;
  amount: string;
  status: string;
  date: string;
}

export default function CustomerBilling() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentUsage, setCurrentUsage] = useState<number>(0);
  const [currentPeriod, setCurrentPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await getCustomerOrders();
        const orders = res.data || [];
        
        // Group by month
        const groups: Record<string, number> = {};
        let currentMonthTotal = 0;
        
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        setCurrentPeriod(`${months[now.getMonth()]} ${now.getFullYear()}`);

        orders.forEach((o: any) => {
          if (!o.created_at) return;
          const d = new Date(o.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          
          if (key === currentMonthKey) {
            currentMonthTotal += (o.total_price || 0);
          } else {
            groups[key] = (groups[key] || 0) + (o.total_price || 0);
          }
        });
        
        setCurrentUsage(currentMonthTotal);

        const invoiceList: Invoice[] = Object.entries(groups).map(([key, total]) => {
          const [year, month] = key.split('-');
          const periodName = `${months[parseInt(month) - 1]} ${year}`;
          return {
            id: `INV-${year}-${month}`,
            period: periodName,
            amount: `₺${total.toFixed(2)}`,
            status: 'Ödendi',
            date: `01.${month}.${year}`
          };
        }).sort((a, b) => b.id.localeCompare(a.id));
        
        setInvoices(invoiceList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Faturalarım ve Ödemeler</div>
          <div className="topbar-subtitle">Geçmiş kargo gönderimlerinize ait faturaları görüntüleyin ve indirin.</div>
        </div>
      </div>

      <div className="page-content">
        
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.05) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>Güncel Dönem Kullanımı ({currentPeriod})</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>₺{currentUsage.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Fatura kesim tarihi: 01.{String(new Date().getMonth() + 2).padStart(2, '0')}.{new Date().getFullYear()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Ödenmemiş Fatura</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={18} /> Yok
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><FileText size={18} className="text-blue"/> Geçmiş Faturalar</div>
          </div>
          <div className="table-container">
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
            ) : invoices.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Henüz geçmiş faturanız bulunmamaktadır.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Fatura No</th>
                    <th>Dönem</th>
                    <th>Tarih</th>
                    <th>Tutar</th>
                    <th>Durum</th>
                    <th style={{ textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: 'var(--text-secondary)' }}>{inv.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.period}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{inv.date}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inv.amount}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.print()}>
                          <Download size={14} /> PDF İndir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
