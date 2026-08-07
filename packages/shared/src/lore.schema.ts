// GDD §B.5 lore.schema.ts —— Lore 文档块
import { z } from "zod";

export const LoreChunkSchema = z.object({
  id: z.string(), // lore_2_1_03 规则：章_节_序号
  text: z.string().min(50).max(400),
  source: z.enum(["gdd_ch2", "data_shard", "bestiary", "npc_story"]),
  tags: z.array(z.string()),
});
export type LoreChunk = z.infer<typeof LoreChunkSchema>;
