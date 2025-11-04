import type { Match } from "@/types/match";

type ParseOptions = {
  defaultTeam?: string;
};

type ParsedEvent = Pick<
  Match,
  "team" | "opponent" | "date" | "time" | "location" | "status" | "description" | "icsUid"
>;

const unfoldLines = (content: string) =>
  content
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .trim();

const parseLineValue = (line: string) => {
  const [rawKey, ...valueParts] = line.split(":");
  if (!valueParts.length) return { key: "", value: "" };
  const key = rawKey.split(";")[0]?.trim().toUpperCase();
  const value = valueParts.join(":").trim();
  return { key, value };
};

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const cleaned = value.trim();

  if (cleaned.endsWith("Z")) {
    const date = new Date(cleaned);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const match = cleaned.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?$/
  );

  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

const cleanSummary = (summary: string) => summary.replace(/\\,/g, ",").trim();

const normalizeDescription = (description?: string) => {
  if (!description) return "";
  return description.replace(/\\n/g, "\n").trim();
};

const determineTeam = (summary: string, categories: string | undefined, options?: ParseOptions) => {
  if (categories) return categories.trim();
  if (options?.defaultTeam && options.defaultTeam !== "Automatisch erkennen") {
    return options.defaultTeam;
  }

  const normalizedSummary = summary.toLowerCase();
  const knownTeams = [
    "herren i",
    "herren ii",
    "damen i",
    "damen ii",
    "jugend u18",
    "jugend u15",
    "schüler",
    "männer",
    "frauen"
  ];

  const found = knownTeams.find((team) => normalizedSummary.includes(team));
  if (found) {
    return found
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  if (summary.includes(" - ")) {
    return summary.split(" - ")[0]?.trim();
  }

  return options?.defaultTeam || "Unbekannte Mannschaft";
};

const determineOpponent = (summary: string, team: string) => {
  const patterns = [" - ", " vs ", " gegen ", " @ "];
  for (const pattern of patterns) {
    if (summary.includes(pattern)) {
      const [first, second] = summary.split(pattern).map((part) => part.trim());
      if (!second) continue;

      if (first.toLowerCase() === team.toLowerCase()) {
        return second;
      }

      if (second.toLowerCase() === team.toLowerCase()) {
        return first;
      }

      return second;
    }
  }

  if (summary.toLowerCase().includes(team.toLowerCase())) {
    return summary.replace(new RegExp(team, "i"), "").replace(/^[^a-zA-Z0-9]+/, "").trim();
  }

  return summary.trim();
};

export const parseIcs = (content: string, options?: ParseOptions): ParsedEvent[] => {
  const unfolded = unfoldLines(content);
  const rawEvents = unfolded.split("BEGIN:VEVENT").slice(1);
  const matches: ParsedEvent[] = [];

  rawEvents.forEach((eventBlock) => {
    const lines = eventBlock.split("\n");
    const eventData = new Map<string, string>();

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || line === "END:VEVENT") return;
      const { key, value } = parseLineValue(line);
      if (!key) return;
      eventData.set(key, value);
    });

    const summary = cleanSummary(eventData.get("SUMMARY") || "");
    const team = determineTeam(summary, eventData.get("CATEGORIES"), options);
    const opponent = determineOpponent(summary, team);
    const date = parseDate(eventData.get("DTSTART"));

    if (!date) {
      return;
    }

    matches.push({
      team,
      opponent,
      date: date.toISOString(),
      time: formatTime(date),
      location: eventData.get("LOCATION") || "",
      status: "scheduled",
      description: normalizeDescription(eventData.get("DESCRIPTION")),
      icsUid: eventData.get("UID") || undefined
    });
  });

  return matches;
};
