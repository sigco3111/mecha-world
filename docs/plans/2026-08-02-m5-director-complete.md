# M5（P5）阶段完成报告 —— AI 导演 + 成本看板

> 对应 GDD §13 里程碑 M5。完成日期：2026-08-02。
> 前置：M0-M4 ✅。AI 系统后端核心至此全部完成。

## 出口标准达成（GDD §13）

| 标准 | 状态 | 证据 |
|------|------|------|
| Director Agent + 5 类事件 | ✅ | `agents/director.ts`（caravan_attack/crystal_surge/swarm_tide/bounty_target + none）|
| 事件可触发可忽略 | ✅ | 30% none + 同类 2h 冷却 + 玩家 toast 可 dismiss |
| 成本数据实时可见 | ✅ | `/metrics` budget 字段 + 前端 `DevDashboard`（5s 轮询，?dev=1 开启）|
| 预算熔断降级 | ✅ | `router/budget.ts` + chatTurn 步骤2 E3002 检查 |

## 交付物

### 后端
- `router/budget.ts` —— 日预算计数器（KV，UTC 日重置）：`charge/isBudgetExceeded/getBudgetMetrics`
- `agents/director.ts` —— §35.7 后台循环（20-40min 随机抖动）+ §A.6 prompt（真 LLM）+ 模板兜底（mock）+ 同类 2h 冷却 + 主线过场不打扰
- `gateway/wsGateway.ts` —— **升级**：在线会话表（sessions Map）+ 导出 `getDirectorSessions()`；连接注册/断开注销
- `pipeline/chatTurn.ts` —— **升级**：步骤2 预算检查（E3002）；步骤10 `charge()` 入账
- `index.ts` —— **升级**：`startDirector(getDirectorSessions)`；`/metrics` 增强（sessions + budget）；`/director/trigger` 手动触发端点

### 前端
- `stores/worldEventStore.ts` —— world_event 状态 + 历史
- `ai/directorToast.tsx` —— 屏幕顶部事件 toast（4 类事件图标 + 广播 + 可 dismiss）
- `ai/devDashboard.tsx` —— 开发者成本看板（provider/KV/sessions/今日成本/预算进度条/熔断告警，5s 轮询）
- `stores/dialogueStore.ts` —— world_event 转发到 worldEventStore
- `App.tsx` —— 挂载 DirectorToast + 条件 DevDashboard（?dev=1）

### 评估
- `eval/director-eval.ts` —— 6 组 13 用例（charge/metrics/熔断/templateEvent 合法+kind 覆盖+等级缩放/无会话/触发链路）
- `eval/ws-director-smoke.ts` —— 端到端冒烟

## 验证

| 检查 | 结果 |
|------|------|
| ai-server / game tsc | ✅ 零错误 |
| functional（M2 回归） | ✅ 31/31 |
| tools-eval（M3 回归） | ✅ 33/33 |
| quest-eval（M4 回归） | ✅ 24/24 |
| director-eval（P5） | ✅ 13/13 |
| **AI 系统累计** | **101/101** |
| director 端到端冒烟 | ✅ 8 次 trigger → 2 事件 + 冷却生效 |

## 关键决策

1. **getDirectorSessions 解耦**：wsGateway 维护会话表，director 通过函数参数获取，不直接耦合 WS 实现。
2. **mock 模板事件按权重随机**：4 类事件 weight 3/2/2/2 + 30% none，强度按等级缩放（count ×⌊lv/5⌋，封顶 8）。
3. **预算熔断双保险**：chatTurn 步骤2 拒（E3002）+ DevDashboard 可视化告警。
4. **DevDashboard 用 ?dev=1 开启**：避免污染正常玩家 UI；HTTP polling /metrics。
5. **闭包变量用数组容器**：避免 TS 控制流将 let captured 收窄为 never。

## AI 系统全景（M0-M5 完成）

```
浏览器 ──WS──► wsGateway（会话/心跳/限流/tool 路由/quest 路由）
                │
                ▼
           chatTurn（11 步主管线）
           ├─ 注入防护（§8.9）
           ├─ 预算检查（budget）
           ├─ 四层记忆（工作/情节/档案/世界）
           ├─ lore RAG（向量+BM25 RRF）
           ├─ promptBuilder（§35.3 固定顺序）
           ├─ modelRouter（主备/Mock + function calling）
           ├─ toolLoop（8 工具 + arbiter + 审计）
           ├─ quest generate（五级校验 + quest_offered）
           └─ 摘要（每 5 轮 → 情节记忆）
                │
                ▼
           Director（20-40min）→ world_event 广播
```

## 下一阶段 P6（M6 内容补全）

GDD §13 M6：Boss×3、数据残片×50、装备词条池、音频包、主线 8 章。
- **AI 相关可做**：数据残片×50（扩充 lore RAG）、主线罐头锚点（cannedFallback）、装备词条配置（§37.3 扩充）
- **内容资产（非代码）**：Boss 3D 行为、音频包、完整主线剧情脚本 —— 需美术/音频/大量前端工作，标注为后续
