import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import {existsSync} from "node:fs";
const root=new URL("../",import.meta.url),dataDir=new URL("../data/",import.meta.url),statePath=new URL("../data/state.json",import.meta.url),envPath=new URL("../.env",import.meta.url);
await mkdir(dataDir,{recursive:true});
if(existsSync(statePath)){
 const stamp=new Date().toISOString().replace(/[:.]/g,"-");
 await rename(statePath,new URL(`../data/state.backup-${stamp}.json`,import.meta.url));
 console.log("Previous paper history backed up in data/.");
}
let env="";
try{env=await readFile(envPath,"utf8");}catch{}
if(/^START_BALANCE_USD=.*$/m.test(env))env=env.replace(/^START_BALANCE_USD=.*$/m,"START_BALANCE_USD=20");
else env+=(env.endsWith("\n")||!env?"":"\n")+"START_BALANCE_USD=20\n";
await writeFile(envPath,env);
const today=new Date().toISOString().slice(0,10);
const state={cashUsd:20,initialBalanceUsd:20,positions:[],trades:[],day:today,dayStartEquityUsd:20,dayTradeStartIndex:0,seenMints:[],lastLossAt:0};
await writeFile(statePath,JSON.stringify(state,null,2)+"\n",{mode:0o600});
console.log("Paper account reset to $20.00. Old history was backed up; no real funds or wallet were touched.");
