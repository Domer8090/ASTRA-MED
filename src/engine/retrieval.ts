/**
 * On-device retrieval for Tuesday (retrieval-augmented generation without a
 * server). A BM25 keyword index over ASTRA-MED's own protocol, guidance,
 * hazard and wellbeing text. Answers cite the passages they used so the model
 * never has to invent a procedure. Pure functions.
 */
import type { SourceRef } from "../types/health";

export interface KnowledgeDoc {
  id: string;
  title: string;
  text: string;
  kind: "guidance" | "hazard" | "protocol" | "wellbeing" | "source";
  source: SourceRef | null;
}

export interface RetrievedPassage {
  doc: KnowledgeDoc;
  score: number;
}

export interface KnowledgeIndex {
  docs: KnowledgeDoc[];
  tokens: string[][];
  df: Map<string, number>;
  avgLength: number;
}

const STOP = new Set(
  "a an and are as at be but by can do does for from has have how i if in into is it its me my of on or our so than that the their them then there these this to was we what when where which who why will with you your am been being did done get got just more most not now off out over own same should some such too up very".split(" "),
);

/** Lower-case word tokens with light suffix stripping, so "readings" matches "reading". */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => w.replace(/(ings|ing|ies|ied|es|ed|s)$/, (m) => (w.length - m.length >= 3 ? (m === "ies" || m === "ied" ? "y" : "") : m)));
}

export function buildIndex(docs: readonly KnowledgeDoc[]): KnowledgeIndex {
  const tokens = docs.map((d) => tokenize(`${d.title} ${d.title} ${d.text}`));
  const df = new Map<string, number>();
  for (const t of tokens) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const avgLength = tokens.reduce((s, t) => s + t.length, 0) / Math.max(1, tokens.length);
  return { docs: [...docs], tokens, df, avgLength };
}

/** Okapi BM25 (k1 = 1.2, b = 0.75). Returns the top `k` passages with a positive score. */
export function retrieve(index: KnowledgeIndex, query: string, k = 4): RetrievedPassage[] {
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const n = index.docs.length;
  const out: RetrievedPassage[] = [];
  index.tokens.forEach((t, i) => {
    let score = 0;
    const counts = new Map<string, number>();
    for (const w of t) counts.set(w, (counts.get(w) ?? 0) + 1);
    for (const w of q) {
      const f = counts.get(w);
      if (!f) continue;
      const df = index.df.get(w) ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      score += (idf * f * 2.2) / (f + 1.2 * (0.25 + (0.75 * t.length) / index.avgLength));
    }
    if (score > 0) out.push({ doc: index.docs[i]!, score });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, k);
}
