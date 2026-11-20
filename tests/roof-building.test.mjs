import test from 'node:test';
import assert from 'node:assert/strict';
import {fitFacadePatch,cityRoofBounds,roofServiceMount,windowWallPanels} from '../src/roof-building-layout.js';

test('weathered render stays inside its host facade, including rotated edge patches',()=>{
 const host={x:12,width:17.4,top:7.2,bottom:-25};
 for(let i=0;i<80;i++){
  const patch=fitFacadePatch(host,{x:i%2?host.x-host.width/2:host.x+host.width/2,y:i%3?host.top:host.bottom,width:.7+i*.04,height:1.2+i*.08,angle:(i%11-5)*.08});
  assert(patch.bounds.min[0]>=host.x-host.width/2+.0249);
  assert(patch.bounds.max[0]<=host.x+host.width/2-.0249);
  assert(patch.bounds.min[1]>=host.bottom+.0249);
  assert(patch.bounds.max[1]<=host.top-.0249);
  assert(patch.width>0&&patch.height>0);
 }
 const small=fitFacadePatch({x:0,width:1,top:2,bottom:0},{x:0,y:1,width:9,height:12,angle:.4});
 assert(small.bounds.min[0]>=-.475&&small.bounds.max[0]<=.475);
 assert(small.bounds.min[1]>=.025&&small.bounds.max[1]<=1.975);
});

test('equipment mounts use the slab top and keep the complete footprint on the actual roof',()=>{
 const host={id:'roof-city-206',x:12,width:17.4,top:7.2,bottom:-25,z:-17.8,layer:0};
 const bounds=cityRoofBounds(host),mount=roofServiceMount(host,{x:21.4,z:-26,halfWidth:.72,halfDepth:.72});
 assert.equal(mount.hostId,host.id);assert(Math.abs(mount.y-7.385)<1e-12);
 assert(mount.x+.72<=bounds.max[0]-.0399&&mount.x-.72>=bounds.min[0]+.0399);
 assert(mount.z+.72<=bounds.max[2]-.0399&&mount.z-.72>=bounds.min[2]+.0399);
 // The old worker position was beyond the right edge, and the old tank behind
 // the back edge. Both must be corrected by the same host-mount calculation.
 assert(mount.x<21.4&&mount.z>-26);
 assert.throws(()=>roofServiceMount(host,{x:12,z:-20,halfWidth:20,halfDepth:1}),RangeError);
 assert.throws(()=>roofServiceMount(host,{x:NaN,z:-20}),TypeError);
});

test('front wall partitions close the facade without filling any window aperture',()=>{
 const layout={left:-1,right:22,bottom:-35.2,top:-.2,columns:Array.from({length:12},(_,i)=>i*1.8),rows:Array.from({length:13},(_,i)=>-2.2-i*2.4),windowWidth:.83,windowHeight:1.41};
 const panels=windowWallPanels(layout);let area=0;
 for(const p of panels){
  const left=p.x-p.width/2,right=p.x+p.width/2,bottom=p.y-p.height/2,top=p.y+p.height/2;
  assert(left>=layout.left-1e-9&&right<=layout.right+1e-9&&bottom>=layout.bottom-1e-9&&top<=layout.top+1e-9);
  for(const x of layout.columns)for(const y of layout.rows){
   const overlapX=Math.min(right,x+layout.windowWidth/2)-Math.max(left,x-layout.windowWidth/2),overlapY=Math.min(top,y+layout.windowHeight/2)-Math.max(bottom,y-layout.windowHeight/2);
   assert(overlapX<=1e-9||overlapY<=1e-9,'A solid wall panel overlaps the window opening');
  }
  area+=p.width*p.height;
 }
 const expected=(layout.right-layout.left)*(layout.top-layout.bottom)-layout.columns.length*layout.rows.length*layout.windowWidth*layout.windowHeight;
 assert(Math.abs(area-expected)<1e-8,'Facade has a gap outside its window apertures');
});
