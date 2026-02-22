import Papa from "papaparse";

export const meta = {
  id: "sugarwod",
  name: "SugarWod",
  description: "Import your SugarWod workout history CSV export.",
  exportInstructions: [
    "Open SugarWod on your phone or web browser.",
    'Go to Profile → Settings → "Export Data".',
    'Tap "Export Workouts" and save the CSV file.',
    "Upload that file here.",
  ],
};

// ─── REP COUNT EXTRACTION ─────────────────────────────────────────────────────

/**
 * Given a title like "Deadlift 5x3", extracts M from NxM pattern.
 * Returns null if no match.
 */
function extractNxM(text) {
  const m = text.match(/\b(\d+)\s*[xX]\s*(\d+)\b/);
  return m ? parseInt(m[2], 10) : null;
}

/**
 * Given a text containing "6-5-4-3-2-1" or "3-3-3-3-3", extracts
 * the array of rep counts. Returns null if no match (at least 2 terms,
 * all single/double-digit numbers joined by hyphens).
 */
function extractRepSequence(text) {
  // (?!-\d) ensures we capture the full sequence even when immediately followed by a letter
  const m = text.match(/\b(\d{1,2}(?:-\d{1,2})+)(?!-\d)/);
  if (!m) return null;
  const parts = m[1].split("-").map(Number);
  // Must look like rep counts (1–30) not dates or weights
  if (parts.some((n) => n < 1 || n > 30)) return null;
  return parts;
}

/**
 * Finds the rep count from a "#N: M reps" description pattern.
 * Returns the rep count for the set whose load matches maxLoad,
 * or the most common rep count in the description, or null.
 */
function extractFromDescription(description, setDetails, maxLoad) {
  // Match all "#1: 8 reps" patterns
  const matches = [...description.matchAll(/#\d+:\s*(\d+)\s*reps?/gi)];
  if (matches.length === 0) return null;
  const repCounts = matches.map((m) => parseInt(m[1], 10));

  // Find index of first set with maxLoad, use that index to pick rep count
  const maxLoadIdx = setDetails.findIndex((s) => s.load === maxLoad);
  if (maxLoadIdx >= 0 && maxLoadIdx < repCounts.length) {
    return repCounts[maxLoadIdx];
  }
  // Fallback: most common rep count
  return repCounts[0];
}

/**
 * "heavy single" → 1, "heavy N rep" → N
 */
function extractHeavyPattern(text) {
  if (/heavy\s+single/i.test(text)) return 1;
  const m = text.match(/heavy\s+(\d+)\s*rep/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

/**
 * Core rep extraction logic. Tries strategies in priority order.
 */
function extractReps(title, description, setDetails, maxLoad) {
  // 1. NxM in title
  const nxm = extractNxM(title);
  if (nxm !== null) return nxm;

  // 2. Pyramid/sequence in title (e.g. "Deadlift 6-5-4-3-2-1")
  const titleSeq = extractRepSequence(title);
  if (titleSeq) {
    return resolveSeqReps(titleSeq, setDetails, maxLoad);
  }

  // 3. Heavy pattern in title or description
  const heavy = extractHeavyPattern(title) ?? extractHeavyPattern(description);
  if (heavy !== null) return heavy;

  // 4. "#N: M reps" in description
  const descReps = extractFromDescription(description, setDetails, maxLoad);
  if (descReps !== null) return descReps;

  // 5. NxM in description
  const descNxM = extractNxM(description);
  if (descNxM !== null) return descNxM;

  // 6. Rep sequence in description
  const descSeq = extractRepSequence(description);
  if (descSeq) {
    return resolveSeqReps(descSeq, setDetails, maxLoad);
  }

  // 7. Bare "N reps" anywhere in description (e.g. "4 sets: 10 reps")
  const bareReps = description.match(/\b(\d{1,2})\s*reps?\b/i);
  if (bareReps) return parseInt(bareReps[1], 10);

  // 8. Fallback
  return 1;
}

/**
 * Given a rep sequence like [6,5,4,3,2,1] and the set details with loads,
 * find the position of maxLoad (first occurrence) in set details and return
 * the corresponding rep count from the sequence.
 */
function resolveSeqReps(sequence, setDetails, maxLoad) {
  // When all loads are equal we can't distinguish by position;
  // take the min rep count (heaviest stimulus = lowest reps in a descending scheme)
  const allEqual =
    setDetails.length > 0 &&
    setDetails.every((s) => s.load === setDetails[0].load);
  if (allEqual) {
    return Math.min(...sequence);
  }

  // Find first index in setDetails where load equals maxLoad
  const idx = setDetails.findIndex((s) => s.load === maxLoad);
  if (idx >= 0 && idx < sequence.length) {
    return sequence[idx];
  }

  // Index out of range → clamp to last element
  return sequence[sequence.length - 1];
}

// ─── MAIN PARSE FUNCTION ──────────────────────────────────────────────────────

/**
 * Parses a SugarWod CSV string into canonical LiftEntry[].
 * @param {string} csvString
 * @returns {Array<LiftEntry>}
 */
export function parse(csvString) {
  const { data } = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const entries = [];

  for (const row of data) {
    const title = (row.title || "").trim();
    const barlift = (row.barbell_lift || "").trim();
    const scoreType = (row.score_type || "").trim();

    // Filter 1: Skip "Class Times" rows
    if (title === "Class Times") continue;

    // Filter 2: Only barbell lift rows with Load score type
    if (!barlift || scoreType !== "Load") continue;

    const date = (row.date || "").trim();
    const description = (row.description || "").trim();
    const notesRaw = (row.notes || "").trim();
    const prCol = (row.pr || "").trim();
    const maxLoad = parseFloat(row.best_result_raw) || 0;

    // Parse set_details JSON (CSV escapes inner quotes as "")
    let setDetails = [];
    try {
      const rawJson = (row.set_details || "").replace(/""/g, '"');
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        // Extract load values from objects like {load: 155, success: true}
        setDetails = parsed.filter((s) => typeof s.load === "number");
      }
    } catch {
      // Malformed JSON; leave setDetails empty
    }

    const setLoads = setDetails.map((s) => s.load);
    const reps = extractReps(title, description, setDetails, maxLoad);
    const isPR = prCol === "PR";

    entries.push({
      date,
      lift: barlift,
      title,
      reps,
      maxLoad,
      setLoads,
      notes: notesRaw,
      isPR,
    });
  }

  return entries;
}
