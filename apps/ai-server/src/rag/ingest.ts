// GDD §8.5 / §39.3 —— Lore 入库脚本：启动时调用（幂等），也可单独 tsx 运行。
// 合并第 2 章主 lore + 50 条数据残片（§6.2/§16）。
import { LORE_CHUNKS } from "./loreData";
import { LORE_SHARDS } from "./loreShards";
import { getLoreStore } from "./loreStore";

const ALL_LORE = [...LORE_CHUNKS, ...LORE_SHARDS];

export interface IngestResult {
  count: number;
  backend: string;
  elapsedMs: number;
}

/** 幂等入库：已索引则跳过 */
export async function ingestLore(): Promise<IngestResult> {
  const store = getLoreStore();
  if (store.ready) {
    return { count: store.size, backend: store.embedderName, elapsedMs: 0 };
  }
  const t0 = Date.now();
  await store.ingest(ALL_LORE);
  return {
    count: store.size,
    backend: store.embedderName,
    elapsedMs: Date.now() - t0,
  };
}

// 直接运行：tsx src/rag/ingest.ts
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("rag/ingest.ts");
if (isMain) {
  ingestLore()
    .then((r) => {
      console.log(`[lore ingest] ${r.count} chunks · ${r.backend} · ${r.elapsedMs}ms`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[lore ingest] failed:", err);
      process.exit(1);
    });
}
