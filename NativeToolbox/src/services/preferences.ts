export type StartupTab = "snippets" | "lexicon"

export type AppPreferences = {
  startupTab: StartupTab
  copyFeedback: boolean
}

const SETTINGS_KEY = "native-toolbox.preferences.v1"

export const DEFAULT_PREFERENCES: AppPreferences = {
  startupTab: "lexicon",
  copyFeedback: true,
}

export function loadPreferences(): AppPreferences {
  const stored = Storage.get<Partial<AppPreferences>>(SETTINGS_KEY) ?? {}
  const startupTab = stored.startupTab === "snippets" ? "snippets" : "lexicon"
  return {
    startupTab,
    copyFeedback: stored.copyFeedback !== false,
  }
}

export function savePreferences(preferences: AppPreferences) {
  Storage.set(SETTINGS_KEY, preferences)
}

export function updatePreferences(patch: Partial<AppPreferences>): AppPreferences {
  const next = {
    ...loadPreferences(),
    ...patch,
  }
  const normalized: AppPreferences = {
    startupTab: next.startupTab === "snippets" ? "snippets" : "lexicon",
    copyFeedback: next.copyFeedback !== false,
  }
  savePreferences(normalized)
  return normalized
}
