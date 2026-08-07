// GDD §35.5 —— 对外检索入口（chatTurn / loreNode 调用）。
import { getLoreStore } from "./loreStore";
import type { LoreChunk } from "@nexus/shared";

export interface RetrieveResult {
  chunks: LoreChunk[];
  /** 是否命中（空数组视为「无相关设定」，NPC 应拒答以防编造） */
  hit: boolean;
  backend: string;
}

export async function retrieveLore(query: string, topK = 5): Promise<RetrieveResult> {
  const store = getLoreStore();
  if (!store.ready) {
    return { chunks: [], hit: false, backend: "not-ingested" };
  }
  const chunks = await store.retrieve(query, topK);
  return {
    chunks,
    hit: chunks.length > 0,
    backend: store.embedderName,
  };
}
