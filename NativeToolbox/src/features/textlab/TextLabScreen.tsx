import {
  Button,
  HStack,
  Image,
  List,
  NavigationStack,
  Picker,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
  useState,
} from "scripting"
import { applyTextOperation, type TextOperation } from "./processors"

const TOOLS: Array<{
  id: TextOperation
  title: string
  detail: string
  icon: string
}> = [
  { id: "trim", title: "清理首尾空白", detail: "去掉全文开头和结尾的空格、空行", icon: "text.trim" },
  { id: "blankLines", title: "合并多余空行", detail: "连续多个空行压成一个", icon: "line.3.horizontal.decrease" },
  { id: "removeEmpty", title: "删除空行", detail: "去掉所有空白行", icon: "minus.rectangle" },
  { id: "dedupe", title: "行去重", detail: "重复行只留第一次出现的", icon: "square.on.square" },
  { id: "sort", title: "按行排序", detail: "按中文顺序排列每一行", icon: "arrow.up.arrow.down" },
  { id: "json", title: "格式化 JSON", detail: "把 JSON 整理成缩进文本", icon: "curlybraces" },
]

export function TextLabScreen() {
  const [mode, setMode] = useState<"input" | "result">("input")
  const [source, setSource] = useState("")
  const [result, setResult] = useState("")
  const [error, setError] = useState<string | null>(null)

  const run = async (operation: TextOperation) => {
    try {
      const output = applyTextOperation(source, operation)
      setResult(output)
      setMode("result")
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const paste = async () => {
    const values = await Pasteboard.getStrings()
    const text = (values ?? []).find(value => value.trim().length > 0) ?? ""
    if (!text) {
      await Dialog.alert({ title: "剪贴板是空的", message: "先复制一段文字，再点粘贴。" })
      return
    }
    setSource(text)
    setMode("input")
    setError(null)
  }

  const copyResult = async () => {
    if (!result) {
      await Dialog.alert({ title: "还没有结果", message: "先处理一段文字。" })
      return
    }
    await Pasteboard.setString(result)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="文本"
        navigationBarTitleDisplayMode="large"
        listStyle="insetGrouped"
        toolbar={{
          primaryAction: <Button title="粘贴" systemImage="doc.on.clipboard" action={paste} />,
          topBarTrailing: <Button title="复制结果" systemImage="doc.on.doc" action={copyResult} />,
        }}
      >
        <Section>
          <Picker
            title="显示"
            pickerStyle="segmented"
            value={mode}
            onChanged={value => setMode(value as "input" | "result")}
          >
            <Text tag="input">输入</Text>
            <Text tag="result">结果</Text>
          </Picker>
        </Section>
        <Section
          header={<Text>{mode === "input" ? "原文" : "结果"}</Text>}
          footer={<Text>先放入原文，再点下面的工具。处理完会自动切到「结果」。</Text>}
        >
          {mode === "input" ? (
            <TextField
              title="原文"
              value={source}
              onChanged={setSource}
              axis="vertical"
              lineLimit={{ min: 8, max: 16 }}
              prompt="在这里输入或粘贴文字"
            />
          ) : (
            <TextField
              title="结果"
              value={result}
              onChanged={() => {}}
              axis="vertical"
              lineLimit={{ min: 8, max: 16 }}
              prompt="处理结果会显示在这里"
            />
          )}
        </Section>
        {error != null && (
          <Section>
            <Text foregroundColor="systemRed">{error}</Text>
          </Section>
        )}
        <Section header={<Text>工具</Text>} footer={<Text>点按一项处理当前原文。</Text>}>
          {TOOLS.map(tool => (
            <HStack
              key={tool.id}
              spacing={12}
              onTapGesture={() => run(tool.id)}
            >
              <Image systemName={tool.icon} foregroundColor="secondary" frame={{ width: 24 }} />
              <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="body">{tool.title}</Text>
                <Text font="caption" foregroundColor="secondary">{tool.detail}</Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" foregroundColor="tertiaryLabel" />
            </HStack>
          ))}
        </Section>
      </List>
    </NavigationStack>
  )
}
