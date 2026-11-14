import {Capacitor} from '@capacitor/core';
export type FileDestination='download'|'share';
export function fileSuccess(destination:FileDestination){return destination==='share'?'Archivo preparado para guardar o compartir.':'Archivo preparado. Revisa tus descargas.'}
export async function saveFile(filename:string,blob:Blob):Promise<FileDestination>{
  if(Capacitor.isNativePlatform()){
    const [{Filesystem,Directory},{Share}]=await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')]);
    const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const file=await Filesystem.writeFile({path:`exports/${filename}`,data:btoa(binary),directory:Directory.Cache,recursive:true});
    await Share.share({title:filename,url:file.uri,dialogTitle:'Guardar o compartir archivo'});return 'share';
  }
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return 'download';
}
