// GDD §B.3 profile.schema.ts —— 玩家档案（档案记忆层）
import { z } from "zod";

export const PlayerProfileSchema = z.object({
  playerId: z.string(),
  level: z.number().int().min(1).max(30),
  mecha: z.string(),
  style: z.object({ melee: z.number(), ranged: z.number() }),
  reputation: z.record(z.enum(["federation", "miners", "cult"]), z.number()),
  affinity: z.record(z.enum(["echo", "babs", "vera", "jicha"]), z.number().min(0).max(5)),
  questStats: z.object({
    accepted: z.number(),
    completed: z.number(),
    abandoned: z.number(),
  }),
  unlockedZones: z.array(z.enum(["plains", "crystal", "lava", "abyss"])),
  lastSeen: z.number(),
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export function createDefaultProfile(playerId: string): PlayerProfile {
  return {
    playerId,
    level: 1,
    mecha: "hound",
    style: { melee: 0.5, ranged: 0.5 },
    reputation: { federation: 0, miners: 0, cult: 0 },
    affinity: { echo: 0, babs: 0, vera: 0, jicha: 0 },
    questStats: { accepted: 0, completed: 0, abandoned: 0 },
    unlockedZones: ["plains"],
    lastSeen: Date.now(),
  };
}
