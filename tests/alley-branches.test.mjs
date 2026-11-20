import test from 'node:test';
import assert from 'node:assert/strict';
import {ALLEY,createAlley,normalizeAlleySave} from '../src/alley.js';

const make=(save={},fps=60)=>{const controller=createAlley(),player={},events=[];assert(controller.begin(player,{x:88.6,face:1,fencePassed:true,...save}));return {controller,player,events,fps};};
function tick(r,input={}){r.controller.update(1/r.fps,input,r.player);r.events.push(...r.controller.state.events);assert(Object.values(r.player).filter(v=>typeof v==='number').every(Number.isFinite));assert(r.player.y>=0);}
function frames(r,n,input={}){for(let i=0;i<n;i++)tick(r,input);}
function until(r,predicate,input={},seconds=90){for(let n=0;n<r.fps*seconds&&!predicate();n++)tick(r,input);assert(predicate(),JSON.stringify({p:r.player,phase:r.controller.state.phase,area:r.controller.state.area}));}
function press(r){tick(r);tick(r,{interact:true});}
function finish(r){until(r,()=>r.controller.state.phase==='walk',{},6);}
function interact(r){press(r);finish(r);}

for(const fps of[30,60,120])test(`exploration offers a complete key route instead of the jack workshop at ${fps}Hz`,()=>{
 const r=make({},fps),s=()=>r.controller.state;
 assert(s().nearStorage);interact(r);assert.equal(s().area,'storage');assert.equal(r.player.z,ALLEY.storage.lane);assert.equal(s().storageDoorProgress,1);assert(s().storageVisited);
 until(r,()=>s().nearRadio,{direction:1});interact(r);assert.equal(s().radioOn,false);assert(r.events.includes('radio-toggle'));
 until(r,()=>s().nearKey,{direction:1});interact(r);assert(s().gateKey);assert(r.events.includes('key-pickup'));assert.equal(s().jackStatus,'ground');
 const roomSave=r.controller.snapshot();assert(roomSave);assert(roomSave.gateKey);assert.equal(roomSave.radioOn,false);
 until(r,()=>s().nearStorage,{direction:-1});interact(r);assert.equal(s().area,'alley');assert.equal(r.player.z,ALLEY.lane);
 until(r,()=>s().nearGate,{direction:1});press(r);assert.equal(s().phase,'open-gate');assert.equal(r.controller.snapshot(),null);frames(r,Math.floor(fps*.7));assert.equal(s().gateProgress,0,'The latch is released before the leaf swings.');finish(r);assert(s().gateOpened);assert.equal(s().gateProgress,1);
 until(r,()=>s().phase==='yard-entry',{direction:1});assert.equal(r.controller.snapshot(),null);finish(r);assert.equal(s().area,'yard');assert.equal(r.player.x,ALLEY.gate.yardEntryX);assert.equal(r.player.z,ALLEY.garageLane);assert.equal(s().owner.role,'yard-owner');assert(r.events.includes('gate-passed'));assert(!r.events.includes('door-creak'));assert(!r.events.includes('garage-enter'));assert(!r.events.includes('window-exit'));
 until(r,()=>s().nearChain,{direction:1});frames(r,Math.ceil(fps*.4),{crouch:true});press(r);assert.equal(s().phase,'rattle-chain');finish(r);assert(s().distractionUsed);assert(s().distractionTime>11.8);assert.equal(s().owner.phase,'distracted');assert(s().owner.face<0);assert.equal(s().owner.alert,0);
 const chainSave=r.controller.snapshot();assert(chainSave?.distractionUsed);assert(chainSave.gateOpened);assert.equal(chainSave.jackStatus,'ground');
 until(r,()=>s().completed,{direction:1,running:true},20);assert(r.events.includes('complete'));assert(!r.events.includes('caught'));assert(r.controller.snapshot()?.completed);
});

test('closed gate gives feedback but cannot be opened without finding its key',()=>{
 const r=make({x:115.2});assert(r.controller.state.nearGate);press(r);assert.equal(r.controller.state.phase,'gate-locked');finish(r);assert(r.events.includes('gate-locked'));assert.equal(r.controller.state.gateOpened,false);assert.equal(r.controller.state.gateProgress,0);
 frames(r,240,{direction:1});assert(r.player.x<=115.781);assert.equal(r.controller.state.area,'alley');
});

test('branch Continue preserves discoveries, distinct depth, gate state and old-save defaults',()=>{
 const legacy=normalizeAlleySave({x:88.6,face:1});assert(legacy);assert.equal(legacy.gateKey,false);assert.equal(legacy.radioOn,true);assert.equal(legacy.gateOpened,false);
 for(const seed of[
  {area:'storage',x:95.5,gateKey:true,storageVisited:true,radioOn:false},
  {area:'alley',x:130,gateKey:true,gateOpened:true,storageVisited:true,radioOn:false},
  {area:'yard',x:152,gateKey:true,gateOpened:true,storageVisited:true,radioOn:false,distractionUsed:true},
 ]){
  const r=make(seed),saved=r.controller.snapshot();assert(saved);assert.equal(saved.radioOn,false);const resumed=make(saved);assert.deepEqual(resumed.controller.snapshot(),saved);assert.equal(resumed.player.z,seed.area==='storage'?ALLEY.storage.lane:seed.area==='alley'?ALLEY.lane:ALLEY.garageLane);assert.equal(resumed.controller.state.gateProgress,seed.gateOpened?1:0);
 }
 for(const invalid of[{gateKey:'true'},{gateOpened:true},{radioOn:0},{storageVisited:null},{distractionUsed:1},{area:'storage',x:95,storageVisited:false},{area:'alley',x:130},{area:'storage',x:98}])assert.equal(normalizeAlleySave({x:88.6,face:1,...invalid}),null,JSON.stringify(invalid));
});

test('carrying the jack never blocks storage discovery, hand actions or the alternative route',()=>{
 const r=make({jackStatus:'carried'});press(r);frames(r,45);assert.equal(r.controller.state.alleyAction?.type,'carry');finish(r);assert.equal(r.controller.state.area,'storage');assert.equal(r.controller.state.jackStatus,'carried');
 until(r,()=>r.controller.state.nearKey,{direction:1});interact(r);assert(r.controller.state.gateKey);assert.equal(r.controller.state.alleyAction.type,'carry');assert(r.controller.snapshot());
 until(r,()=>r.controller.state.nearStorage,{direction:-1});interact(r);until(r,()=>r.controller.state.nearGate,{direction:1});interact(r);until(r,()=>r.controller.state.area==='yard',{direction:1});assert.equal(r.controller.state.jackStatus,'carried');assert(r.controller.snapshot());
});

test('held E does not oscillate doors or repeatedly toggle a radio, and partial actions are unsaveable',()=>{
 const r=make();tick(r,{interact:true});frames(r,220,{interact:true});assert.equal(r.controller.state.area,'storage');assert.equal(r.events.filter(e=>e==='storage-enter').length,1);assert(!r.events.includes('storage-exit'));
 until(r,()=>r.controller.state.nearRadio,{direction:1});tick(r,{interact:true});assert.equal(r.controller.snapshot(),null);frames(r,120,{interact:true});assert.equal(r.controller.state.radioOn,false);assert.equal(r.events.filter(e=>e==='radio-toggle').length,1);
});

test('the chain has a real timed AI effect, pauses with physics and cannot be reused after Continue',()=>{
 const r=make({area:'yard',x:152,gateKey:true,gateOpened:true});interact(r);assert.equal(r.controller.state.owner.phase,'distracted');const timer=r.controller.state.distractionTime;
 const before=structuredClone({player:r.player,state:r.controller.state});r.controller.update(0,{interact:true},r.player);assert.deepEqual({player:r.player,state:r.controller.state},before);
 frames(r,120,{crouch:true});assert(r.controller.state.distractionTime<timer-1.9);assert(r.controller.state.owner.x<168);assert.equal(r.controller.state.owner.face,-1);
 const saved=r.controller.snapshot();assert(saved);const continued=make(saved);assert.equal(continued.controller.state.nearChain,false);press(continued);assert.equal(continued.controller.state.phase,'walk');assert.equal(continued.controller.state.distractionTime,0);
 frames(r,660,{crouch:true});assert.equal(r.controller.state.distractionTime,0);assert.equal(r.controller.state.owner.phase,'patrol');assert.equal(r.events.filter(e=>e==='chain-rattle').length,1);
});
