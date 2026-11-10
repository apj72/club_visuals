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
remoteBar.innerHTML = `<strong>${isMacEngine ? 'Mac playout engine' : 'PRIVATE PREVIEW'}</strong>
  <span>${isMacEngine ? 'Keep this engine open. Audio inputs belong to this Mac.' : 'Audition and edit here. Changes stay private until you send them.'}</span>
  <div class="remote-actions">
  <button id="remoteTake">Send to Mac ▶</button><button id="remotePlaylist">Play this playlist on Mac</button>
  <button id="remoteStop">Stop Mac</button><button id="remoteNext">Next on Mac</button>
  <button id="remoteFullscreen">Mac fullscreen</button>
  <button id="remoteOpen">Open output screen</button></div>
  <div class="control-banner" id="controlBanner" hidden role="status">
    <strong id="controlNotice"></strong>
    <button id="controlReturn" hidden>Return control to Mac</button>
    <button id="controlClaim" hidden>Take remote control</button>
    <button id="controlOpen" hidden>Open output screen</button>
  </div>
  <p id="remoteConnection" role="status">Connecting to Mac…</p>
  <p id="remoteMessage" role="status"></p>`;
document.body.prepend(remoteBar);
const macEditor = document.createElement('div');
macEditor.id = 'macEditorControls';
for (const element of [...document.body.children]) {
  if (element !== remoteBar && !['SCRIPT','STYLE','LINK'].includes(element.tagName)) macEditor.append(element);
}
document.body.append(macEditor);
const remoteStyle = document.createElement('style');
remoteStyle.textContent = `.remote-bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:100;margin:12px;padding:14px;border:2px solid #56d6bd;border-radius:10px;background:#182333;color:white;font:14px system-ui;box-shadow:0 6px 18px #0005}
.remote-bar strong{display:block;color:#56d6bd;margin-bottom:6px}.remote-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.remote-actions[hidden]{display:none}.remote-actions button,.remote-actions a{padding:12px;min-height:44px;background:#29354a;color:white;border:1px solid #73849d;border-radius:6px;text-decoration:none}
#remoteTake{background:#16755f}#remoteMessage{color:#ffda87}.remote-bar p{margin-top:6px}
.control-banner{padding:12px;background:#283a4b;border-radius:6px}.control-banner[hidden]{display:none}.control-banner button{padding:12px;min-height:44px;margin:4px 8px 0 0;border-radius:6px;border:1px solid #86cbbd;background:#203b36;color:white}
#macEditorControls.remote-locked{opacity:.35;filter:grayscale(1);pointer-events:none}.remote-actions button:disabled{opacity:.35;cursor:not-allowed}
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
  remoteBar.querySelectorAll('.remote-actions button:not(#remoteOpen)').forEach(button => {
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
  if (macControlsLocked && !remoteBar.contains(event.target) && !event.metaKey && !event.ctrlKey) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);
document.getElementById('controlReturn').onclick = async () => {
  try {
    updateControlOwnership(await remotePost('/api/control-session', {action:'release'}));
    remoteMessage('Control returned to this Mac.');
  } catch (error) { remoteMessage(error.message); }
};
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
    captionEnabled, time:video.ended ? 0 : video.currentTime || 0};
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
  sendMacCommand('playlist', {playlist:JSON.parse(JSON.stringify(plPlaylist)), loop:plLoopPlaylist});
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
      showVideo(scene.filename, scene.transition);
      applyLayoutConfiguration(scene.layout);
      applyEffectsFromController(scene.effects);
      setTrailsEnabled(scene.trails.enabled); setTrailAmount(scene.trails.amount);
      setVfxLogo3d(scene.vfx.logo3d); setVfxShape(scene.vfx.shape);
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
        video.currentTime = Math.min(scene.time, Number.isFinite(video.duration) ? Math.max(0, video.duration - .01) : scene.time);
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
  }
}
updateControlOwnership({remote:false});
pollMacStatus();
setInterval(pollMacStatus, 1500);
