export function trimWhitespace(input: string) {
  return input.replace(/\r\n?/g, "\n").trim()
}

export function mergeBlankLines(input: string) {
  return input.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n")
}

export function removeEmptyLines(input: string) {
  return input.replace(/\r\n?/g, "\n").split("\n").filter(line => line.trim().length > 0).join("\n")
}

export function dedupeLines(input: string) {
  const seen = new Set<string>()
  return input.replace(/\r\n?/g, "\n").split("\n").filter(line => {
    if (seen.has(line)) return false
    seen.add(line)
    return true
  }).join("\n")
}

export function sortLines(input: string) {
  return input.replace(/\r\n?/g, "\n").split("\n").sort((a, b) => a.localeCompare(b, "zh-Hans-CN")).join("\n")
}

export function formatJSON(input: string) {
  return JSON.stringify(JSON.parse(input), null, 2)
}

export type TextOperation = "trim" | "blankLines" | "removeEmpty" | "dedupe" | "sort" | "json"

export function applyTextOperation(input: string, operation: TextOperation) {
  switch (operation) {
    case "trim": return trimWhitespace(input)
    case "blankLines": return mergeBlankLines(input)
    case "removeEmpty": return removeEmptyLines(input)
    case "dedupe": return dedupeLines(input)
    case "sort": return sortLines(input)
    case "json": return formatJSON(input)
  }
}
