import { ProblemType } from "./types";

export interface ParsedVoiceReport {
  rawText: string;
  problemType: ProblemType;
  description: string;
  extractedLandmark: string;
  urgency: "CRITICAL" | "NORMAL";
  detectedKeywords: string[];
}

/**
 * Natural Language Keyword Intelligence for Stray Dog Rescue
 * Supports English, Hindi, and colloquial Hinglish
 */
const INJURY_KEYWORDS = [
  "accident",
  "hit by car",
  "hit by bike",
  "hit by vehicle",
  "bleeding",
  "blood",
  "khoon",
  "chot",
  "injured",
  "injury",
  "fracture",
  "leg broken",
  "broken leg",
  "pair toot",
  "limping",
  "lame",
  "wound",
  "ghav",
  "cut",
  "trauma",
  "emergency",
  "urgent",
  "serious",
  "critical",
  "pain",
  "dard",
];

const HUNGER_KEYWORDS = [
  "hungry",
  "starving",
  "bhooka",
  "bhookhi",
  "khana",
  "food",
  "roti",
  "biscuits",
  "biscuit",
  "pedigree",
  "diet",
  "skinny",
  "kamzor",
  "weak from hunger",
  "malnourished",
  "water",
  "pani",
  "thirsty",
  "pyasa",
];

const NEWBORN_KEYWORDS = [
  "puppy",
  "puppies",
  "pups",
  "bachha",
  "bachhe",
  "chote bachhe",
  "newborn",
  "litter",
  "mother dog",
  "feeding puppies",
  "orphan pups",
  "pilla",
  "pille",
];

const SICKNESS_KEYWORDS = [
  "sick",
  "ill",
  "bimar",
  "vomiting",
  "ulti",
  "maggot",
  "maggots",
  "keede",
  "infection",
  "fever",
  "bukhar",
  "shivering",
  "kanp",
  "skin disease",
  "mange",
  "bal ud",
  "ticks",
  "parvo",
  "rabies",
  "seizure",
];

const LANDMARK_PREPOSITIONS = [
  "near",
  "behind",
  "opposite",
  "in front of",
  "under",
  "inside",
  "next to",
  "beside",
  "close to",
  "pass me",
  "ke pass",
  "ke peeche",
  "ke samne",
  "ke niche",
  "ke bagal me",
  "road pe",
  "chowk pe",
  "stand pe",
  "stall pe",
  "gate pe",
  "circle pe",
];

const LANDMARK_ANCHORS = [
  "tree",
  "banyan tree",
  "peepal tree",
  "mango tree",
  "neem tree",
  "chai stall",
  "tea stall",
  "shop",
  "dukaan",
  "temple",
  "mandir",
  "station",
  "railway station",
  "bus stand",
  "auto stand",
  "gate",
  "main gate",
  "gate no",
  "circle",
  "chowk",
  "bridge",
  "flyover",
  "petrol pump",
  "hospital",
  "school",
  "society",
  "building",
  "car",
  "parked car",
  "auto",
  "drain",
  "nalla",
  "footpath",
  "divider",
  "market",
  "corner",
];

/**
 * Intelligent Speech Analyzer for Emergency Dog Reports
 */
export function parseSpokenRescueText(rawText: string): ParsedVoiceReport {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const detectedKeywords: string[] = [];

  // 1. Detect Category / Problem Type
  let problemType: ProblemType = "OTHER";
  let urgency: "CRITICAL" | "NORMAL" = "NORMAL";

  let injuryScore = 0;
  let hungerScore = 0;
  let newbornScore = 0;
  let sickScore = 0;

  INJURY_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) {
      injuryScore += 2;
      detectedKeywords.push(kw);
      if (
        kw === "accident" ||
        kw === "bleeding" ||
        kw === "khoon" ||
        kw === "fracture" ||
        kw === "hit by car" ||
        kw === "critical"
      ) {
        urgency = "CRITICAL";
      }
    }
  });

  HUNGER_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) {
      hungerScore += 2;
      detectedKeywords.push(kw);
    }
  });

  NEWBORN_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) {
      newbornScore += 3;
      detectedKeywords.push(kw);
    }
  });

  SICKNESS_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) {
      sickScore += 2;
      detectedKeywords.push(kw);
      if (kw === "maggot" || kw === "keede" || kw === "seizure") {
        urgency = "CRITICAL";
      }
    }
  });

  const maxScore = Math.max(injuryScore, hungerScore, newbornScore, sickScore);
  if (maxScore > 0) {
    if (maxScore === injuryScore) problemType = "INJURED";
    else if (maxScore === newbornScore) problemType = "NEWBORN_LITTER";
    else if (maxScore === hungerScore) problemType = "HUNGRY";
    else if (maxScore === sickScore) problemType = "SICK";
  }

  // 2. Intelligent Landmark Extractor
  let extractedLandmark = "";

  // Check preposition-based spatial phrases
  for (const prep of LANDMARK_PREPOSITIONS) {
    const idx = lower.indexOf(prep);
    if (idx !== -1) {
      // Extract the next 5-8 words following the preposition
      const slice = text.substring(idx).split(/[.,!?]/)[0].trim();
      if (slice.length > 5 && slice.length < 90) {
        extractedLandmark = slice;
        break;
      }
    }
  }

  // Fallback: Check anchor keywords if preposition match was empty
  if (!extractedLandmark) {
    for (const anchor of LANDMARK_ANCHORS) {
      if (lower.includes(anchor)) {
        const words = text.split(" ");
        const anchorIdx = words.findIndex((w) => w.toLowerCase().includes(anchor));
        if (anchorIdx !== -1) {
          const start = Math.max(0, anchorIdx - 2);
          const end = Math.min(words.length, anchorIdx + 4);
          extractedLandmark = words.slice(start, end).join(" ").replace(/[.,!?]$/, "");
          break;
        }
      }
    }
  }

  // Capitalize first letter of description
  const formattedDescription =
    text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : "";

  return {
    rawText: text,
    problemType,
    description: formattedDescription,
    extractedLandmark: extractedLandmark
      ? extractedLandmark.charAt(0).toUpperCase() + extractedLandmark.slice(1)
      : "",
    urgency,
    detectedKeywords: Array.from(new Set(detectedKeywords)),
  };
}
