// WS 端到端冒烟：连接 → session → 发 lore 问题 → 收流式 token + done。
// 前置：ai-server 在 :8787 运行。
import { WebSocket } from "ws";

const ws = new WebSocket("ws://127.0.0.1:8787/ws?fp=smoketest");
let tokens = "";
let doneReceived = false;
let sessionOk = false;

ws.on("open", () => console.log("[smoke] connected"));
ws.on("message", (raw: Buffer) => {
  const msg = JSON.parse(raw.toString()) as { type: string; [k: string]: unknown };
  switch (msg.type) {
    case "session":
      sessionOk = true;
      console.log(`[smoke] session ok (${String(msg.sessionId).slice(0, 8)})`);
      ws.send(
        JSON.stringify({
          type: "chat",
          sessionId: msg.sessionId as string,
          npcId: "echo",
          text: "大静默是什么时候的事？",
        })
      );
      break;
    case "token":
      tokens += msg.delta as string;
      break;
    case "done":
      doneReceived = true;
      console.log("[smoke] done · usage:", JSON.stringify(msg.usage));
      console.log(`[smoke] reply: ${tokens.slice(0, 90)}`);
      break;
    case "error":
      if (msg.message !== "__ping__") console.log("[smoke] error:", msg.code, msg.message);
      break;
    default:
      console.log("[smoke] msg:", msg.type);
  }
});
ws.on("error", (e) => {
  console.error("[smoke] ws error:", e.message);
  process.exit(1);
});

setTimeout(() => {
  ws.close();
  const ok = sessionOk && doneReceived && tokens.length > 0;
  console.log(`\n[smoke] RESULT session=${sessionOk} done=${doneReceived} chars=${tokens.length}`);
  if (!ok) console.error("[smoke] FAIL");
  process.exit(ok ? 0 : 1);
}, 9000);
