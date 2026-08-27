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
  TextField,
  Toggle,
  VStack,
  useEffect,
  useState,
} from "scripting"
import type { Snippet, SnippetCategory } from "../../models/types"
import {
  deleteSnippet,
  listSnippetCategories,
  listSnippets,
  toggleSnippetFavorite,
  upsertSnippet,
} from "../../services/database"
import {
  currentClipboardText,
  extractTemplateKeys,
  looksLikeTemplate,
  renderSnippetTemplate,
} from "./templates"
import { loadPreferences } from "../../services/preferences"

type Scope = "all" | "favorite"

function relativeTime(timestamp: number) {
  const delta = Math.max(0, Date.now() - timestamp)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (delta < minute) return "刚刚"
  if (delta < hour) return `${Math.floor(delta / minute)} 分钟前`
  if (delta < day) return `${Math.floor(delta / hour)} 小时前`
  return `${Math.floor(delta / day)} 天前`
}

function previewBody(body: string) {
  return body.replace(/\s+/g, " ").trim()
}

function emptySnippet(categoryId: string | null): Snippet {
  const now = Date.now()
  return {
    id: UUID.string(),
    category_id: categoryId,
    title: "",
    body: "",
    is_template: 0,
    is_favorite: 0,
    is_pinned: 0,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  }
}

function SnippetEditor({
  snippet,
  categories,
  onClose,
}: {
  snippet: Snippet
  categories: SnippetCategory[]
  onClose: (saved: boolean) => void
}) {
  const [title, setTitle] = useState(snippet.title)
  const [body, setBody] = useState(snippet.body)
  const [categoryId, setCategoryId] = useState(snippet.category_id ?? "none")
  const [favorite, setFavorite] = useState(snippet.is_favorite === 1)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const nextTitle = title.trim()
    const nextBody = body.replace(/\s+$/g, "")
    if (!nextTitle) {
      await Dialog.alert({ title: "请填写标题", message: "常用语需要一个简短标题，方便搜索和复制。" })
      return
    }
    if (!nextBody.trim()) {
      await Dialog.alert({ title: "请填写内容", message: "正文不能为空。" })
      return
    }
    setSaving(true)
    try {
      await upsertSnippet({
        ...snippet,
        title: nextTitle,
        body: nextBody,
        category_id: categoryId === "none" ? null : categoryId,
        is_favorite: favorite ? 1 : 0,
        is_template: looksLikeTemplate(nextBody) ? 1 : 0,
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
        navigationTitle={snippet.title ? "编辑常用语" : "新建常用语"}
        navigationBarTitleDisplayMode="inline"
        listStyle="insetGrouped"
        toolbar={{
          cancellationAction: <Button title="取消" action={() => onClose(false)} />,
          confirmationAction: <Button title={saving ? "保存中…" : "保存"} disabled={saving} action={save} />,
        }}
      >
        <Section>
          <TextField title="标题" value={title} onChanged={setTitle} prompt="例如：公司地址" />
          <Picker
            title="分类"
            value={categoryId}
            onChanged={setCategoryId}
          >
            <Text tag="none">未分类</Text>
            {categories.map(category => (
              <Text key={category.id} tag={category.id}>{category.name}</Text>
            ))}
          </Picker>
          <Toggle title="收藏" value={favorite} onChanged={setFavorite} />
        </Section>
        <Section
          header={<Text>内容</Text>}
          footer={<Text>可用变量：{"{{date}}"}、{"{{time}}"}、{"{{datetime}}"}、{"{{clipboard}}"}。未填写的变量会提示，不会被偷偷删掉。</Text>}
        >
          <TextField
            title="正文"
            value={body}
            onChanged={setBody}
            axis="vertical"
            lineLimit={{ max: 10 }}
            prompt="输入常用语正文"
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

function SnippetRow({
  snippet,
  categoryName,
  onEdit,
  reload,
  onCopied,
}: {
  snippet: Snippet
  categoryName: string
  onEdit: () => void
  reload: () => void
  onCopied: () => void
}) {
  const copy = async () => {
    const clipboard = extractTemplateKeys(snippet.body).includes("clipboard")
      ? await currentClipboardText()
      : ""
    const rendered = renderSnippetTemplate(snippet.body, { clipboard })
    if (rendered.missing.length > 0) {
      await Dialog.alert({
        title: "变量未填写",
        message: `还缺少：${rendered.missing.map(key => `{{${key}}}`).join("、")}。请补全后再复制。`,
      })
      return
    }
    await Pasteboard.setString(rendered.text)
    onCopied()
  }

  return (
    <HStack spacing={12}
      onTapGesture={copy}
      leadingSwipeActions={{
        allowsFullSwipe: false,
        actions: [
          <Button
            title="编辑"
            systemImage="pencil"
            tint="systemBlue"
            action={onEdit}
          />,
          <Button
            title={snippet.is_favorite ? "取消收藏" : "收藏"}
            systemImage={snippet.is_favorite ? "star.slash" : "star"}
            tint="systemOrange"
            action={async () => {
              await toggleSnippetFavorite(snippet.id)
              reload()
            }}
          />,
        ],
      }}
      trailingSwipeActions={{
        actions: [
          <Button
            title="删除"
            systemImage="trash"
            role="destructive"
            action={async () => {
              const confirmed = await Dialog.confirm({
                title: "删除常用语",
                message: `确定删除「${snippet.title}」？`,
                confirmLabel: "删除",
                cancelLabel: "取消",
              })
              if (!confirmed) return
              await deleteSnippet(snippet.id)
              reload()
            }}
          />,
        ],
      }}
    >
      <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="body" lineLimit={1}>{snippet.title}</Text>
        <Text font="subheadline" foregroundColor="secondary" lineLimit={2}>{previewBody(snippet.body)}</Text>
        <Text font="caption" foregroundColor="secondary">
          {categoryName}
          {snippet.is_favorite === 1 ? " · 已收藏" : ""}
        </Text>
      </VStack>
    </HStack>
  )
}

export function SnippetsScreen() {
  const [items, setItems] = useState<Snippet[]>([])
  const [categories, setCategories] = useState<SnippetCategory[]>([])
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<Scope>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<Snippet | null>(null)
  const [copiedToast, setCopiedToast] = useState(false)

  const reload = () => {
    Promise.all([
      listSnippets(query, {
        favoriteOnly: scope === "favorite",
        categoryId: categoryFilter === "all" ? null : categoryFilter,
      }),
      listSnippetCategories(),
    ])
      .then(([nextItems, nextCategories]) => {
        setItems(nextItems)
        setCategories(nextCategories)
        setError(null)
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [query, scope, categoryFilter])

  const categoryName = (id: string | null) => {
    if (id == null) return "未分类"
    return categories.find(category => category.id === id)?.name ?? "未分类"
  }

  const createFromClipboard = async () => {
    const text = (await currentClipboardText()).trim()
    if (!text) {
      await Dialog.alert({ title: "剪贴板是空的", message: "先复制一段文字，再从剪贴板创建常用语。" })
      return
    }
    const title = previewBody(text).slice(0, 24) || "未命名常用语"
    setEditor({
      ...emptySnippet(categoryFilter === "all" ? null : categoryFilter),
      title,
      body: text,
      is_template: looksLikeTemplate(text) ? 1 : 0,
    })
  }

  const overlay = error != null
    ? <ContentUnavailableView title="无法读取常用语" systemImage="exclamationmark.triangle" description={error} />
    : (!loading && items.length === 0
      ? <ContentUnavailableView
          label={<Text>{query ? "没有匹配的常用语" : "还没有常用语"}</Text>}
          description={<Text>可手动新建，或把剪贴板里的文字保存成常用语。</Text>}
          actions={[
            <Button title="新建常用语" systemImage="plus" action={() => setEditor(emptySnippet(null))} />,
            <Button title="从剪贴板创建" systemImage="doc.on.clipboard" action={createFromClipboard} />,
          ]}
        />
      : undefined)

  return (
    <NavigationStack>
      <List
        navigationTitle="常用语"
        navigationBarTitleDisplayMode="large"
        listStyle="insetGrouped"
        searchable={{ value: query, onChanged: setQuery, prompt: "搜索" }}
        overlay={overlay}
        toast={{
          isPresented: copiedToast,
          onChanged: setCopiedToast,
          message: "已复制",
          duration: 1.2,
          position: "bottom",
        }}
        toolbar={{
          primaryAction: <Button title="新建" systemImage="plus" action={() => setEditor(emptySnippet(categoryFilter === "all" ? null : categoryFilter))} />,
          topBarTrailing: <Button title="从剪贴板" systemImage="doc.on.clipboard" action={createFromClipboard} />,
        }}
        sheet={{
          isPresented: editor != null,
          onChanged: presented => { if (!presented) setEditor(null) },
          content: editor == null ? undefined : (
            <SnippetEditor
              key={editor.id}
              snippet={editor}
              categories={categories}
              onClose={saved => {
                setEditor(null)
                if (saved) reload()
              }}
            />
          ),
        }}
      >
        <Section footer={items.length > 0 ? <Text>点按复制，左滑编辑或收藏，右滑删除。</Text> : undefined}>
          <Picker
            title="范围"
            pickerStyle="segmented"
            value={scope}
            onChanged={value => setScope(value as Scope)}
          >
            <Text tag="all">全部</Text>
            <Text tag="favorite">收藏</Text>
          </Picker>
          {categories.length > 0 && (
            <Picker
              title="分类"
              value={categoryFilter}
              onChanged={setCategoryFilter}
            >
              <Text tag="all">全部</Text>
              {categories.map(category => (
                <Text key={category.id} tag={category.id}>{category.name}</Text>
              ))}
            </Picker>
          )}
        </Section>
        {items.length > 0 && <Section>
          {items.map(item => (
            <SnippetRow
              key={item.id}
              snippet={item}
              categoryName={categoryName(item.category_id)}
              onEdit={() => setEditor(item)}
              reload={reload}
              onCopied={() => {
                if (loadPreferences().copyFeedback) setCopiedToast(true)
              }}
            />
          ))}
        </Section>}
      </List>
    </NavigationStack>
  )
}
