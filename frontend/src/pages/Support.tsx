import { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle, Bot, Search, BookOpen, FileCode,
  LifeBuoy, MessageSquare, Plus, Clock, CheckCircle,
  Flame, Shield, Zap, Send, Loader2, ChevronDown,
  ChevronUp, FileText, Tag, Sparkles, TicketCheck,
  Database, Cpu, Filter, X, AlertCircle
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────
interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
  layer?: number;
  intent?: string;
  priority?: string;
  sources?: SourceDoc[];
  suggestTicket?: boolean;
  ticketSubject?: string;
  autoTicketId?: number | null;
  timestamp?: Date;
  isTyping?: boolean;
}

interface SourceDoc {
  id: string;
  title: string;
  category: string;
  score: number;
}

interface KBDoc {
  id: string;
  title: string;
  category: string;
  tags: string[];
}

interface Ticket {
  id: number | string;
  subject: string;
  status: string;
  date?: string;
  priority: string;
  created_at?: string;
}

// ── Constants ────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';

const SOS_BUTTONS = [
  {
    id: 'accident',
    label: 'Araç / Kaza Bildirimi',
    desc: 'Filo yönetimine acil ping atar.',
    color: 'rgba(239,68,68',
    icon: AlertTriangle,
    iconClass: 'text-red',
    subject: 'ACİL: Araç / Kaza Bildirimi',
    message: 'Araç kazası veya yol olayı yaşandı. Acil müdahale gerekiyor.',
  },
  {
    id: 'api',
    label: 'Sistem / API Çökmesi',
    desc: 'DevOps ekibini anında uyarır.',
    color: 'rgba(245,158,11',
    icon: Zap,
    iconClass: 'text-orange',
    subject: 'ACİL: Sistem / API Kesintisi',
    message: 'Kritik sistem veya API bağlantısı çöktü. DevOps müdahalesi gerekiyor.',
  },
  {
    id: 'security',
    label: 'Güvenlik İhlali',
    desc: 'Güvenlik birimine SOS gönderir.',
    color: 'rgba(59,130,246',
    icon: Shield,
    iconClass: 'text-blue',
    subject: 'ACİL: Güvenlik İhlali',
    message: 'Güvenlik ihlali tespit edildi. Güvenlik birimi acil müdahale etmeli.',
  },
];

const KB_CATEGORIES = ['Tümü', 'Operasyon', 'Teknik', 'Geliştirici', 'Güvenlik', 'Yapay Zeka', 'IT'];

const LAYER_LABELS: Record<number, { label: string; color: string; icon: typeof Cpu }> = {
  1: { label: 'Kural Motoru', color: 'var(--accent-orange)', icon: Filter },
  2: { label: 'RAG + LLM', color: 'var(--accent-purple)', icon: Database },
  3: { label: 'RAG + LLM', color: 'var(--accent-purple)', icon: Cpu },
};

// ── Helpers ──────────────────────────────────────────────────
function formatTime(date: Date) {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function priorityBadgeClass(p: string) {
  if (p === 'critical' || p === 'Kritik') return 'badge-error';
  if (p === 'high' || p === 'Yüksek') return 'badge-warning';
  if (p === 'low' || p === 'Düşük') return 'badge-neutral';
  return 'badge-neutral';
}

function statusLabel(s: string) {
  if (s === 'open' || s === 'Açık') return { text: 'Açık', color: 'var(--accent-orange)', Icon: Clock };
  if (s === 'answered' || s === 'İnceleniyor') return { text: 'İnceleniyor', color: 'var(--accent-blue)', Icon: MessageSquare };
  return { text: 'Çözüldü', color: 'var(--accent-green)', Icon: CheckCircle };
}

// ── Source Pill ──────────────────────────────────────────────
function SourcePill({ doc }: { doc: SourceDoc }) {
  const pct = Math.round(doc.score * 100);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 20, padding: '4px 10px', fontSize: 11,
    }}>
      <Database size={11} style={{ color: 'var(--accent-purple)' }} />
      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{doc.id}</span>
      <span style={{ color: 'var(--text-muted)' }}>·</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{doc.title}</span>
      {pct > 0 && (
        <>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{pct > 0 ? `%${pct > 100 ? 99 : pct}` : ''}</span>
        </>
      )}
    </div>
  );
}

// ── Chat Bubble ──────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const [showSources, setShowSources] = useState(false);
  const isAI = msg.role === 'ai';
  const layerInfo = msg.layer ? LAYER_LABELS[msg.layer] : null;

  return (
    <div style={{ display: 'flex', flexDirection: isAI ? 'row' : 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: isAI ? 'rgba(139,92,246,0.12)' : 'var(--surface-high)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: isAI ? '1px solid rgba(139,92,246,0.25)' : '1px solid var(--border)',
      }}>
        {isAI
          ? <Bot size={17} style={{ color: 'var(--accent-purple)' }} />
          : <LifeBuoy size={17} style={{ color: 'var(--text-muted)' }} />
        }
      </div>

      <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Bubble */}
        <div style={{
          background: isAI ? 'rgba(139,92,246,0.05)' : 'var(--bg-secondary)',
          border: `1px solid ${isAI ? 'rgba(139,92,246,0.18)' : 'var(--border)'}`,
          borderRadius: 14,
          borderTopLeftRadius: isAI ? 4 : 14,
          borderTopRightRadius: isAI ? 14 : 4,
          padding: '10px 14px',
          fontSize: 13.5,
          color: 'var(--text-primary)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {msg.isTyping ? (
            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
              <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
            </span>
          ) : msg.text}
        </div>

        {/* Meta row */}
        {isAI && !msg.isTyping && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {/* Layer badge */}
            {layerInfo && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                color: layerInfo.color,
                background: `${layerInfo.color}15`,
                border: `1px solid ${layerInfo.color}30`,
                borderRadius: 10, padding: '2px 8px',
              }}>
                <layerInfo.icon size={9} />
                {layerInfo.label}
              </span>
            )}

            {/* Priority badge for critical */}
            {msg.priority === 'critical' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '2px 8px' }}>
                🚨 KRİTİK
              </span>
            )}

            {/* Auto ticket notification */}
            {msg.autoTicketId && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent-green)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <TicketCheck size={9} /> #{msg.autoTicketId} otomatik açıldı
              </span>
            )}

            {/* Timestamp */}
            {msg.timestamp && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {formatTime(msg.timestamp)}
              </span>
            )}
          </div>
        )}

        {/* Ticket suggestion */}
        {isAI && msg.suggestTicket && !msg.autoTicketId && msg.ticketSubject && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10, fontSize: 12,
          }}>
            <AlertCircle size={13} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Destek talebi önerildi: <strong style={{ color: 'var(--text-primary)' }}>{msg.ticketSubject}</strong>
            </span>
          </div>
        )}

        {/* RAG Sources toggle */}
        {isAI && msg.sources && msg.sources.length > 0 && !msg.isTyping && (
          <div>
            <button
              onClick={() => setShowSources(s => !s)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, color: 'var(--text-muted)', padding: '2px 0',
              }}
            >
              <Database size={11} />
              {msg.sources.length} RAG Kaynağı
              {showSources ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {showSources && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {msg.sources.map(s => <SourcePill key={s.id} doc={s} />)}
              </div>
            )}
          </div>
        )}

        {/* User timestamp */}
        {!isAI && msg.timestamp && (
          <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>
            {formatTime(msg.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function Support() {
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: 'Merhaba! Ben Kargo AI, Gemma 4 31B Cloud API ile çalışan kurumsal destek asistanınım.\n\nŞirket prosedürleri, teknik sorunlar veya operasyon kılavuzları hakkında sorularınızı yanıtlıyorum. Bilgi bankamı RAG teknolojisiyle tarıyorum.',
      layer: 3,
      intent: 'greeting',
      sources: [],
      timestamp: new Date(),
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [tickets, setTickets] = useState<Ticket[]>([
    { id: '#TKT-082', subject: 'Zebra Barkod Okuyucu Arızası', status: 'open', date: 'Bugün 14:20', priority: 'high' },
    { id: '#TKT-081', subject: 'İzmir Depo API Bağlantı Hatası', status: 'answered', date: 'Dün 09:15', priority: 'critical' },
    { id: '#TKT-079', subject: 'Kurye Uygulaması Şifre Sıfırlama', status: 'resolved', date: '18 Haz', priority: 'low' },
  ]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<string>('');

  const [kbDocs, setKbDocs] = useState<KBDoc[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const [kbCategory, setKbCategory] = useState('Tümü');
  const [kbLoading, setKbLoading] = useState(false);

  const [sosLoading, setSosLoading] = useState<string | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load knowledge base
  useEffect(() => {
    setKbLoading(true);
    fetch(`${API_BASE}/api/support/knowledge-base`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: KBDoc[]) => setKbDocs(data))
      .catch(() => {}) // fallback: empty list
      .finally(() => setKbLoading(false));
  }, []);

  // Load tickets
  useEffect(() => {
    setLoadingTickets(true);
    fetch(`${API_BASE}/api/support`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Ticket[]) => {
        if (data && data.length > 0) setTickets(data);
      })
      .catch(() => {})
      .finally(() => setLoadingTickets(false));
  }, []);

  // ── Chat send ──────────────────────────────────────────────
  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');

    // Add user message
    setChatMessages(prev => [...prev, {
      role: 'user', text: userMsg, timestamp: new Date(),
    }]);

    // Add typing indicator
    setIsLoading(true);
    setChatMessages(prev => [...prev, {
      role: 'ai', text: '', isTyping: true, timestamp: new Date(),
    }]);

    try {
      const resp = await fetch(`${API_BASE}/api/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();

      // Remove typing indicator, add AI response
      setChatMessages(prev => {
        const withoutTyping = prev.filter(m => !m.isTyping);
        return [...withoutTyping, {
          role: 'ai',
          text: data.reply,
          layer: data.layer,
          intent: data.intent,
          priority: data.priority,
          sources: data.sources,
          suggestTicket: data.suggest_ticket,
          ticketSubject: data.ticket_subject,
          autoTicketId: data.auto_ticket_id,
          timestamp: new Date(),
        }];
      });
    } catch {
      // Offline fallback
      setChatMessages(prev => {
        const withoutTyping = prev.filter(m => !m.isTyping);
        return [...withoutTyping, {
          role: 'ai',
          text: '⚠️ Backend bağlantısı kurulamadı. Lütfen sunucunun çalıştığından emin olun.\n\nBackend: `uvicorn app.main:app --reload`',
          layer: 1,
          intent: 'error',
          timestamp: new Date(),
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── S.O.S button ──────────────────────────────────────────
  const handleSOS = async (btn: typeof SOS_BUTTONS[0]) => {
    setSosLoading(btn.id);
    try {
      await fetch(`${API_BASE}/api/support/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: btn.subject, message: btn.message }),
      });
      // Add to local tickets
      setTickets(prev => [{
        id: `#TKT-SOS-${Date.now()}`,
        subject: btn.subject,
        status: 'open',
        date: 'Şimdi',
        priority: 'critical',
      }, ...prev]);
    } catch {/* ignore */} finally {
      setSosLoading(null);
    }
  };

  // ── Quick prompts ──────────────────────────────────────────
  const quickPrompts = [
    'Zebra barkod okuyucu çalışmıyor',
    'SLA kuralları nelerdir?',
    'K-Means algoritmasını nasıl çalıştırırım?',
    'Kurye şifre sıfırlama prosedürü',
  ];

  // ── KB filtering ───────────────────────────────────────────
  const filteredKB = kbDocs.filter(doc => {
    const matchCat = kbCategory === 'Tümü' || doc.category === kbCategory;
    const matchSearch = !kbSearch ||
      doc.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
      doc.tags.some(t => t.includes(kbSearch.toLowerCase()));
    return matchCat && matchSearch;
  });

  const catIcons: Record<string, typeof FileCode> = {
    Operasyon: LifeBuoy,
    Teknik: Cpu,
    Geliştirici: FileCode,
    Güvenlik: Shield,
    'Yapay Zeka': Sparkles,
    IT: Filter,
  };
  const catColors: Record<string, string> = {
    Operasyon: 'var(--accent-green)',
    Teknik: 'var(--accent-blue)',
    Geliştirici: 'var(--accent-orange)',
    Güvenlik: 'var(--accent-red, #ef4444)',
    'Yapay Zeka': 'var(--accent-purple)',
    IT: 'var(--text-secondary)',
  };

  // ── Ticket filter ──────────────────────────────────────────
  const filteredTickets = tickets.filter(t =>
    !ticketFilter ||
    t.status === ticketFilter ||
    (ticketFilter === 'open' && (t.status === 'open' || t.status === 'Açık')) ||
    (ticketFilter === 'answered' && (t.status === 'answered' || t.status === 'İnceleniyor')) ||
    (ticketFilter === 'resolved' && (t.status === 'resolved' || t.status === 'Çözüldü'))
  );

  return (
    <>
      <style>{`
        .typing-dot {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--accent-purple);
          animation: typing-bounce 1s infinite ease-in-out;
        }
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .sos-btn {
          display: flex; align-items: center; gap: 16;
          padding: 18px 20px; border-radius: 14px; cursor: pointer;
          transition: all 0.2s; text-align: left; width: 100%;
          font-family: inherit;
        }
        .sos-btn:hover { transform: translateY(-2px); }
        .sos-btn:active { transform: translateY(0); }
        .kb-tag {
          display: inline-flex; align-items: center; gap: 3;
          background: var(--surface-high); border: 1px solid var(--border);
          borderRadius: 20; padding: 2px 8px; fontSize: 10px;
          color: var(--text-muted); font-size: 10px; border-radius: 20px;
        }
        .chat-input-wrap {
          display: flex; gap: 8; align-items: flex-end;
        }
        .ai-chat-area {
          flex: 1; overflow-y: auto; display: flex;
          flex-direction: column; gap: 16; padding-right: 6px;
        }
        .ai-chat-area::-webkit-scrollbar { width: 4px; }
        .ai-chat-area::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      `}</style>

      <div className="topbar">
        <div>
          <div className="topbar-title">AI Destekli Destek Merkezi</div>
          <div className="topbar-subtitle">
            Kargo AI (Gemma 4 31B + RAG) · Kurumsal bilgi bankası · Kriz yönetimi · IT destek talepleri
          </div>
        </div>
        {/* Ollama status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 24, padding: '6px 14px', fontSize: 12, fontWeight: 600,
          color: 'var(--accent-purple)',
        }}>
          <Sparkles size={13} />
          Cloud API · gemma-4-31b
        </div>
      </div>

      <div className="page-content">

        {/* ── S.O.S Panel ─────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Flame size={14} style={{ color: '#ef4444' }} />
            S.O.S — Acil Durum Bildirimi
          </div>
          <div className="grid-3" style={{ gap: 12 }}>
            {SOS_BUTTONS.map(btn => {
              const Icon = btn.icon;
              const isThisLoading = sosLoading === btn.id;
              return (
                <button
                  key={btn.id}
                  id={`sos-btn-${btn.id}`}
                  className="sos-btn"
                  onClick={() => handleSOS(btn)}
                  disabled={!!sosLoading}
                  style={{
                    background: `${btn.color},0.04)`,
                    border: `1px solid ${btn.color},0.3)`,
                    opacity: sosLoading && !isThisLoading ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: `${btn.color},0.10)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isThisLoading
                      ? <Loader2 size={22} className={btn.iconClass} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Icon size={22} className={btn.iconClass} />
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {btn.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{btn.desc}</div>
                  </div>
                  {isThisLoading && (
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                      Gönderiliyor...
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main 2-col Grid ──────────────────────────────── */}
        <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>

          {/* ── AI Chat ─────────────────────────────────────── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
            {/* Header */}
            <div style={{
              borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div className="card-title">
                  <Bot size={17} style={{ color: 'var(--accent-purple)' }} /> Kargo AI Asistanı
                </div>
                <div className="card-subtitle">RAG tabanlı şirket bilgi bankası + Local LLM</div>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '4px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block' }} />
                gemma-4
              </div>
            </div>

            {/* Messages */}
            <div className="ai-chat-area">
              {chatMessages.map((msg, idx) => (
                <ChatBubble key={idx} msg={msg} />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts */}
            {chatMessages.length <= 1 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {quickPrompts.map(p => (
                  <button
                    key={p}
                    onClick={() => { setChatInput(p); }}
                    style={{
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      borderRadius: 20, padding: '5px 12px', fontSize: 11.5,
                      color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent-purple)')}
                    onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleChat} className="chat-input-wrap" style={{ marginTop: 12 }}>
              <input
                id="support-chat-input"
                type="text"
                placeholder="Sorunuzu veya anahtar kelimeyi yazın..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={isLoading}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', outline: 'none',
                  fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13,
                  opacity: isLoading ? 0.7 : 1,
                }}
              />
              <button
                id="support-chat-send"
                type="submit"
                disabled={isLoading || !chatInput.trim()}
                style={{
                  background: isLoading ? 'var(--surface-high)' : 'var(--accent-purple)',
                  border: 'none', borderRadius: 10, padding: '10px 16px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: 'white', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {isLoading
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} />
                }
                {isLoading ? 'Yanıt...' : 'Gönder'}
              </button>
            </form>
          </div>

          {/* ── Knowledge Base ───────────────────────────────── */}
          <div className="card" style={{ height: 520, display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
              <div className="card-title">
                <BookOpen size={17} style={{ color: 'var(--accent-blue)' }} /> Bilgi Bankası
              </div>
              <div className="card-subtitle">Şirket prosedürleri, API rehberleri ve teknik dokümanlar</div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-muted)' }} />
              <input
                id="kb-search-input"
                type="text"
                placeholder="Doküman veya etiket ara..."
                value={kbSearch}
                onChange={e => setKbSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 34, padding: '10px 14px 10px 34px',
                  borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  outline: 'none', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
              {kbSearch && (
                <button
                  onClick={() => setKbSearch('')}
                  style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                ><X size={14} /></button>
              )}
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {KB_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setKbCategory(cat)}
                  style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: kbCategory === cat ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    color: kbCategory === cat ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${kbCategory === cat ? 'var(--accent-blue)' : 'var(--border)'}`,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Docs list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kbLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
                </div>
              ) : filteredKB.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
                  Doküman bulunamadı.
                </div>
              ) : filteredKB.map(doc => {
                const Icon = catIcons[doc.category] || FileText;
                const iconColor = catColors[doc.category] || 'var(--text-secondary)';
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseOver={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = iconColor;
                      (e.currentTarget as HTMLElement).style.background = 'var(--surface-high)';
                    }}
                    onMouseOut={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
                    }}
                    onClick={() => setChatInput(`${doc.title} hakkında bilgi ver`)}
                    title="Tıkla: AI'a bu dokümanı sormak için"
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: `${iconColor}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} style={{ color: iconColor }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</span>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--surface-high)', padding: '1px 6px', borderRadius: 4 }}>
                          {doc.id}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {doc.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="kb-tag">
                            <Tag size={8} /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Tickets ────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div>
              <div className="card-title">
                <LifeBuoy size={17} style={{ color: 'var(--accent-orange)' }} /> Destek Talepleri (IT & Operasyon)
              </div>
              <div className="card-subtitle">Mevcut biletleri görüntüleyin, yeni talep açın.</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Filter */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: '', label: 'Tümü' },
                  { key: 'open', label: 'Açık' },
                  { key: 'answered', label: 'İnceleniyor' },
                  { key: 'resolved', label: 'Çözüldü' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setTicketFilter(f.key)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                      background: ticketFilter === f.key ? 'var(--accent-orange)' : 'var(--bg-secondary)',
                      color: ticketFilter === f.key ? 'white' : 'var(--text-muted)',
                      border: `1px solid ${ticketFilter === f.key ? 'var(--accent-orange)' : 'var(--border)'}`,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                id="new-ticket-btn"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const subject = prompt('Talep konusu:');
                  if (!subject) return;
                  const message = prompt('Açıklama:') || subject;
                  fetch(`${API_BASE}/api/support`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token') || ''}` },
                    body: JSON.stringify({ subject, message }),
                  })
                    .then(r => r.ok ? r.json() : Promise.reject())
                    .then((t: Ticket) => setTickets(prev => [t, ...prev]))
                    .catch(() => {
                      setTickets(prev => [{
                        id: `#TKT-${Date.now()}`, subject,
                        status: 'open', date: 'Şimdi', priority: 'normal',
                      }, ...prev]);
                    });
                }}
              >
                <Plus size={15} /> Yeni Talep
              </button>
            </div>
          </div>

          {loadingTickets ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Talep ID</th>
                    <th>Konu</th>
                    <th>Öncelik</th>
                    <th>Tarih</th>
                    <th>Durum</th>
                    <th style={{ textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>
                        Bu filtre için destek talebi bulunamadı.
                      </td>
                    </tr>
                  ) : filteredTickets.map(t => {
                    const st = statusLabel(t.status);
                    const dateStr = t.date || (t.created_at ? new Date(t.created_at).toLocaleString('tr-TR') : '—');
                    return (
                      <tr key={String(t.id)}>
                        <td style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12 }}>
                          {String(t.id).startsWith('#') ? t.id : `#TKT-${t.id}`}
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.subject}</td>
                        <td>
                          <span className={`badge ${priorityBadgeClass(t.priority)}`}>
                            {t.priority === 'critical' ? 'Kritik' : t.priority === 'high' ? 'Yüksek' : t.priority === 'low' ? 'Düşük' : t.priority === 'normal' ? 'Normal' : t.priority}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateStr}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: st.color }}>
                            <st.Icon size={13} /> {st.text}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary btn-sm">Görüntüle</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
