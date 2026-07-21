import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, AlertTriangle } from 'lucide-react';
import { sendChatbotMessage, escalateToTicket } from '../services/api';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  isActionable?: boolean;
  intentData?: {
    intent: string;
    priority: string;
  };
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Merhaba! Size nasıl yardımcı olabilirim? (Örn: Kargom nerede, ürün hasarlı vb.)'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatbotMessage(userMsg.text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.data.reply,
        isActionable: res.data.requires_ticket,
        intentData: {
          intent: res.data.intent,
          priority: res.data.priority
        }
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: 'Üzgünüm, şu an bağlantı kuramıyorum. Lütfen daha sonra tekrar deneyin.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (msg: Message) => {
    if (!msg.intentData) return;
    try {
      // Bulduğumuz en son kullanıcı mesajını bulalım
      const userMsgs = messages.filter(m => m.sender === 'user');
      const lastUserMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].text : 'Bilinmeyen Hata';
      
      await escalateToTicket({
        message: lastUserMsg,
        intent: msg.intentData.intent,
        priority: msg.intentData.priority
      });
      
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isActionable: false } : m));
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: 'Destek talebiniz başarıyla oluşturuldu. En kısa sürede size dönüş yapacağız.'
      }]);
    } catch (err) {
      alert('Talep oluşturulurken hata oluştu.');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(99,102,241,0.3)', border: 'none', cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      width: 360, height: 500, borderRadius: 16,
      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Akıllı Asistan</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Çevrimiçi</div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}>
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%'
          }}>
            <div style={{
              padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.5,
              background: msg.sender === 'user' ? '#6366f1' : 'rgba(255,255,255,0.05)',
              color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
              border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
              borderBottomRightRadius: msg.sender === 'user' ? 4 : 14,
              borderBottomLeftRadius: msg.sender === 'bot' ? 4 : 14,
            }}>
              {msg.text}
            </div>
            
            {/* Action Buttons */}
            {msg.sender === 'bot' && msg.isActionable && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleEscalate(msg)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                  }}>
                  <AlertTriangle size={12} /> Destek Talebi Aç
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, borderBottomLeftRadius: 4, display: 'flex', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}></span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1.5s infinite 0.2s' }}></span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1.5s infinite 0.4s' }}></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: 12, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, background: 'rgba(255,255,255,0.02)'
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Mesajınızı yazın..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontSize: 13, outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: input.trim() ? '#6366f1' : 'rgba(255,255,255,0.1)',
            color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default', transition: 'all 0.2s'
          }}>
          <Send size={16} style={{ marginLeft: -2 }} />
        </button>
      </form>
    </div>
  );
}
