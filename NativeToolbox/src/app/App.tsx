import { Tab, TabView, useObservable } from "scripting"
import { SnippetsScreen } from "../features/snippets/SnippetsScreen"
import { LexiconScreen } from "../features/lexicon/LexiconScreen"
import { SettingsScreen } from "../features/settings/SettingsScreen"
import { loadPreferences } from "../services/preferences"

type TabID = "snippets" | "lexicon" | "settings"

export function App() {
  const selection = useObservable<TabID>(loadPreferences().startupTab)

  return (
    <TabView selection={selection}>
      <Tab title="常用语" systemImage="text.bubble.fill" value="snippets">
        <SnippetsScreen />
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
