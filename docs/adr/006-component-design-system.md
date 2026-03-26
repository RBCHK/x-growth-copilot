# ADR-006: Component-based design system over CSS-only tokens

## Status

Accepted

## Context

6 pages had divergent styles for the same UI patterns: 3 different h1 styles, 3 section label styles, 7+ empty state variations, duplicated chart tooltips in 5 files. Style drift accumulated silently across PRs because there were no shared constraints.

## Decision

Enforce consistency via **shared React components** (`PageHeader`, `SectionLabel`, `EmptyState`, `ChartTooltip`) rather than CSS-only design tokens or a documentation-only style guide.

Rules documented in CLAUDE.md (short imperatives) + gotchas in `.claude/skills/gotchas/react/styling.md` (concrete "Tried → Broke → Fix" cases).

## Why not alternatives

- **CSS-only tokens / utility classes**: doesn't prevent structural divergence (padding, layout, icon placement). Components enforce structure + style together.
- **Storybook / design system package**: overkill for a single-app SaaS with one developer. Adds build complexity without proportional benefit.
- **PageTabsLayout abstraction** (shared sidebar+content): considered for Strategist + Settings, rejected — only 2 consumers with different sidebar content. Would be over-abstraction until a 3rd consumer appears.

## Consequences

- New pages must use `<PageHeader>` — no raw `<h1>`.
- Empty states must use `<EmptyState>` with size prop (compact/default/large).
- Section labels must use `<SectionLabel>` — no inline styled `<h2>`/`<span>`.
- Button heights only via shadcn `<Button>` size variants — no custom `h-` classes.
- Chart tooltips use shared `<ChartTooltip>` unless X-axis is non-date.
