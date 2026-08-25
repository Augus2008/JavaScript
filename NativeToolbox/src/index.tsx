import {
  Button,
  ContentUnavailableView,
  Navigation,
  Script,
} from "scripting"
import { App } from "./app/App"
import { migrateDatabase } from "./services/database"
import { captureIfChanged, loadSettings } from "./services/pasteboard"

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
  let removeResumeListener: (() => void) | null = null
  try {
    await migrateDatabase()
    await captureIfChanged(loadSettings())

    removeResumeListener = Script.onResume(() => {
      captureIfChanged(loadSettings()).catch((error: unknown) => {
        console.error("Resume capture failed", error)
      })
    })

    await Navigation.present({
      element: <App />,
    })
  } catch (error) {
    console.error("NativeToolbox startup failed", error)
    await presentFatalError(error)
  } finally {
    removeResumeListener?.()
    Script.exit()
  }
}

run()
