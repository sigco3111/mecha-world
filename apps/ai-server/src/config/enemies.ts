// GDD §37.2 —— 敌人配置（机器可读，arbiter 等级校验 + 后续 spawner/P6 用）。
// 数值摘自 GDD §12.2/§37.2；Boss 此处略（P6 内容补全）。
import type { ZoneId, Element } from "@nexus/shared";

export interface EnemySpec {
  id: string;
  zone: ZoneId;
  elem: Element;
  hp: number;
  atk: number;
  exp: number;
  gold: number;
  lv: number; // 推荐等级（arbiter 用）
}

export const ENEMIES: readonly EnemySpec[] = [
  { id: "crawler", zone: "plains", elem: "mech", hp: 120, atk: 12, exp: 15, gold: 8, lv: 1 },
  { id: "hound", zone: "plains", elem: "mech", hp: 200, atk: 16, exp: 22, gold: 12, lv: 3 },
  { id: "cbeast", zone: "crystal", elem: "bio", hp: 350, atk: 22, exp: 40, gold: 20, lv: 6 },
  { id: "cshooter", zone: "crystal", elem: "bio", hp: 260, atk: 25, exp: 38, gold: 18, lv: 7 },
  { id: "heavy", zone: "lava", elem: "mech", hp: 600, atk: 30, exp: 70, gold: 35, lv: 13 },
  { id: "moth", zone: "lava", elem: "bio", hp: 380, atk: 34, exp: 65, gold: 30, lv: 14 },
  { id: "silent", zone: "abyss", elem: "energy", hp: 800, atk: 42, exp: 120, gold: 60, lv: 19 },
];

export const ENEMY_LEVEL: Record<string, number> = Object.fromEntries(
  ENEMIES.map((e) => [e.id, e.lv])
);

/** §8.6 spawn_enemy 仲裁：敌人推荐等级超过玩家等级+3 则过强 */
export function isEnemyTooStrong(enemyId: string, playerLevel: number): boolean {
  const recLv = ENEMY_LEVEL[enemyId];
  if (recLv === undefined) return false; // 未知敌人不阻拦（zod 白名单已过滤）
  return recLv > playerLevel + 3;
}
