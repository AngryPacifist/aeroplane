import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";

export interface SystemSettings {
  rootDomain: string;
}

const settingsPath = resolve(config.dataDir, "system-settings.json");

export function getSystemSettings(): SystemSettings {
  try {
    if (existsSync(settingsPath)) {
      const data = readFileSync(settingsPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to read system settings:", error);
  }
  return {
    rootDomain: ""
  };
}

export function saveSystemSettings(settings: SystemSettings): void {
  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save system settings:", error);
  }
}
