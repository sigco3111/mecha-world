# MECHA WORLD — 开放世界机甲游戏 分阶段实施计划

> **For Hermes:** 按Phase顺序执行，每个Phase完成后在浏览器中截图验证，用户确认后再进入下一Phase。

**Goal:** 打造一款可在手机端运行的3D开放世界机甲动作游戏，支持战斗、探索、收集、商业化变现。

**Architecture:** React Three Fiber (Three.js) + TypeScript + Vite。程序化几何体建模 + AI素材管线。组件化游戏对象，ECS-like状态管理，Capacitor打包移动端。

**Tech Stack:** Three.js, @react-three/fiber, @react-three/drei, @react-three/rapier (物理), Zustand (状态管理), Vite, Capacitor (移动端打包)

**当前进度:** Phase 0 已完成 — 基础场景 + 机甲模型 + WASD移动 + 第三人称相机

---

## Phase 总览

| Phase | 名称 | 核心交付 | 预计工期 |
|-------|------|---------|---------|
| 0 | 基础原型 | 场景+机甲+移动+相机 | 已完成 |
| 1 | 战斗系统 | 近战+远程+锁定+伤害 | 3-5天 |
| 2 | 敌人AI | 敌方机甲+状态机+Boss | 3-5天 |
| 3 | 触屏操控 | 虚拟摇杆+技能按钮 | 2-3天 |
| 4 | 世界扩展 | 大地图+地形+区域划分 | 5-7天 |
| 5 | RPG系统 | 升级+装备+技能树+背包 | 5-7天 |
| 6 | 商业化 | 抽卡+商店+内购+广告 | 4-6天 |
| 7 | 移动端优化 | 性能+打包+上架 | 3-5天 |

---

## Phase 1: 战斗系统

**目标:** 机甲能近战挥拳、远程射击、锁定目标、看到伤害数字。

### Task 1.1: 安装物理引擎 + 状态管理库

**Objective:** 引入Rapier物理引擎和Zustand状态管理，为战斗系统打基础。

**Files:**
- Modify: `package.json`

**Step 1: 安装依赖**

```bash
cd ~/Desktop/mecha-world
npm install @react-three/rapier zustand
```

**Step 2: 验证安装**

```bash
node -e "require('@react-three/rapier'); require('zustand'); console.log('OK')"
```
Expected: OK

**Step 3: Commit**

```bash
git add -A && git commit -m "deps: add rapier physics + zustand state"
```

---

### Task 1.2: 创建游戏状态Store

**Objective:** 集中管理玩家状态（血量、能量、武器、分数等）。

**Files:**
- Create: `src/stores/gameStore.ts`

**完整代码:**

```typescript
import { create } from 'zustand'

export interface PlayerStats {
  hp: number
  maxHp: number
  energy: number
  maxEnergy: number
  shield: number
  maxShield: number
  attack: number
  defense: number
  score: number
  combo: number
  comboTimer: number
}

export interface WeaponState {
  type: 'melee' | 'ranged'
  meleeCooldown: number
  rangedCooldown: number
  rangedAmmo: number
  maxAmmo: number
}

interface GameStore {
  player: PlayerStats
  weapon: WeaponState
  targetId: string | null
  damageNumbers: { id: string; value: number; position: [number, number, number]; born: number }[]

  // Actions
  takeDamage: (amount: number) => void
  dealDamage: (targetId: string, amount: number, position: [number, number, number]) => void
  useEnergy: (amount: number) => boolean
  regenEnergy: (dt: number) => void
  addCombo: () => void
  resetCombo: () => void
  tickCombo: (dt: number) => void
  fireRanged: () => boolean
  setTarget: (id: string | null) => void
  clearDamageNumber: (id: string) => void
  resetPlayer: () => void
}

const initialStats: PlayerStats = {
  hp: 1000, maxHp: 1000,
  energy: 100, maxEnergy: 100,
  shield: 200, maxShield: 200,
  attack: 50, defense: 10,
  score: 0, combo: 0, comboTimer: 0,
}

const initialWeapon: WeaponState = {
  type: 'melee',
  meleeCooldown: 0,
  rangedCooldown: 0,
  rangedAmmo: 30,
  maxAmmo: 30,
}

export const useGameStore = create<GameStore>((set, get) => ({
  player: { ...initialStats },
  weapon: { ...initialWeapon },
  targetId: null,
  damageNumbers: [],

  takeDamage: (amount) => set((s) => {
    const dmg = Math.max(1, amount - s.player.defense)
    const shieldAfter = Math.max(0, s.player.shield - dmg)
    const hpDmg = shieldAfter === 0 ? dmg - s.player.shield : 0
    return {
      player: {
        ...s.player,
        shield: shieldAfter,
        hp: Math.max(0, s.player.hp - Math.max(0, hpDmg)),
      }
    }
  }),

  dealDamage: (targetId, amount, position) => set((s) => ({
    damageNumbers: [
      ...s.damageNumbers,
      { id: `${Date.now()}-${Math.random()}`, value: amount, position, born: Date.now() }
    ].slice(-20)
  })),

  useEnergy: (amount) => {
    const { player } = get()
    if (player.energy < amount) return false
    set((s) => ({ player: { ...s.player, energy: s.player.energy - amount } }))
    return true
  },

  regenEnergy: (dt) => set((s) => ({
    player: { ...s.player, energy: Math.min(s.player.maxEnergy, s.player.energy + 15 * dt) }
  })),

  addCombo: () => set((s) => ({
    player: { ...s.player, combo: s.player.combo + 1, comboTimer: 3 }
  })),

  resetCombo: () => set((s) => ({ player: { ...s.player, combo: 0 } })),

  tickCombo: (dt) => set((s) => {
    if (s.player.comboTimer <= 0 && s.player.combo > 0) return { player: { ...s.player, combo: 0 } }
    return { player: { ...s.player, comboTimer: Math.max(0, s.player.comboTimer - dt) } }
  }),

  fireRanged: () => {
    const { weapon } = get()
    if (weapon.rangedAmmo <= 0) return false
    set((s) => ({ weapon: { ...s.weapon, rangedAmmo: s.weapon.rangedAmmo - 1 } }))
    return true
  },

  setTarget: (id) => set({ targetId: id }),

  clearDamageNumber: (id) => set((s) => ({
    damageNumbers: s.damageNumbers.filter((d) => d.id !== id)
  })),

  resetPlayer: () => set({ player: { ...initialStats }, weapon: { ...initialWeapon } }),
}))
```

**Step 1: 创建文件，粘贴上述代码**

**Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | head -5
```
Expected: 无错误

**Step 3: Commit**

```bash
git add src/stores/gameStore.ts && git commit -m "feat: add game state store with player stats"
```

---

### Task 1.3: 近战攻击 — 挥拳动画 + 碰撞检测

**Objective:** 按鼠标左键/J键触发近战攻击，机甲手臂有挥拳动画，前方扇形区域造成伤害。

**Files:**
- Create: `src/combat/MeleeAttack.ts`
- Modify: `src/Player.tsx` — 添加攻击逻辑和动画
- Modify: `src/MechaModel.tsx` — 添加手臂挥击动画

**完整代码 — `src/combat/MeleeAttack.ts`:**

```typescript
import * as THREE from 'three'

export interface MeleeHit {
  damage: number
  knockback: THREE.Vector3
}

// 扇形区域伤害检测
export function checkMeleeHit(
  attackerPos: THREE.Vector3,
  attackerForward: THREE.Vector3,
  attackerRotY: number,
  targetPos: THREE.Vector3,
  range: number = 3.5,
  arc: number = Math.PI / 3, // 60度扇形
): MeleeHit | null {
  const toTarget = new THREE.Vector3().subVectors(targetPos, attackerPos)
  const distance = toTarget.length()
  if (distance > range || distance < 0.1) return null

  // 计算角度差
  const angleToTarget = Math.atan2(toTarget.x, toTarget.z)
  let angleDiff = angleToTarget - attackerRotY
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

  if (Math.abs(angleDiff) > arc / 2) return null

  const damage = 50 + Math.random() * 30
  const knockback = toTarget.clone().normalize().multiplyScalar(10)

  return { damage: Math.round(damage), knockback }
}
```

**修改 `src/Player.tsx` — 添加攻击输入和逻辑:**

在Player组件的useFrame中添加攻击处理。需要：
1. 新增attackState ref
2. 监听鼠标左键 / J键
3. 攻击冷却0.4秒
4. 攻击时触发手臂动画
5. 对范围内敌人做碰撞检测

在 `src/MechaModel.tsx` 中：
1. 暴露leftArm和rightArm的ref
2. useFrame中根据attackState做挥击旋转动画
3. 三连击：左拳→右拳→双手合击

**Step 1: 创建 MeleeAttack.ts**

**Step 2: 修改 MechaModel.tsx — 给手臂添加动画ref**

```typescript
// 在MechaModel中新增props
interface MechaModelProps {
  color?: string
  leftArmRef?: React.RefObject<THREE.Group>
  rightArmRef?: React.RefObject<THREE.Group>
  attackPhase?: number // 0=idle, 1=left swing, 2=right swing, 3=double
}

// 左臂group加上ref={leftArmRef}，右臂group加上ref={rightArmRef}
// useFrame中根据attackPhase做旋转：
// leftArmRef.current.rotation.x = Math.sin(...) * 1.5 (挥拳弧度)
```

**Step 3: 修改 Player.tsx — 集成近战**

```typescript
// 新增refs
const leftArmRef = useRef<THREE.Group>(null)
const rightArmRef = useRef<THREE.Group>(null)
const attackState = useRef({ phase: 0, comboCount: 0, lastAttack: 0, active: false })

// 在useFrame中添加：
const meleeInput = keys['KeyJ'] || mouseLeftDown
if (meleeInput && now - attackState.current.lastAttack > 0.4) {
  attackState.current.comboCount = (attackState.current.comboCount % 3) + 1
  attackState.current.phase = attackState.current.comboCount
  attackState.current.lastAttack = now
  attackState.current.active = true
  // 对所有敌人检测碰撞
  enemies.forEach(enemy => {
    const hit = checkMeleeHit(g.position, forwardDir, g.rotation.y, enemy.position)
    if (hit) {
      enemy.takeDamage(hit.damage, hit.knockback)
      store.dealDamage(enemy.id, hit.damage, enemy.position)
      store.addCombo()
    }
  })
}
// 冷却后恢复idle
if (now - attackState.current.lastAttack > 0.3 && attackState.current.active) {
  attackState.current.phase = 0
  attackState.current.active = false
}
```

**Step 4: 浏览器验证**
- 启动dev server
- 按J或鼠标左键，机甲手臂应该挥动
- 如果附近有目标（暂用测试box）会显示伤害数字

**Step 5: Commit**

```bash
git add src/combat/ src/MechaModel.tsx src/Player.tsx
git commit -m "feat: melee attack with combo animation + arc hit detection"
```

---

### Task 1.4: 远程射击 — 射线检测 + 子弹特效

**Objective:** 按鼠标右键/K键发射能量弹，有弹道特效，命中后造成伤害。

**Files:**
- Create: `src/combat/Projectile.tsx`
- Modify: `src/Player.tsx`
- Modify: `src/stores/gameStore.ts` — 添加projectiles数组

**完整代码 — `src/combat/Projectile.tsx`:**

```typescript
import * as THREE from 'three'

export interface ProjectileData {
  id: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  damage: number
  ownerId: 'player' | 'enemy'
  lifetime: number
  mesh?: THREE.Mesh
}

export function createProjectile(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  damage: number,
  ownerId: 'player' | 'enemy' = 'player',
): ProjectileData {
  return {
    id: `${ownerId}-${Date.now()}-${Math.random()}`,
    position: origin.clone(),
    velocity: direction.clone().normalize().multiplyScalar(60), // 60 units/sec
    damage,
    ownerId,
    lifetime: 2.0, // 2秒后消失
  }
}

export function updateProjectile(p: ProjectileData, dt: number): boolean {
  p.position.addScaledVector(p.velocity, dt)
  p.lifetime -= dt
  return p.lifetime > 0 // 返回false表示应移除
}

// 球体碰撞检测
export function checkProjectileHit(
  p: ProjectileData,
  targetPos: THREE.Vector3,
  targetRadius: number = 2.0,
): boolean {
  return p.position.distanceTo(targetPos) < targetRadius
}
```

**修改 Player.tsx — 添加射击逻辑:**

```typescript
const projectilesRef = useRef<ProjectileData[]>([])
const fireState = useRef({ lastFire: 0 })

// 在useFrame中：
const rangedInput = keys['KeyK'] || mouseRightDown
if (rangedInput && now - fireState.current.lastFire > 0.15 && store.fireRanged()) {
  fireState.current.lastFire = now
  const origin = new THREE.Vector3(g.position.x, g.position.y + 2, g.position.z)
  const dir = forwardDir.clone()
  projectilesRef.current.push(createProjectile(origin, dir, 40))
}

// 更新所有子弹
projectilesRef.current = projectilesRef.current.filter(p => {
  const alive = updateProjectile(p, dt)
  if (alive) {
    // 检测命中敌人
    for (const enemy of enemies) {
      if (checkProjectileHit(p, enemy.position)) {
        enemy.takeDamage(p.damage)
        store.dealDamage(enemy.id, p.damage, enemy.position)
        return false // 子弹消失
      }
    }
  }
  return alive
})
```

**创建子弹渲染组件 `src/ProjectileRenderer.tsx`:**

```typescript
// 用instancedMesh或单独mesh渲染每个子弹
// 子弹外观：发光球体 + 拖尾效果
```

**Step 4: 浏览器验证**
- 按K/右键发射蓝色能量弹
- 子弹有发光拖尾
- 命中目标时显示伤害数字

**Step 5: Commit**

```bash
git add src/combat/Projectile.tsx src/ProjectileRenderer.tsx src/Player.tsx
git commit -m "feat: ranged energy projectiles with trail effects"
```

---

### Task 1.5: 目标锁定系统

**Objective:** 按Tab/Q键锁定最近的敌人，相机自动转向目标，锁定框UI显示。

**Files:**
- Create: `src/combat/TargetLock.tsx`
- Modify: `src/Player.tsx`
- Modify: `src/Game.tsx` — HUD锁定标记

**核心逻辑:**

```typescript
// 锁定逻辑：找前方最近的敌人
function findLockTarget(
  playerPos: THREE.Vector3,
  playerForward: THREE.Vector3,
  enemies: Enemy[],
  maxDist: number = 25,
  maxAngle: number = Math.PI / 2,
): Enemy | null {
  let best: Enemy | null = null
  let bestScore = Infinity
  for (const e of enemies) {
    const to = new THREE.Vector3().subVectors(e.position, playerPos)
    const dist = to.length()
    if (dist > maxDist) continue
    const angle = to.angleTo(playerForward)
    if (angle > maxAngle) continue
    // 综合评分：距离 + 角度
    const score = dist + angle * 5
    if (score < bestScore) { bestScore = score; best = e }
  }
  return best
}
```

**HUD锁定框 — 在Game.tsx中:**

```tsx
// 锁定标记跟随目标在屏幕上的投影位置
{lockedTarget && (
  <div style={{
    position: 'absolute',
    left: screenPos.x, top: screenPos.y,
    transform: 'translate(-50%, -50%)',
    border: '2px solid #ff4444',
    width: 60, height: 60,
    // 四个角的L型标记
  }}>
    {/* 四角L型标记 */}
  </div>
)}
```

**Step 4: 浏览器验证**
- 放一个测试敌人
- 按Tab锁定，出现红色锁定框
- 相机轻微转向目标

**Step 5: Commit**

```bash
git add src/combat/TargetLock.tsx src/Player.tsx src/Game.tsx
git commit -m "feat: target lock-on system with HUD indicator"
```

---

### Task 1.6: 伤害数字飘字

**Objective:** 击中敌人时，伤害数字从命中点浮起淡出。

**Files:**
- Create: `src/ui/DamageNumbers.tsx`
- Modify: `src/Game.tsx`

**核心逻辑:**

```tsx
// 从3D坐标投影到屏幕坐标
function worldToScreen(worldPos: THREE.Vector3, camera: THREE.Camera) {
  const vec = worldPos.clone().project(camera)
  return {
    x: (vec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-vec.y * 0.5 + 0.5) * window.innerHeight,
  }
}

// 渲染飘字
function DamageNumbers() {
  const damageNumbers = useGameStore(s => s.damageNumbers)
  const { camera } = useThree()
  return (
    <div className="damage-layer">
      {damageNumbers.map(d => {
        const age = (Date.now() - d.born) / 1000
        const opacity = Math.max(0, 1 - age / 1.5)
        const yOffset = age * 80
        const screen = worldToScreen(new THREE.Vector3(...d.position), camera)
        return (
          <div key={d.id} style={{
            position: 'absolute', left: screen.x, top: screen.y - yOffset,
            opacity, fontSize: 28, fontWeight: 'bold', color: '#ffdd00',
            textShadow: '2px 2px 0 #000, 0 0 10px rgba(255,200,0,0.8)',
            pointerEvents: 'none',
            transform: `translate(-50%,-50%) scale(${1 + age * 0.3})`,
          }}>
            {d.value}
          </div>
        )
      })}
    </div>
  )
}
```

**Step 4: 浏览器验证**
- 对目标造成伤害
- 金色数字飘起淡出

**Step 5: Commit**

```bash
git add src/ui/DamageNumbers.tsx src/Game.tsx
git commit -m "feat: floating damage numbers with 3D-to-2D projection"
```

---

### Task 1.7: 攻击特效（冲击波 + 粒子）

**Objective:** 近战命中和子弹命中时产生视觉冲击。

**Files:**
- Create: `src/effects/ImpactEffect.tsx`

**核心效果:**
- 近战命中：白色冲击波 ring + 火花粒子
- 子弹命中：蓝色能量爆裂

```tsx
export function ImpactEffect({ position, type }: { position: [number,number,number], type: 'melee'|'energy' }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const [age, setAge] = useState(0)

  useFrame((_, dt) => {
    setAge(a => a + dt)
    if (ringRef.current) {
      const s = 1 + age * 8
      ringRef.current.scale.set(s, s, s)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 1 - age * 3)
    }
  })

  if (age > 0.5) return null

  return (
    <mesh ref={ringRef} position={position}>
      <ringGeometry args={[0.3, 0.5, 16]} />
      <meshBasicMaterial color={type === 'melee' ? '#ffffff' : '#00ffff'} transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  )
}
```

**Step 4: 浏览器验证**

**Step 5: Commit**

```bash
git add src/effects/ImpactEffect.tsx
git commit -m "feat: impact effects for melee and energy hits"
```

---

### Task 1.8: 完整战斗HUD

**Objective:** 左下角血条+护盾+能量条，右下角技能图标，连击计数器。

**Files:**
- Create: `src/ui/BattleHUD.tsx`
- Modify: `src/Game.tsx`

**HUD元素:**

```
┌─────────────────────────────────────────┐
│  MECHA WORLD             RYZER-X 87%    │
│                                          │
│                                          │
│           [3D战斗场景]                    │
│                                          │
│                                          │
│  ┌─HP────┐              ┌─技能──┐        │
│  │████████│  COMBO x12   │ [拳] [射] │    │
│  │██░░░░░░│  能量条       │ [闪] [大] │    │
│  └────────┘              └────────┘    │
└─────────────────────────────────────────┘
```

```tsx
// 血条用CSS渐变，护盾用蓝色覆盖层
// 连击计数器在画面中央偏上，大号金色数字，带缩放动画
// 能量条用蓝色充能条，技能可用时图标亮起
```

**Step 4: 浏览器验证**

**Step 5: Commit**

```bash
git add src/ui/BattleHUD.tsx src/Game.tsx
git commit -m "feat: complete battle HUD with HP/shield/energy/combo"
```

---

## Phase 2: 敌人AI系统

**目标:** 放出多种敌方机甲，有AI行为，能对玩家造成威胁，有Boss战。

### Task 2.1: 敌人基类组件

**Objective:** 创建可复用的敌方机甲组件，带血量、状态机、受击反馈。

**Files:**
- Create: `src/enemies/EnemyModel.tsx` — 红色敌机甲（复用MechaModel结构换色）
- Create: `src/enemies/EnemyLogic.ts` — 状态机：idle/patrol/chase/attack/stagger/dead

**状态机设计:**

```typescript
type EnemyState = 'idle' | 'patrol' | 'alert' | 'chase' | 'attack_melee' | 'attack_ranged' | 'stagger' | 'dead'

interface EnemyEntity {
  id: string
  type: 'grunt' | 'soldier' | 'elite' | 'boss'
  position: THREE.Vector3
  rotation: number
  hp: number
  maxHp: number
  state: EnemyState
  stateTimer: number
  attackCooldown: number
  patrolTarget: THREE.Vector3 | null
  staggerTime: number
  // 属性
  moveSpeed: number
  detectRange: number
  attackRange: number
  damage: number
}
```

**Step 1-5: 创建组件 → 验证编译 → Commit**

---

### Task 2.2: 巡逻 + 发现玩家 + 追击

**Objective:** 敌人在区域内巡逻，发现玩家后追击。

**核心逻辑:**

```typescript
// 在EnemySystem的useFrame中：
function updateEnemy(e: EnemyEntity, playerPos: THREE.Vector3, dt: number) {
  const distToPlayer = e.position.distanceTo(playerPos)

  switch (e.state) {
    case 'idle':
      // 等待 → 切换patrol
      if (e.stateTimer <= 0) {
        e.state = 'patrol'
        e.patrolTarget = randomPointInRadius(e.spawnPos, 10)
      }
      break
    case 'patrol':
      // 移动到巡逻点
      if (e.patrolTarget) {
        moveTowards(e, e.patrolTarget, e.moveSpeed * 0.3, dt)
        if (e.position.distanceTo(e.patrolTarget) < 1) {
          e.state = 'idle'
          e.stateTimer = 2 + Math.random() * 3
        }
      }
      // 检测玩家
      if (distToPlayer < e.detectRange) {
        e.state = 'chase'
      }
      break
    case 'chase':
      moveTowards(e, playerPos, e.moveSpeed, dt)
      if (distToPlayer < e.attackRange) {
        e.state = e.type === 'soldier' || e.type === 'elite' ? 'attack_ranged' : 'attack_melee'
      }
      if (distToPlayer > e.detectRange * 1.5) {
        e.state = 'patrol'
      }
      break
    // ...
  }
}
```

---

### Task 2.3: 敌人攻击 + 玩家受击

**Objective:** 敌人能近战或射击玩家，玩家被击中掉血+后退+屏幕红闪。

**核心逻辑:**
- 敌人攻击有前摇动画（0.3秒）
- 命中后：store.takeDamage(), 玩家位置被击退, 屏幕边缘红色vignette闪烁
- 玩家HP到0 → 死亡动画 + 复活界面

---

### Task 2.4: 敌人死亡 + 掉落

**Objective:** 敌人被击败时爆炸特效 + 掉落能量碎片。

**效果:**
- 死亡爆炸：粒子四散 + 模型碎裂
- 掉落：能量碎片（金色光球），玩家靠近自动吸收，恢复能量/加分

---

### Task 2.5: Boss战

**Objective:** 设计一个大型Boss机甲，多阶段，特殊技能。

**Boss设计:**
- 体型是普通敌人的3倍
- HP: 5000
- 阶段1 (100%-60%)：近战砸地（AOE范围伤害）+ 冲撞
- 阶段2 (60%-30%)：召唤小怪 + 弹幕散射
- 阶段3 (30%-0%)：狂暴，全屏AOE + 追踪弹
- 死亡：大爆炸 + 大量掉落 + Boss专属BGM停止

---

### Task 2.6: 敌人生成器

**Objective:** 可配置的刷怪系统，控制难度曲线。

**Files:**
- Create: `src/enemies/Spawner.tsx`

**功能:**
- 定义刷怪点（位置 + 类型 + 数量 + 刷新间隔）
- 区域触发：玩家进入某区域时激活
- 限制同屏最大敌人数（性能控制）

---

## Phase 3: 触屏操控

**目标:** 手机上用虚拟摇杆 + 技能按钮流畅操作。

### Task 3.1: 虚拟摇杆（移动）

**Files:**
- Create: `src/controls/TouchJoystick.tsx`

**设计:**
- 左半屏触摸 → 出现摇杆（动态位置，touchstart在哪摇杆就在哪）
- 摇杆输出归一化向量 {x: -1~1, y: -1~1}
- 替代WASD输入
- 死区：0.15以内不响应

---

### Task 3.2: 触屏技能按钮

**Files:**
- Create: `src/controls/TouchButtons.tsx`

**设计:**
- 右下角4个圆形按钮：攻击 / 射击 / 闪避 / 大招
- 按钮有冷却遮罩动画
- 长按射击连发
- 大招需要能量满

---

### Task 3.3: 触屏视角控制

**Objective:** 右半屏拖拽控制相机旋转（替代鼠标）。

**逻辑:**
- 右半屏touchmove → 旋转相机角度
- 与左半屏摇杆不冲突（touch identifier区分）

---

### Task 3.4: 自适应UI

**Objective:** 根据设备类型自动切换控制方式。

```typescript
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
// PC: 显示WASD提示
// Mobile: 显示虚拟摇杆+按钮
```

---

## Phase 4: 世界扩展

**目标:** 从一个场景扩展为可探索的开放世界。

### Task 4.1: 大地图地形

**Files:**
- Create: `src/world/Terrain.tsx`

**设计:**
- 使用@react-three/drei的`Terrain`或自定义高度图
- 256x256分辨率高度图，用噪声函数生成起伏
- 多区域：平原、峡谷、废墟城区、能量矿区
- 贴图混合：草地、岩石、金属地面

---

### Task 4.2: 分区加载

**Objective:** 只渲染玩家附近的区域，远处卸载。

**Files:**
- Create: `src/world/ChunkLoader.tsx`

**逻辑:**
- 地图分64x64的chunk
- 每帧检查玩家所在chunk，加载周围3x3的chunk
- 远处的建筑、敌人、资源点卸载
- 用React.lazy + Suspense异步加载

---

### Task 4.3: 兴趣点（POI）

**Objective:** 地图上分布任务点、宝箱、商店、Boss区域。

**Files:**
- Create: `src/world/POI.tsx`
- Modify: `src/Game.tsx` — 小地图

**POI类型:**
- 任务NPC（感叹号标记）
- 宝箱（可开启获得装备/货币）
- 商店（购买/升级）
- Boss入口（触发Boss战）
- 传送点（解锁后可快速旅行）

---

### Task 4.4: 小地图

**Files:**
- Create: `src/ui/Minimap.tsx`

**设计:**
- 右上角圆形小地图
- 显示玩家位置（箭头）+ 敌人（红点）+ POI（图标）
- 旋转跟随玩家朝向

---

### Task 4.5: 天气系统 + 昼夜循环

**Files:**
- Create: `src/world/Weather.tsx`

**功能:**
- 昼夜循环：太阳位置变化 → 天空颜色变化 → 灯光颜色/强度变化
- 天气：晴天 / 多云 / 沙尘暴（降低能见度） / 能量雨（恢复能量）
- 过渡平滑（lerp颜色和强度）

---

### Task 4.6: 环境音效

**Files:**
- Create: `src/audio/AudioManager.ts`

**功能:**
- 背景音乐（区域不同BGM不同）
- 风声环境音
- 战斗音效：挥拳、射击、爆炸、金属碰撞
- UI音效：按钮、升级、拾取

---

## Phase 5: RPG系统

**目标:** 让玩家有成长感，能变强，有动力继续玩。

### Task 5.1: 经验值 + 等级

**Files:**
- Modify: `src/stores/gameStore.ts`
- Create: `src/rpg/LevelSystem.ts`

**设计:**
- 击杀敌人获得XP
- 升级公式：xpForNext = 100 * level^1.5
- 升级时：满血+提升属性+升级特效（金色光柱）

---

### Task 5.2: 装备系统

**Files:**
- Create: `src/rpg/Equipment.ts`
- Create: `src/ui/InventoryScreen.tsx`

**装备槽:**
- 武器（影响攻击力 + 技能）
- 装甲（影响防御 + HP）
- 核心（影响能量 + 技能CD）
- 推进器（影响移动速度 + 闪避）

**品质:**
- 白(普通) → 绿(优秀) → 蓝(稀有) → 紫(史诗) → 金(传说)

---

### Task 5.3: 技能树

**Files:**
- Create: `src/rpg/SkillTree.tsx`

**三条路线:**
- 攻击系：连击强化、暴击、新招式
- 防御系：护盾强化、反伤、格挡
- 特殊系：飞行强化、时间减速、能量爆发

---

### Task 5.4: 背包系统

**Files:**
- Modify: `src/ui/InventoryScreen.tsx`

**功能:**
- 网格背包（类似原神）
- 装备对比（当前 vs 选中）
- 装备锁定/分解
- 消耗品使用

---

### Task 5.5: 任务系统

**Files:**
- Create: `src/rpg/QuestSystem.ts`

**任务类型:**
- 主线：推进剧情
- 支线：讨伐、收集、护送
- 日常：每天刷新，给货币

---

## Phase 6: 商业化

**目标:** 游戏能赚钱。

### Task 6.1: 货币系统

**Files:**
- Create: `src/stores/economyStore.ts`

**货币:**
- 金币（游戏内获取，买普通物品）
- 晶钻（付费货币，抽卡/买高级物品）
- 肾上腺素/体力（限制每日游玩量）

---

### Task 6.2: 抽卡系统

**Files:**
- Create: `src/gacha/GachaSystem.tsx`
- Create: `src/ui/GachaScreen.tsx`

**设计:**
- 单抽 / 十连抽
- 保底机制：90抽保底SSR，每10抽保底SR
- 抽卡动画：机甲从光柱中浮现 → 稀有度颜色 → 揭晓
- 概率公示（合规要求）

---

### Task 6.3: 商店

**Files:**
- Create: `src/ui/ShopScreen.tsx`

**商品:**
- 月卡（30天每日晶钻）
- 体力恢复
- 装备包
- 皮肤（机甲外观）

---

### Task 6.4: 内购对接

**Files:**
- Create: `src/iap/IAPManager.ts`

**平台:**
- Google Play Billing (Android)
- Apple StoreKit (iOS)
- Capacitor插件：@capacitor-community/in-app-purchases

---

### Task 6.5: 广告系统

**Files:**
- Create: `src/ads/AdManager.ts`

**广告类型:**
- 激励视频：看完复活/双倍掉落/免费抽卡
- 插屏：关卡切换时
- 横幅：（可选，不推荐影响体验）

---

## Phase 7: 移动端优化 + 上架

**目标:** 手机上流畅运行，打包上架。

### Task 7.1: 性能优化

**优化点:**
-LOD (Level of Detail)：远处模型降面
- InstancedMesh：相同物体批量渲染
- 贴图压缩：Basis Universal / KTX2
- 阴影：只渲染近距离阴影，远距离关闭
- Draw Call优化：合并材质
- 目标：中端手机30fps稳定

---

### Task 7.2: Capacitor打包

**Files:**
- Modify: `capacitor.config.ts`

**步骤:**
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npx cap init "MECHA WORLD" "com.mecha.world"
npm run build
npx cap add android
npx cap add ios
npx cap sync
npx cap open android  # 用Android Studio打开
npx cap open ios      # 用Xcode打开
```

---

### Task 7.3: 触屏操作适配

- 全面屏适配（safe-area-inset）
- 不同分辨率自适应
- 横屏锁定（manifest.json）

---

### Task 7.4: 上架准备

- 应用图标 + 启动画面
- 应用描述 + 截图（需要吸引人）
- 分级问卷
- 隐私政策页面
- Google Play: 一次性 $25 注册费
- App Store: 年费 $99

---

## 执行规则

1. **逐Phase执行**：完成一个Phase验证通过后再进入下一个
2. **每个Task完成后commit**：保持频繁提交
3. **浏览器验证**：每个Task完成后截图给用户看效果
4. **用户确认制**：Phase完成后等用户说"继续"才进入下一Phase
5. **不改已完成Phase的代码**：有问题在该Phase内修，不回滚

---

## 文件结构预览（最终）

```
src/
├── App.tsx
├── Game.tsx              # 主入口，组装所有系统
├── stores/
│   ├── gameStore.ts      # 玩家状态
│   ├── economyStore.ts   # 经济系统
│   └── worldStore.ts     # 世界状态
├── combat/
│   ├── MeleeAttack.ts
│   ├── Projectile.tsx
│   ├── TargetLock.tsx
│   └── EnemyCombat.ts
├── enemies/
│   ├── EnemyModel.tsx
│   ├── EnemyLogic.ts
│   ├── Spawner.tsx
│   └── Boss.tsx
├── effects/
│   ├── ImpactEffect.tsx
│   ├── Explosion.tsx
│   └── ParticleSystem.tsx
├── controls/
│   ├── TouchJoystick.tsx
│   ├── TouchButtons.tsx
│   └── KeyboardControls.ts
├── world/
│   ├── Terrain.tsx
│   ├── ChunkLoader.tsx
│   ├── POI.tsx
│   ├── Weather.tsx
│   └── Minimap.tsx
├── ui/
│   ├── BattleHUD.tsx
│   ├── DamageNumbers.tsx
│   ├── InventoryScreen.tsx
│   ├── GachaScreen.tsx
│   └── ShopScreen.tsx
├── rpg/
│   ├── LevelSystem.ts
│   ├── Equipment.ts
│   ├── SkillTree.tsx
│   └── QuestSystem.ts
├── audio/
│   └── AudioManager.ts
├── gacha/
│   └── GachaSystem.tsx
├── iap/
│   └── IAPManager.ts
├── ads/
│   └── AdManager.ts
├── MechaModel.tsx        # 玩家机甲
├── Player.tsx            # 玩家控制器
└── Environment.tsx       # 基础场景
```
