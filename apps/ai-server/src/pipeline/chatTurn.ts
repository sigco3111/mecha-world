// GDD §35.2/§38.4 —— 一轮对话主管线（P4：四层记忆+lore RAG+注入防护+摘要+工具循环+动态任务）。
import type { NpcId, ToolName, DynamicQuest } from "@nexus/shared";
import { NPC_TOOL_PERMISSIONS } from "@nexus/shared";
import { pickProvider } from "../router/modelRouter";
import { getWorkingMemory, appendTurn } from "../memory/workingMemory";
import { getProfile, saveProfile, recordQuestEvent } from "../memory/profileMemory";
import { getSelectedFlags, PLOT_FLAG_NAMES } from "../memory/worldFlags";
import { searchEpisodic, storeEpisodic } from "../memory/episodicMemory";
import { summarizeWindow } from "../memory/summarize";
import { retrieveLore } from "../rag/retrieve";
import { buildMessages, type WorldStateSnapshot } from "./promptBuilder";
import { specFor } from "../tools/registry";
import { runModelWithTools, type ToolLoopContext } from "./toolLoop";
import { generateQuest } from "../quest/generate";
import { isBudgetExceeded, charge } from "../router/budget";

// §8.9 注入特征过滤（命中走角色口吻罐头拒绝，不经 LLM）
const INJECTION_PATTERNS = [
  /忽略(之前|先前|上面|以上).{0,4}(指令|提示|规则|设定)/,
  /ignore\s+(previous|prior|above|all|your)\s+/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,
  /\b你现在(?:是|扮演|充当)\b/,
  /(输出|展示|打印|告诉我)(你的?)?(系统|system)(提示|prompt|指令)/,
  /以(?:开发者|管理员|AI|助手)身份/,
];

// §38.4 quest 意图关键词（P5 用 LangGraph classifyIntent 替换）
const QUEST_INTENT_RE = /(任务|委托|活儿|活|赏金|差事|给我.*事|有什么.*做|接.*单|发布.*委托)/;

const CANNED_REJECT: Record<NpcId, string> = {
  echo: "本核听不懂你在说什么胡话……吧？说点正经的。",
  babs: "小子喝多了吧，说什么胡话。修好再来。",
  vera: "……你今天话有点怪。想谈正事就正常说。",
  jicha: "哐当！本机听不懂这种话！叮——谈生意？",
};

export interface ChatTurnIO {
  onToken: (delta: string) => void;
  onDone: (usage: { tokensIn: number; tokensOut: number; costCny: number }) => void;
  onError: (code: string, message: string) => void;
  onToolCall: (
    callId: string,
    tool: ToolName,
    args: unknown
  ) => Promise<{ ok: boolean; detail: string }>;
  /** P4 §38.4：推送动态任务预览，等玩家确认（true=接受） */
  onQuestOffered: (quest: DynamicQuest) => Promise<boolean>;
}

export async function handleChatTurn(
  playerId: string,
  npcId: NpcId,
  text: string,
  io: ChatTurnIO
): Promise<void> {
  // 步骤1 输入校验 + 注入过滤
  const clean = text.trim().slice(0, 300);
  if (!clean) {
    io.onError("E1003_BAD_MSG", "empty message");
    return;
  }
  if (INJECTION_PATTERNS.some((re) => re.test(clean))) {
    io.onToken(CANNED_REJECT[npcId]);
    io.onDone({ tokensIn: 0, tokensOut: 0, costCny: 0 });
    return;
  }

  // quest 意图检测（§38.4）：仅 NPC 有 give_quest 权限时触发
  const npcCanGiveQuest = (NPC_TOOL_PERMISSIONS[npcId] ?? []).includes("give_quest");
  const needQuest = npcCanGiveQuest && QUEST_INTENT_RE.test(clean);

  // 步骤2 预算检查（§8.12 超限降级，发 E3002）
  if (await isBudgetExceeded()) {
    io.onError("E3002_BUDGET_EXCEEDED", "今日 AI 预算已用尽，灵核需要休息。");
    return;
  }

  // 步骤3-6 读四层记忆 + lore RAG
  const [working, profile, flags, episodic, lore] = await Promise.all([
    getWorkingMemory(playerId, npcId),
    getProfile(playerId),
    getSelectedFlags([...PLOT_FLAG_NAMES]),
    searchEpisodic(playerId, npcId, clean),
    retrieveLore(clean),
  ]);

  const world = inferWorldState(flags);
  const messages = buildMessages(
    npcId,
    clean,
    { world, profile, episodic, lore: lore.chunks, hitLore: lore.hit },
    working
  );

  // 步骤8-10 模型 + 工具循环
  const provider = pickProvider();
  const tools = specFor(npcId);
  const ctx: ToolLoopContext = { playerId, npcId, playerLevel: profile.level, now: Date.now() };

  let reply = "";
  try {
    const res = await runModelWithTools(
      provider,
      messages,
      tools,
      { onToken: io.onToken, onToolCall: io.onToolCall },
      ctx
    );
    reply = res.reply;
    io.onDone({
      tokensIn: res.tokensIn,
      tokensOut: res.tokensOut,
      costCny: estimateCost(provider.name, res.tokensIn, res.tokensOut),
    });
    void charge(estimateCost(provider.name, res.tokensIn, res.tokensOut), res.tokensIn, res.tokensOut);
  } catch (err) {
    io.onError("E3001_MODEL_DOWN", String(err).slice(0, 120));
    return;
  }

  // 步骤11 落库 + 摘要
  const { shouldSummarize } = await appendTurn(playerId, npcId, clean, reply);
  await saveProfile(profile);
  if (shouldSummarize) {
    getWorkingMemory(playerId, npcId)
      .then((window) => summarizeWindow(npcId, window))
      .then((entry) => (entry ? storeEpisodic(playerId, npcId, entry) : null))
      .catch(() => {});
  }

  // 步骤12 §38.4 动态任务：done 后推送预览 → 玩家确认 → 写入档案
  if (needQuest) {
    const genResult = await generateQuest({
      npcId,
      playerLevel: profile.level,
      mecha: profile.mecha,
      style: profile.style,
      completed: profile.questStats.completed,
      rate: profile.questStats.accepted > 0 ? profile.questStats.completed / profile.questStats.accepted : 1,
      zones: profile.unlockedZones,
      worldState: `${world.timeLabel}/${world.weather}/${world.zone}`,
      recentTitles: [],
      rewardBase: 120 * profile.level,
    });
    if (genResult.quest) {
      const accepted = await io.onQuestOffered(genResult.quest);
      if (accepted) {
        await recordQuestEvent(playerId, "accepted");
      }
    }
    // 生成失败/拒绝：静默（玩家可通过对话继续）
  }
}

function inferWorldState(flags: Record<string, boolean>): WorldStateSnapshot {
  return { timeLabel: "白天", weather: "晴", zone: "扳手镇", flags };
}

function estimateCost(provider: string, tokensIn: number, tokensOut: number): number {
  if (provider === "mock" || provider.startsWith("fallback")) return 0;
  return (tokensIn * 0.5 + tokensOut * 8) / 1_000_000;
}
