// GDD §9.1 开发者面板 —— LLM 延迟/Token/成本实时监控（?dev=1 开启）
import { useEffect, useState } from "react";

interface Metrics {
  kv: { backend: string; ready: boolean };
  lore: { ingested: boolean };
  provider: string;
  sessions: number;
  budget: {
    todayCostCny: number;
    dailyBudgetCny: number;
    remainingCny: number;
    tokensToday: number;
    exceeded: boolean;
    utilization: number;
  };
}

function httpBase(): string {
  const ws =
    (import.meta as { env?: Record<string, string> }).env?.VITE_AI_SERVER_URL ?? "ws://127.0.0.1:8787";
  return ws.replace(/^ws/, "http");
}

export function DevDashboard({ onClose }: { onClose: () => void }) {
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`${httpBase()}/metrics`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as Metrics;
        if (!stop) {
          setM(json);
          setErr(null);
        }
      } catch (e) {
        if (!stop) setErr((e as Error).message);
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const util = m ? Math.round(m.budget.utilization * 100) : 0;
  const barColor = m?.budget.exceeded ? "#ff4444" : util > 80 ? "#ffaa00" : "#44ff88";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 90,
        right: 18,
        zIndex: 1200,
        width: 260,
        background: "rgba(10,15,30,0.95)",
        border: "1px solid #00ffff",
        borderRadius: 10,
        padding: 12,
        fontFamily: "monospace",
        color: "#dde6ff",
        fontSize: 11,
        boxShadow: "0 0 16px rgba(0,255,255,0.3)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ color: "#00ffff" }}>🔬 AI 成本看板</strong>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#889", cursor: "pointer" }}>
          ✕
        </button>
      </div>
      {err && <div style={{ color: "#ff6666" }}>后端离线：{err}</div>}
      {!m && !err && <div>加载中…</div>}
      {m && (
        <>
          <div style={{ marginBottom: 6 }}>Provider: <span style={{ color: "#ffaa00" }}>{m.provider}</span></div>
          <div style={{ marginBottom: 6 }}>KV: {m.kv.backend} {m.kv.ready ? "✓" : "✗"} · 온라인 {m.sessions}</div>
          <div style={{ marginBottom: 4 }}>
            今日成本：¥{m.budget.todayCostCny.toFixed(4)} / {m.budget.dailyBudgetCny}
          </div>
          <div style={{ background: "#1a2a3a", borderRadius: 4, height: 8, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ width: `${util}%`, height: "100%", background: barColor, transition: "width 0.5s" }} />
          </div>
          <div style={{ marginBottom: 6, color: "#998" }}>
            剩余 ¥{m.budget.remainingCny.toFixed(2)} · Token {m.budget.tokensToday}
          </div>
          {m.budget.exceeded && (
            <div style={{ color: "#ff6666", fontWeight: "bold" }}>⚠ 预算熔断，AI 已降级</div>
          )}
        </>
      )}
    </div>
  );
}
