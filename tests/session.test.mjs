import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,createSession,createSaveSnapshot} from '../src/session.js';
import {LEVEL} from '../src/level.js';
import {STREET} from '../src/street.js';

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
    assert.deepEqual(Object.keys(result).sort(),['version','checkpoint','player','crateX','bridgeBroken','slipPlayed','awakened','learnedMechanics'].sort());
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
    const preferences=session.getSettings();assert(session.save(snapshot({x:39.2,y:4.65,checkpoint:3,crateX:16,bridgeBroken:true,learnedMechanics:['push','crate-climb','ladder']})));
    session.clearSave();assert.equal(session.getSave(),null);
    assert.equal(createSession(storage).getSave(),null,'A cleared save cannot reappear on the next page session, even if removeItem is unavailable.');
    assert.deepEqual(createSession(storage).getSettings(),preferences,'Starting over must not reset accessibility and audio preferences.');
    const fresh=snapshot({x:0,y:.12,checkpoint:0,crateX:13,bridgeBroken:false,slipPlayed:false,awakened:false});
    assert(session.save(fresh));assert.deepEqual(createSession(storage).getSave(),fresh,'New game data must replace all old world progress rather than merge with it.');
    assert.deepEqual(createSession(storage).getSave().learnedMechanics,[],'A new run cannot inherit the previous run’s learned introductions.');
  }
});

test('older version1 saves without tutorial history continue safely with an empty learned list',()=>{
  const old=snapshot();delete old.learnedMechanics;
  const storage=memoryStorage({[saveKey]:JSON.stringify(old)}),session=createSession(storage);
  assert.deepEqual(session.getSave(),{...old,learnedMechanics:[]},'Adding first-encounter lessons must preserve existing version1 continuation data.');
  assert(session.save(old));assert.deepEqual(JSON.parse(storage.getItem(saveKey)).learnedMechanics,[]);
  for(const invalid of [null,'push',{},42]) {
    const continued=createSession(memoryStorage({[saveKey]:JSON.stringify({...old,learnedMechanics:invalid})}));
    assert.deepEqual(continued.getSave(),{...old,learnedMechanics:[]},'Corrupt optional tutorial history must not discard an otherwise safe run.');
  }
});

test('learned mechanics persist as unique supported IDs without sharing the caller or UI arrays',()=>{
  const source=['ladder','push','ladder','unknown',null,4,'door','Push'];
  const input=liveGame({learnedMechanics:source}),canonical=createSaveSnapshot(input);
  const expected=['door','ladder','push'];
  assert.deepEqual([...canonical.learnedMechanics].sort(),expected);
  source.push('running-jump');assert.deepEqual([...canonical.learnedMechanics].sort(),expected,'Snapshot creation must copy the live tutorial history.');
  const storage=memoryStorage(),session=createSession(storage);assert(session.save(canonical));
  canonical.learnedMechanics.push('crate-climb');assert.deepEqual([...session.getSave().learnedMechanics].sort(),expected,'Saving must copy the caller’s learned array.');
  const ui=session.getSave();ui.learnedMechanics.length=0;
  assert.deepEqual([...session.getSave().learnedMechanics].sort(),expected,'Reading a save cannot expose the internal learned list to mutation.');
  assert.deepEqual([...createSession(storage).getSave().learnedMechanics].sort(),expected,'Continue must suppress exactly the lessons already shown in the saved run.');
});

function interiorGame({flight=0,x=13,y=12.8,face=-1,...other}={}) {
  return liveGame({x,y,face,checkpoint:3,crateX:16,bridgeBroken:true,slipPlayed:true,awakened:true,
    chapter:'stairwell',stairwell:{flight,x,face},learnedMechanics:['push','ladder','door'],...other});
}

test('Continue preserves the current stair flight and landing across all four descended floors',()=>{
  const storage=memoryStorage(),session=createSession(storage);
  const positions=[
    {flight:0,x:13,y:12.8},
    {flight:0,x:7.5,y:11.2},
    {flight:1,x:2,y:9.6},
    {flight:1,x:7.5,y:8,face:1},
    {flight:2,x:7.5,y:4.8},
    {flight:3,x:7.5,y:1.6,face:1},
    {flight:4,x:10,y:0}
  ];
  for(const position of positions) {
    const input=interiorGame(position),canonical=createSaveSnapshot(input);
    assert(canonical,`Supported interior route ${JSON.stringify(position)} must be resumable.`);
    assert.equal(canonical.chapter,'stairwell');assert.equal(canonical.stairwell.flight,position.flight);
    assert.equal(canonical.player.x,position.x);assert(Math.abs(canonical.player.y-position.y)<1e-9);
    assert.equal(canonical.player.face,position.face??-1);
    assert(session.save(canonical));
    assert.deepEqual(createSession(storage).getSave(),canonical,'A reload must retain the committed descending flight rather than select the previous stairs.');
    assert.deepEqual(canonical.learnedMechanics,['push','ladder','door']);
    assert.equal(canonical.crateX,16);assert.equal(canonical.bridgeBroken,true);
  }
});

test('stair snapshots reject unsupported and mismatched positions without replacing the last safe save',()=>{
  const storage=memoryStorage(),session=createSession(storage),good=createSaveSnapshot(interiorGame({flight:2,x:7.5,y:4.8}));
  assert(good);assert(session.save(good));
  const invalid=[
    {...good,chapter:'unknown'},
    {...good,awakened:false},
    {...good,stairwell:null},
    {...good,stairwell:[]},
    {...good,stairwell:{...good.stairwell,flight:-1}},
    {...good,stairwell:{...good.stairwell,flight:5}},
    {...good,stairwell:{...good.stairwell,flight:1.5}},
    {...good,stairwell:{...good.stairwell,x:Infinity}},
    {...good,stairwell:{...good.stairwell,x:-1}},
    {...good,stairwell:{...good.stairwell,face:0}},
    {...good,stairwell:{...good.stairwell,x:7.6}},
    {...good,stairwell:{...good.stairwell,face:1}},
    {...good,player:{...good.player,y:good.player.y+.04}},
    {...good,player:{...good.player,x:good.player.x+.04}}
  ];
  for(const value of invalid) {
    assert.equal(session.save(value),false,JSON.stringify(value));
    assert.deepEqual(session.getSave(),good,'An invalid interior autosave cannot lose the last reachable continuation.');
    assert.equal(createSession(memoryStorage({[saveKey]:JSON.stringify(value)})).getSave(),null);
  }
  const airborne=interiorGame();airborne.player.grounded=false;
  assert.equal(createSaveSnapshot(airborne),null,'Live snapshots need positive supported feet, including indoors.');
});

test('indoor continuation data and lesson history are copied independently from callers and menu reads',()=>{
  const source=interiorGame({flight:1,x:7.5,y:8,face:1}),canonical=createSaveSnapshot(source);
  assert(canonical);source.stairwell.flight=4;
  assert.equal(canonical.stairwell.flight,1,'Snapshot creation must copy live route state.');
  const storage=memoryStorage(),session=createSession(storage);assert(session.save(canonical));
  const expected=structuredClone(canonical);canonical.stairwell.x=2;canonical.player.x=2;
  assert.deepEqual(session.getSave(),expected,'Saving must copy the caller’s route object.');
  const copy=session.getSave();copy.stairwell.flight=0;copy.player.y=12.8;copy.learnedMechanics.length=0;
  assert.deepEqual(session.getSave(),expected,'A menu copy must not alter the floor restored by Continue.');
  assert.deepEqual(createSession(storage).getSave(),expected);
  const roof=createSaveSnapshot(liveGame({chapter:'rooftop'}));
  assert(roof);assert.equal(Object.hasOwn(roof,'chapter'),false,'Older rooftop saves retain their canonical shape.');
  assert.equal(Object.hasOwn(roof,'stairwell'),false);
});

function streetGame({x=STREET.entry.x,y=STREET.groundY,face=1,dumpsterX,crouched,...other}={}) {
  const supportY=Math.abs(y-STREET.groundY)<=.025?STREET.groundY:Math.abs(y-STREET.dumpster.y)<=.025?STREET.dumpster.y:y;
  const street={x,y:supportY,face,...(dumpsterX===undefined?{}:{dumpsterX}),...(crouched===undefined?{}:{crouched})};
  return liveGame({x,y,face,chapter:'street',street,checkpoint:3,crateX:16,
    bridgeBroken:true,slipPlayed:true,awakened:true,learnedMechanics:['push','ladder','door'],...other});
}

test('street continuation survives reload at the entrance, both route bounds and positions between old cars',()=>{
  const storage=memoryStorage(),session=createSession(storage);
  for(const [x,face] of [[STREET.minX,-1],[STREET.entry.x,1],[18.4,-1],[37,1],[STREET.maxX,1]]) {
    const source=streetGame({x,face,y:STREET.groundY+.01}),canonical=createSaveSnapshot(source);
    assert(canonical,`Supported street position ${x} must be resumable.`);
    assert.equal(canonical.chapter,'street');assert.deepEqual(canonical.street,{x,y:STREET.groundY,face,dumpsterX:STREET.dumpster.startX});
    assert.deepEqual(canonical.player,{x,y:STREET.groundY,face});
    assert.equal(Object.hasOwn(canonical,'stairwell'),false,'Street saves must not carry a stale stair flight.');
    assert.equal(canonical.crateX,16);assert.equal(canonical.bridgeBroken,true);
    assert.deepEqual(canonical.learnedMechanics,['push','ladder','door']);
    assert(session.save(canonical));assert.deepEqual(createSession(storage).getSave(),canonical);
  }
});

test('unsafe or malformed street snapshots cannot replace the last safe continue point',()=>{
  const storage=memoryStorage(),session=createSession(storage),good=createSaveSnapshot(streetGame({x:18}));
  assert(good);assert(session.save(good));
  const invalid=[
    {...good,chapter:'unbuilt-street'},{...good,awakened:false},
    {...good,street:undefined},{...good,street:null},{...good,street:[]},
    {...good,street:{x:NaN,face:1}},{...good,street:{x:Infinity,face:1}},
    {...good,street:{x:STREET.minX-.01,face:1}},
    {...good,street:{x:STREET.maxX+.01,face:1}},
    {...good,street:{x:18,face:0}},{...good,street:{x:18,face:-1}},
    {...good,street:{x:18.01,face:1}},
    {...good,player:{...good.player,y:STREET.groundY+.04}},
    {...good,player:{...good.player,x:18.01}},
    {...good,player:{...good.player,face:-1}}
  ];
  for(const value of invalid) {
    assert.equal(session.save(value),false,JSON.stringify(value));
    assert.deepEqual(session.getSave(),good,'A bad street autosave must preserve the preceding reachable position.');
    assert.equal(createSession(memoryStorage({[saveKey]:JSON.stringify(value)})).getSave(),null);
  }
  for(const grounded of [false,undefined]) {
    const airborne=streetGame();airborne.player.grounded=grounded;
    assert.equal(createSaveSnapshot(airborne),null,'A live street snapshot needs supported feet.');
  }
});

test('street route, player and learned history never share mutable state with saved progress',()=>{
  const source=streetGame({x:22,face:-1}),canonical=createSaveSnapshot(source);assert(canonical);
  source.street.x=1;source.learnedMechanics.length=0;
  assert.deepEqual(canonical.street,{x:22,y:0,face:-1,dumpsterX:STREET.dumpster.startX});assert.deepEqual(canonical.learnedMechanics,['push','ladder','door']);
  const storage=memoryStorage(),session=createSession(storage);assert(session.save(canonical));
  const expected=structuredClone(canonical);canonical.street.face=1;canonical.player.x=2;
  assert.deepEqual(session.getSave(),expected);
  const copy=session.getSave();copy.street.x=51;copy.player.face=1;copy.learnedMechanics.push('crate-climb');
  assert.deepEqual(session.getSave(),expected);assert.deepEqual(createSession(storage).getSave(),expected);
});

test('blocked storage still supports street Continue in memory and clearing starts a fresh rooftop run',()=>{
  const unavailable={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
  for(const storage of [null,unavailable]) {
    const session=createSession(storage),street=createSaveSnapshot(streetGame({x:31}));assert(street);
    assert(session.save(street));assert.deepEqual(session.getSave(),street);
    session.clearSave();assert.equal(session.getSave(),null);
    const roof=snapshot({x:0,y:.12,awakened:false,slipPlayed:false});assert(session.save(roof));
    assert.equal(Object.hasOwn(session.getSave(),'chapter'),false);
    assert.equal(Object.hasOwn(session.getSave(),'street'),false);
  }
});

test('Continue restores the moved dumpster and the child on its supported lid or beyond the fence',()=>{
  const storage=memoryStorage(),session=createSession(storage),dumpsterX=STREET.dumpster.maxX;
  const positions=[{x:dumpsterX,y:STREET.dumpster.y,face:1},{x:STREET.fence.x+1.1,y:0,face:-1}];
  for(const position of positions){
    const input=streetGame({...position,dumpsterX}),canonical=createSaveSnapshot(input);
    assert(canonical,`A settled dumpster puzzle position must survive Continue: ${JSON.stringify(position)}.`);
    assert.deepEqual(canonical.street,{...position,dumpsterX});
    assert.deepEqual(canonical.player,position);
    assert(session.save(canonical));assert.deepEqual(createSession(storage).getSave(),canonical);
    assert.equal(createSession(storage).getSave().street.dumpsterX,dumpsterX);
  }
});

test('stale dumpster supports and embedded or unsupported puzzle saves cannot replace a safe save',()=>{
  const storage=memoryStorage(),session=createSession(storage),good=createSaveSnapshot(streetGame({x:40,dumpsterX:52}));
  assert(good);assert(session.save(good));
  const invalid=[
    streetGame({x:52,y:0,dumpsterX:52}),
    streetGame({x:40,y:STREET.dumpster.y,dumpsterX:52}),
    streetGame({x:STREET.fence.x,y:0,dumpsterX:52}),
    streetGame({x:55,y:.7,dumpsterX:52}),
    streetGame({x:40,dumpsterX:STREET.dumpster.maxX+.1}),
    streetGame({x:40,dumpsterX:NaN})
  ];
  for(const source of invalid)assert.equal(createSaveSnapshot(source),null,`Unsupported puzzle snapshot ${JSON.stringify(source.street)} must be rejected.`);
  const lid=createSaveSnapshot(streetGame({x:52,y:STREET.dumpster.y,dumpsterX:52}));assert(lid);
  for(const value of [
    {...lid,player:{...lid.player,y:0}},
    {...lid,street:{...lid.street,dumpsterX:48}},
    {...good,street:{...good.street,dumpsterX:Infinity}},
    {...good,street:{...good.street,y:.6}}
  ]){
    assert.equal(session.save(value),false);assert.deepEqual(session.getSave(),good);
  }
});

test('older street saves gain a safe default dumpster without losing a player standing at its spawn',()=>{
  for(const x of [STREET.entry.x,STREET.dumpster.startX]){
    const old={version:1,chapter:'street',checkpoint:3,player:{x,y:0,face:1},street:{x,face:1},crateX:16,bridgeBroken:true,slipPlayed:true,awakened:true,learnedMechanics:['door']};
    const session=createSession(memoryStorage({[saveKey]:JSON.stringify(old)})),continued=session.getSave();
    assert(continued,'An older street save must remain playable after adding the movable dumpster.');
    assert.deepEqual(continued.player,old.player);assert.equal(continued.street.y,0);
    assert(Number.isFinite(continued.street.dumpsterX));
    assert(continued.street.dumpsterX>=STREET.dumpster.minX&&continued.street.dumpsterX<=STREET.dumpster.maxX);
    assert(Math.abs(x-continued.street.dumpsterX)>=STREET.dumpster.w/2+.21,'Restoring an older save cannot embed the child in the default dumpster.');
  }
});

test('dumpster positions are copied with player progress and never leak through caller or menu objects',()=>{
  const canonical=createSaveSnapshot(streetGame({x:52,y:STREET.dumpster.y,dumpsterX:52}));assert(canonical);
  const storage=memoryStorage(),session=createSession(storage);assert(session.save(canonical));
  const expected=structuredClone(canonical);canonical.street.dumpsterX=44;canonical.player.y=0;
  assert.deepEqual(session.getSave(),expected);
  const menu=session.getSave();menu.street.dumpsterX=43.5;menu.street.y=0;menu.player.x=3;
  assert.deepEqual(session.getSave(),expected);assert.deepEqual(createSession(storage).getSave(),expected);
});

test('Continue restores a supported crouch beneath the raised fence without exposing mutable posture state',()=>{
  const x=STREET.crawl.x+STREET.crawl.w/2,dumpsterX=STREET.dumpster.maxX;
  const source=streetGame({x,dumpsterX,crouched:true,learnedMechanics:['door','crouch']});
  const canonical=createSaveSnapshot(source);
  assert(canonical,'The child safely crouched beneath the raised fence must be resumable.');
  assert.deepEqual(canonical.street,{x,y:0,face:1,dumpsterX,crouched:true});
  assert.deepEqual(canonical.player,{x,y:0,face:1});
  assert.deepEqual(canonical.learnedMechanics,['door','crouch']);
  source.street.crouched=false;assert.equal(canonical.street.crouched,true,'Live posture cannot mutate a snapshot.');
  const storage=memoryStorage(),session=createSession(storage);assert(session.save(canonical));
  canonical.street.crouched=false;assert.equal(session.getSave().street.crouched,true,'Saving must copy the supplied posture.');
  const copy=session.getSave();delete copy.street.crouched;
  assert.equal(session.getSave().street.crouched,true,'A UI copy cannot silently stand the saved child inside the fence.');
  const restored=createSession(storage).getSave();assert.equal(restored.street.crouched,true);
  assert.equal(restored.street.dumpsterX,dumpsterX);assert.deepEqual(restored.learnedMechanics,['door','crouch']);
});

test('standing or malformed crouch saves beneath the panel cannot overwrite the safe Continue point',()=>{
  const x=STREET.crawl.x+STREET.crawl.w/2,storage=memoryStorage(),session=createSession(storage);
  const good=createSaveSnapshot(streetGame({x:STREET.crawl.x-1,crouched:true}));assert(good);assert(session.save(good));
  const unsafe=[
    streetGame({x}),streetGame({x,crouched:false}),streetGame({x,crouched:'true'}),
    streetGame({x,crouched:1}),streetGame({x,crouched:null}),
    streetGame({x,y:.5,crouched:true})
  ];
  for(const source of unsafe){
    assert.equal(createSaveSnapshot(source),null,'Only a supported and explicitly crouched posture may be restored in the opening.');
    const raw={...source,version:1};assert.equal(session.save(raw),false);
    assert.deepEqual(session.getSave(),good,'An unsafe autosave must leave the safe prior position intact.');
    assert.equal(createSession(memoryStorage({[saveKey]:JSON.stringify(raw)})).getSave(),null);
  }
  const legacy=createSaveSnapshot(streetGame({x:STREET.crawl.x-1}));assert(legacy);
  assert.equal(Object.hasOwn(legacy.street,'crouched'),false,'Older standing street saves keep their canonical shape.');
});
