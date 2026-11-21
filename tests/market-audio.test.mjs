import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketAudio} from '../src/market-audio.js';

class Parameter{
 constructor(value=0){this.value=value;this.calls=[];}
 setValueAtTime(value,time){assert(Number.isFinite(value)&&Number.isFinite(time));this.value=value;this.calls.push(['set',value,time]);}
 exponentialRampToValueAtTime(value,time){assert(value>0);this.setValueAtTime(value,time);}
 linearRampToValueAtTime(value,time){this.setValueAtTime(value,time);}
 setTargetAtTime(value,time,constant){assert(constant>0);this.setValueAtTime(value,time);}
 cancelScheduledValues(time){assert(Number.isFinite(time));}
}
class Node{
 constructor(context){this.context=context;this.connections=[];this.disconnected=false;this.gain=new Parameter(1);this.frequency=new Parameter(220);this.Q=new Parameter(1);this.pan=new Parameter(0);context.nodes.push(this);}
 connect(node){this.connections.push(node);return node;}
 disconnect(){this.connections=[];this.disconnected=true;}
}
class Source extends Node{
 constructor(context){super(context);this.loop=false;this.started=false;this.ended=false;this.stopAt=Infinity;context.sources.push(this);}
 start(at=0){assert(!this.started);assert(Number.isFinite(at));this.started=true;this.startAt=at;}
 stop(at=0){assert(this.started);assert(Number.isFinite(at));this.stopAt=at;}
}
class Context{
 constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.nodes=[];this.sources=[];this.destination=new Node(this);}
 createGain(){return new Node(this);}
 createBiquadFilter(){return new Node(this);}
 createStereoPanner(){return new Node(this);}
 createBufferSource(){return new Source(this);}
 createOscillator(){return new Source(this);}
 createBuffer(channels,length,rate){const data=new Float32Array(length);return{duration:length/rate,getChannelData(){return data;}};}
 advance(seconds){this.currentTime+=seconds;for(const s of this.sources){const natural=s.buffer&&!s.loop?s.startAt+s.buffer.duration:Infinity;if(s.started&&!s.ended&&Math.min(s.stopAt,natural)<=this.currentTime){s.ended=true;s.onended?.();}}}
}
const setup=()=>{
 const context=new Context(),master=context.createGain();master.gain.value=.42;master.connect(context.destination);
 return{context,master,audio:createMarketAudio(context,master),p:{x:2},s:{area:'approach',vendor:{phase:'idle',x:27.4,y:0,z:-1}}};
};
const update=(r,dt=1/60)=>r.audio.update(dt,{active:true,playing:true,player:r.p,state:r.s});

test('market ambience starts only during gameplay and shares the existing master volume',()=>{
 const r=setup();assert.equal(r.audio.event('hunger',{player:r.p,state:r.s}),false);assert.equal(r.context.sources.length,0);
 r.audio.update(.1,{active:false,playing:true,player:r.p,state:r.s});assert.equal(r.context.sources.length,0);
 update(r);assert.equal(r.audio.metadata.activeVoices,2);assert.equal(r.master.gain.value,.42);
 assert.equal(r.context.nodes.filter(n=>n.connections.includes(r.master)).length,1);
 for(let i=0;i<8;i++)update(r,0);assert.equal(r.context.sources.filter(s=>s.loop).length,2);
 r.p.x=24.5;update(r,0);assert.equal(r.audio.metadata.activeVoices,3,'The kiosk adds a single local compressor, not another rain bed.');
 r.p.x=60;update(r,0);r.context.advance(.03);assert.equal(r.audio.metadata.activeVoices,2);
});

test('pause, mute, retry and chapter exit stop every active source within25ms',()=>{
 for(const reason of['pause','mute','retry','exit']){
  const r=setup();r.p.x=25;update(r);r.audio.event('awning-impact',{player:r.p,state:r.s});
  if(reason==='retry')assert(r.audio.event('retry'));
  else r.audio.update(.016,{active:reason==='pause',playing:reason!=='pause',player:r.p,state:r.s});
  assert.equal(r.audio.metadata.activeVoices,0);assert.equal(r.audio.metadata.activeSources,0);
  assert(r.context.sources.every(s=>s.stopAt<=r.context.currentTime+.0251));
  assert.equal(r.audio.event('vendor-notice'),false);r.context.advance(.03);assert.equal(r.audio.metadata.fadingVoices,0);
  assert(r.context.sources.every(s=>s.ended));update(r,0);assert.equal(r.audio.metadata.activeVoices,3);
 }
});

test('food, railing, cloth and vendor cues follow their actual world positions',()=>{
 const r=setup();r.p.x=20;update(r,0);
 assert(r.audio.event('take-food',{player:r.p,state:r.s}));let s=r.audio.metadata.lastSpatial;assert.equal(s.x,25);assert(s.pan>0);
 r.context.advance(1);r.p.x=34;r.s.vendor.x=29;assert(r.audio.event('vendor-notice',{player:r.p,state:r.s}));s=r.audio.metadata.lastSpatial;assert.equal(s.x,29);assert(s.pan<0);
 r.context.advance(1);r.p.x=65.5;assert(r.audio.event('rail-vault',{player:r.p,state:r.s}));assert.equal(r.audio.metadata.lastSpatial.x,66);
 r.context.advance(1);r.p.x=69;assert(r.audio.event('awning-impact',{player:r.p,state:r.s}));const near=r.audio.metadata.lastSpatial;assert.equal(near.x,69);assert.equal(near.pan,0);
 r.context.advance(1);r.p.x=100;assert(r.audio.event('take-food',{player:r.p,state:r.s}));assert(r.audio.metadata.lastSpatial.level<near.level*.1);
});

test('footsteps use vendor travel and remain silent when the vendor stops or freezes',()=>{
 const r=setup();r.p.x=32;r.s.vendor={phase:'chase',x:24,y:0,z:1.4};update(r,0);
 for(let i=0;i<60;i++){r.context.advance(1/60);update(r);}assert.equal(r.audio.metadata.ambient.vendorSteps??0,0);
 const emitted=r.audio.metadata.emitted;
 for(let i=0;i<60;i++){r.context.advance(1/60);r.s.vendor.x+=2.8/60;update(r);}
 assert(r.audio.metadata.emitted>emitted+2,'A running seller must make more than rain sounds.');
 assert(r.audio.metadata.ambient.vendorSteps>=3);
 assert(r.context.sources.some(s=>!s.loop&&s.frequency.calls.some(c=>c[1]===105)),'Chase footsteps should use the running weight.');
 r.s.vendor.phase='stopped';const footfalls=r.context.sources.filter(s=>s.frequency.calls.some(c=>c[1]===105)).length;
 for(let i=0;i<60;i++){r.context.advance(1/60);update(r);}assert.equal(r.context.sources.filter(s=>s.frequency.calls.some(c=>c[1]===105)).length,footfalls);
});

test('cloth impact, notice and paper cues cannot exceed the24-source budget or leak after long play',()=>{
 const r=setup();update(r,0);
 const cues=['hunger','take-food','food-taken','vendor-notice','vendor-chase','vendor-stop','rail-vault','awning-impact','awning-drop','market-land','eat','caught','complete'];
 for(let n=0;n<900;n++){
  r.context.advance(.03);r.p.x=2+(n%115);r.s.area=n%2?'market':'chase';update(r,.03);
  for(const cue of cues)r.audio.event(cue,{player:r.p,state:r.s});
  assert(r.audio.metadata.totalSources<=24);assert(r.audio.metadata.activeSources<=24);assert(r.audio.metadata.activeVoices<=24);
 }
 assert(r.audio.metadata.ignored>0);r.audio.stop();r.context.advance(.1);
 assert.equal(r.audio.metadata.totalSources,0);assert.equal(r.audio.metadata.activeVoices,0);assert.equal(r.audio.metadata.fadingVoices,0);
 assert(r.context.sources.every(s=>s.ended),'Every generated source needs a finite stop path.');
});

test('a suspended context and a dropped frame create no sound backlog when gameplay resumes',()=>{
 const r=setup();update(r,0);r.context.advance(120);update(r,0);assert.equal(r.audio.metadata.activeVoices,2);
 const before=r.context.sources.length;r.context.state='suspended';update(r,.2);assert.equal(r.audio.metadata.activeVoices,0);assert.equal(r.audio.metadata.fadingVoices,0);
 assert.equal(r.context.sources.length,before);r.context.state='running';update(r,0);assert.equal(r.audio.metadata.activeVoices,2);
 r.context.state='closed';update(r,.1);assert.equal(r.audio.metadata.activeSources,0);
});

test('missing WebAudio receives an inactive adapter and unknown events allocate nothing',()=>{
 const absent=createMarketAudio(null,null);absent.update(.1,{active:true,playing:true});assert.equal(absent.event('hunger'),false);absent.stop();assert.equal(absent.metadata.supported,false);
 const r=setup();update(r,0);const n=r.context.sources.length;assert.equal(r.audio.event('not-a-game-event'),false);assert.equal(r.context.sources.length,n);
});
