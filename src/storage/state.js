import{mkdir,readFile,writeFile}from"node:fs/promises";import{dirname}from"node:path";
export async function loadState(path,startingCash){
 try{
  const state=JSON.parse(await readFile(path,"utf8"));
  state.positions??=[];state.trades??=[];state.seenMints??=[];
  state.initialBalanceUsd??=startingCash;state.day??=new Date().toISOString().slice(0,10);
  state.dayStartEquityUsd??=state.cashUsd??startingCash;state.dayTradeStartIndex??=state.trades.length;
  return state;
 }catch(error){if(error.code!=="ENOENT")throw error;return{cashUsd:startingCash,initialBalanceUsd:startingCash,positions:[],trades:[],day:new Date().toISOString().slice(0,10),dayStartEquityUsd:startingCash,seenMints:[]};}
}
export async function saveState(path,state){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(state,null,2)+"\n",{mode:0o600});}
