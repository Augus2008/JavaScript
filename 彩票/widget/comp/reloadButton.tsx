import { Button, Image } from "scripting";
import { reloadIntent } from "../../app_intents";

export function ReloadButton() {
  return (
    <Button intent={reloadIntent(undefined)} buttonStyle={"plain"}>
      <Image foregroundStyle={"accentColor"} systemName={"arrow.clockwise"} />
    </Button>
  );
}
