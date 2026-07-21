import React, { useEffect, useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { getWallet, depositWallet } from '../../services/api';

interface WalletTransaction {
  id: number;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export default function CustomerWallet() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositLoading, setDepositLoading] = useState(false);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await getWallet();
      setBalance(res.data.balance || 0);
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    
    try {
      setDepositLoading(true);
      await depositWallet({ amount });
      setDepositAmount('');
      fetchWallet();
    } catch (err) {
      console.error(err);
    } finally {
      setDepositLoading(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Cüzdanım</div>
          <div className="topbar-subtitle">Ön ödemeli bakiye ve işlem geçmişi</div>
        </div>
      </div>

      <div className="page-content">
        <div className="grid-2 mb-6">
          {/* Bakiye Kartı */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '32px' }}>
            <Wallet size={48} className="text-blue mb-4" />
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mevcut Bakiye</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>₺{(balance || 0).toFixed(2)}</div>
          </div>

          {/* Bakiye Yükleme */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Plus size={16} className="text-green" /> Bakiye Yükle</div>
            </div>
            <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Yüklenecek Tutar (₺)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Örn: 500" 
                  min="1" 
                  step="0.01"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  required
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                * Bakiye yükleme işlemleri kredi kartı ile simüle edilmektedir.
              </div>
              <button type="submit" className="btn btn-primary" disabled={depositLoading} style={{ background: 'var(--accent-green)', borderColor: 'var(--accent-green)', color: '#fff' }}>
                {depositLoading ? 'Yükleniyor...' : 'Kredi Kartı ile Yükle'}
              </button>
            </form>
          </div>
        </div>

        {/* İşlem Geçmişi */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Clock size={16} className="text-orange" /> İşlem Geçmişi</div>
          </div>
          <div className="table-container">
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Henüz işlem bulunmamaktadır.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>İşlem Tipi</th>
                    <th>Açıklama</th>
                    <th style={{ textAlign: 'right' }}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {new Date(tx.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td>
                        {tx.transaction_type === 'deposit' ? (
                          <span className="badge badge-delivered" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ArrowDownLeft size={12} /> Yükleme
                          </span>
                        ) : tx.transaction_type === 'payment' ? (
                          <span className="badge badge-failed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ArrowUpRight size={12} /> Harcama
                          </span>
                        ) : (
                          <span className="badge">{tx.transaction_type}</span>
                        )}
                      </td>
                      <td>{tx.description || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: tx.amount > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {tx.amount > 0 ? '+' : ''}₺{tx.amount.toFixed(2)}
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
