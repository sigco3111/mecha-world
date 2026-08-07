// GDD §35.6 —— 动态任务五级校验（schema/completable/reward/text/dedup）。
// 全部通过才落库；任一失败附原因供 generate-and-refine 重试。
import { DynamicQuestSchema, TARGET_WHITELIST, type DynamicQuest, type ZoneId } from "@nexus/shared";
import { tokenize } from "../rag/tokenize";

export interface ValidationContext {
  playerLevel: number;
  unlockedZones: readonly ZoneId[];
  recentTitles: readonly string[]; // 近 10 条已完成动态任务标题（dedup）
}

export interface ValidationResult {
  ok: boolean;
  failedAt?: "v1_schema" | "v2_completable" | "v3_reward" | "v4_text" | "v5_dedup";
  reason?: string;
  quest?: DynamicQuest; // v1 通过后的规范 quest
}

const DIFF_COEF: Record<DynamicQuest["difficulty"], number> = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.3,
};

// §8.9/§23 敏感词（任务文本不得包含）
const SENSITIVE_WORDS = ["他妈", "操你", "fuck", "shit", "傻逼", "草泥马", "去死"];

export function validateQuest(q: unknown, ctx: ValidationContext): ValidationResult {
  // v1 schema
  const parsed = DynamicQuestSchema.safeParse(q);
  if (!parsed.success) {
    return { ok: false, failedAt: "v1_schema", reason: parsed.error.issues[0]?.message ?? "schema invalid" };
  }
  const quest = parsed.data;

  // v2 completable
  const zoneTargets = TARGET_WHITELIST[quest.zone] ?? [];
  if (!zoneTargets.includes(quest.objective.targetId)) {
    return { ok: false, failedAt: "v2_completable", reason: `targetId ${quest.objective.targetId} 不在 ${quest.zone} 白名单` };
  }
  if (!ctx.unlockedZones.includes(quest.zone)) {
    return { ok: false, failedAt: "v2_completable", reason: `区域 ${quest.zone} 未解锁` };
  }
  if (quest.type === "kill") {
    const lo = Math.max(1, ctx.playerLevel - 2);
    const hi = Math.min(20, ctx.playerLevel + 2);
    if (quest.objective.count < lo || quest.objective.count > hi) {
      return { ok: false, failedAt: "v2_completable", reason: `击杀数 ${quest.objective.count} 越界 [${lo},${hi}]` };
    }
  }

  // v3 reward
  const coef = DIFF_COEF[quest.difficulty];
  const goldLo = Math.floor(120 * ctx.playerLevel * 0.8 * coef);
  const goldHi = Math.floor(120 * ctx.playerLevel * 1.3 * coef);
  if (quest.rewards.gold < goldLo || quest.rewards.gold > goldHi) {
    return { ok: false, failedAt: "v3_reward", reason: `金币 ${quest.rewards.gold} 越界 [${goldLo},${goldHi}]` };
  }
  if (quest.rewards.crystal > 0 && !(quest.chain.seq === 3 && quest.rewards.crystal <= 8)) {
    return { ok: false, failedAt: "v3_reward", reason: "crystal 仅允许第 3 环且 ≤8" };
  }

  // v4 text
  if (quest.title.includes("{{") || quest.dialogue.offer.includes("{{") || quest.dialogue.progress.includes("{{") || quest.dialogue.complete.includes("{{")) {
    return { ok: false, failedAt: "v4_text", reason: "含未填充占位符 {{" };
  }
  const allText = `${quest.title} ${quest.dialogue.offer} ${quest.dialogue.progress} ${quest.dialogue.complete}`;
  for (const w of SENSITIVE_WORDS) {
    if (allText.includes(w)) {
      return { ok: false, failedAt: "v4_text", reason: `含敏感词 ${w}` };
    }
  }

  // v5 dedup（与近期标题 Jaccard 相似度 <0.7）
  for (const prev of ctx.recentTitles) {
    if (jaccard(quest.title, prev) >= 0.7) {
      return { ok: false, failedAt: "v5_dedup", reason: `与近期「${prev}」相似度≥0.7` };
    }
  }

  return { ok: true, quest };
}

function jaccard(a: string, b: string): number {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}
