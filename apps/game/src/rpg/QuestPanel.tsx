import { useRPGStore } from './rpgStore'

export function QuestPanel({ onClose }: { onClose: () => void }) {
  const { quests, claimQuest, updateQuest } = useRPGStore()

  const statusLabels: Record<string, { text: string; color: string }> = {
    available: { text: '수락 가능', color: '#888899' },
    active: { text: '진행 중', color: '#44aaff' },
    completed: { text: '보상 대기', color: '#44ff88' },
    claimed: { text: '완료', color: '#666666' },
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '90%', maxWidth: 550, maxHeight: '85vh',
        background: 'linear-gradient(135deg, rgba(20,25,50,0.98), rgba(10,12,30,0.98))',
        borderRadius: 16, border: '1px solid rgba(255,200,0,0.3)',
        boxShadow: '0 0 40px rgba(255,200,0,0.15)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(255,200,0,0.15)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#ffcc00', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>
            ⚡ 퀘스트 목록
          </span>
          <span onClick={onClose} style={{
            color: '#ff6666', cursor: 'pointer', fontSize: 20, padding: '0 8px',
          }}>✕</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {quests.map(q => {
            const st = statusLabels[q.status]
            return (
              <div key={q.id} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                border: `1px solid ${st.color}33`, padding: 14, marginBottom: 10,
                transition: 'border-color 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>{q.title}</span>
                  <span style={{ color: st.color, fontSize: 11, padding: '2px 8px', border: `1px solid ${st.color}55`, borderRadius: 4 }}>
                    {st.text}
                  </span>
                </div>
                <div style={{ color: '#8899aa', fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
                  {q.description}
                </div>
                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(q.current / q.required) * 100}%`, height: '100%',
                      background: q.status === 'completed' ? '#44ff88' : '#44aaff',
                      borderRadius: 3, transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ color: '#aabbcc', fontSize: 11, fontFamily: 'monospace' }}>
                    {q.current}/{q.required}
                  </span>
                </div>
                {/* Rewards */}
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#ffcc44' }}>
                  <span>💰 {q.reward.gold}</span>
                  <span>⭐ {q.reward.exp}</span>
                  {q.reward.items && <span>🎁 특별 보상</span>}
                </div>
                {/* Action button */}
                {q.status === 'available' && (
                  <button onClick={() => updateQuest(q.id, 0)} style={actionBtn('#44aaff')}>
                    퀘스트 수락
                  </button>
                )}
                {q.status === 'completed' && (
                  <button onClick={() => claimQuest(q.id)} style={actionBtn('#44ff88')}>
                    보상 받기
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function actionBtn(color: string): React.CSSProperties {
  return {
    width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
    background: color + '22', border: `1px solid ${color}`, color: color,
    fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace',
  }
}
