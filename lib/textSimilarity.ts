// Simple text normalization and similarity utilities for plagiarism checks

function normalizeText(input: string): string {
  if (!input) return ""
  // Lowercase, remove most punctuation, collapse whitespace
  return input
    .toLowerCase()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/https?:\/\/\S+/g, " ") // remove URLs
    .replace(/[\p{P}\p{S}]+/gu, " ") // punctuation and symbols
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(text: string): string[] {
  const norm = normalizeText(text)
  if (!norm) return []
  return norm.split(" ")
}

function getNGrams(tokens: string[], n = 3): Set<string> {
  const grams = new Set<string>()
  if (tokens.length < n) return grams
  for (let i = 0; i <= tokens.length - n; i++) {
    grams.add(tokens.slice(i, i + n).join(" "))
  }
  return grams
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection++
  }
  const union = a.size + b.size - intersection
  if (union === 0) return 0
  return intersection / union
}

function cosineSimilarity(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0
  const aFreq: Record<string, number> = {}
  const bFreq: Record<string, number> = {}
  for (const t of aTokens) aFreq[t] = (aFreq[t] || 0) + 1
  for (const t of bTokens) bFreq[t] = (bFreq[t] || 0) + 1
  const keys = new Set([...Object.keys(aFreq), ...Object.keys(bFreq)])
  let dot = 0
  let aNorm = 0
  let bNorm = 0
  for (const k of keys) {
    const av = aFreq[k] || 0
    const bv = bFreq[k] || 0
    dot += av * bv
    aNorm += av * av
    bNorm += bv * bv
  }
  if (aNorm === 0 || bNorm === 0) return 0
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm))
}

export type SimilarityMatch = {
  id: string
  type: 'article' | 'submission'
  title: string
  jaccard: number
  cosine: number
  score: number
}

function getCharNGrams(text: string, n = 3): Set<string> {
  const grams = new Set<string>()
  if (!text) return grams
  const s = text.replace(/\s+/g, ' ')
  if (s.length < n) return grams
  for (let i = 0; i <= s.length - n; i++) {
    grams.add(s.slice(i, i + n))
  }
  return grams
}

export function compareTextAgainstCorpus(
  subject: { title?: string; content?: string },
  corpus: Array<{ id: string; type: 'article' | 'submission'; title?: string; text: string }>,
  options?: { ngram?: number }
) {
  const defaultN = options?.ngram ?? 3
  const subjectTextRaw = `${subject.title || ''} ${subject.content || ''}`.trim()
  const subjectText = normalizeText(subjectTextRaw)
  const subjectTokens = tokenize(subjectText)

  // Adapt n-gram size for very short inputs
  const tokenN = subjectTokens.length >= defaultN ? defaultN : 1
  const charN = subjectText.length >= 6 ? 3 : subjectText.length >= 4 ? 2 : 1

  const subjectTokenNGrams = getNGrams(subjectTokens, tokenN)
  const subjectCharNGrams = getCharNGrams(subjectText, charN)

  const matches: SimilarityMatch[] = []
  let maxScore = 0

  for (const doc of corpus) {
    const docText = normalizeText(`${doc.title || ''} ${doc.text || ''}`)
    const docTokens = tokenize(docText)
    const docTokenNGrams = getNGrams(docTokens, tokenN)
    const docCharNGrams = getCharNGrams(docText, charN)

    const jacToken = jaccard(subjectTokenNGrams, docTokenNGrams)
    const cos = cosineSimilarity(subjectTokens, docTokens)
    const jacChar = jaccard(subjectCharNGrams, docCharNGrams)

    // Exact / containment bonuses for short texts
    const exact = subjectText && docText && subjectText === docText ? 1 : 0
    const contains = subjectText.length >= 4 && (docText.includes(subjectText) || subjectText.includes(docText)) ? 0.9 : 0

    // Blend scores with adaptive weighting; ensure short-text signals are respected
    let blended = 0.45 * jacToken + 0.3 * cos + 0.25 * jacChar
    blended = Math.max(blended, exact, contains)

    if (blended > 0) {
      matches.push({ id: doc.id, type: doc.type, title: doc.title || '', jaccard: Math.max(jacToken, jacChar), cosine: cos, score: blended })
      if (blended > maxScore) maxScore = blended
    }
  }

  matches.sort((a, b) => b.score - a.score)
  return { matches, maxScore }
}

export function defaultPlagiarismDecision(maxScore: number) {
  // Conservative defaults: flag strong overlaps
  // maxScore blends jaccard and cosine; ~0.6+ is likely heavy reuse
  const threshold = 0.6
  return { flagged: maxScore >= threshold, threshold }
}

export const TextSim = {
  normalizeText,
  tokenize,
  getNGrams,
  getCharNGrams,
  jaccard,
  cosineSimilarity,
  compareTextAgainstCorpus,
  defaultPlagiarismDecision,
}

export default TextSim
