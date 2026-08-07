// GDD §8.5 —— Embedding 提供商：OpenAI 兼容端点（真模型）+ 内存 TF-Hash 向量（兜底）。
// 配置 EMBEDDING_API_KEY 用真模型；否则用进程内 TF 哈希向量（L2 归一化），余弦相似度仍可用。
import { request } from "undici";
import { tokenize } from "./tokenize";

const FALLBACK_DIM = 256;

export interface EmbeddingProvider {
  readonly name: string;
  readonly dim: number;
  embed(texts: string[]): Promise<number[][]>;
}

/** 余弦相似度（向量需已归一化；未归一化则点积/模长积） */
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---------------------------------------------------------------------------
// 内存兜底：特征哈希（FNV-1a）→ 固定维度稀疏向量，TF 加权，L2 归一化
// ---------------------------------------------------------------------------
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function embedFallback(text: string, dim: number): number[] {
  const vec = new Array<number>(dim).fill(0);
  for (const tok of tokenize(text)) vec[fnv1a(tok) % dim] += 1;
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) vec[i] /= norm;
  return vec;
}

class FallbackEmbedder implements EmbeddingProvider {
  readonly name = "fallback-tf";
  readonly dim: number;
  constructor(dim = FALLBACK_DIM) {
    this.dim = dim;
  }
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => embedFallback(t, this.dim));
  }
}

// ---------------------------------------------------------------------------
// 远程：OpenAI 兼容 /embeddings
// ---------------------------------------------------------------------------
class RemoteEmbedder implements EmbeddingProvider {
  readonly name: string;
  readonly dim: number;
  constructor(
    name: string,
    private baseUrl: string,
    private apiKey: string,
    private model: string,
    dim: number
  ) {
    this.name = name;
    this.dim = dim;
  }
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await request(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (res.statusCode !== 200) {
      throw new Error(`embedding HTTP ${res.statusCode}`);
    }
    const json = (await res.body.json()) as { data: { index: number; embedding: number[] }[] };
    return json.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}

// ---------------------------------------------------------------------------
// 工厂（单例）
// ---------------------------------------------------------------------------
let _embedder: EmbeddingProvider | null = null;

export function getEmbedder(): EmbeddingProvider {
  if (_embedder) return _embedder;
  const key = process.env.EMBEDDING_API_KEY;
  const base = process.env.EMBEDDING_BASE_URL;
  const model = process.env.EMBEDDING_MODEL;
  const dim = Number(process.env.EMBEDDING_DIM ?? FALLBACK_DIM);
  if (key && base && model) {
    _embedder = new RemoteEmbedder(`remote:${model}`, base, key, model, dim);
  } else {
    _embedder = new FallbackEmbedder();
  }
  return _embedder;
}

/** 测试钩子 */
export function __resetEmbedderForTest(p?: EmbeddingProvider): void {
  _embedder = p ?? null;
}
