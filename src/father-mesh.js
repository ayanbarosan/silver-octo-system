// Original smooth character surfaces. Garments are a continuous implicit skin,
// polygonised once, then deformed by the actor's blended skeletal weights.
export function createFatherSurface(THREE,{kind,segments,boneIds}){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smoothMin=(a,b,k)=>{const h=clamp(.5+.5*(b-a)/k);return b+(a-b)*h-k*h*(1-h);};
 const ellipsoid=(x,y,z,c,r)=>{x-=c[0];y-=c[1];z-=c[2];const a=Math.hypot(x/r[0],y/r[1],z/r[2]),b=Math.hypot(x/(r[0]*r[0]),y/(r[1]*r[1]),z/(r[2]*r[2]));return b>1e-8?a*(a-1)/b:-Math.min(...r);};
 const roundedBox=(x,y,z,c,h,r)=>{const q=[Math.abs(x-c[0])-h[0],Math.abs(y-c[1])-h[1],Math.abs(z-c[2])-h[2]];return Math.hypot(Math.max(q[0],0),Math.max(q[1],0),Math.max(q[2],0))+Math.min(Math.max(...q),0)-r;};
 const capsule=(x,y,z,a,b,ra,rb)=>{const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t,z-a[2]-dz*t)-(ra+(rb-ra)*t);};
 const coat=kind==='coat';
 const shirtWidth=y=>.055+.052*clamp((y-1.10)/.47);
 const shirtMask=(x,y,z)=>clamp((z-.065)/.06)*clamp((y-.93)/.045)*clamp((1.72-y)/.045)*clamp((shirtWidth(y)-Math.abs(x))/.014);
 function field(x,y,z){
  let d=coat?smoothMin(roundedBox(x,y+.002*Math.sin(x*29+z*11),z,[0,1.20,-.008],[.183,.225,.100],.055),ellipsoid(x,y,z,[0,1.49,-.006],[.245,.190,.148]),.075):ellipsoid(x,y,z,[0,.995,-.008],[.212,.157,.136]);
  for(const side of [-1,1]){
   if(coat){
    d=smoothMin(d,capsule(x,y,z,[side*.282,1.565,0],[side*.495,1.270,.015],.088,.077),.070);
    d=smoothMin(d,capsule(x,y,z,[side*.495,1.270,.015],[side*.610,.948,.035],.079,.063),.042);
   }else{
    d=smoothMin(d,capsule(x,y,z,[side*.128,.995,0],[side*.143,.555,.020],.108,.086),.058);
    d=smoothMin(d,capsule(x,y,z,[side*.143,.555,.020],[side*.143,.135,.025],.086,.077),.033);
   }
  }
  if(coat){
   // The shirt sits below a softly raised knitted opening, rather than being
   // a coloured stripe painted onto a barrel-shaped jacket.
   d+=.016*shirtMask(x,y,z);
   const front=clamp((z-.085)/.05)*clamp((y-.94)/.04)*clamp((1.72-y)/.06);
   d-=front*.007*Math.exp(-(((Math.abs(x)-shirtWidth(y)-.008)/.012)**2));
   // Gentle sag and broad fabric folds remain part of one connected surface.
   d+=.0019*Math.sin(y*67+x*17)*Math.exp(-(((y-1.10)/.15)**2));
  }else{
   d+=.0021*Math.sin(y*79+x*22)*Math.exp(-(((y-.22)/.14)**2));
   d+=.0012*Math.sin(y*65+z*13)*Math.exp(-(((y-.56)/.14)**2));
  }
  return d;
 }
 const box=coat?[[-.76,.86,-.255],[.76,1.765,.275]]:[[-.32,.035,-.22],[.32,1.16,.23]],step=.023;
 const nx=Math.ceil((box[1][0]-box[0][0])/step),ny=Math.ceil((box[1][1]-box[0][1])/step),nz=Math.ceil((box[1][2]-box[0][2])/step),strideY=nx+1,strideZ=(nx+1)*(ny+1);
 const values=new Float32Array((nx+1)*(ny+1)*(nz+1));
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)values[x+y*strideY+z*strideZ]=field(box[0][0]+x*step,box[0][1]+y*step,box[0][2]+z*step);
 const positions=[],normals=[],colors=[],uvs=[],indices=[],shirtIndices=[],weights=[],skinIndices=[],vertices=new Map();
 const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const surfaceU=p=>.5+Math.atan2(p[0],p[2])/(Math.PI*2);
 function skinFor(p){
  const influences=[];
  for(const name of coat?['torso','leftUpper','leftLower','rightUpper','rightLower']:['pelvis','leftThigh','leftShin','rightThigh','rightShin']){
   const s=segments[name],a=s[0],b=s[1],d=b.map((v,i)=>v-a[i]),t=clamp(p.reduce((sum,v,i)=>sum+(v-a[i])*d[i],0)/d.reduce((sum,v)=>sum+v*v,0));
   const q=p.reduce((sum,v,i)=>sum+(v-a[i]-d[i]*t)**2,0);
   let w=Math.exp(-q/(coat?.025:.014));
   if(name==='torso'&&Math.abs(p[0])>.28)w*=.2;
   if(name==='pelvis'&&p[1]<.80)w*=.06;
   if(name.includes('Lower')&&p[1]>1.38)w*=.08;
   if(name.includes('Upper')&&p[1]<1.10)w*=.08;
   if(name.includes('Thigh')&&p[1]<.39)w*=.06;
   if(name.includes('Shin')&&p[1]>.76)w*=.03;
   influences.push({id:boneIds[name],w});
  }
  influences.sort((a,b)=>b.w-a.w);const top=influences.slice(0,4),sum=top.reduce((s,v)=>s+v.w,0)||1;
  return {ids:top.map(v=>v.id),weights:top.map(v=>v.w/sum)};
 }
 function vertex(p,uvShift=0){
  const key=p.map(v=>Math.round(v*100000)).join('/')+'|'+uvShift;if(vertices.has(key))return vertices.get(key);
  const id=positions.length/3,eps=.0017,n=new THREE.Vector3(field(p[0]+eps,p[1],p[2])-field(p[0]-eps,p[1],p[2]),field(p[0],p[1]+eps,p[2])-field(p[0],p[1]-eps,p[2]),field(p[0],p[1],p[2]+eps)-field(p[0],p[1],p[2]-eps)).normalize();
  positions.push(...p);normals.push(n.x,n.y,n.z);
  const grain=Math.sin(p[0]*173+p[1]*93+p[2]*151)*Math.sin(p[1]*237-p[2]*127),fade=.952+grain*.012+Math.sin(p[1]*45+p[0]*13)*.012;
  colors.push(fade,fade,fade);uvs.push(surfaceU(p)+uvShift,(p[1]-(coat?.86:.055))/(coat?.905:1.105));
  const skin=skinFor(p);skinIndices.push(...skin.ids);weights.push(...skin.weights);vertices.set(key,id);return id;
 }
 function emitTriangle(points,target){
  const [a,b,c]=points,ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
  const areaSq=(ab[1]*ac[2]-ab[2]*ac[1])**2+(ab[2]*ac[0]-ab[0]*ac[2])**2+(ab[0]*ac[1]-ab[1]*ac[0])**2;
  if(areaSq<1e-18)return;
  const us=points.map(surfaceU),seam=Math.max(...us)-Math.min(...us)>.5;
  target.push(...points.map((p,i)=>vertex(p,seam&&us[i]<.5?1:0)));
 }
 function emitPolygon(polygon,target){
  if(!polygon||polygon.length<3)return;
  for(let i=1;i<polygon.length-1;i++)emitTriangle([polygon[0],polygon[i],polygon[i+1]],target);
 }
 function splitPolygon(polygon,distance){
  if(!polygon)return {inside:null,outside:null};
  const values=polygon.map(distance);
  if(values.every(d=>d>=0))return {inside:polygon,outside:null};
  if(values.every(d=>d<=0))return {inside:null,outside:polygon};
  const inside=[],outside=[];
  const append=(list,p)=>{const previous=list.at(-1);if(!previous||p.some((v,i)=>Math.abs(v-previous[i])>1e-12))list.push(p);};
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],da=values[i],db=values[(i+1)%polygon.length];
   if(da>=0)append(inside,a);if(da<=0)append(outside,a);
   if(da*db<0){const t=da/(da-db),p=a.map((v,k)=>v+(b[k]-v)*t);append(inside,p);append(outside,p);}
  }
  for(const list of [inside,outside])if(list.length>1&&list[0].every((v,i)=>Math.abs(v-list.at(-1)[i])<1e-12))list.pop();
  return {inside:inside.length>=3?inside:null,outside:outside.length>=3?outside:null};
 }
 const shirtPlanes=[p=>p[2]-.06,p=>p[1]-.945,p=>1.72-p[1]];
 function partitionOpening(points){
  // Clip the continuous garment exactly at the opening. Selecting a material
  // by a triangle's centre would leave a conspicuous sawtooth seam at this
  // mesh resolution, especially in close shots of the held tumbler.
  if(points.every(p=>p[2]<=.06)||points.every(p=>p[1]<=.945)||points.every(p=>p[1]>=1.72)||points.every(p=>p[0]>=.107)||points.every(p=>p[0]<=-.107)){
   emitPolygon(points,indices);return;
  }
  let remaining=points;
  for(const plane of shirtPlanes){const part=splitPolygon(remaining,plane);emitPolygon(part.outside,indices);remaining=part.inside;if(!remaining)return;}
  // The V's width is piecewise linear. Split at its two knots before clipping
  // each side, so inserted edge vertices lie on the analytic opening itself.
  const low=splitPolygon(remaining,p=>1.10-p[1]),high=splitPolygon(low.outside,p=>1.57-p[1]);
  const zones=[[low.inside,()=>.055],[high.inside,y=>.055+.052*(y-1.10)/.47],[high.outside,()=>.107]];
  for(const [polygon,width]of zones){
   let inside=polygon;if(!inside)continue;
   for(const side of [-1,1]){const part=splitPolygon(inside,p=>width(p[1])-side*p[0]);emitPolygon(part.outside,indices);inside=part.inside;if(!inside)break;}
   emitPolygon(inside,shirtIndices);
  }
 }
 function triangle(a,b,c){const pa=a,pb=b,pc=c,n=new THREE.Vector3().subVectors(new THREE.Vector3(...pb),new THREE.Vector3(...pa)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...pc),new THREE.Vector3(...pa))),middle=pa.map((v,i)=>(v+pb[i]+pc[i])/3),e=.002,g=new THREE.Vector3(field(middle[0]+e,middle[1],middle[2])-field(middle[0]-e,middle[1],middle[2]),field(middle[0],middle[1]+e,middle[2])-field(middle[0],middle[1]-e,middle[2]),field(middle[0],middle[1],middle[2]+e)-field(middle[0],middle[1],middle[2]-e));if(n.dot(g)<0)[b,c]=[c,b];
  if(coat)partitionOpening([a,b,c]);else emitTriangle([a,b,c],indices);
 }
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const points=corners.map(c=>[box[0][0]+(x+c[0])*step,box[0][1]+(y+c[1])*step,box[0][2]+(z+c[2])*step]),v=corners.map(c=>values[x+c[0]+(y+c[1])*strideY+(z+c[2])*strideZ]);
  if(v.every(a=>a>=0)||v.every(a=>a<0))continue;
  const edge=(a,b)=>{const t=v[a]/(v[a]-v[b]);return points[a].map((p,i)=>p+(points[b][i]-p)*t);};
  for(const ids of tetra){const inside=ids.filter(i=>v[i]<0),outside=ids.filter(i=>v[i]>=0);if(inside.length===0||inside.length===4)continue;
   if(inside.length===1){const a=inside[0];triangle(...outside.map(b=>edge(a,b)));}
   else if(inside.length===3){const a=outside[0];triangle(...inside.map(b=>edge(a,b)));}
   else{const[a,b]=inside,[c,d]=outside,p=edge(a,c),q=edge(a,d),r=edge(b,c),s=edge(b,d);triangle(p,q,r);triangle(q,s,r);}
  }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 geo.setIndex([...indices,...shirtIndices]);geo.addGroup(0,indices.length,0);if(shirtIndices.length)geo.addGroup(indices.length,shirtIndices.length,1);
 geo.userData={garment:coat?'worn-open-cardigan':'loose-trousers',continuousSkin:true,shirtPanel:coat?'inset':null};
 geo.computeBoundingSphere();return geo;
}

export {createFatherHead} from './father-head.js';
