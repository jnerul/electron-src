const { app, BrowserWindow, Menu, remote} = require('electron')

function createWindow() {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 1500,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    icon: 'src/resource/icon.png',
    show: false,
  })
  win.maximize();
  // 并且为你的应用加载index.html
  win.loadFile('src/zpert.html')
  win.webContents.openDevTools();
  win.show();

  win.setProgressBar(0.5)
  // const appIcon = new Tray('src/resource/icon.png')
  // win.setIcon(appIcon)
}


app.whenReady().then(createWindow)


