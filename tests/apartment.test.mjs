import test from 'node:test';
import assert from 'node:assert/strict';
import {APARTMENT,ESCAPE,apartmentRoom,apartmentHeight,escapeHeight,createApartment,normalizeApartmentSave} from '../src/apartment.js';
const setup=saved=>{const apartment=createApartment(),player={};assert(apartment.begin(player,saved));return{apartment,player,events:[]};};
function step(r,input={},frames=1,hz=90){for(let i=0;i<frames;i++){const e=r.apartment.update(1/hz,input,r.player);r.events.push(...r.apartment.state.events);assert([r.player.x,r.player.y,r.player.z,r.player.vx,r.player.vy,r.player.vz].every(Number.isFinite));assert(r.player.y>=-6.4-1e-6);}}
function moveTo(r,x,d=1){for(let i=0;i<3000;i++){step(r,{direction:d,running:true});if(d>0?r.player.x>=x-1e-7:r.player.x<=x+1e-7)break;}step(r,{},40);}
function blockDoor(r){
 moveTo(r,18.05);step(r,{interact:true});step(r,{},100);assert(r.apartment.state.doorClosed);
 moveTo(r,20.44);assert(Math.abs(r.player.x-20.44)<.02);
 step(r,{interact:true,direction:-1},300);step(r,{},20);
 assert(r.apartment.state.barricaded);assert.equal(r.apartment.state.nightstandX,18.36);
}
function clearWindow(r){
 step(r,{jump:true,direction:1,running:true},80);step(r,{direction:1,running:true},60);
 assert(r.player.x>18.75,'The existing jump controls must clear the movable cabinet.');
 moveTo(r,24.6);step(r,{interact:true});step(r,{},230);
 assert.equal(r.apartment.state.area,'fireescape');assert.equal(r.player.x,27.1);assert.equal(r.player.y,0);
}

test('the kitchen stays quiet until living entry, then the father rises around the table before chasing',()=>{
 const r=setup();assert.equal(r.apartment.state.fatherPhase,'sleep');assert(r.apartment.state.nearExit);
 moveTo(r,8);assert.equal(r.apartment.state.story,'quiet');
 moveTo(r,10);assert.equal(r.apartment.state.story,'pursuit');assert(!r.apartment.state.nearExit);
 assert(r.events.includes('wake-father'));step(r,{},170);
 assert.equal(r.apartment.state.fatherPhase,'chase');assert.equal(r.apartment.state.fatherZ,1.4);
 assert(r.apartment.state.fatherX>=7.9);
 assert.equal(apartmentRoom(9.5),'living');assert.equal(apartmentRoom(17.3),'bedroom');
});

test('walking, stopping and reversal retain weighted motion at different update rates',()=>{
 const run=hz=>{const r=setup({x:3,face:1});for(const [seconds,input]of[[1,{direction:1,running:true}],[.5,{}],[1,{direction:-1}]])step(r,input,Math.round(seconds*hz),hz);return r.player;};
 const reference=run(120);
 for(const hz of[30,60,240]){const p=run(hz);assert(Math.abs(p.x-reference.x)<.00005);assert(Math.abs(p.vx-reference.vx)<.00001);assert.equal(p.face,reference.face);}
 const r=setup({x:3,face:1});step(r,{direction:1,running:true},90);const x=r.player.x;step(r,{direction:-1});assert(r.player.x>x);assert.equal(r.player.face,1);step(r,{direction:-1},40);assert.equal(r.player.face,-1);
});

test('a fresh bedroom E press closes the door while held E before arriving cannot close it',()=>{
 const r=setup();for(let i=0;i<800&&r.player.x<18.1;i++)step(r,{direction:1,running:true,interact:true});
 assert(!r.apartment.state.doorClosing);assert(!r.apartment.state.doorClosed);
 step(r,{},1);step(r,{interact:true});step(r,{},100);assert(r.apartment.state.doorClosed);
 assert.equal(r.apartment.state.doorProgress,1);assert(r.events.includes('close-door'));
});

test('nightstand collision, pull and vault produce a physical barricade without auto climbing',()=>{
 const r=setup({x:20,face:1,stage:'bedroom',nightstandX:21.2,doorClosed:true});
 step(r,{direction:1},100);assert(Math.abs(r.player.x-20.44)<1e-9);assert.equal(r.player.y,0);
 step(r,{interact:true,direction:-1},90);assert(r.apartment.state.nightstandX<20.3);assert.equal(r.apartment.state.interaction.kind,'pull');assert.equal(r.player.face,1);
 step(r,{interact:true,direction:-1},200);step(r,{},10);assert(r.apartment.state.barricaded);
 step(r,{jump:true,direction:1,running:true},110);assert(r.player.x>19);assert(r.events.includes('takeoff'));
 step(r,{},100);assert(r.player.grounded);assert.equal(r.player.y,0);
});

test('a full real-input escape closes and blocks the door, opens the window, descends both flights and ends under the watching father',()=>{
 const r=setup();blockDoor(r);assert(r.events.includes('glass-impact'));clearWindow(r);
 assert(r.events.includes('open-window'));assert(r.events.includes('escape-start'));assert.equal(r.apartment.state.windowProgress,1);
 const save=r.apartment.snapshot();assert.equal(save.stage,'fireescape');assert.equal(apartmentHeight(save),0);
 moveTo(r,33);step(r,{direction:1},150);assert.equal(r.apartment.state.escapeFlight,1);assert.equal(r.player.z,3);assert.equal(r.player.y,-3.2);
 moveTo(r,28,-1);step(r,{direction:-1},150);assert.equal(r.apartment.state.area,'playground');assert.equal(r.player.y,-6.4);assert.equal(r.player.z,4.5);
 assert(r.events.includes('playground'));assert.equal(r.apartment.state.fatherPhase,'watch');assert.equal(r.apartment.state.fatherX,27.1);assert.equal(r.apartment.state.fatherY,0);
 assert(r.apartment.state.nightstandZ<.31,'The father must shove the barricade out of his walking lane.');
 const frozen={x:r.apartment.state.fatherX,y:r.apartment.state.fatherY,z:r.apartment.state.fatherZ,t:r.apartment.state.fatherPhaseTime};
 step(r,{direction:1},300);assert.deepEqual({x:r.apartment.state.fatherX,y:r.apartment.state.fatherY,z:r.apartment.state.fatherZ,t:r.apartment.state.fatherPhaseTime},frozen);
 assert.equal(r.apartment.snapshot().stage,'playground');
});

test('the window stays locked until barricaded and E held during approach never activates it later',()=>{
 const r=setup({x:24.6,face:1,stage:'bedroom',nightstandX:21.2,doorClosed:true});step(r,{interact:true},100);assert.equal(r.apartment.state.windowProgress,0);
 const b=setup({x:23.7,face:1,stage:'bedroom',nightstandX:18.36,doorClosed:true});step(b,{direction:1,interact:true},90);assert.equal(b.apartment.state.windowProgress,0);
 step(b,{});step(b,{interact:true});step(b,{},80);assert.equal(b.apartment.state.phase,'window');assert(b.apartment.state.windowClimb.progress>0);
});

test('being caught has a bounded non-graphic impact/fall and retries a reachable checkpoint',()=>{
 const r=setup({x:12,face:1});step(r,{},700);assert.equal(r.apartment.state.phase,'caught');assert(r.apartment.state.caught.impact);assert.equal(r.apartment.state.caught.fallProgress,1);assert(r.events.includes('retry'));
 assert.equal(r.apartment.snapshot(),null);assert(r.apartment.retry(r.player));assert.equal(r.player.x,8.7);assert.equal(r.apartment.state.story,'quiet');assert.equal(r.apartment.state.fatherPhase,'sleep');
 step(r,{direction:1,running:true},20);assert(r.player.x>8.7);
});

test('an airborne catch lowers the root continuously onto the apartment floor before retry',()=>{
 const r=setup({x:12,face:1});
 for(let i=0;i<1200&&!(r.apartment.state.fatherPhase==='chase'&&r.player.x-r.apartment.state.fatherX<.75);i++)step(r);
 step(r,{jump:true});
 for(let i=0;i<90&&r.apartment.state.phase!=='caught';i++)step(r);
 assert.equal(r.apartment.state.phase,'caught');assert(r.apartment.state.caught.startY>.1);
 const start=r.player.y;let previous=start,maxDrop=0;
 for(let i=0;i<170;i++){
  step(r);assert(r.player.y<=previous+1e-8);maxDrop=Math.max(maxDrop,previous-r.player.y);previous=r.player.y;
  if(r.apartment.state.caught.impact)assert(r.apartment.state.attackProgress>=.5,'The glass swing must reach the child when the fall reacts to impact.');
 }
 assert.equal(r.player.y,0);assert(maxDrop<.05,'A captured airborne root must settle instead of teleporting to the floor.');
 assert(r.events.includes('retry'));assert(r.apartment.retry(r.player));assert.equal(r.player.y,0);
});

test('the father retrieves the same intact thrown glass before battering or catching again',()=>{
 const r=setup();moveTo(r,18.05);step(r,{interact:true});
 for(let i=0;i<900&&r.apartment.state.fatherPhase!=='retrieve';i++)step(r);
 assert.equal(r.apartment.state.fatherPhase,'retrieve');assert(r.apartment.state.glassThrown);assert(!r.apartment.state.glassRetrieved);
 step(r,{},40);assert(!r.apartment.state.glassRetrieved,'The tumbler stays on the floor until the reaching hand arrives.');
 step(r,{},20);assert(r.apartment.state.glassRetrieved);assert(r.events.includes('glass-impact'));assert(r.events.includes('glass-retrieved'));
 step(r,{},20);assert.equal(r.apartment.state.fatherPhase,'batter');assert.equal(r.apartment.state.retrieveProgress,1);
 const restored=setup({x:24,face:1,stage:'bedroom',nightstandX:21.2,doorClosed:true});
 assert(restored.apartment.state.glassThrown&&restored.apartment.state.glassRetrieved,'Bedroom Continue must restore the already recovered glass.');
});

test('opening the window stages a short approach and ignores movement away from its sill',()=>{
 const r=setup({x:24.2,face:1,stage:'bedroom',nightstandX:18.36,doorClosed:true});
 step(r,{interact:true});assert.equal(r.apartment.state.phase,'opening-window');assert.equal(r.apartment.snapshot(),null);
 let previous=r.player.x,maxTravel=0;
 for(let i=0;i<67;i++){
  step(r,{direction:-1,running:true});assert(r.player.x>=previous-1e-8);maxTravel=Math.max(maxTravel,r.player.x-previous);previous=r.player.x;
 }
 assert(r.player.x>=25.14);assert(maxTravel<.04,'Window preparation must not snap from a remote room position.');
 step(r,{direction:-1});assert.equal(r.apartment.state.phase,'window');assert.equal(r.apartment.state.windowClimb.startX,25.15);
 assert.equal(r.apartment.state.windowProgress,1);assert.equal(r.player.y,0);
});

test('exterior Continue restores the cabinet after the father has pushed it clear of the door',()=>{
 for(const saved of[{stage:'fireescape',flight:0,x:28,face:1},{stage:'playground',x:32,face:1}]){
  const r=setup(saved),s=r.apartment.state;
  assert.equal(s.doorProgress,0);assert.equal(s.nightstandX,18.65);assert.equal(s.nightstandZ,.3);assert.equal(s.shoveProgress,1);
  assert(!s.barricaded);assert(s.glassRetrieved);assert.equal(s.fatherPhase,'watch');
  assert.deepEqual(r.apartment.snapshot(),saved);
 }
});

test('pause and invalid time freeze character, door, father, object, window and catch clocks',()=>{
 const r=setup({x:18,face:1,stage:'bedroom',nightstandX:21.2,doorClosed:true});step(r,{},12);
 const before=structuredClone({player:r.player,state:r.apartment.state});
 for(const dt of[0,-1,NaN,Infinity,undefined])r.apartment.update(dt,{direction:-1,interact:true,jump:true},r.player);
 assert.deepEqual({player:r.player,state:r.apartment.state},before);
});

test('legacy and story saves restore safe supports and reject embedded or malformed checkpoints',()=>{
 for(const x of[.9,1.4,8,12,18,21.2,25]){
  const r=setup({x,face:1});assert.equal(r.player.x,x);assert.equal(r.player.y,0);assert(Math.abs(r.player.x-r.apartment.state.nightstandX)>=.76-EPS);
 }
 for(const saved of[
  {stage:'bedroom',x:19.2,face:1,nightstandX:18.36,doorClosed:true},
  {stage:'fireescape',flight:0,x:30,face:1},
  {stage:'fireescape',flight:1,x:31,face:-1},
  {stage:'playground',x:42,face:1}
 ]){const r=setup(saved);assert.equal(r.player.y,apartmentHeight(saved));assert.deepEqual(r.apartment.snapshot(),saved);const copy=r.apartment.snapshot();copy.x=200;assert.equal(r.player.x,saved.x);}
 assert.equal(escapeHeight(0,28),0);assert.equal(escapeHeight(0,33),-3.2);assert.equal(escapeHeight(1,28),-6.4);assert.equal(ESCAPE.steps,20);
 for(const value of[null,[],{}, {x:NaN,face:1},{x:Infinity,face:1},{x:.5,face:1},{x:25.01,face:1},{x:'4',face:1},{x:4,face:0},
  {stage:'bedroom',x:21.2,face:1,nightstandX:21.2,doorClosed:true},{stage:'bedroom',x:24,face:1,nightstandX:18,doorClosed:true},
  {stage:'fireescape',flight:2,x:30,face:1},{stage:'fireescape',flight:0,x:34,face:1},{stage:'playground',x:25,face:1}
 ])assert.equal(normalizeApartmentSave(value),null);
 const r=setup();for(const patch of[{y:.1},{y:NaN},{z:0},{z:Infinity},{grounded:false},{grounded:'yes'}]){const old={...r.player};Object.assign(r.player,patch);assert.equal(r.apartment.snapshot(),null);Object.assign(r.player,old);}
 r.apartment.reset();assert.equal(r.apartment.state,null);assert.equal(r.apartment.active,false);assert.equal(r.apartment.snapshot(),null);assert(r.apartment.begin(r.player));
});
const EPS=1e-7;
