// GDD §8.8/§35.7 —— AI 导演：每 20-40min 唤醒，为在线会话选/参数化 1 个世界事件。
// mock 模板按权重随机；真 LLM 用 §A.6 prompt + WorldEventSchema 校验。
// 设计红线：主线过场不打扰；同类事件 2h 冷却；可被忽略无惩罚。
import { randomUUID } from "node:crypto";
import { pickProvider, type ChatMessage } from "../router/modelRouter";
import { WorldEventSchema, type WorldEvent, type ZoneId, type ServerMsg } from "@nexus/shared";
import { getSelectedFlags, PLOT_FLAG_NAMES } from "../memory/worldFlags";
import { getProfile } from "../memory/profileMemory";

const MIN_INTERVAL_MS = 20 * 60_000;
const MAX_INTERVAL_MS = 40 * 60_000;
const SAME_KIND_COOLDOWN_MS = 2 * 60 * 60_000;
const NONE_PROB = 0.3; // 30% 不打扰

export interface DirectorSession {
  playerId: string;
  send: (msg: ServerMsg) => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;
const lastFired = new Map<WorldEvent["kind"], number>();

export function startDirector(getSessions: () => Promise<DirectorSession[]>): void {
  const schedule = () => {
    const delay = MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
    timer = setTimeout(async () => {
      await runOnce(getSessions).catch(() => {});
      schedule();
    }, delay);
  };
  schedule();
}

export function stopDirector(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/** 手动触发一次（开发/测试/HTTP 端点用），返回触发的事件数 */
export async function triggerDirectorOnce(
  getSessions: () => Promise<DirectorSession[]>
): Promise<number> {
  return runOnce(getSessions);
}

async function runOnce(getSessions: () => Promise<DirectorSession[]>): Promise<number> {
  const sessions = await getSessions();
  if (sessions.length === 0) return 0;
  const flags = await getSelectedFlags([...PLOT_FLAG_NAMES]);
  if (flags.main_cinematic) return 0; // §8.8 主线过场不打扰

  let fired = 0;
  for (const sess of sessions) {
    const event = await generateForSession(sess);
    if (!event) continue; // none
    const last = lastFired.get(event.kind) ?? 0;
    if (Date.now() - last < SAME_KIND_COOLDOWN_MS) continue; // 同类 2h 冷却
    lastFired.set(event.kind, Date.now());
    sess.send({ type: "world_event", event });
    fired += 1;
  }
  return fired;
}

async function generateForSession(sess: DirectorSession): Promise<WorldEvent | null> {
  const profile = await getProfile(sess.playerId);
  const zone = (profile.unlockedZones[profile.unlockedZones.length - 1] ?? "plains") as ZoneId;
  const ctx = { level: profile.level, zone };

  const provider = pickProvider();
  if (provider.name === "mock" || provider.name.startsWith("fallback")) {
    return templateEvent(ctx);
  }
  try {
    const raw = await callJson(provider, ctx);
    const parsed = WorldEventSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    // 解析失败（可能是模型选 none）→ 不打扰
    return null;
  } catch {
    return null;
  }
}

async function callJson(
  provider: ReturnType<typeof pickProvider>,
  ctx: { level: number; zone: ZoneId }
): Promise<unknown> {
  const messages: ChatMessage[] = [
    { role: "system", content: "你是游戏世界导演。只输出一个合法 JSON 对象，不要输出其他文字或代码块。" },
    { role: "user", content: buildPrompt(ctx) },
  ];
  let raw = "";
  await provider.chatStream(messages, (c) => {
    if (c.delta) raw += c.delta;
  });
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try {
    return JSON.parse(cleaned.slice(s, e + 1));
  } catch {
    return null;
  }
}

function buildPrompt(ctx: { level: number; zone: ZoneId }): string {
  return `你是游戏世界导演。观察玩家状态，从事件库选择并参数化一个世界事件，输出 JSON。

【玩家】等级 ${ctx.level}，位置 ${ctx.zone}
【事件库】caravan_attack / crystal_surge / swarm_tide / bounty_target / none
【规则】
1. 玩家在主线过场或镇内休整 → none。
2. 冷却中的事件不可选。
3. 选中后给参数：spawns（种类+数量，总强度 ≤ 玩家等级×5）、durationMin(5-60)、rewardPack。
4. 写一条 ≤50 字的世界广播文本。
5. 拿不准就选 none，宁缺毋滥。

输出 JSON：id(uuid)/kind/zone/spawns[{enemyId,count}]/durationMin/rewardPack{gold,exp,items:[]}/broadcast/startedAt(epoch ms)。`;
}

interface EventTemplate {
  kind: WorldEvent["kind"];
  weight: number;
  broadcast: string;
  zone: ZoneId;
  spawns: { enemyId: string; count: number }[];
}

const TEMPLATES: EventTemplate[] = [
  {
    kind: "caravan_attack",
    weight: 3,
    broadcast: "西南方向传来爆炸声——好像有商队被围了！",
    zone: "plains",
    spawns: [
      { enemyId: "crawler", count: 4 },
      { enemyId: "hound", count: 2 },
    ],
  },
  {
    kind: "crystal_surge",
    weight: 2,
    broadcast: "夜里晶簇反常发光，矿盟说要有大事。",
    zone: "crystal",
    spawns: [{ enemyId: "cbeast", count: 3 }],
  },
  {
    kind: "swarm_tide",
    weight: 2,
    broadcast: "扳手镇外围虫群集结，可能要攻城！",
    zone: "plains",
    spawns: [
      { enemyId: "crawler", count: 6 },
      { enemyId: "hound", count: 3 },
    ],
  },
  {
    kind: "bounty_target",
    weight: 2,
    broadcast: "薇拉发来急电：附近发现一只精英目标。",
    zone: "crystal",
    spawns: [{ enemyId: "cbeast", count: 1 }],
  },
];

export function templateEvent(ctx: { level: number; zone: ZoneId }): WorldEvent | null {
  if (Math.random() < NONE_PROB) return null; // 30% 不打扰
  const total = TEMPLATES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  let pick = TEMPLATES[0];
  if (TEMPLATES.length > 0) {
    for (const t of TEMPLATES) {
      r -= t.weight;
      if (r <= 0) {
        pick = t;
        break;
      }
    }
  }
  // 强度按等级缩放
  const scale = Math.max(1, Math.floor(ctx.level / 5));
  const spawns = pick.spawns.map((s) => ({
    enemyId: s.enemyId,
    count: Math.min(8, s.count * Math.max(1, scale)),
  }));
  const gold = 200 * ctx.level;
  return {
    id: randomUUID(),
    kind: pick.kind,
    zone: pick.zone,
    spawns,
    durationMin: 15,
    rewardPack: { gold, exp: gold, items: [] },
    broadcast: pick.broadcast,
    startedAt: Date.now(),
  };
}
