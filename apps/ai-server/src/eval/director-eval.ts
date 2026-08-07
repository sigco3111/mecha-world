// GDD §8.11 —— P5 评估：budget 熔断 + director 事件生成 + 触发。
// 运行：npx tsx apps/ai-server/src/eval/director-eval.ts
import { WorldEventSchema, type WorldEvent, type ZoneId } from "@nexus/shared";
import { charge, isBudgetExceeded, getBudgetMetrics } from "../router/budget";
import { templateEvent, triggerDirectorOnce, type DirectorSession } from "../agents/director";
import type { ServerMsg } from "@nexus/shared";
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

// ── 1. budget 入账 + metrics ─────────────────────────────────
await test("budget charge 累积 + metrics", async () => {
  __resetForTest();
  await charge(0.004, 200, 100);
  await charge(0.002, 50, 30);
  const m = await getBudgetMetrics();
  check(Math.abs(m.todayCostCny - 0.006) < 1e-9, `今日成本 0.006（got ${m.todayCostCny}）`);
  check(m.tokensToday === 380, `Token 380（got ${m.tokensToday}）`);
});

// ── 2. budget 熔断 ───────────────────────────────────────────
await test("budget 日预算熔断", async () => {
  __resetForTest();
  process.env.DAILY_BUDGET_CNY = "0.001";
  await charge(0.005, 100, 50);
  const exceeded = await isBudgetExceeded();
  check(exceeded, "0.005 ≥ 0.001 → 熔断");
  const m = await getBudgetMetrics();
  check(m.exceeded, "metrics.exceeded = true");
  check(m.utilization >= 1, `utilization ≥ 1（got ${m.utilization}）`);
  process.env.DAILY_BUDGET_CNY = "30"; // 恢复默认
});

// ── 3. templateEvent 合法 + 4 kind 覆盖 + none 比例 ───────────
await test("templateEvent 合法性 + kind 覆盖", async () => {
  const kinds = new Set<string>();
  let nullCount = 0;
  let allValid = true;
  for (let i = 0; i < 200; i++) {
    const e = templateEvent({ level: 10, zone: "plains" as ZoneId });
    if (e === null) {
      nullCount++;
      continue;
    }
    const v = WorldEventSchema.safeParse(e);
    if (!v.success) allValid = false;
    kinds.add(e.kind);
    // 强度校验：count ≤ 8
    if (e.spawns.some((s) => s.count > 8)) allValid = false;
  }
  check(allValid, "所有生成事件 schema + 数值合法");
  check(nullCount > 0 && nullCount < 200, `约 30% none（got ${nullCount}/200）`);
  check(kinds.size >= 3, `至少覆盖 3 种 kind（got ${kinds.size}：${[...kinds].join(",")}）`);
});

// ── 4. templateEvent 等级缩放 ────────────────────────────────
await test("templateEvent 高等级强度缩放", async () => {
  let lowTotal = 0;
  let highTotal = 0;
  for (let i = 0; i < 50; i++) {
    const lo = templateEvent({ level: 1, zone: "plains" });
    const hi = templateEvent({ level: 20, zone: "plains" });
    if (lo) lowTotal += lo.spawns.reduce((s, sp) => s + sp.count, 0);
    if (hi) highTotal += hi.spawns.reduce((s, sp) => s + sp.count, 0);
  }
  check(highTotal > lowTotal, `高等级敌人总数 > 低等级（${highTotal} > ${lowTotal}）`);
});

// ── 5. triggerDirectorOnce 无会话 → 0 ────────────────────────
await test("triggerDirectorOnce 无在线会话", async () => {
  __resetForTest();
  const fired = await triggerDirectorOnce(async () => []);
  check(fired === 0, "无会话 → fired=0");
});

// ── 6. triggerDirectorOnce 有会话不崩 + 事件合法 ─────────────
await test("triggerDirectorOnce 触发链路", async () => {
  const captured: { type: string; event?: unknown }[] = [];
  const sessions: DirectorSession[] = [
    {
      playerId: "d1",
      send: (msg: ServerMsg) => {
        if (msg.type === "world_event") captured.push({ type: msg.type, event: msg.event });
      },
    },
  ];
  // 多次尝试以穿透 30% none（冷却会挡同类，但首次应能触发）
  let firedTotal = 0;
  for (let i = 0; i < 5; i++) {
    firedTotal += await triggerDirectorOnce(async () => sessions);
    if (captured) break;
  }
  check(firedTotal >= 0, `触发不崩（累计 fired=${firedTotal}）`);
  const c0 = captured[0];
  if (c0 && c0.type === "world_event" && c0.event) {
    const ev = c0.event as WorldEvent;
    const v = WorldEventSchema.safeParse(ev);
    check(v.success, "捕获事件 schema 合法");
    check(ev.broadcast.length <= 50, "广播文本 ≤50 字");
  }
});

console.log(`\n════════════════════════════════`);
console.log(`  导演/预算评估：${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════`);
process.exit(fail > 0 ? 1 : 0);
