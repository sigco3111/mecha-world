// GDD §31.1 ids.ts —— 字面量联合类型全集
export type NpcId = "echo" | "babs" | "vera" | "jicha";
export type ZoneId = "plains" | "crystal" | "lava" | "abyss";
export type Weather = "sunny" | "rain" | "storm" | "snow" | "sandstorm";
export type Quality = "N" | "R" | "SR" | "SSR";
export type Faction = "federation" | "miners" | "cult";
export type Element = "energy" | "bio" | "mech";
export type EquipSlot = "weapon" | "armor" | "core";
export type QuestType = "kill" | "collect" | "talk" | "explore";
export type Intent = "chat" | "lore" | "quest" | "trade" | "repair" | "leave";

export const NPC_IDS: readonly NpcId[] = ["echo", "babs", "vera", "jicha"];
export const ZONE_ORDER: readonly ZoneId[] = ["plains", "crystal", "lava", "abyss"];
export const WEATHERS: readonly Weather[] = ["sunny", "rain", "storm", "snow", "sandstorm"];
export const FACTIONS: readonly Faction[] = ["federation", "miners", "cult"];
