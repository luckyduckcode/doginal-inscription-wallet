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
  // Better detection of production vs development
  const isProduction = !isDev || process.env.NODE_ENV === 'production' || app.isPackaged;
  
  let walletPath, inscriptionPath;
  if (isProduction) {
    // In production, load from the built files in the dist directory
    walletPath = path.join(__dirname, '../dist/electron/src/wallet/dogeElectrum');
    inscriptionPath = path.join(__dirname, '../dist/electron/src/inscriptions/doginal');
  } else {
    // In dev mode, load from the compiled dist directory
    walletPath = '../dist/electron/src/wallet/dogeElectrum';
    inscriptionPath = '../dist/electron/src/inscriptions/doginal';
  }
  
  log.info('isDev:', isDev);
  log.info('app.isPackaged:', app.isPackaged);
  log.info('NODE_ENV:', process.env.NODE_ENV);
  log.info('isProduction (calculated):', isProduction);
  log.info('Loading wallet from:', walletPath);
  log.info('Loading inscriptions from:', inscriptionPath);
  log.info('__dirname:', __dirname);
  
  const walletModule = require(walletPath);
  const inscriptionModule = require(inscriptionPath);
  
  log.info('Wallet module loaded, keys:', Object.keys(walletModule));
  log.info('Inscription module loaded, keys:', Object.keys(inscriptionModule));
  
  DogeElectrumWallet = walletModule.DogeElectrumWallet;
  DoginalInscriptions = inscriptionModule.DoginalInscriptions;
  
  if (DogeElectrumWallet && DoginalInscriptions) {
    wallet = new DogeElectrumWallet();
    inscriptionManager = new DoginalInscriptions(wallet, PRODUCTION_CONFIG.TAX_WALLET_ADDRESS);
    log.info('Wallet and inscription manager created successfully');
  } else {
    throw new Error('Wallet or inscription classes not found in modules');
  }
  
  log.info('Wallet modules loaded successfully');
} catch (error) {
  log.error('Wallet modules not available:', error.message);
  log.error('Error stack:', error.stack);
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
      preload: path.join(__dirname, isDev ? './preload.js' : '../electron/preload.js'),
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
    : `file://${path.join(__dirname, '../build/index.html')}`;
    
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
    if (!wallet) {
      return { success: false, error: 'Wallet module not loaded' };
    }
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
    if (!wallet) {
      return { success: false, error: 'Wallet module not loaded' };
    }
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
    if (!wallet) {
      return { success: false, error: 'Wallet module not loaded' };
    }
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
    if (!wallet) {
      return { success: false, error: 'Wallet module not loaded' };
    }
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
    if (!wallet) {
      return { success: false, error: 'Wallet module not loaded' };
    }
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
    if (!wallet) {
      return { success: false, error: 'Wallet module not loaded' };
    }
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
    if (!inscriptionManager) {
      return { success: false, error: 'Inscription module not loaded' };
    }
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
    if (!inscriptionManager) {
      return { success: false, error: 'Inscription module not loaded' };
    }
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
    if (!inscriptionManager) {
      return { success: false, error: 'Inscription module not loaded' };
    }
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

// DOGE transaction handlers
ipcMain.handle('doge:createTransaction', async (event, { toAddress, amount, feeRate }) => {
  try {
    if (!wallet) {
      return { success: false, error: 'Wallet not connected' };
    }
    
    log.info('Creating DOGE transaction:', { toAddress: toAddress.substring(0, 10) + '...', amount, feeRate });
    
    // Convert amount from DOGE to satoshis
    const amountSatoshis = Math.floor(amount * 100000000);
    
    // Create the transaction
    const txHex = await wallet.createTransaction(toAddress, amountSatoshis, feeRate);
    
    log.info('✅ DOGE transaction created successfully');
    return { success: true, txHex };
  } catch (error) {
    log.error('DOGE transaction creation failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('doge:signTransaction', async (event, { txHex }) => {
  try {
    if (!wallet) {
      return { success: false, error: 'Wallet not connected' };
    }
    
    log.info('Signing DOGE transaction...');
    
    // The transaction should already be signed by createTransaction
    // This is for compatibility with the frontend interface
    
    log.info('✅ DOGE transaction signed successfully');
    return { success: true, signedTxHex: txHex };
  } catch (error) {
    log.error('DOGE transaction signing failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('doge:broadcastTransaction', async (event, { signedTxHex }) => {
  try {
    if (!wallet) {
      return { success: false, error: 'Wallet not connected' };
    }
    
    log.info('Broadcasting DOGE transaction...');
    
    // Broadcast the transaction
    const txid = await wallet.broadcastTransaction(signedTxHex);
    
    log.info('✅ DOGE transaction broadcasted successfully:', txid);
    return { success: true, txid };
  } catch (error) {
    log.error('DOGE transaction broadcast failed:', error);
    return { success: false, error: error.message };
  }
});

// Get transferable inscriptions
ipcMain.handle('inscription:getTransferable', async (event, addresses) => {
  try {
    if (!wallet) {
      return { success: false, error: 'Wallet not connected' };
    }
    
    log.info('Getting transferable inscriptions for', addresses.length, 'addresses');
    
    // This would need to be implemented in the inscription detector
    // For now, return empty array
    const transferableInscriptions = [];
    
    log.info('✅ Found', transferableInscriptions.length, 'transferable inscriptions');
    return { success: true, inscriptions: transferableInscriptions };
  } catch (error) {
    log.error('Getting transferable inscriptions failed:', error);
    return { success: false, error: error.message };
  }
});
