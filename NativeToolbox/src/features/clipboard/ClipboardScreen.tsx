import {
  Button,
  ContentUnavailableView,
  HStack,
  Image,
  Label,
  List,
  NavigationStack,
  Picker,
  Section,
  Spacer,
  Text,
  VStack,
  useEffect,
  useState,
} from "scripting"
import type { ClipboardItem } from "../../models/types"
import {
  deleteClipboardItem,
  listClipboardItems,
  markClipboardCopied,
  toggleClipboardFavorite,
} from "../../services/database"
import {
  captureCurrentPasteboard,
  installPasteboardListener,
  loadSettings,
} from "../../services/pasteboard"

type Filter = "all" | "text" | "url" | "favorite"

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

function ClipboardRow({ item, reload }: { item: ClipboardItem; reload: () => void }) {
  const icon = item.kind === "url" ? "link" : "doc.text"
  const copy = async () => {
    if (item.content != null) {
      await Pasteboard.setString(item.content)
      await markClipboardCopied(item.id)
      reload()
    }
  }

  return (
    <HStack spacing={12}
      leadingSwipeActions={{
        allowsFullSwipe: false,
        actions: [
          <Button
            title={item.is_favorite ? "取消收藏" : "收藏"}
            systemImage={item.is_favorite ? "star.slash" : "star"}
            tint="systemOrange"
            action={async () => {
              await toggleClipboardFavorite(item.id)
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
              await deleteClipboardItem(item.id)
              reload()
            }}
          />,
        ],
      }}
    >
      <Image systemName={icon} foregroundColor="systemBlue" />
      <VStack alignment="leading" spacing={5}>
        <Text font="body" lineLimit={4}>{item.content ?? ""}</Text>
        <HStack>
          <Text font="caption" foregroundColor="secondary">
            {item.kind === "url" ? "链接" : "文本"} · {relativeTime(item.updated_at)}
          </Text>
          <Spacer />
          {item.is_favorite === 1 && <Image systemName="star.fill" foregroundColor="systemOrange" />}
        </HStack>
      </VStack>
      <Button title="复制" systemImage="doc.on.doc" buttonStyle="borderless" action={copy} />
    </HStack>
  )
}

export function ClipboardScreen() {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = () => {
    listClipboardItems(query, filter)
      .then(setItems)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [query, filter])

  useEffect(() => {
    const remove = installPasteboardListener(reload)
    return remove
  }, [])

  const capture = async () => {
    setLoading(true)
    setError(null)
    try {
      await captureCurrentPasteboard(loadSettings())
      reload()
    } catch (e) {
      setError(String(e))
      setLoading(false)
    }
  }

  const overlay = error != null
    ? <ContentUnavailableView title="无法读取剪贴板" systemImage="exclamationmark.triangle" description={error} />
    : (!loading && items.length === 0
      ? <ContentUnavailableView
          label={<Text>暂无剪贴板内容</Text>}
          description={<Text>复制一段文字，或点击“立即采集”。</Text>}
          actions={[<Button title="立即采集" systemImage="arrow.clockwise" action={capture} />]}
        />
      : undefined)

  return (
    <NavigationStack>
      <List
        navigationTitle="剪贴板"
        navigationBarTitleDisplayMode="large"
        listStyle="insetGrouped"
        searchable={{ value: query, onChanged: setQuery, prompt: "搜索剪贴板" }}
        overlay={overlay}
      >
        <Section>
          <Button
            title={loading ? "正在采集…" : "立即采集"}
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
            onChanged={value => setFilter(value as Filter)}
          >
            <Text tag="all">全部</Text>
            <Text tag="text">文本</Text>
            <Text tag="url">链接</Text>
            <Text tag="favorite">收藏</Text>
          </Picker>
        </Section>
        {items.length > 0 && <Section>
          {items.map(item => <ClipboardRow key={item.id} item={item} reload={reload} />)}
        </Section>}
      </List>
    </NavigationStack>
  )
}
