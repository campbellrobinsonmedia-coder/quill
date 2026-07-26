import { XMLParser } from "fast-xml-parser";
import {
  makeId,
  type ScreenplayContent,
  type ScreenplayElement,
  type ScreenplayElementType,
} from "@/lib/draft-content";

const TYPE_TO_FDX: Record<ScreenplayElementType, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
};

const FDX_TO_TYPE: Record<string, ScreenplayElementType> = {
  "Scene Heading": "scene_heading",
  Action: "action",
  Character: "character",
  Parenthetical: "parenthetical",
  Dialogue: "dialogue",
  Transition: "transition",
  General: "action",
  Shot: "action",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toFDX(content: ScreenplayContent, title: string): string {
  const paragraphs = content.elements
    .filter((el) => !el.omitted)
    .map(
      (el) =>
        `    <Paragraph Type="${TYPE_TO_FDX[el.type]}">\n      <Text>${escapeXml(
          el.text
        )}</Text>\n    </Paragraph>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
${paragraphs}
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Type="Title">
        <Text>${escapeXml(title)}</Text>
      </Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>
`;
}

export function fromFDX(xml: string): ScreenplayContent {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });
  const doc = parser.parse(xml);

  const rawParagraphs = doc?.FinalDraft?.Content?.Paragraph;
  const paragraphs = Array.isArray(rawParagraphs)
    ? rawParagraphs
    : rawParagraphs
      ? [rawParagraphs]
      : [];

  const elements: ScreenplayElement[] = paragraphs.map((p: Record<string, unknown>) => {
    const fdxType = String(p["@_Type"] ?? "Action");
    const type = FDX_TO_TYPE[fdxType] ?? "action";
    const text = extractText(p.Text);
    return { id: makeId(), type, text };
  });

  if (elements.length === 0) {
    elements.push({ id: makeId(), type: "scene_heading", text: "" });
  }

  return { type: "screenplay", elements };
}

function extractText(text: unknown): string {
  if (typeof text === "string") return text;
  if (Array.isArray(text)) return text.map(extractText).join("");
  if (text && typeof text === "object" && "#text" in (text as Record<string, unknown>)) {
    return String((text as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}
