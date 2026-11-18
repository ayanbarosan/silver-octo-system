import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The head is one sculpted surface. Small fitted details describe age without
// the separate spherical cheeks, eyes and fringe of a toy-like character.
export function createFatherHead(THREE){
 const group=new THREE.Group();group.name='father-head';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=(x,a,b)=>THREE.MathUtils.smoothstep(x,a,b);
 const gaussian=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-(((y-cy)/sy)**2));
 const noise=(x,y,z)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n);};
 const profile=[
  [0,.039,.064,.065],[.025,.071,.087,.079],[.063,.105,.112,.103],
  [.115,.124,.126,.130],[.180,.132,.130,.148],[.245,.145,.134,.155],
  [.310,.145,.128,.157],[.370,.135,.120,.147],[.425,.108,.103,.116],
  [.465,.052,.052,.056],[.478,0,0,0]
 ];
 const profileSlopes=profile.map((point,i)=>[0,...[1,2,3].map(c=>{
  if(i===0)return (profile[1][c]-point[c])/(profile[1][0]-point[0]);
  if(i===profile.length-1)return (point[c]-profile[i-1][c])/(point[0]-profile[i-1][0]);
  const a=(point[c]-profile[i-1][c])/(point[0]-profile[i-1][0]),b=(profile[i+1][c]-point[c])/(profile[i+1][0]-point[0]);
  return a*b<=0?0:2*a*b/(a+b);
 })]);
 function section(y){
  y=clamp(y,0,.478);let i=profile.length-2;
  for(let k=0;k<profile.length-1;k++)if(y<=profile[k+1][0]){i=k;break;}
  const a=profile[i],b=profile[i+1],h=b[0]-a[0],t=(y-a[0])/h,t2=t*t,t3=t2*t;
  return [1,2,3].map(c=>(2*t3-3*t2+1)*a[c]+(t3-2*t2+t)*h*profileSlopes[i][c]+(-2*t3+3*t2)*b[c]+(t3-t2)*h*profileSlopes[i+1][c]);
 }
 function features(x,y){
  // Bridge, downturned nose tip and nasal wings belong to the same skin.
  let d=.029*gaussian(x,y,0,.258,.023,.054)+.036*gaussian(x,y,0,.214,.027,.023);
  d+=.012*(gaussian(x,y,-.026,.203,.016,.014)+gaussian(x,y,.026,.203,.016,.014));
  d+=.017*(gaussian(x,y,-.061,.312,.045,.013)+gaussian(x,y,.061,.312,.045,.013));
  d-=.016*(gaussian(x,y,-.063,.282,.034,.022)+gaussian(x,y,.063,.282,.034,.022));
  d-=.005*(gaussian(x,y,-.071,.258,.039,.010)+gaussian(x,y,.071,.258,.039,.010));
  d+=.010*(gaussian(x,y,-.103,.239,.030,.026)+gaussian(x,y,.103,.239,.030,.026));
  d-=.011*(gaussian(x,y,-.098,.184,.033,.042)+gaussian(x,y,.098,.184,.033,.042));
  d-=.006*(gaussian(x,y,-.047,.174,.010,.034)+gaussian(x,y,.047,.174,.010,.034));
  d+=.005*gaussian(x,y,0,.136,.047,.013)+.013*gaussian(x,y,0,.078,.055,.025);
  d-=.0035*gaussian(x,y,0,.112,.046,.005);
  // Low relief creases catch the light; they do not read as painted stripes.
  for(const yy of [.345,.362,.378])d-=.0015*gaussian(x,y,0,yy+.004*Math.sin(x*31),.103,.0022);
  d-=.0028*(gaussian(x,y,-.012,.326,.0028,.016)+gaussian(x,y,.012,.326,.0028,.016));
  return d;
 }
 function frontZ(x,y){
  const [rx,front]=section(y),unit=clamp(x/Math.max(rx,.0001),-.999,.999),f=Math.sqrt(1-unit*unit);
  return -.006+front*f+features(x,y)*smooth(f,.15,.9);
 }
 const positions=[],colors=[],uv=[],indices=[],rows=88,cols=112;
 const base=new THREE.Color('#ad9684'),shadow=new THREE.Color('#817268'),beard=new THREE.Color('#42463e'),grey=new THREE.Color('#838479');
 for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
  const theta=row/rows*Math.PI,y=.239+Math.cos(theta)*.239,phi=col/cols*Math.PI*2,[rx,front,back]=section(y);
  const x=Math.cos(phi)*rx,f=Math.sin(phi),frontWeight=smooth(f,.15,.9);
  let z=-.006+f*(f>0?front:back)+features(x,y)*frontWeight;
  z+=(noise(x*30,y*30,z*30)-.5)*.00065*frontWeight;
  positions.push(x,y,z);uv.push(col/cols,row/rows);
  const c=base.clone().multiplyScalar(.97+noise(x*71,y*71,z*71)*.05);
  const sockets=gaussian(x,y,-.065,.269,.039,.019)+gaussian(x,y,.065,.269,.039,.019);
  const hollow=gaussian(x,y,-.100,.192,.036,.034)+gaussian(x,y,.100,.192,.036,.034);
  c.lerp(shadow,clamp(.10*(1-frontWeight)+sockets*.34*frontWeight+hollow*.12*frontWeight));
  const beardAmount=(1-smooth(y,.181,.247))*smooth(y,.023,.070)*(.78+.16*noise(x*190,y*160,z*210));
  const mouthExclusion=1-gaussian(x,y,0,.137,.040,.011)*.92;
  c.lerp(beard,beardAmount*mouthExclusion*clamp((f+.68)*.9));
  c.lerp(grey,beardAmount*.10*Math.abs(Math.sin(x*311+y*159)));
  // Subtle upper lip stubble and the red-brown shadow of a weathered nose.
  c.lerp(beard,gaussian(x,y,0,.162,.043,.016)*frontWeight*.76);
  c.lerp(new THREE.Color('#9c796b'),gaussian(x,y,0,.210,.032,.020)*frontWeight*.16);
  colors.push(c.r,c.g,c.b);
 }
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const skin=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.88});
 const face=new THREE.Mesh(geometry,skin);face.name='father-smooth-face';face.castShadow=true;face.receiveShadow=true;group.add(face);
 const skinPlain=new THREE.MeshStandardMaterial({color:'#a58c78',roughness:.89}),crease=new THREE.MeshStandardMaterial({color:'#8b7768',roughness:.98});
 const lip=new THREE.MeshStandardMaterial({color:'#7d655b',roughness:.92}),brow=new THREE.MeshStandardMaterial({color:'#494237',roughness:1});
 function tube(points,radius,material,parent=group,radial=5){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*4),radius,radial,false),material);
  mesh.castShadow=true;parent.add(mesh);return mesh;
 }
 function facialLine(points,radius,material,parent=group){return tube(points.map(([x,y,offset=0])=>[x,y,frontZ(x,y)+offset]),radius,material,parent);}
 for(const side of[-1,1]){
  const earGeometry=new THREE.SphereGeometry(1,24,20),p=earGeometry.attributes.position;
  for(let i=0;i<p.count;i++){const yy=p.getY(i),zz=p.getZ(i);p.setXYZ(i,p.getX(i)*.014,yy*.047,zz*.028*(.88+.12*yy));}earGeometry.computeVertexNormals();
  const ear=new THREE.Mesh(earGeometry,skinPlain);ear.position.set(side*.151,.257,-.019);ear.rotation.z=-side*.12;ear.castShadow=true;group.add(ear);
  tube([[side*.159,.291,-.015],[side*.169,.280,.001],[side*.171,.252,.005],[side*.161,.227,-.001]],.0035,crease);
  facialLine([[side*.106,.310,.0005],[side*.078,.314,.0005],[side*.047,.309,.0005],[side*.030,.307,0]],.0028,brow);
  facialLine([[side*.041,.199,0],[side*.048,.178,0],[side*.052,.155,0]],.00045,crease);
  facialLine([[side*.013,.196,.001],[side*.023,.195,.001],[side*.033,.201,.001]],.0008,crease);
 }
 facialLine([[-.041,.133,.001],[-.022,.136,.001],[0,.134,.001],[.022,.136,.001],[.041,.132,.001]],.0015,lip);
 const eyeGroup=new THREE.Group();eyeGroup.name='father-open-eyes';group.add(eyeGroup);
 const eyeWhite=new THREE.MeshStandardMaterial({color:'#827f72',roughness:.71}),irisMat=new THREE.MeshStandardMaterial({color:'#292d29',roughness:.75});
 for(const side of[-1,1]){
  const cx=side*.064,cy=.283;
  const eyeGeometry=new THREE.SphereGeometry(1,24,16);eyeGeometry.scale(.024,.0047,.004);
  const eye=new THREE.Mesh(eyeGeometry,eyeWhite);eye.position.set(cx,cy,frontZ(cx,cy)+.001);eyeGroup.add(eye);
  const iris=new THREE.Mesh(new THREE.SphereGeometry(.0045,16,12),irisMat);iris.scale.set(1,1,.35);iris.position.set(cx,cy-.0005,frontZ(cx,cy)+.005);eyeGroup.add(iris);
  facialLine([[cx-side*.025,cy,.002],[cx-side*.009,cy+.0045,.002],[cx+side*.014,cy+.003,.002],[cx+side*.025,cy-.001,.001]],.0009,crease);
 }
 eyeGroup.visible=false;

 // A close scalp sits underneath broad, irregular wavy locks. The broken
 // outline and small brown/grey strands stay recognisable in side lighting.
 const hairPositions=[],hairColors=[],hairIndices=[],hairBase=new THREE.Color('#282722'),hairLight=new THREE.Color('#474137'),hairGrey=new THREE.Color('#8d8d81');
 function scalp(t,phi,lift=0){
  const ripple=.002*Math.sin(phi*13+t*7)+.0015*Math.sin(phi*27-t*11);
  const y=.246+Math.cos(t)*.244,[rx,front,back]=section(Math.min(.477,y)),f=Math.sin(phi),radial=Math.sin(t);
  return new THREE.Vector3(Math.cos(phi)*(rx+(lift+.008+ripple)*radial),y+lift*Math.cos(t),-.006+f*((f>0?front:back)+(lift+.010+ripple)*radial));
 }
 const hr=38,hc=96;
 for(let row=0;row<=hr;row++)for(let col=0;col<=hc;col++){
  const phi=col/hc*Math.PI*2,front=Math.max(0,Math.sin(phi)),edge=1.72-front*(.56+.20*(1-Math.abs(Math.cos(phi))))+.035*Math.sin(phi*11),t=row/hr*edge,p=scalp(t,phi,.003);
  hairPositions.push(p.x,p.y,p.z);
  const c=hairBase.clone().lerp(hairLight,.20+.17*Math.sin(phi*19+t*9));
  c.lerp(hairGrey,clamp((Math.abs(Math.cos(phi))-.50)*1.45)*smooth(row/hr,.35,.85));hairColors.push(c.r,c.g,c.b);
 }
 for(let r=0;r<hr;r++)for(let c=0;c<hc;c++){const a=r*(hc+1)+c,b=a+hc+1;hairIndices.push(a,a+1,b,b,a+1,b+1);}
 const scalpGeometry=new THREE.BufferGeometry();scalpGeometry.setAttribute('position',new THREE.Float32BufferAttribute(hairPositions,3));scalpGeometry.setAttribute('color',new THREE.Float32BufferAttribute(hairColors,3));scalpGeometry.setIndex(hairIndices);scalpGeometry.computeVertexNormals();
 const hairMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.99});
 const cap=new THREE.Mesh(scalpGeometry,hairMaterial);cap.name='father-fitted-wavy-scalp';cap.castShadow=true;group.add(cap);
 const locks=[];
 function addLock(points,radius,id,light=.0){
  const curve=new THREE.CatmullRomCurve3(points),segments=14,radial=8,g=new THREE.TubeGeometry(curve,segments,radius,radial,false),p=g.attributes.position,c=[];
  for(let i=0;i<=segments;i++){
   const u=i/segments,center=curve.getPointAt(u),taper=(.33+.67*Math.sin(Math.PI*(.08+u*.85)))*(1-.84*u*u);
   for(let j=0;j<=radial;j++){
    const n=i*(radial+1)+j,q=new THREE.Vector3().fromBufferAttribute(p,n).sub(center).multiplyScalar(taper).add(center);p.setXYZ(n,q.x,q.y,q.z);
    const shade=hairBase.clone().lerp(hairLight,.23+.20*Math.sin(j*1.5+id*.7));shade.lerp(hairGrey,light+Math.pow(Math.max(0,Math.sin(j*3.1+id)),12)*.17);c.push(shade.r,shade.g,shade.b);
   }
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();locks.push(g);
 }
 for(let i=0;i<46;i++){
  const phi=i/46*Math.PI*2+.14*Math.sin(i*2.7),front=Math.max(0,Math.sin(phi)),start=.12+.88*noise(i,2,7),length=.34+.24*noise(i,8,3);
  const points=[];
  for(let k=0;k<5;k++){
   const u=k/4,t=start+u*length,angle=phi+.18*Math.sin(u*Math.PI)+.14*u,edge=1.70-front*.60;
   const p=scalp(Math.min(t,edge+.10),angle,.005+.004*Math.sin(Math.PI*u));p.x+=.0015*Math.sin(u*7+i);p.y+=.0015*Math.sin(u*8+i*1.3);points.push(p);
  }
  addLock(points,.0045+.0035*noise(i,1,4),i,Math.abs(Math.cos(phi))>.65?.27:0);
 }
 // Looser forehead strands break the swept cap and the silhouette over ears.
 const fringe=[
  [[-.095,.449,.057],[-.067,.465,.102],[-.025,.441,.139],[-.030,.405,.151]],
  [[-.043,.473,.058],[.010,.478,.097],[.053,.448,.136],[.050,.411,.144]],
  [[.045,.453,.060],[.090,.449,.102],[.099,.415,.137],[.080,.381,.138]],
  [[-.125,.417,.055],[-.140,.402,.099],[-.128,.365,.129],[-.112,.345,.129]],
  [[.140,.348,-.049],[.162,.337,-.071],[.167,.302,-.057],[.151,.283,-.030]],
  [[-.142,.361,-.057],[-.162,.351,-.075],[-.166,.317,-.063],[-.153,.293,-.026]]
 ];
 fringe.forEach((points,i)=>addLock(points.map(p=>new THREE.Vector3(...p)),i<4?.005:.0045,60+i,i>3?.27:0));
 const lockGeometry=mergeGeometries(locks);const lockMesh=new THREE.Mesh(lockGeometry,hairMaterial);lockMesh.name='father-tousled-hair-locks';lockMesh.castShadow=true;group.add(lockMesh);for(const g of locks)g.dispose();

 // Sparse short stubble catches grazing light over a continuous beard tint.
 const stubble=[];
 for(let i=0;i<320;i++){
  const y=.062+noise(i,3,5)*.145,x=(noise(i,8,11)*2-1)*.123;
  if(Math.abs(x)>section(y)[0]*.92||Math.abs(x)<.048&&y>.118&&y<.151||Math.abs(x)<.038&&y>.185)continue;
  const z=frontZ(x,y)+.0005,length=.0018+.0025*noise(i,6,2),normal=new THREE.Vector3(-(frontZ(x+.001,y)-frontZ(x-.001,y))/.002,-(frontZ(x,y+.001)-frontZ(x,y-.001))/.002,1).normalize();
  const start=new THREE.Vector3(x,y,z),end=start.clone().addScaledVector(normal,length*.55).add(new THREE.Vector3(.001*Math.sin(i),-length*.7,0));
  const g=new THREE.CylinderGeometry(.00025,.00065,start.distanceTo(end),3,1);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize()));g.translate((start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2);
  const c=hairBase.clone().lerp(hairGrey,noise(i,5,9)>.54?.65:.12),a=[];for(let j=0;j<g.attributes.position.count;j++)a.push(c.r,c.g,c.b);g.setAttribute('color',new THREE.Float32BufferAttribute(a,3));stubble.push(g);
 }
 const beardGeometry=mergeGeometries(stubble),beardMesh=new THREE.Mesh(beardGeometry,hairMaterial);beardMesh.name='father-short-grey-stubble';group.add(beardMesh);for(const g of stubble)g.dispose();
 // Fine facial lines share their draw call. Only the pupils/eye whites stay
 // in the separate visibility group used by the sleeping pose.
 function mergeMaterial(parent,material,name){
  const parts=parent.children.filter(o=>o.isMesh&&o.material===material);if(parts.length<2)return;
  const geometries=parts.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);});
  const joined=new THREE.Mesh(mergeGeometries(geometries),material);joined.name=name;joined.castShadow=true;joined.receiveShadow=true;
  for(const part of parts){parent.remove(part);part.geometry.dispose();}for(const geometry of geometries)geometry.dispose();parent.add(joined);
 }
 mergeMaterial(group,skinPlain,'father-sculpted-ears');mergeMaterial(group,crease,'father-facial-age-creases');mergeMaterial(group,brow,'father-weathered-brows');
 mergeMaterial(eyeGroup,eyeWhite,'father-tired-eye-whites');mergeMaterial(eyeGroup,irisMat,'father-tired-irises');
 group.userData.appearance={style:'gaunt-weathered',hair:'tousled-brown-grey',beard:'short-stubble',headSurface:'continuous-sculpted'};
 return {group,eyeGroup,skin};
}
