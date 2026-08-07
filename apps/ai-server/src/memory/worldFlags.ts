// GDD §8.4 第4层 —— 世界记忆：全局 flag（玩家杀过晶簇巨像、放过教团成员等）。
// key: world:flags（hash）；值 "1"/"0"。
import { getKv } from "./backend";

const KEY = "world:flags";

export async function getFlag(name: string): Promise<boolean> {
  const all = await getFlags();
  return all[name] === true;
}

export async function setFlag(name: string, value: boolean): Promise<void> {
  await getKv().hSet(KEY, { [name]: value ? "1" : "0" });
}

export async function getFlags(): Promise<Record<string, boolean>> {
  const raw = await getKv().hGetAll(KEY);
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = v === "1";
  return out;
}

/** 只取注入 prompt 所需的若干 flag（避免注入过载） */
export async function getSelectedFlags(names: string[]): Promise<Record<string, boolean>> {
  const all = await getFlags();
  const out: Record<string, boolean> = {};
  for (const n of names) out[n] = all[n] === true;
  return out;
}

/** 与剧情/任务相关的可注入 flag 名单（§8.4 注入策略） */
export const PLOT_FLAG_NAMES = [
  "killed_colossus", // 击杀过晶簇巨像
  "killed_tyrant",
  "killed_apostle",
  "spared_cultist", // 放过教团成员
  "main_chapter", // 当前主线章节（值由设置方另存，此处仅占位布尔）
] as const;
