// All alley audio is synthesised locally. Scheduling belongs to the game's
// update loop and the AudioContext, never to independent browser timers.
export function createAlleyAudio(context,destination){
 const MAX_VOICES=24,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const supported=!!context&&!!destination&&typeof context.createGain==='function'&&typeof context.createBufferSource==='function';
 const counters={emitted:0,ignored:0,events:{},ambient:{},lastSpatial:null};
 if(!supported)return {update(){},event(){return false;},stop(){},get metadata(){return {supported:false,active:false,activeVoices:0,activeSources:0,...counters};}};
 const output=context.createGain();output.gain.value=0;output.connect(destination);
 const voices=new Set(),retiring=new Set(),cooldowns=new Map(),buffers=new Map();
 let enabled=false,clock=0,seed=0x4a61636b,playerX=2,lastState=null,lastOwnerX=null,footTravel=0;
 let rain=null,tv=null,nextPlink=.18,nextTv=1.1,nextDistant=4.6,nextTool=.8,nextBreath=1.5;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const now=()=>Number.isFinite(context.currentTime)?context.currentTime:0;
 function spatial(x,range=18){
  const distance=Number.isFinite(x)?x-playerX:0,attenuation=1/(1+(Math.abs(distance)/range)**2);
  return {x:Number.isFinite(x)?x:playerX,pan:clamp(distance/18,-.86,.86),attenuation};
 }
 function noise(seconds=1,colour='white'){
  const key=seconds+'/'+colour;if(buffers.has(key))return buffers.get(key);
  const rate=context.sampleRate||44100,buffer=context.createBuffer(1,Math.ceil(rate*seconds),rate),data=buffer.getChannelData(0);
  let low=0;for(let i=0;i<data.length;i++){const white=random()*2-1;low=.965*low+.035*white;data[i]=colour==='soft'?low*3.1:colour==='rough'?white*.65+low*.7:white;}
  buffers.set(key,buffer);return buffer;
 }
 function cleanup(voice){
  if(voice.disposed)return;voice.disposed=true;voices.delete(voice);retiring.delete(voice);
  for(const node of voice.nodes){try{node.disconnect();}catch{}}
  if(rain===voice)rain=null;if(tv===voice)tv=null;
 }
 function release(voice,fade=context.state==='running'?.025:0){
  if(!voice||voice.disposed||voice.released)return;voice.released=true;voices.delete(voice);retiring.add(voice);
  const t=now();voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(.00001,t,.006);
  for(const source of voice.sources){try{source.stop(t+fade);}catch{}}
  voice.expires=t+fade;
  if(!fade)cleanup(voice);
  while(retiring.size>MAX_VOICES)cleanup(retiring.values().next().value);
 }
 function prune(){
  const t=now();for(const voice of [...voices,...retiring])if(voice.expires<=t+.00001)cleanup(voice);
 }
 function voiceAt(x,{duration=.3,level=.025,range=18,loop=false,tag='event',delay=0}={}){
  prune();if(!enabled)return null;
  if(voices.size>=MAX_VOICES){const ambient=[...voices].find(v=>v.tag==='plink'||v.tag==='tv-phrase'||v.tag==='tools');if(ambient)release(ambient,.008);else return null;}
  const gain=context.createGain(),panner=typeof context.createStereoPanner==='function'?context.createStereoPanner():null,s=spatial(x,range),at=now()+delay;
  const value=Math.max(.00001,level*s.attenuation);gain.gain.value=0;
  if(loop){gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(value,at+.16);}
  else {gain.gain.setValueAtTime(.00001,at);gain.gain.exponentialRampToValueAtTime(value,at+Math.min(.012,duration*.12));gain.gain.exponentialRampToValueAtTime(.00001,at+duration);}
  if(panner){panner.pan.value=s.pan;gain.connect(panner);panner.connect(output);}else gain.connect(output);
  const v={gain,panner,sources:[],nodes:[gain,...(panner?[panner]:[])],expires:loop?Infinity:at+duration+.04,at,duration,loop,tag,sourceX:s.x,level,range,currentLevel:value,currentPan:s.pan,currentFrequency:null,disposed:false,released:false};
  voices.add(v);counters.emitted++;counters.lastSpatial={...s,level:value,tag};return v;
 }
 function startSource(voice,source){
  if(!voice)return;voice.sources.push(source);voice.nodes.push(source);
  source.onended=()=>{if(voice.sources.every(s=>s.__alleyEnded)){cleanup(voice);}else{source.__alleyEnded=true;if(voice.sources.every(s=>s.__alleyEnded))cleanup(voice);}};
  source.start(voice.at);if(!voice.loop)source.stop(voice.at+voice.duration+.025);
 }
 function filteredNoise(voice,{type='bandpass',frequency=800,q=.7,colour='rough',duration=1}={}){
  if(!voice)return;const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=noise(duration,colour);source.loop=voice.loop;filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;source.connect(filter);filter.connect(voice.gain);voice.nodes.push(filter);startSource(voice,source);
 }
 function tone(voice,{type='sine',frequency=220,end=frequency,level=1,filter=0}={}){
  if(!voice)return;const source=context.createOscillator(),weight=context.createGain();source.type=type;source.frequency.setValueAtTime(frequency,voice.at);source.frequency.exponentialRampToValueAtTime(Math.max(15,end),voice.at+Math.max(.02,voice.duration));weight.gain.value=level;source.connect(weight);
  if(filter){const f=context.createBiquadFilter();f.type='lowpass';f.frequency.value=filter;source.disconnect();source.connect(f);f.connect(weight);voice.nodes.push(f);}
  weight.connect(voice.gain);voice.nodes.push(weight);startSource(voice,source);
 }
 function retuneBed(voice,x,level,frequency){
  if(!voice)return;const s=spatial(x,voice.range),value=Math.max(.00001,level*s.attenuation),time=now();
  if(Math.abs(value-voice.currentLevel)>.00001){voice.gain.gain.setTargetAtTime(value,time,.18);voice.currentLevel=value;}
  if(voice.panner&&Math.abs(s.pan-voice.currentPan)>.008){voice.panner.pan.setTargetAtTime(s.pan,time,.16);voice.currentPan=s.pan;}
  if(frequency&&frequency!==voice.currentFrequency){for(const node of voice.nodes)if(node.frequency&&node.type==='lowpass')node.frequency.setTargetAtTime(frequency,time,.16);voice.currentFrequency=frequency;}
 }
 function beds(state){
  const inside=state?.area==='garage',volume=inside?.018:.029;
  if(!rain){rain=voiceAt(playerX,{loop:true,level:volume,range:60,tag:'rain'});filteredNoise(rain,{type:'lowpass',frequency:inside?1350:3600,colour:'soft',duration:3});}
  if(!tv){tv=voiceAt(92,{loop:true,level:.006,range:12,tag:'television'});filteredNoise(tv,{frequency:610,q:1.2,colour:'soft',duration:2});}
  retuneBed(rain,playerX,volume,inside?1350:3600);retuneBed(tv,92,.006);
 }
 function bark(x,close=false){
  const v=voiceAt(x,{duration:close?.25:.20,level:close?.055:.021,range:close?13:25,tag:'dog'});
  filteredNoise(v,{frequency:close?520:440,q:1.2});tone(v,{type:'sawtooth',frequency:close?164:145,end:75,level:.35,filter:950});return !!v;
 }
 function metal(x,{loud=false,delay=0}={}){
  const v=voiceAt(x,{duration:loud?1.35:.23,level:loud?.067:.018,range:loud?25:9,tag:loud?'door-creak':'jack',delay});
  filteredNoise(v,{frequency:loud?1470:2150,q:loud?2.4:.8});tone(v,{type:'triangle',frequency:loud?238:430,end:loud?116:180,level:.30});
  if(loud)tone(v,{type:'sawtooth',frequency:339,end:205,level:.11,filter:2100});return !!v;
 }
 function footstep(x,heavy=false){
  if(now()-(cooldowns.get('footfall')??-Infinity)<.20)return false;
  const v=voiceAt(x,{duration:.16,level:heavy?.034:.023,range:18,tag:'owner-steps'});
  filteredNoise(v,{frequency:470,q:.6,colour:'soft'});tone(v,{frequency:heavy?102:126,end:39,level:.44});if(v)cooldowns.set('footfall',now());return !!v;
 }
 function plink(){
  const x=playerX+(random()-.5)*21,v=voiceAt(x,{duration:.12+random()*.19,level:.0035+random()*.0045,range:15,tag:'plink'});
  tone(v,{frequency:720+random()*1550,end:410+random()*320,level:.72});filteredNoise(v,{type:'highpass',frequency:3500,colour:'white'});counters.ambient.metalRain=(counters.ambient.metalRain||0)+1;
 }
 function tvPhrase(){
  // Uneven filtered syllable-like tones suggest a distant television without
  // intelligible dialogue or a borrowed recording.
  const count=3+Math.floor(random()*3);
  for(let i=0;i<count;i++){
   const duration=.11+random()*.12,v=voiceAt(92,{duration,level:.012,range:12,delay:i*.26,tag:'tv-phrase'});
   tone(v,{type:'triangle',frequency:133+random()*65,end:120+random()*40,level:.50,filter:1050});filteredNoise(v,{frequency:530+random()*270,q:1.5,colour:'soft'});
  }
  counters.ambient.television=(counters.ambient.television||0)+1;
 }
 function tool(x=73){
  const v=voiceAt(x,{duration:.13,level:.031,range:13,tag:'tools'});
  filteredNoise(v,{frequency:1800,q:1.3});tone(v,{type:'triangle',frequency:775,end:390,level:.44});counters.ambient.tools=(counters.ambient.tools||0)+1;
 }
 function ownerPosition(state){return Number.isFinite(state?.owner?.x)?state.owner.x:115;}
 function event(kind,{player,state}={}){
  if(!enabled){counters.ignored++;return false;}
  if(Number.isFinite(player?.x))playerX=player.x;state=state??lastState;const t=now(),dogX=state?.dog?.x??23,jackX=state?.jackVisual?.x??110;
  const interval=kind==='jack-crank'?.28:kind==='owner-steps'?.23:kind==='door-creak'?1.1:kind==='dog-bark'?.22:.12;
  if(t-(cooldowns.get(kind)??-Infinity)<interval){counters.ignored++;return false;}
  let played=false;
  if(kind==='dog-bark')played=bark(dogX,true);
  else if(kind==='dog-wake'){
   const v=voiceAt(dogX,{duration:.48,level:.025,range:12,tag:'dog-wake'});tone(v,{type:'sawtooth',frequency:126,end:83,level:.42,filter:550});filteredNoise(v,{frequency:250,colour:'soft'});played=!!v;
  }else if(kind==='door-creak')played=metal(110,{loud:true});
  else if(kind==='jack-crank')played=metal(jackX);
  else if(kind==='jack-pickup'||kind==='jack-place'){played=metal(jackX);}
  else if(kind==='door-raised'||kind==='owner-enter'){
   const arrival=kind==='owner-enter',v=voiceAt(110,{duration:arrival?.50:.31,level:arrival?.045:.026,range:20,tag:arrival?'owner-enter':'door-ratchet'});
   filteredNoise(v,{frequency:arrival?610:1280,q:.9});tone(v,{type:'triangle',frequency:arrival?111:186,end:48,level:.44});played=!!v;
  }
  else if(kind==='owner-steps')played=footstep(ownerPosition(state),state?.owner?.phase==='chase');
  else if(kind==='yard-alert'){
   const v=voiceAt(ownerPosition(state),{duration:.55,level:.030,range:22,tag:'owner-alert'});filteredNoise(v,{frequency:330,q:1.8,colour:'soft'});tone(v,{type:'triangle',frequency:118,end:86,level:.28,filter:700});played=!!v;
  }else if(kind==='window-light'||kind==='window-open'||kind==='window-exit'||kind==='garage-enter'||kind==='complete'){
   const v=voiceAt(kind==='window-open'||kind==='window-exit'?137.8:playerX,{duration:kind==='window-open'?.45:.18,level:kind==='window-light'?.011:.019,range:12,tag:'latch'});filteredNoise(v,{frequency:kind==='garage-enter'?760:1780,q:1.1});tone(v,{frequency:kind==='window-open'?380:670,end:110,level:.18});played=!!v;
  }else if(kind==='caught'){
   const v=voiceAt(playerX,{duration:.38,level:.045,tag:'caught'});filteredNoise(v,{frequency:420,colour:'soft'});tone(v,{frequency:81,end:31,level:.40});played=!!v;
  }else if(kind==='retry'){stop();return true;}
  if(played){cooldowns.set(kind,t);counters.events[kind]=(counters.events[kind]||0)+1;}return played;
 }
 function stop(){
  enabled=false;for(const v of [...voices])release(v);rain=tv=null;cooldowns.clear();lastOwnerX=null;footTravel=0;clock=0;
  nextPlink=.18;nextTv=1.1;nextDistant=4.6;nextTool=.8;nextBreath=1.5;prune();
 }
 function update(dt,{active=false,playing=false,player,state}={}){
  const allowed=!!active&&!!playing&&context.state!=='closed'&&context.state!=='suspended';
  if(!allowed){if(enabled||voices.size)stop();else prune();return;}
  prune();if(Number.isFinite(player?.x))playerX=player.x;lastState=state??lastState;
  if(!enabled){enabled=true;output.gain.cancelScheduledValues(now());output.gain.setValueAtTime(0,now());output.gain.linearRampToValueAtTime(1,now()+.08);}
  beds(lastState);
  if(!Number.isFinite(dt)||dt<=0)return;clock+=Math.min(dt,.25);
  if(clock>=nextPlink){plink();nextPlink=clock+.16+random()*.30;}
  if(clock>=nextTv){tvPhrase();nextTv=clock+2.8+random()*2.6;}
  if(clock>=nextDistant){bark(playerX+(random()>.5?1:-1)*(25+random()*16));nextDistant=clock+8+random()*8;counters.ambient.distantDogs=(counters.ambient.distantDogs||0)+1;}
  if(clock>=nextTool){if(Math.abs(playerX-73)<28&&lastState?.area!=='yard')tool();nextTool=clock+1.6+random()*2.7;}
  if(clock>=nextBreath){
   if(lastState?.dog?.phase==='sleep'&&Math.abs(playerX-(lastState.dog.x??23))<8){const v=voiceAt(lastState.dog.x??23,{duration:.6,level:.010,range:7,tag:'dog-breath'});filteredNoise(v,{frequency:170,q:1.1,colour:'soft'});}
   nextBreath=clock+3.5+random()*1.5;
  }
  const owner=lastState?.owner,moving=owner&&['approach','inspect','patrol','chase'].includes(owner.phase);
  if(moving&&Number.isFinite(owner.x)){
   if(lastOwnerX!==null)footTravel+=Math.min(.5,Math.abs(owner.x-lastOwnerX));
   if(footTravel>.64){footstep(owner.x,owner.phase==='chase');footTravel%=.64;}
   lastOwnerX=owner.x;
  }else{lastOwnerX=null;footTravel=0;}
 }
 return {update,event,stop,get metadata(){prune();return {supported:true,active:enabled,activeVoices:voices.size,activeSources:[...voices].reduce((n,v)=>n+v.sources.length,0),fadingVoices:retiring.size,limit:MAX_VOICES,emitted:counters.emitted,ignored:counters.ignored,events:{...counters.events},ambient:{...counters.ambient},lastSpatial:counters.lastSpatial?{...counters.lastSpatial}:null};}};
}
