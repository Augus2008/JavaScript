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
      onTapGesture={copy}
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
      <Image systemName={icon} foregroundColor="secondary" />
      <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="body" lineLimit={3}>{item.content ?? ""}</Text>
        <Text font="caption" foregroundColor="secondary">
          {item.kind === "url" ? "链接" : "文本"} · {relativeTime(item.updated_at)}
          {item.is_favorite === 1 ? " · 已收藏" : ""}
        </Text>
      </VStack>
    </HStack>
  )
}

export function ClipboardScreen() {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
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
    if (capturing) return
    setCapturing(true)
    setError(null)
    try {
      const changed = await captureCurrentPasteboard(loadSettings())
      reload()
      if (!changed) {
        await Dialog.alert({
          title: "没有新内容",
          message: "系统剪贴板是空的，或这条已经在列表里。先复制一段文字再点采集。",
        })
      }
    } catch (e) {
      await Dialog.alert({ title: "采集失败", message: String(e) })
      setError(String(e))
    } finally {
      setCapturing(false)
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
        searchable={{ value: query, onChanged: setQuery, prompt: "搜索" }}
        overlay={overlay}
        toolbar={{
          primaryAction: (
            <Button
              title={capturing ? "采集中" : "采集"}
              systemImage="arrow.clockwise"
              disabled={capturing}
              action={capture}
            />
          ),
        }}
      >
        <Section
          header={<Text>筛选</Text>}
          footer={items.length > 0 ? <Text>点按复制，左滑收藏，右滑删除。</Text> : undefined}
        >
          <Picker
            title="类型"
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
