import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveSnapshot,createSession} from '../src/session.js';
import {createMarket} from '../src/market.js';

const key='runaway.save.v1';
function storage(initial={}){const values=new Map(Object.entries(initial));return{getItem:name=>values.get(name)??null,setItem:(name,value)=>values.set(name,String(value)),removeItem:name=>values.delete(name)};}
function live(extra={}){
 const market={area:'approach',x:2,y:0,face:1,hungerPlayed:false,food:'display',escaped:false,completed:false,...extra};
 return{version:1,chapter:'market',market,player:{x:market.x,y:market.y,face:market.face,grounded:true},checkpoint:3,crateX:16,bridgeBroken:true,slipPlayed:true,awakened:true,learnedMechanics:['door','running-slide']};
}
const snapshot=extra=>{const value=createSaveSnapshot(live(extra));assert(value,'Fixture must be a supported market checkpoint');return value;};

test('Continue restores hunger, stolen food and supported market stages independently',()=>{
 for(const extra of[
  {},{x:18,hungerPlayed:true},
  {area:'chase',x:38,hungerPlayed:true,food:'held'},
  {area:'market',x:76.4,y:-5.2,hungerPlayed:true,food:'held',escaped:true},
  {area:'market',x:86,y:-5.2,hungerPlayed:true,food:'eaten',escaped:true},
  {area:'market',x:116,y:-5.2,hungerPlayed:true,food:'eaten',escaped:true,completed:true},
 ])for(const face of[-1,1]){
  const value=snapshot({...extra,face}),memory=storage(),session=createSession(memory);assert(session.save(value));
  const restored=createSession(memory).getSave();assert.deepEqual(restored,value);
  const controller=createMarket(),player={};assert(controller.begin(player,restored.market));
  assert.equal(controller.state.area,restored.market.area);assert.equal(controller.state.food,restored.market.food);
  assert.equal(controller.state.hungerPlayed,restored.market.hungerPlayed);assert.equal(controller.state.escaped,restored.market.escaped);
  assert.equal(controller.state.completed,restored.market.completed);
  assert.deepEqual({x:player.x,y:player.y,face:player.face},restored.player);assert(player.grounded);
 }
});

test('transient falls and awning contacts cannot replace the preceding safe Continue checkpoint',()=>{
 const session=createSession(storage()),safe=snapshot({x:23.4,hungerPlayed:true});assert(session.save(safe));
 for(const extra of[
  {area:'escape',x:66.9,y:-1.2,hungerPlayed:true,food:'held'},
  {area:'awning',x:70,y:-2.7,hungerPlayed:true,food:'held'},
 ])assert.equal(createSaveSnapshot(live(extra)),null);
 const airborne=live({area:'chase',x:64,hungerPlayed:true,food:'held'});airborne.player.grounded=false;assert.equal(createSaveSnapshot(airborne),null);
 assert.deepEqual(session.getSave(),safe);
});

test('market save copies preserve food and discovery state against menu or caller mutation',()=>{
 const source=live({area:'market',x:82,y:-5.2,hungerPlayed:true,food:'eaten',escaped:true}),value=createSaveSnapshot(source),expected=structuredClone(value),session=createSession(storage());
 assert(value);source.market.food='display';source.player.x=1;source.learnedMechanics.length=0;assert.deepEqual(value,expected);
 assert(session.save(value));value.market.x=118;value.market.food='display';value.market.vendor.x=21;value.player.y=0;
 const menuCopy=session.getSave();menuCopy.market.completed=true;menuCopy.market.vendor.phase='chase';menuCopy.learnedMechanics.length=0;assert.deepEqual(session.getSave(),expected);
});

test('malformed market records and inconsistent physical positions are rejected',()=>{
 const good=snapshot({area:'chase',x:38,hungerPlayed:true,food:'held'});
 for(const market of[
  {...good.market,x:NaN},{...good.market,face:0},{...good.market,food:'stone'},
  {...good.market,y:-5.2},{...good.market,area:'market',escaped:false},
 ])assert.equal(createSession(storage({[key]:JSON.stringify({...good,market})})).getSave(),null);
 assert.equal(createSaveSnapshot({...live(),player:{x:3,y:0,face:1,grounded:true}}),null);
});

test('a legacy completed alley save stays readable for the new chapter transition',()=>{
 const legacy={version:1,chapter:'alley',alley:{area:'yard',x:190,y:0,face:1,crateXs:[43,53.9,137],jackStatus:'raised',pumpProgress:1,fencePassed:true,completed:true},checkpoint:3,player:{x:190,y:0,face:1},crateX:16,bridgeBroken:true,slipPlayed:true,awakened:true,learnedMechanics:[]};
 const resumed=createSession(storage({[key]:JSON.stringify(legacy)})).getSave();assert(resumed);assert.equal(resumed.chapter,'alley');assert(resumed.alley.completed);assert.equal(resumed.player.x,190);
});

test('blocked browser storage still retains the new market checkpoint in memory',()=>{
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}},session=createSession(blocked),safe=snapshot({area:'market',x:78,y:-5.2,hungerPlayed:true,food:'held',escaped:true});
 assert(session.save(safe));assert.deepEqual(session.getSave(),safe);session.clearSave();assert.equal(session.getSave(),null);
});
