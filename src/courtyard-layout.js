// Both chapters show the same park at full scale. Only their local scene
// origins differ: street level before entering, apartment floor on escape.
export const COURTYARD=Object.freeze({
  street:Object.freeze({x:-7,y:0,z:0}),
  escape:Object.freeze({x:-50,y:-6.4,z:6.2}),
  scale:1,
  corner:Object.freeze({startX:33.4,endX:35.8,fromZ:4.5,toZ:6.2}),
  parkEntryX:35.8,minX:27.2,maxX:62,gateNativeX:85.8
});

// The service path bends around the building's right return wall. A smooth
// tangent at either end lets left/right movement follow the corner naturally.
export function courtyardZ(x){
  const {startX,endX,fromZ,toZ}=COURTYARD.corner;
  if(!Number.isFinite(x))return x===Infinity?toZ:fromZ;
  const t=Math.max(0,Math.min(1,(x-startX)/(endX-startX)));
  return fromZ+(toZ-fromZ)*t*t*(3-2*t);
}

export function courtyardSlope(x){
  const {startX,endX,fromZ,toZ}=COURTYARD.corner;
  if(!Number.isFinite(x)||x<=startX||x>=endX)return 0;
  const t=(x-startX)/(endX-startX);
  return (toZ-fromZ)*6*t*(1-t)/(endX-startX);
}

// Transform canonical landmarks without changing their dimensions or order.
export function courtyardPoint(view,point){
  const offset=view==='street'?COURTYARD.street:view==='escape'?COURTYARD.escape:null;
  if(!offset)throw new RangeError('Unknown courtyard view.');
  const p=Array.isArray(point)?point:[point.x,point.y,point.z];
  const result=[p[0]*COURTYARD.scale+offset.x,p[1]*COURTYARD.scale+offset.y,p[2]*COURTYARD.scale+offset.z];
  return Array.isArray(point)?result:{x:result[0],y:result[1],z:result[2]};
}
