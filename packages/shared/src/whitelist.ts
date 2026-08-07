// GDD §19/§18.2 whitelist.ts —— 工具与内容白名单常量
import type { ZoneId } from "./ids";

/** give_item 允许的物品（§19.3 ★ 装备 + 材料/消耗品） */
export const ITEM_WHITELIST = [
  "eq_w_std",
  "eq_w_blade",
  "eq_w_rail",
  "eq_a_std",
  "eq_c_std",
  "mat_iron",
  "mat_parts",
  "mat_crystal",
  "con_repair",
  "con_energy",
  "con_bait",
  "con_shield",
] as const;
export type ItemId = (typeof ITEM_WHITELIST)[number];

/** spawn_enemy 允许的敌人（§37.2 非 Boss） */
export const ENEMY_WHITELIST = [
  "crawler",
  "hound",
  "cbeast",
  "cshooter",
  "heavy",
  "moth",
  "silent",
] as const;
export type EnemyId = (typeof ENEMY_WHITELIST)[number];

/** 动态任务目标白名单：按区域（§35.6 v2 completable） */
export const TARGET_WHITELIST: Record<ZoneId, readonly string[]> = {
  plains: ["crawler", "hound", "mat_iron", "mat_parts", "poi_scrapyard", "poi_ruin_chapel", "poi_miners_camp"],
  crystal: ["cbeast", "cshooter", "mat_crystal", "poi_crystal_gate", "poi_sanctum"],
  lava: ["heavy", "moth", "mat_lava", "poi_lava_watch", "poi_core_mine"],
  abyss: ["silent", "poi_abyss_gate"],
};

/** POI 白名单（§18.2） */
export const POI_WHITELIST = [
  "poi_scrapyard",
  "poi_ruin_chapel",
  "poi_miners_camp",
  "poi_crystal_gate",
  "poi_sanctum",
  "poi_colossus_bed",
  "poi_lava_watch",
  "poi_core_mine",
  "poi_abyss_gate",
  "poi_echo_ruin",
  "poi_jicha_daily",
] as const;
export type PoiId = (typeof POI_WHITELIST)[number];

/** 叽喳商品池（§19.5） */
export const JICHA_POOL = {
  consumables: ["con_repair", "con_energy", "con_bait", "con_shield", "con_scanner"],
  bundles: ["mat_crystal×5", "mat_iron×10"],
  dailyEquip: ["eq_w_std", "eq_a_std"],
  curios: ["gear_song", "map_half", "rusty_key", "nexus_coin", "plain_rock"],
} as const;
