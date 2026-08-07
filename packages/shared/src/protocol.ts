// GDD §31.3 protocol.ts —— WebSocket 协议完整定义
import type { Intent, NpcId } from "./ids";
import type { DynamicQuest } from "./quest.schema";
import type { WorldEvent } from "./event.schema";
import type { ToolName } from "./tools.schema";

export type ClientMsg =
  | { type: "chat"; sessionId: string; npcId: NpcId; text: string }
  | { type: "intent"; sessionId: string; npcId: NpcId; intent: Exclude<Intent, "chat"> }
  | { type: "tool_result"; callId: string; ok: boolean; detail: string }
  | { type: "ping" };

export type ServerMsg =
  | { type: "session"; sessionId: string }
  | { type: "token"; callId: string; delta: string }
  | { type: "tool_call"; callId: string; tool: ToolName; args: unknown }
  | {
      type: "done";
      callId: string;
      usage: { tokensIn: number; tokensOut: number; costCny: number };
    }
  | { type: "quest_offered"; callId: string; quest: DynamicQuest }
  | { type: "world_event"; event: WorldEvent }
  | { type: "affinity"; npcId: NpcId; value: number }
  | { type: "fallback"; reason: "model_down" | "budget" | "timeout" }
  | { type: "error"; code: ErrorCode; message: string };

export type ErrorCode =
  | "E1001_AUTH"
  | "E1002_RATE_LIMIT"
  | "E1003_BAD_MSG"
  | "E2001_TOOL_INVALID"
  | "E2002_TOOL_REJECTED"
  | "E2003_TOOL_TIMEOUT"
  | "E3001_MODEL_DOWN"
  | "E3002_BUDGET_EXCEEDED"
  | "E4001_QUEST_INVALID"
  | "E5000_INTERNAL";
