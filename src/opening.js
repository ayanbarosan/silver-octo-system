/** A short, readable opening that creates urgency without taking control away. */
export function createOpening(){
 const state={active:false,elapsed:0,escaped:false,escapedAt:null,phase:'idle',cue:'',edgeImpact:0};
 let lastPhase='idle';
 function reset(){Object.assign(state,{active:true,elapsed:0,escaped:false,escapedAt:null,phase:'waking',cue:'06:14 — Sector 09',edgeImpact:0});lastPhase='idle';return state;}
 function update(dt,{wake=0,x=0}={}){
  if(!state.active)return [];
  state.elapsed+=Math.max(0,dt);
  const events=[];
  if(!state.escaped&&wake>=1&&x>1.8){state.escaped=true;state.escapedAt=state.elapsed;events.push('edge-break');}
  const sinceEscape=state.escaped?state.elapsed-state.escapedAt:0;
  state.edgeImpact=state.escaped?Math.max(0,1-sinceEscape/.55):0;
  if(state.escaped){
   state.phase=sinceEscape<1.15?'close-call':sinceEscape<2.8?'observed':'depart';
   state.cue=sinceEscape<1.15?'Keep moving.':sinceEscape<2.8?'A light in the opposite building. Then nothing.':'Find the lit door.';
   if(sinceEscape>4){state.active=false;state.phase='complete';state.cue='';}
  }else if(wake<.48){state.phase='waking';state.cue=state.elapsed<1.1?'06:14 — Sector 09':'Wake up.';}
  else if(wake<1){state.phase='warning';state.cue='Someone is searching the rooftops.';}
  else{state.phase='escape';state.cue=state.elapsed>8?'Leave your shelter. Move right.':'Move away from the light.';}
  if(state.phase!==lastPhase){events.push(state.phase);lastPhase=state.phase;}
  return events;
 }
 return {state,reset,update};
}
