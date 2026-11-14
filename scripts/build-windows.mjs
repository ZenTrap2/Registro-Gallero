import{cpSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync}from'node:fs';import{tmpdir}from'node:os';import path from'node:path';import{fileURLToPath}from'node:url';import{spawnSync}from'node:child_process';
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ||= '5';
const root=fileURLToPath(new URL('../',import.meta.url)),stage=mkdtempSync(path.join(tmpdir(),'registro-gallero-windows-'));const target=process.argv.includes('--installer')?'nsis':'portable';
try{
 for(const dir of ['dist','desktop','build'])cpSync(path.join(root,dir),path.join(stage,dir),{recursive:true});
 const source=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:source.name,version:source.version,description:source.description,author:source.author,main:source.main,private:true},null,2));
 mkdirSync(path.join(stage,'node_modules'));
 const electronVersion=JSON.parse(readFileSync(path.join(root,'node_modules/electron/package.json'),'utf8')).version;
 const args=[path.join(root,'node_modules/electron-builder/out/cli/cli.js'),'--projectDir',stage,'--config',path.join(root,'electron-builder.yml'),'--config.directories.app=.','--config.directories.output='+path.join(root,'release/windows'),'--config.electronVersion='+electronVersion,'--win',target,'--x64'];
 if(process.env.ELECTRON_CACHE)args.push('--config.electronDownload.cache='+process.env.ELECTRON_CACHE);
 const result=spawnSync(process.execPath,args,{cwd:stage,stdio:'inherit'});process.exitCode=result.status??1;
}finally{rmSync(stage,{recursive:true,force:true})}
