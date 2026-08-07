// GDD §B.4 save.schema.ts —— 存档 V2
import { z } from "zod";
import { PlayerProfileSchema } from "./profile.schema";
import { DynamicQuestSchema, StandardQuestSchema, MainQuestStateSchema } from "./quest.schema";

/** 装备实例（与 entities.ts 对齐，zod 化供存档校验） */
export const EquipmentSchema = z.object({
  equipId: z.string(),
  quality: z.enum(["N", "R", "SR", "SSR"]),
  slot: z.enum(["weapon", "armor", "core"]),
  enhance: z.number().int().min(0).max(12),
  mainStat: z.object({
    atk: z.number().optional(),
    hp: z.number().optional(),
    def: z.number().optional(),
    energy: z.number().optional(),
  }),
  subStats: z.array(z.object({ key: z.string(), value: z.number() })).max(3),
});

export const MechaInstanceSchema = z.object({
  instanceId: z.string(),
  mechaId: z.string(),
  level: z.number().int().min(1).max(30),
  exp: z.number().min(0),
  breakthrough: z.number().int().min(0).max(4),
  slots: z.object({
    weapon: EquipmentSchema.optional(),
    armor: EquipmentSchema.optional(),
    core: EquipmentSchema.optional(),
  }),
});

export const SaveGameV2Schema = z.object({
  version: z.literal(2),
  savedAt: z.number(),
  profile: PlayerProfileSchema,
  inventory: z.object({
    equipment: z.array(EquipmentSchema),
    materials: z.record(z.string(), z.number()),
    consumables: z.record(z.string(), z.number()),
    questItems: z.array(z.string()),
    capacity: z.number().int().max(120),
    gold: z.number().min(0),
    crystal: z.number().min(0),
  }),
  mechas: z.array(MechaInstanceSchema),
  currentMechaId: z.string(),
  quests: z.object({
    main: MainQuestStateSchema,
    dynamic: z.array(DynamicQuestSchema),
    standard: z.array(StandardQuestSchema),
  }),
  world: z.object({
    flags: z.record(z.string(), z.boolean()),
    openedChests: z.array(z.string()),
    dataShards: z.array(z.string()),
    timeOfDay: z.number(),
    weather: z.enum(["sunny", "rain", "storm", "snow", "sandstorm"]),
  }),
  gacha: z.object({
    pity: z.number().min(0),
    guarantee: z.boolean(),
    stardust: z.number().min(0),
  }),
});
export type SaveGameV2 = z.infer<typeof SaveGameV2Schema>;
