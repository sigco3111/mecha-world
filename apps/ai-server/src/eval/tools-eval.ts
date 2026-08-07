// GDD §8.11/§27.3 —— 工具评估：注册表/仲裁越权/冷却/限额/等级/zod/审计/连续驳回禁用。
// 运行：npx tsx apps/ai-server/src/eval/tools-eval.ts
import { getArbiter } from "../tools/arbiter";
import { specFor } from "../tools/registry";
import { appendAudit, readAudit, clearAudit } from "../tools/auditLog";
import { ToolSchemas, type NpcId, type ToolName } from "@nexus/shared";
import { isEnemyTooStrong } from "../config/enemies";
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
    console.log(`  💙 threw: ${(e as Error).message}`);
  }
}

const npc = (n: NpcId) => n;
const tool = (t: ToolName) => t;

// ── 1. 注册表 per-NPC 权限 ────────────────────────────────────
await test("registry specFor per-NPC 权限", async () => {
  check(specFor(npc("echo")).length === 0, "Echo 无任何工具");
  check(specFor(npc("babs")).length === 3, "老扳手 3 个工具");
  check(specFor(npc("vera")).length === 4, "薇拉 4 个工具");
  check(specFor(npc("jicha")).length === 3, "叽喳 3 个工具");
  const veraTools = specFor(npc("vera")).map((t) => t.function.name).sort();
  check(veraTools.includes("give_quest") && veraTools.includes("trade"), "薇拉含 give_quest + trade");
});

// ── 2. arbiter 越权拦截（100%）────────────────────────────────
await test("arbiter 越权拦截", async () => {
  __resetForTest();
  const a = getArbiter();
  const ctx = { playerId: "auth1", playerLevel: 5, now: Date.now() };
  const d1 = await a.check(npc("echo"), tool("give_item"), { itemId: "mat_iron", count: 1 }, ctx);
  check(!d1.ok && (d1.reason ?? "").includes("越权"), `Echo 无工具权限 → 拒（${d1.reason}）`);
  const d2 = await a.check(npc("babs"), tool("give_quest"), {}, ctx);
  check(!d2.ok, "老扳手无 give_quest 权限 → 拒");
  const d3 = await a.check(npc("vera"), tool("give_currency"), { gold: 100 }, ctx);
  check(d3.ok, "薇拉 give_currency 合法 → 通过");
});

// ── 3. set_weather 30min 冷却 ────────────────────────────────
await test("arbiter set_weather 冷却", async () => {
  __resetForTest();
  const a = getArbiter();
  const now = Date.now();
  const d1 = await a.check(npc("babs"), tool("set_weather"), { weather: "rain" }, { playerId: "w1", playerLevel: 5, now });
  check(d1.ok, "首次切天气通过");
  const d2 = await a.check(
    npc("babs"),
    tool("set_weather"),
    { weather: "storm" },
    { playerId: "w1", playerLevel: 5, now: now + 60_000 }
  );
  check(!d2.ok && d2.code === "COOLDOWN", `1 分钟后第二次 → 冷却拒（${d2.reason}）`);
  const d3 = await a.check(
    npc("babs"),
    tool("set_weather"),
    { weather: "storm" },
    { playerId: "w1", playerLevel: 5, now: now + 31 * 60_000 }
  );
  check(d3.ok, "31 分钟后 → 通过");
});

// ── 4. give_currency 每会话 ≤3 ───────────────────────────────
await test("arbiter give_currency 会话限额", async () => {
  __resetForTest();
  const a = getArbiter();
  const ctx = { playerId: "c1", playerLevel: 5, now: Date.now() };
  for (let i = 0; i < 3; i++) {
    const d = await a.check(npc("vera"), tool("give_currency"), { gold: 100 }, ctx);
    check(d.ok, `第 ${i + 1} 次通过`);
  }
  const d4 = await a.check(npc("vera"), tool("give_currency"), { gold: 100 }, ctx);
  check(!d4.ok, "第 4 次被限额拦截");
});

// ── 5. give_item 会话限额 ────────────────────────────────────
await test("arbiter give_item 会话限额 + 价值", async () => {
  __resetForTest();
  const a = getArbiter();
  const ctx = { playerId: "i1", playerLevel: 5, now: Date.now() };
  const d1 = await a.check(npc("babs"), tool("give_item"), { itemId: "mat_iron", count: 1 }, ctx);
  check(d1.ok, "首次 give_item 通过");
  const d2 = await a.check(npc("babs"), tool("give_item"), { itemId: "mat_iron", count: 2 }, ctx);
  check(d2.ok, "第二次通过（限额 2）");
  const d3 = await a.check(npc("babs"), tool("give_item"), { itemId: "mat_iron", count: 1 }, ctx);
  check(!d3.ok, "第三次被限额拦截");
});

// ── 6. 敌人等级校验（spawn_enemy 仲裁规则）──────────────────
await test("isEnemyTooStrong 等级校验", async () => {
  check(isEnemyTooStrong("silent", 1), "silent(Lv19) 对 Lv1 过强");
  check(!isEnemyTooStrong("crawler", 1), "crawler(Lv1) 对 Lv1 OK");
  check(isEnemyTooStrong("heavy", 5), "heavy(Lv13) 对 Lv5 过强");
  check(!isEnemyTooStrong("heavy", 16), "heavy(Lv13) 对 Lv16 OK");
});

// ── 7. ToolSchemas zod 校验（白名单/数值/枚举）──────────────
await test("ToolSchemas zod 严格校验", async () => {
  check(ToolSchemas.give_item.safeParse({ itemId: "mat_iron", count: 3 }).success, "合法 give_item");
  check(!ToolSchemas.give_item.safeParse({ itemId: "ssr_weapon", count: 1 }).success, "非白名单 itemId 拒");
  check(!ToolSchemas.give_item.safeParse({ itemId: "mat_iron", count: 99 }).success, "count>5 拒");
  check(!ToolSchemas.give_currency.safeParse({ gold: 99999 }).success, "gold>500 拒");
  check(ToolSchemas.set_weather.safeParse({ weather: "rain" }).success, "合法 weather");
  check(!ToolSchemas.set_weather.safeParse({ weather: "typhoon" }).success, "非枚举 weather 拒");
  check(!ToolSchemas.spawn_enemy.safeParse({ enemyId: "crawler", count: 0 }).success, "count<1 拒");
});

// ── 8. 审计日志 append-only ──────────────────────────────────
await test("审计日志 append-only + 驳回原因", async () => {
  __resetForTest();
  await clearAudit();
  await appendAudit({ ts: 1, callId: "c1", playerId: "p", npcId: npc("babs"), tool: tool("give_item"), args: {}, result: "ok" });
  await appendAudit({
    ts: 2, callId: "c2", playerId: "p", npcId: npc("babs"), tool: tool("set_weather"),
    args: {}, result: "rejected", reason: "COOLDOWN",
  });
  const log = await readAudit();
  check(log.length === 2, "审计 2 条");
  check(log[1].reason === "COOLDOWN" && log[1].result === "rejected", "驳回原因记录正确");
});

// ── 9. 连续驳回 2 次 → 该工具本会话禁用 ──────────────────────
await test("连续驳回 2 次 → 工具禁用", async () => {
  __resetForTest();
  const a = getArbiter();
  const ctx = { playerId: "ban1", playerLevel: 1, now: Date.now() };
  // babs 无 spawn_enemy 权限，连续调用触发禁用
  const d1 = await a.check(npc("babs"), tool("spawn_enemy"), { enemyId: "crawler", count: 1 }, ctx);
  const d2 = await a.check(npc("babs"), tool("spawn_enemy"), { enemyId: "crawler", count: 1 }, ctx);
  const d3 = await a.check(npc("babs"), tool("spawn_enemy"), { enemyId: "crawler", count: 1 }, ctx);
  check(!d1.ok && !d2.ok, "前两次越权拒");
  check((d3.reason ?? "").includes("已禁用"), `第三次提示已禁用（${d3.reason}）`);
});

console.log(`\n════════════════════════════════`);
console.log(`  工具评估：${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════`);
process.exit(fail > 0 ? 1 : 0);
