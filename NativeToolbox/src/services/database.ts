import { Path } from "scripting"
import type { ClipboardItem, LexiconEntry, Snippet, SnippetCategory, Workspace } from "../models/types"
import { runMigrations, validateSchema } from "../migrations"

const rootDirectory = Path.join(FileManager.documentsDirectory, "NativeToolbox")
const databasePath = Path.join(rootDirectory, "toolbox.sqlite")
const assetsDirectory = Path.join(rootDirectory, "assets", "clipboard")
const exportsDirectory = Path.join(rootDirectory, "exports")
const backupsDirectory = Path.join(rootDirectory, "backups")
const logsDirectory = Path.join(rootDirectory, "logs")

// SQLite.open 要求父目录已经存在；同步创建发生在模块初始化阶段。
if (!FileManager.existsSync(rootDirectory)) {
  FileManager.createDirectorySync(rootDirectory, true)
}

export const paths = {
  rootDirectory,
  databasePath,
  assetsDirectory,
  exportsDirectory,
  backupsDirectory,
  logsDirectory,
}

export async function ensureAppDirectories() {
  for (const path of [rootDirectory, assetsDirectory, exportsDirectory, backupsDirectory, logsDirectory]) {
    if (!(await FileManager.exists(path))) {
      await FileManager.createDirectory(path, true)
    }
  }
}

const db = SQLite.open(databasePath, {
  foreignKeysEnabled: true,
  journalMode: "wal",
  busyMode: 5,
  maximumReaderCount: 3,
  label: "native-toolbox-main",
})

export async function migrateDatabase() {
  await ensureAppDirectories()
  const report = await runMigrations(db, databasePath, backupsDirectory)
  await validateSchema(db)
  return report
}

export async function listClipboardItems(query = "", kind: "all" | "text" | "url" | "image" | "favorite" = "all") {
  const filters: string[] = []
  const args: Array<string | number> = []
  if (query.trim()) {
    filters.push("(content LIKE ? OR title LIKE ? OR note LIKE ?)")
    const q = `%${query.trim()}%`
    args.push(q, q, q)
  }
  if (kind === "favorite") filters.push("is_favorite = 1")
  else if (kind !== "all") {
    filters.push("kind = ?")
    args.push(kind)
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
  return db.fetchAll<ClipboardItem>(`
    SELECT * FROM clipboard_items
    ${where}
    ORDER BY is_pinned DESC, updated_at DESC
    LIMIT 1000
  `, args)
}

export async function findClipboardByFingerprint(fingerprint: string) {
  return db.fetchAll<ClipboardItem>(
    "SELECT * FROM clipboard_items WHERE fingerprint = ? ORDER BY updated_at DESC LIMIT 1",
    [fingerprint]
  ).then(rows => rows[0] ?? null)
}

export async function insertClipboardItem(item: ClipboardItem) {
  await db.execute(`
    INSERT INTO clipboard_items(
      id,kind,content,asset_path,fingerprint,title,note,is_favorite,is_pinned,
      created_at,updated_at,last_copied_at,expires_at,byte_size
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [
    item.id, item.kind, item.content, item.asset_path, item.fingerprint,
    item.title, item.note, item.is_favorite, item.is_pinned, item.created_at,
    item.updated_at, item.last_copied_at, item.expires_at, item.byte_size,
  ])
}

export async function touchClipboardItem(id: string, now: number) {
  await db.execute("UPDATE clipboard_items SET updated_at = ? WHERE id = ?", [now, id])
}

export async function toggleClipboardFavorite(id: string) {
  await db.execute(`
    UPDATE clipboard_items
    SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
        updated_at = ?
    WHERE id = ?
  `, [Date.now(), id])
}

export async function deleteClipboardItem(id: string) {
  await db.execute("DELETE FROM clipboard_items WHERE id = ?", [id])
}

export async function markClipboardCopied(id: string) {
  await db.execute("UPDATE clipboard_items SET last_copied_at = ? WHERE id = ?", [Date.now(), id])
}

export async function cleanupClipboard(maxItems: number, now: number) {
  await db.execute("DELETE FROM clipboard_items WHERE is_favorite = 0 AND expires_at IS NOT NULL AND expires_at < ?", [now])
  await db.execute(`
    DELETE FROM clipboard_items
    WHERE is_favorite = 0 AND id IN (
      SELECT id FROM clipboard_items
      WHERE is_favorite = 0
      ORDER BY updated_at DESC
      LIMIT -1 OFFSET ?
    )
  `, [maxItems])
}

export async function listWorkspaces() {
  return db.fetchAll<Workspace>("SELECT * FROM workspaces ORDER BY name")
}

export async function findWorkspaceByBookmark(bookmarkName: string) {
  const rows = await db.fetchAll<Workspace>(
    "SELECT * FROM workspaces WHERE bookmark_name = ? ORDER BY last_checked_at DESC LIMIT 1",
    [bookmarkName],
  )
  return rows[0] ?? null
}

export async function upsertWorkspace(workspace: Workspace) {
  await db.execute(`
    INSERT INTO workspaces(
      id,type,name,bookmark_name,display_path,version,last_seen_hash,last_checked_at,status
    ) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      type=excluded.type,
      name=excluded.name,
      bookmark_name=excluded.bookmark_name,
      display_path=excluded.display_path,
      version=excluded.version,
      last_seen_hash=excluded.last_seen_hash,
      last_checked_at=excluded.last_checked_at,
      status=excluded.status
  `, [
    workspace.id, workspace.type, workspace.name, workspace.bookmark_name,
    workspace.display_path, workspace.version, workspace.last_seen_hash,
    workspace.last_checked_at, workspace.status,
  ])
}

export async function removeWorkspace(id: string) {
  await db.execute("DELETE FROM workspaces WHERE id = ?", [id])
}

export async function listSnippetCategories() {
  return db.fetchAll<SnippetCategory>(
    "SELECT * FROM snippet_categories ORDER BY sort_order, name"
  )
}

export async function listSnippets(
  query = "",
  options: { favoriteOnly?: boolean; categoryId?: string | null } = {},
) {
  const filters: string[] = []
  const args: Array<string | number> = []
  if (query.trim()) {
    filters.push("(title LIKE ? OR body LIKE ?)")
    const q = `%${query.trim()}%`
    args.push(q, q)
  }
  if (options.favoriteOnly) filters.push("is_favorite = 1")
  if (options.categoryId) {
    filters.push("category_id = ?")
    args.push(options.categoryId)
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
  return db.fetchAll<Snippet>(`
    SELECT * FROM snippets
    ${where}
    ORDER BY is_pinned DESC, is_favorite DESC, sort_order, updated_at DESC
    LIMIT 1000
  `, args)
}

export async function upsertSnippet(snippet: Snippet) {
  await db.execute(`
    INSERT INTO snippets(
      id,category_id,title,body,is_template,is_favorite,is_pinned,sort_order,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      category_id=excluded.category_id,
      title=excluded.title,
      body=excluded.body,
      is_template=excluded.is_template,
      is_favorite=excluded.is_favorite,
      is_pinned=excluded.is_pinned,
      sort_order=excluded.sort_order,
      updated_at=excluded.updated_at
  `, [
    snippet.id, snippet.category_id, snippet.title, snippet.body,
    snippet.is_template, snippet.is_favorite, snippet.is_pinned,
    snippet.sort_order, snippet.created_at, snippet.updated_at,
  ])
}

export async function toggleSnippetFavorite(id: string) {
  await db.execute(`
    UPDATE snippets
    SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
        updated_at = ?
    WHERE id = ?
  `, [Date.now(), id])
}

export async function deleteSnippet(id: string) {
  await db.execute("DELETE FROM snippets WHERE id = ?", [id])
}

export async function countLexiconEntries() {
  const rows = await db.fetchAll<{ total: number }>("SELECT COUNT(*) AS total FROM lexicon_entries")
  return rows[0]?.total ?? 0
}

export async function listLexiconEntries(query = "") {
  const filters: string[] = []
  const args: Array<string | number> = []
  if (query.trim()) {
    filters.push("(text LIKE ? OR IFNULL(code, '') LIKE ? OR IFNULL(category, '') LIKE ? OR IFNULL(note, '') LIKE ?)")
    const q = `%${query.trim()}%`
    args.push(q, q, q, q)
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
  return db.fetchAll<LexiconEntry>(`
    SELECT * FROM lexicon_entries
    ${where}
    ORDER BY updated_at DESC
    LIMIT 1000
  `, args)
}

export async function upsertLexiconEntry(entry: LexiconEntry) {
  await db.execute(`
    INSERT INTO lexicon_entries(
      id,text,code,weight,category,note,source,workspace_id,external_key,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      text=excluded.text,
      code=excluded.code,
      weight=excluded.weight,
      category=excluded.category,
      note=excluded.note,
      source=excluded.source,
      workspace_id=excluded.workspace_id,
      external_key=excluded.external_key,
      updated_at=excluded.updated_at
  `, [
    entry.id, entry.text, entry.code, entry.weight, entry.category, entry.note,
    entry.source, entry.workspace_id, entry.external_key, entry.created_at, entry.updated_at,
  ])
}

export async function deleteLexiconEntry(id: string) {
  await db.execute("DELETE FROM lexicon_entries WHERE id = ?", [id])
}

export { db }
