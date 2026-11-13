// The in-app guide: one short explainer per page or feature. Each page shows its
// own under "How this page works", and /help lists them all.

export type HelpSection = {
  id: string;
  title: string;
  /** One or two sentences: what this page is for. */
  intro: string;
  points: string[];
};

export const HELP: HelpSection[] = [
  {
    id: "today",
    title: "Today",
    intro: "Your starting point: every active project and series, with archived work kept below.",
    points: [
      "Open a script, episode or series by clicking it.",
      "Quick capture (the + button) saves a stray idea to the Idea inbox without leaving what you're doing.",
      "Search or jump to… (top bar, or the keyboard shortcut) finds anything by name and moves you there.",
    ],
  },
  {
    id: "inbox",
    title: "Idea inbox",
    intro: "A place for loose lines, premises and images that don't belong to any project yet.",
    points: [
      "Add #tags as you type to find ideas later.",
      "An idea can be filed under a script or a series when it grows into one; \"All ideas\" shows every idea wherever it's filed.",
      "Nothing here is counted or printed. It's only for catching thoughts.",
    ],
  },
  {
    id: "plan",
    title: "Plan",
    intro:
      "Where a script's story is laid out as scene cards, before or while you write. Beats are the sections of the story (acts, sequences); scene cards sit under them.",
    points: [
      "Beats: add them one at a time or start from a beat template. Drag the ⋮⋮ grip to reorder. The ⋯ menu on a beat edits it, archives it or deletes it.",
      "Scene cards: type a title under \"+ Scene\", then click the card to add what happens, the turn (what changes), characters, location, storyline, colour and a status. Drag a card by its colour dot to reorder it or move it to another beat.",
      "Views: Board (columns), Wall (a corkboard of cards), Lanes (storylines or characters against scenes, to see where a thread goes quiet) and Outline (the whole story as editable text).",
      "Highlight dims every card except a character, storyline or location you pick.",
      "Progress: the strip under the toolbar reads your script and counts how many scenes are idea, started or written, and the page total against your page target (set in Settings).",
      "Scenes in the script: \"Start this scene in the script\" creates the heading and links it to the card. \"Update from scene\" pulls the location and speaking characters back into the card.",
      "Set aside: a scene you're not feeling, or want to test, can be set aside. It stays in place, greyed out and struck through, and drops out of the numbering, progress and printouts. Click \"Bring back\" to restore it. Nothing is deleted.",
      "Archive vs delete a beat: archiving puts the beat away with its scenes (they leave the board, counts and printouts) and you can restore it from \"Archived beats\" below the board. Deleting removes the beat for good and moves its scenes to Unplanned.",
      "Print: index cards (3×5, four to a sheet) or a one-page outline, both without set-aside scenes.",
      "In a series episode: \"Move to another episode\" in the card panel sends a card to a different episode of the series, and \"From the season arc\" lists the season beats assigned to this episode.",
    ],
  },
  {
    id: "storylines",
    title: "Storylines",
    intro:
      "A storyline is a label on a scene that says which thread of the story it belongs to: the A story, the B story, \"The heist\".",
    points: [
      "Type a letter (A, B, C) or a name in a card's Storyline field; earlier names are suggested. Capital and lower case count as the same storyline.",
      "\"Rename … everywhere\" in the card panel changes the name on every scene in the script that uses it.",
      "Lanes view shows one row per storyline. On a season, the Storylines & characters page shows which episodes each storyline appears in and flags gaps, so name them the same way across episodes.",
    ],
  },
  {
    id: "write",
    title: "Write",
    intro: "The script or prose editor.",
    points: [
      "Your work saves as you type, and earlier versions are kept so you can look back or compare.",
      "The Scenes panel lists the scenes in the script and links each to its card on the Plan page.",
      "Scene numbers can be locked once the script is going out for notes or production.",
      "Read aloud plays the script back to you.",
    ],
  },
  {
    id: "characters",
    title: "Characters",
    intro: "The people in this script, saved once so they can be linked to scene cards.",
    points: [
      "Add a description, arc notes and relationships for each character.",
      "The page also reads your script to show who speaks and how much, and offers to save anyone who speaks but isn't saved yet.",
      "In an episode, the series' recurring characters are shared and appear here too.",
    ],
  },
  {
    id: "world",
    title: "World",
    intro: "Locations, rules and lore for this script, kept as short notes you can group by category.",
    points: [
      "Matches settings from your scene headings against the notes you've saved.",
      "In an episode, notes shared by the whole series are available too.",
    ],
  },
  {
    id: "review",
    title: "Review",
    intro: "Reports read straight from your script: characters, locations and scenes.",
    points: [
      "Nothing to fill in. It updates as the script changes.",
      "Use it to check who has the most lines, where scenes are set, and how long each scene runs.",
    ],
  },
  {
    id: "project-ideas",
    title: "Ideas (in a project)",
    intro: "Ideas filed under this script or episode.",
    points: ["Same as the inbox, but kept with this project so they're to hand while you work."],
  },
  {
    id: "project-settings",
    title: "Project settings",
    intro: "The details of one script or episode.",
    points: [
      "Title, format, logline and title-page credits.",
      "Page target: the length you're aiming for, used by the progress strip. Leave blank for the format's usual length.",
      "Archive or delete the project.",
    ],
  },
  {
    id: "series",
    title: "Series overview",
    intro: "A TV series: its premise, overall arc, seasons and the material shared by every episode.",
    points: [
      "Series arc: the big beats across all seasons. Seasons and their episodes are listed below.",
      "Moodboard: links and files for the look and feel.",
      "Export series bible (PDF) collects the premise, arc, characters, world and each season's episodes into one document.",
    ],
  },
  {
    id: "series-bible",
    title: "Series characters and world",
    intro: "The recurring characters and standing world notes shared across every season and episode.",
    points: [
      "Characters added here can be linked to scene cards in any episode.",
      "They appear in the series bible PDF.",
    ],
  },
  {
    id: "season",
    title: "Season",
    intro: "One season: its arc, its episodes and how far along they are.",
    points: [
      "Season arc: beats for the season. Assign each to an episode; the coverage chip shows how much of it is written there. Arc templates add a ready-made shape.",
      "Progress rolls up every episode's scenes (leaving out set-aside scenes and archived beats).",
      "Print index cards or outlines for the whole season, or export a pitch of the arc and episodes.",
      "Storylines & characters shows who and what appears in which episode.",
    ],
  },
  {
    id: "season-threads",
    title: "Storylines & characters by episode",
    intro: "A grid of episodes against storylines, or against characters.",
    points: [
      "A filled cell means the storyline or character appears in that episode's cards.",
      "Flags call out gaps, such as a storyline that disappears for several episodes.",
      "Set-aside scenes don't count.",
    ],
  },
  {
    id: "search",
    title: "Search",
    intro: "Finds projects, series, script text, ideas, characters, world notes, beats and scene cards across everything you've written.",
    points: ["Results are grouped by kind. Click one to jump to it."],
  },
  {
    id: "settings",
    title: "Settings",
    intro: "How Quill looks and behaves for you, plus your account.",
    points: [
      "Appearance, daily writing goal and keyboard shortcuts.",
      "Backup: download everything as a file, or restore from one.",
      "Passkeys and PIN: how you sign in.",
      "The changelog and what's planned next are at the bottom.",
    ],
  },
];

export const HELP_BY_ID = new Map(HELP.map((s) => [s.id, s]));
