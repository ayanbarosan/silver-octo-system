import {createSaveSnapshot} from './session.js';
import {TUTORIAL_IDS} from './tutorial.js';
import {ALLEY} from './alley.js';
import {MARKET} from './market.js';

// Test locations use the same supported save format as ordinary Continue.
export function developerLocation(id){
 const player={x:3,y:0,face:1,grounded:true};
 const value={version:1,player,checkpoint:3,crateX:16,bridgeBroken:true,slipPlayed:true,awakened:true,learnedMechanics:[...TUTORIAL_IDS]};
 if(id==='roof'){Object.assign(value,{checkpoint:0,crateX:13,bridgeBroken:false,slipPlayed:false});}
 else if(id==='stairwell'){Object.assign(value,{chapter:'stairwell',stairwell:{flight:0,x:13,face:-1}});Object.assign(player,{x:13,y:12.8,face:-1});}
 else if(id==='street'){Object.assign(value,{chapter:'street',street:{x:2.8,y:0,face:1,dumpsterX:43.5}});player.x=2.8;}
 else if(id==='home'){Object.assign(value,{chapter:'home',home:{flight:0,x:2.8,face:1}});player.x=2.8;}
 else if(id==='apartment'){Object.assign(value,{chapter:'apartment',apartment:{x:1.4,face:1}});player.x=1.4;}
 else if(id==='bedroom'){Object.assign(value,{chapter:'apartment',apartment:{x:19.25,face:1,stage:'bedroom',nightstandX:21.2,doorClosed:true}});player.x=19.25;}
 else if(id==='fireescape'){Object.assign(value,{chapter:'apartment',apartment:{x:27.1,face:1,stage:'fireescape',flight:0}});player.x=27.1;}
 else if(id==='playground'){Object.assign(value,{chapter:'apartment',apartment:{x:40,face:1,stage:'playground'}});Object.assign(player,{x:40,y:-6.4});}
 else if(['kiosk','market-chase','market-ground'].includes(id)){
  const escaped=id==='market-ground',x=escaped?77:id==='market-chase'?35:23.4,y=escaped?MARKET.groundY:0;
  Object.assign(value,{chapter:'market',market:{area:escaped?'market':id==='market-chase'?'chase':'approach',x,y,face:1,hungerPlayed:true,food:id==='kiosk'?'display':'held',escaped,completed:false}});Object.assign(player,{x,y});
 }
 else if(id==='storage'){Object.assign(value,{chapter:'alley',alley:{area:'storage',x:89.2,y:0,face:1,crateXs:ALLEY.crates.map(crate=>crate.x),jackStatus:'ground',pumpProgress:0,fencePassed:true,storageVisited:true}});player.x=89.2;}
 else if(['alley','workshop','backyard'].includes(id)){
  const area=id==='workshop'?'garage':id==='backyard'?'yard':'alley',x=id==='workshop'?111.5:id==='backyard'?143:ALLEY.entry.x;
  Object.assign(value,{chapter:'alley',alley:{area,x,y:0,face:1,crateXs:ALLEY.crates.map(crate=>crate.x),jackStatus:area==='alley'?'ground':'raised',pumpProgress:area==='alley'?0:1,fencePassed:area!=='alley'}});
  Object.assign(player,{x,y:0});
 }
 else return null;
 return createSaveSnapshot(value);
}

export function moveDeveloperCamera(player,dt,input={}){
 if(!player||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.1,dt);
 const direction=[input.x,input.y,input.z].map(v=>Number.isFinite(v)?Math.sign(v):0),length=Math.hypot(...direction),speed=input.fast?10:3.8;
 for(let i=0;i<3;i++){
  const key=['x','y','z'][i],velocity=['vx','vy','vz'][i],old=Number.isFinite(player[velocity])?player[velocity]:0,target=length?direction[i]*speed/length:0,decay=Math.exp(-10*dt);
  player[key]+=target*dt+(old-target)*(1-decay)/10;player[velocity]=target+(old-target)*decay;
  if(!length&&Math.abs(player[velocity])<.002)player[velocity]=0;
 }
 player.x=Math.max(-100,Math.min(220,player.x));player.y=Math.max(-45,Math.min(65,player.y));player.z=Math.max(-90,Math.min(90,player.z));
 if(direction[0])player.face=direction[0];player.grounded=false;
}
