const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const isMac = process.platform === 'darwin';

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    title: 'CCR 캘린더',
    backgroundColor: '#f5f7fb',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

const appMenu = [
  ...(isMac
    ? [
        {
          label: 'CCR 캘린더',
          submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
        },
      ]
    : []),
  {
    label: '파일',
    submenu: [
      { role: 'print', label: '인쇄' },
      { type: 'separator' },
      isMac ? { role: 'close', label: '닫기' } : { role: 'quit', label: '종료' },
    ],
  },
  {
    label: '보기',
    submenu: [
      { role: 'reload', label: '새로고침' },
      { role: 'resetZoom', label: '실제 크기' },
      { role: 'zoomIn', label: '확대' },
      { role: 'zoomOut', label: '축소' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '전체 화면' },
    ],
  },
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(appMenu));
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
