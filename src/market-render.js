// Interpolate the cloth, the child and the vendor on the same render clock.
const mix=(a,b,t)=>a+(b-a)*t;
const copy=value=>value?{...value,...(value.handle?{handle:{...value.handle}}:{})}:null;
const fields=['phaseTime','crouch','awningDeflection','awningImpactX'];
const records=['vendor','marketAction','caught','climb','slide'];
export function captureMarketPose(state){
 if(!state)return null;
 const pose={phase:state.phase,area:state.area};for(const key of fields)pose[key]=state[key];
 for(const key of records)pose[key]=copy(state[key]);return pose;
}
export function interpolateMarketState(state,previous,alpha){
 if(!state)return null;alpha=Math.max(0,Math.min(1,alpha));const result={...state};
 for(const key of fields)if(Number.isFinite(state[key])&&Number.isFinite(previous?.[key])&&(key!=='phaseTime'||previous.phase===state.phase))result[key]=mix(previous[key],state[key],alpha);
 for(const key of records){
  const current=state[key],old=previous?.[key];result[key]=copy(current);if(!current||!old)continue;
  const same=key==='vendor'?current.phase===old.phase:previous.phase===state.phase&&current.type===old.type&&(key!=='slide'||current.phase===old.phase);
  for(const field of ['x','y','z','progress','elapsed','time','objectX','objectY','objectZ','lowAmount','surfaceY','braceY','deflection','impact'])if(Number.isFinite(current[field])&&Number.isFinite(old[field])&&(same||key==='vendor'&&['x','y','z'].includes(field)))result[key][field]=mix(old[field],current[field],alpha);
  if(current.handle&&old.handle&&same)for(const axis of ['x','y','z'])result[key].handle[axis]=mix(old.handle[axis],current.handle[axis],alpha);
 }
 return result;
}
