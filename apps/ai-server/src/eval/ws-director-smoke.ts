// P5 导演端到端冒烟：WS 连接 → POST /director/trigger 多次 → 收 world_event。
// 前置：ai-server :8787。
import { WebSocket } from "ws";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  let sessionOk = false;
  let events = 0;
  let lastBroadcast = "";

  const ws = new WebSocket("ws://127.0.0.1:8787/ws?fp=dsmoke");
  ws.on("message", (raw: Buffer) => {
    const msg = JSON.parse(raw.toString()) as { type: string; event?: { broadcast?: string } };
    if (msg.type === "session") sessionOk = true;
    if (msg.type === "world_event") {
      events++;
      lastBroadcast = msg.event?.broadcast ?? "";
    }
  });

  // 等 WS 连接 + session
  await sleep(1500);
  if (!sessionOk) {
    console.error("[dsmoke] FAIL: 未收到 session");
    process.exit(1);
  }
  console.log("[dsmoke] session ok，开始触发导演…");

  // 多次触发（30% none + 同类冷却，8 次应至少命中 1 次）
  for (let i = 0; i < 8; i++) {
    try {
      const res = await fetch("http://127.0.0.1:8787/director/trigger", { method: "POST" });
      const j = (await res.json()) as { fired: number };
      console.log(`[dsmoke] trigger #${i + 1}: fired=${j.fired}`);
    } catch (e) {
      console.error("[dsmoke] trigger error:", (e as Error).message);
    }
    await sleep(200);
  }
  await sleep(500); // 等最后的事件到达

  ws.close();
  console.log(`\n[dsmoke] RESULT events=${events}（8 次触发）`);
  if (events > 0) {
    console.log(`[dsmoke] PASS: 收到 ${events} 个世界事件，例：「${lastBroadcast}」`);
    process.exit(0);
  } else {
    console.error("[dsmoke] FAIL: 8 次触发均未收到事件（统计上应至少 1 次）");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[dsmoke] fatal:", e);
  process.exit(2);
});
