# 🤖 MECHA WORLD

> A 3D open-world mecha action game built entirely with web technologies.
> Fight waves of enemies, explore a procedurally generated world, collect mechas, and unleash devastating ultimate attacks — all in your browser, optimized for mobile.

![TypeScript](https://img.shields.io/badge/TypeScript-~6.0-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-black?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-R3F-black?logo=threedotjs)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### Combat System
- **Melee + Ranged combat** — switch between sword slashes and energy projectiles on the fly
- **Combo system** — chain attacks for bonus damage with visual combo counter
- **Ultimate (OVERDRIVE)** — charge energy and unleash screen-shaking ultimate attacks
- **Shield + HP** — layered damage mitigation like modern action RPGs
- **Critical hits** — random crit chance with special damage number effects
- **Lock-on targeting** — auto-target nearest enemy

### Open World
- **Procedural terrain** — multi-biome landscape (plains, crystal fields, volcanic zones)
- **Dynamic day/night cycle** — sun position and lighting change in real-time
- **Weather system** — rain, storms, snow, and sandstorms with particle effects
- **Environment props** — trees, crystals, rocks, volcanic vents, ancient ruins (instanced rendering for performance)
- **Mini-map** — real-time radar showing enemies and points of interest
- **NPCs** — interactable characters in the world

### RPG Systems
- **Gacha system** — pull for mechas and equipment with rarity tiers (SSR/SR/R/N)
- **Mecha collection** — unlock and switch between multiple playable mechas
- **Inventory & equipment** — weapons, armor, cores with stats
- **Quest system** — objectives with rewards
- **Level progression** — XP, leveling, and stat growth
- **Daily login rewards** — streak-based reward system
- **Shop** — spend earned currency on items and pulls

### Mobile-First Design
- **Touch controls** — dual virtual joysticks (movement + camera), action buttons
- **Responsive UI** — HUD adapts to screen size, supports portrait and landscape
- **PWA support** — installable on mobile devices via manifest
- **Performance optimized** — instanced rendering, LOD system, object pooling

### Visual Effects
- **Particle system** — muzzle flashes, hit impacts, explosions, dust trails
- **Post-processing** — bloom, screen flashes, hit reactions
- **Damage numbers** — floating 3D-projected damage text with crit differentiation
- **Camera modes** — toggle between third-person (TPS) and first-person (FPS) views

---

## 🎮 Controls

### Desktop
| Action | Key |
|---|---|
| Move | WASD |
| Camera | Mouse |
| Melee Attack | J / Left Click |
| Ranged Attack | K / Right Click |
| Dash/Dodge | Space |
| Ultimate | R |
| Switch View (FPS/TPS) | V |
| Inventory | I |
| Quests | Q |
| Mecha Select | M |

### Mobile
- Left joystick: movement
- Right joystick: camera look
- Action buttons appear on right side (attack, shoot, dash, ult)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommend 20+)
- npm or pnpm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YTyangtao666/mecha-world.git
cd mecha-world

# Install dependencies
npm install

# Start dev server
npm run dev

# Open in browser
# → http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview   # Preview production build locally
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Rendering | **Three.js** via **React Three Fiber** (R3F) |
| Physics | **@react-three/rapier** (Rapier physics engine) |
| Framework | **React 19** + **TypeScript 6** |
| Build Tool | **Vite 8** (Oxc compiler) |
| State Management | **Zustand** |
| Linting | **Oxlint** |
| Helpers | **@react-three/drei** (Sky, useGLTF, etc.) |

---

## 📁 Project Structure

```
mecha-world/
├── src/
│   ├── combat/           # Combat logic (damage, projectiles, hit detection)
│   ├── controls/         # Touch input (virtual joysticks, action buttons)
│   ├── enemies/          # Enemy AI, models, spawning, rendering
│   ├── gacha/            # Gacha pulls, daily login, shop
│   ├── performance/      # LOD system, culling helpers
│   ├── rpg/              # Inventory, quests, level, mecha select
│   ├── stores/           # Zustand global state (gameStore, enemyStore)
│   ├── ui/               # Loading screen, settings panel
│   ├── world/            # Terrain, weather, day/night, props, minimap, NPCs
│   ├── App.tsx           # Root app component
│   ├── Game.tsx          # Main game canvas + scene composition
│   ├── Player.tsx        # Player controller (movement, camera, combat)
│   ├── MechaModel.tsx    # Player mecha 3D model
│   ├── BattleHUD.tsx     # In-game HUD overlay
│   ├── Effects.tsx       # Visual effects (particles, impacts)
│   └── main.tsx          # Entry point
├── public/               # Static assets (icons, manifest)
├── docs/                 # Design docs and roadmap
├── index.html            # HTML entry
└── package.json
```

---

## 🎯 Design Philosophy

1. **Web-first** — The entire game runs in the browser. No downloads, no engine install, no app store. Just open a URL and play.
2. **Mobile-first** — Every feature is designed to work on touch screens first, then enhanced for desktop.
3. **Performance-conscious** — Instanced rendering, object pooling, LOD culling. Target 60fps on mid-range phones.
4. **Modular architecture** — Each system (combat, world, RPG, gacha) is self-contained with clear interfaces.

---

## 📋 Roadmap

- [x] Core player controller (move, jump, dash, fly)
- [x] Melee + ranged combat
- [x] Enemy AI (patrol, chase, attack, stagger)
- [x] Boss enemies
- [x] Procedural terrain with biomes
- [x] Day/night cycle + weather
- [x] Gacha system
- [x] Inventory + equipment
- [x] Quest system
- [x] Touch controls
- [ ] Save/load system (localStorage → IndexedDB)
- [ ] Sound effects + music
- [ ] More mecha variants (unique models + abilities)
- [ ] Story mode with dungeons
- [ ] Co-op multiplayer
- [ ] Custom map editor

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Areas where help is especially appreciated:
- 3D modeling (Blender → glTF assets)
- Sound design (SFX + BGM)
- Level design
- Performance optimization
- Bug reports and feature requests

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

You are free to use, modify, and distribute this code, including for commercial purposes.

---

## 👤 Author

**YTyangtao666**
- GitHub: [@YTyangtao666](https://github.com/YTyangtao666)

---

⭐ If you like this project, give it a star!
