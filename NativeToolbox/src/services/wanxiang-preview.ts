import { Path } from "scripting"
import type { Workspace } from "../models/types"
import {
  diffCustomPhrase,
  parseCustomPhraseDocument,
  type InternalPhrase,
  type PhraseDiff,
} from "../adapters/wanxiang/custom-phrase"

export async function readCustomPhraseFile(workspace: Workspace) {
  const root = FileManager.bookmarkedPath(workspace.bookmark_name) ?? workspace.display_path
  if (!root) throw new Error("工作区目录无法访问")
  const path = Path.join(root, "custom_phrase.txt")
  if (!(await FileManager.exists(path))) {
    throw new Error("这个目录里没有 custom_phrase.txt")
  }
  const content = await FileManager.readAsString(path)
  return { path, content, document: parseCustomPhraseDocument(content) }
}

export async function previewCustomPhraseDiff(workspace: Workspace, internal: InternalPhrase[]): Promise<PhraseDiff> {
  if (workspace.type !== "wanxiang") {
    throw new Error("只有已识别的万象目录才能预览 custom_phrase.txt")
  }
  if (workspace.status !== "connected") {
    throw new Error("工作区未连接，请先重新授权目录")
  }
  const { path, document } = await readCustomPhraseFile(workspace)
  return diffCustomPhrase(internal, document, path)
}
