const {app,BrowserWindow,dialog,session,protocol,net}=require('electron');
const path=require('node:path');const{pathToFileURL}=require('node:url');const{resolveAppPath}=require('./paths.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'registro',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.setName('Registro Gallero');
const singleInstance=app.requestSingleInstanceLock();let window;
if(!singleInstance)app.quit();
else{
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  app.whenReady().then(()=>{
    protocol.handle('registro',request=>{try{return net.fetch(pathToFileURL(resolveAppPath(request.url,path.join(__dirname,'../dist'))).toString())}catch{return new Response('Dirección no permitida',{status:403})}});
    session.defaultSession.webRequest.onHeadersReceived((details,callback)=>callback({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':["default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:;"]}}));
    session.defaultSession.on('will-download',(_event,item)=>{
      item.setSaveDialogOptions({title:'Guardar archivo de Registro Gallero',defaultPath:path.join(app.getPath('downloads'),item.getFilename())});
      item.once('done',(_e,state)=>{if(state==='interrupted')dialog.showErrorBox('No se pudo guardar','Comprueba el espacio disponible y los permisos de la carpeta. Vuelve a exportar el archivo.');});
    });
    window=new BrowserWindow({width:1380,height:920,minWidth:360,minHeight:640,title:'Registro Gallero',backgroundColor:'#f7f8f2',icon:path.join(__dirname,'../build/icon.png'),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    window.webContents.on('will-navigate',(event,url)=>{if(url!==window.webContents.getURL())event.preventDefault();});
    window.webContents.on('did-fail-load',(_event,code)=>{if(code!==-3)dialog.showErrorBox('No se pudo abrir la aplicación','Vuelve a iniciar Registro Gallero. Tus datos locales no se han eliminado.');});
    window.loadURL('registro://app/index.html');
    window.on('closed',()=>{window=null;});
  });
  app.on('window-all-closed',()=>app.quit());
}
