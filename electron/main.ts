import { app, BrowserWindow, ipcMain, dialog, shell, Notification, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let prodServer: http.Server | null = null;

// MIME types for static assets
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
};

function startStaticServer(distDir: string): Promise<number> {
  return new Promise((resolve) => {
    prodServer = http.createServer((req, res) => {
      try {
        const urlPath = decodeURI(req.url?.split('?')[0] || '/');
        let filePath = path.join(distDir, urlPath);

        // If file doesn't exist or is a directory, fallback to index.html for SPA routing
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(distDir, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
          });
          res.end(data);
        });
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(err?.message || 'Server error');
      }
    });

    // Listen on dynamic available port on localhost
    prodServer.listen(0, '127.0.0.1', () => {
      const addr = prodServer?.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
      resolve(port);
    });
  });
}

async function createWindow(): Promise<void> {
  const iconCandidates = [
    path.join(__dirname, '../../assets/images/icon.png'),
    path.join(__dirname, '../assets/images/icon.png'),
    path.join(process.cwd(), 'assets/images/icon.png'),
  ];
  const appIconPath = iconCandidates.find((p) => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 680,
    title: 'Hinov Team Report (HTR)',
    icon: appIconPath,
    backgroundColor: '#0B2240',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  setupApplicationMenu();

  mainWindow.show();
  mainWindow.focus();

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:8081';
    await loadWithRetry(mainWindow, devUrl, 10);
  } else {
    // Find dist directory
    const candidates = [
      path.join(__dirname, '../../dist'),
      path.join(__dirname, '../dist'),
      path.join(app.getAppPath(), 'dist'),
      path.join(process.cwd(), 'dist'),
    ];
    const foundDist = candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

    if (foundDist) {
      const port = await startStaticServer(foundDist);
      mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } else {
      mainWindow.loadURL('http://localhost:8081');
    }
  }

  // Ensure window is shown after content loads
  mainWindow.show();
  mainWindow.focus();

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

function loadWithRetry(win: BrowserWindow, url: string, retries = 5): Promise<void> {
  return new Promise((resolve) => {
    let attempts = 0;

    const tryLoad = () => {
      attempts++;
      win.loadURL(url).then(resolve).catch((err) => {
        if (attempts < retries) {
          setTimeout(tryLoad, 1000);
        } else {
          console.error(`Failed to connect to dev server ${url} after ${retries} attempts:`, err);
          resolve();
        }
      });
    };

    tryLoad();
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
app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (prodServer) {
    prodServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
