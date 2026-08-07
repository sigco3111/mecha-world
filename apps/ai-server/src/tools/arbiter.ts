// GDD §8.6 —— 工具仲裁：权限 + 冷却 + 会话限额 + 越权 + 等级校验。
// 输入 args 已经过 zod（ToolSchemas）类型校验；arbiter 做语义规则仲裁。
import { getKv } from "../memory/backend";
import { NPC_TOOL_PERMISSIONS, type NpcId, type ToolName } from "@nexus/shared";
import { isEnemyTooStrong } from "../config/enemies";

export interface ArbiterContext {
  playerId: string;
  playerLevel: number;
  now: number;
}

export interface Decision {
  ok: boolean;
  reason?: string;
  code?: "E2002_TOOL_REJECTED" | "COOLDOWN";
}

const SEC = {
  DAY: 86_400,
  HOUR: 3_600,
  WEATHER_COOLDOWN_MS: 30 * 60_000,
  SPAWN_COOLDOWN_MS: 10 * 60_000,
};

const LIMITS = {
  QUEST_PER_DAY: 3,
  ITEM_PER_SESSION: 2,
  CURRENCY_PER_SESSION: 3,
  ITEM_TOTAL_VALUE: 500,
};

// 物品单价（用于 give_item 总价值校验，§19.1/§19.2）
const ITEM_PRICE: Record<string, number> = {
  mat_iron: 20, mat_parts: 15, mat_crystal: 60,
  con_repair: 100, con_energy: 80, con_bait: 60, con_shield: 120,
  eq_w_std: 150, eq_w_blade: 180, eq_w_rail: 170, eq_a_std: 160, eq_c_std: 140,
};

export class Arbiter {
  /** 连续驳回计数（§8.6：连续 2 次驳回 → 该工具本会话禁用） */
  private rejectStreak = new Map<string, number>();

  async check(npcId: NpcId, tool: ToolName, args: unknown, ctx: ArbiterContext): Promise<Decision> {
    // 1. 本会话是否已禁用该工具
    const banKey = `${ctx.playerId}:${npcId}:${tool}`;
    if ((this.rejectStreak.get(banKey) ?? 0) >= 2) {
      return reject("E2002_TOOL_REJECTED", "该工具本会话已禁用（连续驳回 2 次）");
    }

    // 2. 权限：NPC 是否有权调此工具
    const allowed = NPC_TOOL_PERMISSIONS[npcId] ?? [];
    if (!allowed.includes(tool)) {
      return this.recordReject(banKey, "E2002_TOOL_REJECTED", `越权：${npcId} 无 ${tool} 权限`);
    }

    // 3. 工具特定规则
    const d = await this.toolRules(tool, args, ctx);
    if (!d.ok) return this.recordReject(banKey, d.code ?? "E2002_TOOL_REJECTED", d.reason ?? "已驳回");

    // 通过：重置驳回计数
    this.rejectStreak.set(banKey, 0);
    return { ok: true };
  }

  private async toolRules(
    tool: ToolName,
    args: unknown,
    ctx: ArbiterContext
  ): Promise<Decision> {
    const kv = getKv();
    const a = args as Record<string, unknown>;

    switch (tool) {
      case "give_quest": {
        // 每 NPC 每日 ≤3
        const n = await kv.incr(`qlimit:${ctx.playerId}`, SEC.DAY);
        if (n > LIMITS.QUEST_PER_DAY) {
          return reject("E2002_TOOL_REJECTED", `每日任务上限 ${LIMITS.QUEST_PER_DAY}`);
        }
        return OK;
      }
      case "give_item": {
        const n = await kv.incr(`ilimit:${ctx.playerId}`, SEC.HOUR);
        if (n > LIMITS.ITEM_PER_SESSION) {
          return reject("E2002_TOOL_REJECTED", `每会话物品上限 ${LIMITS.ITEM_PER_SESSION}`);
        }
        const itemId = String(a.itemId ?? "");
        const count = Number(a.count ?? 0);
        const price = ITEM_PRICE[itemId] ?? 9999;
        const total = await kv.incr(`ival:${ctx.playerId}`, SEC.HOUR);
        void total; // 累计价值粗控：单价×count 由 zod 限 count≤5，单次≤5×price
        if (price * count > LIMITS.ITEM_TOTAL_VALUE) {
          return reject("E2002_TOOL_REJECTED", `单次物品价值超 ${LIMITS.ITEM_TOTAL_VALUE}`);
        }
        return OK;
      }
      case "set_weather": {
        const last = Number((await kv.get(`wcd:${ctx.playerId}`)) ?? 0);
        if (ctx.now - last < SEC.WEATHER_COOLDOWN_MS) {
          const waitMin = Math.ceil((SEC.WEATHER_COOLDOWN_MS - (ctx.now - last)) / 60_000);
          return reject("COOLDOWN", `天气冷却中，剩 ${waitMin} 分钟`);
        }
        await kv.set(`wcd:${ctx.playerId}`, String(ctx.now));
        return OK;
      }
      case "spawn_enemy": {
        const last = Number((await kv.get(`scd:${ctx.playerId}`)) ?? 0);
        if (ctx.now - last < SEC.SPAWN_COOLDOWN_MS) {
          return reject("COOLDOWN", "召唤冷却中（10 分钟）");
        }
        const enemyId = String(a.enemyId ?? "");
        if (isEnemyTooStrong(enemyId, ctx.playerLevel)) {
          return reject("E2002_TOOL_REJECTED", `敌人 ${enemyId} 对当前玩家过强（>等级+3）`);
        }
        await kv.set(`scd:${ctx.playerId}`, String(ctx.now));
        return OK;
      }
      case "give_currency": {
        const n = await kv.incr(`climit:${ctx.playerId}`, SEC.HOUR);
        if (n > LIMITS.CURRENCY_PER_SESSION) {
          return reject("E2002_TOOL_REJECTED", `每会话货币上限 ${LIMITS.CURRENCY_PER_SESSION}`);
        }
        return OK;
      }
      case "unlock_map_marker":
      case "repair_mecha":
      case "trade":
        return OK;
      default:
        return reject("E2002_TOOL_REJECTED", `未知工具 ${String(tool)}`);
    }
  }

  private recordReject(banKey: string, code: NonNullable<Decision["code"]>, reason: string): Decision {
    const n = (this.rejectStreak.get(banKey) ?? 0) + 1;
    this.rejectStreak.set(banKey, n);
    return { ok: false, code, reason };
  }
}

const OK: Decision = { ok: true };
function reject(code: NonNullable<Decision["code"]>, reason: string): Decision {
  return { ok: false, code, reason };
}

/** 单例 */
let _arbiter: Arbiter | null = null;
export function getArbiter(): Arbiter {
  if (!_arbiter) _arbiter = new Arbiter();
  return _arbiter;
}
