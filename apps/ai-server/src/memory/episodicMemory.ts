// GDD §8.4 第2层 —— 情节记忆：向量检索（相关度 × 时间衰减）+ 摘要入库。
// 持久化走 KV 后端（Redis 持久 / 内存重启丢）；向量现场计算（避免维度耦合，条目少时成本可控）。
import { getKv } from "./backend";
import { cosine, getEmbedder } from "../rag/embeddings";
import type { NpcId } from "@nexus/shared";
import type { EpisodicEntry } from "./summarize";

export interface EpisodicRecord {
  entry: EpisodicEntry;
  ts: number;
}

const PREFIX = "episodic";
const MAX_RECORDS = 50; // 每 (playerId,npcId) 上限
const key = (playerId: string, npcId: NpcId) => `${PREFIX}:${playerId}:${npcId}`;

function readRecords(raw: string | null): EpisodicRecord[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r): r is EpisodicRecord =>
        typeof r === "object" && r !== null &&
        typeof (r as EpisodicRecord).ts === "number" && !!((r as EpisodicRecord).entry)
    );
  } catch {
    return [];
  }
}

/** 入库：importance < 3 丢弃（§A.7） */
export async function storeEpisodic(
  playerId: string,
  npcId: NpcId,
  entry: EpisodicEntry
): Promise<void> {
  if (entry.importance < 3) return;
  const existing = readRecords(await getKv().get(key(playerId, npcId)));
  existing.push({ entry, ts: Date.now() });
  const trimmed = existing.slice(-MAX_RECORDS);
  await getKv().set(key(playerId, npcId), JSON.stringify(trimmed));
}

/** §8.4 检索：相关度（cosine）× 时间衰减，topK */
export async function searchEpisodic(
  playerId: string,
  npcId: NpcId,
  query: string,
  topK = 3
): Promise<EpisodicRecord[]> {
  const arr = readRecords(await getKv().get(key(playerId, npcId)));
  if (arr.length === 0) return [];

  const embedder = getEmbedder();
  const [qVec] = await embedder.embed([query]);
  const sums = arr.map((r) => r.entry.summary);
  const vecs = await embedder.embed(sums);

  const now = Date.now();
  const scored = arr.map((rec, i) => {
    const cos = cosine(qVec, vecs[i]);
    const ageHours = (now - rec.ts) / 3_600_000;
    const decay = Math.exp(-ageHours / 240); // ~10 天半衰期
    return { rec, score: cos * (0.5 + 0.5 * decay) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.rec);
}

/** 测试/告别：清空某 NPC 情节记忆 */
export async function clearEpisodic(playerId: string, npcId: NpcId): Promise<void> {
  await getKv().del(key(playerId, npcId));
}
