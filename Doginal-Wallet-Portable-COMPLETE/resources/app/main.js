const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Production configuration
const PRODUCTION_CONFIG = {
  TAX_WALLET_ADDRESS: 'DSdmMg7Mrmdm2dWL4fwmuPpFf1YVDfLzVv',
  TAX_AMOUNT: 200000000, // 2 DOGE in satoshis
  APP_NAME: 'Doginal Inscription Wallet',
  VERSION: require('../package.json').version,
  WEBSITE: 'https://doginalwallet.com',
  SUPPORT_EMAIL: 'support@doginalwallet.com'
};

// Try to load wallet modules, but don't fail if they're missing
let DogeElectrumWallet, DoginalInscriptions;
let wallet, inscriptionManager;

try {
  const walletModule = require('../dist/electron/src/wallet/dogeElectrum');
  const inscriptionModule = require('../dist/electron/src/inscriptions/doginal');
  
  DogeElectrumWallet = walletModule.DogeElectrumWallet;
  DoginalInscriptions = inscriptionModule.DoginalInscriptions;
  
  wallet = new DogeElectrumWallet();
  inscriptionManager = new DoginalInscriptions(wallet, PRODUCTION_CONFIG.TAX_WALLET_ADDRESS);
  
  log.info('Wallet modules loaded successfully');
} catch (error) {
  log.warn('Wallet modules not available in production build:', error.message);
  // Wallet will be initialized without backend functionality
}

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = isDev ? 'debug' : 'info';
autoUpdater.logger = log;

// Security settings
if (!isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

let mainWindow;

// Auto-updater configuration (disabled for production builds without update server)
if (!isDev && false) {
  autoUpdater.checkForUpdatesAndNotify();
}

function createWindow() {
  // Create the browser window with enhanced security
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, './preload.js'),
      sandbox: false, // Required for crypto operations
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    icon: path.join(__dirname, '../build-resources/icon.png'),
    title: PRODUCTION_CONFIG.APP_NAME,
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#667eea', // Match app theme
    vibrancy: 'ultra-dark' // macOS only
  });

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow opening external links in default browser
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security: Prevent navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Only allow navigation to localhost in dev mode
    if (isDev && parsedUrl.origin === 'http://localhost:3000') {
      return;
    }
    
    // In production, only allow file:// protocol
    if (!isDev && parsedUrl.protocol === 'file:') {
      return;
    }
    
    event.preventDefault();
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, './build/index.html')}`;
    
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Initialize wallet and inscription manager with error handling
// (Moved to earlier in file)

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Wallet',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-wallet');
          }
        },
        {
          label: 'Import Wallet',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu:import-wallet');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
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
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Doginal Inscription Wallet',
              message: `${PRODUCTION_CONFIG.APP_NAME} v${PRODUCTION_CONFIG.VERSION}`,
              detail: 'Professional Dogecoin inscription wallet with built-in revenue system.\n\n' +
                     `Tax Address: ${PRODUCTION_CONFIG.TAX_WALLET_ADDRESS}\n` +
                     `Website: ${PRODUCTION_CONFIG.WEBSITE}\n` +
                     `Support: ${PRODUCTION_CONFIG.SUPPORT_EMAIL}`
            });
          }
        },
        {
          label: 'Visit Website',
          click: () => {
            shell.openExternal(PRODUCTION_CONFIG.WEBSITE);
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal(`mailto:${PRODUCTION_CONFIG.SUPPORT_EMAIL}?subject=Bug Report - Doginal Wallet v${PRODUCTION_CONFIG.VERSION}`);
          }
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Enhanced IPC handlers with comprehensive error handling
ipcMain.handle('app:getInfo', async () => {
  return {
    name: PRODUCTION_CONFIG.APP_NAME,
    version: PRODUCTION_CONFIG.VERSION,
    taxAddress: PRODUCTION_CONFIG.TAX_WALLET_ADDRESS,
    website: PRODUCTION_CONFIG.WEBSITE,
    isDev
  };
});

ipcMain.handle('wallet:connect', async (event, config) => {
  try {
    console.log('Attempting to connect wallet with config:', config);
    await wallet.connect(config);
    console.log('Wallet connected successfully');
    return { success: true, message: 'Connected to wallet successfully' };
  } catch (error) {
    console.error('Wallet connection failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wallet:create', async () => {
  try {
    log.info('Creating new wallet');
    const result = await wallet.createNewWallet();
    log.info('New wallet created successfully', { 
      addressCount: result.addresses?.length,
      seedLength: result.seed?.length,
      seedWords: result.seed?.split(' ').length
    });
    return { success: true, ...result };
  } catch (error) {
    log.error('Wallet creation failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wallet:import', async (event, seed) => {
  try {
    log.info('Importing wallet from seed phrase');
    const addresses = await wallet.importWalletFromSeed(seed);
    log.info('Wallet imported successfully', { addressCount: addresses?.length });
    return { success: true, addresses };
  } catch (error) {
    log.error('Wallet import failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wallet:generateAddress', async () => {
  try {
    const newAddress = await wallet.generateNewAddress();
    log.info('New address generated:', newAddress);
    return { success: true, address: newAddress };
  } catch (error) {
    log.error('Address generation failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wallet:getBalance', async (event, address) => {
  try {
    console.log('Getting balance for address:', address.substring(0, 10) + '...');
    const balance = await wallet.getBalance(address);
    console.log('Balance retrieved:', balance);
    return { success: true, balance };
  } catch (error) {
    console.error('Balance retrieval failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wallet:getAddresses', async () => {
  try {
    const addresses = await wallet.getAddresses();
    log.debug('Addresses retrieved:', { count: addresses?.length });
    return { success: true, addresses };
  } catch (error) {
    log.error('Address retrieval failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inscription:create', async (event, data) => {
  try {
    const { content, contentType, receivingAddress } = data;
    log.info('Creating inscription with persistent UTXO detection:', { 
      contentType, 
      contentSize: content?.length || 0,
      receivingAddress: receivingAddress?.substring(0, 10) + '...'
    });
    
    // Progress callback to send updates to renderer
    const onProgress = (message) => {
      event.sender.send('inscription:progress', { message, type: 'progress' });
    };
    
    // Balance update callback
    const onBalanceUpdate = (balance, addresses) => {
      event.sender.send('inscription:progress', { 
        message: `Current balance: ${balance} DOGE`, 
        type: 'balance',
        balance,
        addresses 
      });
    };
    
    // Create inscription with persistent UTXO detection
    const result = await inscriptionManager.createInscription({
      content,
      contentType,
      receivingAddress,
      taxAmount: PRODUCTION_CONFIG.TAX_AMOUNT / 100000000, // Convert satoshis to DOGE
      onProgress,
      onBalanceUpdate
    });
    
    log.info('Inscription created successfully:', { transactionId: result.txid });
    
    // Send final success message
    event.sender.send('inscription:progress', { 
      message: `✅ Inscription created! TXID: ${result.txid.substring(0, 10)}...`, 
      type: 'success',
      inscription: result
    });
    
    return { success: true, inscription: result };
  } catch (error) {
    log.error('Inscription creation failed:', error);
    
    // Send error message to renderer
    event.sender.send('inscription:progress', { 
      message: `❌ ${error.message}`, 
      type: 'error' 
    });
    
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inscription:estimate', async (event, data) => {
  try {
    const estimate = await inscriptionManager.estimateInscriptionCost(data);
    log.debug('Inscription cost estimated:', estimate);
    return { success: true, estimate };
  } catch (error) {
    log.error('Cost estimation failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inscription:history', async () => {
  try {
    const history = await inscriptionManager.getInscriptionHistory();
    log.debug('Inscription history retrieved:', { count: history?.length });
    return { success: true, history };
  } catch (error) {
    log.error('History retrieval failed:', error);
    return { success: false, error: error.message };
  }
});

// System information handlers
ipcMain.handle('system:showSaveDialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  } catch (error) {
    log.error('Save dialog failed:', error);
    return { canceled: true };
  }
});

ipcMain.handle('system:showOpenDialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  } catch (error) {
    log.error('Open dialog failed:', error);
    return { canceled: true };
  }
});

ipcMain.handle('system:showErrorDialog', async (event, title, content) => {
  try {
    await dialog.showErrorBox(title, content);
    return { success: true };
  } catch (error) {
    log.error('Error dialog failed:', error);
    return { success: false };
  }
});
