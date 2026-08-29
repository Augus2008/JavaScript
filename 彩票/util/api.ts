import { fetch } from "scripting";

class API {
  private KEY = "setting";
  setting: string[] = Storage.get(this.KEY) || [];

  save() {
    Storage.set(this.KEY, this.setting);
  }

  async fetchData() {
    return await fetch("https://m.zhuying.com/api/lotapi/indexV2/1").then((r) =>
      r.json()
    );
  }
}

export const api = new API();
