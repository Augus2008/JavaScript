import {
  ContentUnavailableView,
  Navigation,
  Script,
} from "scripting"
import { App } from "./app/App"
import { migrateDatabase } from "./services/database"

async function presentFatalError(error: unknown) {
  await Navigation.present({
    element: (
      <ContentUnavailableView
        title="工具箱无法启动"
        systemImage="exclamationmark.triangle.fill"
        description={String(error)}
      />
    ),
  })
}

async function run() {
  try {
    await migrateDatabase()
    await Navigation.present({
      element: <App />,
    })
  } catch (error) {
    console.error("NativeToolbox startup failed", error)
    await presentFatalError(error)
  } finally {
    Script.exit()
  }
}

run()
