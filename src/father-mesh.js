// Original smooth character surfaces. Garments are a continuous implicit skin,
// polygonised once, then deformed by the actor's blended skeletal weights.
export function createFatherSurface(THREE,{kind,segments,boneIds}){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smoothMin=(a,b,k)=>{const h=clamp(.5+.5*(b-a)/k);return b+(a-b)*h-k*h*(1-h);};
 const ellipsoid=(x,y,z,c,r)=>{x-=c[0];y-=c[1];z-=c[2];const a=Math.hypot(x/r[0],y/r[1],z/r[2]),b=Math.hypot(x/(r[0]*r[0]),y/(r[1]*r[1]),z/(r[2]*r[2]));return b>1e-8?a*(a-1)/b:-Math.min(...r);};
 const capsule=(x,y,z,a,b,ra,rb)=>{const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t,z-a[2]-dz*t)-(ra+(rb-ra)*t);};
 const coat=kind==='coat';
 function field(x,y,z){
  let d=coat?smoothMin(ellipsoid(x,y,z,[0,1.23,-.004],[.245,.285,.164]),ellipsoid(x,y,z,[0,1.49,0],[.302,.235,.181]),.11):ellipsoid(x,y,z,[0,.995,-.008],[.230,.165,.155]);
  for(const side of [-1,1]){
   if(coat){
    d=smoothMin(d,capsule(x,y,z,[side*.282,1.565,0],[side*.495,1.270,.015],.121,.091),.085);
    d=smoothMin(d,capsule(x,y,z,[side*.495,1.270,.015],[side*.610,.948,.035],.094,.067),.058);
   }else{
    d=smoothMin(d,capsule(x,y,z,[side*.128,.995,0],[side*.143,.555,.020],.125,.091),.076);
    d=smoothMin(d,capsule(x,y,z,[side*.143,.555,.020],[side*.143,.135,.025],.093,.070),.045);
   }
  }
  return d;
 }
 const box=coat?[[-.76,.86,-.255],[.76,1.765,.275]]:[[-.32,.055,-.22],[.32,1.16,.23]],step=coat?.026:.025;
 const nx=Math.ceil((box[1][0]-box[0][0])/step),ny=Math.ceil((box[1][1]-box[0][1])/step),nz=Math.ceil((box[1][2]-box[0][2])/step),strideY=nx+1,strideZ=(nx+1)*(ny+1);
 const values=new Float32Array((nx+1)*(ny+1)*(nz+1));
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)values[x+y*strideY+z*strideZ]=field(box[0][0]+x*step,box[0][1]+y*step,box[0][2]+z*step);
 const positions=[],normals=[],colors=[],indices=[],weights=[],skinIndices=[],vertices=new Map();
 const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const palette=coat?new THREE.Color('#53554c'):new THREE.Color('#515553'),shirt=new THREE.Color('#a5a28d');
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
 function vertex(p){
  const key=p.map(v=>Math.round(v*100000)).join('/');if(vertices.has(key))return vertices.get(key);
  const id=positions.length/3,eps=.0017,n=new THREE.Vector3(field(p[0]+eps,p[1],p[2])-field(p[0]-eps,p[1],p[2]),field(p[0],p[1]+eps,p[2])-field(p[0],p[1]-eps,p[2]),field(p[0],p[1],p[2]+eps)-field(p[0],p[1],p[2]-eps)).normalize();
  positions.push(...p);normals.push(n.x,n.y,n.z);
  const grain=Math.sin(p[0]*173+p[1]*93+p[2]*151)*Math.sin(p[1]*237-p[2]*127),fade=.91+grain*.025+Math.sin(p[1]*45+p[0]*13)*.025,c=palette.clone().multiplyScalar(fade);
  if(coat){const front=clamp((p[2]-.105)*16),opening=clamp((.061-Math.abs(p[0]))*45)*clamp((p[1]-1.03)*6)*front;c.lerp(shirt,opening*.83);}
  colors.push(c.r,c.g,c.b);const skin=skinFor(p);skinIndices.push(...skin.ids);weights.push(...skin.weights);vertices.set(key,id);return id;
 }
 function triangle(a,b,c){const pa=a,pb=b,pc=c,n=new THREE.Vector3().subVectors(new THREE.Vector3(...pb),new THREE.Vector3(...pa)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...pc),new THREE.Vector3(...pa))),middle=pa.map((v,i)=>(v+pb[i]+pc[i])/3),e=.002,g=new THREE.Vector3(field(middle[0]+e,middle[1],middle[2])-field(middle[0]-e,middle[1],middle[2]),field(middle[0],middle[1]+e,middle[2])-field(middle[0],middle[1]-e,middle[2]),field(middle[0],middle[1],middle[2]+e)-field(middle[0],middle[1],middle[2]-e));if(n.dot(g)<0)[b,c]=[c,b];indices.push(vertex(a),vertex(b),vertex(c));}
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
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geo.setIndex(indices);geo.computeBoundingSphere();return geo;
}

// A single smooth head surface includes brow, cheeks, jaw and nose. Facial
// details sit flush on that surface; the scalp is a continuous fitted cap.
export function createFatherHead(THREE){
 const group=new THREE.Group();group.name='father-head';
 const base=new THREE.Color('#b49884'),shade=new THREE.Color('#827568'),beard=new THREE.Color('#746d61');
 const position=[],color=[],uv=[],index=[],rows=64,cols=96;
 for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
  const theta=row/rows*Math.PI,phi=col/cols*Math.PI*2,ny=Math.cos(theta),rawX=Math.sin(theta)*Math.cos(phi),rawZ=Math.sin(theta)*Math.sin(phi),y=.235+ny*.238;
  const jaw=ny<-.30?1+(ny+.30)*.32:1,cheek=1+.055*Math.exp(-(((ny+.13)/.30)**2)),x=rawX*.171*jaw*cheek;
  let z=rawZ*.148*(ny<-.55?.91:1);
  const front=Math.max(0,Math.min(1,(rawZ-.25)/.55)),gauss=(xx,yy,sx,sy)=>Math.exp(-(((x-xx)/sx)**2)-((y-yy)/sy)**2);
  z+=front*(.065*gauss(0,.242,.026,.070)+.023*gauss(0,.205,.041,.024)-.012*(gauss(-.068,.282,.033,.022)+gauss(.068,.282,.033,.022))+.011*(gauss(-.096,.210,.044,.040)+gauss(.096,.210,.044,.040))+.010*gauss(0,.132,.055,.021)+.012*gauss(0,.086,.060,.029));
  position.push(x,y,z);uv.push(col/cols,row/rows);
  const c=base.clone().lerp(shade,(1-front)*.10+Math.max(0,-ny-.45)*.18),stubble=front*Math.max(0,Math.min(1,(.190-y)*15))*(.30+.20*Math.sin(x*231+y*111)*Math.sin(y*297));c.lerp(beard,stubble);color.push(c.r,c.g,c.b);
 }
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;index.push(a,a+1,b,b,a+1,b+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(color,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(index);geo.computeVertexNormals();
 const skin=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.82});const head=new THREE.Mesh(geo,skin);head.name='father-smooth-face';head.castShadow=true;head.receiveShadow=true;group.add(head);
 const hairMat=new THREE.MeshStandardMaterial({color:'#4c453d',roughness:.97}),dark=new THREE.MeshStandardMaterial({color:'#292a27',roughness:1}),earMat=new THREE.MeshStandardMaterial({color:'#a88b78',roughness:.9});
 const hairPositions=[],hairColors=[],hairIndices=[],hairColor=new THREE.Color('#514a41'),gray=new THREE.Color('#8e9188'),hr=32,hc=80;
 for(let row=0;row<=hr;row++)for(let col=0;col<=hc;col++){
  const phi=col/hc*Math.PI*2,front=Math.max(0,Math.sin(phi)),side=Math.abs(Math.cos(phi)),edge=1.60-front*.58+side*.12,t=row/hr*edge;
  const groove=(Math.sin(phi*19+t*9)*.0015+Math.sin(phi*43-t*5)*.0008)*Math.sin(t),rx=.174+groove,rz=.155+groove;
  hairPositions.push(Math.sin(t)*Math.cos(phi)*rx,.244+Math.cos(t)*.244,Math.sin(t)*Math.sin(phi)*rz-.010);
  const c=hairColor.clone().lerp(gray,Math.max(0,(side-.64)*1.65)*Math.max(0,(row/hr-.30)*1.2));const strand=Math.pow(Math.max(0,Math.sin(phi*53+t*4)),18);c.lerp(gray,strand*.24);hairColors.push(c.r,c.g,c.b);
 }
 for(let r=0;r<hr;r++)for(let c=0;c<hc;c++){const a=r*(hc+1)+c,b=a+hc+1;hairIndices.push(a,a+1,b,b,a+1,b+1);}
 const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.Float32BufferAttribute(hairPositions,3));hg.setAttribute('color',new THREE.Float32BufferAttribute(hairColors,3));hg.setIndex(hairIndices);hg.computeVertexNormals();const scalp=new THREE.Mesh(hg,new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.99}));scalp.name='father-continuous-hair';scalp.castShadow=true;group.add(scalp);
 function tube(points,r,material,parent=group){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,18,r,5,false),material);parent.add(m);return m;}
 for(const side of [-1,1]){
  const earGeo=new THREE.SphereGeometry(1,20,16);earGeo.scale(.028,.055,.034);const ear=new THREE.Mesh(earGeo,earMat);ear.position.set(side*.168,.240,-.008);ear.rotation.z=side*.10;group.add(ear);
  tube([[side*.175,.270,.007],[side*.185,.257,.018],[side*.185,.227,.014],[side*.175,.216,.009]],.0036,shadeMaterial(THREE,'#8b7262'));
  tube([[side*.106,.306,.125],[side*.072,.315,.140],[side*.038,.306,.143]],.0055,hairMat);
  tube([[side*.105,.278,.126],[side*.073,.274,.141],[side*.040,.278,.144]],.0032,dark);
 }
 tube([[-.037,.139,.143],[0,.135,.159],[.037,.139,.143]],.0027,shadeMaterial(THREE,'#7c6258'));
 const eyeGroup=new THREE.Group();eyeGroup.name='father-open-eyes';group.add(eyeGroup);
 for(const side of [-1,1]){
  const g=new THREE.SphereGeometry(1,20,12);g.scale(.030,.010,.007);const eye=new THREE.Mesh(g,shadeMaterial(THREE,'#c3beb0'));eye.position.set(side*.069,.280,.140);eyeGroup.add(eye);
  const iris=new THREE.Mesh(new THREE.SphereGeometry(.007,12,10),dark);iris.scale.z=.4;iris.position.set(side*.069,.279,.148);eyeGroup.add(iris);
 }
 eyeGroup.visible=false;
 return {group,eyeGroup,skin};
}
function shadeMaterial(THREE,color){return new THREE.MeshStandardMaterial({color,roughness:.94});}
