import { useState } from 'react'
import { useRPGStore } from '../rpg/rpgStore'

const dailyRewards = [
  { day: 1, icon: '💰', name: '500金币', type: 'gold', amount: 500 },
  { day: 2, icon: '💎', name: '20钻石', type: 'gems', amount: 20 },
  { day: 3, icon: '🔩', name: '机甲碎片×5', type: 'item', amount: 5 },
  { day: 4, icon: '💰', name: '1000金币', type: 'gold', amount: 1000 },
  { day: 5, icon: '💎', name: '50钻石', type: 'gems', amount: 50 },
  { day: 6, icon: '🔋', name: '稀有能量核心', type: 'item', amount: 1 },
  { day: 7, icon: '🎁', name: '传说宝箱', type: 'gems', amount: 200 },
]

export function DailyLogin({ onClose }: { onClose: () => void }) {
  const { addGold, addGems } = useRPGStore()
  const [claimed, setClaimed] = useState<number[]>([])
  const today = ((new Date().getDate() - 1) % 7) + 1

  const claim = (day: number) => {
    if (claimed.includes(day)) return
    const reward = dailyRewards[day - 1]
    if (reward.type === 'gold') addGold(reward.amount)
    else if (reward.type === 'gems') addGems(reward.amount)
    setClaimed([...claimed, day])
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
            📅 每日签到
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
                <div style={{ fontSize: 10, color: '#8899aa', marginBottom: 4 }}>第{day}天</div>
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
          连续签到7天可获得传说宝箱！
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      </div>
    </div>
  )
}
