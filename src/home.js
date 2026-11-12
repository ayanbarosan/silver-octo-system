const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const p=clamp(v,0,1);return p*p*(3-2*p);};
const nearAngle=(angle,reference)=>reference+Math.atan2(Math.sin(angle-reference),Math.cos(angle-reference));
export const HOME=Object.freeze({left:3.4,right:11.6,rise:3.2,floors:3,steps:20,minX:1.8,maxX:14.2,
 lanes:Object.freeze([-.65,.95]),entry:Object.freeze({x:2.8,face:1}),groundDoorX:2.4,apartmentFloor:2,apartmentX:2.2});
export const homeDirection=flight=>flight%2===0?1:-1;
export const homeLane=flight=>HOME.lanes[Math.min(flight,HOME.floors-1)%2];
export function homeHeight(flight,x){
 if(flight>=HOME.floors)return HOME.floors*HOME.rise;
 const t=clamp((x-HOME.left)/(HOME.right-HOME.left),0,1);
 return (flight+(homeDirection(flight)>0?t:1-t))*HOME.rise;
}
function limits(flight){return flight===HOME.floors?[HOME.right,HOME.maxX]:homeDirection(flight)>0?[HOME.minX,HOME.right]:[HOME.left,HOME.maxX];}
export function normalizeHomeSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const {flight,x,face}=value;if(!Number.isInteger(flight)||flight<0||flight>HOME.floors||!Number.isFinite(x)||(face!==1&&face!==-1))return null;
 const [lo,hi]=limits(flight);if(x<lo-1e-8||x>hi+1e-8)return null;
 return {flight,x:clamp(x,lo,hi),face};
}
export function createHome(){
 let state=null,lastPlayer=null;
 function sync(player){
  state.ascending=true;state.totalFlights=HOME.floors;state.steps=HOME.steps;
  state.onStairs=state.phase==='walk'&&state.flight<HOME.floors&&player.x>HOME.left&&player.x<HOME.right;
  state.direction=homeDirection(state.flight);state.slope=state.onStairs?state.direction*HOME.rise/(HOME.right-HOME.left):0;
  state.velocity=Math.hypot(player.vx,player.vz);state.completedFlights=state.flight;
  player.y=state.phase==='turn'?state.turn.floorY:homeHeight(state.flight,player.x);player.vy=0;player.grounded=true;
  state.nearApartment=state.phase==='walk'&&state.flight===HOME.apartmentFloor&&Math.abs(player.x-HOME.apartmentX)<.85;
 }
 function begin(player,saved=null){
  if(state||!player)return false;const restore=normalizeHomeSave(saved)??{flight:0,...HOME.entry};
  state={phase:'walk',flight:restore.flight,heading:restore.face*Math.PI/2,nearApartment:false};
  Object.assign(player,{x:restore.x,y:homeHeight(restore.flight,restore.x),z:homeLane(restore.flight),vx:0,vy:0,vz:0,face:restore.face,grounded:true});lastPlayer=player;sync(player);return true;
 }
 function beginTurn(player){
  const old=state.flight,direction=homeDirection(old),end=direction>0?HOME.right:HOME.left;
  state.flight++;state.phase='turn';
  const nextZ=homeLane(state.flight),startHeading=nearAngle(direction*Math.PI/2,state.heading),depthHeading=nearAngle(nextZ>player.z?0:Math.PI,startHeading);
  state.turn={elapsed:0,endX:end,outsideX:end+direction*.72,startZ:player.z,endZ:nextZ,floorY:state.flight*HOME.rise,
   startHeading,depthHeading,endHeading:nearAngle((state.flight<HOME.floors?homeDirection(state.flight):1)*Math.PI/2,depthHeading),incomingVx:player.vx};
  player.x=end;player.vz=0;sync(player);
 }
 function update(dt,input,player){
  if(!state||!player||!Number.isFinite(dt)||dt<=0)return null;dt=Math.min(dt,.1);lastPlayer=player;
  if(state.phase==='turn'){
   const t=state.turn;t.elapsed=Math.min(1.67,t.elapsed+dt);
   if(t.elapsed<.62){const p=t.elapsed/.62,p2=p*p,p3=p2*p;
    player.x=(2*p3-3*p2+1)*t.endX+(p3-2*p2+p)*.62*t.incomingVx+(-2*p3+3*p2)*t.outsideX;
    player.vx=((6*p2-6*p)*t.endX+(3*p2-4*p+1)*.62*t.incomingVx+(-6*p2+6*p)*t.outsideX)/.62;
    player.z=t.startZ;player.vz=0;state.heading=t.startHeading+(t.depthHeading-t.startHeading)*smooth((p-.5)/.5);
   }else{const p=clamp((t.elapsed-.62)/1.05,0,1);player.x=t.outsideX;player.vx=0;
    player.z=t.startZ+(t.endZ-t.startZ)*smooth(p);player.vz=(t.endZ-t.startZ)*6*p*(1-p)/1.05;
    state.heading=t.depthHeading+(t.endHeading-t.depthHeading)*smooth((p-.6)/.4);
   }
   sync(player);if(t.elapsed>=1.67){state.phase='walk';player.z=t.endZ;player.vx=player.vz=0;player.face=state.flight<HOME.floors?homeDirection(state.flight):1;state.heading=t.endHeading;delete state.turn;sync(player);return 'floor';}return null;
  }
  const direction=Number.isFinite(input?.direction)?Math.sign(input.direction):0,target=direction*(input?.running?2:1.45),response=direction?5.3:8.5;
  const old=player.vx,decay=Math.exp(-response*dt),travel=target*dt+(old-target)*(1-decay)/response;
  player.vx=target+(old-target)*decay;if(!direction&&Math.abs(player.vx)<.002)player.vx=0;
  if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.18))player.face=direction;
  state.heading=nearAngle(player.face*Math.PI/2,state.heading);player.z=homeLane(state.flight);player.vz=0;
  const x=player.x+travel,d=homeDirection(state.flight);
  // The top landing reconnects to the same physical flight. Clamping it at
  // the stair edge used to trap the child upstairs behind an invisible wall.
  if(state.flight===HOME.floors&&x<HOME.right&&player.vx<0){
   state.flight=HOME.floors-1;player.x=x;player.z=homeLane(state.flight);sync(player);return 'stairs';
  }
  if(state.flight<HOME.floors&&(d>0&&x>=HOME.right-1e-8||d<0&&x<=HOME.left+1e-8)){beginTurn(player);return null;}
  const [lo,hi]=limits(state.flight);player.x=clamp(x,lo,hi);if(player.x!==x)player.vx=0;sync(player);return null;
 }
 return {get state(){return state;},get active(){return !!state;},begin,update,
  snapshot(){return state?.phase==='walk'&&lastPlayer?{flight:state.flight,x:lastPlayer.x,face:lastPlayer.face}:null;},reset(){state=null;lastPlayer=null;}};
}
