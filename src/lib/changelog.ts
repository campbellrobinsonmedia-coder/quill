export type ChangelogRelease = {
  version: string;
  title: string;
  items: string[];
};

// Shipped, in the order it actually happened.
export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "v1",
    title: "Foundation",
    items: [
      "Next.js app scaffolded, Postgres + Prisma set up",
      "Email/password login",
      "Project dashboard",
      "Idea capture (general inbox + project-linked)",
      "Character notes per project",
      "Drag-and-drop index-card outline board",
      "Prose and screenplay editor with autosave + draft version history",
      "Installable PWA",
      "First deployment to Vercel",
    ],
  },
  {
    version: "v2",
    title: "Screenwriter feature set",
    items: [
      "World / setting notes",
      "Character-name autocomplete in the script editor",
      "Fountain export",
      "Industry-standard PDF export",
      "Scene numbering (with lock support) and omitted scenes",
      "Revision colors and locked-page asterisks",
      "Dual dialogue",
      "Inline line comments",
      "Scene heading / location autocomplete",
      "Character, location, and scene reports",
      "Read-through mode and read-aloud",
      "Script version comparison",
      "Title page designer",
      "PDF watermarking",
      "Full Final Draft (FDX) import and export",
    ],
  },
  {
    version: "v3",
    title: "Production deployment",
    items: [
      "Live on Vercel with a real Postgres database",
      "GitHub-connected continuous deployment",
      "Deployment protection and AUTH_SECRET configuration issues resolved",
    ],
  },
  {
    version: "v4",
    title: "Low-friction login",
    items: ["Swapped email + password for a 4-digit PIN"],
  },
  {
    version: "v5",
    title: "Episodic & series planning",
    items: [
      "New Series → Season → Episode structure",
      "Series Bible: characters and world notes shared across every episode",
      "Season board for managing episodes",
      "Episode-specific credits (episode title, story by, teleplay by)",
      "Storyline thread tagging (A/B/C) on outline cards",
    ],
  },
  {
    version: "v6",
    title: "Project lifecycle & unified dashboard",
    items: [
      "Archive → permanent delete flow (delete only allowed after archiving, with confirmation)",
      "Series folded into the same dashboard as scripts, not a separate section",
    ],
  },
  {
    version: "v7",
    title: "Series & season-scoped ideas",
    items: [
      "A shared idea pool at the series level, optionally linkable down to a specific season or episode",
    ],
  },
  {
    version: "v8",
    title: "Reliability & mobile pass",
    items: [
      "Autosave flushes on navigation, retries on failure, and shows a real save timestamp",
      "Mobile layout: scrollable tab bar, larger touch targets, zoomable screenplay canvas, unlocked screen orientation",
      "Error and loading boundaries — a failed page shows a recoverable message instead of a crash screen",
      "Dashboard reorganized around a \"Continue writing\" shortcut",
      "Editor toolbar grouped and relabeled",
      "First-run onboarding wizard",
      "PIN change / recovery via an Account page",
    ],
  },
  {
    version: "v9",
    title: "Outline ↔ script linking",
    items: ["Outline cards can link to a specific scene in the draft and jump straight to it"],
  },
  {
    version: "v10",
    title: "Season-level planning tools",
    items: [
      "Storyline thread matrix — which threads appear in which episodes",
      "Per-episode status badges (Idea / Outlined / Drafted / Locked)",
      "Season-level arc/beat cards, separate from per-episode outlining",
      "One-page season pitch PDF export",
    ],
  },
  {
    version: "v11",
    title: "App changelog",
    items: ["This page — a running history of what's shipped and what's next"],
  },
];

// Not built yet — discussed and agreed as direction, not a fixed commitment.
export const ROADMAP: string[] = [
  "Rate limiting on login (close the brute-force gap the PIN recovery flow didn't address)",
  "Wire episode credits into the actual PDF / Fountain / FDX export output",
  "One-click backup — export every project as a zipped FDX + Fountain bundle",
  "Global search across projects, characters, and world notes (today search only covers Ideas)",
  "Air order vs. production order for episodes",
  "Daily writing goal / \"did I write today\" indicator",
  "Offline-first drafting (local queue, sync on reconnect)",
  "Read-only, watermarked share links for sending drafts to collaborators",
  "Character relationship map (visual graph)",
  "Structural gap-checks (a storyline thread that never resolves, an act with no midpoint)",
  "Story-order vs. chronological-order toggle for outline cards",
];
