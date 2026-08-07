// GDD §9.1 —— AI 导演世界事件 toast（屏幕顶部，可忽略）
import { useWorldEventStore } from "../stores/worldEventStore";

const KIND_LABEL: Record<string, string> = {
  caravan_attack: "🚚 商队遇袭",
  crystal_surge: "💎 晶簇爆发",
  swarm_tide: "🌀 虫群潮汐",
  bounty_target: "🎯 悬赏目标",
};

export function DirectorToast() {
  const current = useWorldEventStore((s) => s.current);
  const dismiss = useWorldEventStore((s) => s.dismiss);
  if (!current) return null;
  const label = KIND_LABEL[current.kind] ?? "📡 世界事件";

  return (
    <div
      style={{
        position: "fixed",
        top: 70,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1100,
        background: "rgba(10,15,30,0.95)",
        border: "1px solid #ffaa00",
        borderRadius: 10,
        padding: "10px 16px",
        maxWidth: 420,
        boxShadow: "0 0 20px rgba(255,170,0,0.4)",
        fontFamily: "monospace",
        color: "#ffdd55",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{label}</strong>
        <button
          onClick={dismiss}
          style={{ background: "none", border: "none", color: "#889", cursor: "pointer", fontSize: 16 }}
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#ccb" }}>{current.broadcast}</div>
      <div style={{ fontSize: 11, color: "#998" }}>
        {current.zone} · {current.durationMin}min · 奖励 {current.rewardPack.gold} 金币 ·{" "}
        {current.spawns.reduce((s, sp) => s + sp.count, 0)} 敌
      </div>
    </div>
  );
}
