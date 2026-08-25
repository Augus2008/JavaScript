import { Path } from "scripting"
import type { Workspace } from "../models/types"
import { upsertWorkspace } from "./database"

function hashText(text: string) {
  const data = Data.fromRawString(text)
  if (data == null) throw new Error("文件不是有效 UTF-8 文本")
  return Crypto.sha256(data).toHexString()
}

function basename(path: string) {
  return path.split("/").filter(Boolean).pop() ?? "工作区"
}

export async function chooseAndConnectWorkspace() {
  const result = await DocumentPicker.pickDirectoryBookmark({
    preferredName: "NativeToolbox Wanxiang",
  })
  if (result == null) return null

  const root = FileManager.bookmarkedPath(result.bookmarkName)
  if (root == null) throw new Error("目录授权已保存，但无法恢复访问路径")

  const schemaPath = Path.join(root, "wanxiang.schema.yaml")
  const versionPath = Path.join(root, "version.txt")
  const isWanxiang = await FileManager.exists(schemaPath)
  const version = await FileManager.exists(versionPath)
    ? (await FileManager.readAsString(versionPath)).trim()
    : null
  const schemaText = isWanxiang ? await FileManager.readAsString(schemaPath) : ""

  const workspace: Workspace = {
    id: UUID.string(),
    type: isWanxiang ? "wanxiang" : "generic",
    name: isWanxiang ? "万象拼音" : basename(root),
    bookmark_name: result.bookmarkName,
    display_path: root,
    version,
    last_seen_hash: isWanxiang ? hashText(schemaText) : null,
    last_checked_at: Date.now(),
    status: "connected",
  }
  await upsertWorkspace(workspace)
  return workspace
}

export async function refreshWorkspace(workspace: Workspace) {
  const root = FileManager.bookmarkedPath(workspace.bookmark_name)
  if (root == null) {
    return { ...workspace, status: "unavailable" as const, last_checked_at: Date.now() }
  }
  const schemaPath = Path.join(root, "wanxiang.schema.yaml")
  if (workspace.type === "wanxiang" && !(await FileManager.exists(schemaPath))) {
    return { ...workspace, status: "unavailable" as const, last_checked_at: Date.now() }
  }
  const versionPath = Path.join(root, "version.txt")
  const version = await FileManager.exists(versionPath)
    ? (await FileManager.readAsString(versionPath)).trim()
    : null
  return { ...workspace, display_path: root, version, status: "connected" as const, last_checked_at: Date.now() }
}
