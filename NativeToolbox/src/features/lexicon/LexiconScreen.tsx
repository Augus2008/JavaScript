import {
  Button,
  ContentUnavailableView,
  HStack,
  Image,
  List,
  NavigationStack,
  Section,
  Spacer,
  Stepper,
  Text,
  TextField,
  VStack,
  useEffect,
  useState,
} from "scripting"
import type { LexiconEntry, Workspace } from "../../models/types"
import {
  countLexiconEntries,
  deleteLexiconEntry,
  listLexiconEntries,
  listWorkspaces,
  removeWorkspace,
  upsertLexiconEntry,
  upsertWorkspace,
} from "../../services/database"
import { chooseAndConnectWorkspace, refreshWorkspace } from "../../services/workspace-bookmarks"

function emptyEntry(): LexiconEntry {
  const now = Date.now()
  return {
    id: UUID.string(),
    text: "",
    code: "",
    weight: 10,
    category: "",
    note: "",
    source: "manual",
    workspace_id: null,
    external_key: null,
    created_at: now,
    updated_at: now,
  }
}

function preview(value: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function WorkspaceRow({ workspace, reload }: { workspace: Workspace; reload: () => void }) {
  const connected = workspace.status === "connected"
  return (
    <HStack spacing={12}
      trailingSwipeActions={{
        actions: [
          <Button
            title="断开"
            systemImage="link.badge.minus"
            role="destructive"
            action={async () => {
              await removeWorkspace(workspace.id)
              reload()
            }}
          />,
        ],
      }}
    >
      <Image systemName="square.stack.3d.up.fill" foregroundColor="systemIndigo" />
      <VStack alignment="leading" spacing={4}>
        <Text font="headline">{workspace.name}</Text>
        <Text font="caption" foregroundColor="secondary">
          {workspace.type === "wanxiang" ? `Base · v${workspace.version ?? "未知"}` : "通用目录"}
        </Text>
        <Text font="caption2" foregroundColor="secondary" lineLimit={1}>{workspace.display_path}</Text>
      </VStack>
      <Spacer />
      <VStack alignment="trailing">
        <Image systemName={connected ? "checkmark.circle.fill" : "exclamationmark.circle.fill"} foregroundColor={connected ? "systemGreen" : "systemOrange"} />
        <Text font="caption2" foregroundColor="secondary">{connected ? "已连接" : "需重新授权"}</Text>
      </VStack>
    </HStack>
  )
}

function LexiconEditor({
  entry,
  onClose,
}: {
  entry: LexiconEntry
  onClose: (saved: boolean) => void
}) {
  const [text, setText] = useState(entry.text)
  const [code, setCode] = useState(entry.code ?? "")
  const [weight, setWeight] = useState(entry.weight)
  const [category, setCategory] = useState(entry.category ?? "")
  const [note, setNote] = useState(entry.note ?? "")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const nextText = text.trim()
    if (!nextText) {
      await Dialog.alert({ title: "请填写词语", message: "内部词条至少需要词语本身。" })
      return
    }
    setSaving(true)
    try {
      await upsertLexiconEntry({
        ...entry,
        text: nextText,
        code: code.trim() || null,
        weight,
        category: category.trim() || null,
        note: note.trim() || null,
        source: "manual",
        updated_at: Date.now(),
      })
      onClose(true)
    } catch (error) {
      await Dialog.alert({ title: "保存失败", message: String(error) })
      setSaving(false)
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle={entry.text ? "编辑词条" : "新建词条"}
        navigationBarTitleDisplayMode="inline"
        listStyle="insetGrouped"
        toolbar={{
          cancellationAction: <Button title="取消" action={() => onClose(false)} />,
          confirmationAction: <Button title={saving ? "保存中…" : "保存"} disabled={saving} action={save} />,
        }}
      >
        <Section footer={<Text>这些词条先存在工具箱自己的数据库里，不会写入万象目录。</Text>}>
          <TextField title="词语" value={text} onChanged={setText} prompt="例如：毛豆" />
          <TextField title="编码" value={code} onChanged={setCode} prompt="可选，例如 maodou" />
          <Stepper
            title={`权重 ${weight}`}
            onIncrement={() => setWeight(Math.min(100, weight + 1))}
            onDecrement={() => setWeight(Math.max(1, weight - 1))}
          />
          <TextField title="分类" value={category} onChanged={setCategory} prompt="可选" />
        </Section>
        <Section header={<Text>备注</Text>}>
          <TextField
            title="备注"
            value={note}
            onChanged={setNote}
            axis="vertical"
            lineLimit={{ max: 6 }}
            prompt="可选说明"
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

function LexiconRow({
  entry,
  onEdit,
  reload,
}: {
  entry: LexiconEntry
  onEdit: () => void
  reload: () => void
}) {
  const copy = async () => {
    await Pasteboard.setString(entry.text)
  }

  const subtitle = [entry.code, entry.category, `权重 ${entry.weight}`]
    .filter(value => value != null && String(value).trim() !== "")
    .join(" · ")

  return (
    <HStack spacing={12}
      onTapGesture={onEdit}
      trailingSwipeActions={{
        actions: [
          <Button
            title="删除"
            systemImage="trash"
            role="destructive"
            action={async () => {
              const confirmed = await Dialog.confirm({
                title: "删除词条",
                message: `确定删除「${entry.text}」？`,
                confirmLabel: "删除",
                cancelLabel: "取消",
              })
              if (!confirmed) return
              await deleteLexiconEntry(entry.id)
              reload()
            }}
          />,
        ],
      }}
    >
      <Image systemName="character.book.closed" foregroundColor="systemTeal" />
      <VStack alignment="leading" spacing={4}>
        <Text font="headline" lineLimit={1}>{entry.text}</Text>
        {subtitle !== "" && <Text font="subheadline" foregroundColor="secondary" lineLimit={1}>{subtitle}</Text>}
        {preview(entry.note) !== "" && (
          <Text font="caption" foregroundColor="secondary" lineLimit={2}>{preview(entry.note)}</Text>
        )}
      </VStack>
      <Spacer />
      <Button title="复制" systemImage="doc.on.doc" buttonStyle="borderless" action={copy} />
    </HStack>
  )
}

export function LexiconScreen() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [entries, setEntries] = useState<LexiconEntry[]>([])
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<LexiconEntry | null>(null)

  const reload = () => {
    Promise.all([
      listWorkspaces(),
      listLexiconEntries(query),
      countLexiconEntries(),
    ]).then(async ([rows, nextEntries, nextTotal]) => {
      const refreshed: Workspace[] = []
      for (const row of rows) {
        const value = await refreshWorkspace(row)
        await upsertWorkspace(value)
        refreshed.push(value)
      }
      setWorkspaces(refreshed)
      setEntries(nextEntries)
      setTotal(nextTotal)
      setError(null)
    }).catch(e => setError(String(e))).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [query])

  const connect = async () => {
    setError(null)
    try {
      await chooseAndConnectWorkspace()
      reload()
    } catch (e) {
      setError(String(e))
    }
  }

  const overlay = error != null
    ? <ContentUnavailableView title="无法读取词库" systemImage="exclamationmark.triangle" description={error} />
    : undefined

  return (
    <NavigationStack>
      <List
        navigationTitle="词库中心"
        navigationBarTitleDisplayMode="large"
        listStyle="insetGrouped"
        searchable={{ value: query, onChanged: setQuery, prompt: "搜索词语、编码或备注" }}
        overlay={overlay}
        toolbar={{
          primaryAction: <Button title="新建" systemImage="plus" action={() => setEditor(emptyEntry())} />,
        }}
        sheet={{
          isPresented: editor != null,
          onChanged: presented => { if (!presented) setEditor(null) },
          content: editor == null ? undefined : (
            <LexiconEditor
              key={editor.id}
              entry={editor}
              onClose={saved => {
                setEditor(null)
                if (saved) reload()
              }}
            />
          ),
        }}
      >
        <Section header={<Text>工作区</Text>} footer={<Text>外部目录目前只做连接和识别，不会写入万象词库。</Text>}>
          <Button title="连接外部目录" systemImage="folder.badge.plus" action={connect} />
          {workspaces.map(workspace => (
            <WorkspaceRow key={workspace.id} workspace={workspace} reload={reload} />
          ))}
        </Section>
        <Section
          header={<Text>内部词库</Text>}
          footer={<Text>{loading ? "正在读取…" : `共 ${total} 个词条。这些数据只存在工具箱本地。`}</Text>}
        >
          {entries.length === 0
            ? <ContentUnavailableView
                label={<Text>{query ? "没有匹配的词条" : "还没有内部词条"}</Text>}
                description={<Text>先在工具箱里维护词条。以后提交到万象时会走差异预览和备份。</Text>}
                actions={[<Button title="新建词条" systemImage="plus" action={() => setEditor(emptyEntry())} />]}
              />
            : entries.map(entry => (
              <LexiconRow
                key={entry.id}
                entry={entry}
                onEdit={() => setEditor(entry)}
                reload={reload}
              />
            ))}
        </Section>
      </List>
    </NavigationStack>
  )
}
