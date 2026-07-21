import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Lock, User as UserIcon, ArrowRight, ShieldCheck, GraduationCap } from 'lucide-react';
import { login } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'customer'>('admin');
  const navigate  = useNavigate();
  const { login: setLogin, fetchUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // 1. Token al
      const response = await login(formData);
      const token: string = response.data.access_token;
      setLogin(token);

      // 2. Token'ı doğrudan geçir — interceptor zincirini bypass eder
      await fetchUser(token);

      // 3. Store'dan user'ı oku
      const { user } = useAuthStore.getState();
      if (!user) {
        setError('Kullanıcı bilgisi alınamadı. Lütfen tekrar deneyin.');
        return;
      }

      // 4. Rol / panel uyumu kontrolü
      if (user.role === 'customer') {
        if (loginType !== 'customer') {
          setError('Bu hesap müşteri hesabıdır. Lütfen Müşteri Girişi sekmesini kullanınız.');
          useAuthStore.getState().logout();
          return;
        }
        navigate('/customer');
      } else {
        if (loginType === 'customer') {
          setError('Bu hesap yönetici hesabıdır. Lütfen Yönetici Girişi sekmesini kullanınız.');
          useAuthStore.getState().logout();
          return;
        }
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0d0d0d',
      backgroundImage: "url('/background.png')",
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: 'auto',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute', top: '-20%', left: '30%',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(255,87,34,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '20%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(255,87,34,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 420,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo block */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontSize: 56, fontWeight: 800,
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: '-0.05em',
            marginBottom: 2,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            <svg viewBox="0 0 75 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '0.74em', width: 'auto', marginRight: '0px' }}>
              <polygon points="0,0 25,0 25,25 0,50" fill="#FFFFFF"/>
              <polygon points="0,50 0,100 25,100 25,50 75,0 50,0" fill="#E30613"/>
              <polygon points="25,50 75,100 50,100 25,75" fill="#FFFFFF"/>
            </svg>
            <span style={{ color: '#FFFFFF' }}>arg</span>
            <span style={{ color: '#E30613', margin: '0 1px' }}>O</span>
            <span style={{ color: '#FFFFFF' }}>ne</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400, marginTop: 12 }}>
            Command Center — Lojistik Platformu
          </p>
        </div>

        {/* Login Type Selection */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setLoginType('admin')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px',
              borderRadius: 12,
              background: loginType === 'admin' ? 'var(--accent-orange)' : 'rgba(255,255,255,0.05)',
              color: loginType === 'admin' ? 'white' : 'var(--text-muted)',
              border: loginType === 'admin' ? '1px solid var(--accent-orange)' : '1px solid rgba(255,255,255,0.1)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ShieldCheck size={16} /> YÖNETİCİ GİRİŞİ
          </button>
          <button
            onClick={() => setLoginType('customer')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px',
              borderRadius: 12,
              background: loginType === 'customer' ? 'var(--accent-orange)' : 'rgba(255,255,255,0.05)',
              color: loginType === 'customer' ? 'white' : 'var(--text-muted)',
              border: loginType === 'customer' ? '1px solid var(--accent-orange)' : '1px solid rgba(255,255,255,0.1)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <GraduationCap size={16} /> MÜŞTERİ GİRİŞİ
          </button>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(26,26,26,0.95) 100%)',
          border: '1px solid rgba(46,46,46,1)',
          borderRadius: 20,
          padding: '32px 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Hanken Grotesk', sans-serif", marginBottom: 4 }}>
                {loginType === 'admin' ? 'Yönetici Girişi' : 'Müşteri Girişi'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Hesap bilgilerinizle devam edin
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (loginType === 'admin') {
                  setUsername('admin');
                  setPassword('123456');
                } else {
                  setUsername('musteri');
                  setPassword('123456');
                }
              }}
              style={{
                flexShrink: 0,
                padding: '5px 11px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.18s',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              Demo Girisi
            </button>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--accent-red)',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserIcon size={12} /> Kullanıcı Adı
              </label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={loginType === 'admin' ? "admin" : "musteri_kullaniciadi"}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={12} /> Şifre
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '12px 18px', fontSize: 13 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  Giriş Yap <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", letterSpacing: '0.05em' }}>
          v1.0.0 · FastAPI + React · Kargo Enterprises
        </div>
      </div>
    </div>
  );
}
