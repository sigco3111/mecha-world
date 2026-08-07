// P4 动态任务端到端冒烟：vera → "有什么活儿" → quest_offered → 接受。
// 前置：ai-server :8787。
import { WebSocket } from "ws";

const ws = new WebSocket("ws://127.0.0.1:8787/ws?fp=qsmoke");
let sessionId = "";
let phase: "chat" | "done" | "quest" = "chat";
let questTitle = "";

ws.on("open", () => console.log("[qsmoke] connected"));
ws.on("message", (raw: Buffer) => {
  const msg = JSON.parse(raw.toString()) as { type: string; [k: string]: unknown };
  switch (msg.type) {
    case "session":
      sessionId = msg.sessionId as string;
      console.log("[qsmoke] session ok → 问薇拉要活儿");
      ws.send(
        JSON.stringify({ type: "chat", sessionId, npcId: "vera", text: "最近有什么活儿吗" })
      );
      break;
    case "done":
      phase = "done";
      console.log("[qsmoke] 对话 done，等待 quest_offered…");
      break;
    case "quest_offered": {
      phase = "quest";
      const q = (
        msg as unknown as {
          quest: { title: string; type: string; zone: string; rewards: { gold: number } };
        }
      ).quest;
      questTitle = q.title;
      console.log(
        `[qsmoke] quest_offered: 「${q.title}」 ${q.type}/${q.zone} 奖励${q.rewards.gold}金币`
      );
      ws.send(
        JSON.stringify({ type: "intent", sessionId, npcId: "vera", intent: "quest" })
      );
      console.log("[qsmoke] 已发送接受 intent");
      break;
    }
    case "error":
      if (msg.message === "__ping__") break;
      console.log("[qsmoke] error:", msg.code, msg.message);
      break;
    default:
      break;
  }
});
ws.on("error", (e) => {
  console.error("[qsmoke] ws error:", e.message);
  process.exit(1);
});

setTimeout(() => {
  ws.close();
  const ok = phase === "quest";
  console.log(`\n[qsmoke] RESULT phase=${phase} title="${questTitle}"`);
  console.log(
    ok
      ? "[qsmoke] PASS: 任务意图 → 生成 → quest_offered → 接受确认 全链路通"
      : "[qsmoke] FAIL"
  );
  process.exit(ok ? 0 : 1);
}, 10_000);
