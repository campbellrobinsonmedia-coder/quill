export type BeatTemplate = {
  id: string;
  label: string;
  beats: { title: string; summary: string }[];
};

export const BEAT_TEMPLATES: BeatTemplate[] = [
  {
    id: "three-act",
    label: "Three acts",
    beats: [
      { title: "Setup", summary: "Meet the hero and their ordinary world. What do they want, and what's missing?" },
      { title: "Inciting incident", summary: "The event that disrupts the ordinary world and sets the story in motion." },
      { title: "Plot point one", summary: "The hero commits. No going back into the old world." },
      { title: "Rising action", summary: "Obstacles escalate. The hero tries, fails, and learns." },
      { title: "Midpoint", summary: "A reversal or revelation that raises the stakes and changes the question of the story." },
      { title: "Plot point two", summary: "The lowest point. Everything the hero tried has failed." },
      { title: "Climax", summary: "The final confrontation. The hero faces the central conflict." },
      { title: "Resolution", summary: "The new normal. How has the hero changed?" },
    ],
  },
  {
    id: "save-the-cat",
    label: "Save the Cat (15 beats)",
    beats: [
      { title: "Opening image", summary: "A snapshot of the hero's world before the story changes it." },
      { title: "Theme stated", summary: "Someone says what the story is really about, usually without the hero noticing." },
      { title: "Set-up", summary: "The hero's flaws, stakes and the world they live in." },
      { title: "Catalyst", summary: "Life-changing event that knocks the hero off balance." },
      { title: "Debate", summary: "The hero doubts. Should they go?" },
      { title: "Break into two", summary: "The hero makes a choice and enters the upside-down world." },
      { title: "B story", summary: "A new relationship that carries the theme." },
      { title: "Fun and games", summary: "The promise of the premise: what the audience came to see." },
      { title: "Midpoint", summary: "False victory or false defeat. Stakes rise." },
      { title: "Bad guys close in", summary: "Pressure from outside and inside. The team fractures." },
      { title: "All is lost", summary: "The opposite of the Opening image. Something or someone dies." },
      { title: "Dark night of the soul", summary: "The hero hits bottom and absorbs the loss." },
      { title: "Break into three", summary: "The hero finds the solution, often from the B story." },
      { title: "Finale", summary: "The hero applies what they've learned and wins, changed." },
      { title: "Final image", summary: "The opposite of the Opening image: proof the hero has changed." },
    ],
  },
  {
    id: "heros-journey",
    label: "Hero's journey (12 steps)",
    beats: [
      { title: "Ordinary world", summary: "The hero's everyday life." },
      { title: "Call to adventure", summary: "A problem or challenge arrives." },
      { title: "Refusal of the call", summary: "Fear or doubt holds the hero back." },
      { title: "Meeting the mentor", summary: "Guidance, a gift, or a push." },
      { title: "Crossing the threshold", summary: "The hero enters the special world." },
      { title: "Tests, allies, enemies", summary: "Learning the rules of the new world." },
      { title: "Approach to the inmost cave", summary: "Preparing for the central ordeal." },
      { title: "The ordeal", summary: "The greatest challenge so far; a death and rebirth." },
      { title: "Reward", summary: "The hero takes what they came for." },
      { title: "The road back", summary: "The hero commits to returning, often pursued." },
      { title: "Resurrection", summary: "A final test that proves the hero has changed." },
      { title: "Return with the elixir", summary: "The hero brings something back to the ordinary world." },
    ],
  },
  {
    id: "tv-hour",
    label: "TV hour (teaser + acts + tag)",
    beats: [
      { title: "Teaser", summary: "A hook before the titles: the question or the crime." },
      { title: "Act one", summary: "Set up the A-story and the stakes; end on a turn." },
      { title: "Act two", summary: "Complicate. B-story builds. End on a reversal." },
      { title: "Act three", summary: "Midpoint of the hour: raise the cost, tighten the clock." },
      { title: "Act four", summary: "Everything falls apart. End on the lowest point." },
      { title: "Act five", summary: "Climax and resolution of the A-story." },
      { title: "Tag", summary: "A button: a laugh, a twist, or a hook for next week." },
    ],
  },
];

// Shapes for a whole season's arc, to be spread across its episodes.
export const SEASON_BEAT_TEMPLATES: BeatTemplate[] = [
  {
    id: "season-four-part",
    label: "Four-part season",
    beats: [
      { title: "Premiere: the world and the hook", summary: "Introduce the world, the cast and the question that will run all season." },
      { title: "First turn", summary: "The central situation locks in; the cast can't go back to how things were." },
      { title: "Midseason turn", summary: "A reveal or reversal that changes what the season is really about." },
      { title: "The collapse", summary: "Everything the characters built is tested; the cost becomes clear." },
      { title: "Finale", summary: "The season's question is answered, and the characters are changed by it." },
    ],
  },
  {
    id: "season-mystery",
    label: "Mystery season",
    beats: [
      { title: "The question", summary: "The event or secret the whole season will try to explain." },
      { title: "First clue", summary: "The first real lead, and who it points at." },
      { title: "False answer", summary: "An explanation that feels right and isn't." },
      { title: "Midseason twist", summary: "What we thought we knew turns over." },
      { title: "The cost of knowing", summary: "Pursuing the truth hurts someone close." },
      { title: "The truth", summary: "The real answer, and who it implicates." },
      { title: "Fallout and a new question", summary: "The aftermath, and the door the next season opens." },
    ],
  },
  {
    id: "season-ensemble",
    label: "Ensemble season (character arcs)",
    beats: [
      { title: "Where everyone starts", summary: "Each lead's want and flaw, established in the first episodes." },
      { title: "The shared pressure", summary: "An event that forces the ensemble into the same problem." },
      { title: "Alliances and fractures", summary: "Who pairs up, who splits, and why." },
      { title: "Midseason: the first big loss", summary: "A setback that lands differently on each character." },
      { title: "Each lead's low point", summary: "The place each arc bottoms out." },
      { title: "The choice", summary: "Each character decides who they'll be." },
      { title: "Finale and the new normal", summary: "The ensemble as the season has remade it." },
    ],
  },
];
