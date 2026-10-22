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
  {
    version: "v12",
    title: "Settings, beats & references",
    items: [
      "Settings page with light / dark theme toggle (Account and Changelog moved here)",
      "Beats on series, seasons, and episodes — a lighter beat sheet above the outline cards, linkable to cards and episodes",
      "References: attach links and uploaded files (images, audio, video, PDF) to characters, world notes, beats, series, and seasons",
    ],
  },
  {
    version: "v13",
    title: "Mobile, search & safety pass",
    items: [
      "Mobile layout fixes: stacked idea rows, tighter padding, compact header, no more forced zoom lock",
      "General ideas no longer shows series- or season-level ideas",
      "Global search across projects, script text, ideas, characters, world notes, beats, and outline cards (press / anywhere)",
      "Quick-add idea button on every page (press i)",
      "Daily word goal with progress and streak on the dashboard",
      "Download-everything JSON backup",
      "Login rate limiting: 5 wrong PINs per email (or 20 per IP) locks sign-in for 15 minutes",
      "Confirm-before-delete everywhere, plus saved / failed toasts and loading skeletons",
      "Keyboard focus rings and higher-contrast secondary text",
    ],
  },
  {
    version: "v14",
    title: "Editor fixes & safety net",
    items: [
      "Enter on an empty cue/dialogue/transition line now converts it to Action instead of leaving an empty cue behind",
      "Typing INT./EXT./I/E at the start of an Action line auto-formats it as a scene heading; CUT TO: style lines become transitions",
      "Reports numbers unlocked scenes 1, 2, 3 (was showing 0A), and stray dialogue is no longer credited to the previous speaker",
      "Edit-conflict protection: saving from a stale tab or device is blocked, with Keep my version / Load the other copy, and the other copy is kept in version history",
      "Unsaved text is also kept on the device and offered back after a failed save, lost connection, or closed tab; failed saves retry automatically",
      "Cleaner editor toolbar (Export menu) and a visible script page; page titles now name the project and section",
      "Automated tests and a CI check (lint, types, tests, build) on every push",
    ],
  },
];

// Not built yet — discussed and agreed as direction, not a fixed commitment.
export const ROADMAP: string[] = [
  "Wire episode credits into the actual PDF / Fountain / FDX export output",
  "Backup as a zipped FDX + Fountain bundle, and embedding uploaded files (JSON backup exists today)",
  "Air order vs. production order for episodes",
  "Offline-first drafting (local queue, sync on reconnect)",
  "Read-only, watermarked share links for sending drafts to collaborators",
  "Character relationship map (visual graph)",
  "Structural gap-checks (a storyline thread that never resolves, an act with no midpoint)",
  "Story-order vs. chronological-order toggle for outline cards",
];
