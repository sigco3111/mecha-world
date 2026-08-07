// GDD §33 DialoguePanel —— 对话面板（DOM overlay，打字机流式）
import { useEffect, useRef, useState } from "react";
import type { NpcId } from "@nexus/shared";
import { useDialogueStore } from "../stores/dialogueStore";

const NPC_META: Record<NpcId, { name: string; color: string; hint: string }> = {
  echo: { name: "Echo（灵核）", color: "#66ddff", hint: "和本核聊聊……吧？" },
  babs: { name: "老扳手（巴布斯）", color: "#ffaa00", hint: "小子，说事儿" },
  vera: { name: "薇拉", color: "#44ff88", hint: "情报和委托，都是生意" },
  jicha: { name: "叽喳", color: "#ff66cc", hint: "叮——！买点什么？" },
};

export function DialoguePanel() {
  const { status, activeNpc, messages, streamingText, lastUsage, offeredQuest, send, acceptQuest, rejectQuest, close } = useDialogueStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  if (status === "idle" || !activeNpc) return null;
  const meta = NPC_META[activeNpc];

  const submit = () => {
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <div
      style={{
        position: "fixed", left: "50%", bottom: 90, transform: "translateX(-50%)",
        width: 420, maxWidth: "92vw", zIndex: 1000,
        background: "rgba(10,15,30,0.95)", borderRadius: 14,
        border: `2px solid ${meta.color}`, boxShadow: `0 0 24px ${meta.color}44`,
        fontFamily: "monospace", color: "#fff", display: "flex", flexDirection: "column",
      }}
    >
      {/* 头部 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${meta.color}55` }}>
        <span style={{ color: meta.color, fontWeight: "bold" }}>{meta.name}</span>
        <span style={{ fontSize: 11, color: "#889" }}>
          {status === "connecting" && "连接中…"}
          {status === "streaming" && "对方输入中…"}
          {status === "fallback" && "灵核信号不稳定（离线模式）"}
          {status === "online" && (lastUsage ? `tokens ${lastUsage.tokensIn}/${lastUsage.tokensOut} · ¥${lastUsage.costCny.toFixed(4)}` : "在线")}
        </span>
        <button onClick={close} style={{ background: "none", border: "none", color: "#889", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {/* 消息区 */}
      <div style={{ height: 260, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && !streamingText && (
          <div style={{ color: "#667", fontSize: 12, textAlign: "center", marginTop: 40 }}>{meta.hint}</div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "player" ? "flex-end" : "flex-start",
              background: m.role === "player" ? "#1d3a5f" : m.role === "system" ? "#3a2a2a" : "#1a2a3a",
              border: m.role === "npc" ? `1px solid ${meta.color}44` : "none",
              borderRadius: 10, padding: "6px 10px", maxWidth: "85%",
              fontSize: 13, lineHeight: 1.6, color: m.role === "system" ? "#cc8888" : "#dde6ff",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
          </div>
        ))}
        {streamingText && (
          <div style={{ alignSelf: "flex-start", background: "#1a2a3a", border: `1px solid ${meta.color}44`, borderRadius: 10, padding: "6px 10px", maxWidth: "85%", fontSize: 13, lineHeight: 1.6, color: "#dde6ff", whiteSpace: "pre-wrap" }}>
            {streamingText}<span style={{ opacity: 0.6 }}>▌</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 动态任务确认卡（P4 §38.4）*/}
      {offeredQuest && (
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${meta.color}55`, background: "rgba(255,215,0,0.06)" }}>
          <div style={{ color: "#ffdd55", fontWeight: "bold", marginBottom: 4 }}>
            📋 {offeredQuest.title}
            <span style={{ fontSize: 10, color: "#998", marginLeft: 8 }}>
              {offeredQuest.difficulty} · {offeredQuest.type} · {offeredQuest.zone}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#ccb" }}>
            目标：{offeredQuest.objective.targetId} × {offeredQuest.objective.count}
          </div>
          <div style={{ fontSize: 12, color: "#ffb" }}>
            奖励：{offeredQuest.rewards.gold} 金币 · {offeredQuest.rewards.exp} 经验{offeredQuest.rewards.crystal ? ` · ${offeredQuest.rewards.crystal} 晶核` : ""}
          </div>
          <div style={{ fontSize: 11, color: "#998", margin: "4px 0 6px" }}>{offeredQuest.dialogue.offer}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={acceptQuest}
              style={{ flex: 1, background: "#ffdd55", color: "#0a0f1e", border: "none", borderRadius: 6, padding: "6px", fontWeight: "bold", cursor: "pointer", fontFamily: "monospace" }}
            >
              接受委托
            </button>
            <button
              onClick={rejectQuest}
              style={{ flex: 1, background: "transparent", color: "#889", border: "1px solid #445", borderRadius: 6, padding: "6px", cursor: "pointer", fontFamily: "monospace" }}
            >
              婉拒
            </button>
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: `1px solid ${meta.color}55` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder={status === "fallback" ? "离线模式：本地回复（重开面板重试连接）" : "输入…（Enter 发送）"}
          maxLength={300}
          style={{
            flex: 1, background: "#0d1526", border: `1px solid ${meta.color}55`, borderRadius: 8,
            color: "#fff", padding: "8px 10px", fontFamily: "monospace", fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={submit}
          style={{
            background: meta.color, color: "#0a0f1e", border: "none", borderRadius: 8,
            padding: "8px 14px", fontWeight: "bold", cursor: "pointer", fontFamily: "monospace",
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
