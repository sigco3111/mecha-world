// GDD §33 DialoguePanel —— 对话面板（DOM overlay，打字机流式）
import { useEffect, useRef, useState } from "react";
import type { NpcId } from "@nexus/shared";
import { useDialogueStore } from "../stores/dialogueStore";

const NPC_META: Record<NpcId, { name: string; color: string; hint: string }> = {
  echo: { name: "Echo (영혼 코어)", color: "#66ddff", hint: "나랑 얘기해 볼래...?" },
  babs: { name: "바브스 (정비공)", color: "#ffaa00", hint: "꼬마, 무슨 일이야?" },
  vera: { name: "베라", color: "#44ff88", hint: "정보도 의뢰도 모두 거래야" },
  jicha: { name: "지차", color: "#ff66cc", hint: "딩! 뭘 살까요?" },
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
          {status === "connecting" && "연결 중..."}
          {status === "streaming" && "입력 중..."}
          {status === "fallback" && "정적 배포: 로컬 대화 모드"}
          {status === "online" && (lastUsage ? `tokens ${lastUsage.tokensIn}/${lastUsage.tokensOut} · ¥${lastUsage.costCny.toFixed(4)}` : "온라인")}
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

      {/* 动态퀘스트确认卡（P4 §38.4）*/}
      {offeredQuest && (
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${meta.color}55`, background: "rgba(255,215,0,0.06)" }}>
          <div style={{ color: "#ffdd55", fontWeight: "bold", marginBottom: 4 }}>
            📋 {offeredQuest.title}
            <span style={{ fontSize: 10, color: "#998", marginLeft: 8 }}>
              {offeredQuest.difficulty} · {offeredQuest.type} · {offeredQuest.zone}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#ccb" }}>
            목표：{offeredQuest.objective.targetId} × {offeredQuest.objective.count}
          </div>
          <div style={{ fontSize: 12, color: "#ffb" }}>
            보상：{offeredQuest.rewards.gold} 골드 · {offeredQuest.rewards.exp} 경험치{offeredQuest.rewards.crystal ? ` · ${offeredQuest.rewards.crystal} 수정 코어` : ""}
          </div>
          <div style={{ fontSize: 11, color: "#998", margin: "4px 0 6px" }}>{offeredQuest.dialogue.offer}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={acceptQuest}
              style={{ flex: 1, background: "#ffdd55", color: "#0a0f1e", border: "none", borderRadius: 6, padding: "6px", fontWeight: "bold", cursor: "pointer", fontFamily: "monospace" }}
            >
              의뢰 수락
            </button>
            <button
              onClick={rejectQuest}
              style={{ flex: 1, background: "transparent", color: "#889", border: "1px solid #445", borderRadius: 6, padding: "6px", cursor: "pointer", fontFamily: "monospace" }}
            >
              거절
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
          placeholder={status === "fallback" ? "메시지 입력... (로컬 대화)" : "입력... (Enter 전송)"}
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
          전송
        </button>
      </div>
    </div>
  );
}
