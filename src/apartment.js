const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const nearAngle=(angle,reference)=>reference+Math.atan2(Math.sin(angle-reference),Math.cos(angle-reference));

// The furniture stays behind this continuous, supported walking lane. The
// rooms are traversed in order without adding manual depth movement indoors.
export const APARTMENT=Object.freeze({
 width:25.8,minX:.9,maxX:25,floorY:0,lane:1.4,
 walkSpeed:1.5,runSpeed:2.6,entry:Object.freeze({x:1.4,face:1}),
 rooms:Object.freeze([
  Object.freeze({id:'kitchen',left:0,right:9.5}),
  Object.freeze({id:'living',left:9.5,right:17.3}),
  Object.freeze({id:'bedroom',left:17.3,right:25.8})
 ])
});

export function apartmentRoom(x){
 return x<APARTMENT.rooms[1].left?'kitchen':x<APARTMENT.rooms[2].left?'living':'bedroom';
}

export function normalizeApartmentSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const {x,face}=value;
 if(!Number.isFinite(x)||x<APARTMENT.minX-1e-8||x>APARTMENT.maxX+1e-8||(face!==1&&face!==-1))return null;
 return {x:clamp(x,APARTMENT.minX,APARTMENT.maxX),face};
}

export function createApartment(){
 let state=null,lastPlayer=null;
 function sync(player){
  player.y=APARTMENT.floorY;player.z=APARTMENT.lane;
  player.vy=0;player.vz=0;player.grounded=true;
  state.room=apartmentRoom(player.x);state.nearExit=player.x<=2;
  state.heading=nearAngle(player.face*Math.PI/2,state.heading);
  state.velocity=Math.abs(player.vx);
 }
 function begin(player,saved=null){
  if(state||!player)return false;
  const restore=normalizeApartmentSave(saved)??APARTMENT.entry;
  state={phase:'walk',room:'kitchen',nearExit:false,heading:restore.face*Math.PI/2,velocity:0,onStairs:false,slope:0};
  Object.assign(player,{x:restore.x,y:APARTMENT.floorY,z:APARTMENT.lane,vx:0,vy:0,vz:0,face:restore.face,grounded:true});
  lastPlayer=player;sync(player);return true;
 }
 function update(dt,input,player){
  if(!state||!player||!Number.isFinite(dt)||dt<=0)return null;
  dt=Math.min(dt,.1);lastPlayer=player;
  const direction=Number.isFinite(input?.direction)?Math.sign(input.direction):0;
  const target=direction*(input?.running?APARTMENT.runSpeed:APARTMENT.walkSpeed),response=direction?5.2:8.5;
  const previous=player.vx,decay=Math.exp(-response*dt);
  const travel=target*dt+(previous-target)*(1-decay)/response;
  player.vx=target+(previous-target)*decay;
  if(!direction&&Math.abs(player.vx)<.002)player.vx=0;
  if(direction&&(Math.sign(player.vx)===direction||Math.abs(player.vx)<.18))player.face=direction;
  const nextX=player.x+travel;player.x=clamp(nextX,APARTMENT.minX,APARTMENT.maxX);
  if(player.x!==nextX)player.vx=0;
  sync(player);return null;
 }
 return {
  get state(){return state;},get active(){return !!state;},begin,update,
  snapshot(){
   if(!state||state.phase!=='walk'||lastPlayer?.grounded!==true||!Number.isFinite(lastPlayer.y)||!Number.isFinite(lastPlayer.z)||Math.abs(lastPlayer.y-APARTMENT.floorY)>.025||Math.abs(lastPlayer.z-APARTMENT.lane)>.025)return null;
   return normalizeApartmentSave(lastPlayer);
  },
  reset(){state=null;lastPlayer=null;}
 };
}
