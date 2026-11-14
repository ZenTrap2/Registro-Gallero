const path=require('node:path');
function resolveAppPath(address,root){const url=new URL(address);if(url.protocol!=='registro:'||url.hostname!=='app')throw Error('Dirección no permitida.');const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';if(relative.includes('\0'))throw Error('Ruta inválida.');const target=path.resolve(root,relative);if(target!==path.resolve(root)&&!target.startsWith(path.resolve(root)+path.sep))throw Error('Ruta no permitida.');return target;}
module.exports={resolveAppPath};
