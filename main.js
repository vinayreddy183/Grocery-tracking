const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize electron-store for data persistence
const store = new Store();

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // Security: disable node integration
      contextIsolation: true, // Security: enable context isolation
      preload: path.join(__dirname, 'preload.js') // Load the preload script
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional: add app icon
    titleBarStyle: 'default',
    show: false // Don't show until ready-to-show
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Optional: Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for data persistence

// Get all grocery items
ipcMain.handle('get-items', () => {
  try {
    const items = store.get('groceryItems', []);
    console.log('Retrieved items:', items.length);
    return items;
  } catch (error) {
    console.error('Error getting items:', error);
    return [];
  }
});

// Save grocery items
ipcMain.handle('save-items', (event, items) => {
  try {
    store.set('groceryItems', items);
    console.log('Saved items:', items.length);
    return { success: true };
  } catch (error) {
    console.error('Error saving items:', error);
    return { success: false, error: error.message };
  }
});

// Add a single item
ipcMain.handle('add-item', (event, item) => {
  try {
    const items = store.get('groceryItems', []);
    
    // Add timestamp and unique ID
    const newItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      dateAdded: new Date().toISOString()
    };
    
    items.unshift(newItem); // Add to beginning for newest first
    store.set('groceryItems', items);
    
    console.log('Added item:', newItem.name);
    return { success: true, item: newItem };
  } catch (error) {
    console.error('Error adding item:', error);
    return { success: false, error: error.message };
  }
});

// Update an item
ipcMain.handle('update-item', (event, updatedItem) => {
  try {
    const items = store.get('groceryItems', []);
    const itemIndex = items.findIndex(item => item.id === updatedItem.id);
    
    if (itemIndex !== -1) {
      // Preserve original dateAdded and id
      items[itemIndex] = {
        ...updatedItem,
        id: items[itemIndex].id,
        dateAdded: items[itemIndex].dateAdded,
        dateModified: new Date().toISOString()
      };
      
      store.set('groceryItems', items);
      console.log('Updated item:', updatedItem.name);
      return { success: true, item: items[itemIndex] };
    } else {
      return { success: false, error: 'Item not found' };
    }
  } catch (error) {
    console.error('Error updating item:', error);
    return { success: false, error: error.message };
  }
});

// Delete an item
ipcMain.handle('delete-item', (event, itemId) => {
  try {
    const items = store.get('groceryItems', []);
    const filteredItems = items.filter(item => item.id !== itemId);
    
    if (filteredItems.length < items.length) {
      store.set('groceryItems', filteredItems);
      console.log('Deleted item with ID:', itemId);
      return { success: true };
    } else {
      return { success: false, error: 'Item not found' };
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, error: error.message };
  }
});

// Clear all data (optional utility function)
ipcMain.handle('clear-all-data', () => {
  try {
    store.clear();
    console.log('Cleared all data');
    return { success: true };
  } catch (error) {
    console.error('Error clearing data:', error);
    return { success: false, error: error.message };
  }
});

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Handle app quit
ipcMain.handle('quit-app', () => {
  app.quit();
});