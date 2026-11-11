// Isolated trial controller. No claim occurs merely from visiting the editor.
export function setupRemote(scene){
 const $=s=>document.querySelector(s),message=text=>$('#command-status').textContent=text;
 let id=sessionStorage.getItem('clubRemoteControllerId');if(!id){id=crypto.randomUUID?.()||String(Date.now())+Math.random();sessionStorage.setItem('clubRemoteControllerId',id)}
 let status={},enabled=false,busy=false,dead=false,timer;
 const identity=()=>({controllerId:id});
 async function request(path,data){const r=await fetch(path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const text=await r.text();let body;try{body=JSON.parse(text)}catch{}if(!r.ok)throw Error(body?.error||text.replace(/<[^>]*>/g,' ').trim());return body}
 function refresh(){const own=status.control?.owner===id;
  const isRemote=new URLSearchParams(location.search).get('remote')==='1'||/iPad|iPhone/.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac/.test(navigator.platform));
  const locked=!isRemote&&!!status.control?.remote&&!own;document.querySelector('main').inert=locked;document.querySelector('main').classList.toggle('remote-locked',locked);
  $('#send').disabled=!enabled||!own||!scene()||!status.host?.connected||busy;
  $('#stop-mac').disabled=!enabled||!own||!status.host?.connected||busy;
  $('#mac-fullscreen').disabled=!enabled||!own||busy;
  $('#open-output').disabled=!enabled||busy;
  $('#claim').disabled=!enabled||busy||!!status.control?.owner&& !own;
  $('#claim').hidden=own;$('#release').hidden=!status.control?.remote;
  $('#mac-fullscreen').textContent=status.window?.fullscreen?'Exit Mac fullscreen':'Mac fullscreen';
 }
 async function poll(){try{
  status=await request('/api/remote-status');
  if(status.control?.owner===id)await request('/api/control-session',{action:'heartbeat',id});
  $('#mac-status').textContent=status.host?.connected?(status.host.playing?'Playing on trial Mac':'Trial Mac stopped')+(status.host.filename?' · '+status.host.filename:''):'Trial Mac engine offline';
  $('#ownership').textContent=(status.control?.owner===id?'You own control':status.control?.remote?'Another controller owns control':'Mac has control')+' · '+(status.window?.fullscreen?'Fullscreen':'Windowed / closed');
  refresh();
 }catch(error){status={};refresh();$('#mac-status').textContent='Trial Mac connection unavailable';message(error.message)}
 if(!dead)timer=setTimeout(poll,1800)}
 async function action(fn){if(busy)return;busy=true;refresh();try{await fn()}catch(error){message(error.message)}finally{busy=false;await pollOnce()}}
 async function pollOnce(){try{status=await request('/api/remote-status')}catch{status={}}refresh()}
 $('#claim').onclick=()=>action(async()=>{const control=await request('/api/control-session',{action:'claim',id});if(!control.allowed)throw Error('Another controller has control');status.control=control;message('You have control of the trial Mac.')});
 $('#release').onclick=()=>action(async()=>{await request('/api/control-session',{action:'release',id});message('Control returned to trial Mac.')});
 $('#open-output').onclick=()=>action(async()=>{message('Opening the isolated trial output…');await request('/api/output-window',{operation:'open'});message('Trial output opened; waiting for engine connection.')});
 $('#mac-fullscreen').onclick=()=>action(async()=>{const result=await request('/api/output-window',{enabled:!status.window?.fullscreen,...identity()});message(result.fullscreen?'Trial Mac entered fullscreen.':'Trial Mac is windowed.')});
 async function command(action,payload={}){const commandId=id+':'+Date.now()+':'+Math.random();await request('/api/remote-command',{id:commandId,action,...payload,...identity()});message('Sent to trial Mac; waiting for confirmation…');
  const deadline=Date.now()+12000;
  while(Date.now()<deadline&&!dead){const current=await request('/api/remote-status');const result=current.host?.commandResults?.find(r=>r.id===commandId)||(current.host?.lastCommand?.id===commandId?current.host.lastCommand:null);if(result){if(result.error)throw Error(result.error);message('Trial Mac confirmed: '+action);return}await new Promise(r=>setTimeout(r,350))}
  throw Error('Trial Mac has not confirmed this command. Check the output before retrying.');
 }
 $('#send').onclick=()=>action(async()=>{const prepared=scene();if(!prepared)throw Error('Choose a video first');await command('take',{scene:{...prepared,effects:{hueRotate:0,saturate:100,contrast:100,brightness:100,blur:0,invert:0,sepia:0,...prepared.layout?.effects},vfx:{enabled:false,scene:0,logo3d:{},shape:{}},trails:{enabled:false,amount:0},captionEnabled:false,transition:{type:'cut',duration:0,pace:'steady',params:{},seed:1}}})});
 $('#stop-mac').onclick=()=>action(()=>command('stop'));
 request('/api/ui-preview-info').then(info=>{enabled=!!info.playoutEnabled; if(!enabled)message('Start the trial with --enable-playout to enable isolated Mac controls.');poll()}).catch(e=>message(e.message));
 window.addEventListener('pageshow',event=>{if(event.persisted){dead=false;clearTimeout(timer);poll()}});
 window.addEventListener('pagehide',()=>{dead=true;clearTimeout(timer)});
 return {refresh};
}
