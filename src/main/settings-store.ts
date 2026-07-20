import Store from 'electron-store';
import { AppSettings, DEFAULT_SETTINGS } from '@shared/types';

export class SettingsStore {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'livetranslate-settings',
      defaults: DEFAULT_SETTINGS,
    });
  }

  get(): AppSettings {
    return { ...DEFAULT_SETTINGS, ...(this.store.store as Partial<AppSettings>) };
  }

  set(patch: Partial<AppSettings>): AppSettings {
    for (const [key, value] of Object.entries(patch)) {
      this.store.set(key as keyof AppSettings, value as never);
    }
    return this.get();
  }

  reset(): AppSettings {
    this.store.clear();
    return this.get();
  }
}
