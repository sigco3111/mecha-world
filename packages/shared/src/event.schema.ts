// GDD §B.6 event.schema.ts —— 世界事件
import { z } from "zod";

export const WorldEventSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["caravan_attack", "crystal_surge", "swarm_tide", "bounty_target"]),
  zone: z.enum(["plains", "crystal", "lava", "abyss"]),
  spawns: z.array(
    z.object({ enemyId: z.string(), count: z.number().int().min(1).max(8) })
  ),
  durationMin: z.number().int().min(5).max(60),
  rewardPack: z.object({
    gold: z.number(),
    exp: z.number(),
    items: z.array(z.string()),
  }),
  broadcast: z.string().max(50),
  startedAt: z.number(),
});
export type WorldEvent = z.infer<typeof WorldEventSchema>;
