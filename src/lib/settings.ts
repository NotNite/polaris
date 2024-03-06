import { writable } from "svelte/store";

type VersionedSettings<Version = number> = {
  version: Version;
};

export type SettingsV1 = VersionedSettings<1> & {
  autologin?: string;
};

const defaultSettings: SettingsV1 = {
  version: 1
};

function loadSettings(): SettingsV1 {
  const settingsStr = localStorage.getItem("settings");
  if (settingsStr == null) return defaultSettings;

  try {
    const obj: VersionedSettings = JSON.parse(settingsStr);
    // if (obj.version === 1) obj = migrateV1(obj);
    return obj as SettingsV1;
  } catch (e) {
    console.error("Error loading settings", e);
    return defaultSettings;
  }
}

export const settings = writable<SettingsV1>(loadSettings());
settings.subscribe((value) => {
  localStorage.setItem("settings", JSON.stringify(value));
});
