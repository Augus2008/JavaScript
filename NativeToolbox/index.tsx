// @ts-nocheck
// NativeToolbox v0.1.2 single-file build.
// index.tsx
import {
  ContentUnavailableView as ContentUnavailableView4,
  Navigation,
  Script
} from "scripting";

// app/App.tsx
import { Tab, TabView, useObservable } from "scripting";

// features/clipboard/ClipboardScreen.tsx
import {
  Button,
  ContentUnavailableView,
  HStack,
  Image,
  List,
  NavigationStack,
  Picker,
  Section,
  Spacer,
  Text,
  VStack,
  useEffect,
  useState
} from "scripting";

// services/database.ts
import { Path } from "scripting";
var rootDirectory = Path.join(FileManager.documentsDirectory, "NativeToolbox");
var databasePath = Path.join(rootDirectory, "toolbox.sqlite");
var assetsDirectory = Path.join(rootDirectory, "assets", "clipboard");
var exportsDirectory = Path.join(rootDirectory, "exports");
var backupsDirectory = Path.join(rootDirectory, "backups");
var logsDirectory = Path.join(rootDirectory, "logs");
if (!FileManager.existsSync(rootDirectory)) {
  FileManager.createDirectorySync(rootDirectory, true);
}
async function ensureAppDirectories() {
  for (const path of [rootDirectory, assetsDirectory, exportsDirectory, backupsDirectory, logsDirectory]) {
    if (!await FileManager.exists(path)) {
      await FileManager.createDirectory(path, true);
    }
  }
}
var db = SQLite.open(databasePath, {
  foreignKeysEnabled: true,
  journalMode: "wal",
  busyMode: 5,
  maximumReaderCount: 3,
  label: "native-toolbox-main"
});
async function migrateDatabase() {
  await ensureAppDirectories();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clipboard_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('text', 'url', 'image')),
      content TEXT,
      asset_path TEXT,
      fingerprint TEXT NOT NULL,
      title TEXT,
      note TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_copied_at INTEGER,
      expires_at INTEGER,
      byte_size INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_clipboard_fingerprint ON clipboard_items(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_clipboard_updated ON clipboard_items(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clipboard_favorite ON clipboard_items(is_favorite, updated_at DESC);

    CREATE TABLE IF NOT EXISTS snippet_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_template INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(category_id) REFERENCES snippet_categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS text_pipelines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      steps_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lexicon_entries (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      code TEXT,
      weight INTEGER NOT NULL DEFAULT 10,
      category TEXT,
      note TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      workspace_id TEXT,
      external_key TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      bookmark_name TEXT NOT NULL,
      display_path TEXT NOT NULL,
      version TEXT,
      last_seen_hash TEXT,
      last_checked_at INTEGER,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_changes (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      target_file TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      base_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
  `);
  const rows = await db.fetchAll("SELECT version FROM schema_meta LIMIT 1");
  if (rows.length === 0) {
    await db.execute("INSERT INTO schema_meta(version) VALUES (?)", [1]);
    await seedCategories();
  }
}
async function seedCategories() {
  const rows = [
    ["work", "\u5DE5\u4F5C", "briefcase.fill", 0],
    ["life", "\u751F\u6D3B", "house.fill", 1],
    ["address", "\u5730\u5740", "mappin.and.ellipse", 2],
    ["code", "\u4EE3\u7801", "chevron.left.forwardslash.chevron.right", 3]
  ];
  await db.transaction(rows.map((row) => ({
    sql: "INSERT OR IGNORE INTO snippet_categories(id,name,symbol,sort_order) VALUES (?,?,?,?)",
    args: row
  })));
}
async function listClipboardItems(query = "", kind = "all") {
  const filters = [];
  const args = [];
  if (query.trim()) {
    filters.push("(content LIKE ? OR title LIKE ? OR note LIKE ?)");
    const q = `%${query.trim()}%`;
    args.push(q, q, q);
  }
  if (kind === "favorite") filters.push("is_favorite = 1");
  else if (kind !== "all") {
    filters.push("kind = ?");
    args.push(kind);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  return db.fetchAll(`
    SELECT * FROM clipboard_items
    ${where}
    ORDER BY is_pinned DESC, updated_at DESC
    LIMIT 1000
  `, args);
}
async function findClipboardByFingerprint(fingerprint2) {
  return db.fetchAll(
    "SELECT * FROM clipboard_items WHERE fingerprint = ? ORDER BY updated_at DESC LIMIT 1",
    [fingerprint2]
  ).then((rows) => rows[0] ?? null);
}
async function insertClipboardItem(item) {
  await db.execute(`
    INSERT INTO clipboard_items(
      id,kind,content,asset_path,fingerprint,title,note,is_favorite,is_pinned,
      created_at,updated_at,last_copied_at,expires_at,byte_size
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [
    item.id,
    item.kind,
    item.content,
    item.asset_path,
    item.fingerprint,
    item.title,
    item.note,
    item.is_favorite,
    item.is_pinned,
    item.created_at,
    item.updated_at,
    item.last_copied_at,
    item.expires_at,
    item.byte_size
  ]);
}
async function touchClipboardItem(id, now) {
  await db.execute("UPDATE clipboard_items SET updated_at = ? WHERE id = ?", [now, id]);
}
async function toggleClipboardFavorite(id) {
  await db.execute(`
    UPDATE clipboard_items
    SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
        updated_at = ?
    WHERE id = ?
  `, [Date.now(), id]);
}
async function deleteClipboardItem(id) {
  await db.execute("DELETE FROM clipboard_items WHERE id = ?", [id]);
}
async function markClipboardCopied(id) {
  await db.execute("UPDATE clipboard_items SET last_copied_at = ? WHERE id = ?", [Date.now(), id]);
}
async function cleanupClipboard(maxItems, now) {
  await db.execute("DELETE FROM clipboard_items WHERE is_favorite = 0 AND expires_at IS NOT NULL AND expires_at < ?", [now]);
  await db.execute(`
    DELETE FROM clipboard_items
    WHERE is_favorite = 0 AND id IN (
      SELECT id FROM clipboard_items
      WHERE is_favorite = 0
      ORDER BY updated_at DESC
      LIMIT -1 OFFSET ?
    )
  `, [maxItems]);
}
async function listWorkspaces() {
  return db.fetchAll("SELECT * FROM workspaces ORDER BY name");
}
async function upsertWorkspace(workspace) {
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
    workspace.id,
    workspace.type,
    workspace.name,
    workspace.bookmark_name,
    workspace.display_path,
    workspace.version,
    workspace.last_seen_hash,
    workspace.last_checked_at,
    workspace.status
  ]);
}
async function removeWorkspace(id) {
  await db.execute("DELETE FROM workspaces WHERE id = ?", [id]);
}

// services/pasteboard.ts
var DEFAULT_SETTINGS = {
  captureText: true,
  captureImages: false,
  duplicatePolicy: "moveToTop",
  maxItems: 500,
  retentionDays: 30
};
var SETTINGS_KEY = "native-toolbox.settings.v1";
var CHANGE_COUNT_KEY = "native-toolbox.pasteboard.changeCount";
function loadSettings() {
  return {
    ...DEFAULT_SETTINGS,
    ...Storage.get(SETTINGS_KEY) ?? {}
  };
}
function saveSettings(settings) {
  return Storage.set(SETTINGS_KEY, settings);
}
function normalizeText(text) {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trimEnd();
}
function asData(value) {
  const data = Data.fromRawString(value);
  if (data == null) throw new Error("\u65E0\u6CD5\u5C06\u6587\u672C\u7F16\u7801\u4E3A UTF-8");
  return data;
}
function fingerprint(kind, content) {
  return Crypto.sha256(asData(`${kind}\0${content}`)).toHexString();
}
function looksLikeURL(text) {
  return /^https?:\/\/\S+$/i.test(text.trim());
}
async function captureTextValue(raw, settings) {
  const content = normalizeText(raw);
  if (!content) return false;
  const kind = looksLikeURL(content) ? "url" : "text";
  const hash = fingerprint(kind, content);
  const existing = await findClipboardByFingerprint(hash);
  const now = Date.now();
  if (existing && settings.duplicatePolicy === "ignore") return false;
  if (existing && settings.duplicatePolicy === "moveToTop") {
    await touchClipboardItem(existing.id, now);
    return true;
  }
  const item = {
    id: UUID.string(),
    kind,
    content,
    asset_path: null,
    fingerprint: hash,
    title: null,
    note: null,
    is_favorite: 0,
    is_pinned: 0,
    created_at: now,
    updated_at: now,
    last_copied_at: null,
    expires_at: settings.retentionDays > 0 ? now + settings.retentionDays * 24 * 60 * 60 * 1e3 : null,
    byte_size: asData(content).size
  };
  await insertClipboardItem(item);
  await cleanupClipboard(settings.maxItems, now);
  return true;
}
async function captureCurrentPasteboard(settings = loadSettings()) {
  let changed = false;
  if (settings.captureText) {
    const values = await Pasteboard.getStrings();
    for (const value of values ?? []) {
      changed = await captureTextValue(value, settings) || changed;
    }
  }
  const count = await Pasteboard.changeCount;
  Storage.set(CHANGE_COUNT_KEY, count);
  return changed;
}
async function captureIfChanged(settings = loadSettings()) {
  const current = await Pasteboard.changeCount;
  const previous = Storage.get(CHANGE_COUNT_KEY);
  if (previous === current) return false;
  return captureCurrentPasteboard(settings);
}
function installPasteboardListener(onCaptured) {
  Pasteboard.onChanged = () => {
    captureCurrentPasteboard().then((changed) => changed && onCaptured()).catch((error) => console.error("Pasteboard capture failed", error));
  };
  return () => {
    Pasteboard.onChanged = null;
  };
}

// features/clipboard/ClipboardScreen.tsx
function relativeTime(timestamp) {
  const delta = Math.max(0, Date.now() - timestamp);
  const minute = 6e4;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return "\u521A\u521A";
  if (delta < hour) return `${Math.floor(delta / minute)} \u5206\u949F\u524D`;
  if (delta < day) return `${Math.floor(delta / hour)} \u5C0F\u65F6\u524D`;
  return `${Math.floor(delta / day)} \u5929\u524D`;
}
function ClipboardRow({ item, reload }) {
  const icon = item.kind === "url" ? "link" : "doc.text";
  const copy = async () => {
    if (item.content != null) {
      await Pasteboard.setString(item.content);
      await markClipboardCopied(item.id);
      reload();
    }
  };
  return <HStack
    spacing={12}
    leadingSwipeActions={{
      allowsFullSwipe: false,
      actions: [
        <Button
          title={item.is_favorite ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF"}
          systemImage={item.is_favorite ? "star.slash" : "star"}
          tint="systemOrange"
          action={async () => {
            await toggleClipboardFavorite(item.id);
            reload();
          }}
        />
      ]
    }}
    trailingSwipeActions={{
      actions: [
        <Button
          title="删除"
          systemImage="trash"
          role="destructive"
          action={async () => {
            await deleteClipboardItem(item.id);
            reload();
          }}
        />
      ]
    }}
  >
      <Image systemName={icon} foregroundColor="systemBlue" />
      <VStack alignment="leading" spacing={5}>
        <Text font="body" lineLimit={4}>{item.content ?? ""}</Text>
        <HStack>
          <Text font="caption" foregroundColor="secondary">
            {item.kind === "url" ? "\u94FE\u63A5" : "\u6587\u672C"} · {relativeTime(item.updated_at)}
          </Text>
          <Spacer />
          {item.is_favorite === 1 && <Image systemName="star.fill" foregroundColor="systemOrange" />}
        </HStack>
      </VStack>
      <Button title="复制" systemImage="doc.on.doc" buttonStyle="borderless" action={copy} />
    </HStack>;
}
function ClipboardScreen() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reload = () => {
    listClipboardItems(query, filter).then(setItems).catch((e) => setError(String(e))).finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
  }, [query, filter]);
  useEffect(() => {
    const remove = installPasteboardListener(reload);
    return remove;
  }, []);
  const capture = async () => {
    setLoading(true);
    setError(null);
    try {
      await captureCurrentPasteboard(loadSettings());
      reload();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };
  const overlay = error != null ? <ContentUnavailableView title="无法读取剪贴板" systemImage="exclamationmark.triangle" description={error} /> : !loading && items.length === 0 ? <ContentUnavailableView
    label={<Text>暂无剪贴板内容</Text>}
    description={<Text>复制一段文字，或点击“立即采集”。</Text>}
    actions={[<Button title="立即采集" systemImage="arrow.clockwise" action={capture} />]}
  /> : void 0;
  return <NavigationStack>
      <List
    navigationTitle="剪贴板"
    navigationBarTitleDisplayMode="large"
    listStyle="insetGrouped"
    searchable={{ value: query, onChanged: setQuery, prompt: "\u641C\u7D22\u526A\u8D34\u677F" }}
    overlay={overlay}
  >
        <Section>
          <Button
    title={loading ? "\u6B63\u5728\u91C7\u96C6\u2026" : "\u7ACB\u5373\u91C7\u96C6"}
    systemImage="arrow.clockwise"
    disabled={loading}
    action={capture}
  />
        </Section>
        <Section>
          <Picker
    title="筛选"
    pickerStyle="segmented"
    value={filter}
    onChanged={(value) => setFilter(value)}
  >
            <Text tag="all">全部</Text>
            <Text tag="text">文本</Text>
            <Text tag="url">链接</Text>
            <Text tag="favorite">收藏</Text>
          </Picker>
        </Section>
        {items.length > 0 && <Section>
          {items.map((item) => <ClipboardRow key={item.id} item={item} reload={reload} />)}
        </Section>}
      </List>
    </NavigationStack>;
}

// features/snippets/SnippetsScreen.tsx
import {
  Button as Button2,
  ContentUnavailableView as ContentUnavailableView2,
  List as List2,
  NavigationStack as NavigationStack2,
  Text as Text2
} from "scripting";
function SnippetsScreen() {
  return <NavigationStack2>
      <List2
    navigationTitle="常用语"
    navigationBarTitleDisplayMode="large"
    listStyle="insetGrouped"
    searchable={{ value: "", onChanged: () => {
    }, prompt: "\u641C\u7D22\u5E38\u7528\u8BED" }}
    overlay={<ContentUnavailableView2
      label={<Text2>还没有常用语</Text2>}
      description={<Text2>下一开发切片将启用分类、模板变量和从剪贴板创建。</Text2>}
      actions={[<Button2 title="新建常用语" systemImage="plus" disabled action={() => {
      }} />]}
    />}
  />
    </NavigationStack2>;
}

// features/textlab/TextLabScreen.tsx
import {
  Button as Button3,
  Editor,
  EditorController,
  HStack as HStack2,
  NavigationStack as NavigationStack3,
  Picker as Picker2,
  ScrollView,
  Text as Text3,
  VStack as VStack2,
  useEffect as useEffect2,
  useMemo,
  useState as useState2
} from "scripting";

// features/textlab/processors.ts
function trimWhitespace(input) {
  return input.replace(/\r\n?/g, "\n").trim();
}
function mergeBlankLines(input) {
  return input.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
}
function removeEmptyLines(input) {
  return input.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim().length > 0).join("\n");
}
function dedupeLines(input) {
  const seen = /* @__PURE__ */ new Set();
  return input.replace(/\r\n?/g, "\n").split("\n").filter((line) => {
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  }).join("\n");
}
function sortLines(input) {
  return input.replace(/\r\n?/g, "\n").split("\n").sort((a, b) => a.localeCompare(b, "zh-Hans-CN")).join("\n");
}
function formatJSON(input) {
  return JSON.stringify(JSON.parse(input), null, 2);
}
function applyTextOperation(input, operation) {
  switch (operation) {
    case "trim":
      return trimWhitespace(input);
    case "blankLines":
      return mergeBlankLines(input);
    case "removeEmpty":
      return removeEmptyLines(input);
    case "dedupe":
      return dedupeLines(input);
    case "sort":
      return sortLines(input);
    case "json":
      return formatJSON(input);
  }
}

// features/textlab/TextLabScreen.tsx
function TextLabScreen() {
  const [mode, setMode] = useState2("input");
  const [source, setSource] = useState2("");
  const [result, setResult] = useState2("");
  const [error, setError] = useState2(null);
  const inputController = useMemo(() => new EditorController({ content: source, ext: "txt", readOnly: false }), []);
  const resultController = useMemo(() => new EditorController({ content: result, ext: "txt", readOnly: true }), []);
  useEffect2(() => () => {
    inputController.dispose();
    resultController.dispose();
  }, [inputController, resultController]);
  const run2 = async (operation) => {
    try {
      const current = inputController.content;
      setSource(current);
      const output = applyTextOperation(current, operation);
      resultController.content = output;
      setResult(output);
      setMode("result");
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };
  const copyResult = async () => {
    await Pasteboard.setString(resultController.content);
  };
  return <NavigationStack3>
      <VStack2 spacing={12} navigationTitle="文本工作台" navigationBarTitleDisplayMode="large">
        <Picker2 title="模式" pickerStyle="segmented" value={mode} onChanged={(value) => setMode(value)}>
          <Text3 tag="input">输入</Text3>
          <Text3 tag="result">结果</Text3>
        </Picker2>
        <VStack2 frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
          {mode === "input" ? <Editor controller={inputController} scriptName="文本输入" showAccessoryView /> : <Editor controller={resultController} scriptName="处理结果" showAccessoryView />}
        </VStack2>
        {error != null && <Text3 foregroundColor="systemRed" font="caption">{error}</Text3>}
        <ScrollView axis="horizontal" showsIndicators={false}>
          <HStack2 spacing={8}>
            <Button3 title="清理空白" systemImage="line.3.horizontal.decrease" buttonStyle="bordered" action={() => run2("trim")} />
            <Button3 title="合并空行" systemImage="line.3.horizontal" buttonStyle="bordered" action={() => run2("blankLines")} />
            <Button3 title="删除空行" systemImage="minus.rectangle" buttonStyle="bordered" action={() => run2("removeEmpty")} />
            <Button3 title="行去重" systemImage="square.on.square" buttonStyle="bordered" action={() => run2("dedupe")} />
            <Button3 title="行排序" systemImage="arrow.up.arrow.down" buttonStyle="bordered" action={() => run2("sort")} />
            <Button3 title="JSON" systemImage="curlybraces" buttonStyle="bordered" action={() => run2("json")} />
          </HStack2>
        </ScrollView>
        <HStack2 spacing={12}>
          <Button3 title="还原" systemImage="arrow.uturn.backward" action={() => setMode("input")} />
          <Button3 title="复制结果" systemImage="doc.on.doc" buttonStyle="borderedProminent" disabled={!result} action={copyResult} />
        </HStack2>
      </VStack2>
    </NavigationStack3>;
}

// features/lexicon/LexiconScreen.tsx
import {
  Button as Button4,
  ContentUnavailableView as ContentUnavailableView3,
  HStack as HStack3,
  Image as Image2,
  Label as Label2,
  List as List3,
  NavigationStack as NavigationStack4,
  Section as Section2,
  Spacer as Spacer2,
  Text as Text4,
  VStack as VStack3,
  useEffect as useEffect3,
  useState as useState3
} from "scripting";

// services/workspace-bookmarks.ts
import { Path as Path2 } from "scripting";
function hashText(text) {
  const data = Data.fromRawString(text);
  if (data == null) throw new Error("\u6587\u4EF6\u4E0D\u662F\u6709\u6548 UTF-8 \u6587\u672C");
  return Crypto.sha256(data).toHexString();
}
function basename(path) {
  return path.split("/").filter(Boolean).pop() ?? "\u5DE5\u4F5C\u533A";
}
async function chooseAndConnectWorkspace() {
  const result = await DocumentPicker.pickDirectoryBookmark({
    preferredName: "NativeToolbox Wanxiang"
  });
  if (result == null) return null;
  const root = FileManager.bookmarkedPath(result.bookmarkName);
  if (root == null) throw new Error("\u76EE\u5F55\u6388\u6743\u5DF2\u4FDD\u5B58\uFF0C\u4F46\u65E0\u6CD5\u6062\u590D\u8BBF\u95EE\u8DEF\u5F84");
  const schemaPath = Path2.join(root, "wanxiang.schema.yaml");
  const versionPath = Path2.join(root, "version.txt");
  const isWanxiang = await FileManager.exists(schemaPath);
  const version = await FileManager.exists(versionPath) ? (await FileManager.readAsString(versionPath)).trim() : null;
  const schemaText = isWanxiang ? await FileManager.readAsString(schemaPath) : "";
  const workspace = {
    id: UUID.string(),
    type: isWanxiang ? "wanxiang" : "generic",
    name: isWanxiang ? "\u4E07\u8C61\u62FC\u97F3" : basename(root),
    bookmark_name: result.bookmarkName,
    display_path: root,
    version,
    last_seen_hash: isWanxiang ? hashText(schemaText) : null,
    last_checked_at: Date.now(),
    status: "connected"
  };
  await upsertWorkspace(workspace);
  return workspace;
}
async function refreshWorkspace(workspace) {
  const root = FileManager.bookmarkedPath(workspace.bookmark_name);
  if (root == null) {
    return { ...workspace, status: "unavailable", last_checked_at: Date.now() };
  }
  const schemaPath = Path2.join(root, "wanxiang.schema.yaml");
  if (workspace.type === "wanxiang" && !await FileManager.exists(schemaPath)) {
    return { ...workspace, status: "unavailable", last_checked_at: Date.now() };
  }
  const versionPath = Path2.join(root, "version.txt");
  const version = await FileManager.exists(versionPath) ? (await FileManager.readAsString(versionPath)).trim() : null;
  return { ...workspace, display_path: root, version, status: "connected", last_checked_at: Date.now() };
}

// features/lexicon/LexiconScreen.tsx
function WorkspaceRow({ workspace, reload }) {
  const connected = workspace.status === "connected";
  return <HStack3
    spacing={12}
    trailingSwipeActions={{
      actions: [
        <Button4
          title="断开"
          systemImage="link.badge.minus"
          role="destructive"
          action={async () => {
            await removeWorkspace(workspace.id);
            reload();
          }}
        />
      ]
    }}
  >
      <Image2 systemName="square.stack.3d.up.fill" foregroundColor="systemIndigo" />
      <VStack3 alignment="leading" spacing={4}>
        <Text4 font="headline">{workspace.name}</Text4>
        <Text4 font="caption" foregroundColor="secondary">
          {workspace.type === "wanxiang" ? `Base \xB7 v${workspace.version ?? "\u672A\u77E5"}` : "\u901A\u7528\u76EE\u5F55"}
        </Text4>
        <Text4 font="caption2" foregroundColor="secondary" lineLimit={1}>{workspace.display_path}</Text4>
      </VStack3>
      <Spacer2 />
      <VStack3 alignment="trailing">
        <Image2 systemName={connected ? "checkmark.circle.fill" : "exclamationmark.circle.fill"} foregroundColor={connected ? "systemGreen" : "systemOrange"} />
        <Text4 font="caption2" foregroundColor="secondary">{connected ? "\u5DF2\u8FDE\u63A5" : "\u9700\u91CD\u65B0\u6388\u6743"}</Text4>
      </VStack3>
    </HStack3>;
}
function LexiconScreen() {
  const [workspaces, setWorkspaces] = useState3([]);
  const [loading, setLoading] = useState3(true);
  const [error, setError] = useState3(null);
  const reload = () => {
    listWorkspaces().then(async (rows) => {
      const refreshed = [];
      for (const row of rows) {
        const value = await refreshWorkspace(row);
        await upsertWorkspace(value);
        refreshed.push(value);
      }
      setWorkspaces(refreshed);
    }).catch((e) => setError(String(e))).finally(() => setLoading(false));
  };
  useEffect3(() => {
    reload();
  }, []);
  const connect = async () => {
    setError(null);
    try {
      await chooseAndConnectWorkspace();
      reload();
    } catch (e) {
      setError(String(e));
    }
  };
  const overlay = error != null ? <ContentUnavailableView3 title="无法连接词库" systemImage="exclamationmark.triangle" description={error} /> : !loading && workspaces.length === 0 ? <ContentUnavailableView3
    label={<Text4>还没有词库工作区</Text4>}
    description={<Text4>工具箱可以独立维护词条；也可以授权一个万象目录。</Text4>}
    actions={[<Button4 title="连接外部目录" systemImage="folder.badge.plus" action={connect} />]}
  /> : void 0;
  return <NavigationStack4>
      <List3
    navigationTitle="词库中心"
    navigationBarTitleDisplayMode="large"
    listStyle="insetGrouped"
    overlay={overlay}
  >
        <Section2>
          <Button4 title="连接外部目录" systemImage="folder.badge.plus" action={connect} />
        </Section2>
        {workspaces.length > 0 && <Section2 header={<Text4>工作区</Text4>}>
          {workspaces.map((workspace) => <WorkspaceRow key={workspace.id} workspace={workspace} reload={reload} />)}
        </Section2>}
        <Section2 header={<Text4>内部词库</Text4>} footer={<Text4>词条编辑与万象差异提交将在下一开发切片启用。</Text4>}>
          <Label2 title="0 个词条" systemImage="text.book.closed" />
          <Label2 title="0 项待提交" systemImage="arrow.triangle.2.circlepath" />
        </Section2>
      </List3>
    </NavigationStack4>;
}

// features/settings/SettingsScreen.tsx
import {
  Form,
  HStack as HStack4,
  Label as Label3,
  NavigationStack as NavigationStack5,
  Picker as Picker3,
  Section as Section3,
  Spacer as Spacer3,
  Stepper,
  Text as Text5,
  Toggle,
  useState as useState4
} from "scripting";
function SettingsScreen() {
  const [settings, setSettings] = useState4(() => loadSettings());
  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };
  return <NavigationStack5>
      <Form
    navigationTitle="设置"
    navigationBarTitleDisplayMode="large"
    formStyle="grouped"
  >
        <Section3 header={<Text5>剪贴板采集</Text5>} footer={<Text5>实时监听仅在工具箱脚本活跃期间工作；返回前台时会立即补采。</Text5>}>
          <Toggle title="采集文本和链接" value={settings.captureText} onChanged={(value) => update({ captureText: value })} />
          <Toggle title="采集图片（开发中）" value={settings.captureImages} onChanged={(value) => update({ captureImages: value })} />
          <Picker3
    title="重复内容"
    value={settings.duplicatePolicy}
    onChanged={(value) => update({ duplicatePolicy: value })}
  >
            <Text5 tag="ignore">忽略</Text5>
            <Text5 tag="moveToTop">更新到顶部</Text5>
            <Text5 tag="keepCopy">保留副本</Text5>
          </Picker3>
          <Stepper
    title={`\u6700\u591A\u4FDD\u7559 ${settings.maxItems} \u6761`}
    onIncrement={() => update({ maxItems: Math.min(2e3, settings.maxItems + 100) })}
    onDecrement={() => update({ maxItems: Math.max(100, settings.maxItems - 100) })}
  />
          <Stepper
    title={settings.retentionDays === 0 ? "\u6C38\u4E45\u4FDD\u7559\u975E\u6536\u85CF" : `\u4FDD\u7559 ${settings.retentionDays} \u5929`}
    onIncrement={() => update({ retentionDays: Math.min(365, settings.retentionDays + 5) })}
    onDecrement={() => update({ retentionDays: Math.max(0, settings.retentionDays - 5) })}
  />
        </Section3>

        <Section3 header={<Text5>数据</Text5>}>
          <Label3 title="本地 SQLite 数据库" systemImage="cylinder.split.1x2" />
          <Label3 title="导入与导出（开发中）" systemImage="arrow.up.arrow.down.square" />
          <Label3 title="iCloud 同步（后续版本）" systemImage="icloud" />
        </Section3>

        <Section3 header={<Text5>词库工作区</Text5>} footer={<Text5>外部目录只在用户授权后访问；任何写入都需要差异预览与确认。</Text5>}>
          <Label3 title="在“词库”中连接目录" systemImage="folder.badge.plus" />
          <Label3 title="不修改 userdb、gram 和官方 dicts" systemImage="lock.shield" />
        </Section3>

        <Section3 header={<Text5>关于</Text5>}>
          <HStack4>
            <Text5>数据结构</Text5>
            <Spacer3 />
            <Text5 foregroundColor="secondary">v1</Text5>
          </HStack4>
          <HStack4>
            <Text5>工程阶段</Text5>
            <Spacer3 />
            <Text5 foregroundColor="secondary">MVP 骨架</Text5>
          </HStack4>
        </Section3>
      </Form>
    </NavigationStack5>;
}

// app/App.tsx
function App() {
  const selection = useObservable("clipboard");
  return <TabView selection={selection}>
      <Tab title="剪贴板" systemImage="clipboard.fill" value="clipboard">
        <ClipboardScreen />
      </Tab>
      <Tab title="常用语" systemImage="text.bubble.fill" value="snippets">
        <SnippetsScreen />
      </Tab>
      <Tab title="文本" systemImage="textformat" value="text">
        <TextLabScreen />
      </Tab>
      <Tab title="词库" systemImage="books.vertical.fill" value="lexicon">
        <LexiconScreen />
      </Tab>
      <Tab title="设置" systemImage="gearshape.fill" value="settings">
        <SettingsScreen />
      </Tab>
    </TabView>;
}

// index.tsx
async function presentFatalError(error) {
  await Navigation.present({
    element: <ContentUnavailableView4
      title="工具箱无法启动"
      systemImage="exclamationmark.triangle.fill"
      description={String(error)}
    />
  });
}
async function run() {
  let removeResumeListener = null;
  try {
    await migrateDatabase();
    await captureIfChanged(loadSettings());
    removeResumeListener = Script.onResume(() => {
      captureIfChanged(loadSettings()).catch((error) => {
        console.error("Resume capture failed", error);
      });
    });
    await Navigation.present({
      element: <App />
    });
  } catch (error) {
    console.error("NativeToolbox startup failed", error);
    await presentFatalError(error);
  } finally {
    removeResumeListener?.();
    Script.exit();
  }
}
run();
