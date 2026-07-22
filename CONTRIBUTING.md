# Contributing to Mecha World

Thanks for your interest in contributing! 🤖

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/mecha-world.git`
3. Install dependencies: `npm install`
4. Start dev server: `npm run dev`
5. Make your changes
6. Build to verify: `npm run build` (must pass with zero errors)

## Code Style

- **TypeScript strict mode** — all code must pass `tsc` with zero errors
- **No unused variables** — `noUnusedLocals` and `noUnusedParameters` are enabled
- **Functional React** — use hooks, avoid class components
- **Zustand for state** — keep state in stores, not in component props drilling
- **Inline styles** — the project uses React inline styles for game UI (no CSS framework)
- **2-space indentation** — see `.editorconfig`

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit with a clear message: `git commit -m "feat: add new mecha model"`
3. Push to your fork: `git push origin feature/your-feature-name`
4. Open a Pull Request with:
   - Description of what you changed
   - Screenshots/videos if visual
   - Any breaking changes noted

## Commit Message Convention

Use conventional commits:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring
- `perf:` — performance improvement
- `docs:` — documentation
- `chore:` — build/tooling

## Areas Needing Help

| Area | Description |
|---|---|
| 3D Models | Blender → glTF mecha models, enemy models, environment assets |
| Sound | SFX (hits, explosions, UI), BGM tracks |
| Level Design | Dungeon layouts, boss arenas, exploration content |
| Optimization | Draw call reduction, memory management, mobile perf |
| Testing | E2E browser testing, performance benchmarking |

## Reporting Bugs

Open a GitHub Issue with:
- Device + browser + OS
- Steps to reproduce
- Expected vs actual behavior
- Console errors (F12 → Console)

## Questions?

Open a GitHub Discussion or Issue. Happy coding! 🎮
