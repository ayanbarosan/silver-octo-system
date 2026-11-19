import test from 'node:test';
import assert from 'node:assert/strict';
import {COURTYARD,courtyardZ,courtyardPoint,courtyardSlope} from '../src/courtyard-layout.js';
import {STREET} from '../src/street.js';

test('the same park sits beside the home street corner and beyond the exterior service passage',()=>{
 const gate=courtyardPoint('street',[COURTYARD.gateNativeX,0,0]);
 assert(Math.abs(gate[0]-(STREET.home.x+7))<1e-8,'The visible park entrance must align with the right edge of the home block.');
 const escapeGate=courtyardPoint('escape',[COURTYARD.gateNativeX,0,0]);
 assert.equal(escapeGate[0],COURTYARD.parkEntryX);assert.equal(escapeGate[1],-6.4);assert.equal(escapeGate[2],courtyardZ(COURTYARD.parkEntryX));
 const streetSwings=courtyardPoint('street',[86.55,0,-5.42]),escapeSwings=courtyardPoint('escape',[86.55,0,-5.42]);
 assert(streetSwings[0]>gate[0]+.5,'The first swing frame belongs to the park on the right of the home.');
 assert(escapeSwings[0]>35.18+.5,'Play equipment must not sit beneath the escape wall or block its corner.');
 assert(COURTYARD.parkEntryX-COURTYARD.minX>8,'A visible service passage must separate the stair landing and the park.');
});

test('park landmarks preserve scale, order and separation between the two scene views',()=>{
 const landmarks=[[86.55,0,-5.42],[92.25,3.34,-2.78],[95.5,0,-4.35],[105.72,0,-4.35],[109.78,1.4,-.5]];
 const street=landmarks.map(p=>courtyardPoint('street',p)),escape=landmarks.map(p=>courtyardPoint('escape',p));
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 for(let i=1;i<landmarks.length;i++)assert(Math.abs(distance(street[i],street[i-1])-distance(escape[i],escape[i-1]))<1e-8,'Changing the view must not resize or rearrange the play equipment.');
 for(let i=0;i<landmarks.length;i++){
  const a=street[i],b=escape[i];assert.equal(Math.sign(a[0]-street[0][0]),Math.sign(b[0]-escape[0][0]));
  const object=courtyardPoint('escape',{x:landmarks[i][0],y:landmarks[i][1],z:landmarks[i][2]});
  assert.deepEqual([object.x,object.y,object.z],b);
 }
});

test('the ground route rounds the building continuously and remains flat outside the corner',()=>{
 const c=COURTYARD.corner;
 for(const x of[-Infinity,-10,COURTYARD.minX,c.startX])assert.equal(courtyardZ(x),c.fromZ);
 for(const x of[c.endX,COURTYARD.maxX,100,Infinity])assert.equal(courtyardZ(x),c.toZ);
 let previous=courtyardZ(c.startX);
 for(let i=1;i<=1000;i++){
  const x=c.startX+(c.endX-c.startX)*i/1000,z=courtyardZ(x);
  assert(Number.isFinite(z));assert(z>=previous-1e-10);assert(z-previous<.004,'The approach cannot jump sideways to a different park lane.');previous=z;
 }
 assert(courtyardZ((c.startX+c.endX)/2)>c.fromZ+.5);
});

test('the corner has no velocity kink at either end and old ground coordinates remain supported',()=>{
 const c=COURTYARD.corner,h=1e-5;
 for(const x of[c.startX,c.endX]){
  const left=(courtyardZ(x)-courtyardZ(x-h))/h,right=(courtyardZ(x+h)-courtyardZ(x))/h;
  assert(Math.abs(left-right)<.0001,'Joining the side passage to the park must not jerk the child sideways.');
  assert.equal(courtyardSlope(x),0);
 }
 for(let i=1;i<10;i++){const x=c.startX+(c.endX-c.startX)*i/10,numeric=(courtyardZ(x+h)-courtyardZ(x-h))/(2*h);assert(Math.abs(courtyardSlope(x)-numeric)<.000001,'The character heading must use the actual path tangent.');}
 assert.equal(courtyardZ(29),4.5);assert.equal(courtyardZ(42),6.2);
 assert(COURTYARD.minX<=27.2&&COURTYARD.maxX>=62);
 assert(Number.isFinite(courtyardZ(undefined)));assert(Number.isFinite(courtyardZ(NaN)));
});
