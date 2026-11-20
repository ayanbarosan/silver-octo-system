import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveSnapshot,createSession} from '../src/session.js';
import {ALLEY,createAlley} from '../src/alley.js';

const saveKey='runaway.save.v1';
const crateXs=()=>ALLEY.crates.map(crate=>crate.x);
function memoryStorage(initial={}){
 const values=new Map(Object.entries(initial));
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
function liveAlley(overrides={}){
 const alley={area:'alley',...ALLEY.entry,crateXs:crateXs(),jackStatus:'ground',pumpProgress:0,fencePassed:false,completed:false,...overrides};
 return {chapter:'alley',alley,player:{x:alley.x,y:alley.y,face:alley.face,grounded:true},checkpoint:3,crateX:16,bridgeBroken:true,slipPlayed:true,awakened:true,learnedMechanics:['door','crouch','running-slide']};
}
const safeSnapshot=overrides=>{
 const snapshot=createSaveSnapshot(liveAlley(overrides));assert(snapshot,'The fixture must represent reachable supported geometry.');return snapshot;
};

test('Continue restores each alley puzzle area, carried tools and a completed route',()=>{
 const storage=memoryStorage(),session=createSession(storage);
 const fixtures=[
  {},{x:60,fencePassed:true},{x:90,jackStatus:'carried',fencePassed:true},
  {area:'garage',x:112,jackStatus:'raised',pumpProgress:1,fencePassed:true},
  {area:'yard',x:ALLEY.yard.minX+3,jackStatus:'raised',pumpProgress:1,fencePassed:true},
  {area:'yard',x:ALLEY.maxX-1,jackStatus:'raised',pumpProgress:1,fencePassed:true,completed:true}
 ];
 for(const fixture of fixtures)for(const face of[-1,1]){
  const canonical=safeSnapshot({...fixture,face});assert(session.save(canonical));
  const resumed=createSession(storage).getSave();assert.deepEqual(resumed,canonical);
  assert.equal(resumed.chapter,'alley');assert.equal(resumed.checkpoint,3);
  assert.equal(resumed.crateX,16);assert(resumed.bridgeBroken&&resumed.slipPlayed&&resumed.awakened);
  assert.deepEqual(resumed.learnedMechanics,['door','crouch','running-slide']);
  const player={},controller=createAlley();assert(controller.begin(player,resumed.alley));
  assert.deepEqual({x:player.x,y:player.y,face:player.face},resumed.player);
  assert.equal(controller.state.area,resumed.alley.area);assert.equal(controller.state.completed,resumed.alley.completed);
  assert.equal(controller.state.jackStatus,resumed.alley.jackStatus);
  assert.deepEqual(controller.state.crates.map(crate=>crate.x),resumed.alley.crateXs);
 }
});

test('Continue canonicalizes crate tops and preserves deliberately moved puzzle crates',()=>{
 for(const [area,index]of[['alley',0],['alley',1],['garage',2]]){
  const crates=crateXs();crates[index]+=1;
  const x=crates[index],y=ALLEY.crates[index].y+.01;
  const source=liveAlley({area,x,y,crateXs:crates,jackStatus:area==='garage'?'raised':'ground',pumpProgress:area==='garage'?1:0});
  const saved=createSaveSnapshot(source);assert(saved);
  assert.equal(saved.player.y,ALLEY.crates[index].y);assert.equal(saved.alley.y,ALLEY.crates[index].y);
  assert.equal(source.player.y,y,'Saving must not move the physics actor.');
  assert.deepEqual(saved.alley.crateXs,crates);
 }
});

test('alley snapshots and menu copies cannot mutate saved crate positions or progress',()=>{
 const source=liveAlley({x:90,jackStatus:'carried',fencePassed:true}),snapshot=createSaveSnapshot(source),expected=structuredClone(snapshot);
 assert(snapshot);source.alley.crateXs[0]=52;source.alley.x=1;source.player.x=1;source.learnedMechanics.length=0;
 assert.deepEqual(snapshot,expected);
 const storage=memoryStorage(),session=createSession(storage);assert(session.save(snapshot));
 snapshot.alley.crateXs[1]=53;snapshot.alley.jackStatus='ground';snapshot.player.x=1;
 const menuCopy=session.getSave();menuCopy.alley.crateXs[2]=135;menuCopy.learnedMechanics.length=0;
 assert.deepEqual(session.getSave(),expected);assert.deepEqual(createSession(storage).getSave(),expected);
});

test('unsafe and malformed alley saves cannot replace the last reachable Continue point',()=>{
 const good=safeSnapshot(),storage=memoryStorage(),session=createSession(storage);assert(session.save(good));
 const patch=alley=>({...good,alley:{...good.alley,...alley}});
 const invalid=[
  {...good,alley:null},{...good,alley:[]},{...good,alley:undefined},{...good,awakened:false},
  patch({area:'unknown'}),patch({x:NaN}),patch({x:Infinity}),patch({x:'2'}),patch({face:0}),patch({y:1}),
  patch({x:ALLEY.minX-.01}),patch({x:ALLEY.mainGate.x}),
  patch({x:ALLEY.fence.x+.05}),patch({x:ALLEY.crates[0].x}),
  patch({crateXs:[]}),patch({crateXs:[43,47]}),patch({crateXs:[43,47,NaN]}),patch({crateXs:[43,'47',126]}),
  patch({crateXs:[ALLEY.crates[0].minX-1,47,126]}),patch({crateXs:[43,43,126]}),
  patch({jackStatus:'missing'}),patch({pumpProgress:-.01}),patch({pumpProgress:1.01}),
  patch({jackStatus:'raised',pumpProgress:.5}),patch({jackStatus:'carried',pumpProgress:.5}),patch({jackStatus:'carried'}),
  patch({area:'garage',x:112}),patch({area:'yard',x:145}),
  patch({fencePassed:'yes'}),patch({completed:'yes'}),patch({completed:true}),
  {...good,player:{...good.player,x:good.player.x+.01}},
  {...good,player:{...good.player,y:.1}}, {...good,player:{...good.player,face:-1}}
 ];
 for(const candidate of invalid){
  assert.equal(session.save(candidate),false,JSON.stringify(candidate.alley));assert.deepEqual(session.getSave(),good);
  assert.equal(createSession(memoryStorage({[saveKey]:JSON.stringify(candidate)})).getSave(),null,JSON.stringify(candidate.alley));
 }
 for(const grounded of[false,undefined]){
  const source=liveAlley();source.player.grounded=grounded;assert.equal(createSaveSnapshot(source),null);
 }
 for(const pumpProgress of[NaN,Infinity])assert.equal(session.save(patch({pumpProgress})),false);
});

test('alley input validation rejects sparse crate arrays before writing invalid browser storage',()=>{
 const sparse=Array(3),source=liveAlley({crateXs:sparse});
 assert.equal(createSaveSnapshot(source),null);
 const session=createSession(memoryStorage());assert.equal(session.save({...source,version:1}),false);
});

test('legacy rooftop saves still load after alley progress and New Game clears the new route',()=>{
 const storage=memoryStorage(),session=createSession(storage);assert(session.save(safeSnapshot({x:60,fencePassed:true})));
 session.clearSave();assert.equal(session.getSave(),null);
 const legacy={version:1,checkpoint:0,player:{x:4,y:0,face:1},crateX:13,bridgeBroken:false,slipPlayed:false,awakened:true};
 assert(session.save(legacy));const recovered=createSession(storage).getSave();
 assert.deepEqual(recovered,{...legacy,learnedMechanics:[]});assert.equal(Object.hasOwn(recovered,'alley'),false);
});

test('blocked storage keeps alley Continue available during the current session',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
 for(const storage of[null,blocked]){
  const session=createSession(storage),saved=safeSnapshot({area:'yard',x:145,jackStatus:'raised',pumpProgress:1,fencePassed:true});
  assert(session.save(saved));assert.deepEqual(session.getSave(),saved);session.clearSave();assert.equal(session.getSave(),null);
 }
});
