import { describe, expect, it } from "vitest";
import { deriveIdeaTitle, normalizeTags, parseIdeaInput } from "@/lib/idea-text";

describe("parseIdeaInput", () => {
  it("pulls #tags out of the text", () => {
    expect(parseIdeaInput("A haunted lighthouse #horror #Feature")).toEqual({
      content: "A haunted lighthouse",
      tags: ["horror", "feature"],
    });
  });

  it("keeps tags mid-sentence readable and dedupes", () => {
    const r = parseIdeaInput("#comedy  A cheerleader and a flood #comedy");
    expect(r.tags).toEqual(["comedy"]);
    expect(r.content).toBe("A cheerleader and a flood");
  });

  it("leaves markdown headings and bare hashes alone", () => {
    expect(parseIdeaInput("# Big idea\nSomething").content).toBe("# Big idea\nSomething");
    expect(parseIdeaInput("Issue #").tags).toEqual([]);
  });

  it("returns empty content when only tags were typed", () => {
    expect(parseIdeaInput("#movie").content).toBe("");
  });

  it("handles tags followed by punctuation", () => {
    expect(parseIdeaInput("What if the sea went quiet #scifi, again").tags).toEqual(["scifi"]);
  });

  it("caps tags at 10", () => {
    const many = Array.from({ length: 15 }, (_, i) => `#t${i}`).join(" ");
    expect(parseIdeaInput(`idea ${many}`).tags).toHaveLength(10);
  });
});

describe("normalizeTags", () => {
  it("lowercases, strips #, drops invalid and duplicates", () => {
    expect(normalizeTags(["#Horror", "horror", "bad tag", "", "  Sci-Fi "])).toEqual(["horror", "sci-fi"]);
  });
});

describe("deriveIdeaTitle", () => {
  it("uses the first line", () => {
    expect(deriveIdeaTitle("The Magic Water Bottle\nMore detail")).toBe("The Magic Water Bottle");
  });

  it("truncates long first lines at a word boundary", () => {
    const long = "imagine being a cheerleader and it was raining and your boyfriend just broke up with you and to see him in the stands";
    const title = deriveIdeaTitle(long);
    expect(title.length).toBeLessThanOrEqual(81);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back for empty input", () => {
    expect(deriveIdeaTitle("   ")).toBe("Untitled idea");
  });
});
