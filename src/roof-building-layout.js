// Small layout rules keep facade coatings and rooftop service equipment on
// their host building when the city silhouette changes.
export function fitFacadePatch(host,patch){
 const angle=patch.angle??0,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
 const maxWidth=Math.max(.01,host.width-.10),maxHeight=Math.max(.01,host.top-host.bottom-.10);
 let width=patch.width,height=patch.height;
 const factor=Math.min(1,maxWidth/(c*width+s*height),maxHeight/(s*width+c*height));width*=factor;height*=factor;
 const halfX=(c*width+s*height)/2,halfY=(s*width+c*height)/2;
 const left=host.x-host.width/2+.025,right=host.x+host.width/2-.025,bottom=host.bottom+.025,top=host.top-.025;
 const x=Math.max(left+halfX,Math.min(right-halfX,patch.x)),y=Math.max(bottom+halfY,Math.min(top-halfY,patch.y));
 return {...patch,x,y,width,height,angle,bounds:{min:[x-halfX,y-halfY],max:[x+halfX,y+halfY]}};
}
export function cityRoofBounds(block){
 const depth=block.layer===0?5.2:block.layer===1?7:9;
 return {min:[block.x-block.width/2-.10,block.top+.185,block.z-depth-.08],max:[block.x+block.width/2+.10,block.top+.185,block.z+.08]};
}
export function roofServiceMount(block,{x,z,halfWidth=.1,halfDepth=.1}={}){
 const bounds=block.roofBounds??cityRoofBounds(block),margin=.04;
 if(![x,z,halfWidth,halfDepth].every(Number.isFinite)||halfWidth<0||halfDepth<0)throw new TypeError('Finite equipment footprint required.');
 if(halfWidth*2>bounds.max[0]-bounds.min[0]-margin*2||halfDepth*2>bounds.max[2]-bounds.min[2]-margin*2)throw new RangeError('Equipment does not fit its host roof.');
 return {x:Math.max(bounds.min[0]+halfWidth+margin,Math.min(bounds.max[0]-halfWidth-margin,x)),y:bounds.max[1],z:Math.max(bounds.min[2]+halfDepth+margin,Math.min(bounds.max[2]-halfDepth-margin,z)),hostId:block.id,bounds};
}

// Partition a solid front wall around real window apertures. Piers carry the
// full height; spandrels fill only the bands between the rows of openings.
export function windowWallPanels({left,right,bottom,top,columns,rows,windowWidth,windowHeight}){
 const panels=[],xH=windowWidth/2,yH=windowHeight/2;
 const add=(a,b,c,d)=>{if(b-a>1e-7&&d-c>1e-7)panels.push({x:(a+b)/2,y:(c+d)/2,width:b-a,height:d-c});};
 let edge=left;
 for(const x of columns){
  add(edge,x-xH,bottom,top);edge=x+xH;
  let low=bottom;
  for(const y of [...rows].sort((a,b)=>a-b)){add(x-xH,x+xH,low,y-yH);low=y+yH;}
  add(x-xH,x+xH,low,top);
 }
 add(edge,right,bottom,top);return panels;
}
