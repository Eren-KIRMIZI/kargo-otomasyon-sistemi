import { useState, useEffect } from 'react';
import { Trophy, Star, Medal, Zap, TrendingUp, Package, Clock, Award, Crown, Shield, Target, ChevronUp, ChevronDown } from 'lucide-react';

// Mock data - gerçek API bağlandığında burası değişir
const MOCK_COURIERS = [
  { id: 1, name: 'Ahmet Yılmaz', avatar: 'AY', deliveries: 1847, success_rate: 98.7, points: 9240, streak: 14, badges: ['gold_courier', 'elite', 'speed_demon', 'perfect_week'], rank: 1, change: 0, region: 'İstanbul Avrupa', monthly_deliveries: 234 },
  { id: 2, name: 'Fatma Kaya', avatar: 'FK', deliveries: 1623, success_rate: 97.9, points: 8115, streak: 9,  badges: ['gold_courier', 'elite', 'night_owl'],             rank: 2, change: 1,  region: 'İstanbul Anadolu', monthly_deliveries: 198 },
  { id: 3, name: 'Mehmet Demir', avatar: 'MD', deliveries: 1510, success_rate: 96.4, points: 7550, streak: 6,  badges: ['silver_courier', 'marathon'],                   rank: 3, change: -1, region: 'Ankara',           monthly_deliveries: 187 },
  { id: 4, name: 'Ayşe Çelik',  avatar: 'AÇ', deliveries: 1388, success_rate: 98.1, points: 6940, streak: 21, badges: ['gold_courier', 'streak_master'],                 rank: 4, change: 2,  region: 'İzmir',            monthly_deliveries: 173 },
  { id: 5, name: 'Ali Şahin',   avatar: 'AŞ', deliveries: 1245, success_rate: 95.2, points: 6225, streak: 3,  badges: ['silver_courier'],                               rank: 5, change: -2, region: 'Bursa',            monthly_deliveries: 156 },
  { id: 6, name: 'Zeynep Arslan', avatar: 'ZA', deliveries: 1102, success_rate: 97.5, points: 5510, streak: 7,  badges: ['silver_courier', 'customer_favorite'],          rank: 6, change: 0,  region: 'Antalya',          monthly_deliveries: 143 },
  { id: 7, name: 'Can Öztürk',  avatar: 'CÖ', deliveries: 987,  success_rate: 94.8, points: 4935, streak: 0,  badges: ['bronze_courier'],                              rank: 7, change: 1,  region: 'Adana',            monthly_deliveries: 128 },
  { id: 8, name: 'Selin Yıldız', avatar: 'SY', deliveries: 854,  success_rate: 96.1, points: 4270, streak: 5,  badges: ['bronze_courier'],                              rank: 8, change: -1, region: 'Eskişehir',        monthly_deliveries: 109 },
];

const BADGE_CONFIG: any = {
  gold_courier:      { icon: '🥇', label: 'Altın Kurye',        color: '#F59E0B', desc: '100+ başarılı teslimat' },
  elite:             { icon: '👑', label: 'Elit Kurye',          color: '#8B5CF6', desc: '%98+ başarı oranı' },
  silver_courier:    { icon: '🥈', label: 'Gümüş Kurye',        color: '#94A3B8', desc: '50+ başarılı teslimat' },
  bronze_courier:    { icon: '🥉', label: 'Bronz Kurye',         color: '#CD7F32', desc: '25+ başarılı teslimat' },
  speed_demon:       { icon: '⚡', label: 'Hız Ustası',          color: '#06B6D4', desc: 'En hızlı teslimatçı' },
  perfect_week:      { icon: '✨', label: 'Mükemmel Hafta',      color: '#10B981', desc: '7 gün hatasız' },
  night_owl:         { icon: '🦉', label: 'Gece Kuşu',           color: '#6366F1', desc: 'Gece vardiyası şampiyonu' },
  marathon:          { icon: '🏃', label: 'Maraton',              color: '#F97316', desc: '500+ km aylık sürüş' },
  streak_master:     { icon: '🔥', label: 'Seri Ustası',         color: '#EF4444', desc: '20+ gün kesintisiz' },
  customer_favorite: { icon: '❤️', label: 'Müşteri Favorisi',   color: '#EC4899', desc: '%99 müşteri memnuniyeti' },
};

const ACHIEVEMENT_LIST = [
  { id: 'first_100',   icon: '📦', title: '100 Teslimat',         desc: '100 başarılı teslimat yap',              max: 100,  color: '#F59E0B' },
  { id: 'first_500',   icon: '🚀', title: '500 Teslimat',         desc: '500 başarılı teslimat yap',              max: 500,  color: '#8B5CF6' },
  { id: 'elite_rate',  icon: '👑', title: 'Elit Performans',      desc: '%98 üzeri başarı oranına ulaş',          max: 98,   color: '#06B6D4', unit: '%' },
  { id: 'streak_7',    icon: '🔥', title: '7 Günlük Seri',        desc: '7 gün kesintisiz teslimat',              max: 7,    color: '#EF4444', unit: ' gün' },
  { id: 'streak_30',   icon: '💎', title: '30 Günlük Seri',       desc: '30 gün kesintisiz teslimat',             max: 30,   color: '#3B82F6', unit: ' gün' },
  { id: 'speed_50',    icon: '⚡', title: 'Şimşek Teslimat',      desc: '50 teslimatı planlanandan erken tamamla', max: 50,   color: '#06B6D4' },
  { id: 'rating_5',    icon: '⭐', title: '100 Mükemmel Puan',    desc: '100 adet 5 yıldız al',                   max: 100,  color: '#F59E0B' },
  { id: 'night_20',    icon: '🌙', title: 'Gece Vardiyası',       desc: '20 gece vardiyası tamamla',              max: 20,   color: '#6366F1' },
];

function getMedalColor(rank: number) {
  if (rank === 1) return '#F59E0B';
  if (rank === 2) return '#94A3B8';
  if (rank === 3) return '#CD7F32';
  return 'var(--text-muted)';
}

export default function Gamification() {
  const [tab, setTab] = useState<'leaderboard' | 'achievements' | 'badges'>('leaderboard');
  const [selectedCourier, setSelectedCourier] = useState<any>(MOCK_COURIERS[0]);
  const [weekFilter, setWeekFilter] = useState<'weekly' | 'monthly' | 'alltime'>('monthly');

  const sorted = [...MOCK_COURIERS].sort((a, b) => b.points - a.points);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">🏆 Kurye Motivasyon Sistemi</div>
          <div className="topbar-subtitle">Rozet & başarım sistemi — haftalık sıralama ve performans takibi</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {(['weekly', 'monthly', 'alltime'] as const).map(f => (
            <button
              key={f}
              onClick={() => setWeekFilter(f)}
              className={weekFilter === f ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            >
              {f === 'weekly' ? 'Bu Hafta' : f === 'monthly' ? 'Bu Ay' : 'Tüm Zamanlar'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">

        {/* Top 3 Podium */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 16, marginBottom: 28, alignItems: 'end' }}>
          {/* 2. sıra */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(148,163,184,0.08), rgba(30,30,30,0.9))',
            border: '1px solid rgba(148,163,184,0.3)', borderRadius: 20, padding: '24px 20px',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
          }} onClick={() => setSelectedCourier(sorted[1])}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🥈</div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(148,163,184,0.15)', border: '2px solid #94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, fontWeight: 700, color: '#94A3B8' }}>
              {sorted[1]?.avatar}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{sorted[1]?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{sorted[1]?.region}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#94A3B8', fontFamily: "'Hanken Grotesk', sans-serif" }}>{sorted[1]?.points.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>puan</div>
          </div>

          {/* 1. sıra */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(30,30,30,0.9))',
            border: '2px solid rgba(245,158,11,0.5)', borderRadius: 20, padding: '32px 24px',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 0 40px rgba(245,158,11,0.15)',
          }} onClick={() => setSelectedCourier(sorted[0])}>
            <Crown size={32} color="#F59E0B" style={{ marginBottom: 8 }} />
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', border: '3px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24, fontWeight: 700, color: '#F59E0B', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
              {sorted[0]?.avatar}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: 'var(--text-primary)' }}>{sorted[0]?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{sorted[0]?.region}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B', fontFamily: "'Hanken Grotesk', sans-serif" }}>{sorted[0]?.points.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>puan</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
              {sorted[0]?.badges.map((b: string) => (
                <span key={b} title={BADGE_CONFIG[b]?.label} style={{ fontSize: 16 }}>{BADGE_CONFIG[b]?.icon}</span>
              ))}
            </div>
          </div>

          {/* 3. sıra */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(205,127,50,0.08), rgba(30,30,30,0.9))',
            border: '1px solid rgba(205,127,50,0.3)', borderRadius: 20, padding: '24px 20px',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
          }} onClick={() => setSelectedCourier(sorted[2])}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🥉</div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(205,127,50,0.1)', border: '2px solid #CD7F32', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, fontWeight: 700, color: '#CD7F32' }}>
              {sorted[2]?.avatar}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{sorted[2]?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{sorted[2]?.region}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#CD7F32', fontFamily: "'Hanken Grotesk', sans-serif" }}>{sorted[2]?.points.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>puan</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

          {/* Sol: Tab içerik */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-container)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
              {([['leaderboard', '🏆 Sıralama'], ['badges', '🎖️ Rozetler'], ['achievements', '🎯 Başarımlar']] as const).map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: tab === t ? 'var(--accent-orange)' : 'transparent',
                  color: tab === t ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  boxShadow: tab === t ? '0 4px 12px rgba(255,87,34,0.3)' : 'none',
                }}>{label}</button>
              ))}
            </div>

            {/* Sıralama Listesi */}
            {tab === 'leaderboard' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {sorted.map((c, idx) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCourier(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                      borderBottom: idx < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: selectedCourier?.id === c.id ? 'rgba(255,87,34,0.05)' : 'transparent',
                    }}
                  >
                    {/* Sıra */}
                    <div style={{ width: 36, textAlign: 'center' }}>
                      {idx < 3 ? (
                        <span style={{ fontSize: 22 }}>{['🥇', '🥈', '🥉'][idx]}</span>
                      ) : (
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace" }}>#{c.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${getMedalColor(c.rank)}20, ${getMedalColor(c.rank)}08)`,
                      border: `2px solid ${getMedalColor(c.rank)}60`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: getMedalColor(c.rank), fontSize: 14,
                    }}>{c.avatar}</div>

                    {/* İsim & Bölge */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.region}</div>
                    </div>

                    {/* Rozet önizleme */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {c.badges.slice(0, 3).map(b => (
                        <span key={b} title={BADGE_CONFIG[b]?.label} style={{ fontSize: 16 }}>{BADGE_CONFIG[b]?.icon}</span>
                      ))}
                      {c.badges.length > 3 && <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>+{c.badges.length - 3}</span>}
                    </div>

                    {/* Teslimat */}
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.monthly_deliveries} teslimat</div>
                      <div style={{ fontSize: 11, color: c.success_rate >= 98 ? 'var(--accent-green)' : 'var(--text-muted)' }}>%{c.success_rate} başarı</div>
                    </div>

                    {/* Puan */}
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: getMedalColor(c.rank), fontFamily: "'Hanken Grotesk', sans-serif" }}>
                        {c.points.toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', fontSize: 11, color: c.change > 0 ? 'var(--accent-green)' : c.change < 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                        {c.change > 0 && <><ChevronUp size={12} />+{c.change}</>}
                        {c.change < 0 && <><ChevronDown size={12} />{c.change}</>}
                        {c.change === 0 && '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rozetler */}
            {tab === 'badges' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {Object.entries(BADGE_CONFIG).map(([key, b]: [string, any]) => {
                  const earned = selectedCourier?.badges?.includes(key);
                  return (
                    <div key={key} style={{
                      background: earned
                        ? `linear-gradient(135deg, ${b.color}12, rgba(30,30,30,0.9))`
                        : 'linear-gradient(135deg, rgba(20,20,20,0.9), rgba(26,26,26,0.9))',
                      border: `1px solid ${earned ? b.color + '40' : 'rgba(46,46,46,1)'}`,
                      borderRadius: 16, padding: '20px', textAlign: 'center',
                      filter: earned ? 'none' : 'grayscale(0.8)',
                      opacity: earned ? 1 : 0.5,
                    }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>{b.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: earned ? b.color : 'var(--text-muted)', marginBottom: 6 }}>{b.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.desc}</div>
                      {earned && (
                        <div style={{ marginTop: 10, fontSize: 10, color: b.color, background: `${b.color}15`, padding: '3px 10px', borderRadius: 20, display: 'inline-block', fontFamily: "'Geist Mono', monospace" }}>
                          KAZANILDI ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Başarımlar */}
            {tab === 'achievements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ACHIEVEMENT_LIST.map(a => {
                  const current = Math.min(
                    a.id === 'elite_rate' ? selectedCourier?.success_rate || 0 :
                    a.id.includes('streak') ? selectedCourier?.streak || 0 :
                    selectedCourier?.deliveries || 0,
                    a.max
                  );
                  const pct = Math.round((current / a.max) * 100);
                  const done = pct >= 100;
                  return (
                    <div key={a.id} style={{
                      background: done ? `linear-gradient(135deg, ${a.color}10, rgba(30,30,30,0.9))` : 'linear-gradient(135deg, rgba(30,30,30,0.9), rgba(26,26,26,0.9))',
                      border: `1px solid ${done ? a.color + '40' : 'rgba(46,46,46,1)'}`,
                      borderRadius: 14, padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{ fontSize: 28, flexShrink: 0 }}>{a.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: done ? a.color : 'var(--text-primary)' }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace" }}>
                            {current}{a.unit || ''} / {a.max}{a.unit || ''}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{a.desc}</div>
                        <div style={{ height: 6, background: 'var(--surface-high)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: done ? a.color : `linear-gradient(90deg, ${a.color}80, ${a.color}40)`, borderRadius: 99, transition: 'width 1s ease', boxShadow: done ? `0 0 8px ${a.color}80` : 'none' }} />
                        </div>
                      </div>
                      {done && <div style={{ fontSize: 20 }}>✅</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sağ: Seçili Kurye Kartı */}
          {selectedCourier && (
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${getMedalColor(selectedCourier.rank)}20, ${getMedalColor(selectedCourier.rank)}08)`, border: `3px solid ${getMedalColor(selectedCourier.rank)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26, fontWeight: 800, color: getMedalColor(selectedCourier.rank), boxShadow: `0 0 20px ${getMedalColor(selectedCourier.rank)}40` }}>
                  {selectedCourier.avatar}
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{selectedCourier.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{selectedCourier.region}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {selectedCourier.badges.map((b: string) => (
                    <span key={b} title={BADGE_CONFIG[b]?.label} style={{ fontSize: 20 }}>{BADGE_CONFIG[b]?.icon}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Toplam Puan', value: selectedCourier.points.toLocaleString(), color: getMedalColor(selectedCourier.rank) },
                  { label: 'Sıralama', value: `#${selectedCourier.rank}`, color: 'var(--accent-orange-light)' },
                  { label: 'Başarı Oranı', value: `%${selectedCourier.success_rate}`, color: selectedCourier.success_rate >= 98 ? 'var(--accent-green)' : 'var(--accent-amber)' },
                  { label: 'Güncel Seri', value: `${selectedCourier.streak} gün 🔥`, color: 'var(--accent-red)' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--surface-high)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: m.color, fontFamily: "'Hanken Grotesk', sans-serif" }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: "'Geist Mono', monospace", textTransform: 'uppercase' }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Geist Mono', monospace" }}>Bu Ay</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <span>Toplam Teslimat</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCourier.monthly_deliveries}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <span>Toplam Teslimat (Tümü)</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCourier.deliveries}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>Kazanılan Rozet</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCourier.badges.length}</span>
                </div>
              </div>

              {/* Sonraki Rozet */}
              <div style={{ marginTop: 16, padding: '14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--accent-amber)', marginBottom: 8, fontWeight: 600, fontFamily: "'Geist Mono', monospace" }}>SONRAKİ HEDEF</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>💎</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Elmas Kurye</div>
                    <div style={{ height: 5, background: 'var(--surface-high)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((selectedCourier.deliveries / 2000) * 100, 100)}%`, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{selectedCourier.deliveries} / 2000 teslimat</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
