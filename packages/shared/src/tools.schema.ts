// GDD §B.2 tools.schema.ts —— Function Calling 工具参数 Schema
import { z } from "zod";
import { DynamicQuestSchema } from "./quest.schema";
import { ITEM_WHITELIST, ENEMY_WHITELIST, POI_WHITELIST } from "./whitelist";

export const ToolSchemas = {
  give_quest: z.object({ quest: DynamicQuestSchema }),
  give_item: z.object({
    itemId: z.enum(ITEM_WHITELIST),
    count: z.number().int().min(1).max(5),
  }),
  set_weather: z.object({
    weather: z.enum(["sunny", "rain", "storm", "snow", "sandstorm"]),
  }),
  spawn_enemy: z.object({
    enemyId: z.enum(ENEMY_WHITELIST),
    count: z.number().int().min(1).max(5),
    minDistanceFromPlayer: z.number().min(30).default(30),
  }),
  give_currency: z.object({
    gold: z.number().int().min(0).max(500).default(0),
    crystal: z.number().int().min(0).max(20).default(0),
  }),
  unlock_map_marker: z.object({ poiId: z.enum(POI_WHITELIST) }),
  repair_mecha: z.object({ mechaId: z.string() }),
  trade: z.object({
    cart: z.array(z.object({ sku: z.string(), count: z.number().int().min(1) })).min(1),
  }),
} as const;

export type ToolName = keyof typeof ToolSchemas;
export type ToolArgs<T extends ToolName> = z.infer<(typeof ToolSchemas)[T]>;

/** NPC 工具权限表（GDD 附录 A.2-A.4） */
export const NPC_TOOL_PERMISSIONS: Record<string, readonly ToolName[]> = {
  echo: [],
  babs: ["repair_mecha", "give_item", "set_weather"],
  vera: ["give_quest", "give_currency", "unlock_map_marker", "trade"],
  jicha: ["trade", "give_item", "unlock_map_marker"],
};
