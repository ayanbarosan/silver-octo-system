import {MOVEMENT,crateSideContact} from './movement.js';
import {createClimb,sampleClimb} from './climb.js';
import {createSlide} from './slide.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const EPS=1e-7,RADIUS=.22,GRAB=.40;
const frozen=value=>Object.freeze(value);
export const ALLEY=frozen({
 minX:0,maxX:194,lane:1.4,garageLane:4.2,groundY:0,
 entry:frozen({x:2,y:0,face:1}),walkSpeed:1.55,runSpeed:2.65,crouchSpeed:.68,carrySpeed:.95,
 dog:frozen({x:23,y:0,z:.25,wakeRadius:9,hearingRadius:8.5}),
 fence:frozen({id:'alley-fence',x:55,w:.18,y:2.35}),
 mainGate:frozen({id:'locked-alley-gate',x:116,w:.18,y:2.7}),
 carry:frozen({x:.38,y:.77}),
 mechanic:frozen({x:73,y:0,z:-1.4}),jack:frozen({x:82,y:.12,z:1.4}),
 garage:frozen({doorX:110,alignX:109.2,approachMinX:108.1,nearX:108.5,initialGap:.22,raisedGap:1.13,pumpDuration:8,pumpCycles:8,handle:frozen({x:109.56,y:.78,z:4.2,amplitude:.10}),lane:4.2,minX:110.65,maxX:137.45,windowX:137.8,sillY:1.55,windowExitX:140.3,windowReachX:137.2,windowAlignX:137.42,windowHandleY:1.87}),
 owner:frozen({investigateAfter:80,grace:7,patrolMinX:160,patrolMaxX:178,z:1.4}),
 yard:frozen({minX:140.3,maxX:194,covers:frozen([frozen([145.2,155.2]),frozen([162.2,167.3]),frozen([177.4,181.6])])}),
 crates:frozen([
  frozen({id:'alley-step-crate',x:43,w:1.05,y:.65,z:1.4,minX:37,maxX:52.9,area:'alley'}),
  frozen({id:'alley-fence-crate',x:47,w:1.3,y:1.05,z:1.4,minX:38,maxX:53.9,area:'alley'}),
  frozen({id:'garage-crate',x:126,w:1.1,y:.75,z:4.2,minX:119,maxX:137.0,area:'garage'})
 ])
});

const supported=(x,y,area,crates)=>{
 if(Math.abs(y)<.025)return !crates.some((c,i)=>ALLEY.crates[i].area===area&&x>c-ALLEY.crates[i].w/2-RADIUS+EPS&&x<c+ALLEY.crates[i].w/2+RADIUS-EPS);
 return crates.some((c,i)=>ALLEY.crates[i].area===area&&Math.abs(y-ALLEY.crates[i].y)<.025&&x>=c-ALLEY.crates[i].w/2+.08-EPS&&x<=c+ALLEY.crates[i].w/2-.08+EPS);
};
export function normalizeAlleySave(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const {x,face}=value,y=value.y??0,area=value.area??'alley';
 if(!['alley','garage','yard'].includes(area)||!Number.isFinite(x)||!Number.isFinite(y)||(face!==1&&face!==-1))return null;
 const bounds=area==='garage'?[ALLEY.garage.minX,ALLEY.garage.maxX]:area==='yard'?[ALLEY.yard.minX,ALLEY.maxX]:[ALLEY.minX,ALLEY.mainGate.x-RADIUS];
 if(x<bounds[0]-EPS||x>bounds[1]+EPS)return null;
 const crateXs=value.crateXs??ALLEY.crates.map(c=>c.x);
 if(!Array.isArray(crateXs)||crateXs.length!==3||ALLEY.crates.some((c,i)=>!Number.isFinite(crateXs[i])||crateXs[i]<c.minX-EPS||crateXs[i]>c.maxX+EPS))return null;
 if(Math.abs(crateXs[0]-crateXs[1])<(ALLEY.crates[0].w+ALLEY.crates[1].w)/2+.025)return null;
 const jackStatus=value.jackStatus??'ground',pumpProgress=value.pumpProgress??(jackStatus==='raised'?1:0);
 if(!['ground','carried','installed','raised'].includes(jackStatus)||!Number.isFinite(pumpProgress)||pumpProgress<0||pumpProgress>1)return null;
 if(jackStatus==='raised'&&pumpProgress!==1||['ground','carried'].includes(jackStatus)&&pumpProgress!==0)return null;
 if(area!=='alley'&&jackStatus!=='raised'||area==='alley'&&jackStatus==='carried'&&x<55.7)return null;
 if(area==='alley'&&Math.abs(y)<.025&&x+RADIUS>ALLEY.fence.x+EPS&&x-RADIUS<ALLEY.fence.x+ALLEY.fence.w-EPS)return null;
 if(!supported(x,y,area,crateXs))return null;
 if(value.fencePassed!==undefined&&typeof value.fencePassed!=='boolean'||value.completed!==undefined&&typeof value.completed!=='boolean')return null;
 if(value.completed&&(area!=='yard'||x<190))return null;
 return {area,x,y:Math.abs(y)<.025?0:ALLEY.crates.find(c=>Math.abs(c.y-y)<.025).y,face,crateXs:[...crateXs],jackStatus,pumpProgress,fencePassed:value.fencePassed??(x>55.7||area!=='alley'),completed:!!value.completed};
}
export const alleyHeight=saved=>Number.isFinite(saved?.y)?saved.y:0;

export function createAlley(){
 let state=null,lastPlayer=null;const slide=createSlide();
 const emit=event=>{state.events.push(event);return event;};
 function resetJump(){Object.assign(state.jump,{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0});state.buffer=0;state.coyote=0;}
 function baseState(saved){return {
  area:saved.area,phase:'walk',phaseTime:0,elapsed:0,direction:0,running:false,heading:saved.face*Math.PI/2,velocity:0,acceleration:0,landImpact:0,
  crouch:0,underDoor:false,slide:null,slidesCompleted:0,climb:null,climbsCompleted:0,interaction:null,alleyAction:null,windowClimb:null,caught:null,
  jump:{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0},buffer:0,coyote:MOVEMENT.coyote,jumpHeld:false,interactHeld:false,crouchHeld:false,
  crates:ALLEY.crates.map((c,i)=>({...c,x:saved.crateXs[i]})),objectVelocity:0,grabbedId:null,
  jackStatus:saved.jackStatus,pumpProgress:saved.pumpProgress,doorGap:mix(ALLEY.garage.initialGap,ALLEY.garage.raisedGap,saved.pumpProgress),jackVisual:{...ALLEY.jack,raised:saved.pumpProgress,carried:saved.jackStatus==='carried'},
  windowProgress:0,windowLight:saved.pumpProgress>0,investigationTime:saved.pumpProgress>0?0:null,
  dog:{phase:saved.fencePassed?'sleep':'sleep',x:ALLEY.dog.x,y:0,z:ALLEY.dog.z,face:1,time:0,alert:0},
  owner:{role:saved.area==='yard'?'yard-owner':'garage-resident',phase:saved.area==='yard'?'patrol':'repair',x:saved.area==='yard'?171:113.6,y:saved.area==='yard'?0:3.4,z:saved.area==='yard'?ALLEY.owner.z:1.0,face:-1,time:0,alert:0},
  garageResident:null,dogPassed:saved.fencePassed,fencePassed:saved.fencePassed,completed:saved.completed,checkpoint:null,events:[],nearJack:false,nearGarage:false,nearPump:false,nearWindow:false,nearInteraction:false,inCover:false,
  ownerEntered:false,barked:false,crankStroke:0,windowAction:null,retryIssued:false
 };}
 function begin(player,saved=null){
  if(state||!player||typeof player!=='object')return false;
  const r=normalizeAlleySave(saved)??normalizeAlleySave(ALLEY.entry);
  state=baseState(r);lastPlayer=player;slide.reset();
  Object.assign(player,{x:r.x,y:r.y,z:r.area==='alley'?ALLEY.lane:ALLEY.garageLane,vx:0,vy:0,vz:0,grounded:true,face:r.face});
  state.checkpoint=r.area==='garage'?{...r,x:111.5,y:0,jackStatus:'raised',pumpProgress:1}:r.area==='yard'?{...r,x:143,y:0}:r.fencePassed?{...r,x:60,y:0,jackStatus:'ground',pumpProgress:0}:normalizeAlleySave({...ALLEY.entry,x:13});
  sync(player);return true;
 }
 const crateCollider=c=>({id:c.id,x:c.x-c.w/2,w:c.w,y:c.y});
 const activeCrates=()=>state.crates.filter(c=>c.area===state.area);
 const grabbableCrate=player=>state.phase==='walk'&&!state.climb&&!slide.active&&!state.jump.preparing&&!state.jump.launched&&state.crouch<.02&&state.jackStatus!=='carried'&&player.grounded&&Math.abs(player.y)<.03?activeCrates().find(c=>{const side=Math.sign(player.x-c.x)||-player.face,gap=(player.x-c.x)*side-c.w/2;return gap>=RADIUS-.035&&gap<.46;}):null;
 const solidsFor=approach=>[...activeCrates().map(crateCollider),...(state.area==='alley'&&!approach?[ALLEY.fence,ALLEY.mainGate]:[])];
 const motionLimits=approach=>state.area==='garage'?[ALLEY.garage.minX,ALLEY.garage.maxX]:state.area==='yard'?[ALLEY.yard.minX,ALLEY.maxX]:approach?[ALLEY.garage.approachMinX,ALLEY.garage.minX+.2]:[ALLEY.minX,ALLEY.mainGate.x-RADIUS];
 function supportAt(x,oldY=Infinity){
  let floor=0;for(const c of activeCrates())if(x>c.x-c.w/2+.015&&x<c.x+c.w/2-.015&&oldY>=c.y-.03)floor=Math.max(floor,c.y);return floor;
 }
 function setPhase(phase){state.phase=phase;state.phaseTime=0;state.interaction=null;state.grabbedId=null;state.objectVelocity=0;}
 function checkpoint(player,kind){
  const snapshot=saveAt(player);if(snapshot){state.checkpoint=snapshot;emit('checkpoint');state.checkpointKind=kind;}
 }
 function sync(player){
  state.velocity=Math.hypot(player.vx,player.vz);if(!['pickup-jack','place-jack','approach-garage','return-lane'].includes(state.phase))state.heading=player.face*Math.PI/2;
  state.nearJack=state.area==='alley'&&state.phase==='walk'&&!slide.active&&state.jackStatus==='ground'&&player.grounded&&Math.abs(player.y)<.03&&Math.abs(player.x-ALLEY.jack.x)<.85&&Math.abs(player.z-ALLEY.lane)<.1;
  state.nearGarage=state.area==='alley'&&state.phase==='walk'&&!slide.active&&player.grounded&&player.x>=108.0&&player.x<=110.9;
  state.nearPump=state.nearGarage&&['installed','raised'].includes(state.jackStatus)&&Math.abs(player.z-ALLEY.garageLane)<.1&&Math.abs(player.x-ALLEY.garage.alignX)<.85;
  state.nearWindow=state.area==='garage'&&state.phase==='walk'&&!slide.active&&player.grounded&&player.y>=.70&&player.x>=ALLEY.garage.windowReachX;
  state.nearInteraction=state.nearJack||state.nearGarage&&(state.jackStatus==='carried'||['installed','raised'].includes(state.jackStatus)&&Math.abs(player.z-ALLEY.garageLane)>.1)||state.nearPump&&state.jackStatus!=='raised'||state.nearWindow||!!state.interaction||!!grabbableCrate(player);
  state.inCover=state.area==='yard'&&state.crouch>.8&&ALLEY.yard.covers.some(([a,b])=>player.x>=a&&player.x<=b);
  const held=state.jackStatus==='carried';
  if(held){
   Object.assign(state.jackVisual,{x:player.x+player.face*ALLEY.carry.x,y:player.y+ALLEY.carry.y,z:player.z,raised:0,carried:true});
   if(state.phase==='walk')state.alleyAction={type:'carry',progress:1,elapsed:state.elapsed,objectX:state.jackVisual.x,objectY:state.jackVisual.y,objectZ:player.z,face:player.face};
  }else if(!['pickup-jack','place-jack'].includes(state.phase)){
   Object.assign(state.jackVisual,state.jackStatus==='ground'?{...ALLEY.jack,raised:0,carried:false}:{x:ALLEY.garage.doorX-.02,y:state.doorGap/2,z:ALLEY.garageLane,raised:state.pumpProgress,carried:false});
   if(state.phase==='walk'&&state.alleyAction?.type!=='crank')state.alleyAction=null;
  }
 }
 function saveAt(player){
  if(!player||!player.grounded||state.phase!=='walk'||state.climb||slide.active||state.jump.preparing||state.jump.launched||state.crouch>.001&&state.crouch<.98||state.area==='alley'&&Math.abs(player.z-ALLEY.lane)>.025)return null;
  if(state.dog.alert>.3||state.owner.alert>.15||state.owner.phase==='chase'||state.owner.phase==='inspect'&&state.area==='garage')return null;
  return normalizeAlleySave({area:state.area,x:player.x,y:player.y,face:player.face,crateXs:state.crates.map(c=>c.x),jackStatus:state.jackStatus,pumpProgress:state.pumpProgress,fencePassed:state.fencePassed,completed:state.completed});
 }
 function startCaught(player,reason){
  if(state.phase==='caught')return;setPhase('caught');state.alleyAction=null;state.slide=null;slide.reset();state.climb=null;resetJump();
  state.caught={elapsed:0,progress:0,duration:1.75,impactAt:.08,impactDirection:player.face,startY:player.y,colliders:[]};state.detectedBy=reason;
  player.vx=player.vy=player.vz=0;state.dog.phase=reason==='dog'?'bark':state.dog.phase;state.owner.phase=reason==='owner'?'caught':state.owner.phase;emit('caught');
 }
 function ai(dt,player,input){
  if(input?.freezeThreats||state.completed)return;
  const dog=state.dog;dog.time+=dt;
  if(!state.dogPassed&&state.area==='alley'){
   const distance=Math.abs(player.x-dog.x),noisy=Math.abs(player.vx)>2.0||!player.grounded||!!state.climb||!!state.slide;
   if(distance<ALLEY.dog.hearingRadius&&noisy)dog.alert=clamp(dog.alert+dt*(1.15-distance*.065),0,1.6);
   else dog.alert=Math.max(0,dog.alert-dt*(state.crouch>.8?.55:.30));
   if(dog.alert>.30&&dog.phase==='sleep'){dog.phase='listen';dog.time=0;emit('dog-wake');}
   if(dog.alert>.95&&!state.barked){state.barked=true;dog.phase='bark';dog.time=0;emit('dog-bark');}
   if(state.barked&&dog.time>1.15)dog.phase='chase';
   if(dog.phase==='chase'){
    dog.face=Math.sign(player.x-dog.x)||dog.face;dog.x=clamp(dog.x+dog.face*Math.min(Math.max(0,distance-.85),3.1*dt),12,36);dog.z=mix(dog.z,ALLEY.lane-.45,1-Math.exp(-dt*4));
    if(distance<1.20)startCaught(player,'dog');
   }else if(!state.barked&&dog.alert<.08&&dog.phase!=='sleep'){dog.phase='sleep';dog.time=0;}
   if(player.x>34.5&&!state.barked||player.x>39){state.dogPassed=true;if(state.barked){dog.phase='listen';dog.alert=.2;}emit('dog-passed');}
  }
  if(state.investigationTime!==null&&state.area!=='yard'){
   state.investigationTime+=dt;
   const t=state.investigationTime,o=state.owner;
   if(t<ALLEY.owner.investigateAfter-12){o.phase='listen';o.time=t;o.x=113.6;o.y=3.4;o.z=1.0;}
   else if(t<ALLEY.owner.investigateAfter){o.phase='approach';o.time=t-(ALLEY.owner.investigateAfter-12);o.x=113.6;o.y=3.4*(1-smooth(o.time/12));o.z=mix(1,4.2,smooth(o.time/12));if(Math.floor(t*1.5)!==Math.floor((t-dt)*1.5))emit('owner-steps');}
   else{
    if(!state.ownerEntered){state.ownerEntered=true;emit('owner-enter');}
    o.phase=t<ALLEY.owner.investigateAfter+ALLEY.owner.grace?'inspect':'chase';o.y=0;o.z=ALLEY.garageLane;o.time=t-ALLEY.owner.investigateAfter;
    const direction=Math.sign(player.x-o.x)||1;o.face=direction;
    if(o.phase==='chase'){o.x+=direction*Math.min(Math.max(0,Math.abs(player.x-o.x)-.75),2.05*dt);if(state.area==='garage'&&Math.abs(player.x-o.x)<1.0)startCaught(player,'owner');}
   }
  }
  if(state.area==='yard'){
   const o=state.owner;o.time+=dt;if(state.garageResident){const resident=state.garageResident;resident.time+=dt;if(resident.y<.1&&['chase','inspect'].includes(resident.phase)){resident.x=Math.min(ALLEY.garage.windowX-.4,resident.x+1.4*dt);resident.face=1;resident.phase='inspect';}}
   if(o.phase==='chase'&&o.alert<.2)o.phase='patrol';
   if(o.phase!=='chase'){
    o.phase='patrol';const cycle=o.time%28;
    let patrolX;
    if(cycle<6){patrolX=171;o.face=1;}
    else if(cycle<13){patrolX=mix(171,178,smooth((cycle-6)/7));o.face=1;}
    else if(cycle<18){patrolX=178;o.face=-1;}
    else{patrolX=mix(178,160,smooth((cycle-18)/10));o.face=-1;}
    o.x+=clamp(patrolX-o.x,-1.8*dt,1.8*dt);
    o.y=0;o.z=ALLEY.owner.z;
   }
   const dx=player.x-o.x,inSight=Math.abs(dx)<15&&dx*o.face>-.9&&!state.inCover;
   const noise=Math.abs(player.vx)>2.1&&Math.abs(dx)<9;
   o.alert=clamp(o.alert+dt*(inSight?(state.crouch>.8?.30:.65):noise?.35:-.80),0,1.7);
   if(o.alert>.4&&!state.yardWarning){state.yardWarning=true;emit('yard-alert');}
   if(o.alert>1.2){o.phase='chase';o.face=Math.sign(dx)||o.face;o.z=mix(o.z,ALLEY.garageLane,1-Math.exp(-dt*2));o.x+=o.face*Math.min(Math.max(0,Math.abs(dx)-.75),2.0*dt);if(Math.abs(dx)<1.0&&Math.abs(o.z-player.z)<.9)startCaught(player,'owner');}
  }
 }
 function startClimb(player,target){
  const thin=target.id===ALLEY.fence.id,c=createClimb({x:player.x,y:player.y,face:player.face,target:thin?{...target,w:.8}:target});
  if(!c)return false;if(thin){c.endX=player.face>0?target.x+target.w+.38:target.x-.38;c.vault=true;}
  state.climb=c;state.interaction=null;state.grabbedId=null;resetJump();player.vx=player.vy=0;player.grounded=false;emit('climb-start');return true;
 }
 function reachable(player,target){const edge=player.face>0?target.x:target.x+target.w,ahead=(edge-player.x)*player.face,rise=target.y-player.y;return ahead>=.17&&ahead<=.65&&rise>=.25&&rise<=1.08;}
 function action(dt,player){
  state.phaseTime+=dt;const t=state.phaseTime,G=ALLEY.garage;
  if(state.phase==='caught'){
   const c=state.caught;c.elapsed=Math.min(c.duration,c.elapsed+dt);c.progress=c.elapsed/c.duration;player.vx=player.vy=player.vz=0;
   if(c.progress>=1&&!state.retryIssued){state.retryIssued=true;emit('retry');}return true;
  }
  if(state.phase==='pickup-jack'){
   const p=clamp(t/.8,0,1),lift=smooth((p-.32)/.68),visual=state.jackVisual,a=state.pickupAction,oldX=player.x;
   player.x=mix(a.x,ALLEY.jack.x-a.face*.55,smooth(p/.28));player.face=a.face;player.vx=(player.x-oldX)/dt;player.vz=0;state.heading=mix(a.heading,a.face*Math.PI/2,smooth(p/.28));
   Object.assign(visual,{x:mix(ALLEY.jack.x,player.x+player.face*ALLEY.carry.x,lift),y:mix(ALLEY.jack.y,ALLEY.carry.y,lift),z:player.z,raised:0,carried:p>.55});
   state.alleyAction={type:'pickup-jack',progress:p,elapsed:t,objectX:visual.x,objectY:visual.y,objectZ:visual.z,face:player.face};
   if(p>=1){state.jackStatus='carried';setPhase('walk');player.vx=0;emit('jack-pickup');}return true;
  }
  if(state.phase==='place-jack'){
   const p=clamp(t/1.5,0,1),align=smooth(p/.62),drop=smooth((p-.55)/.45),a=state.placeAction,oldX=player.x,oldZ=player.z;
   player.x=mix(a.x,G.alignX,align);player.z=mix(a.z,G.lane,align);player.face=1;player.y=0;player.vx=(player.x-oldX)/dt;player.vz=(player.z-oldZ)/dt;
   state.heading=mix(a.heading,Math.PI/2,smooth(p));
   Object.assign(state.jackVisual,{x:mix(player.x+ALLEY.carry.x,G.doorX-.02,drop),y:mix(ALLEY.carry.y,G.initialGap/2,drop),z:player.z,raised:0,carried:p<.82});
   state.alleyAction={type:'place-jack',progress:p,elapsed:t,objectX:state.jackVisual.x,objectY:state.jackVisual.y,objectZ:player.z,face:1};
   if(p>=1){state.jackStatus='installed';setPhase('walk');player.vx=player.vz=0;emit('jack-place');}return true;
  }
  if(state.phase==='return-lane'){
   const p=clamp(t/1.1,0,1),a=state.returnAction,oldX=player.x,oldZ=player.z;
   player.x=mix(a.x,107.7,smooth(p));player.z=mix(a.z,ALLEY.lane,smooth(p));player.vx=(player.x-oldX)/dt;player.vz=(player.z-oldZ)/dt;state.heading=mix(-Math.PI/2,0,Math.sin(p*Math.PI));
   if(p>=1){setPhase('walk');player.vx=player.vz=0;player.face=-1;}return true;
  }
  if(state.phase==='approach-garage'){
   const p=clamp(t/1.1,0,1),a=state.approachAction,oldX=player.x,oldZ=player.z;
   player.x=mix(a.x,G.alignX,smooth(p));player.z=mix(a.z,G.lane,smooth(p));player.y=0;player.face=1;
   player.vx=(player.x-oldX)/dt;player.vz=(player.z-oldZ)/dt;state.heading=mix(a.heading,Math.PI/2,smooth(p));
   if(p>=1){setPhase('walk');player.vx=player.vz=0;}return true;
  }
  if(state.phase==='open-window'){
   const p=clamp(t/.95,0,1),oldX=player.x;player.x=mix(state.windowAction.startX,G.windowAlignX,smooth(p/.35));player.vx=(player.x-oldX)/dt;state.windowProgress=smooth((p-.32)/.68);
   const angle=state.windowProgress*Math.PI*.56;
   state.alleyAction={type:'open-window',progress:p,elapsed:t,objectX:G.windowX,objectY:G.windowHandleY,objectZ:G.lane,handle:{x:G.windowX+.1-.1*Math.cos(angle)+.78*Math.sin(angle),y:G.windowHandleY,z:G.lane-.78+.1*Math.sin(angle)+.78*Math.cos(angle)},face:1};
   if(p>=1){setPhase('window');state.alleyAction=null;state.windowClimb={elapsed:0,progress:0,duration:1.9,face:1,sillX:G.windowX,sillY:G.sillY,startX:player.x,startY:player.y};}return true;
  }
  if(state.phase==='window'){
   const c=state.windowClimb;c.elapsed=Math.min(c.duration,c.elapsed+dt);c.progress=c.elapsed/c.duration;const p=c.progress,oldX=player.x,oldY=player.y;
   player.x=p<.36?mix(c.startX,G.windowX-.20,smooth(p/.36)):mix(G.windowX-.20,G.windowExitX,smooth((p-.36)/.64));
   player.y=p<.36?mix(c.startY,G.sillY,smooth(p/.36)):p<.64?G.sillY:mix(G.sillY,0,smooth((p-.64)/.36));player.z=G.lane;player.face=1;player.vx=(player.x-oldX)/dt;player.vy=(player.y-oldY)/dt;player.vz=0;player.grounded=false;
   if(p>=1){state.area='yard';setPhase('walk');state.windowClimb=null;state.alleyAction=null;player.x=G.windowExitX;player.y=0;player.vx=player.vy=0;player.grounded=true;state.garageResident={...state.owner};Object.assign(state.owner,{role:'yard-owner',phase:'patrol',x:171,y:0,z:ALLEY.owner.z,face:1,time:0,alert:0});state.investigationTime=null;emit('window-exit');checkpoint(player,'yard');}return true;
  }
  return false;
 }
 function update(dt,input={},player){
  if(!state||!player||!Number.isFinite(dt)||dt<=0)return null;dt=Math.min(dt,.1);lastPlayer=player;state.events=[];state.elapsed+=dt;state.landImpact=0;
  const direction=Number.isFinite(input.direction)?Math.sign(input.direction):0,interact=!!input.interact,freshInteract=interact&&!state.interactHeld,wantsJump=!!input.jump,freshJump=wantsJump&&!state.jumpHeld,crouch=!!input.crouch,freshCrouch=crouch&&!state.crouchHeld;
  state.interactHeld=interact;state.jumpHeld=wantsJump;state.crouchHeld=crouch;state.direction=direction;
  if(action(dt,player)){if(state.phase!=='caught')ai(dt,player,input);sync(player);return state.events[0]??null;}
  if(freshInteract&&state.nearJack){state.pickupAction={x:player.x,face:Math.sign(ALLEY.jack.x-player.x)||player.face,heading:state.heading};setPhase('pickup-jack');state.alleyAction=null;player.vx=player.vy=0;return null;}
  if(freshInteract&&state.nearGarage&&state.jackStatus==='carried'){
   state.placeAction={x:player.x,z:player.z,heading:state.heading};setPhase('place-jack');player.vx=player.vy=0;resetJump();return null;
  }
  if(freshInteract&&state.nearGarage&&['installed','raised'].includes(state.jackStatus)&&Math.abs(player.z-ALLEY.garageLane)>.1){
   state.approachAction={x:player.x,z:player.z,heading:state.heading};setPhase('approach-garage');player.vx=player.vy=0;resetJump();return null;
  }
  if(state.nearPump&&state.jackStatus==='installed'&&interact&&!crouch&&!wantsJump&&Math.abs(player.x-ALLEY.garage.alignX)>.025){
   state.approachAction={x:player.x,z:player.z,heading:state.heading};setPhase('approach-garage');player.vx=player.vy=0;resetJump();return null;
  }
  if(freshInteract&&state.nearWindow){state.windowAction={startX:player.x,startY:player.y};setPhase('open-window');resetJump();player.vx=player.vy=0;player.face=1;emit('window-open');return state.events[0];}
  if(state.nearPump&&state.jackStatus==='installed'&&interact&&!crouch&&!wantsJump){
   player.vx=player.vy=player.vz=0;player.face=1;
   if(state.investigationTime===null){state.investigationTime=0;state.windowLight=true;emit('door-creak');emit('window-light');}
   const before=state.pumpProgress;state.pumpProgress=Math.min(1,state.pumpProgress+dt/ALLEY.garage.pumpDuration);state.doorGap=mix(ALLEY.garage.initialGap,ALLEY.garage.raisedGap,state.pumpProgress);
   const stroke=Math.floor(state.pumpProgress*ALLEY.garage.pumpCycles);if(stroke>Math.floor(before*ALLEY.garage.pumpCycles))emit('jack-crank');
   state.alleyAction={type:'crank',progress:state.pumpProgress,elapsed:state.pumpProgress*ALLEY.garage.pumpCycles,crankPhase:(state.pumpProgress*ALLEY.garage.pumpCycles)%1,objectX:ALLEY.garage.doorX-.02,objectY:state.doorGap/2,objectZ:ALLEY.garageLane,handle:{x:ALLEY.garage.handle.x,y:ALLEY.garage.handle.y+ALLEY.garage.handle.amplitude*Math.sin(state.pumpProgress*ALLEY.garage.pumpCycles*2*Math.PI),z:ALLEY.garage.handle.z},face:1};
   if(state.pumpProgress>=1){state.jackStatus='raised';emit('door-raised');}
   ai(dt,player,input);sync(player);return state.events[0]??null;
  }
  state.alleyAction=state.jackStatus==='carried'?state.alleyAction:null;
  const approach=state.area==='alley'&&Math.abs(player.z-ALLEY.garageLane)<.1;
  if(approach&&player.x<=ALLEY.garage.approachMinX+.015&&direction<0){state.returnAction={x:player.x,z:player.z};setPhase('return-lane');return null;}
  state.underDoor=approach&&player.x>ALLEY.garage.doorX-.20&&player.x<ALLEY.garage.minX+.25;
  if(freshCrouch&&input.running&&!approach&&state.jackStatus!=='carried'&&player.grounded&&!state.climb&&!state.interaction&&state.crouch<.02&&!state.jump.preparing&&!state.jump.launched&&slide.begin(player)){
   state.slide=slide.state;state.interaction=null;state.grabbedId=null;resetJump();emit('slide-start');
  }
  if(slide.active){
   const oldVX=player.vx,finished=slide.update(dt,{},player);let nextX=player.x+(oldVX+player.vx)*.5*dt,blocked=false;
   for(const solid of solidsFor(approach)){const hit=crateSideContact(player,nextX,solid,RADIUS);if(hit){nextX=hit.x;blocked=true;}}
   const clamped=clamp(nextX,...motionLimits(approach));blocked||=clamped!==nextX;player.x=clamped;player.vz=0;
   if(blocked&&slide.active)slide.update(.000001,{blocked:true},player);
   state.slide=slide.state;state.crouch=state.slide?.phase==='recover'&&crouch?1:state.slide?.lowAmount??(crouch?1:0);state.running=false;state.acceleration=clamp((player.vx-oldVX)/dt,-16,16);
   if(supportAt(player.x,player.y)<player.y-.03){player.grounded=false;slide.reset();state.slide=null;}
   if(finished||!slide.active){state.slidesCompleted++;state.slide=null;state.crouch=crouch?1:0;resetJump();emit('slide-end');}
   ai(dt,player,input);sync(player);return state.events[0]??null;
  }
  const lowWanted=player.grounded&&!state.climb&&(crouch||state.underDoor),crouchTarget=lowWanted?1:0;
  state.crouch=clamp(state.crouch+Math.sign(crouchTarget-state.crouch)*Math.min(Math.abs(crouchTarget-state.crouch),dt/.28),0,1);if(state.underDoor)state.crouch=1;
  const carrying=state.jackStatus==='carried',crouching=state.crouch>.001||lowWanted,running=!!input.running&&!crouching&&!carrying;
  state.running=running;
  if(state.climb){
   const c=state.climb;c.elapsed=Math.min(c.duration,c.elapsed+dt);c.progress=c.elapsed/c.duration;const p=sampleClimb(c);player.x=p.x;player.y=p.y;player.vx=player.vy=player.vz=0;player.face=c.face;player.grounded=false;
   if(c.progress>=1){state.climb=null;state.climbsCompleted++;player.y=c.topY;player.grounded=!c.vault;resetJump();if(c.vault){player.vy=0;state.jump.airTime=.25;}emit('climb-end');}
   ai(dt,player,input);sync(player);return state.events[0]??null;
  }
  if(freshJump&&!crouching&&!carrying)state.buffer=MOVEMENT.buffer;
  state.buffer=Math.max(0,state.buffer-dt);state.coyote=player.grounded?MOVEMENT.coyote:Math.max(0,state.coyote-dt);
  if(crouching||carrying){state.buffer=0;if(state.jump.preparing)resetJump();}
  const crates=activeCrates();
  if(!interact||!player.grounded||Math.abs(player.y)>.03||wantsJump||crouching||carrying){state.grabbedId=null;state.interaction=null;state.objectVelocity=0;}
  if(interact&&player.grounded&&Math.abs(player.y)<.03&&!wantsJump&&!crouching&&!carrying){
   if(!state.grabbedId){const c=grabbableCrate(player);if(c){state.grabbedId=c.id;state.grabSide=Math.sign(player.x-c.x)||-player.face;}}
   const c=crates.find(c=>c.id===state.grabbedId);
   if(c){
    const side=state.grabSide,target=direction*(direction===side?.48:.66),old=c.x,decay=Math.exp(-(direction?6:11)*dt);state.objectVelocity=target+(state.objectVelocity-target)*decay;
    const bodyOffset=side*(c.w/2+GRAB),limits=motionLimits(approach);let min=Math.max(c.minX,limits[0]-bodyOffset),max=Math.min(c.maxX,limits[1]-bodyOffset);
    if(state.area==='alley')max=Math.min(max,ALLEY.fence.x-RADIUS-bodyOffset);
    for(const other of crates)if(other!==c){
     const sep=(c.w+other.w)/2+.03;
     if(other.x<c.x){min=Math.max(min,other.x+sep);if(side<0)min=Math.max(min,other.x+other.w/2+RADIUS-bodyOffset);}
     else{max=Math.min(max,other.x-sep);if(side>0)max=Math.min(max,other.x-other.w/2-RADIUS-bodyOffset);}
    }
    c.x=clamp(c.x+state.objectVelocity*dt,min,max);player.x=c.x+side*(c.w/2+GRAB);player.vx=(c.x-old)/dt;player.vy=player.vz=0;player.face=-side;
    state.interaction={kind:Math.abs(player.vx)<.01?'hold':player.vx*player.face>0?'push':'pull',side,objectId:c.id,objectX:c.x,objectY:c.y,topY:c.y,objectZ:c.z,halfWidth:c.w/2,gripOffset:c.w/2+.015,gripY:Math.min(.82,c.y-.06),speed:Math.abs(player.vx),pulling:direction===side};
    ai(dt,player,input);sync(player);return state.events[0]??null;
   }
  }
  state.interaction=null;
  const oldVX=player.vx,target=direction*(carrying?ALLEY.carrySpeed:crouching?ALLEY.crouchSpeed:running?ALLEY.runSpeed:ALLEY.walkSpeed),response=player.grounded?(direction?5.6:8.5):3.6,decay=Math.exp(-response*dt);
  player.vx=target+(oldVX-target)*decay;if(!direction&&Math.abs(player.vx)<.002)player.vx=0;
  if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.18))player.face=direction;
  const solids=solidsFor(approach);
  if(!crouching&&!carrying){for(const c of solids)if(c.id!==ALLEY.mainGate.id&&reachable(player,c)&&(player.grounded&&state.buffer>0||!player.grounded&&(wantsJump||state.jump.launched)&&direction===player.face)){if(startClimb(player,c)){ai(dt,player,input);sync(player);return state.events[0]??null;}}}
  if(state.buffer>0&&state.coyote>0&&!state.jump.preparing&&!state.jump.launched){state.jump.preparing=true;state.jump.elapsed=0;state.jump.duration=running&&Math.abs(player.vx)>1?.085:.12;state.buffer=state.coyote=0;}
  if(state.jump.preparing){state.jump.elapsed+=dt;if(state.jump.elapsed>=state.jump.duration){state.jump.preparing=false;state.jump.launched=true;state.jump.airTime=0;state.jump.launchSpeed=Math.abs(player.vx);player.vy=4.9;player.grounded=false;emit('takeoff');}}
  let nextX=player.x+(oldVX+player.vx)*.5*dt*(state.jump.preparing?.55:1);
  for(const c of solids){const hit=crateSideContact(player,nextX,c,RADIUS);if(hit){nextX=hit.x;player.vx=0;}}
  const limits=motionLimits(approach);
  if(approach&&nextX>ALLEY.garage.doorX-.55&&(state.jackStatus!=='raised'||state.crouch<.98)){nextX=Math.min(nextX,ALLEY.garage.doorX-.55);player.vx=0;}
  player.x=clamp(nextX,...limits);if(player.x!==nextX)player.vx=0;state.acceleration=clamp((player.vx-oldVX)/dt,-16,16);
  const oldY=player.y;if(player.grounded&&supportAt(player.x,player.y)<player.y-.03)player.grounded=false;
  if(!player.grounded){const gravity=state.jump.launched?12.2:MOVEMENT.fallGravity;player.y+=player.vy*dt-.5*gravity*dt*dt;player.vy-=gravity*dt;state.jump.airTime+=dt;const floor=supportAt(player.x,oldY);if(player.y<=floor&&player.vy<=0){state.landImpact=clamp(-player.vy/8,0,1);player.y=floor;player.vy=0;player.grounded=true;state.jump.launched=false;state.jump.airTime=0;emit('land');}}
  else{player.y=supportAt(player.x,player.y);player.vy=0;state.jump.airTime=0;}
  player.vz=0;
  if(approach&&state.jackStatus==='raised'&&player.x>=ALLEY.garage.minX){state.area='garage';state.underDoor=false;state.crouch=1;emit('garage-enter');checkpoint(player,'garage');}
  if(state.area==='alley'&&!state.fencePassed&&player.x>57.0&&player.grounded){state.fencePassed=true;state.dogPassed=true;checkpoint(player,'fence');}
  if(state.area==='yard'&&!state.completed&&player.x>=190&&player.grounded&&!state.jump.preparing&&!state.jump.launched){state.completed=true;state.owner.alert=0;state.owner.phase='patrol';state.owner.face=-1;emit('complete');checkpoint(player,'complete');}
  ai(dt,player,input);sync(player);return state.events[0]??null;
 }
 return {get active(){return !!state;},get state(){return state;},begin,update,supportY(x){return state?supportAt(x):0;},snapshot(){return state?saveAt(lastPlayer):null;},retry(player=lastPlayer){if(!state||!player)return false;const saved={...state.checkpoint,crateXs:[...state.checkpoint.crateXs]};state=null;return begin(player,saved);},reset(){state=null;lastPlayer=null;slide.reset();}};
}
