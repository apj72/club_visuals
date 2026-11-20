/* Contextual help shared by both editors, popup controls and dynamic forms. */
(() => {
  'use strict';
  const controls = 'button,input:not([type=hidden]),select,textarea,summary,a[href],[role=button],[role=option],[role=tab],[role=slider]';
  const fields = {
    hue:'Rotate the video colours around the colour wheel without changing the image geometry.',
    saturate:'Control colour intensity. Zero is greyscale; 100% retains the original saturation.',
    contrast:'Increase or reduce the difference between dark and bright areas.',
    brightness:'Lighten or darken the source video. 100% retains its original brightness.',
    blur:'Soften the video by spreading pixels over the selected blur radius.',
    invert:'Blend towards inverted video colours. 100% fully reverses the colours.',
    sepia:'Blend towards warm brown, old-photo colours.',
    zoom:'Scale the video from 0.25× to 4×. Below 1× exposes black space with a dust-like edge dissolve; above 1× crops into the image. Reset returns to 1×.',
    panx:'Choose the horizontal crop when enlarged, or move the smaller video left/right within the black space. Zero centres it.',
    pany:'Choose the vertical crop when enlarged, or move the smaller video up/down within the black space. Positive values move towards the top; zero centres it.',
    x:'Place the object horizontally: 0 is the left edge, 0.5 the centre, and 1 the right edge.',
    y:'Place the object vertically: 0 is the bottom, 0.5 the centre, and 1 the top.',
    scale:'Change the size of the 3D object. Larger sizes can extend beyond the frame.',
    depth:'Adjust how far the object extends in 3D, from its front face to its back.',
    text:'Set the words or handle rendered by the text effect.',
    font:'Choose the typeface used to build the 3D text.',
    skin:'Choose the surface material and how it reflects the video and lighting.',
    bevel:'Round the edges of the 3D letters. A larger bevel gives a softer edge highlight.',
    roughness:'Spread the reflections across the surface. Low values look polished; high values look softer or brushed.',
    reflection:'Control the brightness of the video reflected in the object.',
    environment:'Control how strongly the video wraps around the reflective surface.',
    exposure:'Adjust the brightness of the rendered 3D object.',
    quality:'Choose rendering detail. Higher quality smooths the edges and uses more graphics processing.',
    rotx:'Tip the object forwards/backwards around its horizontal X axis.',
    roty:'Turn the object left/right around its vertical Y axis.',
    rotz:'Rotate the object in the screen plane around its Z axis.',
    motion:'Set the speed of automatic rotation between the start and end angles. Zero stops this rotation.',
    axis:'Choose which axis the automatic rotation turns around.',
    startangle:'Set the first angle of the automatic rotation sweep, in degrees.',
    endangle:'Set the last angle of the automatic rotation sweep, in degrees.',
    orientation:'Arrange the logo or text horizontally or vertically. Vertical modes stack upright letters; they do not turn the letters sideways.',
    backdrop:'Choose the playing video or black behind a logo-only composition. A separately enabled video-effect layer remains visible.',
    enabled:'Enable this animation. Use Play logo motion to start or pause its movement.',
    path:'Choose the route the logo follows. Custom waypoints let you design your own route.',
    duration:'Set how many seconds one complete movement cycle takes.',
    spanx:'Set the width of the path across the screen.',
    spany:'Set the height of the path across the screen.',
    zoommin:'Set the smallest size multiplier used during the logo animation.',
    zoommax:'Set the largest size multiplier used during the logo animation.',
    turnx:'Add a forward/backward X-axis turn over each animation cycle, in degrees.',
    turny:'Add a left/right Y-axis turn over each animation cycle, in degrees.',
    turnz:'Add an in-plane Z-axis turn over each animation cycle, in degrees.',
    ease:'Choose constant-speed motion or a smoother start and finish between poses.',
    loop:'Repeat the animation cycle, or hold its last pose when the cycle ends.',
    keepinside:'Fit the complete moving logo within the frame. Fly-along deliberately allows close-up cropping.',
    sourcemotion:'Move the hidden video through the reflective environment without moving the logo itself.',
    sourcescale:'Enlarge or shrink the hidden video supplying the logo reflections.',
    sourcetravel:'Set how far the hidden reflection video moves through the environment.',
    preset:'Load a starting look. You can change its appearance, path and animation afterwards.',
    intensity:'Control how strongly the selected video effect changes the image.',
    feedback:'Mix previous video-effect frames into the current frame to create persistence and trails.',
    threshold:'Ignore camera changes below this amount. Increase it to suppress small movements and sensor noise.',
    gain:'Amplify detected camera movement. Higher sensitivity makes smaller movements visible.',
    delay:'Compare the camera with an earlier frame. A longer delay emphasises slower or larger movement.',
    trails:'Keep detected movement visible for longer before it fades.',
    strength:'Control how much the camera movement changes the video.',
    mirror:'Flip the camera movement horizontally for a mirror-like response.',
    compensate:'Reduce changes caused by overall lighting shifts so they are less likely to count as movement.',
    edge:'Control the edge treatment of the mirror sculpture.',
    tilt:'Tilt the mirror sculpture relative to the screen.',
    thickness:'Adjust the visible thickness of the mirror sculpture.',
    spin:'Set the spinning speed of the mirror sculpture.',
  };
  const dynamics = {
    'snake.enabled':'Move individual logo letters forwards/backwards in a travelling depth wave.',
    'snake.speed':'Set how quickly the depth wave travels along the letters.',
    'snake.depth':'Set how far individual letters move towards and away from the viewer.',
    'snake.pulse':'Make the depth wave grow and shrink as it travels.',
    'snake.wavelength':'Set how many waves fit along the logo.',
    'snake.reverse':'Send the letter depth wave in the opposite direction.',
    'fly.enabled':'Fly from a tiny distant logo through a close-up pass along its letters, then completely off-screen.',
    'fly.speed':'Set complete flight passes per second. 0.08 means 12.5 seconds one way, or 25 seconds for a full back-and-forth journey.',
    'fly.distance':'Set the closest viewing distance during the flight. Smaller values give closer, screen-filling views; the distant endpoint stays tiny.',
    'fly.angle':'Look along the logo at an angle so its letters recede into the screen. 45° is the default; 0° restores the straight-on fly-along view.',
    'fly.reverse':'Begin the fly-along from the other end of the logo.',
    'fly.loop':'Travel back and forth repeatedly, or stop at the far end.',
    'fly.mode':'Back and forth retraces the complete flight. One way · repeat starts each pass from the distant tiny logo. One way · once finishes off-screen and stays there.',
  };
  const ids = {
    restartVideoBtn:'Jump to the active cue’s In point, or 0:00 for the full video. A paused video stays paused; a playing video continues. Standalone logo motion keeps its separate clock.',
    trailBtn:'Enable or disable trails left behind by previous video frames.',
    trailSlider:'Set how quickly earlier video frames fade. Lower values leave longer trails.',
    fxPlayBtn:'Start or pause the video in the connected player.',
    fxLoopBtn:'Cycle between once-only playback, a repeating loop and forward/backward bounce.',
    fxMuteBtn:'Mute or unmute the source video audio.',
    playBtn:'In Playlists, play or pause the full composition from the playhead, including timed layouts, effects and logo motion. In other workspaces this controls the source video.',
    plPlayBtn:'In Playlists, play or pause the full composition from the current playhead. Pause keeps the composed frame and position for editing.',
    logoMotionPlayBtn:'Start or pause logo paths, rotation, the letter wave and fly-along without pausing the background video.',
    logoMotionPlay:'Start or pause logo paths, rotation, the letter wave and fly-along without pausing the background video.',
    enableBtn:'Turn the complete VFX composition on or off, including its video-effect and logo layers.',
    videoLayerBtn:'Enable or disable the background video-effect layer while keeping the logo layer available.',
    logoLayerBtn:'Enable or disable the 3D logo/text layer while keeping the background effect available.',
    scene:'Choose the background video effect. The independent logo layer can run over it.',
    vfxPulseBtn:'Trigger a fresh liquid-ripple impulse in the active video effect.',
    fxBtn:'Open colour, brightness, blur and video-trail controls.',
    vfxBtn:'Open video effects, camera motion, 3D objects, reflections and logo animation controls.',
    cameraMotionBtn:'Open camera motion extraction controls to use detected movement in the video effect.',
    mirrorBtn:'Enable or disable the mirror-sculpture video effect.',
    reflectionLogoBtn:'Show the reflective Version1 logo against black, with the playing video visible in its reflections.',
    logo3dBtn:'Enable or disable the Version1 3D logo layer.',
    text3dBtn:'Show a reflective 3D text object in the logo layer.',
    reflectionVideo:'Choose a separate library video for the logo reflections, or use the main playing video.',
    reflectionSpeed:'Set the playback speed of the independent reflection video.',
    reflectionPlay:'Pause or resume the independent reflection video while the background and logo clocks stay separate.',
    reflectionRefresh:'Rescan the library and refresh the available reflection videos.',
    cameraConnect:'Connect or disconnect the selected physical camera. Connecting asks the browser for camera permission.',
    cameraRefresh:'Refresh the list of available camera devices.',
    cameraDevice:'Choose which camera supplies the movement input.',
    cameraMode:'Use movement as a video-filled mask, a glow over the video, or local distortion.',
    cameraUse:'Enable the camera-motion video effect using the current movement settings.',
    cameraReset:'Clear previous comparison frames and trails to begin detecting movement afresh.',
    audioDevice:'Choose the microphone or audio input used to react to music.',
    audioBtn:'Connect or disconnect audio-reactive VFX using the selected audio input.',
    sensitivity:'Set how strongly incoming audio drives the VFX response.',
    captureAction:'Render and save an MP4 using the chosen frame format, start time and duration.',
    captureFormat:'Choose the output aspect ratio and resolution, including 9:16 portrait logo renders.',
    captureRestartLogo:'Start logo motion at the beginning when recording starts, or continue from its current pose.',
    captureStart:'Set the video position where the capture begins, using minutes and seconds.',
    captureDuration:'Set the length of the captured MP4 in seconds.',
    captureTransition:'Choose how the captured sequence changes between shots.',
    captureLibrarySelect:'Choose a previously saved capture to copy into the source video library.',
    captureLibraryAdd:'Add the selected saved capture to the video library so it can be played and used in playlists.',
    captureLibraryRefresh:'Rescan the saved capture folder for new exported MP4s.',
    captureToggle:'Open the capture page to export a social-format video or logo render.',
    logoPortraitRender:'Open Capture with a 9:16 logo-only render on black, ready to save as a source video.',
    fsBtn:'Toggle fullscreen on the Mac output display.',
    previewFullscreenBtn:'Expand this private preview to fullscreen. Press Escape to return.',
    speedDown:'Slow video playback by 0.25×. Logo motion keeps its separate clock.',
    speedUp:'Speed video playback up by 0.25×. Logo motion keeps its separate clock.',
    muteBtn:'Mute or unmute audio from the playing video.',
    captionBtn:'Show or hide the current video caption/creator overlay.',
    viewBtn:'Choose how many copies of the video are arranged in the frame.',
    loopBtn:'Choose once-only playback, a repeating loop, or forward/backward bounce playback.',
    configSlider:'Choose which tiles are mirrored horizontally and vertically.',
    videoPresetName:'Name a reusable layout for this video, including its framing, playback mode and cue range.',
    plSavedLayout:'Load a named layout saved for the selected video, or use the current player settings.',
    plSelect:'Open a saved playlist for editing and private playback.',
    plName:'Name this playlist before saving it.',
    plLoopBtn:'Repeat the complete playlist after its last clip, or stop at the end.',
    recordBtn:'Record the composite playlist output, including effects, logo, framing and captions.',
    timelineZoom:'Change how much time the timeline shows across the screen; this does not resize the video.',
    sbReviewZoom:'Change the timeline scale without changing video framing.',
    playlistPreviewAspect:'Choose the private playlist preview frame shape to check compositions for different displays.',
    timelineBack:'Move the private playlist playhead backwards by one second.',
    timelineForward:'Move the private playlist playhead forwards by one second.',
    insCues:'Edit timed effects and logo overlays for this clip.',
    insRemove:'Remove the selected clip from this playlist.',
    autoPerformButton:'Start or stop automatic video, layout and effect changes driven by musical timing.',
    autoHoldButton:'Keep the current video while Auto Perform continues its other decisions.',
    autoLayoutLockButton:'Keep the current layout while Auto Perform continues its other decisions.',
    autoNextButton:'Queue the next video change for the next musical beat.',
    autoProfile:'Choose how energetic and frequent Auto Perform decisions should be.',
    autoChangeBars:'Choose how many musical bars pass before an automatic change is considered.',
    autoVideoPool:'Choose whether Auto Perform selects videos from the library or the current playlist.',
    autoAudioDevice:'Choose the audio input used to detect beats and tempo.',
    catalogSort:'Set the order of videos wherever the library appears. Newest first puts recently added/edited videos at the top.',
    catalogSearch:'Filter library videos by filename, creator, tags or notes.',
    catalogClear:'Clear the current library search and filters.',
    catalogEditReviewed:'Mark the selected video as reviewed to track your library curation.',
    catalogEditNotes:'Save your own notes about this video.',
    connBtn:'Connect to Instagram so videos can be downloaded into the library.',
    cookieBrowser:'Choose the browser whose Instagram sign-in should be used.',
    cookieProfile:'Choose the browser profile holding your Instagram sign-in, such as Default or Profile 1.',
    connPassword:'Optionally use your Mac login password to unlock browser cookies locally.',
    url:'Paste the Instagram video URL to download into your library.',
    downloadBtn:'Download the supplied Instagram video URL into the configured video folder.',
    reduceTransitionFlashes:'Reduce bright flashes in transitions for a gentler visual change.',
  };
  const choices = {
    single:'Show one video fitted inside the frame.', dual:'Show two mirrored video panels side by side.', triple:'Show three video panels side by side.', quad:'Show four video panels in a 2×2 grid.', six:'Show six video panels in a 3-column × 2-row grid.', octo:'Show eight video panels in a 4×2 grid.',
    horizontal:'Read the logo from left to right.', 'top-bottom':'Stack upright logo letters from top to bottom.', 'bottom-top':'Stack upright logo letters from bottom to top.',
    chrome:'Polished metal with bright video reflections.', mirror:'A highly reflective, mirror-like finish.', brushed:'Softened reflections resembling brushed silver.', gold:'Warm gold-coloured reflective metal.', 'rose-gold':'Pink-tinted reflective metal.', obsidian:'Dark reflective chrome.', pearl:'A pale ceramic-like surface.', iridescent:'A reflective finish with shifting colours.', original:'Use the original logo colours.',
    still:'Keep the logo in place while any enabled zoom or axis turns continue.', bounce:'Move the logo around the frame with bouncing changes of direction.', orbit:'Move the logo around an elliptical route.', figure8:'Move the logo along a figure-of-eight route.', sweep:'Move the logo across the frame.', custom:'Follow your authored position, size and rotation waypoints.',
    'scene-0':'Create ripples that bend the video image.', 'scene-1':'Smear video into persistent streaks.', 'scene-2':'Arrange the video into moving ribbons.', 'scene-4':'Repeat the video into a kaleidoscope tunnel.', 'scene-5':'Break the video into prism-like fragments.', camera:'Extract camera movement to mask, illuminate or distort the video.', logo:'Render the Version1 wordmark as a reflective 3D object.', text:'Render your words as a reflective 3D object.', dj:'Use the selected DJ profile’s branding text or name.',
    'cut':'Switch to the next image immediately.', 'fade-in':'Reveal the incoming video from black.', 'fade-out-in':'Fade the outgoing video to black, then reveal the next video.', 'cross-dissolve':'Blend the outgoing and incoming videos.', 'wipe':'Reveal the next video with a moving edge.', 'zoom-spin':'Turn and scale the image as the next video arrives.', 'whip-pan':'Sweep rapidly sideways into the next video.', 'pixel-scatter':'Break the image into moving pixel pieces before it reforms.', 'rgb-split':'Separate colour channels during the transition.', 'infinite-zoom':'Zoom through the outgoing image into the next video.',
    even:'Use a constant transition rate.', steady:'Use a constant transition rate.', build:'Begin slowly and accelerate.', hit:'Change quickly at first, then settle.', ease:'Ease into and out of the transition.',
    newest:'Sort videos by modification time, most recent first.', manual:'Keep the manually arranged library order.', name:'Sort videos alphabetically by filename.', themes:'Group videos by theme tags.', colours:'Group videos by colour tags.', types:'Group videos by content-type tags.',
  };
  Object.assign(ids, {
    controlReturn:'Return playout control from the remote device to the Mac.', controlClaim:'Claim control of Mac playout from this remote editor.', remoteHandoverReturn:'Return control to the Mac so it can operate playout locally.',
    autoTextListSelect:'Choose a saved collection of 3D branding text for Auto Perform.', autoTextRename:'Rename the current saved branding-text list.', autoTextType:'Choose whether the new branding text is an event name, Instagram handle or web address.', autoTextValue:'Enter branding text to add to the selected Auto Perform list.',
    presetPlaylistSelect:'Choose the playlist to receive this video and saved look.', presetNewPlaylistName:'Name a new playlist to receive this video and look.', presetPlaylistDurationValue:'Set how many seconds or video loops this new playlist clip should last.',
    plDurType:'Measure this clip’s length in seconds or completed video loops.', plDurVal:'Set the number of seconds or video loops for the new clip.', insDurationType:'Measure this playlist clip’s length in seconds or completed video loops.', insDurationValue:'Set the selected clip’s length, in the chosen seconds/loops mode.',
    plLoopMode:'Play once and hold, loop continuously, or bounce forward/backward through the video.',
    insCueIn:'Set the clip’s virtual source start, in seconds. The original video remains intact.', insCueOut:'Set the clip’s virtual source end, in seconds. Leave blank to use the video end.',
    transitionAuditionFrom:'Choose the outgoing video for this private transition audition.', transitionAuditionTo:'Choose the incoming video for this private transition audition.', transitionAuditionDuration:'Set the auditioned transition’s duration in seconds.',
    videoCueSelect:'Load a saved virtual In/Out range for this video, or use the full source.', videoCueSeek:'Scrub the original source to choose accurate In and Out points.', videoCueMarkIn:'Use the current source playhead position as the virtual In point.', videoCueMarkOut:'Use the current source playhead position as the virtual Out point.', videoCueApply:'Apply the entered In/Out range to this player without changing the source file.', videoCuePreview:'Play the chosen In/Out range repeatedly to check its loop.', videoCueFull:'Restore playback of the complete original video.', videoCueName:'Name this virtual source range so you can reuse it in layouts and playlists.', videoCueSave:'Save the entered In/Out points as a new named range for this video.', videoCueUpdate:'Replace the selected saved range with the current name and In/Out points.', videoCueReload:'Reload this video’s named ranges from local metadata.',
    autoMinutes:'Set the target duration, in minutes, for an automatically assembled playlist.',
    catalogManage:'Open tag management to review videos, rename tags and apply bulk classification changes.', catalogThemes:'Filter videos by a theme tag.', catalogColours:'Filter videos by a colour tag.', catalogTypes:'Filter videos by a visual-content tag.', catalogReview:'Filter by review/tagging status to find videos that need curation.', catalogPrevious:'Open the previous video in this review selection.', catalogNext:'Open the next video in this review selection.', catalogSave:'Save the selected video’s tags, review status and notes.', catalogSaveNext:'Save this video’s review changes and open the next video.', catalogReload:'Reload saved classification metadata, discarding unsaved form changes.',
    tmVideosTab:'Browse videos, select groups and review or change their classification tags.', tmTagsTab:'Inspect existing tags and the videos using them, including rename and merge tools.', tmRefresh:'Reload videos and classification metadata in the tag manager.', tmUndo:'Undo the most recent tag-management change.', tmSelectShown:'Select every video currently shown by the tag-manager filters.', tmClearSelection:'Deselect all videos in the tag manager.', tmBulkMode:'Choose whether to add or remove a tag from the selected videos.', tmBulkField:'Choose the theme, colour or visual-type category for the bulk tag change.', tmBulkTag:'Enter the tag to add or remove from the selected videos.', tmBulkApply:'Apply the chosen tag change to every selected video.', tmReviewed:'Mark the selected videos as reviewed.', tmNeedsReview:'Mark the selected videos as needing review.', tmTagCategory:'Filter the tag list by theme, colour or visual-type category.',
    ipadConnectionUrl:'The address to open on an iPad on the same network to reach this editor.', ipadLinkCopy:'Copy the displayed iPad connection address to the clipboard.',
  });
  const labels = [
    [/^time %$/,'Set this waypoint’s time as a percentage of the complete animation cycle.'], [/^x %$/,fields.x], [/^y %$/,fields.y], [/^size %$/,fields.scale], [/^rotate x/,fields.rotx], [/^rotate y/,fields.roty], [/^rotate z/,fields.rotz],
    [/^(model name|brick name|section name|playlist version name|new playlist name)/,'Give this saved structure a name so you can identify and reuse it.'],
    [/^shares$/,'Set this section’s share of the total show time relative to the other sections.'],
    [/^(colour|color)$/,'Choose a colour for this brick in the recipe editor. This does not tint the video.'],
    [/^swap brick$/,'Replace this occurrence with another reusable brick.'],
    [/^(generation mode)/,'Generate a fresh show, replace only its videos, or keep selected sections of the existing edition.'],
    [/^(pacing)$/,'Scale the designed step lengths to make this DJ’s edition quicker or more spacious.'],
    [/^(avoid repeats)/,'Prevent the most recently chosen new video slots from being selected again within this count.'],
    [/^(use reviewed videos only)/,'Exclude videos that have not been marked reviewed in the library.'],
    [/^(prefer videos with similar library tags)/,'Bias video choices towards matching classification tags.'],
    [/^(exclude filename terms)/,'Exclude videos whose filenames contain any of these comma-separated terms.'],
    [/^(repeat every)/,'Set how often recurring DJ branding appears, in seconds. Zero disables recurring branding.'],
    [/^(first clip)/,'Choose the first playlist clip to include in the reusable brick.'], [/^(last clip)/,'Choose the last playlist clip to include in the reusable brick.'],
    [/^(show time)/,'Seek the private generated-show preview to this hours:minutes:seconds position.'],
    [/^(timeline zoom)/,ids.timelineZoom],
    [/^(3d text value|new 3d text)/,'Enter the branding words, Instagram handle or web address to render as 3D text.'],
    [/^(theme|themes|colours|visual type|visual types|add an existing)/,'Filter or classify video content using theme, colour and visual-type tags. These tags guide library search and show generation.'],
    [/^(review status|tag status)/,'Filter videos by whether their classification has been reviewed or still needs attention.'],
    [/^(transition in)/,'Choose how this video is introduced from the previous playlist clip.'],
    [/^(transition speed curve)/,'Choose whether the transition moves evenly, accelerates, hits quickly or eases in/out.'],
    [/^(zoom|video zoom)$/,fields.zoom], [/^(pan x|horizontal position \(x\)|x position)$/,fields.panx], [/^(pan y|vertical position \(y\)|y position)$/,fields.pany],
    [/^(video speed|speed|playback speed)/,'Set how quickly the source video plays. 1× is normal speed.'],
    [/^(layout|view)$/,'Choose the number and arrangement of video panels in the frame.'],
    [/^(mirror pattern|pattern|preset|panel orientation)$/,'Choose the horizontal/vertical mirroring of the video panels.'],
    [/^(at|at · seconds|at \(seconds\))/,'Set when this change begins, in seconds from the start of the clip or step.'],
    [/^(for|for · seconds|show for|step length|clip length|duration value)/,'Set how long this clip, effect or step lasts in seconds, or in loops where selected.'],
    [/^(transition pace|pace)/,'Choose how the transition accelerates and slows down over its duration.'],
    [/^(transition.*seconds|transition duration|incoming.*seconds)/,'Set how long the transition lasts, in seconds.'],
    [/^(incoming transition|transition|effect transition)$/,'Choose the visual change from the previous video into this one.'],
    [/^(effect|video effect)$/,'Choose the video effect or reflective object to apply in this time window.'],
    [/^(text|text \(for text effects\)|dj branding text)/,fields.text],
    [/^(cue in|in time|in ·|in \()/,'Set the virtual start position in the original video, in seconds. The file is not trimmed.'],
    [/^(cue out|out time|out ·|out \()/,'Set the virtual end position in seconds. Leave blank to use the original video end.'],
    [/^(source range|saved range|cue range)/,'Choose a saved virtual In/Out range, or use the full original video.'],
    [/^(playback|playback method)/,'Play once and hold the last frame, loop continuously, or bounce forwards/backwards.'],
    [/^(seconds|loops)$/,'Choose whether clip length is measured in elapsed seconds or repetitions of the video.'],
    [/^(reflection source|reflection video|independent reflection video)/,'Choose a separate video for the object reflections, or follow the playing background video.'],
    [/^(reflection speed)/,'Set the speed of the independent reflection video.'],
    [/^(3d logo overlay)/,'Add a reflective 3D logo or text object over this video effect.'],
    [/^(library order)/,ids.catalogSort],
    [/^(search|find|filter)/,'Narrow the displayed choices using matching filenames, names or tags.'],
    [/^(video slot name)/,'Steps with the same slot name reuse the same chosen video within this brick.'],
    [/^(show model)/,'Choose the reusable show structure and sections to generate.'],
    [/^(dj profile|dj)$/,'Choose the DJ’s video preferences, pacing and branding for the generated edition.'],
    [/^(seed|variation)/,'Choose a repeatable variation of video choices for this show model.'],
    [/^(target|minutes|show length)/,'Set the overall length of the generated show in minutes.'],
    [/^(audio|microphone)/,'Choose the input supplying music for beat detection or audio-reactive effects.'],
  ];
  const actions = [
    [/^\d+\s+assemble$/i,'Arrange reusable bricks into sections and set the overall show structure.'], [/^\d+\s+edit bricks$/i,'Edit reusable steps, layouts, transitions and timed effects.'], [/^\d+\s+dj profiles$/i,'Set DJ-specific video filters, pacing and branding.'], [/^\d+\s+generated show$/i,'Review, edit, save and privately play the generated edition.'],
    [/^edit controls$/i,'Show or hide the private player’s layout, colour, framing and effect controls.'],
    [/^edit(?:\s|$)/i,'Open this item’s editing controls.'],
    [/^download library$/i,'Download the show models, reusable bricks and DJ profiles as a JSON backup.'], [/^import library$/i,'Load a show-library JSON file to import models, bricks and DJ profiles.'], [/^reload saved$/i,'Reload saved models from disk; an unsaved draft is downloaded first.'],
    [/capture playlist clips as brick/i,'Copy a chosen range of playlist clips into a reusable recipe brick.'],
    [/^show now$/i,'Display this branding text immediately using the active 3D text settings.'], [/^rename$/i,'Change the name of the selected saved text list.'],
    [/^show all patterns$/i,'Show the complete mirror-pattern collection, including patterns not marked as favourites.'],
    [/^auto$/i,'Build a playlist automatically using the selected duration and video choices.'],
    [/^stop$/i,'Stop the current private playback sequence.'], [/^next$/i,'Advance to the next clip in the private playback sequence.'],
    [/^previous clip$/i,'Seek the private show preview to the previous clip.'], [/^next clip$/i,'Seek the private show preview to the next clip.'],
    [/record.*this editor|stop recording/i,'Start or stop recording this editor’s composite video output.'],
    [/^close capture panel$/i,'Close the capture controls and return to the private player.'],
    [/reload library|reload reflection choices|refresh videos/i,'Rescan the video folder and refresh library choices while keeping the selected source.'],
    [/^(prepare)$/i,'Open the private player to build and audition a look.'],
    [/^(show builder)$/i,'Build shows from reusable bricks, DJ profiles and generated editions.'],
    [/^(playlists|playlist)$/i,'Arrange saved clips, layouts and timed effects into a playable sequence.'],
    [/^(library)$/i,'Browse, preview, tag and organise the videos in your library.'],
    [/^(auto perform)$/i,ids.autoPerformButton], [/^(capture)$/i,'Export a video or logo render as a reusable MP4 in a chosen social format.'],
    [/^(settings)$/i,'Configure source/capture folders, display preferences and transition behaviour.'],
    [/send to mac|play.*on mac/i,'Send this prepared look or playlist to the Mac playout engine and output display.'],
    [/^stop mac$/i,'Stop playback on the Mac playout engine.'], [/^next on mac$/i,'Advance the Mac playout engine to the next playlist clip.'],
    [/mac fullscreen/i,ids.fsBtn], [/preview fullscreen/i,ids.previewFullscreenBtn], [/open output/i,'Open the clean output display, which follows Mac playout without editor controls.'],
    [/connect ipad/i,'Show connection addresses and instructions for using an iPad as a remote editor.'],
    [/^(play|pause|▶ play.*|❚❚ pause)$/i,'Start or pause playback in this private preview.'],
    [/logo motion/i,ids.logoMotionPlayBtn], [/reflection video/i,ids.reflectionPlay],
    [/^(no loop|once.*)$/i,'Play the video once and hold at its final frame.'], [/^loop$/i,'Repeat the video from its virtual In point after reaching its Out point.'], [/^bounce$/i,'Alternate forward and backward playback through the video.'],
    [/^(single|dual|3x|4x|6x|8x)$/i,'Choose one, two, three, four, six or eight video panels in the frame.'],
    [/^(cc|captions)$/i,ids.captionBtn], [/^(mute|unmute)$/i,ids.muteBtn], [/^(↻|restart|restart video)$/i,ids.restartVideoBtn],
    [/reset controls/i,'Restore single view, 1× speed and zoom, centred X/Y, no loop and the default transition.'],
    [/reset.*pan|centre|center/i,'Return horizontal and vertical position to the centre.'],
    [/^(reset|reset all)$/i,'Restore the default values for the controls in this section.'],
    [/^save layout$/i,'Save the current video’s layout, playback, zoom, position and cue range under this name.'],
    [/add.*playlist|add current view/i,'Copy the current video and look into the selected playlist.'],
    [/script effects|add cue/i,'Create or edit a timed video-effect or logo change within this clip.'],
    [/auto-script/i,'Add an initial set of timed effects to clips that do not already have effect cues.'],
    [/audition|replay/i,'Preview this transition privately using the selected videos and settings.'],
    [/use in slot/i,'Apply the auditioned transition settings to the slot you opened it from.'],
    [/^tune$/i,'Open detailed parameters for the selected transition.'],
    [/^tap tempo$/i,'Tap repeatedly in time with the music to set the beat tempo.'], [/^resync$/i,'Align the musical beat clock with the current beat.'],
    [/^curate videos$/i,'Choose which library videos Auto Perform is allowed to use.'],
    [/^hold video$/i,ids.autoHoldButton], [/^lock layout$/i,ids.autoLayoutLockButton], [/^next on beat$/i,ids.autoNextButton],
    [/^use current time$/i,'Copy the main player’s current position into the capture start time.'],
    [/^save( changes.*| library| models.*)?$/i,'Save the current edits to the local playlist or model library.'],
    [/save as new|save.*playlist/i,'Save a new named copy while retaining the existing version.'],
    [/^generate/i,'Build a private draft from the chosen model, DJ profile and video pool.'],
    [/apply changes/i,'Commit the preview edits to this draft so they are included when you save or play it.'],
    [/reset changes/i,'Discard the unapplied preview edits and return to the draft’s stored values.'],
    [/remove|delete|^del$/i,'Remove this item from the current playlist or recipe. Source video files are retained.'],
    [/duplicate/i,'Create a separate copy of this item to edit.'],
    [/^new|^\+ new/i,'Create a new empty item in this section.'],
    [/^add|^\+ /i,'Add a new item to this section.'],
    [/earlier|move.*up/i,'Move this item earlier in the sequence.'], [/later|move.*down/i,'Move this item later in the sequence.'],
    [/original v1/i,'Open the original interface, using the same video library and saved data.'],
    [/^done$/i,'Close this editor. Use the playlist or model Save action to retain its edits.'],
    [/^(cancel|close)$/i,'Close this panel or cancel the current operation.'],
    [/use this folder/i,'Use the selected folder for this video or capture location.'],
    [/use download folder/i,'Store captures in the configured video download folder.'],
    [/refresh.*password/i,'Refresh Instagram access using the chosen browser profile and optional local password.'],
    [/refresh.*camera/i,ids.cameraRefresh],
  ];
  const clean = value => String(value || '').replace(/[▾▶❚✦✧✦✦]/g,'').replace(/\s+/g,' ').trim();
  function labelFor(node) {
    if (!node) return '';
    if (node.getAttribute('aria-label')) return clean(node.getAttribute('aria-label'));
    const label = node.labels?.[0] || node.closest('label');
    if (label) {
      const copy = label.cloneNode(true);
      copy.querySelectorAll('input,select,textarea,button,output,small').forEach(n=>n.remove());
      return clean(copy.textContent);
    }
    return clean(node.textContent || node.placeholder || node.name || node.id);
  }
  function hint(node) {
    if (!node) return '';
    if (node.dataset.controlHint) return node.dataset.controlHint;
    if (node.tagName === 'OPTION') {
      const select=node.closest('select'), name=labelFor(select).toLowerCase(), value=node.value;
      if (!select) return clean(node.textContent);
      if (select.id==='cookieBrowser') return `Use the Instagram sign-in stored in ${node.textContent.trim()}.`;
      if (select.dataset.dynamics==='fly.mode') return ({bounce:'Fly out past the logo and back along the same path, shrinking to a tiny distant point.',repeat:'Fly in one direction from a distant tiny logo to completely off-screen, then begin another pass.',once:'Fly the complete path once and hold off-screen. Restart logo motion to replay it.'})[value];
      if (select.dataset.motion==='sourceMotion') return ({still:'Keep the reflection video stationary.', 'left-right':'Move the hidden reflection video from left to right.', 'right-left':'Move the hidden reflection video from right to left.', 'back-forth':'Move the hidden reflection video back and forth.'})[value] || fields.sourcemotion;
      if (select.dataset.preview==='aspect') return ({landscape:'Preview in a wide 16:9 frame.',portrait:'Preview in a tall 9:16 frame.',square:'Preview in a square 1:1 frame.'})[value];
      if (window.TRANSITION_CATALOGUE?.[value] && /transition/.test(name)) return window.TRANSITION_CATALOGUE[value].description+'.';
      if (/scene|video effect/.test(name) || select.id==='scene') {
        const scenes=['Liquid ripples bend the playing video.','Smear the video into persistent streaks.','Arrange the video into moving ribbons.','Reflect video in a 3D mirror sculpture.','Repeat the video into a kaleidoscope tunnel.','Break the video into prism fragments.','Render the logo layer alone.','Use detected camera movement to mask, illuminate or distort the video.'];
        if (value==='-1') return 'Show the background video without a video effect.';
        if (scenes[value]) return scenes[value];
      }
      if (/playback/.test(name)) return ['Play once and hold the final frame.','Repeat playback through the selected source range.','Play forwards and backwards through the source range.'][value] || hint(select);
      if (/source|video|background|saved layout|playlist/.test(name) && /\.mp4$/i.test(value)) return `Use “${node.textContent.trim()}” for ${labelFor(select).toLowerCase()}.`;
      if (/effect/.test(name) && value==='mirror') return 'Reflect the playing video in a 3D mirror sculpture.';
      return choices[value] || `${node.textContent.trim()}: ${hint(select)}`;
    }
    if (node.title) return node.title;
    if (ids[node.id]) return ids[node.id];
    if (node.matches('.sb-step')) return 'Open this recipe step to edit its video slot, timing, layout and effects.';
    if (node.matches('.sb-overview button')) return 'Select this show section to add or rearrange its reusable bricks.';
    if (/resetZoom/.test(node.getAttribute('onclick')||'')) return 'Return video zoom to 1× and centre its X/Y position.';
    if (/resetPan/.test(node.getAttribute('onclick')||'')) return 'Centre the video’s X/Y position while keeping its current zoom.';
    if (/^(zoomSlider|plZoom|insZoom)$/.test(node.id)) return fields.zoom;
    if (/^(panXSlider|plPanX|insPanX)$/.test(node.id)) return fields.panx;
    if (/^(panYSlider|plPanY|insPanY)$/.test(node.id)) return fields.pany;
    const timelineColour={insHue:'hue',insSaturate:'saturate',insContrast:'contrast',insBrightness:'brightness',insBlur:'blur',insInvert:'invert',insSepia:'sepia'};
    if(timelineColour[node.id])return fields[timelineColour[node.id]]+' Applies to the selected timed section.';
    if(node.id==='insTrails')return 'Leave fading copies of earlier frames in this timed section, or turn them off.';
    if(node.id==='insTrailAmount')return 'Set how quickly older video frames fade: smaller values leave longer trails.';
    if(node.id==='insMuted')return 'Mute or enable the selected clip’s source audio in the private editor and recordings.';
    if(node.dataset.cueField){const key=node.dataset.cueField.split('.').at(-1);if(fields[key.toLowerCase()])return fields[key.toLowerCase()];}
    if (node.dataset.preset) return `Apply the “${node.dataset.preset}” colour-effect preset. Individual sliders remain editable afterwards.`;
    if (node.dataset.dynamics) return dynamics[node.dataset.dynamics];
    if (node.dataset.look || node.dataset.motion) return fields[(node.dataset.look || node.dataset.motion).toLowerCase()];
    if (node.dataset.reflection) return node.dataset.reflection==='filename' ? ids.reflectionVideo : ids.reflectionSpeed;
    if (node.dataset.preview) return ({open:'Open or close a private effect audition. The main player and Mac output keep their current settings.',source:'Choose the video behind this audition. It starts at the beginning; black is also available.',aspect:'Choose landscape, portrait or square framing for this temporary audition.',play:'Play or pause the audition’s background, reflections and logo motion.',restart:'Return the audition and its logo motion to the beginning.',time:'Scrub the audition to a time in seconds. Its pose and reflection position follow the playhead.'})[node.dataset.preview];
    if (node.dataset.transport) return node.dataset.transport==='restart' ? 'Return logo motion to the start of its cycle.' : ids.logoMotionPlay;
    if (node.dataset.reloadLibrary!==undefined) return actions[0][1];
    if (node.dataset.transition && window.TRANSITION_CATALOGUE?.[node.dataset.transition]) return window.TRANSITION_CATALOGUE[node.dataset.transition].description+'.';
    const property=node.id.replace(/^(logo3d|shape|camera)/,'').toLowerCase();
    if (fields[property]) return fields[property];
    const label=labelFor(node), normal=label.toLowerCase().replace(/\s*[·:]\s*$/,'');
    if (fields[normal] && !node.matches('button,a,[role=button]')) return fields[normal];
    for (const [pattern,text] of labels) if (pattern.test(normal)) return text;
    if (node.matches('button,a,[role=button],[role=tab]')) {
      const transition=Object.values(window.TRANSITION_CATALOGUE||{}).find(t=>t.name.toLowerCase()===normal);
      if(transition)return transition.description+'.';
      for (const [pattern,text] of actions) if (pattern.test(label)) return text;
      if (/pattern \d+/i.test(label)) return 'Apply this arrangement of horizontal and vertical panel reflections.';
    }
    if (node.tagName==='SUMMARY') return `Expand or collapse ${label.toLowerCase()} to inspect and edit its settings.`;
    if (node.matches('select')) return `Choose ${label.toLowerCase() || 'an option'} for this setup.`;
    if (node.type==='checkbox') return `Enable or disable ${label.toLowerCase() || 'this setting'}.`;
    if (node.type==='file') return 'Choose a local image or data file to use in this section.';
    if (node.matches('input,textarea,[role=slider]')) return `Set ${label.toLowerCase() || 'this value'} for this setup.`;
    return label ? `Use “${label}” in this section.` : 'Open or activate this control.';
  }
  function init() {
    const style=document.createElement('style');
    style.textContent='#controlHint{position:fixed;inset:auto;margin:0;box-sizing:border-box;max-width:min(340px,calc(100vw - 20px));padding:10px 12px;border:1px solid #799580;border-radius:7px;background:#10221c;color:#f4fff7;font:12px/1.45 system-ui;box-shadow:0 6px 24px #0008;pointer-events:none;z-index:2147483647;white-space:normal;text-align:left}#controlHint[hidden]{display:none!important}';
    document.head.append(style);
    const tip=document.createElement('div');tip.id='controlHint';tip.role='tooltip';tip.setAttribute('popover','manual');tip.hidden=true;document.body.append(tip);
    let target=null,timer,title='',described='';
    function hide() {
      clearTimeout(timer);
      if(target){if(title)target.title=title;if(described)target.setAttribute('aria-describedby',described);else target.removeAttribute('aria-describedby');}
      try{tip.hidePopover();}catch{}
      tip.hidden=true;target=null;title=described='';
    }
    function show(node) {
      hide();let text=hint(node);if(!text)return;
      const select=node.matches('select') ? node : node.classList.contains('rd-select-trigger') && node.previousElementSibling?.matches('select') ? node.previousElementSibling : null;
      const option=select?.selectedOptions[0];
      if(option){const detail=hint(option);if(detail&&detail!==text)text+=' Selected: '+detail;}
      target=node;title=node.title;described=node.getAttribute('aria-describedby')||'';
      timer=setTimeout(()=>{
        if(!target?.isConnected||!target.getClientRects().length){hide();return;}
        tip.textContent=text;tip.hidden=false;
        try{tip.showPopover();}catch{(document.querySelector('dialog[open]')||document.body).append(tip);}
        if(title)target.removeAttribute('title');
        target.setAttribute('aria-describedby',[described,tip.id].filter(Boolean).join(' '));
        const r=target.getBoundingClientRect(),t=tip.getBoundingClientRect();
        tip.style.left=Math.max(10,Math.min(innerWidth-t.width-10,r.left))+'px';
        tip.style.top=(r.bottom+t.height+12<innerHeight?r.bottom+8:Math.max(8,r.top-t.height-8))+'px';
      },350);
    }
    document.addEventListener('pointerover',e=>{const n=e.target.closest(controls);if(n&&n!==target)show(n);});
    document.addEventListener('pointerout',e=>{if(target&&!target.contains(e.relatedTarget))hide();});
    document.addEventListener('focusin',e=>{const n=e.target.closest(controls);if(n)show(n);});
    document.addEventListener('focusout',hide);
    document.addEventListener('pointerdown',hide);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
    document.addEventListener('scroll',()=>{if(!tip.hidden)hide();},true);
    document.addEventListener('fullscreenchange',hide);
    window.addEventListener('blur',hide);
    // Native option menus use their own surface; titles provide the same help
    // there, and the redesigned menu copies each option's contextual description.
    function options(root) { for(const n of root.querySelectorAll?.('option')||[])if(n.isConnected&&!n.title)n.title=hint(n); }
    options(document);
    new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&n.isConnected){if(n.tagName==='OPTION'&&!n.title)n.title=hint(n);options(n);}}).observe(document.body,{childList:true,subtree:true});
    window.ControlHints={hint,hide};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
