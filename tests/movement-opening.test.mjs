import test from 'node:test';
import assert from 'node:assert/strict';
import {MOVEMENT,movementVelocity,preparationX,landingDistance} from '../src/movement.js';
import {createOpening} from '../src/opening.js';

test('jump preparation advances the stride without stepping off either roof edge',()=>{
 const surfaces=[{x:-1,w:23,y:0}];
 const moving=preparationX({x:10,y:0,vx:MOVEMENT.run,running:true,dt:.085,grounded:true,surfaces});
 assert(moving>10.20,'A running jump must not begin with a full stop.');
 assert(preparationX({x:21.95,y:0,vx:3.3,running:true,dt:.1,grounded:true,surfaces})<=21.975);
 assert(preparationX({x:-.95,y:0,vx:-3.3,running:true,dt:.1,grounded:true,surfaces})>=-.975);
});
test('airborne release preserves momentum while grounded stopping remains deliberate',()=>{
 let air=3.3,ground=3.3;
 for(let i=0;i<60;i++){air=movementVelocity(air,0,false,false,1/120);ground=movementVelocity(ground,0,false,true,1/120);}
 assert(air>2.7&&ground<.06);
 assert.equal(movementVelocity(3.3,1,false,false,.2),3.3,'Releasing sprint mid-jump must not throw away the launch speed.');
 let thirty=0,high=0;for(let i=0;i<30;i++)thirty=movementVelocity(thirty,1,true,true,1/30);for(let i=0;i<120;i++)high=movementVelocity(high,1,true,true,1/120);
 assert(Math.abs(thirty-high)<1e-9,'Acceleration must be frame-rate independent.');
});
test('landing reach identifies a higher platform and keeps roof gaps unknown',()=>{
 const surfaces=[{x:-1,w:23,y:0},{x:24.2,w:18.8,y:.45},{x:6.2,w:1.6,y:.85}];
 assert(Math.abs(landingDistance(7,1.2,surfaces)-.35)<1e-8);
 assert.equal(landingDistance(23,1,surfaces),undefined);
 assert(Math.abs(landingDistance(25,.6,surfaces)-.15)<1e-8);
});
test('opening reveals the warning, waits for real input progress and triggers one close call',()=>{
 const opening=createOpening();opening.reset();let events=[];
 for(let i=0;i<204;i++)events.push(...opening.update(1/60,{wake:Math.min(1,i/204),x:0}));
 assert(events.includes('warning'));assert.equal(opening.state.escaped,false);assert.equal(opening.state.active,true);
 for(let i=0;i<300;i++)opening.update(1/60,{wake:1,x:0});assert.equal(opening.state.phase,'escape','The story waits instead of forcing a player off the edge.');
 events=opening.update(1/60,{wake:1,x:2});assert(events.includes('edge-break'));assert(opening.state.edgeImpact>0);
 let breaks=0;for(let i=0;i<300;i++)breaks+=opening.update(1/60,{wake:1,x:3}).filter(e=>e==='edge-break').length;
 assert.equal(breaks,0);assert.equal(opening.state.active,false);assert.equal(opening.state.cue,'');
 opening.reset();assert.equal(opening.state.escaped,false);assert.equal(opening.state.elapsed,0);assert.equal(opening.state.active,true);
});

// Based on the supplied reference: a lower body arc, not a much longer hang.
test('jump arc stays low while keeping the observed flight rhythm',()=>{
 const height=MOVEMENT.jumpVelocity**2/(2*MOVEMENT.gravity);
 const duration=2*MOVEMENT.jumpVelocity/MOVEMENT.gravity;
 assert(height>.85&&height<1.15,'A child-height vertical launch would recreate the floating jump.');
 assert(duration>.82&&duration<.95,'Lowering the arc must not turn the jump into a rapid hop or long hover.');
});
test('the lower reference jump still crosses the existing rooftop gap',()=>{
 const roof={x:-1,w:23,y:0};let x=21.6;
 for(let t=0;t<.085;t+=1/180)x=preparationX({x,y:0,vx:MOVEMENT.run,running:true,dt:1/180,grounded:true,surfaces:[roof]});
 let y=0,vy=MOVEMENT.jumpVelocity,landed=false;
 for(let i=0;i<220;i++){
  const before=y;x+=MOVEMENT.run/180;vy-=MOVEMENT.gravity/180;y+=vy/180;
  if(x>=24.2&&vy<0&&before>=.45&&y<=.45){landed=true;break;}
 }
 assert(landed,'Reference-like height must preserve the current level route.');
});
