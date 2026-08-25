import {
  Button,
  Editor,
  EditorController,
  HStack,
  NavigationStack,
  Picker,
  ScrollView,
  Text,
  VStack,
  useEffect,
  useMemo,
  useState,
} from "scripting"
import { applyTextOperation, type TextOperation } from "./processors"

export function TextLabScreen() {
  const [mode, setMode] = useState<"input" | "result">("input")
  const [source, setSource] = useState("")
  const [result, setResult] = useState("")
  const [error, setError] = useState<string | null>(null)

  const inputController = useMemo(() => new EditorController({ content: source, ext: "txt", readOnly: false }), [])
  const resultController = useMemo(() => new EditorController({ content: result, ext: "txt", readOnly: true }), [])

  useEffect(() => () => {
    inputController.dispose()
    resultController.dispose()
  }, [inputController, resultController])

  const run = async (operation: TextOperation) => {
    try {
      const current = inputController.content
      setSource(current)
      const output = applyTextOperation(current, operation)
      resultController.content = output
      setResult(output)
      setMode("result")
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const copyResult = async () => {
    await Pasteboard.setString(resultController.content)
  }

  return (
    <NavigationStack>
      <VStack spacing={12} navigationTitle="文本工作台" navigationBarTitleDisplayMode="large">
        <Picker title="模式" pickerStyle="segmented" value={mode} onChanged={value => setMode(value as "input" | "result")}>
          <Text tag="input">输入</Text>
          <Text tag="result">结果</Text>
        </Picker>
        <VStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
          {mode === "input"
            ? <Editor controller={inputController} scriptName="文本输入" showAccessoryView />
            : <Editor controller={resultController} scriptName="处理结果" showAccessoryView />}
        </VStack>
        {error != null && <Text foregroundColor="systemRed" font="caption">{error}</Text>}
        <ScrollView axis="horizontal" showsIndicators={false}>
          <HStack spacing={8}>
            <Button title="清理空白" systemImage="line.3.horizontal.decrease" buttonStyle="bordered" action={() => run("trim")} />
            <Button title="合并空行" systemImage="line.3.horizontal" buttonStyle="bordered" action={() => run("blankLines")} />
            <Button title="删除空行" systemImage="minus.rectangle" buttonStyle="bordered" action={() => run("removeEmpty")} />
            <Button title="行去重" systemImage="square.on.square" buttonStyle="bordered" action={() => run("dedupe")} />
            <Button title="行排序" systemImage="arrow.up.arrow.down" buttonStyle="bordered" action={() => run("sort")} />
            <Button title="JSON" systemImage="curlybraces" buttonStyle="bordered" action={() => run("json")} />
          </HStack>
        </ScrollView>
        <HStack spacing={12}>
          <Button title="还原" systemImage="arrow.uturn.backward" action={() => setMode("input")} />
          <Button title="复制结果" systemImage="doc.on.doc" buttonStyle="borderedProminent" disabled={!result} action={copyResult} />
        </HStack>
      </VStack>
    </NavigationStack>
  )
}
