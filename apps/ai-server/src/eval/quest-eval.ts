// GDD §8.11/§27.4/§8.7 —— 动态任务评估：五级校验 + 生成（mock 模板）+ 任务链。
// 运行：npx tsx apps/ai-server/src/eval/quest-eval.ts
import { randomUUID } from "node:crypto";
import type { DynamicQuest, ZoneId } from "@nexus/shared";
import { validateQuest, type ValidationContext } from "../quest/validate";
import { generateQuest, templateQuest, shouldChain } from "../quest/generate";
import { __resetForTest } from "../memory/backend";

let pass = 0;
let fail = 0;
function check(cond: boolean, msg: string): void {
  if (cond) {
    pass++;
    console.log(`  ✅ ${msg}`);
  } else {
    fail++;
    console.log(`  ❌ ${msg}`);
  }
}
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n▶ ${name}`);
  try {
    await fn();
  } catch (e) {
    fail++;
    console.log(`  💥 threw: ${(e as Error).message}`);
  }
}

const CTX: ValidationContext = {
  playerLevel: 5,
  unlockedZones: ["plains", "crystal"] as readonly ZoneId[],
  recentTitles: [],
};

// 合法基准 quest（reward gold 600 ∈ [480,780] normal Lv5）
function validQuest(overrides?: Partial<DynamicQuest>): DynamicQuest {
  return {
    id: randomUUID(),
    source: "vera",
    chain: { seq: 1, total: 1 },
    title: "废料场巡检",
    type: "kill",
    zone: "plains",
    objective: { targetId: "crawler", count: 5 },
    rewards: { gold: 600, crystal: 0, exp: 600, items: [] },
    dialogue: { offer: "去废料场清理爬虫", progress: "继续努力", complete: "干得漂亮" },
    difficulty: "normal",
    expiresAt: Date.now() + 86_400_000,
    ...overrides,
  };
}

// ── 1. 合法 quest 通过 ────────────────────────────────────────
await test("合法 quest 通过五级校验", async () => {
  const v = validateQuest(validQuest(), CTX);
  check(v.ok, `合法 quest 通过（${v.reason ?? ""}）`);
});

// ── 2. v2 completable（区域/目标/击杀数）──────────────────────
await test("v2 completable 区域+目标+击杀数", async () => {
  const v1 = validateQuest(validQuest({ zone: "lava" }), CTX);
  check(!v1.ok && v1.failedAt === "v2_completable", "未解锁区域 lava 拒");
  const v2 = validateQuest(validQuest({ objective: { targetId: "silent", count: 5 } }), CTX);
  check(!v2.ok && v2.failedAt === "v2_completable", "silent 不在 plains 白名单拒");
  const v3 = validateQuest(validQuest({ objective: { targetId: "crawler", count: 15 } }), CTX);
  check(!v3.ok && v3.failedAt === "v2_completable", "击杀数 15 越界 [3,7] 拒（v2）");
  const v4 = validateQuest(validQuest({ objective: { targetId: "crawler", count: 3 } }), CTX);
  check(v4.ok, "击杀数 3 在 [3,7] 通过");
});

// ── 3. v3 reward（金币区间 + crystal 限制）───────────────────
await test("v3 reward 金币区间 + crystal 限制", async () => {
  const v1 = validateQuest(validQuest({ rewards: { gold: 100, crystal: 0, exp: 100, items: [] } }), CTX);
  check(!v1.ok && v1.failedAt === "v3_reward", "金币 100 低于下限拒");
  const v2 = validateQuest(validQuest({ rewards: { gold: 9999, crystal: 0, exp: 100, items: [] } }), CTX);
  check(!v2.ok && v2.failedAt === "v3_reward", "金币 9999 超上限拒");
  const v3 = validateQuest(validQuest({ rewards: { gold: 600, crystal: 5, exp: 600, items: [] } }), CTX);
  check(!v3.ok && v3.failedAt === "v3_reward", "crystal 非第 3 环拒");
  const v4 = validateQuest(
    validQuest({ chain: { seq: 3, total: 3 }, rewards: { gold: 600, crystal: 5, exp: 600, items: [] } }),
    CTX
  );
  check(v4.ok, "第 3 环 crystal 5 通过");
});

// ── 4. v4 text（占位符 + 敏感词）──────────────────────────────
await test("v4 text 占位符 + 敏感词", async () => {
  const v1 = validateQuest(validQuest({ title: "{{task_name}}" }), CTX);
  check(!v1.ok && v1.failedAt === "v4_text", "标题含占位符拒");
  const v2 = validateQuest(validQuest({ dialogue: { offer: "他妈的爬虫", progress: "x", complete: "y" } }), CTX);
  check(!v2.ok && v2.failedAt === "v4_text", "对话含敏感词拒");
  const v3 = validateQuest(validQuest({ title: "x".repeat(20) }), CTX);
  check(!v3.ok && v3.failedAt === "v4_text" || v3.failedAt === "v1_schema", "标题过长拒（schema 或 v4）");
});

// ── 5. v5 dedup（相似标题）───────────────────────────────────
await test("v5 dedup 相似标题拦截", async () => {
  const ctx: ValidationContext = { ...CTX, recentTitles: ["废料场巡检"] };
  const v = validateQuest(validQuest(), ctx);
  check(!v.ok && v.failedAt === "v5_dedup", "与近期标题完全相同 → 拒");
  const ctx2: ValidationContext = { ...CTX, recentTitles: ["完全不相关的标题xyz"] };
  const v2 = validateQuest(validQuest(), ctx2);
  check(v2.ok, "与近期标题差异大 → 通过");
});

// ── 6. mock 生成模板通过校验（出口标准：≥90%）────────────────
await test("generateQuest mock 模板通过校验", async () => {
  __resetForTest();
  const r = await generateQuest({
    npcId: "vera",
    playerLevel: 5,
    mecha: "hound",
    style: { melee: 0.5, ranged: 0.5 },
    completed: 0,
    rate: 1,
    zones: ["plains"],
    worldState: "白天/晴/扳手镇",
    recentTitles: [],
    rewardBase: 600,
  });
  check(r.quest !== null, "生成 quest 非空");
  check(r.source === "template", "mock 下用模板兜底");
  check(r.validation?.ok === true, `模板通过五级校验（${r.validation?.reason ?? ""}）`);
});

// ── 7. templateQuest 各等级通过校验 ──────────────────────────
await test("templateQuest 多等级/区域均通过校验", async () => {
  const cases: { lv: number; zones: ZoneId[] }[] = [
    { lv: 3, zones: ["plains"] },
    { lv: 8, zones: ["plains", "crystal"] },
    { lv: 15, zones: ["plains", "crystal", "lava"] },
    { lv: 20, zones: ["plains", "crystal", "lava", "abyss"] },
  ];
  for (const c of cases) {
    const t = templateQuest({
      npcId: "vera",
      playerLevel: c.lv,
      mecha: "hound",
      style: { melee: 0.5, ranged: 0.5 },
      completed: 0,
      rate: 1,
      zones: c.zones,
      worldState: "",
      recentTitles: [],
      rewardBase: 120 * c.lv,
    });
    const v = validateQuest(t, {
      playerLevel: c.lv,
      unlockedZones: c.zones,
      recentTitles: [],
    });
    check(v.ok, `Lv${c.lv} ${c.zones[c.zones.length - 1]} 模板通过校验`);
  }
});

// ── 8. 任务链触发概率（§8.7 25%）─────────────────────────────
await test("shouldChain 25% 触发概率", async () => {
  check(shouldChain(1, () => 0.1), "rng 0.1 < 0.25 → 触发");
  check(!shouldChain(1, () => 0.5), "rng 0.5 ≥ 0.25 → 不触发");
  check(!shouldChain(3, () => 0.1), "seq 3 已终环 → 不触发");
});

console.log(`\n════════════════════════════════`);
console.log(`  动态任务评估：${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════`);
process.exit(fail > 0 ? 1 : 0);
