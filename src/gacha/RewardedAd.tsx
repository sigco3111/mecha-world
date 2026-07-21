import { useState, useEffect } from 'react'
import { useRPGStore } from '../rpg/rpgStore'

export function RewardedAdTrigger({ onReward, label = '看广告领奖励' }: { onReward?: () => void; label?: string }) {
  const [showAd, setShowAd] = useState(false)
  const [adProgress, setAdProgress] = useState(0)
  const [rewarded, setRewarded] = useState(false)
  const { addGems, addGold } = useRPGStore()

  const startAd = () => {
    setShowAd(true)
    setAdProgress(0)
    setRewarded(false)
  }

  useEffect(() => {
    if (!showAd || rewarded) return
    const timer = setInterval(() => {
      setAdProgress(p => {
        if (p >= 100) {
          clearInterval(timer)
          // Give reward
          const rewardGems = 10
          addGems(rewardGems)
          setRewarded(true)
          onReward?.()
          return 100
        }
        return p + 100 / 50 // 5 seconds total
      })
    }, 100)
    return () => clearInterval(timer)
  }, [showAd, rewarded])

  if (!showAd) {
    return (
      <button onClick={startAd} style={{
        padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
        background: 'linear-gradient(90deg, rgba(255,200,0,0.2), rgba(255,100,0,0.1))',
        border: '1px solid #ffaa00', color: '#ffcc44',
        fontSize: 12, fontWeight: 'bold',
      }}>
        📺 {label}
      </button>
    )
  }

  if (rewarded) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 250,
        background: 'rgba(0,0,0,0.95)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ color: '#44ff88', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
            获得 +10 💎
          </div>
          <button
            onClick={() => setShowAd(false)}
            style={{
              padding: '10px 30px', borderRadius: 8, cursor: 'pointer',
              background: '#44ff8833', border: '1px solid #44ff88',
              color: '#44ff88', fontSize: 14, fontWeight: 'bold',
              marginTop: 16,
            }}
          >
            收下
          </button>
        </div>
      </div>
    )
  }

  // Ad playing
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.95)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Fake ad content */}
      <div style={{
        width: '80%', maxWidth: 400, aspectRatio: '16/9',
        background: 'linear-gradient(135deg, #1a1a3a, #2a2a5a)',
        borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', position: 'relative',
        border: '2px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: 40 }}>🎮</div>
        <div style={{ color: '#88aaff', fontSize: 14, marginTop: 8 }}>下载更多好玩游戏</div>
        <div style={{ color: '#556677', fontSize: 11, marginTop: 4 }}>— 模拟广告 —</div>
        {/* Ad progress bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.1)', borderRadius: 2,
        }}>
          <div style={{
            width: `${adProgress}%`, height: '100%',
            background: '#ffaa00', borderRadius: 2, transition: 'width 0.1s linear',
          }} />
        </div>
      </div>
      <div style={{ color: '#8899aa', fontSize: 12, marginTop: 16 }}>
        {Math.ceil((100 - adProgress) / 20)}秒后获得奖励...
      </div>
    </div>
  )
}
