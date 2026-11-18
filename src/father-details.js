import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Small sculpted details stay with the existing hand and foot targets, so the
// remodel keeps the tumbler grip and the actor's planted contacts intact.
export function createFatherHands(THREE){
 const skin=new THREE.Color('#a9907c'),crease=new THREE.Color('#786a5b'),nail=new THREE.Color('#b0a18d');
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.87});
 function tinted(geometry,tint=skin){
  const positions=geometry.attributes.position,colors=[];
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),grain=Math.sin(x*457+y*283)*Math.sin(z*337-y*191);
   const fold=Math.exp(-(((y+.045)/.004)**2))*.065+Math.exp(-(((y+.078)/.003)**2))*.055;
   const c=tint.clone().lerp(crease,fold+grain*.018+.02);colors.push(c.r,c.g,c.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geometry;
 }
 function oval(parts,center,scale,tint=skin,rotation=0){
  const g=new THREE.SphereGeometry(1,24,16);g.scale(...scale);g.rotateX(rotation);g.translate(...center);parts.push(tinted(g,tint));
 }
 function finger(parts,points,radius){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const g=new THREE.TubeGeometry(curve,14,radius,8,false),a=g.attributes.position,uv=g.attributes.uv,p=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<a.count;i++){
   const t=uv.getX(i),taper=1-.27*t;c.copy(curve.getPointAt(t));p.fromBufferAttribute(a,i).sub(c).multiplyScalar(taper).add(c);a.setXYZ(i,p.x,p.y,p.z);
  }
  g.computeVertexNormals();parts.push(tinted(g));oval(parts,points.at(-1),[radius*.73,radius*.73,radius*.73]);
 }
 const hands={};
 for(const side of ['left','right']){
  const grip=side==='left',parts=[],sign=grip?1:-1;
  oval(parts,[grip?-.012:0,-.030,grip?-.034:.005],[.046,.047,.027]);
  oval(parts,[grip?-.010:0,.007,grip?-.033:.001],[.034,.029,.027]);
  for(let i=0;i<4;i++){
   const x=-.030+i*.020,length=[.054,.066,.062,.047][i],r=[.0105,.0105,.010,.009][i];
   if(grip){
    // Four horizontal finger rows curl around the outside of the tumbler.
    // Keeping their centreline beyond the glass radius avoids a hand which
    // appears to pass through its transparent wall at close camera angles.
    const y=.021-i*.022;
    finger(parts,[[-.025,y,-.009],[-.048,y-.002,.021],[-.050,y-.004,.067],[-.026,y-.003,.115],[.017,y,.134]],r);
    oval(parts,[.016,y,.141],[.008,.006,.0017],nail);
   }else{
    finger(parts,[[x,-.053,.009],[x,-.076,.017],[x,-.053-length,.025]],r);
    oval(parts,[x,-.048-length,.032],[.0063,.009,.0016],nail);
   }
  }
  finger(parts,grip?[[.031,.012,-.019],[.073,.026,.009],[.099,.018,.055],[.078,.002,.111]]:
   [[sign*.033,-.020,.003],[sign*.053,-.043,.018],[sign*.050,-.068,.031]],.0125);
  const geometry=mergeGeometries(parts);for(const part of parts)part.dispose();
  const hand=new THREE.Group();hand.name=`father-${side}-hand`;
  const mesh=new THREE.Mesh(geometry,material);mesh.name=`father-${side}-sculpted-hand`;mesh.castShadow=true;mesh.receiveShadow=true;hand.add(mesh);hands[side]=hand;
 }
 return hands;
}

export function createFatherSlippers(THREE){
 const size=128,pixels=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,lineX=x%32<3,lineY=y%32<3,cross=x%32<11&&y%32<11,thread=((x+y)%3-1)*3;
  const c=(lineX||lineY?-18:cross?7:0)+thread;
  pixels[i]=80+c;pixels[i+1]=74+c;pixels[i+2]=65+c;pixels[i+3]=255;
  height[i]=height[i+1]=height[i+2]=126+thread*3;height[i+3]=255;
 }
 const map=new THREE.DataTexture(pixels,size,size);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);map.needsUpdate=true;
 const bump=new THREE.DataTexture(height,size,size);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(2,2);bump.needsUpdate=true;
 const cloth=new THREE.MeshStandardMaterial({color:'#b1aaa0',map,bumpMap:bump,bumpScale:.0013,roughness:.99});
 const rubber=new THREE.MeshStandardMaterial({color:'#282b27',roughness:.96}),inside=new THREE.MeshStandardMaterial({color:'#302d27',roughness:1});
 const shoes={};
 for(const side of ['left','right']){
  const shoe=new THREE.Group();shoe.name=`father-${side}-shoe`;
  const g=new THREE.SphereGeometry(1,36,24),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const z=p.getZ(i)*.171+.042,x=p.getX(i)*.094*(1-.11*Math.max(0,z/.22)),y=Math.max(-.036,p.getY(i)*.061-.004);
   p.setXYZ(i,x,y,z);
  }
  g.computeVertexNormals();const upper=new THREE.Mesh(g,cloth);upper.castShadow=true;upper.receiveShadow=true;shoe.add(upper);
  const soleGeo=new THREE.SphereGeometry(1,32,16);soleGeo.scale(.095,.016,.178);soleGeo.translate(0,-.039,.041);
  const sole=new THREE.Mesh(soleGeo,rubber);sole.castShadow=true;shoe.add(sole);
  const liningGeo=new THREE.SphereGeometry(1,24,12);liningGeo.scale(.058,.005,.054);liningGeo.translate(0,.042,-.058);shoe.add(new THREE.Mesh(liningGeo,inside));
  shoes[side]=shoe;
 }
 return shoes;
}
