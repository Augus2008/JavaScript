import {
  Button,
  ContentUnavailableView,
  List,
  NavigationStack,
  Text,
} from "scripting"

export function SnippetsScreen() {
  return (
    <NavigationStack>
      <List
        navigationTitle="常用语"
        navigationBarTitleDisplayMode="large"
        listStyle="insetGrouped"
        searchable={{ value: "", onChanged: () => {}, prompt: "搜索常用语" }}
        overlay={
          <ContentUnavailableView
            label={<Text>还没有常用语</Text>}
            description={<Text>下一开发切片将启用分类、模板变量和从剪贴板创建。</Text>}
            actions={[<Button title="新建常用语" systemImage="plus" disabled action={() => {}} />]}
          />
        }
      />
    </NavigationStack>
  )
}
