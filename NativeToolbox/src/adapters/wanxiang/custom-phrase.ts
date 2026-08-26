export type PhraseKind = "comment" | "blank" | "entry" | "invalid"

export type PhraseLine = {
  lineNumber: number
  raw: string
  kind: PhraseKind
  text?: string
  code?: string
  weight?: number | null
  error?: string
}

export type PhraseEntry = {
  key: string
  text: string
  code: string
  weight: number | null
  lineNumber: number
}

export type PhraseDocument = {
  lines: PhraseLine[]
  entries: PhraseEntry[]
  invalid: PhraseLine[]
  hash: string
}

export type PhraseChangeKind = "insert" | "update" | "same" | "externalOnly"

export type PhraseDiffItem = {
  kind: PhraseChangeKind
  key: string
  text: string
  code: string
  internalWeight: number | null
  externalWeight: number | null
  internalNote?: string | null
}

export type PhraseDiff = {
  inserts: PhraseDiffItem[]
  updates: PhraseDiffItem[]
  same: PhraseDiffItem[]
  externalOnly: PhraseDiffItem[]
  invalid: PhraseLine[]
  hash: string
  path: string
}

export function phraseKey(text: string, code: string) {
  return `${text}\u0000${code}`
}

function parseWeight(value: string | undefined) {
  if (value == null || value.trim() === "") return null
  const number = Number(value.trim())
  if (!Number.isInteger(number)) return null
  return number
}

export function parseCustomPhrase(content: string): Omit<PhraseDocument, "hash"> {
  const lines: PhraseLine[] = []
  const entries: PhraseEntry[] = []
  const invalid: PhraseLine[] = []

  content.replace(/\r\n?/g, "\n").split("\n").forEach((raw, index) => {
    const lineNumber = index + 1
    const trimmed = raw.trim()
    if (trimmed === "") {
      lines.push({ lineNumber, raw, kind: "blank" })
      return
    }
    if (trimmed.startsWith("#")) {
      lines.push({ lineNumber, raw, kind: "comment" })
      return
    }

    if (raw.includes(" ") && !raw.includes("\t")) {
      const invalidLine: PhraseLine = {
        lineNumber,
        raw,
        kind: "invalid",
        error: "数据行必须使用 Tab 分隔，不能用空格假冒",
      }
      lines.push(invalidLine)
      invalid.push(invalidLine)
      return
    }

    const parts = raw.split("\t")
    const text = (parts[0] ?? "").trim()
    const code = (parts[1] ?? "").trim()
    const weightRaw = parts[2]
    if (!text || !code || parts.length > 3) {
      const invalidLine: PhraseLine = {
        lineNumber,
        raw,
        kind: "invalid",
        error: !text || !code ? "缺少词语或编码" : "列数过多",
      }
      lines.push(invalidLine)
      invalid.push(invalidLine)
      return
    }

    const weight = parseWeight(weightRaw)
    if (weightRaw != null && weightRaw.trim() !== "" && weight == null) {
      const invalidLine: PhraseLine = {
        lineNumber,
        raw,
        kind: "invalid",
        text,
        code,
        error: "权重必须是整数",
      }
      lines.push(invalidLine)
      invalid.push(invalidLine)
      return
    }

    const entry: PhraseEntry = {
      key: phraseKey(text, code),
      text,
      code,
      weight,
      lineNumber,
    }
    lines.push({ lineNumber, raw, kind: "entry", text, code, weight })
    entries.push(entry)
  })

  return { lines, entries, invalid }
}

export function hashCustomPhrase(content: string) {
  const data = Data.fromRawString(content)
  if (data == null) throw new Error("custom_phrase.txt 不是有效 UTF-8 文本")
  return Crypto.sha256(data).toHexString()
}

export function parseCustomPhraseDocument(content: string): PhraseDocument {
  return {
    ...parseCustomPhrase(content),
    hash: hashCustomPhrase(content),
  }
}

export type InternalPhrase = {
  text: string
  code: string | null
  weight: number
  note?: string | null
}

export function diffCustomPhrase(internal: InternalPhrase[], document: PhraseDocument, path: string): PhraseDiff {
  const external = new Map(document.entries.map(entry => [entry.key, entry]))
  const inserts: PhraseDiffItem[] = []
  const updates: PhraseDiffItem[] = []
  const same: PhraseDiffItem[] = []
  const seen = new Set<string>()

  for (const item of internal) {
    const code = item.code?.trim() ?? ""
    if (!code) continue
    const key = phraseKey(item.text, code)
    if (seen.has(key)) continue
    seen.add(key)
    const existing = external.get(key)
    const diffItem: PhraseDiffItem = {
      kind: "same",
      key,
      text: item.text,
      code,
      internalWeight: item.weight,
      externalWeight: existing?.weight ?? null,
      internalNote: item.note ?? null,
    }
    if (existing == null) {
      inserts.push({ ...diffItem, kind: "insert" })
    } else if ((existing.weight ?? null) !== item.weight) {
      updates.push({ ...diffItem, kind: "update" })
    } else {
      same.push(diffItem)
    }
  }

  const externalOnly: PhraseDiffItem[] = []
  for (const entry of document.entries) {
    if (seen.has(entry.key)) continue
    externalOnly.push({
      kind: "externalOnly",
      key: entry.key,
      text: entry.text,
      code: entry.code,
      internalWeight: null,
      externalWeight: entry.weight,
    })
  }

  return {
    inserts,
    updates,
    same,
    externalOnly,
    invalid: document.invalid,
    hash: document.hash,
    path,
  }
}
