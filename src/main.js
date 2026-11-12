import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {createBoy} from './character.js';
import {createWorld} from './world.js';
import {createWaterEffects} from './water.js';
import {findClimbTarget,createClimb,sampleClimb,shouldStartClimb} from './climb.js';
import {MOVEMENT,movementVelocity,preparationX,landingDistance,groundStepY,crateSideContact} from './movement.js';
import {createOpening} from './opening.js';
import {LEVEL} from './level.js';
import {createBridge} from './bridge.js';
import {createLadder,canMountLadder} from './ladder.js';
import {createSlip} from './slip.js';
import {createDustEffects} from './dust.js';
import {createSession,createSaveSnapshot} from './session.js';
import {createTutorials} from './tutorial.js';
import {createStairwell,STAIRWELL} from './stairwell.js';
import {createStairwellWorld} from './stairwell-world.js';
import {createStreet,STREET} from './street.js';
import {createStreetWorld} from './street-world.js';
import {createPlaygroundWorld} from './playground-world.js';
import {createHome,HOME} from './home.js';
import {createHomeWorld} from './home-world.js';

const $=s=>document.querySelector(s);
const canvas=$('#scene'),intro=$('#intro'),message=$('#message'),ending=$('#ending');
const settingsPanel=$('#settings'),pauseMenu=$('#pause-menu'),pauseButton=$('#pause-button');
const session=createSession();
const tutorials=createTutorials({touch:matchMedia('(pointer: coarse)').matches});
let preferences=session.getSettings(),settingsReturn='intro',pausedState='play';
let objectiveText='',hintText='',lastSaveAt=-10,lastSavedSignature='';
const keys=new Set();
function clearInput(){keys.clear();for(const key of ['Shift','c'])document.querySelector(`[data-key="${key}"]`)?.setAttribute('aria-pressed','false');}
let state='intro',time=0,wake=0,checkpoint=0,cameraX=-5.5,messageUntil=0,jumpHeld=false,fade=0;
let jumpBuffer=0,coyoteTime=0,acceleration=0,landImpact=0,cameraY=0,cameraLead=1.6;
const jumpMotion={preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0};
function resetJumpMotion(){Object.assign(jumpMotion,{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0});}
const previousSim={x:0,y:0,z:0,vx:0,vz:0};
const previousWobble={},drawWobble={},drawClimb={},drawLadder={},drawSlip={},drawInteraction={},drawStreet={},drawSlide={},drawHomeDoor={};
let lastSlideSpray=-10;
let lastDrawX=0,lastDrawZ=0,mantle=null,ledgeIntent=0,climbsCompleted=0;
const player={x:0,y:0,z:0,vx:0,vy:0,vz:0,grounded:true,face:1};
const opening=createOpening(),openingVisual={active:false,elapsed:0,wake:0,escaped:false};
const bridge=createBridge();
const ladder=createLadder();
const slip=createSlip();
let ladderCooldown=0,laddersCompleted=0;
let slipsCompleted=0;
let chapter='rooftop',chapterTransition=null;
const stairwell=createStairwell();
const street=createStreet();
const home=createHome();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('#error').hidden=false;$('#error').textContent='Could not start 3D graphics. Open the game in Chrome or Edge with hardware acceleration enabled.';throw error;}
const gl=renderer.getContext(), debug=gl.getExtension('WEBGL_debug_renderer_info');
const software=debug&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
let qualityRatio=software?.7:Math.min(devicePixelRatio,1.5);
renderer.setPixelRatio(qualityRatio);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=(chapter==='rooftop'?.93:.82)*preferences.brightness;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
const skyCanvas=document.createElement('canvas');skyCanvas.width=4;skyCanvas.height=512;
const skyContext=skyCanvas.getContext('2d'),skyGradient=skyContext.createLinearGradient(0,0,0,512);
skyGradient.addColorStop(0,'#10242f');skyGradient.addColorStop(.55,'#2c4655');skyGradient.addColorStop(1,'#425b65');skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,4,512);
scene.background=new THREE.CanvasTexture(skyCanvas);scene.background.colorSpace=THREE.SRGBColorSpace;
scene.fog=new THREE.FogExp2('#2b4554',.018);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,250);
const hemi=new THREE.HemisphereLight('#a9cadc','#172328',1.15);scene.add(hemi);
const sun=new THREE.DirectionalLight('#bed6e4',1.65);sun.position.set(5,18,-9);sun.castShadow=true;sun.shadow.mapSize.set(software?512:2048,software?512:2048);sun.shadow.camera.left=-19;sun.shadow.camera.right=19;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-13;sun.shadow.camera.near=1;sun.shadow.camera.far=65;sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight('#7499b1',.85);fill.position.set(-8,5,12);scene.add(fill);
const rim=new THREE.DirectionalLight('#b9d9e7',1.9);rim.position.set(-3,8,-5);scene.add(rim);
const world=createWorld(THREE,scene),boy=createBoy(THREE);scene.add(boy.group);
const interior=createStairwellWorld(THREE,scene);
const streetWorld=createStreetWorld(THREE,scene);
const playgroundWorld=createPlaygroundWorld(THREE,scene);
// The future courtyard is visible beyond the block, behind the walking route.
playgroundWorld.group.scale.setScalar(.75);playgroundWorld.group.position.set(14,-.04,-15);
const homeWorld=createHomeWorld(THREE,scene);
const outdoorBackground=scene.background,outdoorFog=scene.fog;
const restArea=world.restArea;
Object.assign(player,{x:restArea.spawnX,y:restArea.surfaceY});
Object.assign(previousSim,{x:restArea.spawnX,y:restArea.surfaceY,vx:0});
lastDrawX=restArea.spawnX;
const water=createWaterEffects(THREE,scene);
const dust=createDustEffects(THREE,scene);

// Sparse moving rain catches the cold skylight, leaving the silhouettes legible.
const rainCount=550,rainPositions=new Float32Array(rainCount*6);
const random=(n)=>{const x=Math.sin(n*127.1+74.7)*43758.5453;return x-Math.floor(x)};
for(let i=0;i<rainCount;i++){const o=i*6;rainPositions[o]=random(i)*66-25;rainPositions[o+1]=random(i+722)*25-5;rainPositions[o+2]=random(i+1000)*45-20;rainPositions[o+3]=rainPositions[o]-.06;rainPositions[o+4]=rainPositions[o+1]-.28;rainPositions[o+5]=rainPositions[o+2];}
const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:'#bbcbd1',transparent:true,opacity:.16,depthWrite:false}));scene.add(rain);
rain.visible=false;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.16,.6,1.05);bloom.enabled=!software;composer.addPass(bloom);
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},uTime:{value:0},uFade:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uFade;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;vec2 p=vUv-.5;float vignette=1.-smoothstep(.2,.8,length(p*vec2(.95,1.1)));c*=mix(.56,1.,vignette);float noise=fract(sin(dot(vUv*1900.+fract(uTime)*100.,vec2(12.9898,78.233)))*43758.5453);float luminance=dot(c,vec3(.2126,.7152,.0722));c=mix(c,vec3(luminance),.10);c+=(noise-.5)*.007;c=mix(c,vec3(.012,.02,.026),uFade);gl_FragColor=vec4(c,1.);}`});
composer.addPass(grade);composer.addPass(new OutputPass());
function resize(){const w=innerWidth,h=innerHeight;const ratio=Math.min(qualityRatio,(software?1100:1920)/w,(software?800:1200)/h);renderer.setPixelRatio(ratio);renderer.setSize(w,h);composer.setPixelRatio(ratio);composer.setSize(w,h);camera.aspect=w/h;camera.fov=w/h<1?48:36;camera.updateProjectionMatrix();}resize();addEventListener('resize',resize);

function say(text,duration=3){if(!preferences.hints)return;hintText=text;messageUntil=time+duration;}
function setObjective(text){objectiveText=text;}
function refreshHint(){
 const lesson=state==='play'&&chapter!=='stairwell'&&chapter!=='home'&&!slip.active?tutorials.current:null;
 const text=state==='play'?(lesson?.text??(preferences.hints?(time<messageUntil?hintText:opening.state.active?opening.state.cue:objectiveText):'')):'';
 message.hidden=!text;if(message.textContent!==text)message.textContent=text;
}
function updateContinue(){ $('#continue').disabled=!session.getSave(); }
function syncStreetArea(){
 streetWorld.group.visible=chapter==='street';playgroundWorld.group.visible=chapter==='street'&&player.x>56;homeWorld.group.visible=chapter==='home';
}
function setChapter(next){
 if(next!==chapter)tutorials.reset(tutorials.learned);
 chapter=next;const indoors=next==='stairwell'||next==='home',onStreet=next==='street';
 world.world.visible=next==='rooftop';interior.group.visible=next==='stairwell';streetWorld.group.visible=onStreet;rain.visible=onStreet;
 syncStreetArea();
 scene.background=indoors?new THREE.Color('#080b0c'):onStreet?new THREE.Color('#26343d'):outdoorBackground;
 scene.fog=indoors?new THREE.FogExp2('#0b0e0e',.014):onStreet?new THREE.FogExp2('#263740',.025):outdoorFog;
 hemi.intensity=indoors?.65:onStreet?.9:1.15;sun.intensity=indoors?.32:onStreet?.55:1.65;
 fill.intensity=indoors?.65:onStreet?.6:.85;rim.intensity=indoors?.65:onStreet?.85:1.9;
 hemi.color.set(next==='rooftop'?'#a9cadc':'#b6c9d5');hemi.groundColor.set(next==='rooftop'?'#172328':'#202b2c');
 sun.color.set(next==='rooftop'?'#bed6e4':'#cddbdc');fill.color.set(next==='rooftop'?'#7499b1':'#8fa8b7');rim.color.set(next==='rooftop'?'#b9d9e7':'#dae8e8');
 renderer.toneMappingExposure=(next==='rooftop'?.93:.82)*preferences.brightness;
 if(audio&&ambienceFilter){ambienceFilter.frequency.setTargetAtTime(indoors?160:420,audio.currentTime,.25);ambienceLevel.gain.setTargetAtTime(indoors?.045:.18,audio.currentTime,.25);}
 renderer.shadowMap.needsUpdate=true;
 document.body.classList.toggle('indoors',indoors);
 document.body.classList.toggle('on-street',onStreet);
 document.body.classList.remove('near-exit','near-object');
}
function showOverlay(panel){
 for(const screen of [intro,settingsPanel,pauseMenu,ending])screen.hidden=screen!==panel;
 document.body.classList.toggle('menu-open',!!panel);
 document.body.classList.toggle('playing',state!=='intro'&&!(state==='settings'&&settingsReturn==='intro'));
 pauseButton.hidden=state!=='play'&&state!=='fall';
 canvas.tabIndex=panel?-1:0;
 refreshHint();
}
function resetWorld(saved=null){
 clearInput();wake=saved?.awakened?1:0;checkpoint=saved?.checkpoint??0;fade=0;
 chapterTransition=null;stairwell.reset();street.reset();home.reset();setChapter(saved?.chapter==='home'?'home':saved?.chapter==='street'?'street':saved?.chapter==='stairwell'?'stairwell':'rooftop');
 interior.exitDoor?.reset();
 streetWorld.entryDoor?.reset();
 streetWorld.homeDoor?.reset();
 Object.assign(player,{x:saved?.player.x??restArea.spawnX,y:saved?.player.y??restArea.surfaceY,z:0,vx:0,vy:0,vz:0,grounded:true,face:saved?.player.face??1});
 if(chapter==='stairwell'){stairwell.begin(player,saved.stairwell);wake=1;}
 if(chapter==='street'){street.begin(player,saved.street);syncStreetArea();wake=1;}
 if(chapter==='home'){home.begin(player,saved.home);wake=1;}
 world.crate.position.x=saved?.crateX??13;
 jumpHeld=false;jumpBuffer=0;coyoteTime=0;resetJumpMotion();mantle=null;ledgeIntent=0;climbsCompleted=0;
 water.reset();dust.reset();bridge.restore(saved?.bridgeBroken??false);world.bridge?.reset();world.bridge?.update(time,bridge.state);
 ladder.reset();ladderCooldown=0;laddersCompleted=checkpoint===3?1:0;
 slip.restore(saved?.slipPlayed??false);slipsCompleted=slip.played?1:0;landImpact=0;acceleration=0;lastDrawX=player.x;lastDrawZ=player.z;
 tutorials.reset(saved?.learnedMechanics??[]);
 Object.assign(previousSim,{x:player.x,y:player.y,z:player.z,vx:0,vz:0,dumpsterX:street.state?.dumpsterX,crouch:street.state?.crouch??0,climbId:null,ladderPhase:null,slipPhase:null});
 boy.group.position.set(player.x,player.y,player.z);boy.group.rotation.y=player.face*Math.PI/2;boy.reset?.();
 opening.reset();world.opening?.reset();
 if(saved?.awakened)Object.assign(opening.state,{active:false,escaped:true,escapedAt:0,elapsed:10,phase:'complete',cue:'',edgeImpact:0});
 cameraX=chapter==='stairwell'||chapter==='home'?(STAIRWELL.left+STAIRWELL.right)/2:wake===1?player.x:-3.2;cameraLead=1.3;cameraY=player.y;accumulator=0;
 objectiveText='';hintText='';messageUntil=0;message.textContent='';message.hidden=true;
 lastSaveAt=time;lastSavedSignature=saved?JSON.stringify(saved):'';
}
function persistProgress(force=false){
 if(!force&&time-lastSaveAt<1)return;
 lastSaveAt=time;
 if(wake!==1||mantle||ladder.active||slip.active||jumpMotion.preparing||jumpMotion.launched)return;
 if(chapter==='stairwell'&&stairwell.state?.phase!=='walk')return;
 if(chapter==='home'&&home.state?.phase!=='walk')return;
 const streetSave=chapter==='street'?street.snapshot():null;if(chapter==='street'&&!streetSave)return;
 const snapshot=createSaveSnapshot({player,checkpoint,crateX:world.crate.position.x,bridgeBroken:!bridge.supported,slipPlayed:slip.played,awakened:true,learnedMechanics:tutorials.learned,
  ...(chapter==='home'?{chapter,home:home.snapshot()}:chapter==='stairwell'?{chapter,stairwell:stairwell.snapshot()}:chapter==='street'?{chapter,street:streetSave}:{})});
 if(!snapshot)return;
 const signature=JSON.stringify(snapshot);
 if(signature!==lastSavedSignature&&session.save(snapshot)){lastSavedSignature=signature;updateContinue();}
}
function persistLearning(){
 const saved=session.getSave();if(!saved)return;
 const updated={...saved,learnedMechanics:tutorials.learned};
 if(session.save(updated))lastSavedSignature=JSON.stringify(updated);
}
function start(){
 session.clearSave();resetWorld();state='play';showOverlay(null);
 const initial=createSaveSnapshot({player,checkpoint:0,crateX:13,bridgeBroken:false,slipPlayed:false,awakened:false,learnedMechanics:[]});
 if(initial){session.save(initial);lastSavedSignature=JSON.stringify(initial);}
 updateContinue();configureAudio(true);canvas.focus();
 say('You are awake. The city is still sleeping.',4);
}
function continueGame(){
 const saved=session.getSave();if(!saved)return;
 resetWorld(saved);state='play';showOverlay(null);configureAudio(true);canvas.focus();
}
function resume(){
 if(state!=='pause')return;
 clearInput();state=pausedState;showOverlay(null);configureAudio(true);canvas.focus();
}
function pause(){
 if(state==='pause'){resume();return;}
 if(state!=='play'&&state!=='fall')return;
 persistProgress(true);pausedState=state;state='pause';clearInput();showOverlay(pauseMenu);$('#resume').focus();
}
function mainMenu(){
 persistProgress(true);resetWorld();state='intro';updateContinue();showOverlay(intro);
 ($('#continue').disabled?$('#play'):$('#continue')).focus();
}
function openSettings(){
 if(state!=='intro'&&state!=='pause')return;
 settingsReturn=state;state='settings';clearInput();showOverlay(settingsPanel);$('#setting-sound').focus();
}
function closeSettings(){
 state=settingsReturn;showOverlay(state==='intro'?intro:pauseMenu);
 (state==='intro'?$('#settings-open'):$('#pause-settings')).focus();
}
function applySettings(patch=null,gesture=false){
 if(patch)preferences=session.setSettings(patch);
 $('#setting-sound').checked=preferences.sound;
 $('#setting-volume').value=Math.round(preferences.volume*100);
 $('#setting-brightness').value=Math.round(preferences.brightness*100);
 $('#setting-hints').checked=preferences.hints;
 renderer.toneMappingExposure=(chapter==='rooftop'?.93:.82)*preferences.brightness;
 if(!preferences.hints){hintText='';messageUntil=0;}
 refreshHint();configureAudio(gesture);
}
function configureAudio(gesture=false){
 try{
  if(gesture&&preferences.sound&&preferences.volume>0)initAudio();
  muted=!preferences.sound||preferences.volume===0;
  if(!audio)return;
  master.gain.setTargetAtTime(.45*preferences.volume,audio.currentTime,.04);
  if(muted)audio.suspend();else if(gesture)audio.resume();
 }catch{/* A browser without audio still keeps the game and settings usable. */}
}
$('#play').onclick=start;$('#again').onclick=start;$('#continue').onclick=continueGame;
$('#settings-open').onclick=openSettings;$('#pause-settings').onclick=openSettings;$('#settings-back').onclick=closeSettings;
$('#resume').onclick=resume;$('#main-menu').onclick=mainMenu;$('#ending-menu').onclick=mainMenu;pauseButton.onclick=pause;
$('#setting-sound').onchange=e=>applySettings({sound:e.target.checked},true);
$('#setting-volume').oninput=e=>applySettings({volume:Number(e.target.value)/100},true);
$('#setting-brightness').oninput=e=>applySettings({brightness:Number(e.target.value)/100});
$('#setting-hints').onchange=e=>applySettings({hints:e.target.checked});
canvas.addEventListener('pointerdown',()=>{if(state==='play')canvas.focus()});
const keyName=e=>e.key.length===1?e.key.toLowerCase():e.key;
addEventListener('keydown',e=>{
 if(e.key==='Tab'&&['intro','pause','settings','end'].includes(state)){
  const panel=state==='intro'?intro:state==='pause'?pauseMenu:state==='settings'?settingsPanel:ending;
  const items=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(item=>item.getClientRects().length);
  const index=items.indexOf(document.activeElement);
  if(items.length&&(index<0||e.shiftKey&&index===0||!e.shiftKey&&index===items.length-1)){
   e.preventDefault();items[e.shiftKey?items.length-1:0].focus();
  }
  return;
 }
 if(e.key==='Escape'){
  e.preventDefault();if(e.repeat)return;
  if(state==='settings')closeSettings();else pause();return;
 }
 if(state!=='play'&&state!=='fall')return;
 if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Control','c','C'].includes(e.key))e.preventDefault();
 if(e.repeat&&keyName(e)==='r')return;
 keys.add(keyName(e));if(keyName(e)==='r')start();
});
addEventListener('keyup',e=>keys.delete(keyName(e)));
addEventListener('blur',()=>{clearInput();if(state==='play'||state==='fall')pause()});
addEventListener('pagehide',()=>persistProgress(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state==='play'||state==='fall'))pause()});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',e=>{
  if(state!=='play')return;
  e.preventDefault();try{button.setPointerCapture(e.pointerId)}catch{}
  if(button.dataset.key==='Shift'||button.dataset.key==='c'){
   const enabled=!keys.has(button.dataset.key);if(enabled)keys.add(button.dataset.key);else keys.delete(button.dataset.key);
   button.setAttribute('aria-pressed',String(enabled));
  }else keys.add(button.dataset.key);
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{if(!['Shift','c'].includes(button.dataset.key))keys.delete(button.dataset.key)});
}
const crateCollider={id:'crate',x:12.45,w:1.1,y:.85};
const obstacleList=[{id:'rest-wall',...restArea.leftWall},{id:'vent',x:6.2,w:1.6,y:.85},{id:'pipe',x:16.725,w:.55,y:1.65},crateCollider,{id:'final-wall',...LEVEL.roofs.final}];
const fixedSurfaces=[restArea.mattress,...Object.values(LEVEL.roofs),...obstacleList];
const surfaceList=[...fixedSurfaces,LEVEL.bridge];
const obstacles=()=>{crateCollider.x=world.crate.position.x-.55;return obstacleList;};
const colliders=()=>{crateCollider.x=world.crate.position.x-.55;return bridge.supported?surfaceList:fixedSurfaces;};
const onPlank=x=>bridge.supported&&x>=LEVEL.bridge.x&&x<=LEVEL.bridge.x+LEVEL.bridge.w;
function saveCheckpoint(){
 if(!player.grounded)return;
 for(let i=0;i<LEVEL.checkpoints.length;i++){
  const roof=[LEVEL.roofs.middle,LEVEL.roofs.landing,LEVEL.roofs.final][i];
  if(Math.abs(player.y-roof.y)<.06&&player.x>=roof.x+.5&&player.x<roof.x+roof.w-.2)checkpoint=Math.max(checkpoint,i+1);
 }
}
function ladderInput(){return {up:keys.has('w')||keys.has('ArrowUp')||keys.has(' ')||keys.has('d')||keys.has('ArrowRight'),down:keys.has('s')||keys.has('ArrowDown')||keys.has('a')||keys.has('ArrowLeft')};}
function beginLadder(entry){
 if(!ladder.begin(player,entry))return false;
 ladder.state.turnStart=boy.group.rotation.y;
 mantle=null;resetJumpMotion();jumpHeld=true;jumpBuffer=0;coyoteTime=0;ledgeIntent=0;push=false;landImpact=0;acceleration=0;
 say('Hold UP to climb. DOWN to descend. Release to hold on.',3);
 return true;
}
function tryAirCatch(direction){
 if(player.grounded||ladderCooldown>0||keys.has('e')||direction<0)return false;
 const upward=keys.has('w')||keys.has('ArrowUp')||keys.has(' ');
 if(direction===0&&player.vx<=.15&&!upward)return false;
 return canMountLadder(player,LEVEL.ladder,'air')&&beginLadder('air');
}
function advanceLadder(dt){
 const event=ladder.update(dt,ladderInput(),player);
 setObjective('Climb to the upper roof. Take your time.');
 if(event==='rung')ladderSound();
 if(event==='complete-top'||event==='complete-bottom'){
  ladderCooldown=.3;resetJumpMotion();jumpBuffer=0;coyoteTime=0;
  jumpHeld=keys.has(' ')||keys.has('w')||keys.has('ArrowUp');
  const support=groundStepY(player.x,player.y,colliders());
  player.grounded=support!==undefined;if(player.grounded)player.y=support;
  if(event==='complete-top'){laddersCompleted++;saveCheckpoint();say('The door is close. Keep going.',2.5);}
 }
}
function beginSlip(){
 slip.state.turnStart=boy.group.rotation.y;
 resetJumpMotion();jumpBuffer=0;coyoteTime=0;ledgeIntent=0;landImpact=0;acceleration=0;push=false;
 water.splash({x:player.x+player.face*.12,y:player.y,strength:.6});
 slipSound('skid');say('Careful.',1.5);
}
function advanceSlip(dt){
 const events=slip.update(dt,player);
 for(const event of events){
  if(event==='impact'){water.splash({x:player.x-player.face*.3,y:player.y,strength:1.25});slipSound('impact');}
  if(event==='rebound')water.splash({x:player.x-player.face*.2,y:player.y,strength:.35});
  if(event==='brush'){dust.puff({x:player.x+player.face*.16,y:player.y+1.0,z:.15,strength:.7});slipSound('brush');}
  if(event==='complete'){
   slipsCompleted++;jumpBuffer=0;coyoteTime=0;resetJumpMotion();
   jumpHeld=keys.has(' ')||keys.has('w')||keys.has('ArrowUp');
   say('Keep going.',1.8);
  }
 }
 if(slip.active)setObjective(slip.state.phase==='brush'||slip.state.phase==='look'||slip.state.phase==='settle'?'Take a breath. Then keep moving.':'Steady yourself. Get back on your feet.');
}
function beginClimb(target){
 mantle=createClimb({x:player.x,y:player.y,face:player.face,target});
 if(!mantle)return false;
 player.vx=0;player.vy=0;player.grounded=false;push=false;
 resetJumpMotion();jumpBuffer=0;coyoteTime=0;ledgeIntent=0;
 say('Find your grip. Pull yourself up.',1.4);
 return true;
}
function advanceClimb(dt){
 mantle.elapsed+=dt;mantle.progress=Math.min(1,mantle.elapsed/mantle.duration);
 const point=sampleClimb(mantle);player.x=point.x;player.y=point.y;
 player.vx=0;player.vy=0;player.face=mantle.face;
 if(mantle.progress===1){
  player.x=mantle.endX;player.y=mantle.endY;player.grounded=true;
  mantle=null;climbsCompleted++;ledgeIntent=0;
 }
}
function enterInterior(){
 setChapter('stairwell');stairwell.begin(player);interior.exitDoor?.reset();clearInput();
 mantle=null;ladder.reset();slip.restore(true);resetJumpMotion();jumpBuffer=0;coyoteTime=0;push=false;
 water.reset();dust.reset();wake=1;landImpact=0;acceleration=0;
 Object.assign(opening.state,{active:false,escaped:true,phase:'complete',cue:''});
 Object.assign(previousSim,{x:player.x,y:player.y,z:player.z,vx:0,vz:0,climbId:null,ladderPhase:null,slipPhase:null});
 boy.group.position.set(player.x,player.y,player.z);boy.group.rotation.y=player.face*Math.PI/2;boy.reset?.();
 lastDrawX=player.x;lastDrawZ=player.z;cameraX=(STAIRWELL.left+STAIRWELL.right)/2;cameraY=player.y;
 objectiveText='';hintText='';messageUntil=0;refreshHint();persistProgress(true);
}
function enterStreet(){
 setChapter('street');street.begin(player);streetWorld.entryDoor?.reset();stairwell.reset();clearInput();
 mantle=null;ladder.reset();resetJumpMotion();jumpBuffer=0;coyoteTime=0;push=false;
 water.reset();dust.reset();wake=1;landImpact=0;acceleration=0;
 Object.assign(previousSim,{x:player.x,y:player.y,z:player.z,vx:0,vz:0,climbId:null,ladderPhase:null,slipPhase:null});
 boy.group.position.set(player.x,player.y,player.z);boy.group.rotation.y=player.face*Math.PI/2;boy.reset?.();
 lastDrawX=player.x;lastDrawZ=player.z;cameraX=player.x;cameraY=0;cameraLead=1.3;
 objectiveText='';hintText='';messageUntil=0;refreshHint();persistProgress(true);
}
function enterHome(){
 setChapter('home');home.begin(player);clearInput();tutorials.reset(tutorials.learned);
 water.reset();dust.reset();landImpact=0;acceleration=0;push=false;
 Object.assign(previousSim,{x:player.x,y:0,z:player.z,vx:0,vz:0,crouch:0,slidePhase:null,climbId:null});
 boy.group.position.set(player.x,0,player.z);boy.group.rotation.y=Math.PI/2;boy.reset?.();
 lastDrawX=player.x;lastDrawZ=player.z;cameraX=(HOME.left+HOME.right)/2;cameraY=3.4;cameraLead=1.3;
 objectiveText='';hintText='';messageUntil=0;refreshHint();persistProgress(true);
 renderer.shadowMap.needsUpdate=true;
}
let push=false;
function physics(dt){
 if(chapter==='rooftop'&&!bridge.supported)bridge.update(dt,player);
 if(state!=='play')return;
 if(chapterTransition){
  chapterTransition.elapsed+=dt;
  if(!chapterTransition.switched&&chapterTransition.elapsed>=.42){chapterTransition.switched=true;if(chapterTransition.target==='home')enterHome();else if(chapterTransition.target==='street')enterStreet();else enterInterior();}
  if(chapterTransition.elapsed>=.9){chapterTransition=null;clearInput();}
  return;
 }
 if(chapter==='stairwell'){
  const direction=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));
  const previousVX=player.vx,event=stairwell.update(dt,{direction,running:keys.has('Shift'),interact:keys.has('e')},player);
  acceleration=THREE.MathUtils.clamp((player.vx-previousVX)/dt,-12,12);
  if(event==='floor')persistProgress(true);
  if(event==='open-exit'){clearInput();ladderSound();}
  if(event==='complete'){chapterTransition={elapsed:0,switched:false,target:'street'};clearInput();player.vx=0;}
  return;
 }
 if(chapter==='home'){
  const direction=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));
  const previousVX=player.vx,event=home.update(dt,{direction,running:keys.has('Shift')},player);
  acceleration=THREE.MathUtils.clamp((player.vx-previousVX)/dt,-12,12);if(event==='floor')persistProgress(true);return;
 }
 if(chapter==='street'){
  const direction=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));
  const event=street.update(dt,{direction,running:keys.has('Shift'),jump:keys.has(' ')||keys.has('w')||keys.has('ArrowUp'),interact:keys.has('e'),crouch:keys.has('Control')||keys.has('c')},player);
  acceleration=street.state.acceleration;landImpact=Math.max(landImpact,street.state.landImpact);
  if(event==='takeoff')water.splash({x:player.x,y:street.supportY(player.x),strength:.55});
  if(event==='land')water.splash({x:player.x,y:player.y,strength:.65+landImpact*.45});
  if(event==='slide-start')water.splash({x:player.x,y:player.y,strength:.5});
  if(event==='open-home')clearInput();
  if(event==='home-complete'){chapterTransition={elapsed:0,switched:false,target:'home'};clearInput();}
  return;
 }
 ladderCooldown=Math.max(0,ladderCooldown-dt);
 wake=Math.min(1,wake+dt/3.4);if(wake<1){player.vx=0;setObjective('Wake up. Slowly, back on your feet.');return;}
 if(slip.active){advanceSlip(dt);return;}
 if(ladder.active){advanceLadder(dt);return;}
 if(mantle){advanceClimb(dt);return;}
 let direction=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));
 if(tryAirCatch(direction))return;
 if(ladderCooldown===0&&!keys.has('e')){
  const climbUp=keys.has('w')||keys.has('ArrowUp')||keys.has(' ');
  if(canMountLadder(player)&&((direction>0&&player.x>=LEVEL.ladder.x-.24)||climbUp)){if(beginLadder('bottom'))return;}
  if(canMountLadder(player,LEVEL.ladder,'top')&&(keys.has('s')||keys.has('ArrowDown'))){if(beginLadder('top'))return;}
 }
 const previousVX=player.vx;
 const running=keys.has('Shift');
 player.vx=movementVelocity(player.vx,direction,running,player.grounded,dt);
 acceleration=THREE.MathUtils.clamp((player.vx-previousVX)/dt,-16,16);
 if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.2))player.face=direction;
 const jump=keys.has(' ')||keys.has('ArrowUp')||keys.has('w');
 if(jump&&!jumpHeld)jumpBuffer=MOVEMENT.buffer;jumpHeld=jump;
 coyoteTime=player.grounded?MOVEMENT.coyote:Math.max(0,coyoteTime-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);
 const ledge=findClimbTarget(player,obstacles());
 if(ledge&&!keys.has('e')&&direction===player.face)ledgeIntent+=dt;else ledgeIntent=0;
 if(shouldStartClimb(ledge,{jumpBuffered:jumpBuffer,ledgeIntent,direction,face:player.face,pushing:keys.has('e')})){
  if(beginClimb(ledge))return;
 }
 if(jumpBuffer>0&&coyoteTime>0&&!jumpMotion.preparing){
  jumpMotion.preparing=true;jumpMotion.elapsed=0;
  jumpMotion.duration=running&&Math.abs(player.vx)>1?.085:.12;
  jumpBuffer=0;coyoteTime=0;
 }
 if(jumpMotion.preparing){
  jumpMotion.elapsed+=dt;
  if(jumpMotion.elapsed>=jumpMotion.duration){
   jumpMotion.preparing=false;jumpMotion.launched=true;jumpMotion.airTime=0;
   player.vy=MOVEMENT.jumpVelocity;jumpMotion.launchSpeed=Math.abs(player.vx);player.grounded=false;coyoteTime=0;
   water.splash({x:player.x+player.face*.04,y:player.y,strength:.55});
  }
 }
 // Brief planted anticipation keeps an edge jump responsive without stepping
 // off the roof while the knees load. Airborne trajectory remains unchanged.
 let previousY=player.y;let nextX=jumpMotion.preparing?preparationX({x:player.x,y:player.y,vx:player.vx,running,dt,grounded:player.grounded,surfaces:colliders()}):player.x+player.vx*dt;push=false;
 const crate=world.crate.position;
 crateCollider.x=crate.x-.55;
 const crateContact=crateSideContact(player,nextX,crateCollider);
 if(crateContact){
  if(keys.has('e')&&direction&&player.grounded&&!jumpMotion.preparing){
   const desired=THREE.MathUtils.clamp(crate.x+direction*.9*dt,10.5,16.0);
   const delta=desired-crate.x;crate.x=desired;nextX=player.x+delta;player.vx=delta/dt;push=Math.abs(delta)>.0001;
   say('Move the crate to the pipe. Climb up, then keep going.',.15);
  }else{nextX=crateContact.x;player.vx=0;say('SPACE / W / UP — Climb. Hold E + A / D to push.',.15);}
 }
 for(const c of obstacleList){
  if(c.id==='crate')continue;
  const contactRadius=c.id==='rest-wall'?.21:.2;
  if(player.y<c.y-.02&&nextX+contactRadius>c.x&&nextX-contactRadius<c.x+c.w){
   // Resolve only side entry, so standing on top never gets stuck.
   if(player.x<=c.x-.19){nextX=c.x-.21;player.vx=0;}else if(player.x>=c.x+c.w+.19){nextX=c.x+c.w+.21;player.vx=0;}
  }
 }
 const wasGrounded=player.grounded;
 if(wasGrounded&&!jumpMotion.launched&&!jumpMotion.preparing&&player.vy<=0){
  const support=groundStepY(nextX,player.y,colliders());
  if(support!==undefined){player.y=support;previousY=support;player.vy=0;}
 }
 player.x=nextX;
 if(!wasGrounded&&tryAirCatch(direction))return;
 player.vy-=(jumpMotion.launched?MOVEMENT.gravity:MOVEMENT.fallGravity)*dt;player.y+=player.vy*dt;player.grounded=false;
 const fallSpeed=-player.vy;
 for(const c of colliders())if(player.x>c.x-.02&&player.x<c.x+c.w+.02&&previousY>=c.y-.025&&player.y<=c.y&&player.vy<=0){player.y=c.y;player.vy=0;player.grounded=true;}
 if(!wasGrounded&&player.grounded&&fallSpeed>1){
  landImpact=Math.max(landImpact,Math.min(1,fallSpeed/8));
  water.splash({x:player.x,y:player.y,strength:.65+landImpact*.45});
 }
 if(player.grounded){jumpMotion.airTime=0;jumpMotion.launched=false;}else jumpMotion.airTime+=dt;
 if(!push&&!jumpMotion.preparing&&!jumpMotion.launched&&slip.tryStart(player,previousSim.x)){beginSlip();return;}
 saveCheckpoint();
 const bridgeEvent=bridge.supported?bridge.update(dt,player):undefined;
 if(bridgeEvent){bridgeSound(bridgeEvent);if(bridgeEvent==='break')say('Keep moving. There is no way back.',3.5);}
 if(player.y<-5){state='fall';fade=0;clearInput();message.textContent='';}
 player.x=Math.min(player.x,LEVEL.roofs.final.x+LEVEL.roofs.final.w-.5);

 setObjective(player.x<5?'Leave your shelter. Follow the roof to the right.':player.x<10?'Hold toward the vent to climb. SPACE also grabs the ledge.':player.x<18?'Push the crate to the pipe. Press SPACE / W / UP to climb it.':player.x<LEVEL.roofs.middle.x+.5?'Hold SHIFT + D to run. Jump close to the edge.':player.x<LEVEL.bridge.safeX?'Cross the wooden plank to the next roof.':player.y<LEVEL.roofs.final.y-.2?'Climb the ladder to reach the upper roof.':'Reach the lit doorway.');
 if(player.grounded&&Math.abs(player.y-LEVEL.roofs.final.y)<.09&&player.x>LEVEL.doorX-1.2&&player.x<LEVEL.doorX+2){say('E — Open the door.',.2);if(keys.has('e')){persistProgress(true);chapterTransition={elapsed:0,switched:false};clearInput();player.vx=0;player.vy=0;previousSim.vx=0;}}
}
let audio=null,muted=true,master,stepNoise,ambienceFilter,ambienceLevel;
function initAudio(){if(audio)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=new AC();master=audio.createGain();master.gain.value=.45;master.connect(audio.destination);const noise=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.21;stepNoise=audio.createBuffer(1,Math.floor(audio.sampleRate*.12),audio.sampleRate);const stepData=stepNoise.getChannelData(0);for(let i=0;i<stepData.length;i++)stepData[i]=(Math.random()*2-1)*(1-i/stepData.length);const source=audio.createBufferSource();source.buffer=noise;source.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=chapter==='stairwell'?160:420;const volume=audio.createGain();volume.gain.value=chapter==='stairwell'?.045:.18;ambienceFilter=filter;ambienceLevel=volume;source.connect(filter).connect(volume).connect(master);source.start();const drone=audio.createOscillator();drone.frequency.value=51;const hum=audio.createGain();hum.gain.value=.025;drone.connect(hum).connect(master);drone.start();}
function stepSound(intensity=.6){
 if(!audio||muted)return;
 const t=audio.currentTime,osc=audio.createOscillator(),g=audio.createGain();
 osc.type='triangle';osc.frequency.setValueAtTime(92,t);osc.frequency.exponentialRampToValueAtTime(34,t+.11);
 g.gain.setValueAtTime(.025+.045*intensity,t);g.gain.exponentialRampToValueAtTime(.001,t+.13);
 osc.connect(g).connect(master);osc.start();osc.stop(t+.14);
 const scrape=audio.createBufferSource(),filter=audio.createBiquadFilter(),wet=audio.createGain();
 scrape.buffer=stepNoise;filter.type='bandpass';filter.frequency.value=(chapter==='stairwell'?560:900)+intensity*400;filter.Q.value=.6;
 wet.gain.setValueAtTime((chapter==='stairwell'?.012:.025)*intensity,t);wet.gain.exponentialRampToValueAtTime(.001,t+.1);
 scrape.connect(filter).connect(wet).connect(master);scrape.start();
}
function openingSound(kind){
 if(!audio||muted)return;
 const t=audio.currentTime,low=audio.createOscillator(),gain=audio.createGain();
 low.type=kind==='edge-break'?'triangle':'sine';low.frequency.setValueAtTime(kind==='edge-break'?105:180,t);low.frequency.exponentialRampToValueAtTime(34,t+.8);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(kind==='edge-break'?.10:.045,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+.9);
 low.connect(gain).connect(master);low.start(t);low.stop(t+1);
 if(kind==='edge-break')stepSound(.85);
}
function bridgeSound(kind){
 if(!audio||muted)return;
 const t=audio.currentTime,breaking=kind==='break',duration=breaking?.62:.28;
 const creak=audio.createOscillator(),body=audio.createGain();
 creak.type='triangle';creak.frequency.setValueAtTime(breaking?145:92,t);creak.frequency.exponentialRampToValueAtTime(breaking?38:65,t+duration);
 body.gain.setValueAtTime(.0001,t);body.gain.exponentialRampToValueAtTime(breaking?.10:.022,t+.018);body.gain.exponentialRampToValueAtTime(.0001,t+duration);
 creak.connect(body).connect(master);creak.start(t);creak.stop(t+duration);
 if(breaking){
  for(let i=0;i<3;i++){
   const crack=audio.createBufferSource(),filter=audio.createBiquadFilter(),volume=audio.createGain(),at=t+i*.075;
   crack.buffer=stepNoise;filter.type='bandpass';filter.frequency.value=1500-i*300;filter.Q.value=.8;
   volume.gain.setValueAtTime(.16-i*.035,at);volume.gain.exponentialRampToValueAtTime(.0001,at+.12);
   crack.connect(filter).connect(volume).connect(master);crack.start(at);
  }
 }
}
function ladderSound(){
 if(!audio||muted)return;
 const t=audio.currentTime,ring=audio.createOscillator(),gain=audio.createGain();
 ring.type='sine';ring.frequency.setValueAtTime(275,t);ring.frequency.exponentialRampToValueAtTime(180,t+.14);
 gain.gain.setValueAtTime(.025,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.22);
 ring.connect(gain).connect(master);ring.start(t);ring.stop(t+.23);
}
function slipSound(kind){
 if(!audio||muted)return;
 const t=audio.currentTime,noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
 noise.buffer=stepNoise;filter.type=kind==='brush'?'highpass':'bandpass';filter.frequency.value=kind==='brush'?1600:kind==='impact'?650:1250;filter.Q.value=.65;
 gain.gain.setValueAtTime(kind==='brush'?.025:kind==='impact'?.16:.075,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.12);
 noise.connect(filter).connect(gain).connect(master);noise.start(t);
 if(kind==='impact'){
  const thud=audio.createOscillator(),body=audio.createGain();thud.type='sine';thud.frequency.setValueAtTime(82,t);thud.frequency.exponentialRampToValueAtTime(28,t+.26);
  body.gain.setValueAtTime(.105,t);body.gain.exponentialRampToValueAtTime(.0001,t+.3);thud.connect(body).connect(master);thud.start(t);thud.stop(t+.32);
 }
}

let last=performance.now(),accumulator=0,simTime=0;
let lastShadow=-1,qualityElapsed=0,qualityFrames=0;
renderer.shadowMap.autoUpdate=false;
function frame(now){
 requestAnimationFrame(frame);
 const wallDt=Math.max(0,(now-last)/1000),dt=Math.min(wallDt,.14);last=now;
 if(state==='pause'||state==='settings'&&settingsReturn==='pause')return;
 if(state==='play'&&wake===1){qualityElapsed+=wallDt;qualityFrames++;
  if(qualityElapsed>3&&qualityFrames>5){
   if(qualityElapsed/qualityFrames>1/36&&qualityRatio>(software?.5:.65)){qualityRatio=Math.max(software?.5:.65,qualityRatio*.85);bloom.enabled=false;resize();}
   qualityElapsed=0;qualityFrames=0;
  }
 }
 if(state!=='pause'){
  time+=dt;accumulator+=dt;
  while(accumulator>=1/90){
   Object.assign(previousSim,{x:player.x,y:player.y,z:player.z,vx:player.vx,vz:player.vz,
    dumpsterX:street.state?.dumpsterX,crouch:street.state?.crouch??0,
    slidePhase:street.state?.slide?.phase,slideProgress:street.state?.slide?.progress,slideLow:street.state?.slide?.lowAmount,
    homeDoorProgress:street.state?.homeDoor?.progress,
    climbId:(chapter==='street'?street.state?.climb:mantle)?.targetId,climbProgress:(chapter==='street'?street.state?.climb:mantle)?.progress,
    ladderPhase:ladder.state?.phase,ladderProgress:ladder.state?.progress,
    slipPhase:slip.state?.phase,slipProgress:slip.state?.progress,slipElapsed:slip.state?.elapsed,slipImpact:slip.state?.impact});
   if(slip.active)Object.assign(previousWobble,slip.state.wobble);
   physics(1/90);simTime+=1/90;accumulator-=1/90;
  }
 }
 if(state==='fall'){
  fade=Math.min(1,fade+dt*1.7);
  if(fade===1){
   const respawn=LEVEL.checkpoints[checkpoint-1];
   player.x=respawn?respawn.x:restArea.spawnX;player.y=respawn?respawn.y:restArea.surfaceY;player.vy=0;player.vx=0;player.grounded=true;
   player.z=0;player.vz=0;Object.assign(previousSim,{x:player.x,y:player.y,z:0,vx:0,vz:0});lastDrawX=player.x;lastDrawZ=0;boy.reset?.();
   cameraX=player.x;cameraY=Math.max(0,player.y);state='play';jumpBuffer=0;coyoteTime=0;resetJumpMotion();mantle=null;ladder.reset();ladderCooldown=.3;ledgeIntent=0;water.reset();
   say('Steady yourself. Try again.',3);
  }
 }else fade=chapterTransition?Math.sin(Math.PI*Math.min(1,chapterTransition.elapsed/.9)):Math.max(0,fade-dt*1.7);
 const shown=tutorials.update(dt,{playing:state==='play'&&chapter!=='stairwell'&&chapter!=='home'&&!chapterTransition,chapter,wake,player,crateX:world.crate.position.x,dumpsterX:street.state?.dumpsterX,busy:!!mantle||!!street.state?.climb||!!street.state?.slide||street.state?.homeDoor?.phase==='opening'||slip.active,ladderActive:ladder.active});
 if(shown)persistLearning();
 if(state==='play')persistProgress();
 refreshHint();
 const alpha=accumulator/(1/90);
 const renderedX=THREE.MathUtils.lerp(previousSim.x,player.x,alpha);
 const renderedY=THREE.MathUtils.lerp(previousSim.y,player.y,alpha);
 const renderedZ=THREE.MathUtils.lerp(previousSim.z,player.z,alpha);
 const renderedVX=THREE.MathUtils.lerp(previousSim.vx,player.vx,alpha);
 const renderedVZ=THREE.MathUtils.lerp(previousSim.vz,player.vz,alpha);
 const enteringHome=chapter==='street'&&street.state.homeDoor.phase==='opening';
 const renderedSpeed=chapter==='stairwell'||chapter==='home'||enteringHome?Math.hypot(renderedVX,renderedVZ):renderedVX;
 const renderedDumpsterX=chapter==='street'?THREE.MathUtils.lerp(previousSim.dumpsterX??street.state.dumpsterX,street.state.dumpsterX,alpha):0;
 const renderedCrouch=chapter==='street'?THREE.MathUtils.lerp(previousSim.crouch??street.state.crouch,street.state.crouch,alpha):0;
 const renderedInteraction=chapter==='street'&&street.state.interaction?Object.assign(drawInteraction,street.state.interaction,{objectX:renderedDumpsterX}):null;
 const renderedSlide=chapter==='street'&&street.state.slide?Object.assign(drawSlide,street.state.slide):null;
 if(renderedSlide&&previousSim.slidePhase===renderedSlide.phase){renderedSlide.progress=THREE.MathUtils.lerp(previousSim.slideProgress,renderedSlide.progress,alpha);renderedSlide.lowAmount=THREE.MathUtils.lerp(previousSim.slideLow,renderedSlide.lowAmount,alpha);}
 // Actions use the same render time as their root. Otherwise a 90 Hz action
 // advances by alternating one/two steps on a 60 Hz screen, speeding up and
 // slowing down a hand even though the underlying path is continuous.
 const activeClimb=chapter==='street'?street.state?.climb:mantle;
 const renderedClimb=activeClimb?Object.assign(drawClimb,activeClimb):null;
 if(renderedClimb&&previousSim.climbId===activeClimb.targetId)renderedClimb.progress=THREE.MathUtils.lerp(previousSim.climbProgress,activeClimb.progress,alpha);
 const renderedLadder=ladder.active?Object.assign(drawLadder,ladder.state):null;
 if(renderedLadder&&previousSim.ladderPhase===renderedLadder.phase)renderedLadder.progress=THREE.MathUtils.lerp(previousSim.ladderProgress,renderedLadder.progress,alpha);
 const renderedSlip=slip.active?Object.assign(drawSlip,slip.state):null;
 if(renderedSlip&&previousSim.slipPhase===renderedSlip.phase){
  renderedSlip.progress=THREE.MathUtils.lerp(previousSim.slipProgress,renderedSlip.progress,alpha);
  renderedSlip.phaseTime=renderedSlip.progress*renderedSlip.duration;
  renderedSlip.elapsed=THREE.MathUtils.lerp(previousSim.slipElapsed,renderedSlip.elapsed,alpha);
  renderedSlip.impact=THREE.MathUtils.lerp(previousSim.slipImpact,renderedSlip.impact,alpha);
  for(const key of Object.keys(renderedSlip.wobble))drawWobble[key]=THREE.MathUtils.lerp(previousWobble[key],renderedSlip.wobble[key],alpha);
  renderedSlip.wobble=drawWobble;
 }
 if(state!=='pause'){
  const travel=Math.min(.7,Math.hypot(renderedX-lastDrawX,renderedZ-lastDrawZ));lastDrawX=renderedX;lastDrawZ=renderedZ;
  boy.group.position.set(renderedX,renderedY,renderedZ);
  const attached=!!activeClimb||ladder.active||slip.active;
  if(slip.active){
   const motion=renderedSlip;boy.group.rotation.y=THREE.MathUtils.lerp(motion.turnStart??motion.face*Math.PI/2,motion.face*Math.PI/2,THREE.MathUtils.smoothstep(motion.elapsed,0,.18));
  }else if(ladder.active){
   const motion=renderedLadder,turn=motion.phase==='mount'||motion.phase==='top-in'?THREE.MathUtils.smoothstep(motion.progress,0,.22):1;
   boy.group.rotation.y=THREE.MathUtils.lerp(motion.turnStart??Math.PI/2,Math.PI/2,turn);
  }else if(enteringHome){
   boy.group.rotation.y=THREE.MathUtils.damp(boy.group.rotation.y,Math.PI,8,dt);
  }else if(chapter==='stairwell'||chapter==='home'){
   const heading=(chapter==='home'?home.state?.heading:stairwell.state?.heading)??player.face*Math.PI/2;
   const turn=Math.atan2(Math.sin(heading-boy.group.rotation.y),Math.cos(heading-boy.group.rotation.y));
   boy.group.rotation.y+=turn*(1-Math.exp(-8*dt));
  }else boy.group.rotation.y=activeClimb?activeClimb.face*Math.PI/2:THREE.MathUtils.damp(boy.group.rotation.y,player.face*Math.PI/2,8,dt);
  const motion=chapter==='street'?street.state.jump:jumpMotion;
  const contact=boy.animate({time:simTime,speed:attached?0:renderedSpeed,grounded:attached?true:player.grounded,wake:state==='intro'?0:wake,push,crouch:renderedCrouch,slide:renderedSlide,vy:player.vy,dt,travel:attached?0:travel,acceleration:acceleration*player.face,landImpact,
   jumpPrep:motion.preparing?Math.min(1,motion.elapsed/motion.duration):0,
   airTime:attached?0:motion.airTime,launchSpeed:motion.launchSpeed,landingDistance:chapter==='street'?Math.max(0,renderedY-street.supportY(renderedX)):chapter==='rooftop'?landingDistance(renderedX,renderedY,colliders()):0,takeoff:attached?0:motion.launched?Math.min(1,motion.airTime/.12):1,climb:renderedClimb,ladder:renderedLadder,slip:renderedSlip,stairs:chapter==='home'?home.state:chapter==='stairwell'?stairwell.state:null,interaction:renderedInteraction});
  if(contact?.footstep||landImpact>.35)stepSound(contact?.footstep?contact.intensity:landImpact);
  if(chapter==='rooftop'&&contact?.footstep&&player.grounded&&!mantle&&!onPlank(renderedX))water.splash({x:renderedX,y:renderedY,strength:.15});
  if(chapter==='street'&&contact?.footstep&&player.grounded&&!activeClimb)water.splash({x:renderedX,y:player.y,strength:.12});
  if(renderedSlide&&Math.abs(renderedSpeed)>1&&time-lastSlideSpray>.12){water.splash({x:renderedX,y:renderedY,strength:.16});lastSlideSpray=time;}
  water.update(dt);
  dust.update(dt);
  landImpact=0;
  const openingEvents=state==='play'&&chapter==='rooftop'?opening.update(dt,{wake,x:renderedX}):[];
  for(const event of openingEvents)if(event==='warning'||event==='edge-break')openingSound(event);
  document.body.classList.toggle('on-ladder',ladder.active);
  document.body.classList.toggle('near-exit',chapter==='stairwell'&&state==='play'&&!!stairwell.state?.nearExit);
  document.body.classList.toggle('near-object',chapter==='street'&&state==='play'&&(street.state.nearHomeDoor||player.grounded&&Math.abs(player.y)<.05&&Math.abs(Math.abs(player.x-street.state.dumpsterX)-STREET.dumpster.w/2)<.47));
  document.querySelector('[data-key="c"]').setAttribute('aria-pressed',String(chapter==='street'&&(keys.has('c')||keys.has('Control')||street.state.underLowGate)));
  document.body.classList.toggle('near-ladder',chapter==='rooftop'&&wake===1&&(canMountLadder(player)||canMountLadder(player,LEVEL.ladder,'top')));
  Object.assign(openingVisual,{active:opening.state.active,elapsed:opening.state.elapsed,wake,escaped:opening.state.escaped});
  if(chapter==='rooftop'){world.update(time,renderedX,openingVisual);world.bridge?.update(time,bridge.state);}
  else if(chapter==='stairwell')interior.update(time,stairwell.state);
  else if(chapter==='home')homeWorld.update(time,home.state);
  else{
   syncStreetArea();playgroundWorld.update(time,renderedX,street.state);
   Object.assign(drawHomeDoor,street.state.homeDoor);
   if(enteringHome)drawHomeDoor.progress=THREE.MathUtils.lerp(previousSim.homeDoorProgress??drawHomeDoor.progress,drawHomeDoor.progress,alpha);
   streetWorld.update(time,renderedX,Object.assign(drawStreet,street.state,{dumpsterX:renderedDumpsterX,homeDoor:drawHomeDoor}));
  }
  for(let i=0;i<rainCount;i++){
   const o=i*6;rainPositions[o]-=dt*.8;rainPositions[o+1]-=dt*9;
   if(rainPositions[o+1]<-6){rainPositions[o+1]=18;rainPositions[o]=cameraX+random(i+time)*62-28}
   rainPositions[o+3]=rainPositions[o]-.06;rainPositions[o+4]=rainPositions[o+1]-.28;rainPositions[o+5]=rainPositions[o+2];
  }
  rainGeometry.attributes.position.needsUpdate=true;
 }
 if(chapter==='stairwell'||chapter==='home'){
  cameraX=THREE.MathUtils.damp(cameraX,(STAIRWELL.left+STAIRWELL.right)/2,3.2,dt);
  cameraY=THREE.MathUtils.damp(cameraY,THREE.MathUtils.clamp(renderedY+.9,3.4,chapter==='home'?8.5:11.4),3,dt);
  const zoom=Math.max(18.2,15.2/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
  camera.position.set(cameraX,cameraY+1.2,zoom);camera.lookAt(cameraX,cameraY,-.2);
 }else if(chapter==='street'){
  cameraLead=THREE.MathUtils.damp(cameraLead,1.3+player.face*Math.min(.7,Math.abs(renderedSpeed)/4),2.3,dt);
  cameraX=THREE.MathUtils.damp(cameraX,renderedX,3.2,dt);
  const centerX=cameraX+cameraLead;
  camera.position.set(centerX,3.1,16.8);camera.lookAt(centerX,1.8,-1.4);
 }else{
 cameraLead=THREE.MathUtils.damp(cameraLead,1.3+player.face*Math.min(1,Math.abs(renderedSpeed)/3.35),2.3,dt);
 const wakingFocus=opening.state.active&&!opening.state.escaped?1-THREE.MathUtils.smoothstep(wake,.65,1):0;
 cameraX=THREE.MathUtils.damp(cameraX,state==='intro'?-5.5:renderedX-wakingFocus*2.2,3.2,dt);
 cameraY=THREE.MathUtils.damp(cameraY,Math.max(0,renderedY),2.8,dt);
 const centerX=cameraX+cameraLead;
 const zoom=state==='intro'?19:16.3+wakingFocus*.9;
 const impact=(!reducedMotion&&opening.state.edgeImpact>0)?Math.sin(opening.state.elapsed*46)*.027*opening.state.edgeImpact:0;
 camera.position.set(centerX+impact,5.3+cameraY+Math.abs(impact)*.3,THREE.MathUtils.damp(camera.position.z||19,zoom,1.8,dt));
 camera.lookAt(centerX,1.8+cameraY,0);
 }
 sun.position.x=renderedX+7;sun.target.position.set(renderedX+2,-1,0);sun.target.updateMatrixWorld();
 const movingShadow=Math.abs(renderedSpeed)>.04||!player.grounded||mantle||slip.active||wake<1&&state==='play';
 if(time-lastShadow>(movingShadow?(software?1/24:1/60):.16)){
  renderer.shadowMap.needsUpdate=true;lastShadow=time;
 }
 grade.uniforms.uTime.value=time;grade.uniforms.uFade.value=fade;
 if(software){const opacity=String(1-fade);if(canvas.style.opacity!==opacity)canvas.style.opacity=opacity;renderer.render(scene,camera)}else composer.render();
}
boy.group.position.set(restArea.spawnX,restArea.surfaceY,0);boy.group.rotation.y=Math.PI/2;
applySettings();updateContinue();showOverlay(intro);requestAnimationFrame(frame);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();state='pause';$('#error').hidden=false;$('#error').textContent='3D graphics were interrupted. Reload the page to continue.'});
// Non-enumerable observation hook for repeatable browser smoke tests.
Object.defineProperty(window,'__game',{value:{get state(){return state},get chapter(){return chapter},get transition(){return chapterTransition?{...chapterTransition}:null},get stairwell(){return stairwell.state?{...stairwell.state,turn:stairwell.state.turn?{...stairwell.state.turn}:undefined,snapshot:stairwell.snapshot()}:null},get interiorLayout(){return interior.metadata},get street(){return street.state?{...street.state,jump:{...street.state.jump},snapshot:street.snapshot()}:null},get streetLayout(){return streetWorld.metadata},get playgroundLayout(){return playgroundWorld.metadata},get homeDoor(){return {progress:streetWorld.homeDoor.progress,angle:streetWorld.homeDoor.angle}},get home(){return home.state?{...home.state,turn:home.state.turn?{...home.state.turn}:undefined,snapshot:home.snapshot()}:null},get homeLayout(){return homeWorld.metadata},get exitDoor(){return {progress:interior.exitDoor.progress,angle:interior.exitDoor.angle}},get actor(){const bounds=new THREE.Box3().setFromObject(boy.group);return {bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},position:{x:boy.group.position.x,y:boy.group.position.y,z:boy.group.position.z},heading:boy.group.rotation.y,probes:Object.fromEntries(['head','pelvis','leftKnee','rightKnee'].map(name=>[name,boy.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()).toArray()]))}},get sceneVisibility(){return {outdoor:world.world.visible,interior:interior.group.visible,street:streetWorld.group.visible,playground:playgroundWorld.group.visible,home:homeWorld.group.visible,rain:rain.visible||world.world.visible&&world.weather.group.visible}},get wake(){return wake},get checkpoint(){return checkpoint},get tutorials(){return {current:tutorials.current,learned:tutorials.learned}},get roofRails(){return world.world.userData.roofRails??[]},get roofGraphics(){return {city:world.world.userData.roofCity,surface:world.world.userData.roofSurface,weather:world.world.userData.roofWeather}},get settings(){return {...preferences}},get saved(){return session.getSave()},get exposure(){return renderer.toneMappingExposure},get audio(){return {muted,volume:master?.gain.value??0,state:audio?.state??'uninitialized'}},get slip(){return slip.state?{...slip.state,wobble:{...slip.state.wobble}}:null},get slipPlayed(){return slip.played},get slipsCompleted(){return slipsCompleted},get dust(){return {active:dust.activeCount,emitted:dust.emittedCount}},get ladder(){return ladder.state?{...ladder.state}:null},get laddersCompleted(){return laddersCompleted},get bridge(){return {...bridge.state,supported:bridge.supported}},get opening(){return {...opening.state}},get jump(){return {...(chapter==='street'?street.state.jump:jumpMotion)}},get animation(){return boy.group.userData.animation},get climb(){const c=chapter==='street'?street.state?.climb:mantle;return c?{...c}:null},get climbsCompleted(){return chapter==='street'?(street.state?.climbsCompleted??0):climbsCompleted},get splashes(){return {active:water.activeCount,emitted:water.emittedCount}},get software(){return software},player,get crateX(){return world.crate.position.x},get drawCalls(){return renderer.info.render.calls},get triangles(){return renderer.info.render.triangles}}});
