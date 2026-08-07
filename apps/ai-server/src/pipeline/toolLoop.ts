// GDD §35.4 —— 工具调用循环：模型输出 tool_call → zod 校验 → arbiter 仲裁 → 审计 →
// 下发前端执行（io.onToolCall）→ 回执拼入 messages → 模型生成反馈。最多 maxRounds 轮。
import type { ZodType } from "zod";
import type { NpcId, ToolName } from "@nexus/shared";
import { ToolSchemas } from "@nexus/shared";
import type { ChatMessage, ModelProvider, ToolCall } from "../router/modelRouter";
import type { OpenAITool } from "../tools/registry";
import { getArbiter } from "../tools/arbiter";
import { appendAudit } from "../tools/auditLog";

export interface ToolLoopContext {
  playerId: string;
  npcId: NpcId;
  playerLevel: number;
  now: number;
}

export interface ToolLoopIO {
  onToken: (delta: string) => void;
  /** 下发 tool_call 给前端执行并等待回执 */
  onToolCall: (
    callId: string,
    tool: ToolName,
    args: unknown
  ) => Promise<{ ok: boolean; detail: string }>;
}

export interface ToolLogEntry {
  tool: ToolName;
  args: unknown;
  result: "ok" | "rejected";
  reason?: string;
  detail?: string;
}

export interface ToolLoopResult {
  reply: string;
  tokensIn: number;
  tokensOut: number;
  toolLog: ToolLogEntry[];
}

// zod schema 表（运行时从 shared 取）
const SCHEMAS = ToolSchemas as unknown as Record<ToolName, ZodType>;

function parseArgs(tool: ToolName, raw: unknown):
  | { success: true; data: unknown }
  | { success: false; reason: string } {
  const schema = SCHEMAS[tool];
  if (!schema) return { success: false, reason: `未知工具 ${tool}` };
  const r = schema.safeParse(raw);
  if (r.success) return { success: true, data: r.data };
  const issues = r.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}:${i.message}`).join("; ");
  return { success: false, reason: `参数校验失败：${issues}` };
}

/**
 * 带工具的模型调用循环。
 * - 每轮流式输出 token（onToken）；done 若有 toolCalls 则处理工具后继续。
 * - 任一轮无 toolCalls 即收尾返回。
 */
export async function runModelWithTools(
  provider: ModelProvider,
  messages: ChatMessage[],
  tools: OpenAITool[],
  io: ToolLoopIO,
  ctx: ToolLoopContext,
  maxRounds = 3
): Promise<ToolLoopResult> {
  let reply = "";
  let tokensIn = 0;
  let tokensOut = 0;
  const toolLog: ToolLogEntry[] = [];

  for (let round = 0; round < maxRounds; round++) {
    let roundReply = "";
    let toolCalls: ToolCall[] | undefined;

    await provider.chatStream(
      messages,
      (c) => {
        if (c.delta) {
          roundReply += c.delta;
          reply += c.delta;
          io.onToken(c.delta);
        }
        if (c.done) {
          tokensIn += c.tokensIn ?? 0;
          tokensOut += c.tokensOut ?? 0;
          if (c.toolCalls && c.toolCalls.length > 0) toolCalls = c.toolCalls;
        }
      },
      { tools }
    );

    // 无工具调用 → 纯文本收尾
    if (!toolCalls || toolCalls.length === 0) {
      return { reply, tokensIn, tokensOut, toolLog };
    }

    // 追加 assistant（含 tool_calls）到 messages，供下一轮模型看到
    messages.push({
      role: "assistant",
      content: roundReply,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    });

    // 逐个处理工具调用
    for (const tc of toolCalls) {
      const tool = tc.name as ToolName;
      const parsed = parseArgs(tool, tc.arguments);

      // 参数非法 → 直接拒（不走 arbiter）
      if (!parsed.success) {
        await appendAudit({
          ts: Date.now(),
          callId: tc.id,
          playerId: ctx.playerId,
          npcId: ctx.npcId,
          tool,
          args: tc.arguments,
          result: "rejected",
          reason: parsed.reason,
        });
        toolLog.push({ tool, args: tc.arguments, result: "rejected", reason: parsed.reason });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ ok: false, error: parsed.reason }),
        });
        continue;
      }

      // arbiter 仲裁（权限/冷却/限额/等级）
      const decision = await getArbiter().check(ctx.npcId, tool, parsed.data, ctx);
      await appendAudit({
        ts: Date.now(),
        callId: tc.id,
        playerId: ctx.playerId,
        npcId: ctx.npcId,
        tool,
        args: parsed.data,
        result: decision.ok ? "ok" : "rejected",
        reason: decision.reason,
      });

      if (!decision.ok) {
        toolLog.push({ tool, args: parsed.data, result: "rejected", reason: decision.reason });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ ok: false, error: decision.reason ?? "已驳回" }),
        });
        continue;
      }

      // 通过 → 下发前端执行 + 等回执
      const result = await io.onToolCall(tc.id, tool, parsed.data);
      toolLog.push({ tool, args: parsed.data, result: "ok", detail: result.detail });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify({ ok: result.ok, detail: result.detail }),
      });
    }
    // 继续下一轮：模型依据 tool 结果生成自然语言反馈
  }

  // 达到 maxRounds 仍有 toolCalls → 截断返回（避免无限循环）
  return { reply, tokensIn, tokensOut, toolLog };
}
