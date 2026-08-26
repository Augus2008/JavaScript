import {
  Button,
  HStack,
  List,
  NavigationStack,
  Picker,
  Section,
  Text,
  TextField,
  useState,
} from "scripting"
import { applyTextOperation, type TextOperation } from "./processors"

const TOOL_ROWS: Array<[TextOperation, string, TextOperation, string]> = [
  ["trim", "清理空白", "blankLines", "合并空行"],
  ["removeEmpty", "删除空行", "dedupe", "行去重"],
  ["sort", "按行排序", "json", "格式化 JSON"],
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
        <Section header={<Text>工具</Text>} footer={<Text>处理完会自动切到结果，可继续复制或贴回原文。</Text>}>
          {TOOL_ROWS.map((row, index) => (
            <HStack key={`tool-row-${index}`} spacing={12}>
              <Button
                title={row[1]}
                buttonStyle="borderedProminent"
                buttonBorderShape={{ roundedRectangleRadius: 22 }}
                frame={{ maxWidth: "infinity", minHeight: 46 }}
                action={() => run(row[0])}
              />
              <Button
                title={row[3]}
                buttonStyle="bordered"
                buttonBorderShape={{ roundedRectangleRadius: 22 }}
                frame={{ maxWidth: "infinity", minHeight: 46 }}
                action={() => run(row[2])}
              />
            </HStack>
          ))}
        </Section>
      </List>
    </NavigationStack>
  )
}
