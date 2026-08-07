# Changelog

All notable changes to MECHA WORLD: NEXUS are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] — 2026-08-02 — AI 系统（NEXUS）完成

完整交付 GDD 里程碑 M0-M6：LLM 驱动的活 NPC + 动态任务 + AI 导演，单机断网可玩。

### Added — AI 后端（apps/ai-server）

- **M1 对话管道**：Fastify + WebSocket 网关（会话/心跳 15s/限流 10msg·min/重连指数退避 3 次）+ 流式 token + Mock 兜底
- **M2 四层记忆**：工作记忆（最近 10 轮，TTL 2h）/ 情节记忆（向量+时间衰减）/ 档案记忆（PlayerProfile）/ 世界 flag；Redis 持久 + 内存兜底
- **M2 Lore RAG**：34 条主 lore + 50 条数据残片 = 84 chunk；混合检索（向量 0.55 + BM25 0.45，RRF k=60，top5，阈值 0.62/0.28）；防编造三原则
- **M2 人设卡**：A.0 骨架（4 占位符填充）+ A.1-A.4 完整角色卡（Echo/老扳手/薇拉/叽喳）+ 工具权限 + 示例语气
- **M3 工具调用**：8 function calling 工具 + arbiter 仲裁（权限/冷却 30min·10min/会话限额/等级/连续驳回 2 次禁用）+ append-only 审计 + toolLoop（≤3 轮）
- **M3 模型路由**：OpenAI 兼容 Provider（主备）+ 流式 tool_calls 解析 + ChatMessage 扩展 tool role
- **M4 动态任务**：§A.5 生成 prompt + JSON 模式 + generate-and-refine（≤3）+ 五级校验（schema/completable/reward/text/dedup）+ 模板兜底 + 25% 任务链
- **M5 AI 导演**：20-40min 后台循环 + §A.6 prompt + 5 类世界事件 + 同类 2h 冷却 + 30% none（不打扰）
- **M5 预算熔断**：日预算计数器（KV，UTC 日重置）+ chatTurn 步骤 2 E3002 检查

### Added — 前端 AI 层（apps/game/src/ai + stores）

- `aiClient.ts` WS 单例 + `dialogueStore` + `DialoguePanel`（打字机 + 任务确认卡）
- `EchoButton` + 镇内 NPC 点击接入 LLM 对话
- `toolExecutor.ts`（zod 二次校验 → gameStore/rpgStore 写回）
- `cannedFallback.ts`（断网降级对话，4 NPC × 关键词路由）
- `directorToast.tsx`（世界事件 toast）+ `devDashboard.tsx`（?dev=1 成本看板）

### Added — 共享契约（packages/shared）

13 个 zod schema + 字面量类型：ids/vec/entities/quest/tools/profile/save/lore/event/protocol/whitelist。

### Added — 基础设施

- `.env.example` / `docker-compose.yml`（redis+qdrant+ai-server+caddy）/ `Caddyfile`

### Evaluation — 5 套 harness（101 用例全绿 + lore）

| Suite | 用例 | 结果 |
|-------|------|------|
| functional | 31 | ✅ 业务管线（记忆/RAG/注入拦截/跨轮）|
| tools-eval | 33 | ✅ 工具 + 仲裁（越权 100% 拦截）|
| quest-eval | 24 | ✅ 动态任务五级校验 |
| director-eval | 13 | ✅ 导演 + 预算 |
| lore | 26 | 84.6%（事实召回 95%；fallback TF 拒答局限，真 embedder 预期 ≥95%）|

### 启动

```bash
# 零配置（内存兜底 + fallback embedder + Mock LLM）
npm install && npm run dev:server && npm run dev

# 生产级（Redis + 真 LLM/embedding）
cp .env.example .env  # 填 LLM_PRIMARY_API_KEY + EMBEDDING_API_KEY
docker compose up -d redis qdrant
```

### Known Limitations / Next

- 真实 LLM/Embedding API key 端到端验证（Mock 模式管线全通，真模型质量待验）
- Boss×3 / 音频包 / 主线剧情脚本（游戏内容资产，非 AI 代码）
- 性能压测 + 真机兼容 + 录屏（需部署环境）

---

## [0.2.0] — 既有 mecha-world 基线

React Three Fiber + TS + Zustand + Rapier 单机机甲动作游戏：战斗/开放世界/抽卡/RPG/触屏，GitHub Pages 已部署。
