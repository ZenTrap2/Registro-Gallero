import {spawnSync} from 'node:child_process';
const release=process.argv.includes('--release');
const command=process.platform==='win32'?'gradlew.bat':'./gradlew';
const result=spawnSync(command,[release?'assembleRelease':'assembleDebug','--no-daemon'],{cwd:new URL('../android/',import.meta.url),stdio:'inherit',shell:process.platform==='win32'});
process.exit(result.status??1);
