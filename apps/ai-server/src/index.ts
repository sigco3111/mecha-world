// ai-server 入口（GDD §30 index.ts）—— P5：director 循环 + budget metrics + 手动触发端点
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
// 先读本目录 .env，再读仓库根 .env 兜底（先加载者优先，不覆盖已有 key）
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: [path.resolve(here, "../.env"), path.resolve(here, "../../../.env")] });
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { handleConnection, getDirectorSessions } from "./gateway/wsGateway";
import { initKv, getKv } from "./memory/backend";
import { ingestLore } from "./rag/ingest";
import { startDirector, triggerDirectorOnce } from "./agents/director";
import { getBudgetMetrics } from "./router/budget";

const PORT = Number(process.env.PORT ?? 8787);
const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
});

await app.register(cors, {
  origin: (process.env.CORS_ORIGIN ?? "http://127.0.0.1:5173").split(","),
});
await app.register(websocket);

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

app.get("/metrics", async () => {
  const kv = getKv();
  const sessions = await getDirectorSessions();
  const budget = await getBudgetMetrics();
  return {
    kv: { backend: kv.name, ready: kv.ready },
    lore: { ingested: true },
    provider: process.env.LLM_PRIMARY_API_KEY ? "primary" : process.env.LLM_BACKUP_API_KEY ? "backup" : "mock",
    sessions: sessions.length,
    budget,
  };
});

// 手动触发一次导演事件（开发/测试/验收用；正常由后台 20-40min 循环）
app.post("/director/trigger", async () => {
  const fired = await triggerDirectorOnce(getDirectorSessions);
  return { fired, ts: Date.now() };
});

app.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    const fp = (req.query as { fp?: string }).fp ?? "anonymous";
    handleConnection(socket, fp);
  });
});

app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(async () => {
    app.log.info(`ai-server listening on :${PORT}`);
    await initKv();
    const kv = getKv();
    app.log.info({ kv: kv.name, ready: kv.ready }, `[kv] backend=${kv.name}`);
    const lore = await ingestLore();
    app.log.info(
      { count: lore.count, backend: lore.backend, ms: lore.elapsedMs },
      `[lore] ${lore.count} chunks · ${lore.backend}`
    );
    startDirector(getDirectorSessions);
    app.log.info("[director] 后台循环已启动（每 20-40min 唤醒）");
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
