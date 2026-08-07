// GDD §B.1 quest.schema.ts —— 任务 Schema 全集
import { z } from "zod";

export const RewardsSchema = z.object({
  gold: z.number().int().min(0).max(10000),
  crystal: z.number().int().min(0).max(20).default(0),
  exp: z.number().int().min(0).max(5000),
  items: z
    .array(z.object({ itemId: z.string(), count: z.number().int().min(1).max(3) }))
    .max(2)
    .default([]),
  reputation: z
    .object({
      faction: z.enum(["federation", "miners", "cult"]),
      points: z.number().int().min(0).max(100),
    })
    .optional(),
});
export type Rewards = z.infer<typeof RewardsSchema>;

export const DynamicQuestSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(["vera", "babs", "jicha"]),
  chain: z
    .object({
      seq: z.number().int().min(1).max(3),
      total: z.number().int().min(1).max(3),
    })
    .default({ seq: 1, total: 1 }),
  title: z.string().min(2).max(14),
  type: z.enum(["kill", "collect", "talk", "explore"]),
  zone: z.enum(["plains", "crystal", "lava", "abyss"]),
  objective: z.object({
    targetId: z.string(),
    count: z.number().int().min(1).max(20),
  }),
  rewards: RewardsSchema,
  dialogue: z.object({
    offer: z.string().max(60),
    progress: z.string().max(60),
    complete: z.string().max(60),
  }),
  difficulty: z.enum(["easy", "normal", "hard"]),
  expiresAt: z.number(),
});
export type DynamicQuest = z.infer<typeof DynamicQuestSchema>;

export const StandardQuestSchema = z.object({
  id: z.string(),
  title: z.string().max(14),
  type: z.enum(["kill", "collect", "talk", "explore"]),
  zone: z.enum(["plains", "crystal", "lava", "abyss"]),
  objective: z.object({ targetId: z.string(), count: z.number().int().min(1).max(20) }),
  rewards: RewardsSchema,
});
export type StandardQuest = z.infer<typeof StandardQuestSchema>;

export const MainQuestStateSchema = z.object({
  chapterId: z.string(),
  stepId: z.string(),
  done: z.array(z.string()),
});
export type MainQuestState = z.infer<typeof MainQuestStateSchema>;
