import test from 'node:test';
import assert from 'node:assert/strict';
import {MARKET,awningSurfaceY,createMarket,marketHeight,normalizeMarketSave} from '../src/market.js';

const fixture=(save=null,hz=60)=>{const controller=createMarket(),player={};assert(controller.begin(player,save));return {controller,player,hz,events:[],samples:[]};};
function step(f,input={},count=1){for(let n=0;n<count;n++){
 f.controller.update(1/f.hz,input,f.player);f.events.push(...f.controller.state.events);
 assert([f.player.x,f.player.y,f.player.z,f.player.vx,f.player.vy,f.player.vz].every(Number.isFinite));
 f.samples.push({x:f.player.x,y:f.player.y,phase:f.controller.state.phase,area:f.controller.state.area,vendor:{...f.controller.state.vendor},deflection:f.controller.state.awningDeflection});
}return f;}
function until(f,input,predicate,maxSeconds=90){for(let n=0;n<maxSeconds*f.hz;n++){step(f,input);if(predicate())return f;}assert.fail('Condition not reached '+JSON.stringify({p:f.player,s:f.controller.state}));}
const pulse=(f,key)=>{step(f,{},2);step(f,{[key]:true},2);step(f,{},2);};
function steal(f){until(f,{direction:1},()=>f.player.x>=24.5);until(f,{},()=>Math.abs(f.player.vx)<.01,3);pulse(f,'interact');until(f,{},()=>f.controller.state.food==='held',2);}
function crossRail(f){until(f,{direction:1,running:true},()=>f.player.x>=65.5,30);pulse(f,'jump');until(f,{},()=>f.controller.state.area==='market',12);}

test('market saves canonicalize supported floors and preserve independent vendor records',()=>{
 for(const input of [
  {...MARKET.entry},
  {x:38,y:0,face:1,food:'held',hungerPlayed:true,area:'chase'},
  {x:76.4,y:-5.19,face:-1,food:'held',hungerPlayed:true,area:'market',escaped:true},
  {x:116,y:-5.2,face:1,food:'eaten',hungerPlayed:true,area:'market',escaped:true,completed:true},
  {x:110,y:-5.2,face:1,food:'display',hungerPlayed:true,area:'market',escaped:true}
 ]){
  const saved=normalizeMarketSave(input);assert(saved);assert.equal(marketHeight(saved),saved.y);
  const f=fixture(saved);assert.deepEqual(f.controller.snapshot(),saved);
  saved.vendor.x=20.6;assert.notEqual(f.controller.state.vendor.x,saved.vendor.x);
 }
});

test('unsafe or contradictory market saves are rejected instead of resuming in the void',()=>{
 const base={...MARKET.entry};
 for(const patch of [
  {x:NaN},{x:Infinity},{x:-1},{x:66},{x:69,y:-2.7},{y:-.2},{face:0},{food:'cash'},
  {area:'escape'},{area:'awning'},{area:'market',y:-5.2,x:73,escaped:true},
  {area:'market',y:-5.2,x:80,escaped:false},{food:'held',area:'chase',hungerPlayed:false},
  {food:'eaten',hungerPlayed:true},{completed:true},{area:'market',x:80,y:-5.2,escaped:true,completed:true},
  {hungerPlayed:1},{escaped:1},{completed:'yes'},
  {vendor:{phase:'idle',x:27.4,z:Infinity}},{vendor:{phase:'watch',x:27.4,z:-1}},
 ])assert.equal(normalizeMarketSave({...base,...patch}),null,JSON.stringify(patch));
});

test('the full food chase, vault, spring landing and market route works at 30, 60 and 120 Hz',()=>{
 const routes=[];
 for(const hz of [30,60,120]){
  const f=fixture(null,hz);steal(f);crossRail(f);
  assert(f.controller.state.escaped);assert(f.controller.state.checkpoint);
  const soft=f.samples.filter(s=>s.phase==='awning-impact');assert(soft.length>hz);assert(Math.max(...soft.map(s=>s.deflection))>.12);assert(Math.min(...soft.map(s=>s.deflection))<0);
  assert(soft.every(s=>s.x>=MARKET.awning.minX&&s.x<=MARKET.awning.maxX));
  assert(Math.max(...soft.map(s=>s.x))-Math.min(...soft.map(s=>s.x))<.27,'The compressing feet must not skate across the entire canvas.');
  until(f,{direction:1,running:true},()=>f.controller.state.completed,30);
  assert.equal(f.controller.state.food,'eaten');assert.equal(f.player.y,MARKET.groundY);assert(f.controller.snapshot());
  for(const event of ['hunger','take-food','food-taken','vendor-notice','vendor-chase','rail-vault','rail-clear','awning-impact','awning-drop','market-land','eat','eat-end','complete'])assert(f.events.includes(event),event);
  assert.equal(f.events.filter(e=>e==='food-taken').length,1);assert.equal(f.events.filter(e=>e==='eat').length,1);
  assert.equal(f.controller.state.vendor.phase,'watch');assert.equal(f.controller.state.vendor.x,MARKET.vendor.stopX);
  routes.push(f.samples.length/hz);
 }
 assert(Math.max(...routes)-Math.min(...routes)<.45,'Display refresh rate must not change the chase difficulty.');
});

test('walking, running, crouching and sliding cannot pass the street railing',()=>{
 for(const input of [{direction:1},{direction:1,running:true},{direction:1,crouch:true}]){
  const f=fixture({x:64,y:0,face:1,hungerPlayed:true});step(f,input,f.hz*12);
  assert(f.player.x<=MARKET.rail.x-.22+.00001);assert.equal(f.player.y,0);assert.equal(f.controller.state.climb,null);assert(!f.controller.state.escaped);
 }
 const f=fixture({x:61.5,y:0,face:1,hungerPlayed:true});step(f,{direction:1,running:true},60);step(f,{direction:1,running:true,crouch:true},90);
 assert(f.events.includes('slide-start'));assert(f.player.x<=MARKET.rail.x-.22+.00001);assert.equal(f.player.y,0);
});

test('a stationary explicit jump at the railing vaults and preserves enough momentum to reach the cloth',()=>{
 const f=fixture({x:65.6,y:0,face:1,hungerPlayed:true});step(f,{},120);assert.equal(f.controller.state.climb,null);
 pulse(f,'jump');assert(f.controller.state.climb);until(f,{},()=>f.controller.state.phase==='awning-impact',5);
 assert(f.player.x>=MARKET.awning.minX);assert(f.player.grounded);assert(f.events.includes('rail-vault'));assert(!f.events.includes('caught'));
});

test('ordinary jumps away from the rail retain forward motion and land back on the upper pavement',()=>{
 const f=fixture({x:10,y:0,face:1,hungerPlayed:true});step(f,{direction:1,running:true},60);pulse(f,'jump');
 until(f,{direction:1,running:true},()=>f.events.includes('land'),3);
 assert(f.events.includes('takeoff'));assert.equal(f.player.y,0);assert(f.player.x>14);assert.equal(f.controller.state.climb,null);
});

test('the vendor exits through the kiosk side before chasing and cannot cross its front counter',()=>{
 const f=fixture();steal(f);until(f,{direction:1,running:true},()=>f.controller.state.vendor.phase==='chase',8);
 const exit=f.samples.filter(s=>s.vendor.phase==='exit');assert(exit.length>0);
 for(const s of exit)assert(s.vendor.x<=20.51||Math.abs(s.vendor.z+1)<.00001,'The vendor crosses a solid counter.');
 assert.equal(f.controller.state.vendor.z,MARKET.lane);assert(f.controller.state.vendor.x<f.player.x-3);
});

test('being caught after the theft retries before the counter with hunger already introduced',()=>{
 const f=fixture();steal(f);until(f,{},()=>f.controller.state.phase==='caught',15);
 assert.equal(f.controller.state.detectedBy,'vendor');assert.equal(f.controller.snapshot(),null);
 until(f,{},()=>f.events.includes('retry'),3);assert(f.controller.retry(f.player));
 assert.equal(f.player.x,23.4);assert.equal(f.player.y,0);assert.equal(f.controller.state.food,'display');assert(f.controller.state.hungerPlayed);
 assert.equal(f.controller.state.vendor.phase,'idle');assert.equal(f.controller.state.caught,null);
});

test('holding E through the grab takes the food once and cannot restart or repeat the seller warning',()=>{
 const f=fixture({x:24.5,y:0,face:1,hungerPlayed:true});step(f,{interact:true},180);
 assert.equal(f.controller.state.food,'held');assert.equal(f.events.filter(e=>e==='take-food').length,1);assert.equal(f.events.filter(e=>e==='food-taken').length,1);assert.equal(f.events.filter(e=>e==='vendor-notice').length,1);
});

test('freezing pursuit holds every vendor property while the child can continue moving',()=>{
 const f=fixture({x:38,y:0,face:1,hungerPlayed:true,food:'held',area:'chase'}),before={...f.controller.state.vendor};
 step(f,{direction:1,running:true,freezeThreats:true},120);
 assert.deepEqual(f.controller.state.vendor,before);assert(f.player.x>42);
 step(f,{direction:1,running:true},60);assert(f.controller.state.vendor.x>before.x);
});

test('Continue preserves the actual seller exit or chase pose instead of placing him on top of the child',()=>{
 const f=fixture({x:24.5,y:0,face:1,hungerPlayed:true});pulse(f,'interact');until(f,{direction:1,running:true},()=>f.controller.state.vendor.phase==='exit',3);
 step(f,{direction:1,running:true},30);const saved=f.controller.snapshot();assert(saved);assert.equal(saved.vendor.phase,'exit');
 const resumed=fixture(saved);assert.deepEqual(resumed.controller.state.vendor,saved.vendor);assert.deepEqual(resumed.controller.snapshot(),saved);
 step(resumed,{direction:1,running:true},60);assert(resumed.controller.state.vendor.phase!=='idle');assert(resumed.controller.state.vendor.x<resumed.player.x);
});

test('no-food exploration can still cross the one-way drop without a completion softlock',()=>{
 const f=fixture({x:64.5,y:0,face:1,hungerPlayed:true});crossRail(f);until(f,{direction:1,running:true},()=>f.controller.state.completed,30);
 assert.equal(f.controller.state.food,'display');assert(!f.events.includes('vendor-notice'));assert(!f.events.includes('eat'));assert(f.controller.snapshot());
});

test('the lower checkpoint restores the market floor without repeating the chase or canopy landing',()=>{
 const f=fixture();steal(f);crossRail(f);const checkpoint={...f.controller.state.checkpoint};
 step(f,{direction:1},20);assert(f.controller.retry(f.player));
 assert.equal(f.player.x,checkpoint.x);assert.equal(f.player.y,MARKET.groundY);assert(f.controller.state.escaped);assert.equal(f.controller.state.food,'held');assert.equal(f.controller.state.phase,'walk');
 assert.equal(f.controller.state.awningDeflection,0);assert.equal(f.controller.state.climb,null);
});

test('the cloth remains attached to its frame and its shared surface stays finite during rebound',()=>{
 for(const d of [-.1,0,.2,.45]){
  const state={awningImpactX:69.2,awningDeflection:d};
  assert.equal(awningSurfaceY(67,state),MARKET.awning.y);assert.equal(awningSurfaceY(74,state),MARKET.awning.y);
  const centre=awningSurfaceY(69.2,state);assert(Math.abs(centre-(MARKET.awning.y-d))<1e-10);
  for(let x=67;x<=74;x+=.125)assert(Number.isFinite(awningSurfaceY(x,state)));
 }
});

test('the first supported cloth tick already owns the impact and drop poses',()=>{
 const f=fixture({x:65.6,y:0,face:1,hungerPlayed:true});pulse(f,'jump');
 until(f,{},()=>f.controller.state.phase==='awning-impact',5);
 const s=f.controller.state;assert(f.player.grounded);assert.equal(s.marketAction.type,'awning-impact');
 assert.equal(s.marketAction.progress,0);assert.equal(s.marketAction.surfaceY,f.player.y);assert(s.marketAction.supported);
 until(f,{},()=>f.controller.state.phase==='awning-drop',3);
 assert.equal(s.marketAction.type,'awning-drop');assert.equal(s.marketAction.elapsed,0);assert(s.marketAction.supported);assert.equal(s.marketAction.airborne,false);
});

test('invalid or paused time never advances player, pursuit, cloth or action clocks',()=>{
 const f=fixture({x:38,y:0,face:1,hungerPlayed:true,food:'held',area:'chase'}),before=structuredClone({p:f.player,s:f.controller.state});
 for(const dt of[0,-1,NaN,Infinity])f.controller.update(dt,{direction:1},f.player);
 assert.deepEqual({p:f.player,s:f.controller.state},before);assert.equal(f.controller.begin({}),false);
 f.controller.reset();assert.equal(f.controller.state,null);assert.equal(f.controller.snapshot(),null);
});
