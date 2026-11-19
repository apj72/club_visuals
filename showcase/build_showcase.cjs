/* A directed edition plus reusable recipe, built only from local app capabilities. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../ui-redesign/show-models.js');
const sandbox=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../transition_engine.js'),'utf8'),sandbox);
const catalogue=sandbox.window.TRANSITION_CATALOGUE;
const root=path.resolve(__dirname,'..'),work=path.join(root,'.runtime/showcase-work');
const media=JSON.parse(fs.readFileSync(path.join(__dirname,'source-media.json'),'utf8')),byId=Object.fromEntries(media.map(m=>[m.index,m]));
const assets={colour:'version1_showcase_colour_and_trails.mp4',motion:'version1_showcase_recorded_motion.mp4',ripple:'version1_showcase_ripple_study.mp4',black:'version1_showcase_black_stage.mp4',bounce:'version1_showcase_bounce_source.mp4'};
const file=id=>typeof id==='number'?byId[id].filename:assets[id]||id;
const base={version:1,bricks:[],models:[],profiles:[]};
const chapters=[];let shotNumber=0;
const transition=(type='cross-dissolve',duration=1.5,pace='ease')=>({type,duration,pace,seed:7000+shotNumber,params:{},reduceFlashes:true});
const logo=(skin='chrome',extra={})=>({effect:'logo',backdrop:'black',skin,quality:'balanced',x:.5,y:.5,scale:.4,depth:.35,rotX:0,rotY:-18,rotZ:0,motion:.14,axis:'y',startAngle:-25,endAngle:25,bevel:.035,roughness:.09,reflection:1.15,environment:1,exposure:1,...extra});
const text=(value,extra={})=>logo('chrome',{effect:'text',text:value,font:'bungee',scale:.3,motion:0,...extra});
const fx=(at,seconds,effect,extra={})=>({at,seconds,effect,...extra});
const objectFx=(at,seconds,object)=>fx(at,seconds,object.effect,object);
const overlay=(at,seconds,effect,object,extra={})=>fx(at,seconds,effect,{logoLayer:object,...extra});
const reflection=(id,speed=1)=>({filename:file(id),speed});
const layout=(at,view,preset=1,zoom=1,panX=0,panY=0)=>({at,view,preset,zoom,panX,panY});
function chapter(id,name,description,seconds,colour){const c={id:'showcase-'+id,name,description,seconds,colour,shots:[]};chapters.push(c);return c;}
function shot(c,name,id,seconds,view='single',preset=1,extra={}){
  shotNumber++;const s={...C.step(`${String(shotNumber).padStart(2,'0')} · ${name}`,seconds,view,preset),transition:transition(),...extra};
  c.shots.push({name,filename:file(id),step:s});return s;
}
const a=chapter('signal','I · A signal in the dark','A single light becomes an identity. Quiet, spacious and unmistakably deliberate.',64,'blue');
shot(a,'A single light',40,32,'single',1,{zoom:.48,speed:.75,transition:transition('fade-in',3),layoutCues:[layout(12,'single',1,.7,-.25,.1),layout(24,'triple',7,1)],effects:[objectFx(0,8,text('SIGNAL',{reflectionSource:reflection(40),scale:.38,roughness:.06}))]});
shot(a,'The first constellation',11,32,'single',1,{zoom:.65,speed:.75,sourceRange:{start:1,end:14.5},transition:transition('cross-dissolve',2.5),layoutCues:[layout(16,'dual',7,1)],effects:[fx(12,16,'scene-2',{intensity:.38,feedback:.15})]});
const b=chapter('refraction','II · One becomes many','The same signal unfolds through every layout; symmetry gradually fills the room.',96,'sage');
shot(b,'Three perspectives',14,16,'triple',3,{transition:transition('hexagonal-mosaic',1.4),layoutCues:[layout(8,'triple',7,1.25,.2,0)]});
shot(b,'A mirrored conversation',16,16,'dual',21,{transition:transition('geometric-shatter',1.3),effects:[fx(4,12,'scene-5',{intensity:.4,feedback:.1})]});
shot(b,'Four corners',6,16,'quad',15,{transition:transition('cube-rotation',1.2),layoutCues:[layout(8,'quad',19,.8,-.2,.2)]});
shot(b,'Six windows',13,16,'six',27,{transition:transition('radial-slice',1.2),layoutCues:[layout(8,'six',31,1.15,.1,0)]});
shot(b,'The room opens',24,32,'octo',27,{transition:transition('kaleidoscope-morph',2),layoutCues:[layout(8,'octo',31,1.2),layout(16,'six',7,1),layout(24,'octo',27,1.35)],effects:[fx(8,20,'scene-4',{intensity:.48,feedback:.18})]});
const c=chapter('matter','III · Light becomes matter','Ripples, time reversal and colour turn patterns into something tactile.',96,'purple');
shot(c,'A surface remembers', 'ripple',32,'triple',7,{speed:.5,transition:transition('fluid-ripple',2.2),effects:[objectFx(0,6,text('MATTER',{scale:.3,reflectionSource:reflection(17),skin:'pearl'}))]});
shot(c,'Time folds back','bounce',32,'single',1,{loopMode:2,speed:1,sourceRange:{start:.8,end:2.8},zoom:.65,transition:transition('liquid-chrome',2.5),effects:[fx(12,16,'mirror',{text:'FORM',scale:.55,depth:.65,spin:.18,edge:.6})]});
shot(c,'Colour acquires a memory','colour',32,'single',1,{transition:transition('ink-in-water',2),effects:[]});
const d=chapter('identity','IV · The identity awakens','The film moves inside the Version1 mark. Materials, choreography, depth and flight become the main characters.',128,'sage');
shot(d,'The material learns to shine',24,32,'single',1,{transition:transition('smoke-dissolve',2),effects:['chrome','brushed','gold','original'].map((skin,i)=>objectFx(i*8,8,logo(skin,{motion:.2,scale:.46}))) });
const paths=['bounce','orbit','figure8','custom'],finishes=['mirror','rose-gold','pearl','iridescent'];
shot(d,'The mark leaves its frame',5,32,'single',1,{transition:transition('light-leak',1.8),effects:paths.map((p,i)=>overlay(i*8,8,'video',logo(finishes[i],{backdrop:'video',scale:.22,motion:0,reflectionSource:reflection(17,.75),animation:{enabled:true,path:p,duration:8,loop:true,spanX:.7,spanY:.55,zoomMin:.8,zoomMax:1.2,turnX:45,turnY:360,turnZ:30,keepInside:true,points:[{at:0,x:.22,y:.35,scale:.18,rotX:0,rotY:-25,rotZ:-12},{at:.5,x:.78,y:.7,scale:.3,rotX:35,rotY:25,rotZ:15},{at:1,x:.22,y:.35,scale:.18,rotX:0,rotY:-25,rotZ:-12}]}})))});
shot(d,'The letters breathe',23,32,'triple',7,{transition:transition('mandala-rotation',1.8),effects:[overlay(0,16,'scene-4',logo('obsidian',{scale:.35,motion:0,reflection:1.7,exposure:1.15,reflectionSource:reflection(14),snake:{enabled:true,speed:.25,depth:.55,pulse:.5,wavelength:1.5},animation:{enabled:true,path:'still',duration:16,zoomMin:.85,zoomMax:1.15,keepInside:true}}),{intensity:.6,feedback:.18}),overlay(16,16,'video',logo('chrome',{scale:.4,motion:0,snake:{enabled:true,speed:.25,depth:.6,pulse:.55,wavelength:1.5,reverse:true},reflectionSource:reflection(42)}))]});
shot(d,'Into the wordmark',17,32,'single',1,{transition:transition('dimensional-portal',2),effects:[objectFx(0,32,logo('chrome',{motion:0,quality:'high',reflectionSource:reflection(42),fly:{enabled:true,speed:1/16,distance:.65,angle:45,mode:'bounce'}}))]});
const e=chapter('human','V · The human signal','An apparently synthetic world reveals its human input. Movement becomes the instrument.',96,'blue');
shot(e,'A human in the circuit',38,32,'triple',7,{transition:transition('holographic-breakdown',1.8),effects:[fx(8,12,'mirror',{image:'/assets/version1-logo.png',scale:.5,depth:.75,spin:.15,edge:.75}),fx(24,8,'scene-5',{intensity:.35,feedback:.12})]});
shot(e,'Movement becomes light','motion',32,'single',1,{transition:transition('spectral-frequency-shift',1.6),effects:[objectFx(0,5,text('MOVE',{scale:.32,reflectionSource:reflection(24)})),overlay(10,10,'video',logo('chrome',{backdrop:'video',scale:.24,x:.72,y:.65,reflectionSource:reflection(17),animation:{enabled:true,path:'orbit',duration:10,spanX:.3,spanY:.3,keepInside:true}})),overlay(20,12,'video',text('YOU ARE THE SIGNAL',{font:'modern',scale:.23,backdrop:'video',reflectionSource:reflection(24),animation:{enabled:true,path:'still',duration:12,keepInside:true}}))]});
shot(e,'Made here, played here',42,32,'triple',7,{speed:.75,transition:transition('neural-network-morph',1.8),layoutCues:[layout(16,'dual',3,1),layout(24,'triple',7,.85)]});
const f=chapter('singularity','VI · The singularity','All the languages combine: the fastest, richest and most layered passage of the show.',144,'coral');
shot(f,'Ignition',25,16,'six',27,{transition:transition('bass-impact-distortion',.8,'accelerate'),effects:[overlay(0,16,'scene-4',logo('gold',{scale:.35,motion:0,snake:{enabled:true,speed:.5,depth:.55,pulse:.6},reflectionSource:reflection(17)}),{intensity:.75,feedback:.24})]});
shot(f,'A forward leap',15,16,'six',23,{transition:transition('laser-sweep',.8,'accelerate'),effects:[objectFx(0,16,logo('chrome',{motion:0,reflectionSource:reflection(24),fly:{enabled:true,speed:1/16,distance:.6,angle:45,mode:'once'}}))]});
shot(f,'Eightfold',13,16,'octo',31,{transition:transition('quantum-tiles',.9),layoutCues:[layout(4,'octo',27,1.15),layout(8,'six',31,1.2),layout(12,'octo',7,1)],effects:[fx(0,16,'scene-5',{intensity:.65,feedback:.18})]});
shot(f,'Ribbons of light',8,16,'six',27,{transition:transition('electric-arc',.9),effects:[overlay(0,16,'scene-2',text('VERSION1',{scale:.25,skin:'iridescent',backdrop:'video',reflectionSource:reflection(17)}),{intensity:.85,feedback:.28})]});
shot(f,'A beautiful fracture',16,16,'octo',27,{transition:transition('reality-fracture',.9),effects:[fx(0,16,'scene-1',{intensity:.8,feedback:.8})]});
shot(f,'Bodies of light',12,16,'dual',7,{transition:transition('energy-burst',.9),effects:[overlay(0,16,'scene-4',logo('rose-gold',{scale:.3,motion:.25,reflectionSource:reflection(24),snake:{enabled:true,speed:.4,depth:.4,pulse:.65}}),{intensity:.7,feedback:.22})]});
shot(f,'The infinite room',24,16,'single',1,{transition:transition('infinite-zoom',1),effects:[fx(0,16,'scene-4',{intensity:.85,feedback:.3})]});
shot(f,'A second gravity',40,16,'octo',27,{transition:transition('gravity-well',1.2),effects:[overlay(0,16,'scene-5',logo('chrome',{scale:.24,motion:0,reflectionSource:reflection(14),animation:{enabled:true,path:'orbit',duration:8,spanX:.6,spanY:.5,turnY:360,keepInside:true},snake:{enabled:true,speed:.5,depth:.65,pulse:.7}}),{intensity:.65,feedback:.2})]});
shot(f,'The mark breaks free',23,16,'triple',7,{transition:transition('chromatic-implosion',1.2),effects:[objectFx(0,16,logo('rose-gold',{motion:0,reflectionSource:reflection(17),animation:{enabled:true,path:'still',duration:8,sourceMotion:'left-right',sourceScale:1,sourceTravel:1.5,keepInside:true},fly:{enabled:true,speed:.125,distance:.7,angle:45,mode:'repeat'}}))]});
const g=chapter('home','VII · Return to the source','Space returns. The mark stands upright, becomes familiar, and finally disappears into silence.',96,'purple');
shot(g,'A corridor back to stillness',30,32,'quad',15,{speed:.5,transition:transition('fade-out',3),layoutCues:[layout(8,'triple',7,.8),layout(16,'single',1,.48,.2,0)],effects:[fx(0,16,'scene-2',{intensity:.25,feedback:.1}),objectFx(16,16,logo('pearl',{orientation:'top-bottom',motion:0,scale:.3,reflectionSource:reflection(40),animation:{enabled:true,path:'still',duration:16,zoomMin:.8,zoomMax:1,keepInside:true}}))]});
shot(g,'The identity comes home',41,32,'triple',7,{speed:.5,transition:transition('cross-dissolve',3),layoutCues:[layout(16,'single',1,.7)],effects:[objectFx(0,6,text('HOME',{font:'serif',scale:.35,skin:'pearl',reflectionSource:reflection(24)}))]});
shot(g,'Signal becomes silence','black',32,'single',1,{loopMode:0,transition:transition('cross-dissolve',2.5),effects:[objectFx(0,8,text('VERSION1',{scale:.4,reflectionSource:reflection(40)})),objectFx(8,8,text('FROM SIGNAL TO SPECTACLE',{font:'modern',scale:.2,reflectionSource:reflection(14),animation:{enabled:true,path:'still',duration:8,keepInside:true}})),objectFx(16,16,logo('chrome',{motion:0,reflectionSource:reflection(24),fly:{enabled:true,speed:1/12,distance:.65,angle:45,mode:'once'}}))]});
const bindings={};
for(const ch of chapters){base.bricks.push({id:ch.id,name:ch.name,colour:ch.colour,steps:ch.shots.map(s=>s.step)});for(const s of ch.shots)bindings[`${ch.id}:${s.step.slot}`]=s.filename;}
const model={id:'showcase-signal-to-spectacle-v1',name:'VERSION1 · From Signal to Spectacle · 12 min',minutes:12,sections:chapters.map(ch=>({id:ch.id,name:ch.name,weight:ch.seconds/8,bricks:[ch.id]}))};
const profile={id:'showcase-directed-v1',name:'VERSION1 · Directed showcase',pace:1,avoidRepeat:0,themes:[],colours:[],types:[],exclude:[],reviewedOnly:false,similar:false,branding:{text:'',every:0,seconds:8}};
base.models=[model];base.profiles=[profile];
const pool=[...new Set([...media.map(m=>m.filename),...Object.values(assets)])].map(filename=>({filename}));
const show=C.generate(base,model.id,profile.id,pool,{seed:'SIGNAL-2026',minutes:12,bindings,transitionIds:Object.keys(catalogue),name:model.name});
let entryIndex=0;const shotList=[];
for(const chapter of chapters)for(const directed of chapter.shots){const entry=show.entries[entryIndex];if(directed.step.sourceRange)entry.sourceRange=directed.step.sourceRange;entry.showcase={title:directed.name,chapter:chapter.name};shotList.push({index:entryIndex+1,chapter:chapter.name,title:directed.name,filename:directed.filename,seconds:entry.duration.value,view:entry.view,transition:entry.transition.type});entryIndex++;}
show.showcase={id:model.id,edition:'Directed offline edition',seconds:720,captionEnabled:false,inputNotes:'Recorded movement study uses existing footage processed through the actual movement extractor; connect physical inputs for the live encore.',chapters:chapters.map((ch,i)=>({name:ch.name,description:ch.description,start:show.generation.sections[i].start,end:show.generation.sections[i].end}))};
const makeEntry=(video,seconds,effects=[],extra={})=>({video:file(video),view:'single',preset:1,loopMode:1,speed:1,zoom:1,panX:0,panY:0,duration:{type:'seconds',value:seconds},transition:transition(),cues:[{at:0,effect:'off'},...effects],...extra});
const atlas={name:'VERSION1 · Transition Atlas · all 61 effects',entries:[makeEntry('black',8,[{at:0,...text('TRANSITION ATLAS',{reflectionSource:reflection(24),scale:.3})}])],showcase:{id:'showcase-transition-atlas-v1',note:'Every native transition. Reduced-flash preference is retained.'}};
Object.entries(catalogue).forEach(([type,definition],i)=>atlas.entries.push(makeEntry([13,17,24,26,32,38][i%6],4,[],{transition:transition(type,1.4,'ease'),showcase:{title:definition.name,category:definition.category}})));
atlas.entries.push(makeEntry('black',4,[],{loopMode:0,transition:transition('fade-out',2)}));
const live={name:'VERSION1 · Live Input Encore · connect camera first',entries:[
 makeEntry(24,32,[{at:0,effect:'camera',intensity:1,feedback:0,cameraMotion:{mode:'video',threshold:.07,gain:5,delay:.18,trails:.5,strength:1.1},logoLayer:logo('chrome',{scale:.3,backdrop:'video',reflectionSource:reflection(17),snake:{enabled:true,speed:.3,depth:.4}})}]),
 makeEntry(13,32,[{at:0,effect:'camera',intensity:1,cameraMotion:{mode:'glow',threshold:.08,gain:4,delay:.2,trails:.8,strength:1},logoLayer:text('MOVE THE LIGHT',{font:'modern',scale:.23,backdrop:'video',reflectionSource:reflection(24)})}]),
 makeEntry(23,32,[{at:0,effect:'camera',intensity:.9,cameraMotion:{mode:'distort',threshold:.08,gain:4,delay:.15,trails:.3,strength:1.2},logoLayer:logo('gold',{scale:.3,backdrop:'video',reflectionSource:reflection(17),animation:{enabled:true,path:'orbit',duration:16,spanX:.5,spanY:.4,keepInside:true}})}])],showcase:{id:'showcase-live-encore-v1',requires:['An explicitly connected camera','External music input for the following Auto Perform handoff'],note:'After this 96-second camera sequence, follow the running sheet for a 64-second Mac Auto Perform finale.'}};
const trailerIndices=[0,6,9,10,11,13,15,17,28],trailerDurations=[8,8,8,8,8,12,8,8,16];
const trailer={name:'VERSION1 · Signal to Spectacle · 84-second trailer',entries:trailerIndices.map((id,i)=>{
 const entry=C.clone(show.entries[id]);entry.duration.value=trailerDurations[i];entry.layoutCues=(entry.layoutCues||[]).filter(c=>c.at<entry.duration.value);entry.cues=entry.cues.filter(c=>c.at<entry.duration.value);
 if(id===13)entry.cues=[{at:0,...logo('chrome',{motion:0,reflectionSource:reflection(42),fly:{enabled:true,speed:1/12,distance:.65,angle:45,mode:'once'}})}];
 if(id===28)entry.cues=[{at:0,...text('VERSION1',{scale:.38,reflectionSource:reflection(24)})},{at:6,...logo('chrome',{motion:0,reflectionSource:reflection(24),fly:{enabled:true,speed:1/8,distance:.65,angle:45,mode:'once'}})}];
 entry.transition=transition(i===0?'fade-in':entry.transition.type,Math.min(1.1,entry.duration.value));return entry;
}),showcase:{id:'showcase-trailer-v1',note:'A fast review reel; the 12-minute directed edition has the complete journey.'}};
trailer.name=`VERSION1 · Signal to Spectacle · ${trailer.entries.reduce((s,e)=>s+e.duration.value,0)}-second trailer`;
const outputs={
 'version1-showcase-signal-to-spectacle-12min':show,
 'version1-showcase-transition-atlas':atlas,
 'version1-showcase-live-input-encore':live,
 'version1-showcase-trailer':trailer,
};
for(const [slug,data] of Object.entries(outputs))fs.writeFileSync(path.join(__dirname,slug+'.json'),JSON.stringify(data,null,2));
fs.writeFileSync(path.join(__dirname,'show-library-additions.json'),JSON.stringify(base,null,2));
fs.writeFileSync(path.join(__dirname,'base-library.json'),JSON.stringify(C.defaults(),null,2));
fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify({title:'From Signal to Spectacle',date:'2026-11-19',seconds:720,modelId:model.id,profileId:profile.id,bindings,chapters:show.showcase.chapters,shots:shotList,playlists:Object.fromEntries(Object.entries(outputs).map(([slug,p])=>[slug,{name:p.name,seconds:p.entries.reduce((s,e)=>s+e.duration.value,0),clips:p.entries.length}])),assets,transitionCount:Object.keys(catalogue).length},null,2));
console.log(JSON.stringify({mainSeconds:show.entries.reduce((s,e)=>s+e.duration.value,0),shots:show.entries.length,chapters:chapters.length,atlasTransitions:Object.keys(catalogue).length,trailerSeconds:trailer.entries.reduce((s,e)=>s+e.duration.value,0),warnings:show.generation.warnings}));
