import {
  Button,
  HStack,
  List,
  NavigationStack,
  Section,
  Spacer,
  Text,
  VStack,
  useState,
} from "scripting"
import type { PhraseDiff, PhraseDiffItem } from "../../adapters/wanxiang/custom-phrase"

function DiffRow({ item, detail }: { item: PhraseDiffItem; detail: string }) {
  return (
    <VStack alignment="leading" spacing={4}>
      <Text font="headline">{item.text}</Text>
      <Text font="subheadline" foregroundColor="secondary">{item.code} · {detail}</Text>
    </VStack>
  )
}

export function PhraseDiffSheet({
  diff,
  onClose,
  onCommit,
}: {
  diff: PhraseDiff
  onClose: () => void
  onCommit?: () => Promise<void>
}) {
  const pending = diff.inserts.length + diff.updates.length
  const [committing, setCommitting] = useState(false)
  const canCommit = pending > 0 && diff.invalid.length === 0 && onCommit != null

  const commit = async () => {
    if (!canCommit || committing) return
    const confirmed = await Dialog.confirm({
      title: "提交到万象？",
      message: `将新增 ${diff.inserts.length} 条、更新 ${diff.updates.length} 条权重。提交前会备份原文件；不会删除仅外部存在的词条，也不会改 userdb / gram / 官方 dicts。`,
      confirmLabel: "提交",
      cancelLabel: "取消",
    })
    if (!confirmed) return
    setCommitting(true)
    try {
      await onCommit()
    } catch (error) {
      await Dialog.alert({ title: "提交失败", message: String(error) })
    } finally {
      setCommitting(false)
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="差异预览"
        navigationBarTitleDisplayMode="inline"
        listStyle="insetGrouped"
        toolbar={{
          cancellationAction: <Button title="关闭" action={onClose} />,
          confirmationAction: canCommit
            ? <Button title={committing ? "提交中…" : "提交"} disabled={committing} action={commit} />
            : undefined,
        }}
      >
        <Section footer={<Text>
          {canCommit
            ? "确认后才会写入 custom_phrase.txt。提交前会备份，并再次核对文件哈希。"
            : "当前没有可提交差异，或外部文件有异常行。"}
        </Text>}>
          <HStack>
            <Text>待新增</Text>
            <Spacer />
            <Text foregroundColor="secondary">{diff.inserts.length}</Text>
          </HStack>
          <HStack>
            <Text>待更新权重</Text>
            <Spacer />
            <Text foregroundColor="secondary">{diff.updates.length}</Text>
          </HStack>
          <HStack>
            <Text>已一致</Text>
            <Spacer />
            <Text foregroundColor="secondary">{diff.same.length}</Text>
          </HStack>
          <HStack>
            <Text>仅外部存在</Text>
            <Spacer />
            <Text foregroundColor="secondary">{diff.externalOnly.length}</Text>
          </HStack>
          <HStack>
            <Text>格式异常</Text>
            <Spacer />
            <Text foregroundColor="secondary">{diff.invalid.length}</Text>
          </HStack>
        </Section>
        {diff.inserts.length > 0 && (
          <Section header={<Text>将新增到万象</Text>}>
            {diff.inserts.map(item => (
              <DiffRow
                key={`insert-${item.key}`}
                item={item}
                detail={`内部权重 ${item.internalWeight ?? "-"}`}
              />
            ))}
          </Section>
        )}
        {diff.updates.length > 0 && (
          <Section header={<Text>权重不同</Text>}>
            {diff.updates.map(item => (
              <DiffRow
                key={`update-${item.key}`}
                item={item}
                detail={`内部 ${item.internalWeight ?? "-"} → 外部 ${item.externalWeight ?? "-"}`}
              />
            ))}
          </Section>
        )}
        {diff.invalid.length > 0 && (
          <Section header={<Text>外部文件异常行</Text>} footer={<Text>这些行不会被提交覆盖；请先在万象文件里修好。</Text>}>
            {diff.invalid.map(line => (
              <VStack key={`invalid-${line.lineNumber}`} alignment="leading" spacing={4}>
                <Text font="headline">第 {line.lineNumber} 行</Text>
                <Text font="caption" foregroundColor="secondary">{line.error ?? "无法解析"}</Text>
                <Text font="caption2" foregroundColor="secondary" lineLimit={3}>{line.raw}</Text>
              </VStack>
            ))}
          </Section>
        )}
        {diff.externalOnly.length > 0 && (
          <Section header={<Text>仅外部存在</Text>} footer={<Text>工具箱不会删除这些现有词条。</Text>}>
            {diff.externalOnly.slice(0, 30).map(item => (
              <DiffRow
                key={`external-${item.key}`}
                item={item}
                detail={`外部权重 ${item.externalWeight ?? "默认"}`}
              />
            ))}
            {diff.externalOnly.length > 30 && (
              <Text foregroundColor="secondary">还有 {diff.externalOnly.length - 30} 条未展开</Text>
            )}
          </Section>
        )}
        {pending === 0 && diff.invalid.length === 0 && (
          <Section>
            <Text>内部有编码的词条已经和 custom_phrase.txt 一致，没有可提交差异。</Text>
          </Section>
        )}
      </List>
    </NavigationStack>
  )
}
