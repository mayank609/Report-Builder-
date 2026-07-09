# BuildReport AI — Construction Report Generator

An AI-powered report generation module for a construction SaaS platform. Built as
a standalone feature module with no database or authentication — all data is
served from local JSON fixtures and LocalStorage, designed so the storage layer
can be swapped for real API/database calls later without touching any UI code.

## Tech Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui ·
React Hook Form · Zod · @dnd-kit · Framer Motion · Lucide React · Gemini API ·
Puppeteer

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/dashboard`.

### AI features

AI template generation and AI report writing call the Gemini API. Configure a
key either of these ways:

- Set `GEMINI_API_KEY` in `.env.local` (see `.env.example`) for a server-side
  default.
- Or enter a personal key in **Settings → Gemini API Key**, stored only in the
  browser's LocalStorage and sent as a request header to the app's own API
  routes.

If no key is configured anywhere, AI features fall back to a deterministic,
fully-functional local generator so the app remains usable out of the box.

## Architecture

- `app/` — routes and API endpoints (App Router)
- `components/ui/` — shadcn/ui primitives
- `components/layout/`, `components/shared/` — app shell and reusable UI
- `features/` — feature-scoped components, hooks, and logic (templates, reports, dashboard, settings)
- `services/` — the only layer allowed to read data; components never import `mock-data/` or `lib/storage.ts` directly
- `lib/storage.ts` — the only module that touches `localStorage`
- `lib/ai/` — Gemini client, prompts, and the local fallback generator
- `lib/pdf/report-html.ts` — builds the standalone HTML document used identically by the live preview (via `<iframe srcDoc>`) and the Puppeteer PDF export, so the PDF always matches the preview
- `mock-data/` — seed JSON fixtures for builders, contractors, projects, clients, engineers, reports, and templates
- `types/` — shared TypeScript types

Swapping LocalStorage/mock JSON for a real backend later only requires
rewriting the functions inside `services/*.ts` — no component changes needed.
