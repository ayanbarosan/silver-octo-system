import {MARKET,awningSurfaceY} from './market.js';

// The district is modelled in three dimensions. Masonry is partitioned around
// openings, and whole buildings own their roofs, panes and fixtures together.
export function createMarketWorld(THREE,scene){
 const group=new THREE.Group();group.name='kiosk-market-district';group.visible=false;scene.add(group);
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),rand=n=>{const x=Math.sin(n*127.13+41.71)*43758.5453;return x-Math.floor(x);};
 const lane=MARKET.lane??1.4,awningMin=MARKET.awning?.minX??67,awningMax=MARKET.awning?.maxX??74,awningY=MARKET.awning?.y??-2.7,lowerY=MARKET.market?.y??-5.2;
 const mat=(color,roughness=.92,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 function texture(kind,size=256){
  const pixels=new Uint8Array(size*size*4),base=kind==='wood'?[191,177,151]:kind==='stone'?[194,199,189]:kind==='asphalt'?[187,191,184]:[212,212,195];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const noise=(rand(x*13.1+y*41.7)-.5)*26,cloud=Math.sin(x*.035+Math.sin(y*.021)*1.7)*Math.cos(y*.027)*11;
   const grain=kind==='wood'?Math.sin(x*.28+Math.sin(y*.01)*1.4)*10:kind==='stone'?Math.sin(x*.31)*Math.cos(y*.43)*1.6:kind==='asphalt'?(Math.abs(Math.sin(x*.021+Math.sin(y*.024)*1.4))<.009?-26:0):0;
   const i=(y*size+x)*4;for(let c=0;c<3;c++)pixels[i+c]=clamp(base[c]+noise+cloud+grain,0,255);pixels[i+3]=255;
  }
  const map=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.anisotropy=4;map.needsUpdate=true;return map;
 }
 const plasterMap=texture('plaster'),woodMap=texture('wood'),stoneMap=texture('stone'),asphaltMap=texture('asphalt');
 asphaltMap.repeat.set(1,1);
 const bump=m=>{const b=m.clone();b.colorSpace=THREE.NoColorSpace;return b;};
 const plaster=mat('#7b7c6c',.97,{map:plasterMap,bumpMap:bump(plasterMap),bumpScale:.026});
 const worn=mat('#58655f',.98,{map:plasterMap,bumpMap:bump(plasterMap),bumpScale:.024});
 const concrete=mat('#6e786f',.95,{map:plasterMap,bumpMap:bump(plasterMap),bumpScale:.018});
 const asphalt=mat('#414e4c',.71,{map:asphaltMap,bumpMap:bump(asphaltMap),bumpScale:.020,metalness:.05});
 const paving=mat('#787d70',.75,{map:stoneMap,bumpMap:bump(stoneMap),bumpScale:.016});
 const wood=mat('#817056',.93,{map:woodMap,bumpMap:bump(woodMap),bumpScale:.014});
 const darkWood=mat('#4d5142',.96,{map:woodMap}),iron=mat('#273a37',.76,{metalness:.5});
 const zinc=mat('#8a9890',.38,{metalness:.75}),rust=mat('#7a5b43',.95),black=mat('#142321',.97);
 const glass=mat('#405b60',.36,{metalness:.24}),warmGlass=mat('#c9ac75',.56,{emissive:'#e8bf7d',emissiveIntensity:.45});
 const lampGlass=mat('#f1d5a0',.35,{emissive:'#ffd39a',emissiveIntensity:2.0});
 const kioskPaint=mat('#617b70',.81,{map:plasterMap,bumpMap:bump(plasterMap),bumpScale:.012,metalness:.12});
 const cream=mat('#b7ab89',.86),red=mat('#775548',.88),green=mat('#6e7950',.92),leaves=mat('#526448',.98);
 const brick=mat('#85664e',.99),mortar=mat('#6a7164',1),paper=mat('#a29d81',.99,{side:THREE.DoubleSide});
 const sphere=new THREE.SphereGeometry(1,16,12),unitBox=new THREE.BoxGeometry(1,1,1),geometries={box:unitBox,cylinder:new THREE.CylinderGeometry(1,1,1,12),plane:new THREE.PlaneGeometry(1,1)};
 const batches=new Map(),dummy=new THREE.Object3D(),props=[],surfaces=[],buildings=[],lights=[],windows=[];
 const floorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 function instance(type,material,position,scale,q=null,shadow=false,parent=group){
  const key=[type,material.uuid,parent.uuid,shadow].join('/');if(!batches.has(key))batches.set(key,{type,material,parent,shadow,matrices:[]});
  dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();if(q)dummy.quaternion.copy(q);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
 }
 const box=(w,h,d,x,y,z,m=concrete,shadow=false,parent=group)=>instance('box',m,[x,y,z],[w,h,d],null,shadow,parent);
 function rod(a,b,r=.025,m=iron,parent=group){const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));instance('cylinder',m,a.map((v,i)=>(v+b[i])/2),[r,delta.length(),r],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()),false,parent);}
 function mesh(geometry,material,parent=group,shadow=true){const o=new THREE.Mesh(geometry,material);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
 function oval(parent,material,x,y,z,sx,sy,sz){const o=mesh(sphere,material,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 function solid(id,area,min,max,extra={}){const p={id,area,bounds:{min,max},...extra};props.push(p);return p;}
 function practical(x,y,z,intensity=12,color='#e4c18a',parent=group){const light=new THREE.PointLight(color,intensity,11,2);light.position.set(x,y,z);parent.add(light);lights.push({light,x,base:intensity});return light;}
 function label(text,w,h,x,y,z,parent=group,{color='#c7c19e',ink='#3b493e',font='bold 52px Georgia'}={}){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,512,128);
  c.strokeStyle=ink;c.lineWidth=3;c.strokeRect(9,9,494,110);c.font=font;c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;c.fillText(text,256,65,470);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const sign=mesh(new THREE.PlaneGeometry(w,h),mat('#ffffff',.94,{map}),parent,false);sign.position.set(x,y,z);return sign;
 }
 // One facade mesh uses continuous, physically scaled UVs across every pier
 // and spandrel instead of restarting a stretched texture at each window.
 function masonry(parts,parent,material,name){
  const positions=[],normals=[],uvs=[],indices=[],p=unitBox.attributes.position,n=unitBox.attributes.normal,index=unitBox.index;
  for(const b of parts){const offset=positions.length/3;for(let i=0;i<p.count;i++){
   const x=b.x+p.getX(i)*b.w,y=b.y+p.getY(i)*b.h,z=b.z+p.getZ(i)*b.d,nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
   positions.push(x,y,z);normals.push(nx,ny,nz);uvs.push((Math.abs(nx)>.5?z:x)*.42,(Math.abs(ny)>.5?z:y)*.42);
  }for(let i=0;i<index.count;i++)indices.push(offset+index.getX(i));}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeBoundingBox();geo.computeBoundingSphere();const o=mesh(geo,material,parent);o.name=name;return o;
 }
 function building(x,w,height,z,seed,baseY=0){
  const parent=new THREE.Group();parent.name='market-block-'+seed;group.add(parent);const parts=[],add=(w,h,d,x,y,z)=>{if(w>.0001&&h>.0001&&d>.0001)parts.push({w,h,d,x,y,z});};
  const left=x-w/2,right=x+w/2,rows=[],columns=[],material=seed%2?plaster:worn;
  add(w,height,3.76,x,baseY+height/2,z-2.50);
  for(let y=baseY+2.15;y<baseY+height-.85;y+=2.77)rows.push(y);
  for(let xx=left+1.14;xx<right-.64;xx+=2.13)columns.push(xx);
  let bottom=baseY;for(const y of rows){add(w,y-.67-bottom,.28,x,(bottom+y-.67)/2,z-.14);let previous=left;
   for(const xx of columns){add(xx-.49-previous,1.34,.28,(previous+xx-.49)/2,y,z-.14);previous=xx+.49;
    const lit=rand(seed+xx*7+y*17)>.86;box(.98,1.34,.025,xx,y,z-.55,black,false,parent);box(.82,1.16,.023,xx,y,z-.24,lit?warmGlass:glass,false,parent);
    for(const side of[-1,1]){add(.065,1.34,.30,xx+side*.455,y,z-.15);box(.035,1.20,.05,xx+side*.414,y,z-.18,iron,false,parent);}
    add(1.05,.095,.41,xx,y-.71,z-.01);box(.031,1.20,.05,xx,y,z-.18,iron,false,parent);box(.87,.031,.05,xx,y+.01,z-.18,iron,false,parent);
    if(lit){box(.14,.25,.022,xx-.22,y-.43,z-.27,wood,false,parent);box(.09,.31,.022,xx+.23,y-.40,z-.27,black,false,parent);}
    windows.push({host:parent.name,x:xx,y,z:z-.24,opening:{min:[xx-.49,y-.67,z-.55],max:[xx+.49,y+.67,z]}});
   }add(right-previous,1.34,.28,(previous+right)/2,y,z-.14);bottom=y+.67;
  }add(w,baseY+height-bottom,.28,x,(bottom+baseY+height)/2,z-.14);masonry(parts,parent,material,parent.name+'-masonry');
  box(w+.32,.17,4.55,x,baseY+height+.04,z-2.10,concrete,true,parent);
  for(const zz of[z+.10,z-4.29])box(w+.20,.17,.12,x,baseY+height+.16,zz,iron,false,parent);
  const pipeX=left+.28;rod([pipeX,baseY+.08,z+.08],[pipeX,baseY+height+.12,z+.08],.042,zinc,parent);
  for(let y=baseY+.6;y<baseY+height;y+=2.77){box(.13,.065,.20,pipeX,y,z+.035,iron,false,parent);box(w,.065,.085,x,y-.13,z+.035,concrete,false,parent);}
  for(let k=0;k<3;k++){const ax=x-w*.26+k*w*.24;rod([ax,baseY+height+.12,z-1.7],[ax,baseY+height+1.08,z-1.7],.014,iron,parent);rod([ax-.47,baseY+height+.77,z-1.7],[ax+.47,baseY+height+.77,z-1.7],.010,iron,parent);}
  buildings.push({id:parent.name,group:parent,bounds:{min:[left-.20,baseY,z-4.50],max:[right+.20,baseY+height+1.16,z+.25]}});
 }
 // The upper street sits on a real retaining wall above the market, not over
 // a second invisible floor. The lower slab covers camera foreground rays.
 masonry([{w:90,h:5.2,d:24,x:21,y:-2.60,z:-2.3}],group,concrete,'upper-retaining-masonry');
 masonry([{w:90,h:.012,d:24,x:21,y:-.002,z:-2.3}],group,asphalt,'upper-wet-street');
 masonry([{w:90,h:.12,d:3.55,x:21,y:-.06,z:1.4}],group,paving,'upper-paving-foundation');
 masonry([{w:151,h:.35,d:57,x:57,y:lowerY-.175,z:-5}],group,asphalt,'lower-wet-market-ground');
 masonry([{w:72,h:.10,d:3.6,x:94,y:lowerY-.05,z:1.4}],group,paving,'lower-paving-foundation');
 masonry([{w:.18,h:5.10,d:24,x:65.91,y:-2.60,z:-2.3}],group,worn,'street-retaining-end');
 for(let x=-12;x<66;x+=1.32){const a=Math.max(-24,x-.63),b=Math.min(66,x+.63);box(b-a,.022,3.40,(a+b)/2,.009,1.4,paving);if(x+.65<66)box(.031,.007,3.4,x+.65,.023,1.4,iron);}
 for(let x=65.5;x<127;x+=1.32){box(1.26,.022,3.40,x,lowerY+.009,1.4,paving);box(.031,.007,3.4,x+.65,lowerY+.023,1.4,iron);}
 surfaces.push({id:'upper-neighbourhood-street',minX:-24,maxX:66,y:0,minZ:-14.3,maxZ:9.7},{id:'lower-market-ground',minX:-18.5,maxX:132.5,y:lowerY,minZ:-33.5,maxZ:23.5});
 solid('street-retaining-edge','approach',[65.82,lowerY,-14.3],[66,.01,9.7],{wall:true,blocking:false});
 building(8.8,18.5,15.2,-7.2,11);building(42.5,21.2,16.5,-8.0,17);building(59.9,12.2,12.8,-10.5,23);
 building(18,31,23,-22.0,27);building(54,23,21,-24.0,31);
 building(84,19,17.5,-10.3,37,lowerY);building(109,21,19,-11.0,43,lowerY);building(112,29,24,-26,47,lowerY);
 // A small kiosk occupies the gap between the two apartment blocks. Both
 // the service opening and the left-hand vendor exit are actual apertures.
 const kiosk=new THREE.Group();kiosk.name='neighbourhood-food-kiosk';group.add(kiosk);
 box(9.2,.16,3.68,25.5,-.08,-1.7,wood,true,kiosk);
 box(9.2,2.80,.14,25.5,1.4,-3.47,kioskPaint,true,kiosk);
 box(.14,2.80,3.5,30.0,1.4,-1.72,kioskPaint,true,kiosk);
 // Left doorway clears z[-1.70,.05], the seller's initial path at z=-1.
 box(.14,2.80,1.61,21.0,1.4,-2.665,kioskPaint,true,kiosk);
 box(.14,.37,1.82,21.0,2.615,-.81,kioskPaint,true,kiosk);
 for(const z of[-1.84,.10])box(.19,2.43,.10,21.0,1.215,z,iron,false,kiosk);
 box(.20,.10,2.02,21.0,2.43,-.87,iron,false,kiosk);
 box(2.25,2.80,.14,22.125,1.4,0,kioskPaint,true,kiosk);box(1.75,2.80,.14,29.125,1.4,0,kioskPaint,true,kiosk);
 box(5.0,.91,.14,25.75,.455,0,kioskPaint,true,kiosk);box(5.0,.57,.14,25.75,2.515,0,kioskPaint,true,kiosk);
 for(const x of[23.25,28.25])box(.085,1.42,.20,x,1.61,.03,iron,false,kiosk);
 box(5.15,.09,.20,25.75,2.24,.03,iron,false,kiosk);
 box(5.32,.10,1.20,25.75,.94,.50,wood,true,kiosk);box(5.36,.045,.10,25.75,.998,1.08,zinc,false,kiosk);
 for(const x of[23.5,28.0])rod([x,.22,.10],[x,.88,1.02],.033,iron,kiosk);
 box(9.65,.17,4.05,25.5,2.90,-1.55,iron,true,kiosk);
 for(let x=20.72;x<30.28;x+=.26)box(.035,.029,4.10,x,3.00,-1.55,zinc,false,kiosk);
 box(9.62,.11,.12,25.5,2.93,.50,zinc,false,kiosk);
 rod([29.88,2.87,.42],[29.88,.12,.42],.038,zinc,kiosk);
 for(const y of[.70,1.38,2.04]){box(6.28,.065,.43,25.67,y,-3.13,wood,true,kiosk);for(let i=0;i<12;i++){const x=22.86+i*.50;box(.21,.23+rand(i+y*31)*.15,.21,x,y+.16,-3.12,i%3===0?cream:i%3===1?green:red,false,kiosk);}}
 box(1.2,.85,.62,28.91,.425,-2.62,wood,true,kiosk);box(.52,.26,.43,28.93,.98,-2.61,iron,false,kiosk);
 for(const z of[-1.77,.07])rod([20.94,0,z],[20.94,2.46,z],.027,iron,kiosk);
 label('KIOSK',3.12,.46,25.25,2.57,.104,kiosk);label('BREAD  1.50',1.25,.40,22.10,1.63,.095,kiosk,{color:'#344a40',ink:'#d0c6a1',font:'42px Georgia'});
 box(.84,.53,.058,28.97,1.55,.095,wood,false,kiosk);label('OPEN',.75,.42,28.97,1.55,.129,kiosk,{color:'#8d8a6c',ink:'#303d35',font:'bold 51px Georgia'});
 practical(25.6,2.08,.20,18,'#efd19d',kiosk);box(1.22,.09,.32,25.6,2.16,.17,iron,false,kiosk);box(1.06,.027,.24,25.6,2.105,.17,lampGlass,false,kiosk);
 // Only this roll is the reachable food item. The character owns the copy
 // in his hand once the animated pickup reaches the lift portion.
 const foodGroup=new THREE.Group();foodGroup.name='kiosk-reachable-bread';foodGroup.position.set(25,1.02,1.0);group.add(foodGroup);
 const crust=mat('#bd9656',.91,{bumpMap:bump(woodMap),bumpScale:.004}),score=mat('#d9b878',.95);
 oval(foodGroup,crust,0,.047,0,.115,.061,.071);for(let i=-1;i<=1;i++){const cut=mesh(new THREE.CapsuleGeometry(.006,.045,2,8),score,foodGroup,false);cut.rotation.z=-.42;cut.rotation.x=Math.PI/2;cut.position.set(i*.049,.104,.005);}
 box(.51,.025,.36,25,.995,.93,cream,false,kiosk);
 const foodMetadata={target:{x:25,y:1.02,z:1.0},stage:'display',visible:true,bounds:{min:[24.885,1.006,.929],max:[25.115,1.128,1.071]}};
 const kioskMetadata={bounds:{min:[20.67,-.16,-3.59],max:[30.33,3.03,1.14]},counter:{bounds:{min:[23.09,.89,-.10],max:[28.41,1.005,1.13]}},foodTarget:foodMetadata.target,sideExitAperture:{min:[20.85,0,-1.75],max:[21.18,2.40,.04]},vendorPath:[[27.4,0,-1],[21.2,0,-1],[20.5,0,1.4]],serviceOpening:{min:[23.30,.995,-.08],max:[28.20,2.19,.17]}};
 solid('kiosk-counter','approach',[23.09,0,-.10],[28.41,1.005,1.13],{blocking:false});solid('kiosk-back-wall','approach',[20.9,0,-3.55],[30.1,2.8,-3.40],{wall:true});
 solid('kiosk-right-wall','approach',[29.93,0,-3.47],[30.07,2.80,.07],{wall:true});
 // The railing has closed ends, footplates and return rails into the sides.
 const railing=new THREE.Group();railing.name='street-drop-safety-railing';group.add(railing);
 for(const z of[.18,2.68]){box(.085,.88,.085,66,.44,z,iron,true,railing);box(.19,.035,.19,66,.018,z,zinc,false,railing);oval(railing,zinc,66,.892,z,.052,.028,.052);}
 for(const y of[.20,.56,.887])rod([66,y,.18],[66,y,2.68],y===.887?.033:.021,iron,railing);
 for(const z of[.18,2.68]){rod([64.90,.887,z],[66,.887,z],.033,iron,railing);rod([64.90,.0,z],[64.90,.887,z],.028,iron,railing);}
 const railingMetadata={x:66,y:.92,z:lane,minZ:.18,maxZ:2.68,bounds:{min:[64.84,0,.12],max:[66.07,.92,2.74]},jumpRequired:true};
 solid('street-edge-railing','approach',[65.94,0,.12],[66.06,.92,2.74],{climbable:true,topY:.92});
 // A woven, rain-heavy cloth canopy catches the falling boy. Vertex heights
 // use the same surface function as the controller; the metadata samples the
 // actual mesh row so QA can detect an offset rather than compare two formulas.
 const awningWidth=awningMax-awningMin,awningDepth=3.0,nx=48,nz=20,awningCenter=(awningMin+awningMax)/2;
 const clothPixels=new Uint8Array(256*256*4);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const stripe=Math.floor(x/32)%2,color=stripe?[171,157,118]:[95,119,105],grain=(rand(x*17+y*53)-.5)*21,stain=Math.sin(x*.045+y*.017)*6,i=(y*256+x)*4;for(let c=0;c<3;c++)clothPixels[i+c]=clamp(color[c]+grain+stain,0,255);clothPixels[i+3]=255;}
 const clothMap=new THREE.DataTexture(clothPixels,256,256);clothMap.colorSpace=THREE.SRGBColorSpace;clothMap.wrapS=clothMap.wrapT=THREE.RepeatWrapping;clothMap.repeat.set(2,1);clothMap.generateMipmaps=true;clothMap.minFilter=THREE.LinearMipmapLinearFilter;clothMap.needsUpdate=true;
 const clothMaterial=mat('#ffffff',.82,{map:clothMap,bumpMap:bump(clothMap),bumpScale:.006,side:THREE.DoubleSide});
 const awningGeo=new THREE.PlaneGeometry(awningWidth,awningDepth,nx,nz);awningGeo.rotateX(-Math.PI/2);const ap=awningGeo.attributes.position,awningOriginal=new Float32Array(ap.array);
 for(let i=0;i<ap.count;i++)ap.setXYZ(i,ap.getX(i)+awningCenter,awningY,ap.getZ(i)+lane);ap.setUsage(THREE.DynamicDrawUsage);
 const awningCloth=mesh(awningGeo,clothMaterial);awningCloth.name='soft-market-stall-canopy';awningCloth.frustumCulled=false;
 for(const x of[awningMin-.10,awningMax+.10])for(const z of[lane-1.64,lane+1.64]){
  rod([x,lowerY,z],[x,awningY+.05,z],.035,iron);box(.18,.045,.18,x,lowerY+.022,z,zinc);
 }
 for(const z of[lane-1.58,lane+1.58])rod([awningMin-.14,awningY,z],[awningMax+.14,awningY,z],.032,iron);
 for(const x of[awningMin-.10,awningMax+.10])rod([x,awningY,lane-1.64],[x,awningY,lane+1.64],.028,iron);
 for(let i=0;i<24;i++){const x=awningMin+awningWidth*i/23;box(.27,.17,.012,x,awningY-.085,lane+1.515,i%2?cream:green);}
 const awningMetadata={minX:awningMin,maxX:awningMax,y:awningY,z:lane,halfWidthZ:awningDepth/2,deflection:0,impactX:awningCenter,rootSurfaceY:awningY,rootSurfacePoint:[awningCenter,awningY,lane],vertices:nx*nz,soft:true};
 surfaces.push({id:'soft-stall-awning',minX:awningMin,maxX:awningMax,y:awningY,minZ:lane-1.5,maxZ:lane+1.5,dynamic:true});
 // Every stall keeps its produce and furniture behind the walking strip.
 function crate(x,y,z,w=.72,h=.53,d=.59,parent=group){box(w,h,d,x,y+h/2,z,wood,true,parent);for(const side of[-1,1])for(const yy of[.08,h-.08])box(w+.03,.07,.035,x,y+yy,z+side*(d/2+.018),darkWood,false,parent);for(let n=1;n<5;n++)box(.014,h-.04,.009,x-w/2+n*w/5,y+h/2,z+d/2+.023,black,false,parent);}
 function produce(x,y,z,width,seed,parent=group){
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){const xx=x-width*.37+col*width*.18+(rand(seed+row*13+col)-.5)*.035,zz=z-.21+row*.18;
   const fruit=seed%3===0?green:seed%3===1?red:cream;oval(parent,fruit,xx,y+.08+rand(seed+col+row*31)*.03,zz,.075,.072,.071);
   if(seed%3===0){rod([xx,y+.12,zz],[xx+.013,y+.17,zz],.004,wood,parent);}
  }
 }
 function stall(x,w,z,seed,{first=false}={}){
  const parent=new THREE.Group();parent.name='market-stall-'+seed;group.add(parent);const roofY=first?awningY:lowerY+2.65;
  if(!first){for(const xx of[x-w/2,x+w/2])for(const zz of[z-.85,z+1.44])rod([xx,lowerY,zz],[xx,roofY,zz],.032,iron,parent);
   const roof=mesh(new THREE.PlaneGeometry(w+.32,2.54,18,10),clothMaterial,parent);roof.rotation.x=-Math.PI/2;roof.position.set(x,roofY,z+.30);
   const p=roof.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,-.08*Math.sin((p.getX(i)/w+.5)*Math.PI)*Math.sin((p.getY(i)/2.54+.5)*Math.PI));roof.geometry.computeVertexNormals();
   for(const side of[-1,1])rod([x-w/2,roofY,z+side*1.25+.30],[x+w/2,roofY,z+side*1.25+.30],.025,iron,parent);
  }
  const tableZ=z-.18;box(w-.45,.11,.92,x,lowerY+.91,tableZ,wood,true,parent);for(const xx of[x-w*.37,x+w*.37])for(const zz of[tableZ-.34,tableZ+.34])box(.065,.86,.065,xx,lowerY+.43,zz,iron,false,parent);
  for(let i=0;i<3;i++){const xx=x-(w-.9)/3+(w-.9)/3*i;crate(xx,lowerY+.97,tableZ,1.06,.19,.70,parent);produce(xx,lowerY+1.17,tableZ,.96,seed+i,parent);}
  for(let i=0;i<3;i++)crate(x-w*.34+i*.79,lowerY,z-.85,.70,.55,.57,parent);
  if(seed%2){box(.56,.06,.49,x+w*.32,lowerY+1.06,tableZ,iron,false,parent);box(.11,.45,.12,x+w*.32,lowerY+1.30,tableZ,zinc,false,parent);box(.47,.07,.42,x+w*.32,lowerY+1.56,tableZ,zinc,false,parent);}
  label(seed%2?'FRESH PRODUCE':'FRUIT & BREAD',2.20,.31,x,lowerY+1.86,z-.73,parent,{color:'#827f65',ink:'#2d3d34',font:'bold 33px Georgia'});
  buildings.push({id:parent.name,group:parent,bounds:{min:[x-w/2-.2,lowerY,z-1.50],max:[x+w/2+.2,roofY+.12,z+1.75]}});
  solid(parent.name+'-counter','market',[x-(w-.45)/2,lowerY,tableZ-.46],[x+(w-.45)/2,lowerY+1.36,tableZ+.46],{blocking:false});
 }
 stall(70.5,6.4,.55,51,{first:true});stall(82.0,6.1,-1.25,53);stall(94.0,7.2,-1.32,57);stall(108.0,7.1,-1.22,61);
 for(const[x,z,seed]of[[88.1,-2.10,71],[100.1,-2.22,73],[115.0,-2.0,77]]){crate(x,lowerY,z,.81,.61,.73);crate(x+.13,lowerY+.61,z,.74,.55,.70);solid('stacked-produce-crates-'+seed,'market',[x-.45,lowerY,z-.40],[x+.55,lowerY+1.17,z+.40],{blocking:false});}
 // A quiet corner after the drop offers a visual breathing space for eating.
 box(1.83,.09,.54,78.65,lowerY+.48,-.51,wood,true);for(const x of[77.94,79.36])for(const z of[-.67,-.34])box(.07,.44,.07,x,lowerY+.22,z,iron);
 for(const[x,y,z]of[[13,0,-.48],[37,0,-.50],[57,0,-.52],[79,lowerY,-.35],[97,lowerY,-.28],[114,lowerY,-.45]]){
  rod([x,y,z],[x,y+4.65,z],.052,iron);rod([x,y+4.60,z],[x+.57,y+4.76,z+.21],.029,iron);box(.62,.12,.34,x+.66,y+4.71,z+.27,iron);box(.50,.026,.26,x+.66,y+4.64,z+.27,lampGlass);practical(x+.66,y+4.51,z+.27,12);
 }
 // Sagging utility cables, drainage, discarded paper and wet patches share
 // the same route origin and never float outside their parent surfaces.
 for(let i=0;i<9;i++){const x=2+i*7.3;rod([x,5.2,-4.3],[x+7.3,5.03,-4.3],.014,black);}
 for(let i=0;i<6;i++){const x=74+i*8.0;rod([x,lowerY+4.2,-4.8],[x+8,lowerY+4.05,-4.8],.012,black);}
 const puddlePixels=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const xx=(x-31.5)/31.5,yy=(y-31.5)/31.5,angle=Math.atan2(yy,xx),r=Math.hypot(xx,yy),edge=1+.055*Math.sin(angle*3)+.032*Math.sin(angle*7),alpha=Math.round(clamp((edge-r)*7)*255),i=(y*64+x)*4;
  puddlePixels[i]=puddlePixels[i+1]=puddlePixels[i+2]=alpha;puddlePixels[i+3]=255;
 }
 const puddleAlpha=new THREE.DataTexture(puddlePixels,64,64);puddleAlpha.needsUpdate=true;
 const puddleMat=mat('#63807e',.16,{metalness:.45,transparent:true,opacity:.38,alphaMap:puddleAlpha,alphaTest:.01,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 const glowMat=mat('#bca16d',.20,{metalness:.38,emissive:'#756346',emissiveIntensity:.18,transparent:true,opacity:.19,alphaMap:puddleAlpha,alphaTest:.01,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 for(let i=0;i<64;i++){const x=-9+rand(i+111)*137,y=x<66?0:lowerY,z=-1.2+rand(i+431)*6.3;if(x>65.6&&x<74.2)continue;instance('plane',i%5? puddleMat:glowMat,[x,y+.024,z],[.44+rand(i+211)*2.0,.18+rand(i+311)*.67,1],floorQ);}
 for(let i=0;i<110;i++){const x=-4+rand(i+131)*127,y=x<66?0:lowerY,z=-1.6+rand(i+791)*5.4;if(x>65.6&&x<74.2||Math.abs(z-lane)<.42)continue;instance('plane',paper,[x,y+.027,z],[.07+rand(i+931)*.13,.06+rand(i+1131)*.09,1],new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,rand(i+331)*6.28)));}
 for(const[x,y]of[[10,0],[33,0],[48,0],[82,lowerY],[101,lowerY],[114,lowerY]]){box(.72,.025,.30,x,y+.027,2.72,iron);for(let n=0;n<11;n++)box(.025,.009,.29,x-.31+n*.062,y+.043,2.72,black);}
 for(const batch of batches.values()){const o=new THREE.InstancedMesh(geometries[batch.type],batch.material,batch.matrices.length);batch.matrices.forEach((m,i)=>o.setMatrixAt(i,m));o.instanceMatrix.needsUpdate=true;o.castShadow=batch.shadow;o.receiveShadow=true;batch.parent.add(o);}
 const fill=new THREE.HemisphereLight('#b3c8cb','#565448',.38);group.add(fill);
 const rainCount=550,rainPositions=new Float32Array(rainCount*6),rainSpeeds=new Float32Array(rainCount);
 for(let i=0;i<rainCount;i++){const o=i*6;rainPositions[o]=rand(i+151)*40-17;rainPositions[o+1]=rand(i+651)*16;rainPositions[o+2]=-10+rand(i+951)*22;rainSpeeds[i]=8+rand(i+1231)*6;rainPositions[o+3]=rainPositions[o]-.04;rainPositions[o+4]=rainPositions[o+1]-.26;rainPositions[o+5]=rainPositions[o+2];}
 const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3).setUsage(THREE.DynamicDrawUsage));const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#b2c7ce',transparent:true,opacity:.17,depthWrite:false}));rain.frustumCulled=false;group.add(rain);
 const rippleCount=18,ripples=new THREE.InstancedMesh(new THREE.TorusGeometry(1,.008,4,20),new THREE.MeshBasicMaterial({color:'#8ba6a9',transparent:true,opacity:.22,depthWrite:false}),rippleCount);ripples.frustumCulled=false;group.add(ripples);
 const metadata={id:'kiosk-and-market',route:{minX:0,maxX:118,upperY:0,lowerY,lane},surfaces,props,buildings:buildings.map(({id,bounds})=>({id,bounds})),windows,kiosk:kioskMetadata,food:foodMetadata,railing:railingMetadata,awning:awningMetadata,market:{minX:74,maxX:118,y:lowerY,lane,stallCount:4},visibility:{strategy:'whole-building-bounds'},drawBatches:batches.size,rainDrops:rainCount};
 group.userData.market=metadata;
 let previousTime=null;
 function update(time=0,playerX=2,state=null,player=null){
  if(!group.visible)return;const dt=previousTime===null?0:clamp(time-previousTime,0,.08);previousTime=time;
  const take=state?.marketAction?.type==='take-food'&&state.marketAction.progress>.55;
  foodGroup.visible=(!state||state.food==='display')&&!take;foodMetadata.stage=state?.food??'display';foodMetadata.visible=foodGroup.visible;
  for(let i=0;i<ap.count;i++){
   const localX=awningOriginal[i*3],localZ=awningOriginal[i*3+2],x=localX+awningCenter,weight=1-(Math.abs(localZ)/(awningDepth/2))**2;
   const surface=state?awningSurfaceY(x,state):awningY,wrinkle=.009*Math.sin(localX*5.2+localZ*4.1)*Math.sin(Math.abs(localZ)/(awningDepth/2)*Math.PI);
   ap.setY(i,awningY+(surface-awningY)*Math.max(0,weight)+wrinkle);
  }
  ap.needsUpdate=true;awningGeo.computeVertexNormals();awningGeo.computeBoundingBox();awningGeo.computeBoundingSphere();
  const sampleX=clamp(playerX,awningMin,awningMax),u=(sampleX-awningMin)/awningWidth*nx,col=Math.min(nx-1,Math.floor(u)),f=u-col,row=nz/2,index=row*(nx+1)+col;
  awningMetadata.rootSurfaceY=ap.getY(index)*(1-f)+ap.getY(index+1)*f;awningMetadata.rootSurfacePoint=[sampleX,awningMetadata.rootSurfaceY,lane];
  awningMetadata.deflection=state?.awningDeflection??0;awningMetadata.impactX=state?.awningImpactX??awningCenter;
  for(const building of buildings){const margin=42+Math.max(0,-building.bounds.max[2])*.35;building.group.visible=building.bounds.min[0]<playerX+margin&&building.bounds.max[0]>playerX-margin;}
  for(const entry of lights){entry.light.visible=Math.abs(entry.x-playerX)<23;entry.light.intensity=entry.base*(.992+.006*Math.sin(time*.83+entry.x));}
  const floorY=player?.y<-1||playerX>66?lowerY:0;
  for(let i=0;i<rainCount;i++){
   const o=i*6;rainPositions[o]-=dt*.80;rainPositions[o+1]-=rainSpeeds[i]*dt;
   if(rainPositions[o+1]<(rainPositions[o]<66?0:lowerY)+.03||Math.abs(rainPositions[o]-playerX)>23){rainPositions[o]=playerX-20+rand(i+time*.13)*40;rainPositions[o+1]=floorY+8+rand(i+777)*8;}
   rainPositions[o+3]=rainPositions[o]-.04;rainPositions[o+4]=rainPositions[o+1]-.26;rainPositions[o+5]=rainPositions[o+2];
  }rainGeo.attributes.position.needsUpdate=true;
  for(let i=0;i<rippleCount;i++){const phase=(time*.75+rand(i+941)*6)%1,r=.03+phase*.20,x=playerX-10+rand(i+161)*20,y=x<66?0:lowerY;dummy.position.set(x,y+.029,lane+(rand(i+911)-.5)*2.4);dummy.rotation.set(-Math.PI/2,0,rand(i+581)*6.28);dummy.scale.set(r,r,.3);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);}ripples.instanceMatrix.needsUpdate=true;
 }
 return {group,metadata,update};
}
