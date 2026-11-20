import test from 'node:test';
import assert from 'node:assert/strict';
import {createAlleyAudio} from '../src/alley-audio.js';

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
 createBuffer(channels,length,rate){const data=new Float32Array(length);return {duration:length/rate,getChannelData(){return data;}};}
 advance(seconds){
  this.currentTime+=seconds;
  for(const s of this.sources){
   const natural=s.buffer&&!s.loop?s.startAt+s.buffer.duration:Infinity;
   if(s.started&&!s.ended&&Math.min(s.stopAt,natural)<=this.currentTime){s.ended=true;s.onended?.();}
  }
 }
}
const state=()=>({area:'alley',dog:{x:23,phase:'sleep'},owner:{x:115,phase:'repair'},jackVisual:{x:82}});
const setup=()=>{const context=new Context(),master=context.createGain();master.gain.value=.37;master.connect(context.destination);const audio=createAlleyAudio(context,master);return {context,master,audio,s:state(),p:{x:20}};};
const play=r=>r.audio.update(1/60,{active:true,playing:true,player:r.p,state:r.s});

test('the optional radio follows its switch and all branch cues stop with pause',()=>{
 const r=setup();r.p.x=92.3;r.s.area='storage';r.s.radioOn=true;play(r);
 assert.equal(r.audio.metadata.activeVoices,3);
 for(let n=0;n<4;n++)play(r);assert.equal(r.audio.metadata.activeVoices,3,'A radio must reuse its continuous source.');
 r.s.radioOn=false;play(r);r.context.advance(.05);assert.equal(r.audio.metadata.activeVoices,2);
 for(const event of ['storage-enter','storage-exit','key-pickup','radio-toggle','gate-unlock','chain-rattle'])assert(r.audio.event(event,{player:r.p,state:r.s}));
 r.audio.update(.016,{active:true,playing:false,player:r.p,state:r.s});r.context.advance(.05);
 assert.equal(r.audio.metadata.activeSources,0);assert.equal(r.audio.metadata.fadingVoices,0);
});

test('alley sounds stay silent until gameplay enables them and route through the master volume',()=>{
 const r=setup();
 assert.equal(r.audio.event('dog-bark',{player:r.p,state:r.s}),false);assert.equal(r.context.sources.length,0);
 r.audio.update(.1,{active:false,playing:true,player:r.p,state:r.s});assert.equal(r.context.sources.length,0);
 play(r);assert(r.audio.metadata.active);assert.equal(r.audio.metadata.activeVoices,2);assert.equal(r.master.gain.value,.37);
 const outputs=r.context.nodes.filter(n=>n.connections.includes(r.master));assert.equal(outputs.length,1,'Only the alley bus should feed the existing volume control.');
 assert.equal(r.context.sources.filter(n=>n.loop).length,2,'Rain and distant TV beds should be shared, not rebuilt each frame.');
 for(let i=0;i<5;i++)play(r);assert.equal(r.context.sources.filter(n=>n.loop).length,2);
});

test('pause, mute and chapter exit silence every scheduled source and resume without old cues',()=>{
 const r=setup();play(r);assert(r.audio.event('door-creak',{player:r.p,state:r.s}));
 r.audio.update(.016,{active:true,playing:false,player:r.p,state:r.s});
 assert.equal(r.audio.metadata.active,false);assert.equal(r.audio.metadata.activeVoices,0);assert.equal(r.audio.metadata.activeSources,0);
 assert(r.context.sources.every(s=>s.stopAt<=r.context.currentTime+.026),'A scheduled cue must not leak beyond the short fade.');
 assert.equal(r.audio.event('dog-bark',{player:r.p,state:r.s}),false);r.context.advance(.05);assert.equal(r.audio.metadata.fadingVoices,0);
 const oldSources=[...r.context.sources];play(r);assert.equal(r.audio.metadata.activeVoices,2);assert(oldSources.every(s=>s.ended));
 r.audio.update(.016,{active:false,playing:true});assert.equal(r.audio.metadata.activeVoices,0);r.context.advance(.05);assert.equal(r.audio.metadata.fadingVoices,0);
 play(r);r.audio.stop();r.audio.stop();r.context.advance(.05);assert.equal(r.audio.metadata.activeVoices,0);assert.equal(r.audio.metadata.fadingVoices,0);
});

test('spatial cues follow the dog, tool and listener instead of remaining fixed in the centre',()=>{
 const r=setup();play(r);r.p.x=10;assert(r.audio.event('dog-bark',{player:r.p,state:r.s}));
 const right=r.audio.metadata.lastSpatial;assert.equal(right.x,23);assert(right.pan>0);assert(right.attenuation<1);
 r.context.advance(.3);r.p.x=35;assert(r.audio.event('dog-bark',{player:r.p,state:r.s}));const left=r.audio.metadata.lastSpatial;assert(left.pan<0);
 r.context.advance(.3);r.p.x=82;assert(r.audio.event('jack-pickup',{player:r.p,state:r.s}));const near=r.audio.metadata.lastSpatial;
 assert.equal(near.x,82);assert.equal(near.pan,0);assert.equal(near.attenuation,1);
 r.context.advance(.4);r.p.x=140;assert(r.audio.event('jack-pickup',{player:r.p,state:r.s}));assert(r.audio.metadata.lastSpatial.level<near.level*.1);
});

test('holding the jack key cannot stack unlimited creaks or ratchet voices',()=>{
 const r=setup();play(r);
 for(let i=0;i<2000;i++){r.audio.event('jack-crank',{player:r.p,state:r.s});r.audio.event('door-creak',{player:r.p,state:r.s});}
 assert.equal(r.audio.metadata.events['jack-crank'],1);assert.equal(r.audio.metadata.events['door-creak'],1);assert(r.audio.metadata.activeVoices<=4);
 for(let i=0;i<1000;i++){
  r.context.advance(.1);r.audio.update(.1,{active:true,playing:true,player:r.p,state:r.s});r.audio.event('jack-crank',{player:r.p,state:r.s});
  assert(r.audio.metadata.activeVoices<=r.audio.metadata.limit);assert(r.audio.metadata.activeSources<=72);assert(r.audio.metadata.fadingVoices<=24);
 }
 r.audio.stop();r.context.advance(.1);assert.equal(r.audio.metadata.activeVoices,0);assert.equal(r.audio.metadata.fadingVoices,0);
 assert(r.context.sources.every(s=>s.ended),'Every started source must have a finite cleanup path.');
});

test('dropped frames do not replay a backlog and a suspended context creates no inaudible sources',()=>{
 const r=setup();play(r);r.context.advance(120);r.audio.update(.1,{active:true,playing:true,player:r.p,state:r.s});
 assert.equal(r.audio.metadata.activeVoices,2,'A time jump should not emit all missed ambience events.');
 r.context.state='suspended';const before=r.context.sources.length;r.audio.update(.2,{active:true,playing:true,player:r.p,state:r.s});
 assert.equal(r.audio.metadata.activeVoices,0);assert.equal(r.audio.metadata.fadingVoices,0);assert.equal(r.context.sources.length,before);
 r.context.state='running';play(r);assert.equal(r.audio.metadata.activeVoices,2);
 r.audio.stop();r.context.advance(.1);assert.equal(r.audio.metadata.activeVoices,0);
});

test('a browser without WebAudio receives a harmless inactive adapter',()=>{
 const audio=createAlleyAudio(null,null);audio.update(.1,{active:true,playing:true});assert.equal(audio.event('door-creak'),false);audio.stop();assert.equal(audio.metadata.supported,false);assert.equal(audio.metadata.activeVoices,0);
});
