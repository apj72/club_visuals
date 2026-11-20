# Camera motion extraction

Open the Mac editor at **http://localhost:8008/redesign**. Choose a library video,
then **Prepare → Colour, VFX & 3D text → Camera motion…**. In the VFX window,
choose a camera and press **Connect camera**. Allow browser camera permission.
No microphone is requested. Camera access starts only when you press Connect.
The original interface offers the same Camera motion button and VFX controls.

Choose a **Motion look**:

- **Video-filled movement on black:** changing camera pixels reveal the playing
  library video; still areas remain black.
- **Motion glow over video:** movement paints a green/cyan glow on the video.
- **Motion-driven distortion:** movement locally bends the playing image.

The monitor shows the extracted movement, rather than the camera picture.
The camera effect can run behind the independent **3D logo** layer. Use the video
effect and logo switches separately; see [layering and logo animation](vfx-layering.md).
Use a stationary camera facing the dance floor or performer. Frame differencing
detects changing pixels and moving edges; it does not segment or track complete
people. A stationary person fades from view. Moving the camera moves the entire
scene, which can itself become an effect.

**Noise threshold** rejects small camera changes. **Movement sensitivity** amplifies
the remaining changes. **Frame comparison delay** compares with a frame 50 ms to
2 seconds earlier; longer delays reveal slower movement. **Motion trails** lets
movement fade behind the subject. **Effect strength** changes the visual impact.
**Mirror camera movement** changes left/right orientation. **Suppress uniform
lighting changes** removes the median colour shift shared across the image,
helping reject automatic exposure changes. **Reset motion history** clears trails
and starts a fresh comparison without disconnecting the camera.

**Turn VFX off** returns to the normal video while leaving the camera connected.
**Use camera effect** returns to its motion look. **Disconnect camera** releases the
camera and turns off the effect if it is the active scene. Closing or refreshing
the capturing editor also releases its camera. Permission denial, missing/busy
devices and insecure addresses show a message without stopping library playback.

The camera belongs to the browser/computer where Connect was pressed. On a Mac,
use localhost or HTTPS. An ordinary `http://<Mac-IP>` iPad control link cannot ask
for camera access; connect from the Mac's localhost editor instead. USB cameras
and capture devices exposed by the browser appear in **Camera input**. Use
**Refresh cameras** after connecting a device. Hardware-specific drivers remain
the responsibility of the camera/capture-device setup.

Your preview stays private until **Send to Mac**. A take carries the selected
camera-source identity to the Mac engine and clean output. Keep the capturing
editor open while performing: it continuously sends a small movement mask, not
camera photographs, through the local app server. Sources are scoped so another
editor's camera cannot replace the selected input. Lost/disconnected masks expire
instead of leaving a frozen silhouette. These transient masks are not written to
metadata or retained in reconnect snapshots. The browser can throttle background
tabs; keep the camera editor visible for the smoothest live response.

Record through **Capture** or the playlist recording controls to keep the rendered
motion effect. Playlists saved with **Add current view** and Show Builder bricks can retain a
camera effect cue and its settings. Camera permission and frames are not saved;
connect a camera again before using the saved look. A playlist sent to Mac carries
the camera source selected in its sending editor.

The reference [Motion-Extraction project](https://github.com/jacobpclouse/Motion-Extraction)
demonstrates delayed-frame comparison for saved videos. This implementation uses
its own browser frame differencing, noise rejection, lighting compensation and
WebGL compositing, with no OpenCV installation required.

Developer checks:

```sh
node --test test_camera_motion.cjs
python3 ui-redesign/check_camera_motion.py
```

Browser checks use simulated cameras and isolated generated media. A physical
camera, venue lighting and sustained live performance still need a rehearsal.
