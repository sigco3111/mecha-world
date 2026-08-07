// GDD §8.5 —— 共享分词器（embedding 兜底 + BM25 共用）。
// 中文按单字 + 邻接双字；英文/数字按词。全部小写化。

/** 拆分为词/字 token 数组 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];

  // 英文/数字词
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z0-9]+/g) ?? [];
  out.push(...words);

  // 中文字符序列
  const cjkRanges = /[一-鿿㐀-䶿]/;
  const chars = Array.from(text).filter((ch) => cjkRanges.test(ch));
  for (let i = 0; i < chars.length; i++) {
    out.push(chars[i]);
    if (i < chars.length - 1) out.push(chars[i] + chars[i + 1]);
  }

  return out;
}

/** 去重保留顺序的 token 集（用于命中判定） */
export function tokenizeUnique(text: string): Set<string> {
  return new Set(tokenize(text));
}
