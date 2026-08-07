// GDD §37.3/§19 —— 物品/装备/商品池配置（唯一数值源）。
// 当前 arbiter/toolExecutor 持有内联副本以保证独立可测；此文件作为权威源供未来统一与扩展。
import type { EquipSlot, Quality } from "@nexus/shared";

export const MATERIALS = {
  mat_iron: { name: "铁矿", price: 20, source: "平原采集/爬虫掉落", use: "强化 +0~+6" },
  mat_parts: { name: "通用零件", price: 15, source: "全图机械敌人", use: "修理/任务" },
  mat_crystal: { name: "晶簇", price: 60, source: "晶簇丛采集", use: "突破/抽卡材料" },
  mat_lava: { name: "熔核", price: 150, source: "熔岩带采集", use: "SR/SSR 强化 +7 以上" },
  mat_core_shard: { name: "灵核碎片", price: 0, source: "隐藏探索×5", use: "Echo 强化（非卖）" },
  mat_datachip: { name: "旧文明芯片", price: 300, source: "深渊掉落", use: "SSR 改装" },
} as const;

export const CONSUMABLES = {
  con_repair: { name: "修理包", price: 100, effect: { healPct: 30 } },
  con_energy: { name: "能量饮料", price: 80, effect: { energy: 30 } },
  con_bait: { name: "虫群诱饵", price: 60, effect: { tauntRadius: 20, tauntSec: 10 } },
  con_shield: { name: "应急护盾", price: 120, effect: { shieldFull: true } },
  con_scanner: { name: "残片扫描仪", price: 200, effect: { markShardRadius: 100 } },
} as const;

export interface EquipTemplate {
  id: string;
  slot: EquipSlot;
  quality: Quality;
  baseAtk?: number;
  baseHp?: number;
  baseDef?: number;
  baseEnergy?: number;
  feature?: string;
  giftable: boolean; // §19.3 ★ give_item 允许子集
}

export const EQUIPMENT: readonly EquipTemplate[] = [
  { id: "eq_w_std", slot: "weapon", quality: "N", baseAtk: 18, feature: "制式步枪刃", giftable: true },
  { id: "eq_w_blade", slot: "weapon", quality: "R", baseAtk: 22, feature: "近战 +8%", giftable: true },
  { id: "eq_w_rail", slot: "weapon", quality: "R", baseAtk: 20, feature: "远程 +8%", giftable: true },
  { id: "eq_a_std", slot: "armor", quality: "N", baseHp: 180, baseDef: 10, feature: "制式装甲", giftable: true },
  { id: "eq_a_heavy", slot: "armor", quality: "R", baseHp: 260, baseDef: 16, feature: "移速 -3%（堡垒向）", giftable: false },
  { id: "eq_a_light", slot: "armor", quality: "R", baseHp: 140, baseDef: 8, feature: "闪避冷却 -10%（敏捷向）", giftable: false },
  { id: "eq_c_std", slot: "core", quality: "N", baseEnergy: 15, feature: "制式核心", giftable: true },
  { id: "eq_c_rage", slot: "core", quality: "R", feature: "受击能量 +30%（大招循环）", giftable: false },
  { id: "eq_c_swift", slot: "core", quality: "R", feature: "击杀回复 8% 能量（清场向）", giftable: false },
];

/** §19.3 ★ give_item 允许的装备子集（品质 ≤ R，防 LLM 发 SR/SSR 破坏经济） */
export const NPC_GIFTABLE_EQUIP = EQUIPMENT.filter((e) => e.giftable).map((e) => e.id);

/** §19.4 副词条池（同装备不得出现两条同乘区词条；SSR 必含 1 条攻击向） */
export const SUBSTAT_POOL = {
  attack: [
    { key: "atk_pct", range: [0.04, 0.08] },
    { key: "crit_rate", range: [0.02, 0.05] },
    { key: "crit_dmg", range: [0.08, 0.15] },
    { key: "dmg_mech", range: [0.06, 0.12] },
    { key: "dmg_bio", range: [0.06, 0.12] },
    { key: "dmg_energy", range: [0.06, 0.12] },
  ],
  defense: [
    { key: "hp_pct", range: [0.05, 0.10] },
    { key: "def_pct", range: [0.05, 0.10] },
    { key: "shield_cap", range: [0.08, 0.15] },
    { key: "hurt_energy_gain", range: [0.05, 0.10] },
  ],
  utility: [
    { key: "move_speed", range: [0.03, 0.06] },
    { key: "charge_speed", range: [0.05, 0.10] },
    { key: "pickup_range", range: [0.15, 0.30] },
    { key: "exp_bonus", range: [0.05, 0.10] },
  ],
} as const;

/** §19.5 叽喳商品池 + 奇物池 */
export const JICHA_POOL = {
  consumables: Object.keys(CONSUMABLES),
  bundles: ["mat_crystal×5", "mat_iron×10"],
  dailyEquip: ["eq_w_std", "eq_a_std"],
  curios: [
    { id: "gear_song", name: "会唱歌的齿轮", weight: 30, real: "收藏品，喷泉广场换涂装" },
    { id: "map_half", name: "半张藏宝图", weight: 25, real: "集齐 2 张→隐藏宝箱（晶核×40）" },
    { id: "rusty_key", name: "生锈的钥匙", weight: 20, real: "开坍塌教堂地下室（SR 装备箱）" },
    { id: "nexus_coin", name: "NEXUS 纪念币", weight: 10, real: "终章 C 结局彩蛋道具" },
    { id: "plain_rock", name: "普通石头", weight: 15, real: "真的只是石头" },
  ],
} as const;

/** 统一价格表（arbiter 价值校验用） */
export const ITEM_PRICE: Record<string, number> = {
  ...Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, v.price])),
  ...Object.fromEntries(Object.entries(CONSUMABLES).map(([k, v]) => [k, v.price])),
  ...Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.baseAtk ?? e.baseHp ?? 100])),
};
