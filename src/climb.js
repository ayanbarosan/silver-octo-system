// Ledge reach and root motion are shared by gameplay and pose validation.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(x,a,b)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;

export function findClimbTarget(player,obstacles,maxReach=.58){
 if(!player.grounded)return null;
 let best=null,bestDistance=Infinity;
 for(const target of obstacles){
  const rise=target.y-player.y;
  const edge=player.face>0?target.x:target.x+target.w;
  const ahead=(edge-player.x)*player.face;
  if(rise<.25||rise>1.08||ahead<.18||ahead>maxReach||target.w<.48)continue;
  if(ahead<bestDistance){best=target;bestDistance=ahead;}
 }
 return best;
}

export function createClimb({x,y,face,target}){
 const direction=face>=0?1:-1;
 const edgeX=direction>0?target.x:target.x+target.w;
 const rise=target.y-y,ahead=(edgeX-x)*direction;
 if(rise<.25||rise>1.08||ahead<.17||ahead>.65||target.w<.48)return null;
 return {progress:0,elapsed:0,duration:1.4+rise*.18,edgeX,topY:target.y,face:direction,startX:x,startY:y,endX:edgeX+direction*.25,endY:target.y,targetId:target.id};
}

export function sampleClimb(climb,progress=climb.progress){
 const p=clamp(progress,0,1),{face,edgeX,startX,startY,endX,topY}=climb;
 let x;
 if(p<.22)x=mix(startX,edgeX-face*.32,smooth(p,0,.22));
 else if(p<.70)x=mix(edgeX-face*.32,edgeX-face*.26,smooth(p,.22,.62));
 else x=mix(edgeX-face*.26,endX,smooth(p,.70,.94));
 const lift=mix(startY,topY,smooth(p,.22,.62));
 const clearance=p>.58?.035*Math.sin(Math.PI*smooth(p,.58,1)):0;
 return {x,y:lift+clearance};
}
