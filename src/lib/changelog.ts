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
  {
    version: "v15",
    title: "Mobile writing mode",
    items: [
      "Script text reflows at a readable size on phones instead of shrinking the whole page to 40%",
      "A format bar above the keyboard (Scene / Action / Char / Paren / Dial / Trans, plus Note, Omit and Dual) replaces the Tab key",
      "Compact toolbar: one Menu holds export, dialogue-only, read-aloud, lock and history; version history opens full-screen",
      "Enter works on Android keyboards that don't send a key event",
      "Outline cards and beats stack as a full-width vertical list on phones, with larger drag handles",
      "Read aloud stops when you leave the page",
    ],
  },
  {
    version: "v16",
    title: "App shell",
    items: [
      "Sidebar with your whole workspace: Today, the idea inbox (with a count), every series → season → episode, and standalone scripts — opens to wherever you are",
      "Jump-to palette (⌘K / Ctrl+K, or /): type to go straight to any script, series, season or episode, or fall through to full-text search",
      "Phone menu drawer replaces the cramped header links; the sidebar starts hidden on the writing page and remembers your choice",
      "Today home: continue writing, word goal, and a quick-add idea inbox",
      "Project tabs renamed Plan and Review",
      "Sidebar updates immediately when you add, archive or delete things",
    ],
  },
  {
    version: "v17",
    title: "Idea inbox",
    items: [
      "Ideas get #tags (type them as you capture), an optional title, and a status: Spark, Developing, Promoted or Archived",
      "Develop an idea into a new script (any format) or a new series in one click — the title and text carry over and the idea links to what it became",
      "Filter by status and tag, search titles and text, and flip on \"Include filed ideas\" to see every idea across all projects and series in one list",
      "Edit an idea's title, text and tags in place",
    ],
  },
  {
    version: "v18",
    title: "One Plan board",
    items: [
      "Beats and scene cards are now a single board: each beat is a column, and its scenes sit inside it. Scenes that aren't under a beat yet wait in an Unplanned column",
      "Drag scenes between beats and reorder beats; on a phone the beats stack and each scene has a Beat picker in its editor",
      "Beat templates — Three acts, Save the Cat (15 beats), Hero's journey, TV hour — add a ready-made set with guidance on each beat",
      "Existing beat-to-card links were carried over automatically (each scene lands under the first beat that pointed at it)",
      "An episode's Plan page lists the season-arc beats assigned to it",
      "Fixed: reordering cards and beats now verifies they belong to you",
    ],
  },
  {
    version: "v19",
    title: "Scene sync",
    items: [
      "Plan board ↔ script: scenes in the script that have no card get a one-click \"Add cards\"; each linked card shows the scene it points to, and flags it if the scene was deleted",
      "When the scene order differs between script and board, choose a direction: \"Match script to board\" (the current script is saved to version history first) or \"Match board to script\" (reorders scenes within each beat)",
      "New Scenes panel in the editor: every scene with its number, linked card and beat; click to jump, move scenes up or down, or add a card for a scene",
      "Fixed: on narrower screens the script page's white paper could end partway down the text",
    ],
  },
  {
    version: "v20",
    title: "Cast and locations from the script",
    items: [
      "Characters page: a panel lists who speaks in your script but isn't saved yet, with lines and scenes — add them one at a time or all at once (episodes can add to the episode or the series bible)",
      "World page: the same for locations used in scene headings, saved as Location notes",
      "Saved characters and locations show live script stats: scenes, lines, words, first appearance, INT/EXT and day/night",
      "In the editor, typing a character cue that isn't in your cast offers \"+ Add to your cast\" right there",
      "(V.O.), (O.S.) and (CONT'D) are now counted as the same character in reports",
    ],
  },
  {
    version: "v21",
    title: "Backup restore",
    items: [
      "Settings → Restore from a backup file: pick a Download-everything file and see exactly what it would add before anything changes",
      "\"Restore what's missing\" brings back only what's gone (scripts, series, ideas, characters, beats, drafts with their versions and comments) and leaves everything still there untouched; \"Add everything as copies\" imports the whole file next to what you have",
      "Restoring only ever adds — never overwrites or deletes — runs as a single step so a failure changes nothing, and never attaches to another account's data",
      "Fixed: deleting a script left its beats behind as unreachable leftovers; they're now deleted with the script, and existing leftovers are cleaned up",
    ],
  },
  {
    version: "v22",
    title: "Account security",
    items: [
      "Wrong-PIN lockout no longer lets anyone lock you out: tries are limited per account per network, a network that sprays many accounts is blocked, and devices you've signed in from before are exempt from the \"attacked from everywhere\" limit",
      "Sign-ups are limited per network, and changing your PIN limits wrong-PIN guesses too",
      "Email verification and \"Forgot your PIN?\" by email, built to switch on as soon as an email provider key is added — until then the app behaves as before; reset links work once, expire in an hour, and never reveal whether an address has an account",
      "Fixed: the log-in form no longer clears your email after a wrong PIN",
    ],
  },
  {
    version: "v23",
    title: "Passkeys",
    items: [
      "Sign in with a passkey — Face ID, a fingerprint, or your device's screen lock — from the log-in page, with no email or PIN to type",
      "Settings → Passkeys: add one for each phone or laptop, name them, see when each was last used, and remove any (your PIN keeps working as a backup)",
      "Each sign-in signs a fresh one-time challenge, so a passkey can't be guessed, phished, or replayed; a passkey only works on the site it was made for, and a cloned device is caught by its counter going backwards",
    ],
  },
  {
    version: "v24",
    title: "Scene cards, redesigned",
    items: [
      "Cards on the Plan board are now real index cards: scene heading (from the linked scene, or the location), title, what happens, the turn, character initials, storyline chip and emotion — nothing clipped to a title",
      "New \"turn\" field on every card: what changes in the scene (hope → doubt, a secret kept → exposed)",
      "Clicking a card opens a side panel to edit it (a full-screen sheet on a phone) instead of expanding the card in place, so the board doesn't jump around; Esc closes it and Ctrl/⌘+Enter saves",
      "The dot is the drag handle; a card flagged as pointing at a deleted scene shows it on its face",
      "Backup and restore, and search, include the new field",
    ],
  },
  {
    version: "v25",
    title: "Four ways to see your scenes",
    items: [
      "The Plan page has a view switcher — Board, Wall, Lanes and Outline — all showing the same cards; the one you choose is remembered for each script",
      "Wall: every scene in story order as a corkboard you can drag to reorder (dropping on a card also moves it into that card's beat), with small, medium and large cards",
      "Lanes: scenes across the page with a row per storyline or per character, under a beat header strip, so you can see where a thread or character goes quiet; click any cell to open the card",
      "Outline: the story as numbered text under each beat, with title, what happens and the turn editable in place",
      "Highlight a character, storyline or location in any view and every other card fades back",
    ],
  },
  {
    version: "v26",
    title: "Progress from your script",
    items: [
      "A progress strip on the Plan page: scenes written out of scenes planned, estimated script pages against a page target, and a bar for each beat showing how much of it is written and how many pages it holds",
      "Each scene card has a status — Idea, Started or Written. A card whose linked scene already has text in the script counts as started on its own; you mark it Written when it's done",
      "Cards linked to a scene show that scene's page count, so you can see which scenes are running long",
      "Set a page target per script in the project settings; blank uses the usual length for the format (110 for a feature, 55 for an hour pilot, 30 for a half-hour)",
      "Backup and restore include card status and the page target",
    ],
  },
  {
    version: "v27",
    title: "From card to scene and back",
    items: [
      "\"Start this scene in the script\" on a card makes the scene heading from the card's location, puts it in the script where the Plan board has the card, links it, and opens the script there",
      "In the script's Scenes panel, each scene's card expands to show what happens, the turn, its status, pages and characters, with a link that opens the card on the Plan page",
      "\"Update from scene\" on a card fills its location and characters from the script (who speaks in the scene); nothing changes until you save the card",
    ],
  },
  {
    version: "v28",
    title: "Print your outline",
    items: [
      "Plan > Print > Index cards: your scene cards as real 3×5 cards, four to a landscape sheet with cut guides, in story order — number, scene heading, title, what happens, the turn and who's in it, with the card's colour down the edge",
      "Plan > Print > Outline: the whole story as a one-page outline under its beats, shrinking the type to fit a page where it can (a long outline flows onto more pages)",
    ],
  },
  {
    version: "v29",
    title: "Season progress and arc coverage",
    items: [
      "The season page shows how much of the season is written: scenes written out of scenes planned across all episodes, pages against the episodes' targets, and a bar on each episode card",
      "Each season arc beat shows how far its assigned episode has got (not planned yet, planned, in progress, written), and a note lists arc beats no episode owns and episodes with no part of the arc",
      "Arc templates for a whole season: a four-part season, a mystery season, and an ensemble season of character arcs",
    ],
  },
];

// Not built yet — discussed and agreed as direction, not a fixed commitment.
export const ROADMAP: string[] = [
  "Wire episode credits into the actual PDF / Fountain / FDX export output",
  "Backup as a zipped FDX + Fountain bundle, and embedding uploaded files (JSON backup and restore exist today)",
  "Air order vs. production order for episodes",
  "Offline-first drafting (local queue, sync on reconnect)",
  "Sign out of all devices (and a session list), plus step-up checks before sensitive changes",
  "Read-only, watermarked share links for sending drafts to collaborators",
  "Character relationship map (visual graph)",
  "Structural gap-checks (a storyline thread that never resolves, an act with no midpoint)",
  "Story-order vs. chronological-order toggle for outline cards",
];
