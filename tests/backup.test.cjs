'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parse,MAX_BYTES,MAX_TRACKS}=require('../backup.js');
const basic={title:'Live DJ',date:'2026-11-22',time:'19:30',notes:'Prêt pour Miami',checks:{audio:true,micro:false},setlist:[{name:'Track A',bpm:125},{name:'Transition',bpm:null}],cue:'MIX',elapsed:1700,runningSince:100};
test('restores legacy exports without trusting running timers',()=>{
 const restored=parse(JSON.stringify(basic));
 assert.equal(restored.runningSince,null);
 assert.equal(restored.setlist.length,2);
 assert.equal(restored.elapsed,1700);
 assert.equal(restored.checks.audio,true);
 assert.deepEqual(parse(JSON.stringify({...basic,format:'niko-live-commander-backup-v1'})),restored);
});
test('all invalid nested objects are rejected without partial import',()=>{
 const invalid=[
  {...basic,setlist:[{name:'OK',bpm:125},{name:'Invalid',bpm:999}]},
  {...basic,setlist:[{name:'',bpm:null}]},
  {...basic,checks:{audio:'yes'}},
  {...basic,elapsed:'100'},
  {...basic,elapsed:1e309},
  {...basic,date:'2026-11-22T20:00'},
  {...basic,time:'29:10'},
  {...basic,cue:'TIKTOK_LIVE'},
  {...basic,notes:'a'.repeat(4001)},
  {...basic,setlist:new Array(MAX_TRACKS+1).fill({name:'OK',bpm:120})}
 ];
 for(const state of invalid)assert.throws(()=>parse(JSON.stringify(state)),Error);
 assert.throws(()=>parse('{invalid'),/JSON invalide/);
 assert.throws(()=>parse('x'.repeat(MAX_BYTES+1)),/trop volumineuse/);
});
test('unexpected input fields never pollute restored state',()=>{
 const data=JSON.parse(JSON.stringify(basic));
 data.untrusted={token:'secret'};
 data.checks.unknown=true;
 data.setlist[0].extra='anything';
 const state=parse(JSON.stringify(data));
 assert.equal(Object.hasOwn(state,'untrusted'),false);
 assert.equal(Object.hasOwn(state.checks,'unknown'),false);
 assert.equal(Object.hasOwn(state.setlist[0],'extra'),false);
});
