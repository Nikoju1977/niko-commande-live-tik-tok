/* Niko Live Commander: validate a conductor before replacing local data.
   Compatible with original exports without a format property. No network calls. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LiveCommanderBackup=api;
})(typeof window==='object'?window:typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const MAX_BYTES=1000000,MAX_TRACKS=1000;
  const ALLOWED_CUES=new Set(['INTRO','MIX','PAUSE','FIN']);
  const CHECK_IDS=new Set(['audio','micro','mix','camera','network','rights','safety']);
  function text(value,max,label){
    if(typeof value!=='string'||value.length>max)throw Error(label+' invalide.');
    return value;
  }
  function nonnegative(value,label){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>365*24*60*60*1000)
      throw Error(label+' invalide.');
    return value;
  }
  function parse(raw){
    if(typeof raw!=='string'||raw.length>MAX_BYTES)throw Error('Sauvegarde trop volumineuse (1 Mo maximum).');
    let data;
    try{data=JSON.parse(raw);}catch{throw Error('Fichier JSON invalide.');}
    if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.setlist)||
        data.setlist.length>MAX_TRACKS||(data.format&&data.format!=='niko-live-commander-backup-v1')){
      throw Error('Ce fichier n’est pas un conducteur Niko Live Commander valide.');
    }
    const title=text(data.title,120,'Titre');
    const date=text(data.date??'',10,'Date');
    const time=text(data.time??'',5,'Heure');
    const notes=text(data.notes??'',4000,'Notes');
    if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Date invalide.');
    if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Heure de Miami invalide.');
    const cue=data.cue??'INTRO';
    if(!ALLOWED_CUES.has(cue))throw Error('Cue inconnu.');
    const elapsed=nonnegative(data.elapsed??0,'Chronomètre');
    if(!data.checks||typeof data.checks!=='object'||Array.isArray(data.checks))
      throw Error('Check-list invalide.');
    const checks={};
    for(const [key,val]of Object.entries(data.checks)){
      if(!CHECK_IDS.has(key))continue;
      if(typeof val!=='boolean')throw Error('Case de check-list invalide : '+key);
      checks[key]=val;
    }
    const setlist=data.setlist.map((entry,i)=>{
      if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Titre de setlist invalide, position '+(i+1)+'.');
      const name=text(entry.name,130,'Titre de setlist').trim();
      if(!name)throw Error('Titre de setlist vide, position '+(i+1)+'.');
      const bpm=entry.bpm??null;
      if(bpm!==null&&(typeof bpm!=='number'||!Number.isFinite(bpm)||bpm<40||bpm>250))
        throw Error('BPM invalide, position '+(i+1)+'.');
      return {name,bpm};
    });
    // Never restore runningSince: an imported session must remain paused.
    return {title,date,time,notes,checks,setlist,cue,elapsed,runningSince:null};
  }
  return Object.freeze({MAX_BYTES,MAX_TRACKS,parse});
});
