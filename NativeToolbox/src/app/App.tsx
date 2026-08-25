import { Tab, TabView, useObservable } from "scripting"
import { ClipboardScreen } from "../features/clipboard/ClipboardScreen"
import { SnippetsScreen } from "../features/snippets/SnippetsScreen"
import { TextLabScreen } from "../features/textlab/TextLabScreen"
import { LexiconScreen } from "../features/lexicon/LexiconScreen"
import { SettingsScreen } from "../features/settings/SettingsScreen"

type TabID = "clipboard" | "snippets" | "text" | "lexicon" | "settings"

export function App() {
  const selection = useObservable<TabID>("clipboard")

  return (
    <TabView selection={selection}>
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
    </TabView>
  )
}
