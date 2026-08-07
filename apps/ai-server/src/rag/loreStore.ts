// GDD §35.5 —— Lore 向量存储 + BM25 + RRF 混合检索。
// 内存实现（启动时 ingest），Qdrant 留作可选后端（后续 P5 接入）。
import { cosine, getEmbedder } from "./embeddings";
import { BM25 } from "./bm25";
import type { LoreChunk } from "@nexus/shared";

const TOP_K_PER = 8; // §35.5：向量 top8 + BM25 top8
const RRF_K = 60; // 融合常数
const W_VEC = 0.55; // §8.5 向量权重
const W_BM25 = 0.45; // §8.5 BM25 权重
const DEFAULT_THRESHOLD = 0.62; // §8.5 相似度阈值（真模型）
// fallback TF embedder 向量语义密度低，需放宽阈值（否则几乎不命中）；
// 0.28 经验值：保留事实召回，同时让无关 query（充值/营业时间/真实姓名）拒答。
const FALLBACK_THRESHOLD = 0.28;

export class LoreStore {
  private chunks: LoreChunk[] = [];
  private vecs: number[][] = [];
  private readonly bm25 = new BM25();
  private indexed = false;
  embedderName = "none";

  get ready(): boolean {
    return this.indexed;
  }
  get size(): number {
    return this.chunks.length;
  }

  async ingest(chunks: LoreChunk[]): Promise<void> {
    const embedder = getEmbedder();
    this.embedderName = embedder.name;
    // 文本 + tags 一起 embed（tags 提升语义命中）
    this.vecs = await embedder.embed(chunks.map((c) => `${c.text}\n${c.tags.join(" ")}`));
    this.chunks = chunks;
    this.bm25.index(chunks.map((c) => ({ id: c.id, text: c.text, tags: c.tags })));
    this.indexed = true;
  }

  /** §35.5 混合检索：向量 top8 ×0.55 + BM25 top8 ×0.45 → RRF 融合 → topK → 阈值过滤 */
  async retrieve(query: string, topK = 5): Promise<LoreChunk[]> {
    if (!this.indexed || this.chunks.length === 0) return [];
    const embedder = getEmbedder();
    const [qVec] = await embedder.embed([query]);

    // 1. 向量余弦相似度（全量，用于阈值判断）
    const cos = new Map<number, number>();
    for (let i = 0; i < this.vecs.length; i++) cos.set(i, cosine(qVec, this.vecs[i]));
    const vecRanked = [...cos.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_K_PER);

    // 2. BM25 top8
    const bm25Hits = this.bm25.search(query, TOP_K_PER);
    const idToIndex = new Map(this.chunks.map((c, i) => [c.id, i]));

    // 3. RRF 融合
    const rrf = new Map<number, number>();
    for (let rank = 0; rank < vecRanked.length; rank++) {
      const i = vecRanked[rank][0];
      rrf.set(i, (rrf.get(i) ?? 0) + (W_VEC / (RRF_K + rank + 1)));
    }
    for (let rank = 0; rank < bm25Hits.length; rank++) {
      const i = idToIndex.get(bm25Hits[rank].id);
      if (i !== undefined) rrf.set(i, (rrf.get(i) ?? 0) + (W_BM25 / (RRF_K + rank + 1)));
    }

    // 4. 排序取 topK
    const ranked = [...rrf.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK);

    // 5. 阈值过滤（fallback embedder 放宽）
    const threshold = embedder.name.startsWith("fallback") ? FALLBACK_THRESHOLD : DEFAULT_THRESHOLD;
    const out: LoreChunk[] = [];
    for (const [i] of ranked) {
      if ((cos.get(i) ?? 0) >= threshold) out.push(this.chunks[i]);
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// 单例
// ---------------------------------------------------------------------------
let _store: LoreStore | null = null;
export function getLoreStore(): LoreStore {
  if (!_store) _store = new LoreStore();
  return _store;
}
