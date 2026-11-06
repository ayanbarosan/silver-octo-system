import test from 'node:test';
import assert from 'node:assert/strict';
import {MOVEMENT,movementVelocity,preparationX,landingDistance,groundStepY,crateSideContact} from '../src/movement.js';
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

test('the mattress is a low step while the real rooftop gap stays unsupported',()=>{
 const bed={x:-.9,w:2.2,y:.12},roof={x:-1,w:23,y:0},guard={x:-1.04,w:.18,y:1.32};
 const surfaces=[bed,roof,guard];
 assert.equal(groundStepY(0,0,surfaces),.12,'Walking onto bedding should step onto its top.');
 assert.equal(groundStepY(1.6,.12,surfaces),0,'Walking off bedding should return to the roof.');
 assert.equal(groundStepY(-.65,.12,surfaces),.12,'The guard must not become a giant automatic step.');
 assert.equal(groundStepY(23,0,surfaces),undefined,'Low-step handling must not bridge the rooftop gap.');
});

test('stepping off either crate edge keeps moving away while the trailing shoe passes below the top',()=>{
 const crate={x:12.45,w:1.1,y:.85},dt=1/120;
 for(const face of [-1,1]){
  const edge=face>0?crate.x+crate.w:crate.x;
  const player={x:edge+face*.03,y:crate.y,vx:face*MOVEMENT.walk,vy:0,grounded:false};
  const startX=player.x;let samplesBelowTop=0,landed=false;
  for(let frame=0;frame<120&&!landed;frame++){
   player.vy-=MOVEMENT.gravity*dt;
   player.y+=player.vy*dt;
   const nextX=player.x+player.vx*dt;
   assert.equal(crateSideContact(player,nextX,crate),null,'A departing child cannot be frozen by overlap with the crate they are leaving.');
   if(player.y<crate.y-.02)samplesBelowTop++;
   player.x=nextX;
   if(player.y<=0){player.y=0;player.grounded=true;landed=true;}
  }
  assert(landed&&samplesBelowTop>20,'The regression must include a real drop through the height that previously caused the side freeze.');
  assert((player.x-startX)*face>.6,'Horizontal movement must continue naturally throughout the drop.');
 }
});

test('crate sides stop incoming travel at the surface while allowing escape from an existing overlap',()=>{
 const crate={x:12.45,w:1.1,y:.85},radius=.21;
 for(const side of [-1,1]){
  const edge=side<0?crate.x:crate.x+crate.w,boundary=edge+side*radius;
  for(const y of [0,.4,crate.y-.035]){
   const incoming={x:boundary+side*.3,y,grounded:y===0};
   const contact=crateSideContact(incoming,edge-side*.08,crate,radius);
   assert(contact&&contact.side===side);assert(Math.abs(contact.x-boundary)<1e-9,'Incoming travel must stop at the actual crate side, including the child radius.');
   const overlapping={x:edge+side*.06,y,grounded:false};
   assert.equal(crateSideContact(overlapping,overlapping.x+side*.03,crate,radius),null,'A slight existing overlap must allow motion away instead of snapping the character back into the crate.');
   const blocked=crateSideContact(overlapping,overlapping.x-side*.03,crate,radius);
   assert(blocked);assert.equal(blocked.x,overlapping.x,'Contact from an overlap may stop incoming movement but cannot reverse it to a remote boundary.');
  }
  const onTop={x:edge-side*.12,y:crate.y,grounded:true};
  assert.equal(crateSideContact(onTop,onTop.x+side*.05,crate,radius),null,'Walking on the crate top must not collide with its own side.');
 }
});
