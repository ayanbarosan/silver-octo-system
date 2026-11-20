import {ALLEY} from './alley.js';

// The controller runs at 90 Hz. Keep the tool, hands and moving props on the
// same interpolated clock as the boy rather than alternating whole sim steps.
const mix=(a,b,t)=>a+(b-a)*t;
const copy=record=>record?{...record,...(record.handle?{handle:{...record.handle}}:{})}:null;
export function captureAlleyPose(state){
 if(!state)return null;
 const pose={phase:state.phase,phaseTime:state.phaseTime,crouch:state.crouch,doorGap:state.doorGap,pumpProgress:state.pumpProgress,windowProgress:state.windowProgress,storageDoorProgress:state.storageDoorProgress,gateProgress:state.gateProgress,chainProgress:state.chainProgress};
 for(const key of ['dog','owner','garageResident','jackVisual','alleyAction','windowClimb','caught','climb','slide'])pose[key]=copy(state[key]);
 pose.crates=state.crates.map(copy);return pose;
}
function record(current,previous,alpha,fields){
 if(!current)return null;
 const result=copy(current);if(!previous)return result;
 for(const key of fields)if(Number.isFinite(current[key])&&Number.isFinite(previous[key]))result[key]=mix(previous[key],current[key],alpha);
 return result;
}
export function interpolateAlleyState(state,previous,alpha){
 if(!state)return null;
 alpha=Math.max(0,Math.min(1,alpha));const result={...state};
 if(previous)for(const key of ['crouch','doorGap','pumpProgress','windowProgress','storageDoorProgress','gateProgress','chainProgress'])if(Number.isFinite(state[key])&&Number.isFinite(previous[key]))result[key]=mix(previous[key],state[key],alpha);
 if(previous?.phase===state.phase&&Number.isFinite(state.phaseTime))result.phaseTime=mix(previous.phaseTime??state.phaseTime,state.phaseTime,alpha);
 for(const key of ['dog','owner','garageResident','jackVisual']){
  const current=state[key],candidate=previous?.[key],old=current?.role===candidate?.role?candidate:null;result[key]=record(current,old,alpha,['x','y','z','alert','raised']);
  if(current?.phase===old?.phase)for(const time of ['time','elapsed'])if(Number.isFinite(current?.[time])&&Number.isFinite(old?.[time]))result[key][time]=mix(old[time],current[time],alpha);
 }
 result.crates=state.crates.map((crate,i)=>record(crate,previous?.crates?.[i],alpha,['x','y','z']));
 for(const key of ['alleyAction','windowClimb','caught','climb','slide']){
  const current=state[key],old=previous?.[key],same=previous?.phase===state.phase&&current?.type===old?.type&&(key!=='slide'||current?.phase===old?.phase);
  result[key]=record(current,same?old:null,alpha,['progress','elapsed','objectX','objectY','objectZ','crankPhase','lowAmount']);
  if(current?.handle)result[key].handle=record(current.handle,same?old?.handle:null,alpha,['x','y','z']);
 }
 if(state.interaction){
  result.interaction={...state.interaction};
  const crate=result.crates.find(crate=>crate.id===state.interaction.objectId||Math.abs(crate.x-state.interaction.objectX)<.15);
  if(crate)result.interaction.objectX=crate.x;
 }
 if(result.alleyAction?.type==='crank'){
  const action=result.alleyAction,G=ALLEY.garage,turns=result.pumpProgress*G.pumpCycles;
  action.progress=result.pumpProgress;action.elapsed=turns;action.crankPhase=turns%1;
  action.handle={...G.handle,y:G.handle.y+G.handle.amplitude*Math.sin(turns*Math.PI*2)};
 }
 return result;
}
