import {MOVEMENT,crateSideContact} from './movement.js';
import {createClimb,sampleClimb} from './climb.js';
import {createSlide} from './slide.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=v=>{const p=clamp(v);return p*p*(3-2*p);};
const frozen=value=>Object.freeze(value),EPS=1e-7,RADIUS=.22;
export const MARKET=frozen({
 minX:0,maxX:118,lane:1.4,upperY:0,groundY:-5.2,
 entry:frozen({x:2,y:0,face:1}),walkSpeed:1.55,runSpeed:2.65,crouchSpeed:.68,
 hunger:frozen({x:7,duration:1.8,speed:1.05}),
 kiosk:frozen({minX:21,maxX:30,frontZ:0,rearZ:-3.5,nearX:24.5,takeX:24.5,duration:.95,handle:frozen({x:25,y:1.02,z:1.0})}),
 vendor:frozen({x:27.4,y:0,z:-1,notice:.65,exitSpeed:3.7,chaseSpeed:2.8,catchupSpeed:3.35,stopX:65.4,catchDistance:.83}),
 rail:frozen({id:'market-street-railing',x:66,w:.14,y:.92}),
 awning:frozen({minX:67,maxX:74,y:-2.7,z:1.4,halfWidthZ:1.5,duration:1.25,maxDeflection:.45}),
 market:frozen({minX:74.15,maxX:118,y:-5.2,eatX:79,completeX:116}),
 eat:frozen({duration:2.25,handle:frozen({x:.18,y:1.30,z:0})})
});

// This same surface is used by the cloth mesh and the boy's supported feet.
// Deflection may briefly be negative during the small spring rebound.
export function awningSurfaceY(x,state={}){
 const centre=Number.isFinite(state.awningImpactX)?state.awningImpactX:70.1;
 const deflection=Number.isFinite(state.awningDeflection)?state.awningDeflection:0;
 const edge=smooth((x-MARKET.awning.minX)/.45)*smooth((MARKET.awning.maxX-x)/.45);
 const weight=edge*Math.exp(-(((x-centre)/2.25)**2));
 return MARKET.awning.y-deflection*weight;
}

function vendorSave(value,food,escaped,x){
 const fallback=food==='display'?{phase:'idle',x:MARKET.vendor.x,z:MARKET.vendor.z,face:-1,time:0,exitIndex:0,heading:-Math.PI/2}:
  escaped?{phase:'watch',x:MARKET.vendor.stopX,z:MARKET.lane,face:1,time:0,exitIndex:2,heading:Math.PI/2}:
  {phase:'chase',x:Math.max(20.5,x-8),z:MARKET.lane,face:1,time:0,exitIndex:2,heading:Math.PI/2};
 if(value===undefined)return {...fallback,y:0};
 if(!value||typeof value!=='object'||Array.isArray(value)||!['idle','notice','exit','chase','brake','watch'].includes(value.phase))return null;
 const {phase}=value,time=value.time??0,face=value.face??1,exitIndex=value.exitIndex??0,heading=value.heading??face*Math.PI/2;
 if(!Number.isFinite(value.x)||value.x<20.45-EPS||value.x>MARKET.vendor.stopX+EPS||!Number.isFinite(value.z)||value.z<MARKET.vendor.z-EPS||value.z>MARKET.lane+EPS)return null;
 if(!Number.isFinite(time)||time<0||time>3600||(face!==1&&face!==-1)||!Number.isInteger(exitIndex)||exitIndex<0||exitIndex>2||!Number.isFinite(heading)||Math.abs(heading)>Math.PI*2)return null;
 if(food==='display'&&phase!=='idle'||food!=='display'&&!escaped&&phase==='idle')return null;
 return {phase,x:value.x,y:0,z:value.z,face,time,exitIndex,heading};
}
export function normalizeMarketSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const {x,face}=value,y=value.y??0,food=value.food??'display',area=value.area??(y<-1?'market':food==='display'?'approach':'chase');
 const hungerPlayed=value.hungerPlayed??false,escaped=value.escaped??area==='market',completed=value.completed??false;
 if(!Number.isFinite(x)||!Number.isFinite(y)||(face!==1&&face!==-1)||!['approach','chase','market'].includes(area)||!['display','held','eaten'].includes(food))return null;
 if(typeof hungerPlayed!=='boolean'||typeof escaped!=='boolean'||typeof completed!=='boolean'||food!=='display'&&!hungerPlayed)return null;
 if(area==='market'){
  if(!escaped||x<MARKET.market.minX-EPS||x>MARKET.maxX+EPS||Math.abs(y-MARKET.groundY)>.025)return null;
 }else if(escaped||x<MARKET.minX-EPS||x>MARKET.rail.x-RADIUS+EPS||Math.abs(y)>.025||area==='approach'&&food!=='display'||area==='chase'&&food!=='held')return null;
 if(food==='eaten'&&area!=='market'||completed&&(area!=='market'||x<MARKET.market.completeX))return null;
 const vendor=vendorSave(value.vendor,food,escaped,x);if(!vendor)return null;
 return {area,x,y:area==='market'?MARKET.groundY:0,face,hungerPlayed,food,escaped,completed,vendor};
}
export const marketHeight=saved=>saved?.area==='market'?MARKET.groundY:0;

export function createMarket(){
 let state=null,lastPlayer=null;const slide=createSlide();
 const emit=event=>{state.events.push(event);return event;};
 function resetJump(){Object.assign(state.jump,{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0});state.buffer=0;state.coyote=0;}
 function phase(value){state.phase=value;state.phaseTime=0;}
 function base(saved){return {
  area:saved.area,phase:'walk',phaseTime:0,elapsed:0,heading:saved.face*Math.PI/2,direction:0,velocity:0,acceleration:0,running:false,landImpact:0,
  hungerPlayed:saved.hungerPlayed,food:saved.food,escaped:saved.escaped,completed:saved.completed,vendor:{...saved.vendor},
  jump:{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0},buffer:0,coyote:MOVEMENT.coyote,jumpHeld:false,interactHeld:false,crouchHeld:false,
  crouch:0,slide:null,slidesCompleted:0,climb:null,climbsCompleted:0,marketAction:null,caught:null,nearFood:false,nearInteraction:false,
  awningDeflection:0,awningImpactX:70.1,awningImpact:0,awningStartX:0,dropStarted:false,eatStarted:saved.food==='eaten',retryIssued:false,checkpoint:null,events:[]
 };}
 function begin(player,saved=null){
  if(state||!player||typeof player!=='object')return false;const s=normalizeMarketSave(saved)??normalizeMarketSave(MARKET.entry);
  state=base(s);lastPlayer=player;slide.reset();
  Object.assign(player,{x:s.x,y:s.y,z:MARKET.lane,vx:0,vy:0,vz:0,face:s.face,grounded:true});
  state.checkpoint=s.area==='market'?normalizeMarketSave({...s,x:76,completed:false}):normalizeMarketSave({...MARKET.entry,x:23.4,hungerPlayed:true});
  sync(player);return true;
 }
 function supportAt(x,oldY=Infinity){
  if(x<=MARKET.rail.x+.02&&oldY>=-.03)return 0;
  if(x>=MARKET.awning.minX&&x<=MARKET.awning.maxX&&oldY>=MARKET.awning.y-.06)return awningSurfaceY(x,state);
  if(x>=MARKET.market.minX-.15)return MARKET.groundY;
  return -Infinity;
 }
 function checkpoint(player,kind){const save=saveAt(player);if(save){state.checkpoint=save;state.checkpointKind=kind;emit('checkpoint');}}
 function sync(player){
  state.velocity=Math.hypot(player.vx,player.vz);state.heading=player.face*Math.PI/2;
  state.nearFood=state.phase==='walk'&&state.food==='display'&&!state.escaped&&player.grounded&&Math.abs(player.y)<.03&&Math.abs(player.x-MARKET.kiosk.nearX)<.85;
  state.nearInteraction=state.nearFood;
  if(state.phase==='walk'&&state.food==='held')state.marketAction={type:'carry-food',progress:1,elapsed:state.elapsed,face:player.face};
  else if(state.phase==='walk')state.marketAction=null;
 }
 function saveAt(player){
  if(!player?.grounded||state.phase!=='walk'||state.climb||slide.active||state.jump.preparing||state.jump.launched||state.caught||state.area==='escape'||state.area==='awning'||state.crouch>.001&&state.crouch<.98)return null;
  if(state.food==='held'&&!state.escaped&&Math.abs(player.x-state.vendor.x)<3.0&&Math.abs(player.z-state.vendor.z)<1)return null;
  return normalizeMarketSave({area:state.area,x:player.x,y:player.y,face:player.face,hungerPlayed:state.hungerPlayed,food:state.food,escaped:state.escaped,completed:state.completed,vendor:{...state.vendor}});
 }
 function caught(player,reason='vendor'){
  if(state.phase==='caught')return;phase('caught');state.climb=null;slide.reset();state.slide=null;state.marketAction=null;resetJump();
  state.caught={elapsed:0,progress:0,duration:1.6,impactAt:.08,impactDirection:player.face,startY:player.y,colliders:[]};state.detectedBy=reason;
  if(reason==='vendor')state.vendor.phase='caught';player.vx=player.vy=player.vz=0;emit('caught');
 }
 function vendorPhase(value){const v=state.vendor;if(v.phase!==value){v.phase=value;v.time=0;}}
 function ai(dt,player,input){
  if(input?.freezeThreats||state.completed||state.phase==='caught')return;
  const v=state.vendor;v.time+=dt;
  if(v.phase==='idle')return;
  if(v.phase==='notice'){
   v.face=player.x>=v.x?1:-1;v.heading=v.face*Math.PI/2;
   if(v.time>=MARKET.vendor.notice){vendorPhase('exit');emit('vendor-chase');}return;
  }
  if(v.phase==='exit'){
   const targets=[{x:20.5,z:-1},{x:20.5,z:MARKET.lane}],target=targets[v.exitIndex??0];
   if(!target){vendorPhase('chase');return;}
   const dx=target.x-v.x,dz=target.z-v.z,d=Math.hypot(dx,dz),travel=Math.min(d,MARKET.vendor.exitSpeed*dt);
   if(d>.00001){v.x+=dx/d*travel;v.z+=dz/d*travel;v.heading=Math.atan2(dx,dz);if(Math.abs(dx)>.01)v.face=Math.sign(dx);}
   if(d<=travel+.00001){v.exitIndex=(v.exitIndex??0)+1;if(v.exitIndex>=targets.length){v.z=MARKET.lane;v.face=1;v.heading=Math.PI/2;vendorPhase('chase');}}return;
  }
  if(v.phase==='chase'){
   const stop=state.escaped||state.climb?MARKET.vendor.stopX:player.x,dx=stop-v.x;
   const speed=dx>9?MARKET.vendor.catchupSpeed:MARKET.vendor.chaseSpeed;
   v.face=Math.sign(dx)||v.face;v.heading=v.face*Math.PI/2;
   const limit=state.escaped||state.climb?Math.abs(dx):Math.max(0,Math.abs(dx)-.65);
   v.x=clamp(v.x+Math.sign(dx)*Math.min(limit,speed*dt),20.5,MARKET.vendor.stopX);v.z=MARKET.lane;
   if((state.escaped||state.climb)&&v.x>=MARKET.vendor.stopX-.015){vendorPhase('brake');emit('vendor-stop');}
   else if(!state.escaped&&!state.climb&&Math.abs(player.x-v.x)<MARKET.vendor.catchDistance&&Math.abs(player.z-v.z)<.65)caught(player);
   return;
  }
  if(v.phase==='brake'){v.face=1;v.heading=Math.PI/2;if(v.time>.55)vendorPhase('watch');}
 }
 function startVault(player){
  const target={...MARKET.rail,w:.70},c=createClimb({x:player.x,y:player.y,face:1,target});if(!c)return false;
  c.vault=true;c.duration=.95;c.endX=66.85;state.climb=c;state.climbsCompleted=0;state.marketAction=null;resetJump();player.vx=player.vy=0;player.grounded=false;player.face=1;emit('rail-vault');return true;
 }
 function markEscaped(){if(state.escaped)return;state.escaped=true;state.area='escape';emit('rail-clear');}
 function landAwning(player,impact){
  markEscaped();phase('awning-impact');state.area='awning';state.awningImpact=clamp(impact,.3,1);state.awningImpactX=clamp(player.x,67.25,72.4);state.awningStartX=clamp(player.x,67.25,72.4);state.awningDeflection=0;
  player.x=state.awningStartX;player.y=awningSurfaceY(player.x,state);player.vx=player.vy=0;player.grounded=true;resetJump();
  // A landing can be rendered before the next simulation tick. Its supporting
  // pose must begin on this tick, rather than leaving the airborne carry pose
  // attached to grounded feet on the canvas for one frame.
  state.marketAction={type:'awning-impact',progress:0,elapsed:0,impact:state.awningImpact,deflection:0,face:1,surfaceY:player.y,braceY:awningSurfaceY(player.x+.35,state)+.025,supported:true};
  emit('awning-impact');
 }
 function marketLand(player){
  state.area='market';state.escaped=true;phase('walk');state.marketAction=null;state.awningDeflection=0;player.y=MARKET.groundY;player.vy=0;player.grounded=true;state.landImpact=.55;resetJump();emit('market-land');checkpoint(player,'market');
 }
 function action(dt,player){
  state.phaseTime+=dt;const t=state.phaseTime;
  if(state.phase==='caught'){
   const c=state.caught;c.elapsed=Math.min(c.duration,c.elapsed+dt);c.progress=c.elapsed/c.duration;player.vx=player.vy=player.vz=0;
   if(c.progress>=1&&!state.retryIssued){state.retryIssued=true;emit('retry');}return true;
  }
  if(state.phase==='take-food'){
   const p=clamp(t/MARKET.kiosk.duration),oldX=player.x;player.x=mix(state.takeStartX,MARKET.kiosk.takeX,smooth(p/.30));player.vx=(player.x-oldX)/dt;player.face=1;
   state.marketAction={type:'take-food',progress:p,elapsed:t,aligning:p<.30,handle:{...MARKET.kiosk.handle},face:1};
   if(p>=1){state.food='held';state.area='chase';phase('walk');player.vx=0;state.marketAction=null;vendorPhase('notice');emit('food-taken');emit('vendor-notice');}return true;
  }
  if(state.phase==='awning-impact'){
   const p=clamp(t/MARKET.awning.duration),oldX=player.x,oldY=player.y;
   state.awningDeflection=clamp(state.awningImpact*.60*Math.exp(-3.4*t)*Math.sin(8.3*t),-.10,MARKET.awning.maxDeflection);
   player.x=mix(state.awningStartX,Math.min(73.05,state.awningStartX+.25),smooth(p));player.y=awningSurfaceY(player.x,state);player.vx=(player.x-oldX)/dt;player.vy=(player.y-oldY)/dt;player.grounded=true;player.face=1;
   state.marketAction={type:'awning-impact',progress:p,elapsed:t,impact:state.awningImpact,deflection:state.awningDeflection,face:1,surfaceY:player.y,braceY:awningSurfaceY(player.x+.35,state)+.025,supported:true};
   if(p>=1){phase('awning-drop');state.dropStarted=false;state.dropAirTime=0;player.vx=2.2;player.vy=0;state.marketAction={type:'awning-drop',progress:0,elapsed:0,airTime:0,face:1,airborne:false,supported:true,surfaceY:player.y};emit('awning-drop');}return true;
  }
  if(state.phase==='awning-drop'){
   const oldY=player.y;player.x+=2.2*dt;player.vx=2.2;player.face=1;
   if(player.x<=MARKET.awning.maxX){player.y=awningSurfaceY(player.x,state);player.vy=(player.y-oldY)/dt;player.grounded=true;}
   else{player.grounded=false;if(!state.dropStarted){state.dropStarted=true;player.vy=0;}state.dropAirTime=(state.dropAirTime??0)+dt;player.y+=player.vy*dt-.5*MOVEMENT.fallGravity*dt*dt;player.vy-=MOVEMENT.fallGravity*dt;}
   state.marketAction={type:'awning-drop',progress:player.grounded?0:clamp(state.dropAirTime/.75),elapsed:t,airTime:state.dropAirTime??0,face:1,airborne:!player.grounded,supported:player.grounded,surfaceY:player.y};
   if(player.x>=MARKET.market.minX&&player.y<=MARKET.groundY&&player.vy<0)marketLand(player);return true;
  }
  if(state.phase==='eat'){
   const p=clamp(t/MARKET.eat.duration);player.vx=player.vy=0;player.face=1;
   state.marketAction={type:'eat',progress:p,elapsed:t,face:1,handle:{x:player.x+.18,y:player.y+1.30,z:player.z}};
   if(p>=1){state.food='eaten';state.marketAction=null;phase('walk');emit('eat-end');checkpoint(player,'fed');}return true;
  }
  return false;
 }
 function update(dt,input={},player){
  if(!state||!player||!Number.isFinite(dt)||dt<=0)return null;dt=Math.min(dt,.1);lastPlayer=player;state.events=[];state.elapsed+=dt;state.landImpact=0;
  const direction=Number.isFinite(input.direction)?Math.sign(input.direction):0,wantsJump=!!input.jump,freshJump=wantsJump&&!state.jumpHeld,interact=!!input.interact,freshInteract=interact&&!state.interactHeld,crouch=!!input.crouch,freshCrouch=crouch&&!state.crouchHeld;
  state.direction=direction;state.jumpHeld=wantsJump;state.interactHeld=interact;state.crouchHeld=crouch;
  if(action(dt,player)){ai(dt,player,input);sync(player);return state.events[0]??null;}
  if(freshInteract&&state.nearFood){state.takeStartX=player.x;phase('take-food');state.crouch=0;resetJump();slide.reset();state.slide=null;player.vx=player.vy=0;emit('take-food');return state.events[0];}
  if(!state.hungerPlayed&&player.x>=MARKET.hunger.x&&player.grounded&&!state.escaped){state.hungerPlayed=true;phase('hunger');emit('hunger');}
  if(state.phase==='hunger'){
   const p=clamp(state.phaseTime/MARKET.hunger.duration);state.marketAction={type:'hunger',progress:p,elapsed:state.phaseTime,face:player.face};
   if(p>=1){phase('walk');state.marketAction=null;}
  }
  if(state.area==='market'&&state.food==='held'&&!state.eatStarted&&player.x>=MARKET.market.eatX&&player.grounded){state.eatStarted=true;phase('eat');resetJump();player.vx=player.vy=0;emit('eat');sync(player);return state.events[0];}
  if(state.climb){
   const c=state.climb;c.elapsed=Math.min(c.duration,c.elapsed+dt);c.progress=c.elapsed/c.duration;const p=sampleClimb(c);player.x=p.x;player.y=p.y;player.vx=player.vy=0;player.grounded=false;player.face=1;
   if(player.x>66.35)markEscaped();
   if(c.progress>=1){state.climb=null;state.climbsCompleted++;player.y=c.topY;player.vx=2.2;player.vy=0;state.jump.airTime=.25;state.jump.launched=false;emit('rail-vault-end');}
   ai(dt,player,input);sync(player);return state.events[0]??null;
  }
  const canSlide=state.phase==='walk'&&player.grounded&&!state.jump.preparing&&!state.jump.launched&&state.crouch<.02;
  if(freshCrouch&&input.running&&canSlide&&slide.begin(player)){state.slide=slide.state;resetJump();emit('slide-start');}
  if(slide.active){
   const oldVX=player.vx,done=slide.update(dt,{},player);let nextX=player.x+(oldVX+player.vx)*.5*dt;
   const hit=!state.escaped?crateSideContact(player,nextX,MARKET.rail,RADIUS):null;
   if(hit){nextX=hit.x;slide.update(.000001,{blocked:true},player);}player.x=clamp(nextX,state.area==='market'?MARKET.market.minX:MARKET.minX,MARKET.maxX);
   state.slide=slide.state;state.crouch=state.slide?.lowAmount??(crouch?1:0);state.acceleration=clamp((player.vx-oldVX)/dt,-16,16);
   if(done||!slide.active){state.slide=null;state.slidesCompleted++;state.crouch=crouch?1:0;emit('slide-end');}ai(dt,player,input);sync(player);return state.events[0]??null;
  }
  const low=player.grounded&&crouch?1:0;state.crouch+=Math.sign(low-state.crouch)*Math.min(Math.abs(low-state.crouch),dt/.28);
  const crouching=state.crouch>.001||!!low,running=!!input.running&&!crouching&&state.phase!=='hunger';state.running=running;
  if(freshJump&&!crouching)state.buffer=MOVEMENT.buffer;
  state.buffer=Math.max(0,state.buffer-dt);state.coyote=player.grounded?MOVEMENT.coyote:Math.max(0,state.coyote-dt);
  if(!state.escaped&&!crouching&&(state.buffer>0&&player.grounded||!player.grounded&&wantsJump&&state.jump.launched)&&player.face>0&&startVault(player)){ai(dt,player,input);sync(player);return state.events[0]??null;}
  if(state.buffer>0&&state.coyote>0&&!state.jump.preparing&&!state.jump.launched){state.jump.preparing=true;state.jump.elapsed=0;state.jump.duration=running&&Math.abs(player.vx)>1?.085:.12;state.buffer=state.coyote=0;}
  const oldVX=player.vx,target=direction*(state.phase==='hunger'?MARKET.hunger.speed:crouching?MARKET.crouchSpeed:running?MARKET.runSpeed:MARKET.walkSpeed),response=player.grounded?(direction?5.6:8.5):direction?3.6:.35;
  player.vx=target+(oldVX-target)*Math.exp(-response*dt);if(!direction&&Math.abs(player.vx)<.002)player.vx=0;
  if(state.escaped&&player.x<67.35)player.vx=Math.max(2.2,player.vx);
  if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.18))player.face=direction;
  if(state.jump.preparing){state.jump.elapsed+=dt;if(state.jump.elapsed>=state.jump.duration){state.jump.preparing=false;state.jump.launched=true;state.jump.airTime=0;state.jump.launchSpeed=Math.abs(player.vx);player.vy=4.9;player.grounded=false;emit('takeoff');}}
  let nextX=player.x+(oldVX+player.vx)*.5*dt*(state.jump.preparing?.55:1);
  if(!state.escaped){const hit=crateSideContact(player,nextX,MARKET.rail,RADIUS);if(hit){nextX=hit.x;player.vx=0;}}
  player.x=clamp(nextX,state.area==='market'?MARKET.market.minX:MARKET.minX,MARKET.maxX);if(player.x!==nextX)player.vx=0;
  state.acceleration=clamp((player.vx-oldVX)/dt,-16,16);if(player.x>66.35)markEscaped();
  const oldY=player.y,floorBefore=supportAt(player.x,player.y);if(player.grounded&&floorBefore<player.y-.03)player.grounded=false;
  if(!player.grounded){
   const gravity=state.jump.launched?12.2:MOVEMENT.fallGravity;player.y+=player.vy*dt-.5*gravity*dt*dt;player.vy-=gravity*dt;state.jump.airTime+=dt;
   const floor=supportAt(player.x,oldY);
   if(player.y<=floor&&player.vy<=0){
    const impact=clamp(-player.vy/9,.15,1);
    if(player.x>=MARKET.awning.minX&&player.x<=MARKET.awning.maxX&&floor>MARKET.groundY+.2){landAwning(player,impact);}
    else if(floor===MARKET.groundY&&state.area!=='market')marketLand(player);
    else{player.y=floor;player.vy=0;player.grounded=true;state.landImpact=impact;state.jump.launched=false;state.jump.airTime=0;emit('land');}
   }
   if(player.y<-9)caught(player,'fall');
  }else{player.y=supportAt(player.x,player.y);player.vy=0;state.jump.airTime=0;}
  player.vz=0;
  if(state.area==='market'&&!state.completed&&player.x>=MARKET.market.completeX&&player.grounded&&!state.jump.preparing&&!state.jump.launched){state.completed=true;emit('complete');checkpoint(player,'complete');}
  ai(dt,player,input);sync(player);return state.events[0]??null;
 }
 return {get active(){return !!state;},get state(){return state;},begin,update,supportY(x){return state?supportAt(x):0;},snapshot(){return state?saveAt(lastPlayer):null;},retry(player=lastPlayer){if(!state||!player)return false;const saved={...state.checkpoint,vendor:{...state.checkpoint.vendor}};state=null;return begin(player,saved);},reset(){state=null;lastPlayer=null;slide.reset();}};
}
