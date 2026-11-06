import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,createSession,createSaveSnapshot} from '../src/session.js';
import {LEVEL} from '../src/level.js';

const settingsKey='runaway.settings.v1',saveKey='runaway.save.v1';
const defaults={hints:false,sound:true,volume:.65,brightness:1};
function memoryStorage(initial={}) {
  const values=new Map(Object.entries(initial));
  return {
    getItem:key=>values.get(key)??null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key)
  };
}
function liveGame({x=4,y=0,face=1,checkpoint=0,crateX=13,bridgeBroken=false,slipPlayed=true,awakened=true,...other}={}) {
  return {player:{x,y,face,grounded:true,vx:1.9,vy:0},checkpoint,crateX,bridgeBroken,slipPlayed,awakened,...other};
}
const snapshot=options=>{
  const result=createSaveSnapshot(liveGame(options));assert(result,'The fixture must be a safe grounded save.');return result;
};

test('fresh sessions start with no hints and return independent default settings',()=>{
  assert.deepEqual(DEFAULT_SETTINGS,defaults);
  const storage=memoryStorage(),session=createSession(storage);
  assert.deepEqual(session.getSettings(),defaults);assert.equal(session.getSave(),null);
  const copy=session.getSettings();copy.hints=true;copy.volume=0;
  assert.deepEqual(session.getSettings(),defaults,'Changing a UI copy must not silently change the current preferences.');
  assert.equal(storage.getItem(settingsKey),null,'Reading defaults must not manufacture a persisted preference change.');
});

test('settings patches preserve other preferences, accept valid endpoints and ignore invalid values',()=>{
  const storage=memoryStorage(),session=createSession(storage);
  session.setSettings({hints:true,volume:.25});session.setSettings({sound:false,brightness:1.15});
  const valid={hints:true,sound:false,volume:.25,brightness:1.15};assert.deepEqual(session.getSettings(),valid);
  for(const patch of [
    {hints:'false',sound:1,volume:'0.8',brightness:null},
    {volume:-.01,brightness:.69},{volume:1.01,brightness:1.31},
    {volume:NaN,brightness:Infinity},null,[],{unknown:true,version:99}
  ]) {
    session.setSettings(patch);assert.deepEqual(session.getSettings(),valid,'Invalid patches must preserve the last usable preferences.');
  }
  for(const [volume,brightness] of [[0,.7],[1,1.3]]) {
    session.setSettings({volume,brightness});assert.equal(session.getSettings().volume,volume);assert.equal(session.getSettings().brightness,brightness);
  }
  const persisted=JSON.parse(storage.getItem(settingsKey));
  assert.deepEqual(persisted,{version:1,hints:true,sound:false,volume:1,brightness:1.3});
  assert.deepEqual(createSession(storage).getSettings(),session.getSettings(),'A new page session must recover the valid preferences.');
});

test('corrupted or future settings fall back safely without coercing strings into enabled hints',()=>{
  for(const raw of ['{','null','[]',JSON.stringify({version:2,hints:true,sound:false,volume:.2,brightness:1.2})]) {
    assert.deepEqual(createSession(memoryStorage({[settingsKey]:raw})).getSettings(),defaults);
  }
  const corrupt=JSON.stringify({version:1,hints:'true',sound:'false',volume:-1,brightness:100,unknown:'ignored'});
  const session=createSession(memoryStorage({[settingsKey]:corrupt}));assert.deepEqual(session.getSettings(),defaults);
  session.setSettings({sound:false});assert.deepEqual(session.getSettings(),{...defaults,sound:false},'One corrupt stored field cannot disable later valid edits.');
});

test('blocked browser storage leaves settings and continue usable in memory',()=>{
  const unavailable={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
  for(const storage of [null,unavailable]) {
    const session=createSession(storage);assert.deepEqual(session.getSettings(),defaults);
    session.setSettings({hints:true,volume:.4});assert.deepEqual(session.getSettings(),{...defaults,hints:true,volume:.4});
    const saved=snapshot({x:LEVEL.checkpoints[1].x,y:LEVEL.checkpoints[1].y,checkpoint:2,bridgeBroken:true});
    assert.equal(session.save(saved),true);assert.deepEqual(session.getSave(),saved);
    session.clearSave();assert.equal(session.getSave(),null);assert.equal(session.getSettings().hints,true);
  }
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('unavailable');}});
    const session=createSession();assert.deepEqual(session.getSettings(),defaults);
    assert.equal(session.save(snapshot()),true);assert(session.getSave());
  } finally {
    if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;
  }
});

test('safe snapshots use permanent floor geometry and strip live controller and velocity state',()=>{
  const floors=[
    {x:0,y:.12},{x:4,y:0},{x:7,y:.85},{x:13,y:.85},{x:17,y:1.65},
    ...LEVEL.checkpoints.map((point,index)=>({...point,checkpoint:index+1}))
  ];
  for(const floor of floors) {
    const input=liveGame({...floor,face:-1});input.player.y+=.01;
    input.player.ladder={phase:'climb'};input.climb={progress:.4};input.jumpMotion={launched:true};input.unrelated='discard';
    const result=createSaveSnapshot(input);assert(result,`A settled safe surface at x=${floor.x},y=${floor.y} must be resumable.`);
    assert.equal(result.version,1);assert.equal(result.player.y,floor.y,'Tiny render height error must normalize to the physical support surface.');
    assert.deepEqual(result.player,{x:floor.x,y:floor.y,face:-1},'Continue stores stable position and facing, not velocities or a half-finished controller.');
    assert.deepEqual(Object.keys(result).sort(),['version','checkpoint','player','crateX','bridgeBroken','slipPlayed','awakened'].sort());
    assert.equal(input.player.y,floor.y+.01,'Canonicalizing a snapshot must not move the live player.');
  }
});

test('airborne, edge, plank, gap and solid-interior positions cannot replace a safe continue point',()=>{
  const unsafe=[
    {x:23,y:0},{x:33,y:LEVEL.bridge.y},{x:21.9,y:0},
    {x:LEVEL.roofs.final.x+.1,y:LEVEL.roofs.final.y},
    {x:37.9,y:LEVEL.roofs.landing.y},{x:38.5,y:LEVEL.roofs.landing.y},
    {x:0,y:0},{x:7,y:0},{x:13,y:0},{x:17,y:0},
    {x:6.1,y:0},{x:12.35,y:0},{x:16.6,y:0},
    {x:6.25,y:.85},{x:16.75,y:1.65},{x:-1,y:1.32},
    {x:4,y:.04},{x:NaN,y:0},{x:4,y:Infinity}
  ];
  for(const position of unsafe)assert.equal(createSaveSnapshot(liveGame(position)),null,`Unsafe player location (${position.x},${position.y}) must not become a continue target.`);
  const airborne=liveGame();airborne.player.grounded=false;assert.equal(createSaveSnapshot(airborne),null);
  const unknown=liveGame();delete unknown.player.grounded;assert.equal(createSaveSnapshot(unknown),null,'A live save needs positive evidence of grounded support.');
});

test('moving the crate changes both blocked floor space and the top that can safely support a snapshot',()=>{
  assert.equal(createSaveSnapshot(liveGame({x:13,y:0,crateX:13})),null);
  assert(snapshot({x:13,y:.85,crateX:13}));
  assert(snapshot({x:13,y:0,crateX:15}),'The old crate floor location must become safe after the crate moves away.');
  assert.equal(createSaveSnapshot(liveGame({x:13,y:.85,crateX:15})),null,'The old crate top must not remain as invisible support.');
  assert.equal(createSaveSnapshot(liveGame({x:15,y:0,crateX:15})),null);
  assert(snapshot({x:15,y:.85,crateX:15}));
  assert.equal(createSaveSnapshot(liveGame({x:14.35,y:0,crateX:15})),null,'The saved body footprint must clear the moved side, even with its center just outside the crate.');
});

test('a fresh session restores the safe player and changed world data through defensive copies',()=>{
  const storage=memoryStorage(),session=createSession(storage);
  const original=snapshot({x:39.2,y:4.65,face:-1,checkpoint:3,crateX:15.6,bridgeBroken:true,slipPlayed:true,awakened:true});
  const expected=structuredClone(original);assert.equal(session.save(original),true);
  original.player.x=4;original.bridgeBroken=false;
  assert.deepEqual(session.getSave(),expected,'Mutating a caller snapshot cannot change saved continuation state.');
  const continued=createSession(storage),copy=continued.getSave();assert.deepEqual(copy,expected);
  copy.player.y=-100;copy.crateX=13;copy.slipPlayed=false;
  assert.deepEqual(continued.getSave(),expected,'Menu or UI copies cannot mutate a saved player or world state.');
  assert.deepEqual(JSON.parse(storage.getItem(saveKey)),expected);
});

test('corrupt versions, nonfinite positions and invalid world fields are rejected without erasing the last valid save',()=>{
  const storage=memoryStorage(),session=createSession(storage),good=snapshot();assert(session.save(good));
  const invalid=[
    null,[],{}, {...good,version:0},{...good,version:2},
    {...good,checkpoint:-1},{...good,checkpoint:4},{...good,checkpoint:1.5},
    {...good,crateX:10},{...good,crateX:17},{...good,bridgeBroken:'true'},
    {...good,slipPlayed:1},{...good,awakened:null},
    {...good,player:{...good.player,x:NaN}},{...good,player:{...good.player,y:2}},
    {...good,player:{...good.player,face:0}},
    {...snapshot({x:13,y:.85}),crateX:15}
  ];
  for(const value of invalid) {
    assert.equal(session.save(value),false);assert.deepEqual(session.getSave(),good,'An unsafe autosave must retain the previous stable continue point.');
  }
  const overflow=JSON.stringify(good).replace('"x":4','"x":1e309');
  for(const raw of ['{','null','[]',JSON.stringify({...good,version:99}),JSON.stringify({...good,player:{x:23,y:0,face:1}}),overflow]) {
    assert.equal(createSession(memoryStorage({[saveKey]:raw})).getSave(),null,'Unusable persisted data must not expose a Continue destination.');
  }
});

test('starting a new game clears old continuation and world progress while preserving user settings',()=>{
  for(const brokenRemove of [false,true]) {
    const storage=memoryStorage();
    if(brokenRemove)storage.removeItem=()=>{throw new Error('blocked removal');};
    const session=createSession(storage);session.setSettings({hints:true,sound:false,volume:.3,brightness:1.2});
    const preferences=session.getSettings();assert(session.save(snapshot({x:39.2,y:4.65,checkpoint:3,crateX:16,bridgeBroken:true})));
    session.clearSave();assert.equal(session.getSave(),null);
    assert.equal(createSession(storage).getSave(),null,'A cleared save cannot reappear on the next page session, even if removeItem is unavailable.');
    assert.deepEqual(createSession(storage).getSettings(),preferences,'Starting over must not reset accessibility and audio preferences.');
    const fresh=snapshot({x:0,y:.12,checkpoint:0,crateX:13,bridgeBroken:false,slipPlayed:false,awakened:false});
    assert(session.save(fresh));assert.deepEqual(createSession(storage).getSave(),fresh,'New game data must replace all old world progress rather than merge with it.');
  }
});
