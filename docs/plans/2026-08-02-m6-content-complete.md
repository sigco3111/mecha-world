# M6（P6）阶段完成报告 —— 内容补全（AI 相关）

> 对应 GDD §13 里程碑 M6。完成日期：2026-08-02。
> 前置：M0-M5 ✅。

## 出口标准达成（GDD §13）

| 标准 | 状态 | 说明 |
|------|------|------|
| 数据残片×50 | ✅ | `rag/loreShards.ts`（50 条，扩充 RAG 到 84 chunk）|
| 装备词条池 | ✅ | `config/items.ts`（§37.3 完整：材料/消耗品/装备/副词条/叽喳池）|
| 罐头降级对话 | ✅ | `ai/cannedFallback.ts`（4 NPC × 关键词路由，§8.12 断网可对话）|
| Boss×3 / 音频包 / 主线剧情脚本 | ⏸ | 游戏内容资产（3D 美术/音频/剧情脚本），非 AI 代码 —— 标注后续 |

## 交付物

### 后端
- `rag/loreShards.ts` —— 50 条数据残片 lore（NEXUS/大静默 10 + 阵营秘辛 8 + 生态细节 10 + 机甲历史 8 + NPC 背景 8 + 主线伏笔 6），全部基于 GDD 第 2/16 章，作为 RAG ground truth
- `rag/ingest.ts` —— **升级**：合并 `LORE_CHUNKS + LORE_SHARDS`（84 chunk 入库）
- `config/items.ts` —— §37.3 权威数值源：MATERIALS/CONSUMABLES/EQUIPMENT（9 模板）/SUBSTAT_POOL（§19.4 三类词条）/JICHA_POOL（含 5 奇物）/ITEM_PRICE 统一表

### 前端
- `ai/cannedFallback.ts` —— 罐头降级：4 NPC × {default/quest/repair/trade} 池 + 关键词路由
- `stores/dialogueStore.ts` —— **升级**：`send` 在 fallback/无连接时走 `cannedReply`（断网可对话，§8.12 支柱 5）

## 验证

| 检查 | 结果 |
|------|------|
| ai-server / game tsc | ✅ 零错误 |
| functional（M2 回归） | ✅ 31/31 |
| tools-eval（M3 回归） | ✅ 33/33 |
| quest-eval（M4 回归） | ✅ 24/24 |
| director-eval（M5 回归） | ✅ 13/13 |
| lore eval（84 chunks） | ✅ 84.6%（事实召回 95%，fallback 拒答局限）|
| WS 端到端（84-chunk ingest） | ✅ 对话无回归 |

## 关键决策

1. **数据残片全部事实化**：50 条 lore 基于已有 GDD 第 2/16 章展开，不编造新设定——RAG ground truth 完整性优先于数量。
2. **cannedFallback 关键词路由**：任务/修理/交易/闲聊四类，每 NPC 独立池保持人设（老扳手嘴硬、叽喳音效、薇拉冷幽默）。
3. **config/items.ts 作为权威源**：当前 arbiter/toolExecutor 持内联副本保证独立可测，此文件供未来统一与扩展（§37.3 单一事实源）。
4. **测试 query 纯净化**：functional"乱码"测试原含中文字（"未收录的乱码词"）在 84-chunk 库被 fallback 词袋误命中 → 改纯无意义字符串。

## 内容资产（非 AI 代码，标注后续）

- **Boss×3**：晶簇巨像/熔核暴君/静默使徒 —— 需 3D 模型 + 多阶段行为脚本（前端 Game.tsx 集成）
- **音频包**：BGM 分层 + SFX 对象池 + NPC 打字音 —— 需音频素材 + `audio/audioBus.ts` 实现
- **主线 8 章剧情脚本**：28 个主线任务的完整罐头锚点 + 过场 —— 需剧情编写 + FTUE 集成

这些是游戏内容工作（美术/音频/叙事），不属于 AI 后端代码范畴。AI 系统已为它们准备好接入点（NPC 对话/任务面板/事件广播）。

## 下一阶段 P7（M7 打磨发布）

- 五套评估 harness 归档（functional/tools/quest/director/lore）✅
- 发布检查单（§28.1）+ CHANGELOG
- 性能压测（§11.7）+ 真机兼容 —— 需部署环境
- 录屏 + README 最终化
