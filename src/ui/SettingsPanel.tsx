import { useState } from 'react'
import { useGameStore } from '../stores/gameStore'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { setWeather, setTimeOfDay, world } = useGameStore()
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high')
  const [bloom, setBloom] = useState(true)
  const [shadows, setShadows] = useState(true)
  const [sfxVolume, setSfxVolume] = useState(80)

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.9)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '90%', maxWidth: 450,
        background: 'linear-gradient(135deg, rgba(20,25,50,0.98), rgba(10,12,30,0.98))',
        borderRadius: 16, border: '1px solid rgba(0,255,255,0.3)',
        padding: 0,
      }}>
        <div style={{
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,255,255,0.15)',
        }}>
          <span style={{ color: '#00ffff', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>
            ⚙️ 设置
          </span>
          <span onClick={onClose} style={{ color: '#ff6666', cursor: 'pointer', fontSize: 20 }}>✕</span>
        </div>

        <div style={{ padding: 20 }}>
          {/* Quality */}
          <Section title="画面质量">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['low', 'medium', 'high'] as const).map(q => (
                <button key={q} onClick={() => setQuality(q)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
                  background: quality === q ? 'rgba(0,255,255,0.15)' : 'transparent',
                  border: `1px solid ${quality === q ? '#00ffff' : '#333'}`,
                  color: quality === q ? '#00ffff' : '#666',
                  fontSize: 12, fontWeight: 'bold',
                }}>
                  {q === 'low' ? '流畅' : q === 'medium' ? '平衡' : '极致'}
                </button>
              ))}
            </div>
          </Section>

          {/* Toggles */}
          <Section title="特效">
            <Toggle label="泛光 (Bloom)" checked={bloom} onChange={() => setBloom(!bloom)} />
            <Toggle label="阴影" checked={shadows} onChange={() => setShadows(!shadows)} />
          </Section>

          {/* Audio */}
          <Section title="音效">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔊</span>
              <input
                type="range" min="0" max="100" value={sfxVolume}
                onChange={(e) => setSfxVolume(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: '#88aaff', fontSize: 12, width: 36 }}>{sfxVolume}%</span>
            </div>
          </Section>

          {/* Weather control (debug/fun) */}
          <Section title="天气">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['clear', 'rain', 'storm', 'snow', 'sandstorm'] as const).map(w => (
                <button key={w} onClick={() => setWeather(w)} style={{
                  padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                  background: world.weather === w ? 'rgba(0,255,200,0.15)' : 'transparent',
                  border: `1px solid ${world.weather === w ? '#00ffcc' : '#333'}`,
                  color: world.weather === w ? '#00ffcc' : '#666',
                  fontSize: 11,
                }}>
                  {w === 'clear' ? '☀️ 晴' : w === 'rain' ? '🌧️ 雨' : w === 'storm' ? '⛈️ 暴' : w === 'snow' ? '❄️ 雪' : '🌪️ 沙'}
                </button>
              ))}
            </div>
          </Section>

          {/* Time slider */}
          <Section title="时间">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>{world.timeOfDay < 6 || world.timeOfDay > 18 ? '🌙' : '☀️'}</span>
              <input
                type="range" min="0" max="24" step="0.5" value={world.timeOfDay}
                onChange={(e) => setTimeOfDay(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: '#88aaff', fontSize: 12, width: 44 }}>
                {Math.floor(world.timeOfDay).toString().padStart(2, '0')}:00
              </span>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ color: '#88aaff', fontSize: 12, marginBottom: 8, fontFamily: 'monospace' }}>{title}</div>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', cursor: 'pointer' }}>
      <span style={{ color: '#aabbcc', fontSize: 13 }}>{label}</span>
      <div style={{
        width: 40, height: 22, borderRadius: 11, position: 'relative',
        background: checked ? '#00ff8844' : '#333333',
        border: `1px solid ${checked ? '#00ff88' : '#555'}`,
        transition: 'all 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#00ff88' : '#888',
          transition: 'all 0.2s',
        }} />
      </div>
    </div>
  )
}
