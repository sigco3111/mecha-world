// GDD §8.6 / §40.2 —— 工具调用审计（append-only）。
// 红线：永不记录玩家输入原文与 NPC 回复原文；只记工具调用元数据（谁/何时/参数/结果）。
import { getKv } from "../memory/backend";
import type { NpcId, ToolName } from "@nexus/shared";

export interface AuditEntry {
  ts: number;
  callId: string;
  playerId: string;
  npcId: NpcId;
  tool: ToolName;
  args: unknown;
  result: "ok" | "rejected";
  reason?: string;
}

const KEY = "audit:tools";
const MAX = 1000;

function parse(raw: string | null): AuditEntry[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e): e is AuditEntry =>
        typeof e === "object" && e !== null && typeof (e as AuditEntry).ts === "number"
    );
  } catch {
    return [];
  }
}

export async function appendAudit(e: AuditEntry): Promise<void> {
  const arr = parse(await getKv().get(KEY));
  arr.push(e);
  await getKv().set(KEY, JSON.stringify(arr.slice(-MAX)));
}

export async function readAudit(): Promise<AuditEntry[]> {
  return parse(await getKv().get(KEY));
}

/** 清空（测试用） */
export async function clearAudit(): Promise<void> {
  await getKv().del(KEY);
}
