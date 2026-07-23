# Contributing to PixelHub

Thank you for considering a contribution!

## Getting Started

1. Fork the repository.
2. Follow the [Development Setup](./docs/development/setup.md) guide (`corepack enable`, `pnpm install`, `pnpm dev`).
3. Skim the [System Overview](./docs/architecture/overview.md) and the [ADRs](./docs/adr/) so your change fits the existing design.

## What to Work On

- Check the open [GitHub Issues](https://github.com/mateuseap/pixelhub/issues).
- Feature requests are welcome. Open an issue to discuss before implementing anything large.
- Bug reports: include steps to reproduce, expected vs. actual behavior, and browser/OS.

## Branch Model

PixelHub uses a simple branch model. `main` is stable and deployable; all work happens on short-lived branches off `main`.

| Branch | Purpose | Merges into |
|--------|---------|-------------|
| `main` | Stable. Every push of code builds and publishes images. | (release target) |
| `feat/*` | New features. Branch from `main`. | `main` via PR |
| `fix/*` | Bug fixes. Branch from `main`. | `main` via PR |
| `docs/*` | Documentation only. | `main` via PR |
| `chore/*` | Deps, CI, tooling. | `main` via PR |
| `refactor/*` | Restructure with no behavior change. | `main` via PR |

```bash
# 1. Start from an up-to-date main
git checkout main && git pull origin main

# 2. Create your branch
git checkout -b feat/private-zones

# 3. Commit as you go (Conventional Commits)
git commit -m "feat(world): add private zone tiles"

# 4. Push and open a PR into main
git push -u origin feat/private-zones
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer: Closes #123]
```

| Type | When to use |
|------|-------------|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build system, deps, CI |
| `ci` | CI/CD pipeline changes |

Examples:

```
feat(voice): persist mic choice across refresh
fix(movement): clamp diagonal speed to match cardinal
docs: add full docs structure (ADRs, architecture, deployment)
test(shared): cover audio gain falloff edge cases
```

Do not add AI attribution or co-author footers.

## Code Style

- **TypeScript strict, no `any`.** Use `unknown` for untrusted input and narrow it; give exported functions explicit types.
- **Immutability.** Return new objects, do not mutate. The one exception is the Colyseus schema (`WorldState` / `Player`), where in-place assignment is the framework contract.
- **Pure shared core.** Deterministic, engine-agnostic logic (map, collision, movement, proximity, validation, rate limiting) lives in `@pixelhub/shared`. Never import Phaser, Colyseus, or LiveKit from `shared`.
- **Validate at the boundary.** All untrusted client input is sanitized and validated server-side.
- **Many small, focused files.** Keep files well under 800 lines; organize by feature.
- **No `console.log`** in production paths, and no secrets in code.

## Tests Are Required

PixelHub keeps a green suite (148 tests across shared, server, and client). Before pushing:

```bash
pnpm typecheck    # all three packages
pnpm test         # all three packages
pnpm -r build     # shared, server, client
```

- New behavior needs new tests. The deterministic core belongs in `@pixelhub/shared` unit tests; server behavior is covered with `@colyseus/testing` integration tests; client UI and voice are tested under jsdom (voice uses the LiveKit fake). See [docs/testing.md](./docs/testing.md).
- Do not weaken or delete a test to make a change pass; fix the implementation.

## Pull Request Process

1. Branch from `main` (`feat/*`, `fix/*`, `docs/*`, ...).
2. Ensure `pnpm typecheck`, `pnpm test`, and `pnpm -r build` all pass.
3. Confirm no secrets or `.env` files are committed.
4. Open a PR targeting `main`. Assign **@mateuseap** as reviewer.
5. Give the PR a clear title (Conventional Commits style) and a description with a **Summary** and a **Test plan**.
6. At least one maintainer review is required before merge.

## Reporting Security Issues

Do not open a public issue for a security vulnerability. Email `mateuseap@mateuseap.com` with details. See [docs/security/security.md](./docs/security/security.md).

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
