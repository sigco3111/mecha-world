// GDD §35.5 —— BM25（k1=1.5, b=0.75），lore tags 加权 ×1.2。
// 加权方式：索引时 tag token 的有效频次按 tagWeight 计入 TF，自然提升 tag 命中相关度。
import { tokenize } from "./tokenize";

export interface Bm25Doc {
  id: string;
  text: string;
  tags?: string[];
}

export interface Bm25Hit {
  id: string;
  score: number;
}

export class BM25 {
  private indexed: { id: string; tf: Map<string, number>; len: number }[] = [];
  private df = new Map<string, number>();
  private avgLen = 0;
  private N = 0;

  constructor(
    private k1 = 1.5,
    private b = 0.75,
    private tagWeight = 1.2
  ) {}

  index(docs: Bm25Doc[]): void {
    this.indexed = [];
    this.df = new Map();
    let totalLen = 0;
    for (const d of docs) {
      const tf = new Map<string, number>();
      const add = (text: string, weight: number) => {
        for (const tok of tokenize(text)) tf.set(tok, (tf.get(tok) ?? 0) + weight);
      };
      add(d.text, 1);
      if (d.tags && d.tags.length > 0) add(d.tags.join(" "), this.tagWeight);
      let len = 0;
      for (const v of tf.values()) len += v;
      totalLen += len;
      for (const tok of tf.keys()) this.df.set(tok, (this.df.get(tok) ?? 0) + 1);
      this.indexed.push({ id: d.id, tf, len });
    }
    this.N = this.indexed.length;
    this.avgLen = this.N > 0 ? totalLen / this.N : 0;
  }

  get size(): number {
    return this.N;
  }

  search(query: string, limit?: number): Bm25Hit[] {
    const qTokens = tokenize(query);
    if (qTokens.length === 0 || this.N === 0) return [];
    const hits: Bm25Hit[] = [];
    for (const doc of this.indexed) {
      let score = 0;
      for (const q of qTokens) {
        const f = doc.tf.get(q);
        if (!f) continue;
        const df = this.df.get(q) ?? 0;
        const idf = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
        const denom = f + this.k1 * (1 - this.b + this.b * (this.avgLen > 0 ? doc.len / this.avgLen : 0));
        score += (idf * (f * (this.k1 + 1))) / (denom || 1);
      }
      if (score > 0) hits.push({ id: doc.id, score });
    }
    hits.sort((a, b) => b.score - a.score);
    return typeof limit === "number" ? hits.slice(0, limit) : hits;
  }
}
