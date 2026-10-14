import { useState, useEffect } from 'react'

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [tip, setTip] = useState(0)

  const tips = [
    '팁: Shift를 눌러 돌진하면 적에게 빠르게 접근할 수 있어요',
    '팁: J 근접 공격으로 적의 공격을 끊을 수 있어요',
    '팁: 적을 처치하면 장비가 나올 수 있어요',
    '팁: 90회 뽑기에서 전설 메카를 확정 획득해요',
    '팁: 지형마다 자원과 적이 달라요',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setTimeout(onDone, 300)
          return 100
        }
        return p + 2
      })
    }, 30)

    const tipInterval = setInterval(() => {
      setTip(t => (t + 1) % tips.length)
    }, 2000)

    return () => {
      clearInterval(interval)
      clearInterval(tipInterval)
    }
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: 'linear-gradient(135deg, #0a0a2a, #1a0a3a)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Animated mecha silhouette */}
      <div style={{
        fontSize: 60, marginBottom: 20,
        animation: 'mechaFloat 2s ease-in-out infinite',
        filter: 'drop-shadow(0 0 20px rgba(0,255,255,0.5))',
      }}>
        🤖
      </div>

      {/* Title */}
      <div style={{
        color: '#00ffff', fontSize: 32, fontWeight: 'bold',
        fontFamily: 'monospace', letterSpacing: 4, marginBottom: 8,
        textShadow: '0 0 20px rgba(0,255,255,0.6)',
      }}>
        MECHA WORLD
      </div>
      <div style={{ color: '#4466aa', fontSize: 12, marginBottom: 40, fontFamily: 'monospace' }}>
        메카 월드
      </div>

      {/* Progress bar */}
      <div style={{
        width: '70%', maxWidth: 300, height: 4,
        background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`, height: '100%',
          background: 'linear-gradient(90deg, #00ffff, #0088ff)',
          borderRadius: 2, transition: 'width 0.1s',
          boxShadow: '0 0 10px rgba(0,255,255,0.5)',
        }} />
      </div>
      <div style={{ color: '#446688', fontSize: 11, marginTop: 8, fontFamily: 'monospace' }}>
        {progress < 100 ? `로딩 중... ${progress}%` : '준비 완료!'}
      </div>

      {/* Tips */}
      <div style={{
        position: 'absolute', bottom: 40, color: '#556688',
        fontSize: 12, textAlign: 'center', padding: '0 20px',
        animation: 'fadeIn 0.5s',
      }}>
        {tips[tip]}
      </div>

      <style>{`
        @keyframes mechaFloat {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-10px) }
        }
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
      `}</style>
    </div>
  )
}
