// Locally generated rain, cloth and shop sounds. Only the simulation calls
// update/event; pause and chapter changes own the lifetime of every source.
export function createMarketAudio(context,destination){
 const LIMIT=24,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const counters={emitted:0,ignored:0,events:{},ambient:{},lastSpatial:null};
 const supported=!!context&&!!destination&&typeof context.createGain==='function'&&typeof context.createBufferSource==='function';
 if(!supported)return {update(){},event(){return false;},stop(){},get metadata(){return {supported:false,active:false,activeVoices:0,activeSources:0,fadingVoices:0,limit:LIMIT,...counters};}};
 const output=context.createGain();output.gain.value=0;output.connect(destination);
 const voices=new Set(),retiring=new Set(),cooldowns=new Map(),buffers=new Map();
 let active=false,playerX=2,lastState=null,clock=0,seed=0x4d61726b;
 let rain=null,air=null,fridge=null,nextRain=.20,nextMarket=2.1,lastVendorX=null,footTravel=0;
 const now=()=>Number.isFinite(context.currentTime)?context.currentTime:0;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const sourcesOf=voice=>voice.sources.filter(source=>!source.__marketEnded).length;
 const sourceCount=()=>[...voices,...retiring].reduce((sum,voice)=>sum+sourcesOf(voice),0);
 function spatial(x,range=16){const dx=Number.isFinite(x)?x-playerX:0;return{x:Number.isFinite(x)?x:playerX,pan:clamp(dx/16,-.86,.86),attenuation:1/(1+(Math.abs(dx)/range)**2)};}
 function cleanup(voice){
  if(!voice||voice.disposed)return;voice.disposed=true;voices.delete(voice);retiring.delete(voice);
  for(const node of voice.nodes)try{node.disconnect();}catch{}
  if(rain===voice)rain=null;if(air===voice)air=null;if(fridge===voice)fridge=null;
 }
 function release(voice){
  if(!voice||voice.disposed||voice.released)return;
  voice.released=true;voices.delete(voice);retiring.add(voice);const t=now(),fade=context.state==='running'?.025:0;
  voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(.00001,t,.006);
  for(const source of voice.sources)try{source.stop(t+fade);}catch{}
  voice.expires=t+fade;if(!fade)cleanup(voice);
 }
 function prune(){const t=now();for(const voice of [...voices,...retiring])if(voice.expires<=t+.00001)cleanup(voice);}
 function noise(seconds=2,soft=false){
  const key=seconds+'/'+soft;if(buffers.has(key))return buffers.get(key);
  const rate=context.sampleRate||44100,buffer=context.createBuffer(1,Math.ceil(rate*seconds),rate),data=buffer.getChannelData(0);let low=0;
  for(let i=0;i<data.length;i++){const white=random()*2-1;low=.96*low+.04*white;data[i]=soft?low*3:white*.58+low*.6;}
  buffers.set(key,buffer);return buffer;
 }
 function voiceAt(x,{duration=.3,level=.02,range=16,loop=false,tag='event',delay=0}={}){
  prune();if(!active||sourceCount()>LIMIT-3){counters.ignored++;return null;}
  const gain=context.createGain(),panner=context.createStereoPanner?.(),s=spatial(x,range),at=now()+delay,volume=Math.max(.00001,level*s.attenuation);
  gain.gain.setValueAtTime(.00001,at);
  if(loop)gain.gain.linearRampToValueAtTime(volume,at+.15);
  else{gain.gain.exponentialRampToValueAtTime(volume,at+Math.min(.012,duration*.10));gain.gain.exponentialRampToValueAtTime(.00001,at+duration);}
  if(panner){panner.pan.value=s.pan;gain.connect(panner);panner.connect(output);}else gain.connect(output);
  const voice={gain,panner,nodes:[gain,...(panner?[panner]:[])],sources:[],at,duration,range,loop,tag,expires:loop?Infinity:at+duration+.04,volume,pan:s.pan,filterFrequency:null,released:false,disposed:false};
  voices.add(voice);counters.emitted++;counters.lastSpatial={...s,level:volume,tag};return voice;
 }
 function start(voice,source){
  if(!voice)return false;
  if(sourceCount()>=LIMIT){try{source.disconnect();}catch{}return false;}
  voice.sources.push(source);voice.nodes.push(source);source.onended=()=>{source.__marketEnded=true;if(voice.sources.every(s=>s.__marketEnded))cleanup(voice);};
  source.start(voice.at);if(!voice.loop)source.stop(voice.at+voice.duration+.025);return true;
 }
 function rustle(voice,{frequency=900,q=.7,type='bandpass',soft=false,seconds=2}={}){
  if(!voice)return;const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=noise(seconds,soft);source.loop=voice.loop;filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;source.connect(filter);filter.connect(voice.gain);voice.nodes.push(filter);start(voice,source);
 }
 function tone(voice,{frequency=220,end=frequency,type='sine',weight=.3,cutoff=0}={}){
  if(!voice)return;const source=context.createOscillator(),gain=context.createGain();source.type=type;source.frequency.setValueAtTime(frequency,voice.at);source.frequency.exponentialRampToValueAtTime(Math.max(18,end),voice.at+voice.duration);gain.gain.value=weight;
  source.connect(gain);if(cutoff){const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=cutoff;source.disconnect();source.connect(filter);filter.connect(gain);voice.nodes.push(filter);}
  gain.connect(voice.gain);voice.nodes.push(gain);start(voice,source);
 }
 function retune(voice,x,level,frequency){
  if(!voice)return;const s=spatial(x,voice.range),volume=Math.max(.00001,level*s.attenuation),t=now();
  if(Math.abs(volume-voice.volume)>.00001){voice.gain.gain.setTargetAtTime(volume,t,.18);voice.volume=volume;}
  if(voice.panner&&Math.abs(s.pan-voice.pan)>.008){voice.panner.pan.setTargetAtTime(s.pan,t,.18);voice.pan=s.pan;}
  if(frequency&&frequency!==voice.filterFrequency){for(const node of voice.nodes)if(node.type==='lowpass'&&node.frequency)node.frequency.setTargetAtTime(frequency,t,.18);voice.filterFrequency=frequency;}
 }
 function ambience(state){
  const market=state?.area==='market',awning=state?.area==='awning',cloth=market||awning;
  if(!rain){rain=voiceAt(playerX,{loop:true,level:.026,range:80,tag:'rain'});rustle(rain,{frequency:cloth?1900:3300,type:'lowpass',soft:true,seconds:3});}
  if(!air){air=voiceAt(95,{loop:true,level:.004,range:20,tag:'market-air'});rustle(air,{frequency:540,q:.6,soft:true,seconds:3});}
  retune(rain,playerX,cloth?.021:.026,cloth?1900:3300);retune(air,95,market?.008:.002);
  if(Math.abs(playerX-25)<15){
   if(!fridge){fridge=voiceAt(25,{loop:true,level:.005,range:7,tag:'kiosk-hum'});tone(fridge,{frequency:98,type:'triangle',weight:.4,cutoff:260});}
   retune(fridge,25,.005);
  }else if(fridge){release(fridge);fridge=null;}
 }
 function footstep(x,running=false){
  if(now()-(cooldowns.get('vendor-footfall')??-Infinity)<.18)return false;
  const voice=voiceAt(x,{duration:running?.14:.17,level:running?.031:.022,range:15,tag:'vendor-footstep'});
  rustle(voice,{frequency:450,soft:true});tone(voice,{frequency:running?105:125,end:38,weight:.34});
  if(voice){cooldowns.set('vendor-footfall',now());counters.ambient.vendorSteps=(counters.ambient.vendorSteps||0)+1;}return !!voice;
 }
 function rainDrop(state){
  const cloth=state?.area==='market'||state?.area==='awning',x=playerX+(random()-.5)*18;
  const voice=voiceAt(x,{duration:cloth?.15:.12,level:cloth?.003:.005,range:12,tag:cloth?'canvas-rain':'kiosk-rain'});
  rustle(voice,{frequency:cloth?1100:2700,type:cloth?'lowpass':'bandpass',soft:cloth});if(!cloth)tone(voice,{frequency:880+random()*1500,end:470,weight:.30});
  counters.ambient[cloth?'canvasRain':'metalRain']=(counters.ambient[cloth?'canvasRain':'metalRain']||0)+1;
 }
 function marketSound(){
  const x=88+random()*19,voice=voiceAt(x,{duration:.25,level:.007,range:15,tag:'market-rigging'});
  rustle(voice,{frequency:760,q:1.5,soft:true});tone(voice,{type:'triangle',frequency:210+random()*120,end:120,weight:.15});counters.ambient.rigging=(counters.ambient.rigging||0)+1;
 }
 const aliases={'grab-food':'food-taken','vendor-alert':'vendor-notice','vendor-shout':'vendor-notice','chase-start':'chase','vendor-chase':'chase','vault':'rail-vault','awning-land':'awning-impact','landing':'market-land','eat-food':'eat','vendor-steps':'vendor-step'};
 function event(name,{player,state}={}){
  if(name==='retry'){stop();return true;}
  if(!active||context.state!=='running'){counters.ignored++;return false;}
  if(Number.isFinite(player?.x))playerX=player.x;state=state??lastState;const kind=aliases[name]??name,t=now();
  const interval=kind==='vendor-notice'||kind==='chase'?1.8:kind==='hunger'?1:kind==='awning-impact'?.7:.15;
  if(t-(cooldowns.get(kind)??-Infinity)<interval){counters.ignored++;return false;}
  const vendorX=Number.isFinite(state?.vendor?.x)?state.vendor.x:27.4;let voice=null;
  if(kind==='hunger'){
   voice=voiceAt(playerX,{duration:.75,level:.023,range:5,tag:'hunger'});rustle(voice,{frequency:110,q:1.0,soft:true});tone(voice,{frequency:90,end:42,weight:.33,cutoff:200});
  }else if(kind==='take-food'){
   voice=voiceAt(25,{duration:.19,level:.012,range:8,tag:'sleeve-reach'});rustle(voice,{frequency:880,q:.6,soft:true});
  }else if(kind==='food-taken'){
   voice=voiceAt(25,{duration:.40,level:.024,range:9,tag:'food-paper'});rustle(voice,{frequency:1700,q:.6});tone(voice,{type:'triangle',frequency:1450,end:1120,weight:.13});
  }else if(kind==='vendor-notice'||kind==='chase'){
   voice=voiceAt(vendorX,{duration:.50,level:.029,range:22,tag:'vendor-notice'});rustle(voice,{frequency:380,q:1.4,soft:true});tone(voice,{type:'triangle',frequency:150,end:104,weight:.22,cutoff:900});
  }else if(kind==='vendor-stop'){
   voice=voiceAt(vendorX,{duration:.32,level:.017,range:16,tag:'vendor-brake'});rustle(voice,{frequency:730,q:.8,soft:true});tone(voice,{frequency:105,end:55,weight:.12});
  }else if(kind==='vendor-step')return footstep(vendorX,state?.vendor?.phase==='chase');
  else if(kind==='rail-vault'){
   voice=voiceAt(66,{duration:.34,level:.024,range:12,tag:'railing'});rustle(voice,{frequency:2100,q:1.6});tone(voice,{type:'triangle',frequency:450,end:190,weight:.20});
  }else if(kind==='awning-impact'){
   voice=voiceAt(playerX,{duration:.60,level:.039,range:15,tag:'soft-canvas-impact'});rustle(voice,{frequency:210,q:.6,soft:true});tone(voice,{frequency:65,end:30,weight:.35});tone(voice,{type:'triangle',frequency:235,end:110,weight:.11});
  }else if(kind==='awning-drop'){
   voice=voiceAt(playerX,{duration:.32,level:.018,range:11,tag:'cloth-slide'});rustle(voice,{frequency:980,q:.6,soft:true});
  }else if(kind==='market-land'){
   voice=voiceAt(playerX,{duration:.29,level:.034,range:12,tag:'market-landing'});rustle(voice,{frequency:290,q:.5,soft:true});tone(voice,{frequency:92,end:35,weight:.32});
  }else if(kind==='eat'){
   voice=voiceAt(playerX,{duration:.36,level:.013,range:5,tag:'bread-crunch'});rustle(voice,{frequency:980,q:.6});
  }else if(kind==='caught'){
   voice=voiceAt(playerX,{duration:.37,level:.028,range:9,tag:'cloth-scuffle'});rustle(voice,{frequency:430,soft:true});tone(voice,{frequency:94,end:54,weight:.18});
  }else if(kind==='complete'){
   voice=voiceAt(playerX,{duration:.4,level:.012,range:6,tag:'quiet-breath'});rustle(voice,{frequency:610,q:.6,soft:true});
  }
  if(voice){cooldowns.set(kind,t);counters.events[name]=(counters.events[name]||0)+1;return true;}return false;
 }
 function stop(){
  active=false;for(const voice of [...voices])release(voice);rain=air=fridge=null;cooldowns.clear();clock=0;nextRain=.2;nextMarket=2.1;lastVendorX=null;footTravel=0;prune();
 }
 function update(dt,{active:allowed=false,playing=false,player,state}={}){
  if(!allowed||!playing||context.state!=='running'){if(active||voices.size)stop();else prune();return;}
  prune();if(Number.isFinite(player?.x))playerX=player.x;lastState=state??lastState;
  if(!active){active=true;output.gain.cancelScheduledValues(now());output.gain.setValueAtTime(0,now());output.gain.linearRampToValueAtTime(1,now()+.08);}
  ambience(lastState);if(!Number.isFinite(dt)||dt<=0)return;clock+=Math.min(dt,.25);
  if(clock>=nextRain){rainDrop(lastState);nextRain=clock+.17+random()*.37;}
  if(clock>=nextMarket){if(lastState?.area==='market')marketSound();nextMarket=clock+2.4+random()*3.5;}
  const vendor=lastState?.vendor,moving=vendor&&['exit','exiting','chase','pursuit'].includes(vendor.phase);
  if(moving&&Number.isFinite(vendor.x)){
   if(lastVendorX!==null)footTravel+=Math.min(.5,Math.abs(vendor.x-lastVendorX));
   if(footTravel>.66){footstep(vendor.x,vendor.phase==='chase'||vendor.phase==='pursuit');footTravel%=.66;}lastVendorX=vendor.x;
  }else{lastVendorX=null;footTravel=0;}
 }
 return {update,event,stop,get metadata(){prune();return {supported:true,active,limit:LIMIT,activeVoices:voices.size,activeSources:[...voices].reduce((n,v)=>n+sourcesOf(v),0),fadingVoices:retiring.size,totalSources:sourceCount(),emitted:counters.emitted,ignored:counters.ignored,events:{...counters.events},ambient:{...counters.ambient},lastSpatial:counters.lastSpatial?{...counters.lastSpatial}:null};}};
}
