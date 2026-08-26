import { Path } from "scripting"
import type { Workspace } from "../models/types"
import {
  applyCustomPhraseDiff,
  diffCustomPhrase,
  hashCustomPhrase,
  parseCustomPhraseDocument,
  type InternalPhrase,
  type PhraseDiff,
} from "../adapters/wanxiang/custom-phrase"

function timestampName() {
  const d = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

async function resolvePhrasePath(workspace: Workspace) {
  const root = FileManager.bookmarkedPath(workspace.bookmark_name) ?? workspace.display_path
  if (!root) throw new Error("工作区目录无法访问")
  const path = Path.join(root, "custom_phrase.txt")
  if (!(await FileManager.exists(path))) {
    throw new Error("这个目录里没有 custom_phrase.txt")
  }
  return { root, path }
}

export async function readCustomPhraseFile(workspace: Workspace) {
  const { path } = await resolvePhrasePath(workspace)
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

export type PhraseCommitResult = {
  backupPath: string
  inserted: number
  updated: number
  hash: string
}

export async function commitCustomPhraseDiff(
  workspace: Workspace,
  internal: InternalPhrase[],
  expectedHash: string,
): Promise<PhraseCommitResult> {
  if (workspace.type !== "wanxiang") {
    throw new Error("只有已识别的万象目录才能提交 custom_phrase.txt")
  }
  if (workspace.status !== "connected") {
    throw new Error("工作区未连接，请先重新授权目录")
  }

  const { root, path } = await resolvePhrasePath(workspace)
  const current = await FileManager.readAsString(path)
  const currentHash = hashCustomPhrase(current)
  if (currentHash !== expectedHash) {
    throw new Error("custom_phrase.txt 在预览后已被外部修改，已禁止覆盖。请重新预览后再提交。")
  }

  const document = parseCustomPhraseDocument(current)
  const diff = diffCustomPhrase(internal, document, path)
  if (diff.invalid.length > 0) {
    throw new Error("外部文件仍有格式异常行，禁止提交")
  }
  if (diff.inserts.length + diff.updates.length === 0) {
    throw new Error("没有可提交的差异")
  }

  const nextContent = applyCustomPhraseDiff(current, diff)
  const parsedNext = parseCustomPhraseDocument(nextContent)
  if (parsedNext.invalid.length > 0) {
    throw new Error("合成后的 custom_phrase.txt 无法通过解析，已中止写入")
  }
  for (const item of [...diff.inserts, ...diff.updates]) {
    const found = parsedNext.entries.find(entry => entry.key === item.key)
    if (found == null || found.weight !== item.internalWeight) {
      throw new Error(`合成结果缺少或未更新「${item.text} / ${item.code}」`)
    }
  }

  const backupRoot = Path.join(root, "ToolboxBackups", timestampName())
  await FileManager.createDirectory(backupRoot, true)
  const backupPath = Path.join(backupRoot, "custom_phrase.txt")
  FileManager.copyFileSync(path, backupPath)

  const tempPath = Path.join(root, `custom_phrase.txt.toolbox-${timestampName()}.tmp`)
  await FileManager.writeAsString(tempPath, nextContent)
  const tempText = await FileManager.readAsString(tempPath)
  const tempParsed = parseCustomPhraseDocument(tempText)
  if (tempParsed.invalid.length > 0 || tempParsed.hash !== parsedNext.hash) {
    if (await FileManager.exists(tempPath)) FileManager.removeSync(tempPath)
    throw new Error("临时文件校验失败，已删除临时文件，原文件未改动")
  }

  const replacePath = Path.join(root, `custom_phrase.txt.replacing-${timestampName()}`)
  FileManager.copyFileSync(tempPath, replacePath)
  if (await FileManager.exists(path)) FileManager.removeSync(path)
  FileManager.copyFileSync(replacePath, path)
  FileManager.removeSync(tempPath)
  FileManager.removeSync(replacePath)

  const written = await FileManager.readAsString(path)
  const writtenHash = hashCustomPhrase(written)
  if (writtenHash !== parsedNext.hash) {
    FileManager.copyFileSync(backupPath, path)
    throw new Error("写入后哈希不一致，已从备份恢复原文件")
  }

  return {
    backupPath,
    inserted: diff.inserts.length,
    updated: diff.updates.length,
    hash: writtenHash,
  }
}
