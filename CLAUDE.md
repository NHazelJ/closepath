# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000 (uses Turbopack)
npm run build    # Production build
npm run lint     # ESLint with Next.js core-web-vitals + TypeScript rules
```

There is no test suite configured yet.

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** (strict mode)
- **Tailwind CSS 4** — configured via `@import "tailwindcss"` in `globals.css`; CSS processing goes through `@tailwindcss/turbopack` (no `tailwind.config.*` file — v4 uses CSS-based config)
- Path alias `@/*` maps to `src/*`

## Architecture

This is an early-stage project scaffolded with `create-next-app`. All app code lives under `src/app/` using the Next.js App Router convention:

- `src/app/layout.tsx` — root layout; loads Geist/Geist Mono fonts via `next/font/google` and applies them as CSS variables (`--font-geist-sans`, `--font-geist-mono`)
- `src/app/page.tsx` — home route (`/`)
- `src/app/globals.css` — global styles; defines `--background`/`--foreground` CSS vars and dark-mode overrides via `@media (prefers-color-scheme: dark)`

`next.config.ts` enables `cacheComponents`, `partialPrefetching`, and Turbopack with the Tailwind CSS loader rule.

## Key notes

- `LayoutProps<"/">` is used in `layout.tsx` — this is a Next.js 16 typed layout prop
- ESLint flat config (`eslint.config.mjs`) uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`; run `npm run lint` to check
- No pages router, no `src/pages/` directory — App Router only
