import { useState } from 'react'
import { useRPGStore } from '../rpg/rpgStore'

const dailyRewards = [
  { day: 1, icon: '💰', name: '500골드', type: 'gold', amount: 500 },
  { day: 2, icon: '💎', name: '20다이아', type: 'gems', amount: 20 },
  { day: 3, icon: '🔩', name: '메카 조각×5', type: 'item', amount: 5 },
  { day: 4, icon: '💰', name: '1000골드', type: 'gold', amount: 1000 },
  { day: 5, icon: '💎', name: '50다이아', type: 'gems', amount: 50 },
  { day: 6, icon: '🔋', name: '희귀에너지코어', type: 'item', amount: 1 },
  { day: 7, icon: '🎁', name: '전설상자', type: 'gems', amount: 200 },
]

export function DailyLogin({ onClose }: { onClose: () => void }) {
  const { addGold, addGems } = useRPGStore()
  // 用本地日期字符串(YYYY-MM-DD)作为key（toISOString 是 UTC，东八区 0-8 点会错一일차）
  const localKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const todayKey = localKey(new Date())
  // 连续签到일차数：昨일차领过则 +1，断签/完成7일차周期则重置为 1 并清空已领记录，今일차已领则保持
  const [streak, _setStreak] = useState<number>(() => {
    const prev = parseInt(localStorage.getItem('loginStreak') || '0')
    const last = localStorage.getItem('lastClaimDate')
    if (!last) return 1
    const diffDays = Math.round((new Date(todayKey).getTime() - new Date(last).getTime()) / 86400000)
    if (diffDays === 0) return Math.min(7, Math.max(1, prev))
    if (diffDays === 1 && prev < 7) return prev + 1
    return 1
  })
  const [claimed, setClaimed] = useState<number[]>(() => {
    // 与 streak 同步：断签或新周期时清空已领记录
    if (streak === 1 && localStorage.getItem('lastClaimDate') &&
        localStorage.getItem(`claimed_${todayKey}`) !== '1') {
      localStorage.setItem('claimedDays', '[]')
      return []
    }
    const saved = localStorage.getItem('claimedDays')
    return saved ? JSON.parse(saved) : []
  })
  const today = streak
  // 今일차是否已领
  const claimedToday = localStorage.getItem(`claimed_${todayKey}`) === '1'

  const claim = (day: number) => {
    if (claimed.includes(day)) return
    if (day !== today) return
    if (claimedToday) return
    const reward = dailyRewards[day - 1]
    if (reward.type === 'gold') addGold(reward.amount)
    else if (reward.type === 'gems') addGems(reward.amount)
    const newClaimed = [...claimed, day]
    setClaimed(newClaimed)
    localStorage.setItem('claimedDays', JSON.stringify(newClaimed))
    localStorage.setItem('loginStreak', String(streak))
    localStorage.setItem('lastClaimDate', todayKey)
    localStorage.setItem(`claimed_${todayKey}`, '1')
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.9)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '92%', maxWidth: 550,
        background: 'linear-gradient(135deg, rgba(30,25,50,0.98), rgba(15,12,30,0.98))',
        borderRadius: 16, border: '1px solid rgba(255,200,100,0.3)',
        boxShadow: '0 0 40px rgba(255,200,100,0.15)',
      }}>
        <div style={{
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,200,100,0.15)',
        }}>
          <span style={{ color: '#ffcc66', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>
            📅 매일 출석
          </span>
          <span onClick={onClose} style={{ color: '#ff6666', cursor: 'pointer', fontSize: 20 }}>✕</span>
        </div>

        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {dailyRewards.map((reward, i) => {
            const day = i + 1
            const isToday = day === today
            const isClaimed = claimed.includes(day)
            const canClaim = isToday && !isClaimed
            return (
              <div key={day} onClick={() => canClaim && claim(day)} style={{
                padding: 10, borderRadius: 10, textAlign: 'center', cursor: canClaim ? 'pointer' : 'default',
                background: isClaimed
                  ? 'rgba(0,100,0,0.15)'
                  : isToday
                    ? 'linear-gradient(135deg, rgba(255,200,100,0.2), rgba(255,150,50,0.1))'
                    : 'rgba(255,255,255,0.03)',
                border: isClaimed
                  ? '1px solid #44aa44'
                  : isToday
                    ? '2px solid #ffcc66'
                    : '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
              }}>
                {isToday && !isClaimed && (
                  <div style={{
                    position: 'absolute', top: -6, right: -4,
                    background: '#ff4444', color: '#fff', fontSize: 9,
                    padding: '1px 6px', borderRadius: 8, fontWeight: 'bold',
                    animation: 'pulse 1s infinite',
                  }}>!</div>
                )}
                <div style={{ fontSize: 10, color: '#8899aa', marginBottom: 4 }}> {day}일차</div>
                <div style={{ fontSize: 24, marginBottom: 4, filter: isClaimed ? 'grayscale(1) opacity(0.5)' : 'none' }}>
                  {reward.icon}
                </div>
                <div style={{ fontSize: 9, color: isClaimed ? '#556655' : '#aabbcc' }}>
                  {reward.name}
                </div>
                {isClaimed && (
                  <div style={{ fontSize: 16, position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)' }}>✓</div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ padding: '0 16px 16px', textAlign: 'center', color: '#667788', fontSize: 11 }}>
          7일 연속 출석하면 전설 상자를 받아요!
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      </div>
    </div>
  )
}
