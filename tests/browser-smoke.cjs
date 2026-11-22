'use strict';
const assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process');
const {mkdtemp,readFile,rm}=require('node:fs/promises');
const os=require('node:os'),path=require('node:path');
const port=19863,base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function poll(fn,label,timeout=22000){
 let lastError;const start=Date.now();
 while(Date.now()-start<timeout){
  try{const result=await fn();if(result)return result;}catch(err){lastError=err;}
  await sleep(130);
 }
 throw Error('Timeout '+label+(lastError?': '+lastError.message:''));
}
function browserBin(){
 if(process.env.CHROME_BIN)return process.env.CHROME_BIN;
 for(const binary of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
  try{return execFileSync('which',[binary],{encoding:'utf8'}).trim();}catch{}
 }
 throw Error('Chromium absent');
}
async function main(){
 const tmp=await mkdtemp(path.join(os.tmpdir(),'niko-live-e2e-'));let server,chrome,ws,seq=0;
 const pending=new Map(),exceptions=[],postRequests=[];let errors='';
 try{
  server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','.'],{stdio:['ignore','ignore','pipe']});
  server.stderr.on('data',v=>errors+=String(v).slice(-800));
  await poll(async()=>(await fetch(base+'/')).status===200,'site local');
  chrome=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run',
   '--disable-background-networking','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+path.join(tmp,'profile'),'about:blank'],{stdio:['ignore','ignore','pipe']});
  chrome.stderr.on('data',v=>errors+=String(v).slice(-800));
  const portDev=await poll(async()=>Number((await readFile(path.join(tmp,'profile','DevToolsActivePort'),'utf8')).split('\n')[0]),'Chromium DevTools');
  const tabs=await(await fetch('http://127.0.0.1:'+portDev+'/json/list')).json();
  const tab=tabs.find(x=>x.type==='page');
  assert.ok(tab?.webSocketDebuggerUrl,'No Chrome target');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',event=>{
   const m=JSON.parse(event.data);
   if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params?.exceptionDetails?.exception?.description||'JS exception');
   if(m.method==='Network.requestWillBeSent'&&m.params?.request?.method==='POST')postRequests.push(m.params.request.url);
   if(!m.id||!pending.has(m.id))return;
   const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
  });
  function call(method,params={}){
   const id=++seq;
   return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout Chrome '+method));},16000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});
    ws.send(JSON.stringify({id,method,params}));
   });
  }
  async function evaluate(expression){
   const res=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(res.exceptionDetails)throw Error(res.exceptionDetails.exception?.description||res.exceptionDetails.text);
   return res.result?.value;
  }
  const wait=(expr,label)=>poll(()=>evaluate(expr),label,16000);
  const selectFile=(data,name='conductor.json')=>'(()=>{const e=document.querySelector("#importFile"),d=new DataTransfer();d.items.add(new File(['+JSON.stringify(data)+'],'+JSON.stringify(name)+',{type:"application/json"}));e.files=d.files;e.dispatchEvent(new Event("change",{bubbles:true}));return true})()';
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Page.navigate',{url:base+'/'});
  await wait('document.readyState==="complete"&&!!window.LiveCommanderBackup&&!!document.querySelector("#importTrigger")','live app ready');
  assert.equal(await evaluate('document.querySelector("#importTrigger").tagName'),'BUTTON','Keyboard accessible import button');
  await evaluate('(()=>{document.querySelector("#title").value="Ma régie";document.querySelector("#title").dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("#track").value="Intro DJ";document.querySelector("#bpm").value="125";document.querySelector("#setForm").requestSubmit();return true})()');
  await wait('document.querySelectorAll("#setlist .item").length===1','setlist added');
  const stored=await evaluate('JSON.parse(localStorage.getItem("niko-live-commander-local-v1"))');
  assert.equal(stored.title,'Ma régie');
  assert.equal(stored.setlist[0].name,'Intro DJ');
  await evaluate('window.confirm=()=>false;true');
  const incoming=JSON.stringify({title:'Import externe',date:'2026-11-22',time:'19:30',notes:'Concert',checks:{audio:true},setlist:[{name:'Acid 303',bpm:135}],cue:'MIX',elapsed:1000,runningSince:123});
  await evaluate(selectFile(incoming));
  await wait('document.querySelector("#notice").textContent.includes("Import annulé")','cancel protects existing data');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("niko-live-commander-local-v1")).title'),'Ma régie');
  await evaluate(selectFile(JSON.stringify({title:'Bad',setlist:[{name:'Broken',bpm:999}],checks:{},cue:'INTRO',elapsed:0})));
  await wait('document.querySelector("#notice").textContent.includes("Import refusé")','invalid restore rejected');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("niko-live-commander-local-v1")).title'),'Ma régie');
  await evaluate('window.confirm=()=>true;true');
  await evaluate(selectFile(incoming));
  await wait('JSON.parse(localStorage.getItem("niko-live-commander-local-v1")).title==="Import externe"','restored data');
  await wait('document.querySelector("#title").value==="Import externe"&&document.querySelectorAll("#setlist .item").length===1','restored view');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("niko-live-commander-local-v1")).runningSince'),null,'Import must stay paused');
  await evaluate('(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.__exported=blob;return original(blob)};document.querySelector("#export").click();return true})()');
  const exported=await evaluate('window.__exported.text().then(JSON.parse)');
  assert.equal(exported.format,'niko-live-commander-backup-v1');
  assert.equal(exported.title,'Import externe');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  assert.equal(await evaluate('(()=>{const b=document.querySelector("#importTrigger").getBoundingClientRect();return b.height>=44&&b.width>=44&&b.left>=0&&b.right<=innerWidth})()'),true,'Mobile import button touch size');
  assert.deepEqual(exceptions,[],'No unhandled JS exceptions');
  assert.deepEqual(postRequests,[],'Local backup must not send network POSTs');
  console.log('PASS Niko Live Commander Chromium: setlist, cancel, invalid JSON, safe restore, export, 390px button and privacy');
 }catch(err){throw Error(err.message+(errors?'\nHTTP/Chrome logs: '+errors.slice(-1100):''));}
 finally{try{ws?.close()}catch{}try{chrome?.kill('SIGKILL')}catch{}try{server?.kill('SIGTERM')}catch{}await sleep(250);await rm(tmp,{recursive:true,force:true,maxRetries:4,retryDelay:200}).catch(()=>{});}
}
main().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
