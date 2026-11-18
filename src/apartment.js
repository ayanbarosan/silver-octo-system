const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const nearAngle=(angle,reference)=>reference+Math.atan2(Math.sin(angle-reference),Math.cos(angle-reference));
const validFace=face=>face===1||face===-1;
const BODY=.21,CABINET_BODY=.40,EPS=1e-7;
export const ESCAPE=Object.freeze({left:28,right:33,rise:3.2,steps:20,flights:2,topMinX:26.4,turnX:34,bottomTurnX:27.2,groundY:-6.4,groundZ:4.5,maxX:48,lanes:Object.freeze([1.4,3.0])});
export const APARTMENT=Object.freeze({
 width:25.8,minX:.9,maxX:25,floorY:0,lane:1.4,walkSpeed:1.5,runSpeed:2.6,entry:Object.freeze({x:1.4,face:1}),
 doorX:17.3,livingTrigger:9.5,windowX:25.8,nightstand:Object.freeze({startX:21.2,minX:18.36,maxX:22.8,width:.72,height:.8,bodyRadius:CABINET_BODY,moveSpeed:1.0}),
 rooms:Object.freeze([Object.freeze({id:'kitchen',left:0,right:9.5}),Object.freeze({id:'living',left:9.5,right:17.3}),Object.freeze({id:'bedroom',left:17.3,right:25.8})])
});
export function apartmentRoom(x){return x<9.5?'kitchen':x<17.3?'living':'bedroom';}
export function escapeHeight(flight,x){const t=clamp((x-ESCAPE.left)/(ESCAPE.right-ESCAPE.left),0,1);return flight===0?(t===0?0:-t*ESCAPE.rise):flight===1?-ESCAPE.rise-(1-t)*ESCAPE.rise:ESCAPE.groundY;}
export function apartmentHeight(saved){return saved?.stage==='fireescape'?escapeHeight(saved.flight,saved.x):saved?.stage==='playground'?ESCAPE.groundY:0;}
export function normalizeApartmentSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isFinite(value.x)||!validFace(value.face))return null;
 const {x,face,stage}=value;
 if(stage===undefined){if(x<APARTMENT.minX-1e-8||x>APARTMENT.maxX+1e-8)return null;return{x:clamp(x,APARTMENT.minX,APARTMENT.maxX),face};}
 if(stage==='bedroom'){
  if(x<17.53||x>25||!Number.isFinite(value.nightstandX)||value.nightstandX<18.36-EPS||value.nightstandX>22.8+EPS||value.doorClosed!==true)return null;
  const objectX=clamp(value.nightstandX,18.36,22.8);
  if(Math.abs(x-objectX)<APARTMENT.nightstand.width/2+CABINET_BODY-EPS)return null;
  return{x,face,stage,nightstandX:objectX,doorClosed:true};
 }
 if(stage==='fireescape'){
  const {flight}=value;if(flight!==0&&flight!==1)return null;
  const lo=flight===0?ESCAPE.topMinX:ESCAPE.left,hi=flight===0?ESCAPE.right:ESCAPE.turnX;
  return x<lo-EPS||x>hi+EPS?null:{x:clamp(x,lo,hi),face,stage,flight};
 }
 if(stage==='playground')return x<ESCAPE.bottomTurnX-EPS||x>ESCAPE.maxX+EPS?null:{x:clamp(x,ESCAPE.bottomTurnX,ESCAPE.maxX),face,stage};
 return null;
}
export function createApartment(){
 let state=null,lastPlayer=null,interactHeld=false,jumpHeld=false;
 const event=type=>{state.events.push(type);return type;};
 const fatherPhase=phase=>{if(state.fatherPhase!==phase){state.fatherPhase=phase;state.fatherPhaseTime=0;if(phase==='breach'){state.breachShove=state.nightstandZ>.8&&state.nightstandX<18.5;state.shoveStartX=state.nightstandX;state.shoveStartZ=state.nightstandZ;}}};
 function baseState(face){return{phase:'walk',story:'quiet',area:'interior',room:'kitchen',nearExit:false,heading:face*Math.PI/2,velocity:0,onStairs:false,slope:0,
  fatherPhase:'sleep',fatherPhaseTime:0,fatherX:6.6,fatherY:0,fatherZ:-.80,fatherFace:1,fatherSpeed:0,
  glassThrown:false,glassRetrieved:false,retrieveProgress:0,throwProgress:0,doorProgress:0,doorClosed:false,doorPressure:0,doorImpact:0,barricaded:false,
  nightstandX:APARTMENT.nightstand.startX,nightstandZ:1.4,shoveProgress:0,fatherWindowProgress:0,interaction:null,nearNightstand:false,nearBedroomDoor:false,nearWindow:false,
  windowProgress:0,windowOpening:false,windowAction:null,windowClimb:null,caught:null,escapeFlight:0,stairs:null,events:[],retryCheckpoint:{x:8.7,face:1},
  jump:{preparing:false,elapsed:0,duration:.12,airTime:0,launched:false,launchSpeed:0}};}
 function sync(player){
  state.room=state.area==='interior'?apartmentRoom(player.x):state.area;
  state.nearExit=state.area==='interior'&&state.story==='quiet'&&player.x<=2;
  state.heading=state.phase==='turn'?state.heading:nearAngle(player.face*Math.PI/2,state.heading);
  state.velocity=Math.hypot(player.vx,player.vz??0);
  state.nearNightstand=state.area==='interior'&&state.phase==='walk'&&player.grounded&&Math.abs(player.y)<.03&&state.nightstandZ>.8&&Math.abs(Math.abs(player.x-state.nightstandX)-(.36+CABINET_BODY))<.25;
  state.nearBedroomDoor=state.area==='interior'&&state.phase==='walk'&&player.x>17.6&&player.x<18.8&&!state.doorClosed&&state.doorProgress<.01;
  state.nearWindow=state.area==='interior'&&state.phase==='walk'&&player.grounded&&Math.abs(player.y)<.03&&player.x>=24.15&&state.barricaded;
  state.nearInteraction=state.nearBedroomDoor||state.nearNightstand||state.nearWindow;
  if(state.area==='fireescape'){
   const f=state.escapeFlight,d=f===0?1:-1;
   state.onStairs=state.phase==='walk'&&player.x>ESCAPE.left&&player.x<ESCAPE.right;
   state.slope=state.onStairs?-d*.64:0;
   state.stairs={onStairs:state.onStairs,flight:f,direction:d,slope:state.slope,ascending:false,totalFlights:2,steps:20,
    layout:{left:28,right:33,rise:3.2,steps:20,baseY:0}};
  }else{state.onStairs=false;state.slope=0;state.stairs=null;}
 }
 function begin(player,saved=null){
  if(state||!player)return false;const r=normalizeApartmentSave(saved)??APARTMENT.entry;
  state=baseState(r.face);lastPlayer=player;interactHeld=jumpHeld=false;
  Object.assign(player,{x:r.x,y:apartmentHeight(r),z:APARTMENT.lane,vx:0,vy:0,vz:0,face:r.face,grounded:true});
  if(r.stage==='bedroom'||!r.stage&&r.x>=17.62){
   state.story='locked';state.doorProgress=1;state.doorClosed=true;state.nightstandX=r.nightstandX??(Math.abs(r.x-21.2)<.78?22.3:21.2);state.barricaded=state.nightstandX<=18.41;
   state.fatherX=16.65;state.fatherZ=1.4;state.glassThrown=true;state.glassRetrieved=true;state.retrieveProgress=1;fatherPhase('batter');state.retryCheckpoint={...r,stage:'bedroom',nightstandX:state.nightstandX,doorClosed:true};
  }else if(r.stage==='fireescape'||r.stage==='playground'){
   state.story=r.stage==='playground'?'safe':'escaping';state.area=r.stage;state.escapeFlight=r.flight??2;
   state.doorProgress=0;state.glassThrown=true;state.glassRetrieved=true;state.retrieveProgress=1;state.barricaded=false;state.nightstandX=18.65;state.nightstandZ=.3;state.shoveProgress=1;state.windowProgress=1;
   state.fatherX=27.1;state.fatherY=0;state.fatherZ=1.4;fatherPhase('watch');player.z=r.stage==='playground'?4.5:ESCAPE.lanes[r.flight];
  }else if(r.x>=9.5){state.story='pursuit';fatherPhase('rising');}
  sync(player);return true;
 }
 function startCatch(player){
  if(state.caught||state.area!=='interior')return;
  state.story='caught';state.phase='caught';state.interaction=null;state.caught={elapsed:0,progress:0,duration:1.8,impact:false,fallProgress:0,startY:Math.max(0,player.y)};
  player.vx=player.vy=player.vz=0;player.grounded=true;fatherPhase('catch');state.fatherSpeed=0;state.fatherX=player.x-state.fatherFace*.60;event('caught');
 }
 function updateFather(dt,player){
  if(state.fatherPhase!=='watch')state.fatherPhaseTime+=dt;state.fatherSpeed=0;
  const t=state.fatherPhaseTime;
  if(state.fatherPhase==='rising'){
   if(t<1){state.fatherX=6.6;state.fatherZ=-.80;}
   else if(t<1.7){state.fatherX=6.6+1.15*smooth((t-1)/.7);state.fatherZ=-.80;state.fatherSpeed=1.4;}
   else{state.fatherX=7.75+.15*smooth((t-1.7)/.8);state.fatherZ=-.80+2.20*smooth((t-1.7)/.8);state.fatherSpeed=1.5;}
   if(t>=2.5){state.fatherX=7.9;state.fatherZ=1.4;fatherPhase('chase');}
  }else if(state.fatherPhase==='chase'){
   const blocked=(state.phase==='door'||state.doorProgress>.85)&&player.x>17.3;
   const direction=blocked?1:Math.sign(player.x-state.fatherX)||1,goal=blocked?16.65:player.x;
   state.fatherFace=direction;const speed=2.15;
   if(state.nightstandZ>.8&&Math.abs(state.fatherX-state.nightstandX)<.90&&direction*(state.nightstandX-state.fatherX)>0){state.shoveStartX=state.nightstandX;state.shoveStartZ=state.nightstandZ;state.resumeFather='chase';fatherPhase('shove');return;}
   state.fatherX+=direction*Math.min(Math.abs(goal-state.fatherX),speed*dt);state.fatherSpeed=speed;
   if(blocked&&state.doorClosed&&state.fatherX>=16.64){state.fatherX=16.65;fatherPhase(state.glassThrown?'batter':'throw');event(state.glassThrown?'door-bang':'throw-glass');}
   else if(!blocked&&Math.abs(state.fatherX-player.x)<.52&&Math.abs(player.y)<1.1)startCatch(player);
  }else if(state.fatherPhase==='throw'){
   state.throwProgress=clamp(t/.85,0,1);
   if(t>=.25)state.glassThrown=true;
   if(t>=.72&&!state.glassImpact){state.glassImpact=true;state.doorImpact=1;event('glass-impact');}
   if(t>=.85)fatherPhase('retrieve');
  }else if(state.fatherPhase==='retrieve'){
   state.retrieveProgress=clamp(t/.75,0,1);
   if(t>=.55&&!state.glassRetrieved){state.glassRetrieved=true;event('glass-retrieved');}
   if(t>=.75){state.retrieveProgress=1;fatherPhase('batter');}
  }else if(state.fatherPhase==='batter'){
   state.doorPressure+=dt;
   if(Math.floor(t*1.15)!==Math.floor((t-dt)*1.15)){state.doorImpact=.5;event('door-bang');}
   if(state.area!=='interior'){fatherPhase('breach');event('door-breach');}
   else if(!state.barricaded&&state.doorPressure>12){fatherPhase('breach');event('door-breach');}
  }else if(state.fatherPhase==='breach'){
   state.doorProgress=Math.max(0,1-t/.8);state.doorClosed=state.doorProgress>.98;
   if(state.breachShove){const p=smooth(t/.8);state.nightstandX=state.shoveStartX+(18.65-state.shoveStartX)*p;state.nightstandZ=state.shoveStartZ+(.3-state.shoveStartZ)*p;state.shoveProgress=p;}
   if(t>.2)state.barricaded=false;
   if(t>=.8){state.doorProgress=0;state.doorClosed=false;fatherPhase(state.area==='interior'?'chase':'follow');}
  }else if(state.fatherPhase==='shove'){
   state.shoveProgress=clamp(t/.8,0,1);const p=smooth(state.shoveProgress);state.nightstandX=state.shoveStartX+.35*p;state.nightstandZ=state.shoveStartZ+( .3-state.shoveStartZ)*p;
   if(t>=.8){state.nightstandZ=.3;fatherPhase(state.resumeFather??'chase');}
  }else if(state.fatherPhase==='follow'){
   state.fatherX=Math.min(25.1,state.fatherX+2.8*dt);state.fatherSpeed=2.8;
   if(state.fatherX>=25.1){state.fatherX=25.1;fatherPhase('window');state.fatherSpeed=0;}
  }else if(state.fatherPhase==='window'){
   const p=clamp(t/1.35,0,1);state.fatherWindowProgress=p;state.fatherX=25.1+2*smooth(p);state.fatherY=p<.35?1.02*smooth(p/.35):p<.75?1.02:1.02*(1-smooth((p-.75)/.25));
   if(p>=1){state.fatherX=27.1;state.fatherY=0;fatherPhase('watch');}
  }
 }
 function move(dt,input,player,limits){
  const d=Number.isFinite(input?.direction)?Math.sign(input.direction):0,target=d*(input?.running?2.6:1.5),response=d?5.2:8.5;
  const old=player.vx,decay=Math.exp(-response*dt),travel=target*dt+(old-target)*(1-decay)/response;
  player.vx=target+(old-target)*decay;if(!d&&Math.abs(player.vx)<.002)player.vx=0;
  if(d&&(Math.sign(player.vx)===d||Math.abs(player.vx)<.18))player.face=d;
  const x=player.x+travel;player.x=clamp(x,...limits);if(player.x!==x)player.vx=0;
  return d;
 }
 function turn(player,kind){
  const right=kind==='middle',from=state.escapeFlight;
  state.phase='turn';state.turn={elapsed:0,duration:1.35,kind,startX:player.x,startZ:player.z,endX:right?34:27.2,endZ:right?3:4.5,y:player.y,heading:state.heading};
  player.vx=player.vz=0;state.onStairs=false;
 }
 function updateEscape(dt,input,player){
  if(state.phase==='turn'){
   const q=state.turn;q.elapsed=Math.min(q.duration,q.elapsed+dt);const t=q.elapsed/q.duration;
   player.x=q.startX+(q.endX-q.startX)*smooth(t/.45);player.z=q.startZ+(q.endZ-q.startZ)*smooth((t-.35)/.65);player.y=q.y;
   const outward=clamp(t/.45,0,1);player.vx=(q.endX-q.startX)*6*outward*(1-outward)/(.45*q.duration);player.vz=(q.endZ-q.startZ)*6*clamp((t-.35)/.65,0,1)*(1-clamp((t-.35)/.65,0,1))/(.65*q.duration);
   const depthHeading=nearAngle(0,q.heading),endHeading=nearAngle(q.kind==='middle'?-Math.PI/2:Math.PI/2,depthHeading);
   state.heading=t<.8?q.heading+(depthHeading-q.heading)*smooth((t-.25)/.25):depthHeading+(endHeading-depthHeading)*smooth((t-.8)/.2);
   if(t>=1){state.phase='walk';player.vx=player.vz=0;delete state.turn;
    if(q.kind==='middle'){state.escapeFlight=1;player.face=-1;event('floor');}
    else{state.area='playground';state.story='safe';player.face=1;state.fatherX=27.1;state.fatherZ=1.4;state.fatherY=0;fatherPhase('watch');event('playground');}
   }return;
  }
  const f=state.escapeFlight;
  if(state.area==='playground'){move(dt,input,player,[27.2,48]);player.y=-6.4;player.z=4.5;return;}
  move(dt,input,player,f===0?[26.4,33]:[28,34]);player.y=escapeHeight(f,player.x);player.z=ESCAPE.lanes[f];player.vy=0;player.grounded=true;
  if(f===0&&player.x>=33-EPS&&input?.direction>0)turn(player,'middle');
  if(f===1&&player.x<=28+EPS&&input?.direction<0)turn(player,'bottom');
 }
 function updateInterior(dt,input,player,pressed,jumpPressed){
  state.interaction=null;
  const oldX=player.x,d=move(dt,input,player,[.9,25]);
  player.z=1.4;player.vz=0;
  const object=APARTMENT.nightstand,edge=.36+CABINET_BODY,delta=oldX-state.nightstandX,side=delta<0?-1:1;
  const atHandle=state.nightstandZ>.8&&player.grounded&&Math.abs(player.y)<.03&&Math.abs(Math.abs(delta)-edge)<.25;
  if(input?.interact&&atHandle&&state.phase==='walk'&&!state.barricaded){
   const old=state.nightstandX,next=clamp(old+d*object.moveSpeed*dt,object.minX,object.maxX),travel=next-old;
   state.nightstandX=next;player.x=next+side*edge;player.vx=travel/dt;player.face=-side;
   state.interaction={objectX:next,objectY:.8,objectZ:1.4,halfWidth:.36,gripOffset:.36,kind:d===0?'hold':d===side?'pull':'push',side,face:-side,direction:d,pulling:d===side,speed:Math.abs(player.vx),progress:1};
  }
  if(jumpPressed&&player.grounded&&!state.interaction){player.vy=5.3;player.grounded=false;state.jump.launched=true;state.jump.airTime=0;state.jump.launchSpeed=Math.abs(player.vx);event('takeoff');}
  const oldY=player.y;
  if(!player.grounded){player.y+=player.vy*dt-6.5*dt*dt;player.vy-=13*dt;state.jump.airTime+=dt;}
  const over=state.nightstandZ>.8&&Math.abs(player.x-state.nightstandX)<.36+CABINET_BODY-EPS;
  const supportedTop=state.nightstandZ>.8&&Math.abs(player.x-state.nightstandX)<.36+BODY*.35;
  if(over&&!state.interaction&&oldY<.8-.025){
   player.x=state.nightstandX+side*edge;player.vx=0;
  }
  let support=supportedTop&&oldY>=.8-.03?.8:0;
  if(player.grounded&&oldY>.7&&!supportedTop){player.grounded=false;player.vy=0;support=0;}
  if(!player.grounded&&player.vy<=0&&player.y<=support&&oldY>=support-.03){player.y=support;player.vy=0;player.grounded=true;state.jump.launched=false;state.jump.airTime=0;event('land');}
  if(player.grounded){player.y=support;player.vy=0;}
  if(state.doorProgress>.85&&player.x<17.53&&oldX>=17.53){player.x=17.53;player.vx=0;}
  if(state.story==='quiet'&&player.x>=9.5){state.story='pursuit';fatherPhase('rising');event('wake-father');}
  if(pressed&&state.nearBedroomDoor&&state.fatherX<17.0){state.phase='door';state.doorAction={elapsed:0,duration:.9,startX:player.x,progress:0};state.story='locked';state.interaction=null;event('close-door');}
  if(state.doorClosed&&state.nightstandX<=18.41&&!state.barricaded){state.barricaded=true;state.nightstandX=18.36;state.interaction=null;event('barricaded');}
  if(pressed&&state.nearWindow&&!state.windowOpening){
   state.phase='opening-window';state.windowOpening=true;state.windowAction={elapsed:0,duration:.75,startX:player.x};
   player.vx=player.vy=0;state.interaction=null;event('open-window');
  }
 }
 function update(dt,input,player){
  if(!state||!player||!Number.isFinite(dt)||dt<=0)return null;dt=Math.min(dt,.1);lastPlayer=player;state.events=[];
  const interact=!!input?.interact,pressed=interact&&!interactHeld,jump=!!input?.jump,jumpPressed=jump&&!jumpHeld;interactHeld=interact;jumpHeld=jump;
  state.doorImpact=Math.max(0,state.doorImpact-dt*3);
  if(state.phase==='caught'){
   const c=state.caught;c.elapsed+=dt;c.progress=clamp(c.elapsed/c.duration,0,1);c.impact=c.elapsed>=.48;c.fallProgress=clamp((c.elapsed-.48)/.85,0,1);state.attackProgress=clamp(c.elapsed/.95,0,1);state.fatherPhaseTime=c.elapsed;
   player.y=c.startY*(1-smooth(c.fallProgress));player.vx=player.vy=player.vz=0;
   if(c.progress>=1&&!state.retryIssued){state.retryIssued=true;event('retry');}sync(player);return state.events[0]??null;
  }
  if(state.phase==='door'){
   const a=state.doorAction;a.elapsed=Math.min(a.duration,a.elapsed+dt);a.progress=a.elapsed/a.duration;const t=clamp(a.elapsed/.45,0,1);
   player.x=a.startX+(19.25-a.startX)*smooth(t);player.vx=(19.25-a.startX)*6*t*(1-t)/.45;player.vy=player.vz=0;player.face=1;player.y=0;player.z=1.4;player.grounded=true;
   state.doorProgress=clamp((a.elapsed-.45)/.45,0,1);
   if(a.elapsed>=.9){state.phase='walk';state.doorClosed=true;state.doorProgress=1;player.vx=0;state.doorAction=null;state.retryCheckpoint={x:19.25,face:1,stage:'bedroom',nightstandX:state.nightstandX,doorClosed:true};event('door-closed');}
  }else if(state.phase==='opening-window'){
   const a=state.windowAction;a.elapsed=Math.min(a.duration,a.elapsed+dt);const p=a.elapsed/a.duration;
   player.x=a.startX+(25.15-a.startX)*smooth(p);player.vx=(25.15-a.startX)*6*p*(1-p)/a.duration;
   player.y=0;player.z=1.4;player.vy=player.vz=0;player.face=1;player.grounded=true;state.windowProgress=p;
   if(p>=1){state.phase='window';state.windowOpening=false;state.windowAction=null;state.windowClimb={progress:0,elapsed:0,duration:1.65,startX:player.x};player.vx=0;}
  }else if(state.phase==='window'){
   const w=state.windowClimb;w.elapsed=Math.min(w.duration,w.elapsed+dt);w.progress=w.elapsed/w.duration;const t=w.progress;
   player.x=t<.16?w.startX+(25.43-w.startX)*smooth(t/.16):t<.35?25.43+.22*smooth((t-.16)/.19):t<.8?25.65+smooth((t-.35)/.45):26.65+.45*smooth((t-.8)/.2);
   player.y=t<.16?.10*smooth(t/.16):t<.35?.10+.92*smooth((t-.16)/.19):t<.8?1.02:1.02*(1-smooth((t-.8)/.2));player.z=1.4;player.vx=player.vy=player.vz=0;player.grounded=true;player.face=1;
   if(t>=1){state.phase='walk';state.area='fireescape';state.story='escaping';state.windowClimb=null;state.escapeFlight=0;player.x=27.1;player.y=0;fatherPhase('breach');event('escape-start');}
  }else if(state.area!=='interior')updateEscape(dt,input,player);
  else updateInterior(dt,input??{},player,pressed,jumpPressed);
  if(!input?.freezeFather)updateFather(dt,player);sync(player);return state.events[0]??null;
 }
 function snapshot(){
  if(!state||state.phase!=='walk'||!lastPlayer||lastPlayer.grounded!==true||![lastPlayer.x,lastPlayer.y,lastPlayer.z].every(Number.isFinite))return null;
  if(state.area==='fireescape')return normalizeApartmentSave({stage:'fireescape',flight:state.escapeFlight,x:lastPlayer.x,face:lastPlayer.face});
  if(state.area==='playground')return normalizeApartmentSave({stage:'playground',x:lastPlayer.x,face:lastPlayer.face});
  if(Math.abs(lastPlayer.y)>.025||Math.abs(lastPlayer.z-1.4)>.025)return null;
  if(state.story==='quiet')return normalizeApartmentSave(lastPlayer);
  if(state.doorClosed&&lastPlayer.x>=17.53)return normalizeApartmentSave({x:lastPlayer.x,face:lastPlayer.face,stage:'bedroom',nightstandX:state.nightstandX,doorClosed:true});
  return null;
 }
 return{get state(){return state;},get active(){return !!state;},begin,update,snapshot,
  retry(player=lastPlayer){if(!state||!player)return false;const checkpoint={...state.retryCheckpoint};state=null;return begin(player,checkpoint);},
  reset(){state=null;lastPlayer=null;interactHeld=jumpHeld=false;}};
}
