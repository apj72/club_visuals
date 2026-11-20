/* The editor is always a private preview. Only the Mac engine publishes playout. */
const isRemoteController = !isMacEngine && (new URLSearchParams(location.search).get('remote') === '1'
  || /iPad|iPhone/.test(navigator.userAgent)
  || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform + navigator.userAgent)));
const remoteId = (() => {
  const fresh = globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random();
  if (!isRemoteController) return fresh;
  try {
    const id = sessionStorage.getItem('clubRemoteControllerId') || fresh;
    sessionStorage.setItem('clubRemoteControllerId', id);
    return id;
  } catch { return fresh; }
})();
let macControlsLocked = false;
let controllerAllowed = !isRemoteController;
let remoteStatus = {}, hostClaimed = false, hostLastCommand = null;
const hostCommandResults = [];
let remoteQueue = Promise.resolve();
const remoteBar = document.createElement('section');
remoteBar.className = 'remote-bar';
remoteBar.innerHTML = `<div class="remote-heading"><strong>${isMacEngine ? 'Mac playout engine' : 'PRIVATE PREVIEW'}</strong>
  <span id="remoteConnection" role="status">Connecting to Mac…</span>
  <button id="remoteControlsToggle" type="button" aria-controls="remoteControlsPanel" aria-expanded="false">Output controls ▾</button></div>
  <span id="remoteIntro">${isMacEngine ? 'Keep this engine open. Audio inputs belong to this Mac.' : 'Audition and edit here. Changes stay private until you send them.'}</span>
  <div class="remote-actions" id="remoteControlsPanel">
  <button id="remoteTake">Send to Mac ▶</button><button id="remotePlaylist">Play this playlist on Mac</button>
  <button id="remoteStop">Stop Mac</button><button id="remoteNext">Next on Mac</button>
  <button id="remoteFullscreen">Mac fullscreen</button>
  <button id="remoteOpen">Open output screen</button><button id="ipadConnect" type="button">Connect iPad</button></div>
  <div class="control-banner" id="controlBanner" hidden role="status">
    <strong id="controlNotice"></strong>
    <button id="controlReturn" hidden>Return control to Mac</button>
    <button id="controlClaim" hidden>Take remote control</button>
    <button id="controlOpen" hidden>Open output screen</button>
  </div>
  <p id="remoteMessage" role="status"></p>`;
document.body.prepend(remoteBar);
const remoteControlsToggle = document.getElementById('remoteControlsToggle');
function showOutputControls(expanded, remember = false) {
  document.getElementById('remoteControlsPanel').hidden = isMacEngine || !expanded;
  document.getElementById('remoteIntro').hidden = !isMacEngine && !expanded;
  remoteControlsToggle.setAttribute('aria-expanded', String(expanded));
  remoteControlsToggle.textContent = expanded ? 'Hide output controls ▴' : 'Output controls ▾';
  if (remember) try { localStorage.setItem('clubVisuals.outputControlsExpanded', String(expanded)); } catch {}
}
let outputControlsExpanded = false;
try { outputControlsExpanded = localStorage.getItem('clubVisuals.outputControlsExpanded') === 'true'; } catch {}
remoteControlsToggle.hidden = isMacEngine;
remoteControlsToggle.title = 'Show or hide Mac output controls. Preview and editing stay private until you send them.';
showOutputControls(outputControlsExpanded);
remoteControlsToggle.addEventListener('click', () => showOutputControls(remoteControlsToggle.getAttribute('aria-expanded') !== 'true', true));
const macEditor = document.createElement('div');
macEditor.id = 'macEditorControls';
for (const element of [...document.body.children]) {
  if (element !== remoteBar && !['SCRIPT','STYLE','LINK'].includes(element.tagName)) macEditor.append(element);
}
document.body.append(macEditor);
// Keep the handover action reachable even when a native modal is already open.
const remoteHandoverDialog=document.createElement('dialog');
remoteHandoverDialog.id='remoteHandoverDialog';
remoteHandoverDialog.className='remote-handover';
remoteHandoverDialog.setAttribute('aria-labelledby','remoteHandoverTitle');
remoteHandoverDialog.innerHTML='<h2 id="remoteHandoverTitle">Being remote controlled by iPad</h2><p>Your open editor is kept in place. Return control to continue working on this Mac.</p><button id="remoteHandoverReturn" type="button">Return control to Mac</button><button id="remoteHandoverOpen" type="button">Open output screen</button><p id="remoteHandoverStatus" role="status"></p>';
remoteHandoverDialog.addEventListener('cancel',event=>{if(macControlsLocked)event.preventDefault();});
document.body.append(remoteHandoverDialog);
const remoteStyle = document.createElement('style');
remoteStyle.textContent = `.remote-bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:100;margin:12px;padding:14px;border:2px solid #56d6bd;border-radius:10px;background:#182333;color:white;font:14px system-ui;box-shadow:0 6px 18px #0005}
.remote-bar strong{display:block;color:#56d6bd;margin-bottom:6px}.remote-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.remote-actions[hidden]{display:none}.remote-actions button,.remote-actions a{padding:12px;min-height:44px;background:#29354a;color:white;border:1px solid #73849d;border-radius:6px;text-decoration:none}
.remote-heading{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.remote-heading strong{margin:0}.remote-heading #remoteConnection{flex:1;min-width:0}.remote-heading button{padding:8px 12px;min-height:40px;border:1px solid #73849d;border-radius:6px;background:#29354a;color:white;cursor:pointer}.remote-heading button[hidden],#remoteIntro[hidden]{display:none}#remoteMessage:empty{display:none}
#remoteTake{background:#16755f}#remoteMessage{color:#ffda87}.remote-bar p{margin-top:6px}
.control-banner{padding:12px;background:#283a4b;border-radius:6px}.control-banner[hidden]{display:none}.control-banner button{padding:12px;min-height:44px;margin:4px 8px 0 0;border-radius:6px;border:1px solid #86cbbd;background:#203b36;color:white}
#macEditorControls.remote-locked{opacity:.35;filter:grayscale(1);pointer-events:none}.remote-actions button:disabled{opacity:.35;cursor:not-allowed}
.remote-handover{width:min(520px,94vw);margin:auto;padding:24px;border:1px solid #86cbbd;border-radius:10px;background:#182333;color:white;font:14px system-ui}.remote-handover::backdrop{background:#0008}.remote-handover p{margin:12px 0}.remote-handover button{padding:12px;margin:4px;border:1px solid #86cbbd;border-radius:6px;background:#203b36;color:white}
@media(max-width:1100px){.main-layout{display:flex;flex-direction:column}.left-col,.right-col{width:100%;min-width:0}.controls{flex-wrap:wrap}button{touch-action:manipulation}}
`;
document.head.append(remoteStyle);
const remoteMessage = message => document.getElementById('remoteMessage').textContent = message;
function updateControlOwnership(state) {
  controllerAllowed = !isRemoteController ? !state?.remote : state?.owner === remoteId;
  const locked = !isRemoteController && !!state?.remote;
  if (locked && !macControlsLocked) {
    if (fxWindow && !fxWindow.closed) fxWindow.close();
    if (vfxWindow && !vfxWindow.closed) vfxWindow.close();
  }
  macControlsLocked = locked;
  macEditor.inert = locked;
  macEditor.classList.toggle('remote-locked', locked);
  macEditor.querySelectorAll('dialog').forEach(dialog => { dialog.inert = locked; });
  if(locked&&macEditor.querySelector('dialog[open]')&&!remoteHandoverDialog.open)remoteHandoverDialog.showModal();
  if(!locked&&remoteHandoverDialog.open)remoteHandoverDialog.close();
  remoteBar.querySelectorAll('.remote-actions button:not(#remoteOpen):not(#ipadConnect)').forEach(button => {
    button.disabled = !controllerAllowed;
  });
  document.getElementById('controlBanner').hidden = !(locked || isRemoteController);
  document.getElementById('controlNotice').textContent = locked ? 'Being remote controlled by iPad'
    : controllerAllowed ? 'You have remote control of the Mac' : state?.remote ? 'Another iPad has control' : 'Control has returned to the Mac';
  document.getElementById('controlReturn').hidden = !locked;
  document.getElementById('controlClaim').hidden = !isRemoteController || controllerAllowed;
  document.getElementById('controlOpen').hidden = !locked;
  document.getElementById('remoteOpen').hidden = locked;
  if (isRemoteController) {
    document.querySelectorAll('.auto-perform-top button, .auto-perform-controls select').forEach(control => { control.disabled = !controllerAllowed; });
  }
}
document.addEventListener('keydown', event => {
  if (macControlsLocked && !remoteBar.contains(event.target) && !remoteHandoverDialog.contains(event.target) && !event.metaKey && !event.ctrlKey) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);
async function returnControlToMac() {
  try {
    updateControlOwnership(await remotePost('/api/control-session', {action:'release'}));
    remoteMessage('Control returned to this Mac.');
  } catch (error) { remoteMessage(error.message);document.getElementById('remoteHandoverStatus').textContent=error.message; }
}
document.getElementById('controlReturn').onclick = returnControlToMac;
document.getElementById('remoteHandoverReturn').onclick = returnControlToMac;
document.getElementById('controlClaim').onclick = async () => {
  try {
    updateControlOwnership(await remotePost('/api/control-session', {action:'claim', id:remoteId}));
  } catch (error) { remoteMessage(error.message); }
};
function controllerIdentity() { return isRemoteController ? {controllerId:remoteId} : {}; }
async function remotePost(path, data) {
  const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
  const body = await response.text();
  let result;
  try { result = JSON.parse(body); } catch {}
  if (!response.ok) throw new Error(result?.error || body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  return result;
}
function previewScene() {
  return {filename:currentFilename, layout:currentPlayerLayout(), effects:currentEffects,
    vfx:getVfxState(), trails:{enabled:trailsEnabled, amount:trailAmount},
    transition:normaliseTransition({type:document.getElementById('manualTransitionType').value,
      duration:document.getElementById('manualTransitionDuration').value,
      pace:document.getElementById('manualTransitionPace').value, params:manualTransitionParams, seed:manualTransitionSeed}),
    captionEnabled, time:video.ended ? playbackBounds().start : video.currentTime || 0};
}
async function sendMacCommand(action, payload = {}) {
  const id = remoteId + ':' + Date.now() + ':' + Math.random();
  try {
    if (!controllerAllowed) throw new Error('Tap Take remote control to control the Mac.');
    let current = await (await fetch('/api/remote-status')).json();
    if (!current.host?.connected) {
      remoteMessage('Starting Mac playout…');
      await remotePost('/api/output-window', {operation:'open'});
      const readyDeadline = Date.now() + 12000;
      while (Date.now() < readyDeadline) {
        current = await (await fetch('/api/remote-status')).json();
        if (current.host?.connected) break;
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    await remotePost('/api/remote-command', {id, action, ...payload, ...controllerIdentity()});
    remoteMessage('Sent to Mac; waiting for confirmation…');
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const status = await (await fetch('/api/remote-status')).json();
      const result = status.host?.commandResults?.find(result => result.id === id) || (status.host?.lastCommand?.id === id ? status.host.lastCommand : null);
      if (result) {
        if (result.error) throw new Error(result.error);
        remoteMessage('Mac confirmed: ' + action + '.');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    throw new Error('Mac has not confirmed this command. Check the Mac output before retrying.');
  } catch (error) { remoteMessage(error.message); }
}
document.getElementById('remoteTake').onclick = () => {
  if (!currentFilename) return remoteMessage('Choose and audition a video first.');
  sendMacCommand('take', {scene:previewScene()});
};
document.getElementById('remotePlaylist').onclick = () => {
  if (!plPlaylist.entries.length) return remoteMessage('Choose or create a playlist first.');
  sendMacCommand('playlist', {playlist:JSON.parse(JSON.stringify(plPlaylist)), loop:plLoopPlaylist, motionSource:vfxState.motion});
};
document.getElementById('remoteStop').onclick = () => sendMacCommand('stop');
document.getElementById('remoteNext').onclick = () => sendMacCommand('next');
document.getElementById('remoteFullscreen').onclick = requestMacFullscreen;
async function openOutputScreen() {
  try {
    remoteMessage('Opening Mac playout…');
    await remotePost('/api/output-window', {operation:'open'});
    remoteMessage('Mac playout window is open.');
  } catch (error) { remoteMessage(error.message); }
}
document.getElementById('remoteOpen').onclick = openOutputScreen;
document.getElementById('controlOpen').onclick = openOutputScreen;
document.getElementById('remoteHandoverOpen').onclick = openOutputScreen;
async function requestMacFullscreen() {
  try {
    remoteMessage('Opening the Mac playout window…');
    const status = await (await fetch('/api/remote-status')).json();
    const result = await remotePost('/api/output-window', {enabled:!status.window?.fullscreen, ...controllerIdentity()});
    remoteMessage(result.fullscreen ? 'Mac playout is fullscreen.' : 'Mac playout is windowed.');
  } catch (error) { remoteMessage(error.message); }
}

async function runMacCommand(command) {
  macPlayoutArmed = true;
  switch (command.action) {
    case 'take': {
      const scene = command.scene;
      if (!scene?.filename || !scene.layout) throw new Error('No preview scene supplied.');
      if (autoRun) stopAutoPerform();
      if (plPlaying) stopPlaylist();
      captionEnabled = scene.captionEnabled;
      showVideo(scene.filename, scene.transition, scene.layout.sourceRange);
      applyLayoutConfiguration(scene.layout);
      applyEffectsFromController(scene.effects);
      setTrailsEnabled(scene.trails.enabled); setTrailAmount(scene.trails.amount);
      setVfxLogo3d({...scene.vfx.logo3d, animationClock: {time: VfxEngine.animationSeconds(scene.vfx.logo3d), startedAt: Date.now(), playing: scene.vfx.logo3d.animationClock?.playing === true}}); setVfxShape(scene.vfx.shape);
      setVfxState(scene.vfx);
      await new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadeddata', seek);
        video.removeEventListener('error', failed);
      };
      const failed = () => { cleanup(); reject(new Error('Video did not load on the Mac.')); };
      const timeout = setTimeout(failed, 10000);
      const seek = () => {
        cleanup();
        const range = playbackBounds();
        video.currentTime = Math.max(range.start, Math.min(scene.time, range.end === null ? scene.time : Math.max(range.start, range.end - .01)));
        video.play().catch(() => {});
        broadcastState({type:'seek', time:video.currentTime});
        broadcastState({type:'play'});
        resolve();
      };
      video.addEventListener('loadeddata', seek, {once:true});
      video.addEventListener('error', failed, {once:true});
      });
      break;
    }
    case 'playlist':
      if (!command.playlist?.entries?.length) throw new Error('Playlist is empty.');
      if (command.motionSource) setVfxState({motion: command.motionSource});
      plPlaylist = command.playlist; plLoopPlaylist = !!command.loop; startPlaylist(); break;
    case 'stop': if (autoRun) stopAutoPerform(); stopPlaylist(); break;
    case 'next': if (plPlaying) plNext(); else throw new Error('No playlist is playing on Mac.'); break;
    case 'auto':
      if (command.settings) applyRemoteAutoSettings(command);
      if (autoRun) stopAutoPerform();
      else { await startAutoPerform(); if (!autoRun) throw new Error(autoUi('autoStatus').textContent); }
      break;
    case 'hold': toggleAutoHold(); break;
    case 'lock': toggleAutoLayoutLock(); break;
    case 'nextBeat': autoNextOnBeat(); break;
    case 'tap': tapAutoTempo(); break;
    case 'resync': resyncAutoBeat(); break;
    case 'autoSettings':
      applyRemoteAutoSettings(command);
      break;
  }
}
function applyRemoteAutoSettings(command) {
  for (const id of ['autoAudioDevice','autoProfile','autoChangeBars','autoVideoPool']) {
    if (command.settings?.[id] !== undefined) {
      autoUi(id).value = command.settings[id];
      autoUi(id).dispatchEvent(new Event('change'));
    }
  }
  if (command.playlist) plPlaylist = command.playlist;
  if (command.textEntries) autoTextEntries = command.textEntries;
  if (command.videoTags) autoVideoTags = command.videoTags;
}
async function reportMacEngine() {
  try {
    const fields = {};
    for (const id of ['autoStatus','autoBpm','autoBeat','autoSection','autoNext']) fields[id] = autoUi(id).textContent;
    const devices = [...autoUi('autoAudioDevice').options].map(option => ({id:option.value,label:option.textContent}));
    await remotePost('/api/remote-status', {role:'host', id:remoteId, lastCommand:hostLastCommand, commandResults:hostCommandResults,
      filename:macPlayoutArmed ? currentFilename : null, playing:!video.paused, playlist:plPlaying, auto:!!autoRun,
      hold:autoHoldVideo, lock:autoLayoutLocked, fields, devices, device:autoUi('autoAudioDevice').value});
    hostClaimed = true;
  } catch (error) { hostClaimed = false; remoteMessage(error.message); }
}
if (isMacEngine) {
  video.muted = true;
  remoteBar.querySelector('.remote-actions').hidden = true;
  const commands = new EventSource('/api/state-stream');
  commands.onopen = () => { reportMacEngine(); };
  commands.onerror = () => { hostClaimed = false; };
  commands.onmessage = event => {
    const command = JSON.parse(event.data);
    cameraMotion.receive(command);
    if (command.type !== 'remoteCommand' || command.hostId !== remoteId || !hostClaimed) return;
    remoteQueue = remoteQueue.then(async () => {
      try {
        const status = await (await fetch('/api/remote-status')).json();
        if ((status.control?.owner || null) !== (command.controllerId || null)) throw new Error('Control changed before this command could run.');
        await runMacCommand(command); await playoutWrites; hostLastCommand = {id:command.id};
      }
      catch (error) { hostLastCommand = {id:command.id, error:error.message}; }
      hostCommandResults.push(hostLastCommand);
      if (hostCommandResults.length > 30) hostCommandResults.shift();
      await reportMacEngine();
    });
  };
  setInterval(reportMacEngine, 2000);
} else {
  // These controls operate the Mac's microphone/USB input, never the iPad microphone.
  toggleAutoPerform = () => sendMacCommand('auto', {
    settings:Object.fromEntries(['autoAudioDevice','autoProfile','autoChangeBars','autoVideoPool'].map(id => [id,autoUi(id).value])),
    playlist:JSON.parse(JSON.stringify(plPlaylist)), textEntries:autoTextEntries, videoTags:autoVideoTags});
  toggleAutoHold = () => sendMacCommand('hold');
  toggleAutoLayoutLock = () => sendMacCommand('lock');
  autoNextOnBeat = () => sendMacCommand('nextBeat');
  tapAutoTempo = () => sendMacCommand('tap');
  resyncAutoBeat = () => sendMacCommand('resync');
  for (const id of ['autoAudioDevice','autoProfile','autoChangeBars','autoVideoPool']) {
    autoUi(id).addEventListener('change', () => sendMacCommand('autoSettings', {
      settings:{[id]:autoUi(id).value}, playlist:id === 'autoVideoPool' ? plPlaylist : undefined}));
  }
  autoUi('autoPerformButton').closest('section').querySelector('strong').textContent = 'Sound to Visuals · Mac audio';
}
async function pollMacStatus() {
  try {
    if (isRemoteController) {
      updateControlOwnership(await remotePost('/api/control-session', {action:'heartbeat', id:remoteId}));
    }
    remoteStatus = await (await fetch('/api/remote-status')).json();
    updateControlOwnership(remoteStatus.control);
    const host = remoteStatus.host, output = remoteStatus.output, windowStatus = remoteStatus.window;
    const full = windowStatus?.connected ? windowStatus.fullscreen : output?.fullscreen;
    document.getElementById('remoteConnection').textContent =
      `Output: ${output?.connected || windowStatus?.connected ? (full ? 'fullscreen' : 'windowed') : 'offline'} · Mac engine: ${host?.connected ? 'connected' : 'offline'}${host?.connected && host.filename ? ' · Live: ' + host.filename : ''}`;
    document.getElementById('remoteConnection').title = document.getElementById('remoteConnection').textContent;
    document.getElementById('remoteFullscreen').textContent = full ? 'Exit Mac fullscreen' : 'Mac fullscreen';
    document.getElementById('fsBtn').textContent = full ? 'Exit Mac fullscreen' : 'Mac fullscreen';
    if (!isMacEngine && host?.connected) {
      for (const [id, value] of Object.entries(host.fields || {})) autoUi(id).textContent = value;
      autoUi('autoPerformButton').textContent = host.auto ? '■ Stop Mac Auto' : '▶ Mac Auto Perform';
      autoUi('autoHoldButton').classList.toggle('active', host.hold);
      autoUi('autoLayoutLockButton').classList.toggle('active', host.lock);
      const select = autoUi('autoAudioDevice');
      if (document.activeElement !== select) {
        select.replaceChildren(...(host.devices || []).map(device => new Option(device.label,device.id)));
        select.value = host.device;
      }
    }
  } catch {
    if (isRemoteController) updateControlOwnership({remote:false});
    document.getElementById('remoteConnection').textContent = 'Connection lost. Preview remains private.';
    document.getElementById('remoteConnection').title = 'Connection lost. Preview remains private.';
  }
}
updateControlOwnership({remote:false});
pollMacStatus();
setInterval(pollMacStatus, 1500);

// Generate fresh LAN links on the Mac; no IP address or hostname is saved.
(() => {
  const trigger = document.getElementById('ipadConnect');
  trigger.hidden = isMacEngine;
  const dialog = document.createElement('dialog');
  dialog.id = 'ipadConnectDialog';
  dialog.className = 'ipad-connect-dialog';
  dialog.setAttribute('aria-labelledby', 'ipadConnectTitle');
  dialog.innerHTML = `<h2 id="ipadConnectTitle">Connect your iPad</h2>
    <p>Connect the iPad to the same network as this Mac, then open the link in Safari.</p>
    <button type="button" id="ipadLinkRefresh">Generate current link</button>
    <div id="ipadLinkNetworks" aria-label="Mac network addresses"></div>
    <label for="ipadConnectionUrl">iPad control link</label>
    <input id="ipadConnectionUrl" type="text" readonly spellcheck="false" autocapitalize="off">
    <div class="ipad-link-actions"><button type="button" id="ipadLinkCopy" disabled>Copy link</button>
    <button type="button" id="ipadLinkOtherUi" hidden>Use original V1</button>
    <button type="button" id="ipadLinkClose">Close</button></div>
    <p id="ipadLinkStatus" role="status" aria-live="polite"></p>
    <p class="ipad-link-hint">Generate a fresh link after changing Wi-Fi. Guest or venue Wi-Fi may block connections between devices even with the correct IP address.</p>`;
  document.body.append(dialog);
  const style = document.createElement('style');
  style.textContent = `.ipad-connect-dialog{width:min(620px,94vw);max-height:90dvh;overflow:auto;margin:auto;padding:24px;border:1px solid #86cbbd;border-radius:12px;background:#182333;color:#edf3f7;font:14px/1.5 system-ui}
    .ipad-connect-dialog::backdrop{background:#000a}.ipad-connect-dialog h2{font-size:20px;margin:0 0 12px}.ipad-connect-dialog p{margin:12px 0}.ipad-connect-dialog label{display:block;margin-top:12px}
    .ipad-connect-dialog button{padding:10px 12px;min-height:44px;border:1px solid #69837d;border-radius:6px;background:#233d35;color:#edf3f7;font:inherit;cursor:pointer}.ipad-connect-dialog button:disabled{opacity:.4}
    .ipad-connect-dialog input{width:100%;padding:12px;margin:8px 0;color:white;background:#101b24;border:1px solid #69837d;border-radius:6px;font:14px/1.5 ui-monospace,monospace}
    .ipad-connect-dialog .ipad-link-actions{display:flex;flex-wrap:wrap;gap:8px}.ipad-connect-dialog .ipad-link-hint{color:#b5c7c0;font-size:12px}
    #ipadLinkNetworks{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}#ipadLinkNetworks button[aria-pressed=true]{border-color:#c1f477;color:#c1f477}`;
  document.head.append(style);
  const field = document.getElementById('ipadConnectionUrl');
  const status = document.getElementById('ipadLinkStatus');
  const copy = document.getElementById('ipadLinkCopy');
  const refresh = document.getElementById('ipadLinkRefresh');
  const networks = document.getElementById('ipadLinkNetworks');
  const otherUi = document.getElementById('ipadLinkOtherUi');
  let active = null, mode = location.pathname.startsWith('/classic') ? 'v1' : 'default';
  let request = 0;
  function showLink() {
    field.value = active?.urls[mode] || active?.urls.default || active?.urls.v1 || '';
    copy.disabled = !field.value;
    otherUi.hidden = !active?.urls.default || !active?.urls.v1;
    otherUi.textContent = mode === 'default' ? 'Use classic interface' : 'Use current interface';
  }
  async function generate() {
    const run = ++request;
    refresh.disabled = true; copy.disabled = true;
    field.value = ''; active = null; networks.replaceChildren(); otherUi.hidden = true;
    status.textContent = 'Finding this Mac’s current network addresses…';
    try {
      const response = await fetch('/api/ipad-links', {cache:'no-store'});
      if (!response.ok) throw new Error('Could not generate a link. Restart the updated server and try again.');
      const result = await response.json();
      if (run !== request) return;
      if (!result.addresses?.length) throw new Error('No usable network address found. Connect this Mac to Wi-Fi or Ethernet, then generate the link again.');
      active = result.addresses[0];
      for (const entry of result.addresses) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `${entry.interface} · ${entry.address}`;
        button.setAttribute('aria-pressed', String(entry === active));
        button.onclick = () => {
          active = entry;
          networks.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          showLink(); status.textContent = 'Link updated for the selected network.';
        };
        networks.append(button);
      }
      showLink();
      status.textContent = result.addresses.length > 1
        ? 'Several network addresses found. Choose the interface connected to the same network as your iPad.'
        : 'Current link ready. Copy it to the iPad and open it in Safari.';
    } catch (error) {
      if (run === request) status.textContent = error.message;
    } finally { if (run === request) refresh.disabled = false; }
  }
  trigger.addEventListener('click', () => { if (!dialog.open) dialog.showModal(); generate(); });
  refresh.addEventListener('click', generate);
  otherUi.addEventListener('click', () => { mode = mode === 'default' ? 'v1' : 'default'; showLink(); });
  field.addEventListener('click', () => field.select());
  copy.addEventListener('click', async () => {
    const url = field.value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copied. Paste it into Safari on the iPad.';
    } catch {
      field.focus(); field.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch {}
      status.textContent = copied ? 'Link copied. Paste it into Safari on the iPad.' : 'Link selected. Use Copy, then paste it into Safari on the iPad.';
    }
  });
  document.getElementById('ipadLinkClose').addEventListener('click', () => dialog.close());
})();
