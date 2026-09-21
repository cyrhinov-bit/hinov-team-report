import { app, BrowserWindow, ipcMain, dialog, shell, Notification, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 680,
    title: 'Hinov Team Report (HTR)',
    backgroundColor: '#0B2240',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Custom application menu
  setupApplicationMenu();

  // Load URL or static production build
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    const candidates = [
      path.join(__dirname, '../../dist/index.html'),
      path.join(__dirname, '../dist/index.html'),
      path.join(app.getAppPath(), 'dist/index.html'),
      path.join(process.cwd(), 'dist/index.html'),
    ];
    const foundPath = candidates.find((p) => fs.existsSync(p));
    if (foundPath) {
      mainWindow.loadFile(foundPath);
    } else {
      mainWindow.loadURL('http://localhost:8081');
    }
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // External link security
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupApplicationMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Nouvelle Activité',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-navigate', '/(collaborator)/activities/new');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Fermer la fenêtre' } : { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'forceReload', label: 'Forcer le rechargement' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Documentation Hinov Group',
          click: () => {
            shell.openExternal('https://hinovgroup.com');
          },
        },
        {
          label: 'À propos de HTR Desktop',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Hinov Team Report (HTR)',
              message: 'Hinov Team Report Desktop v1.0.0',
              detail: 'Application d’entreprise pour la gestion et le reporting d’activités hebdomadaires avec assistance IA.\n\n© HINOV GROUP',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('save-pdf-dialog', async (_event, { defaultFileName, base64Data }: { defaultFileName: string; base64Data: string }) => {
  if (!mainWindow) return { success: false, error: 'Fenêtre principale introuvable' };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Enregistrer le Rapport PDF',
    defaultPath: defaultFileName || 'Rapport_Hebdomadaire_HTR.pdf',
    filters: [{ name: 'Documents PDF', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('show-notification', (_event, { title, body }: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Hinov Team Report',
      body: body || '',
      icon: path.join(__dirname, '../assets/images/icon.png'),
    }).show();
  }
});

ipcMain.on('open-external', (_event, url: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

