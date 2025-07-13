import { app, BrowserWindow } from 'electron'
import { join } from 'path'

class MainApplication {
  private mainWindow: BrowserWindow | null = null

  constructor() {
    this.setupApp()
  }

  private setupApp() {
    app.whenReady().then(() => {
      this.createWindow()
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) this.createWindow()
    })
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(join(__dirname, '../index.html'))
    }
  }
}

new MainApplication()