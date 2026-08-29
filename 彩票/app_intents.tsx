import { AppIntentManager, AppIntentProtocol, Script, Widget } from "scripting";

export const reloadIntent = AppIntentManager.register({
  name: Script.name,
  protocol: AppIntentProtocol.AppIntent,
  perform: async (params: undefined) => {
    Widget.reloadUserWidgets();
  },
});
