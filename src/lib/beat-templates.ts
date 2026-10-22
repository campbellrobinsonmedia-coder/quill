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
