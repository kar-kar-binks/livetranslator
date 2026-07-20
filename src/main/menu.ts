import { app, Menu, shell, BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import type { AppSettings } from '@shared/types';

export function buildMenu(win: BrowserWindow, settings: AppSettings): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Preferences…',
                accelerator: 'Cmd+,',
                click: () => win.webContents.send('menu:open-settings'),
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Transcript…',
          accelerator: 'CmdOrCtrl+E',
          click: () => win.webContents.send('menu:export-transcript'),
        },
        { type: 'separator' },
        {
          label: 'Clear Conversation',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => win.webContents.send('menu:clear-transcript'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Floating Subtitles',
          accelerator: settings.hotkeys.floatingSubtitles,
          click: () => win.webContents.send('menu:toggle-floating-subtitles'),
        },
        {
          label: 'Always on Top',
          type: 'checkbox',
          checked: settings.alwaysOnTop,
          click: () => win.webContents.send('menu:toggle-always-on-top'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Conversation',
      submenu: [
        {
          label: 'Start / Stop Listening',
          accelerator: settings.hotkeys.toggleListening,
          click: () => win.webContents.send('menu:toggle-listening'),
        },
        {
          label: 'Speak Translation',
          accelerator: settings.hotkeys.speakTranslation,
          click: () => win.webContents.send('menu:speak-translation'),
        },
        {
          label: 'Swap Languages',
          accelerator: settings.hotkeys.swapLanguages,
          click: () => win.webContents.send('menu:swap-languages'),
        },
        {
          label: 'Mute Microphone',
          accelerator: settings.hotkeys.mute,
          click: () => win.webContents.send('menu:toggle-mute'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'LiveTranslate on GitHub',
          click: () => shell.openExternal('https://github.com/livetranslate/livetranslate'),
        },
        {
          label: 'Report an Issue',
          click: () =>
            shell.openExternal('https://github.com/livetranslate/livetranslate/issues/new/choose'),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
