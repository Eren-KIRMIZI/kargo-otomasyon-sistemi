import React, { useEffect, useState } from 'react';
import { getMyTickets, createSupportTicket } from '../../services/api';
import {
  LifeBuoy, Plus, X, MessageSquare, CheckCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Send
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

/* ─────────── Types ─────────── */
interface SupportTicket {
  id: number;
  customer_id: number;
  subject: string;
  message: string;
  status: string;
  admin_response?: string;
  priority: string;
  intent?: string;
  is_escalated: boolean;
  created_at: string;
  updated_at: string;
}

/* ─────────── Helpers ─────────── */
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  open:          { label: 'Beklemede',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   Icon: Clock },
  investigating: { label: 'İnceleniyor',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   Icon: MessageSquare },
  resolved:      { label: 'Çözüldü',      color: '#10b981', bg: 'rgba(16,185,129,0.12)',   Icon: CheckCircle },
  answered:      { label: 'Yanıtlandı',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   Icon: MessageSquare },
};

/* ─────────── Yeni Talep Modalı ─────────── */
function CreateTicketModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createSupportTicket({
        subject,
        message
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Talep oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const QUICK_SUBJECTS = [
    'Kargom kayboldu',
    'Kargom hasarlı geldi',
    'Teslimat çok geç',
    'Fatura bilgilerim yanlış',
    'Kargo takip edilemiyor',
    'Diğer',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><LifeBuoy size={18} /> Yeni Destek Talebi Oluştur</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Konu *</label>
            <input className="form-input" value={subject}
              onChange={e => setSubject(e.target.value)} placeholder="Sorununuzu kısaca özetleyin" required />
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Hızlı konu seçimi:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_SUBJECTS.map(s => (
                <button key={s} type="button"
                  onClick={() => setSubject(s)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    border: subject === s ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: subject === s ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: subject === s ? 'var(--accent-primary)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mesajınız *</label>
            <textarea className="form-input" rows={5} value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Sorununuzu veya şikayetinizi detaylı olarak açıklayın. Varsa takip numaranızı da belirtiniz."
              required />
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, marginBottom: 4 }}>💡 Bilgi</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Talebiniz genellikle 1–2 iş günü içinde yanıtlanır. Acil durumlar için <strong>0850 123 45 67</strong> numaralı hattı arayabilirsiniz.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Send size={14} /> {loading ? 'Gönderiliyor...' : 'Talebi Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Bilet Kartı ─────────── */
function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_MAP[ticket.status] || { label: ticket.status, color: '#888', bg: 'transparent', Icon: AlertCircle };

  return (
    <div className="card" style={{
      padding: '18px 20px', marginBottom: 12,
      border: ticket.admin_response ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border-color)',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <s.Icon size={18} color={s.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{ticket.subject}</span>
            <span style={{
              padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: s.bg, color: s.color,
            }}>
              {s.label}
            </span>
            {ticket.admin_response && (
              <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                💬 Yanıt var
              </span>
            )}
            {ticket.priority === 'critical' && (
              <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                🔥 Kritik Öncelik
              </span>
            )}
            {ticket.is_escalated && (
              <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={10} /> SLA İhlali
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            #{ticket.id} · {new Date(ticket.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            {ticket.intent && ` · Kategori: ${ticket.intent}`}
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
          {/* Müşteri Mesajı */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              📝 Talebiniz
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
            }}>
              {ticket.message}
            </div>
          </div>

          {/* Admin Yanıtı */}
          {ticket.admin_response ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                💬 Destek Ekibi Yanıtı
              </div>
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
                fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
              }}>
                {ticket.admin_response}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Son güncelleme: {new Date(ticket.updated_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Clock size={14} /> Talebiniz inceleme sırasında. En kısa sürede yanıtlanacaktır.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────── Ana Sayfa ─────────── */
export default function CustomerSupport() {
  const user = useAuthStore(s => s.user);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getMyTickets();
      const mapped = res.data.map((ticket: any) => ({
        id: ticket.id,
        customer_id: ticket.customer_id,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        admin_response: ticket.admin_response,
        priority: ticket.priority,
        intent: ticket.intent,
        is_escalated: ticket.is_escalated,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      }));
      setTickets(mapped);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const stats = {
    total:    tickets.length,
    open:     tickets.filter(t => t.status === 'open').length,
    answered: tickets.filter(t => t.status === 'investigating' || t.status === 'answered').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Destek Merkezi</div>
          <div className="topbar-subtitle">Destek talepleriniz ve şikayetlerinizi buradan takip edin</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto' }}>
          <Plus size={14} /> Yeni Talep Oluştur
        </button>
      </div>

      <div className="page-content">
        {/* İstatistikler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Toplam Talep', value: stats.total,    color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  Icon: LifeBuoy },
            { label: 'Beklemede',    value: stats.open,     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  Icon: Clock },
            { label: 'Yanıtlandı',  value: stats.answered, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  Icon: MessageSquare },
            { label: 'Çözüldü',     value: stats.resolved, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  Icon: CheckCircle },
          ].map(card => (
            <div key={card.label} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.Icon size={18} color={card.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtreler */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['all', 'open', 'investigating', 'resolved'].map(f => {
            const info = f === 'all'
              ? { label: 'Tümü', color: 'var(--text-primary)' }
              : STATUS_MAP[f] ?? { label: f, color: '#888' };
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: filter === f ? `1px solid ${info.color}` : '1px solid transparent',
                background: filter === f ? `${info.color}18` : 'rgba(255,255,255,0.04)',
                color: filter === f ? info.color : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>
                {info.label}
              </button>
            );
          })}
        </div>

        {/* Biletler */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /><span>Talepler yükleniyor...</span></div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <LifeBuoy size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {filter === 'all' ? 'Henüz destek talebi oluşturmadınız' : 'Bu kategoride talep bulunamadı'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Bir sorun yaşıyorsanız "Yeni Talep Oluştur" butonuna tıklayın.
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Yeni Talep Oluştur
            </button>
          </div>
        ) : (
          <div>
            {filtered.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        )}

        {/* SSS Bölümü */}
        <div className="card" style={{ padding: '20px 24px', marginTop: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>
            ❓ Sık Sorulan Sorular
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { q: 'Kargom ne zaman teslim edilecek?', a: 'Standart teslimat 1–3 iş günü, ekspres teslimat ise aynı gün gerçekleşir. Takip numaranızla anlık durumu izleyebilirsiniz.' },
              { q: 'Kargo adresini değiştirebilir miyim?', a: 'Kargonuz depodan çıkmadıysa adres değişikliği yapılabilir. Destek talebi oluşturun.' },
              { q: 'İade kargoyu nasıl oluşturabilirim?', a: '"Kargolarım" sayfasından ilgili kargoyu bulup "İade Et" seçeneğine tıklayın.' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>🔹 {item.q}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && <CreateTicketModal onClose={() => setShowModal(false)} onSuccess={fetchData} />}
    </>
  );
}
