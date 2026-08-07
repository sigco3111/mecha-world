// GDD §8.6 / §B.2 —— 工具注册表：OpenAI function spec + per-NPC 权限过滤。
// parameters 为给模型看的 JSON Schema（简化）；arbiter 用 shared.ToolSchemas(zod) 做严格校验。
import type { NpcId, ToolName } from "@nexus/shared";
import { NPC_TOOL_PERMISSIONS } from "@nexus/shared";

export interface OpenAITool {
  type: "function";
  function: {
    name: ToolName;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const ITEM_DESC =
  "给玩家发放物品（仅限零件/消耗品白名单：mat_iron/mat_parts/mat_crystal/con_repair/con_energy/con_bait/con_shield/eq_w_std/eq_w_blade/eq_w_rail/eq_a_std/eq_c_std）";

const SPECS: Record<ToolName, Omit<OpenAITool["function"], "name">> = {
  give_quest: {
    description:
      "向玩家发布一个动态委托任务（写入任务面板）。仅在玩家明确接受后调用，且该 NPC 当日发布未超过 3 个。",
    parameters: {
      type: "object",
      required: ["quest"],
      additionalProperties: false,
      properties: {
        quest: {
          type: "object",
          description:
            "DynamicQuest：{title(≤14字), type(kill|collect|talk|explore), zone, objective:{targetId,count}, rewards:{gold,exp}, dialogue:{offer,progress,complete}}",
        },
      },
    },
  },
  give_item: {
    description: ITEM_DESC + "。每会话最多 2 次，总价值 ≤500 金币。",
    parameters: {
      type: "object",
      required: ["itemId", "count"],
      additionalProperties: false,
      properties: {
        itemId: { type: "string", description: "白名单物品 id" },
        count: { type: "integer", minimum: 1, maximum: 5 },
      },
    },
  },
  set_weather: {
    description:
      "切换当前天气（sunny/rain/storm/snow/sandstorm），玩法规则即时生效。30 分钟全局冷却。仅在玩家请求时调用。",
    parameters: {
      type: "object",
      required: ["weather"],
      additionalProperties: false,
      properties: {
        weather: { type: "string", enum: ["sunny", "rain", "storm", "snow", "sandstorm"] },
      },
    },
  },
  spawn_enemy: {
    description:
      "在玩家附近召唤敌人（悬赏/剧情用）。敌人等级不得超过玩家等级+3，10 分钟冷却，count≤5。",
    parameters: {
      type: "object",
      required: ["enemyId", "count"],
      additionalProperties: false,
      properties: {
        enemyId: { type: "string", description: "白名单敌人 id（非 Boss）" },
        count: { type: "integer", minimum: 1, maximum: 5 },
        minDistanceFromPlayer: { type: "number", minimum: 30, default: 30 },
      },
    },
  },
  give_currency: {
    description: "发放货币（gold ≤500 或 crystal ≤20）。每会话最多 3 次。",
    parameters: {
      type: "object",
      required: [],
      additionalProperties: false,
      properties: {
        gold: { type: "integer", minimum: 0, maximum: 500, default: 0 },
        crystal: { type: "integer", minimum: 0, maximum: 20, default: 0 },
      },
    },
  },
  unlock_map_marker: {
    description: "点亮地图标记（POI）。无冷却。",
    parameters: {
      type: "object",
      required: ["poiId"],
      additionalProperties: false,
      properties: { poiId: { type: "string", description: "POI 白名单 id" } },
    },
  },
  repair_mecha: {
    description:
      "修理机甲。费用由后端按缺失 HP 计算（不接受 LLM 报价）。老扳手好感 Lv3 后打折。",
    parameters: {
      type: "object",
      required: ["mechaId"],
      additionalProperties: false,
      properties: { mechaId: { type: "string" } },
    },
  },
  trade: {
    description: "完成交易：校验购物车 + 好感折扣 + 扣款发货。",
    parameters: {
      type: "object",
      required: ["cart"],
      additionalProperties: false,
      properties: {
        cart: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: { sku: { type: "string" }, count: { type: "integer", minimum: 1 } },
          },
        },
      },
    },
  },
};

/** 返回该 NPC 有权调用的工具集（§A.2-A.4 权限） */
export function specFor(npcId: NpcId): OpenAITool[] {
  const allowed = NPC_TOOL_PERMISSIONS[npcId] ?? [];
  return allowed.map((name) => ({
    type: "function" as const,
    function: { name, ...SPECS[name] },
  }));
}

export const ALL_TOOL_NAMES = Object.keys(SPECS) as ToolName[];
