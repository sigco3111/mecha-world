// GDD §31.2 entities.ts —— 实体实例类型
import type { Element, EquipSlot, Quality, ZoneId } from "./ids";

export interface SubStat {
  key: string; // §19.4 词条池 key
  value: number;
}

export interface Equipment {
  equipId: string; // §19.3 表
  quality: Quality;
  slot: EquipSlot;
  enhance: number; // +0..+12
  mainStat: { atk?: number; hp?: number; def?: number; energy?: number };
  subStats: SubStat[]; // 1-3 条
}

export interface MechaInstance {
  instanceId: string; // uuid
  mechaId: string; // "hound"|"longeye"|"fortress"|"weaver"|"aurora"
  level: number; // 1-30
  exp: number;
  breakthrough: number; // 0-4
  slots: { weapon?: Equipment; armor?: Equipment; core?: Equipment };
}

export interface EnemySpec {
  enemyId: string;
  zone: ZoneId;
  element: Element;
  baseHp: number;
  baseAtk: number;
  exp: number;
  gold: number;
  affixes?: string[]; // §20.2 词缀 id
}

/** 实时面板（计算结果，不持久化） */
export interface PlayerStats {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  atk: number;
  def: number;
  critRate: number;
  critDmg: number;
  moveSpeed: number;
  element: Element;
}
