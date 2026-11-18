// A front-open apartment, with a continuous clear walking strip in front of
// the kitchen, living room and bedroom. Every asset is generated offline.
export function createApartmentWorld(THREE,scene){
  const group=new THREE.Group();group.name='child-apartment';group.visible=false;scene.add(group);
  const random=n=>{const v=Math.sin(n*127.13+541.71)*43758.5453;return v-Math.floor(v);};
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const noise=(x,y,seed=0)=>{const ix=Math.floor(x),iy=Math.floor(y),a=x-ix,b=y-iy,u=a*a*(3-2*a),v=b*b*(3-2*b);return mix(mix(random(ix*37+iy*113+seed),random((ix+1)*37+iy*113+seed),u),mix(random(ix*37+(iy+1)*113+seed),random((ix+1)*37+(iy+1)*113+seed),u),v);};
  const mat=(color,roughness=.9,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  function canvas(size=512,h=size){const c=document.createElement('canvas');c.width=size;c.height=h;return c;}
  function texture(c,repeat=[1,1],color=true){const t=new THREE.CanvasTexture(c);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=4;return t;}
  function wornTexture(kind){
    const c=canvas(),ctx=c.getContext('2d'),im=ctx.createImageData(512,512);
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
      const i=(y*512+x)*4,a=noise(x/92,y/107,77),b=noise(x/23,y/29,319),g=random(x*13.17+y*113.71);
      let base,shade;
      if(kind==='wood'){const line=Math.sin(x*.09+noise(x/77,y/121,913)*5)+Math.sin(x*.6+noise(x/18,y/97,351)*5)*.2;shade=line*10+(a-.5)*23+(g-.5)*18;base=[113,92,66];}
      else if(kind==='fabric'){shade=(a-.5)*40+(b-.5)*18+(g-.5)*22;base=[112,104,83];}
      else if(kind==='paint'){shade=(a-.5)*16+(b-.5)*10+(g-.5)*8;base=[181,176,155];}
      else{shade=(a-.5)*47+(b-.5)*29+(g-.5)*16;base=[163,160,144];}
      for(let k=0;k<3;k++)im.data[i+k]=clamp(base[k]+shade,0,255);im.data[i+3]=255;
    }
    ctx.putImageData(im,0,0);
    if(kind==='paint'){
      // Old enamel wears into fine scuffs, chips and runoff rather than broad
      // repeated mould shapes on every cupboard door.
      for(let i=0;i<85;i++){
        const x=random(i+127)*512,y=random(i+419)*512;
        ctx.fillStyle=i%4?'rgba(73,65,46,.15)':'rgba(214,207,178,.22)';
        ctx.fillRect(x,y,.5+random(i+61)*2.5,1+random(i+81)*7);
      }
      for(let i=0;i<12;i++){
        const x=random(i+131)*512,y=random(i+431)*512,len=25+random(i+931)*105;
        const g=ctx.createLinearGradient(x,y,x,y+len);g.addColorStop(0,'rgba(70,62,42,.13)');g.addColorStop(1,'rgba(70,62,42,0)');ctx.fillStyle=g;ctx.fillRect(x,y,1+random(i+13)*4,len);
      }
      for(const x of [3,508]){ctx.fillStyle='rgba(69,61,42,.14)';ctx.fillRect(x,0,1,512);}
    }else if(kind!=='fabric'&&kind!=='wood'){
      for(let i=0;i<30;i++){
        const x=random(i+131)*512,y=random(i+431)*512,r=7+random(i+931)*39;
        ctx.beginPath();for(let j=0;j<=16;j++){const a=j/16*Math.PI*2,s=r*(.50+random(i*37+j)*.55),xx=x+Math.cos(a)*s,yy=y+Math.sin(a)*s*.75;if(j)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();
        ctx.fillStyle=i%3===0?'rgba(78,76,63,.18)':'rgba(201,195,163,.15)';ctx.fill();ctx.strokeStyle='rgba(61,60,49,.10)';ctx.lineWidth=.7;ctx.stroke();
      }
      for(let i=0;i<19;i++){
        const x=random(i+1191)*512,y=random(i+5191)*512,len=35+random(i+631)*130;
        const g=ctx.createLinearGradient(x,y,x,y+len);g.addColorStop(0,'rgba(60,55,37,.19)');g.addColorStop(1,'rgba(60,55,37,0)');ctx.fillStyle=g;ctx.fillRect(x,y,2+random(i+391)*9,len);
      }
      ctx.strokeStyle='rgba(49,49,39,.36)';ctx.lineWidth=.8;
      for(let i=0;i<10;i++){const x=random(i+2201)*512,y=random(i+5311)*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=1;j<7;j++)ctx.lineTo(x+j*3+(random(i*29+j)-.5)*14,y+j*6+(random(i*19+j+7)-.5)*13);ctx.stroke();}
    }
    return texture(c);
  }
  const plasterMap=wornTexture('plaster'),woodMap=wornTexture('wood'),paintMap=wornTexture('paint'),fabricMap=wornTexture('fabric');
  const plasterBump=plasterMap.clone();plasterBump.colorSpace=THREE.NoColorSpace;
  const plaster=mat('#b5af96',.98,{map:plasterMap,bumpMap:plasterBump,bumpScale:.018});
  const darkerPlaster=mat('#999c92',.99,{map:plasterMap,bumpMap:plasterBump,bumpScale:.018});
  const ceiling=mat('#96958a',1,{map:plasterMap}),section=mat('#343b39',1,{map:plasterMap});
  const wood=mat('#9d8262',.9,{map:woodMap,bumpMap:woodMap,bumpScale:.01});
  const darkWood=mat('#5d503b',.95,{map:woodMap}),cabinetPaint=mat('#c8c0a4',.93,{map:paintMap,bumpMap:paintMap,bumpScale:.007});
  const cabinetEdge=mat('#80765a',.97,{map:woodMap}),counter=mat('#54564b',.62,{map:paintMap,bumpMap:paintMap,bumpScale:.008});
  const black=mat('#181d1b',.96),metal=mat('#424943',.64,{metalness:.55}),rust=mat('#725237',.99),zinc=mat('#a1a399',.43,{metalness:.75});
  const enamel=mat('#c7c6ac',.66,{map:paintMap,metalness:.07}),ceramic=mat('#c8c5ab',.84),dishGrime=mat('#635945',.96);
  const bottleGreen=mat('#374b2d',.24,{metalness:.08}),bottleBrown=mat('#5e4126',.29,{metalness:.1}),paper=mat('#c2b898',1);
  const cloth=mat('#858075',1,{map:fabricMap}),sofaFabric=mat('#8b8269',1,{map:fabricMap,bumpMap:fabricMap,bumpScale:.012});
  const bedSheet=mat('#a7aaa0',1,{map:fabricMap}),blanketBase=mat('#63584a',1,{map:fabricMap}),teddyFur=mat('#918367',1,{map:fabricMap});
  const warmBulb=mat('#edca8c',.55,{emissive:'#ffd18b',emissiveIntensity:2.1}),coldGlow=mat('#a6c0ce',.72,{emissive:'#6c8a9e',emissiveIntensity:.2});
  const batches=new Map(),dummy=new THREE.Object3D();
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,14),sphere:new THREE.SphereGeometry(1,12,8),plane:new THREE.PlaneGeometry(1,1),torus:new THREE.TorusGeometry(1,.13,6,18)};
  function instance(type,material,position,scale,quaternion=null,shadow=false){
    const key=`${type}/${material.uuid}/${shadow}`;if(!batches.has(key))batches.set(key,{type,material,shadow,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();if(quaternion)dummy.quaternion.copy(quaternion);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
  }
  const box=(w,h,d,x,y,z,m=wood,shadow=false)=>instance('box',m,[x,y,z],[w,h,d],null,shadow);
  const sphere=(rx,ry,rz,x,y,z,m)=>instance('sphere',m,[x,y,z],[rx,ry,rz]);
  const cylinder=(r,h,x,y,z,m=metal,q=null)=>instance('cylinder',m,[x,y,z],[r,h,r],q);
  function rod(a,b,r=.024,m=metal){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));instance('cylinder',m,a.map((v,i)=>(v+b[i])/2),[r,d.length(),r],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));}
  const qFloor=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  function plane(w,h,x,y,z,m,q=null){instance('plane',m,[x,y,z],[w,h,1],q);}
  function mesh(geometry,material,parent=group,shadow=false){const m=new THREE.Mesh(geometry,material);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
  const props=[];
  function prop(id,min,max,room){props.push({id,room,bounds:{min,max}});}
  // The cut-away shell. Doorway passages occupy the front strip beside each
  // partition; there is no invisible collision or solid wall in the boy's lane.
  box(26.15,.24,5.25,12.9,-.14,.15,section);
  box(26.15,.18,5.25,12.9,4.15,.15,section);
  box(25.8,.05,4.9,12.9,4.035,.15,ceiling);
  box(.25,4.2,2.84,-.12,2.0,-.97,section);box(.25,1.42,2.15,-.12,3.37,1.525,section);
  // The bedroom's escape window is a real hole through the right side wall.
  box(.27,1.0,5.15,25.95,.50,.15,section);
  box(.27,1.10,5.15,25.95,3.65,.15,section);
  box(.27,2.10,3.075,25.95,2.05,-.8875,section);
  box(.27,2.10,.425,25.95,2.05,2.5125,section);
  function backWall(start,end,m,opening=null){
    if(opening){const l=opening.x-opening.w/2,r=opening.x+opening.w/2;
      box(l-start,4,.20,(start+l)/2,2,-2.36,m);box(end-r,4,.20,(r+end)/2,2,-2.36,m);
      box(opening.w,opening.bottom,.20,opening.x,opening.bottom/2,-2.36,m);box(opening.w,4-opening.top,.20,opening.x,(4+opening.top)/2,-2.36,m);
    }else box(end-start,4,.20,(start+end)/2,2,-2.36,m);
    box(end-start,.14,.095,(start+end)/2,.075,-2.20,darkWood);box(end-start,.08,.08,(start+end)/2,3.92,-2.20,ceiling);
  }
  backWall(0,9.5,plaster);backWall(9.5,17.3,darkerPlaster,{x:14.1,w:2.45,bottom:1.05,top:3.48});backWall(17.3,25.8,darkerPlaster);
  for(const x of [9.5,17.3]){
    box(.24,4,2.65,x,2,-.98,plaster,true);box(.24,1.20,2.3,x,3.4,1.50,plaster,true);
    box(.30,4.15,.17,x,2.05,2.55,section);box(.32,.14,2.35,x,2.72,1.50,darkWood);
    box(.31,2.74,.08,x,1.37,.41,darkWood);box(.31,2.74,.08,x,1.37,2.47,darkWood);
  }
  // Worn parquet has real broken seams, then a single textured top layer.
  const floorCanvas=canvas(),fc=floorCanvas.getContext('2d');fc.fillStyle='#746249';fc.fillRect(0,0,512,512);
  for(let row=0;row<8;row++)for(let col=0;col<4;col++){
    const x=col*128+(row%2?-64:0),y=row*64,shade=random(row*31+col+59);
    fc.fillStyle=`rgb(${92+shade*30},${74+shade*28},${51+shade*24})`;fc.fillRect(x+1,y+1,126,62);
    fc.strokeStyle='rgba(25,27,22,.49)';fc.lineWidth=1;fc.strokeRect(x,y,128,64);
    for(let i=0;i<7;i++){fc.strokeStyle=`rgba(180,158,116,${.04+random(i+row)*.07})`;fc.beginPath();fc.moveTo(x+random(i+col)*110,y+5+i*8);fc.lineTo(x+18+random(i+col+71)*106,y+5+i*8);fc.stroke();}
  }
  for(let i=0;i<200;i++){fc.fillStyle='rgba(19,26,23,.08)';fc.fillRect(random(i+71)*512,random(i+91)*512,4+random(i+531)*50,.5);}
  const floorMap=texture(floorCanvas,[6.45,1.25]),floorMat=mat('#a99c80',.78,{map:floorMap,bumpMap:floorMap,bumpScale:.007});
  plane(25.8,4.9,12.9,.001,.15,floorMat,qFloor);
  // Open, paneled entrance door in the left side wall.
  const entryPivot=new THREE.Group();entryPivot.position.set(.045,0,.67);group.add(entryPivot);
  const entranceMaterial=mat('#72553b',.94,{map:woodMap});
  const doorMesh=mesh(new THREE.BoxGeometry(.065,2.40,1.45),entranceMaterial,entryPivot,true);doorMesh.position.set(.025,1.20,.725);
  for(const z of [.38,1.06]){const p=mesh(new THREE.BoxGeometry(.023,.72,.56),darkWood,entryPivot);p.position.set(.067,z===.38?.68:1.63,z);}
  const handle=mesh(new THREE.BoxGeometry(.14,.035,.15),zinc,entryPivot);handle.position.set(.14,1.03,1.28);
  for(const z of [.61,2.18])box(.15,2.56,.10,.015,1.28,z,darkWood);box(.15,.11,1.72,.015,2.53,1.39,darkWood);box(.15,.04,1.72,.015,.02,1.39,metal);
  let doorProgress=0;
  const entryDoor={update(progress){doorProgress=clamp(Number.isFinite(progress)?progress:0);entryPivot.rotation.y=-doorProgress*1.43;},reset(){this.update(0);},get progress(){return doorProgress;},get angle(){return entryPivot.rotation.y;}};
  entryDoor.reset();
  // Coats and a small shoe rack tell the story before the kitchen is reached.
  box(1.48,.14,.13,1.20,2.28,-2.07,darkWood);for(const x of [.72,1.20,1.68])rod([x,2.29,-2.01],[x,2.23,-1.82],.028,metal);
  for(const [x,h,color]of[[.82,1.08,cloth],[1.36,1.19,blanketBase]]){
    box(.44,h,.16,x,1.58,-1.85,color);sphere(.31,.16,.10,x,2.08,-1.84,color);rod([x-.20,2.02,-1.84],[x-.29,1.43,-1.82],.09,color);rod([x+.20,2.02,-1.84],[x+.29,1.41,-1.82],.09,color);
  }
  box(1.58,.07,.58,1.20,.62,-1.72,darkWood);box(1.58,.05,.58,1.20,.23,-1.72,darkWood);
  for(const x of [.48,1.92])for(const z of [-1.95,-1.51])box(.065,.68,.065,x,.34,z,darkWood);
  for(let i=0;i<5;i++)sphere(.15,.07,.26,.69+i*.24,.31,-1.63,i%2?black:darkWood);
  prop('entry-shoe-rack',[.39,0,-2.02],[2.01,.69,-1.43],'kitchen');
  // A faded family photograph keeps the mother's presence in the apartment.
  // This is deliberately a framed picture; the exterior windows use geometry.
  const portraitCanvas=canvas(768,448),pc=portraitCanvas.getContext('2d');
  const photoBackdrop=pc.createLinearGradient(0,0,768,448);photoBackdrop.addColorStop(0,'#9b987a');photoBackdrop.addColorStop(.45,'#6c796c');photoBackdrop.addColorStop(1,'#a89778');pc.fillStyle=photoBackdrop;pc.fillRect(0,0,768,448);
  for(let i=0;i<38;i++){const x=random(i+901)*768,y=random(i+1113)*448,r=20+random(i+171)*75,g=pc.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(204,194,148,.09)');g.addColorStop(1,'rgba(80,101,80,0)');pc.fillStyle=g;pc.fillRect(x-r,y-r,r*2,r*2);}
  function photoEllipse(x,y,rx,ry,fill){pc.fillStyle=fill;pc.beginPath();pc.ellipse(x,y,rx,ry,0,0,Math.PI*2);pc.fill();}
  function photoPerson(x,y,scale,kind){
    pc.save();pc.translate(x,y);pc.scale(scale,scale);
    const mother=kind==='mother',child=kind==='child',skin=mother?'#c49c79':child?'#c9a27e':'#b28e70';
    const shirt=pc.createLinearGradient(-90,70,90,210);shirt.addColorStop(0,mother?'#776454':child?'#2d3836':'#55483d');shirt.addColorStop(.5,mother?'#927464':child?'#26312f':'#76614d');shirt.addColorStop(1,mother?'#584f46':child?'#1f2b29':'#443a33');
    pc.fillStyle=shirt;pc.beginPath();pc.moveTo(-96,202);pc.bezierCurveTo(-102,112,-70,80,-27,72);pc.lineTo(27,72);pc.bezierCurveTo(70,80,102,112,96,202);pc.closePath();pc.fill();
    if(!mother&&!child){
      pc.strokeStyle='rgba(170,151,121,.33)';pc.lineWidth=2;
      for(let i=-4;i<=4;i++){pc.beginPath();pc.moveTo(i*18-9,137);pc.lineTo(i*18,127);pc.lineTo(i*18+9,137);pc.lineTo(i*18,147);pc.closePath();pc.stroke();}
      pc.fillStyle='#a49c85';pc.beginPath();pc.moveTo(-22,77);pc.lineTo(22,77);pc.lineTo(14,202);pc.lineTo(-14,202);pc.closePath();pc.fill();
      for(let i=0;i<4;i++)photoEllipse(22,111+i*23,2.7,2.7,'#3c332a');
    }
    if(mother){photoEllipse(0,8,67,85,'#4e4034');photoEllipse(-50,66,24,65,'#4e4034');photoEllipse(50,66,24,65,'#4e4034');}
    photoEllipse(0,69,24,31,skin);photoEllipse(-52,10,10,19,skin);photoEllipse(52,10,10,19,skin);
    const face=pc.createLinearGradient(-49,-30,54,45);face.addColorStop(0,'#a48163');face.addColorStop(.42,skin);face.addColorStop(.72,mother?'#d1b08a':'#c8a681');face.addColorStop(1,'#a18266');photoEllipse(0,3,53,66,face);
    if(mother){pc.fillStyle='#4b3c30';pc.beginPath();pc.moveTo(-55,10);pc.bezierCurveTo(-66,-60,0,-88,48,-45);pc.bezierCurveTo(56,-29,58,-14,51,2);pc.bezierCurveTo(25,-31,3,-43,-20,-34);pc.bezierCurveTo(-28,-10,-43,-8,-55,10);pc.fill();}
    else{pc.fillStyle=child?'#302d28':'#514638';pc.beginPath();pc.moveTo(-53,-2);pc.bezierCurveTo(-71,-51,-34,-79,9,-66);pc.bezierCurveTo(61,-78,65,-25,51,-1);pc.lineTo(44,-26);pc.bezierCurveTo(10,-16,-8,-35,-36,-18);pc.closePath();pc.fill();}
    for(const side of[-1,1]){photoEllipse(side*22,5,12,5,'#c9b396');photoEllipse(side*22,5,4,5,'#3c382d');photoEllipse(side*21,3,1.4,1.5,'#e8ddbc');pc.strokeStyle=mother?'#65513c':'#514537';pc.lineWidth=4;pc.beginPath();pc.moveTo(side*12,-8);pc.quadraticCurveTo(side*24,-13,side*35,-6);pc.stroke();}
    pc.strokeStyle='#9c795b';pc.lineWidth=3;pc.beginPath();pc.moveTo(3,8);pc.bezierCurveTo(1,19,10,24,0,26);pc.stroke();
    pc.strokeStyle=mother?'#956b59':'#896c55';pc.lineWidth=3;pc.beginPath();pc.moveTo(-14,38);pc.quadraticCurveTo(0,45,15,37);pc.stroke();
    pc.strokeStyle='rgba(231,200,155,.27)';pc.lineWidth=2;pc.beginPath();pc.moveTo(-12,47);pc.quadraticCurveTo(0,51,12,46);pc.stroke();
    if(!mother&&!child){pc.fillStyle='rgba(76,67,53,.20)';pc.beginPath();pc.ellipse(0,41,39,24,0,0,Math.PI);pc.fill();for(let i=0;i<45;i++){pc.fillStyle='rgba(61,59,45,.20)';pc.fillRect((random(i+13)-.5)*65,31+random(i+71)*26,1,2);}}
    if(child){pc.strokeStyle='#aeb5a2';pc.lineWidth=5;for(const side of[-1,1]){pc.beginPath();pc.moveTo(side*54,92);pc.lineTo(side*78,166);pc.stroke();pc.beginPath();pc.moveTo(side*62,92);pc.lineTo(side*86,166);pc.stroke();}pc.fillStyle='#8a9b4a';pc.fillRect(-91,111,13,69);}
    else{pc.strokeStyle=mother?'#b39978':'#88917c';pc.lineWidth=3;pc.beginPath();pc.moveTo(-26,80);pc.lineTo(0,103);pc.lineTo(27,79);pc.stroke();}
    pc.restore();
  }
  photoPerson(248,161,1.13,'father');photoPerson(517,154,1.13,'mother');
  photoPerson(385,287,.90,'child');
  photoEllipse(310,336,22,12,'#bb9978');photoEllipse(461,336,22,12,'#c49c79');
  const photoVignette=pc.createRadialGradient(384,220,85,384,220,450);photoVignette.addColorStop(0,'rgba(31,33,25,0)');photoVignette.addColorStop(1,'rgba(42,38,28,.49)');pc.fillStyle=photoVignette;pc.fillRect(0,0,768,448);
  const photoPixels=pc.getImageData(0,0,768,448);for(let i=0;i<photoPixels.data.length;i+=4){const n=(random(i*.13)-.5)*18;photoPixels.data[i]+=n;photoPixels.data[i+1]+=n;photoPixels.data[i+2]+=n;}pc.putImageData(photoPixels,0,0);
  const portraitMaterial=new THREE.MeshBasicMaterial({map:texture(portraitCanvas),color:'#b3a98f',toneMapped:true});
  box(2.12,1.28,.105,1.10,3.15,-2.16,darkWood);box(2.00,1.16,.018,1.10,3.15,-2.097,cabinetEdge);plane(1.91,1.09,1.10,3.15,-2.082,portraitMaterial);
  for(const dx of[-1.015,1.015])box(.035,1.21,.03,1.10+dx,3.15,-2.071,wood);
  for(const dy of[-.59,.59])box(2.06,.035,.03,1.10,3.15+dy,-2.071,wood);
  // Kitchen wall tiles, cabinets, sink, oven and accumulated daily clutter.
  const tileCanvas=canvas(256),tc=tileCanvas.getContext('2d');tc.fillStyle='#c1bca3';tc.fillRect(0,0,256,256);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const x=col*64,y=row*64,shade=random(row*13+col+109);tc.fillStyle=`rgb(${154+shade*35},${151+shade*29},${129+shade*24})`;tc.fillRect(x+2,y+2,60,60);tc.strokeStyle='rgba(69,66,47,.60)';tc.strokeRect(x+.5,y+.5,63,63);
    if(shade>.6){tc.fillStyle='rgba(79,66,32,.14)';tc.fillRect(x+5,y+48,52,11);}
  }
  const tile=mat('#b8b294',.72,{map:texture(tileCanvas,[3,1]),bumpMap:texture(tileCanvas,[3,1],false),bumpScale:.008});
  box(6.5,1.00,.035,5.80,1.62,-2.225,tile);
  box(1.20,2.57,.88,2.75,1.285,-1.73,enamel,true);box(1.12,.80,.035,2.75,2.10,-1.265,cabinetPaint);
  box(1.12,1.56,.035,2.75,.89,-1.26,enamel);box(1.16,.045,.06,2.75,1.65,-1.245,metal);
  box(.065,.42,.09,3.18,1.18,-1.20,zinc);box(.065,.27,.09,3.18,2.11,-1.20,zinc);
  for(const [x,y,a]of[[2.48,1.9,-.12],[2.82,2.20,.07],[2.55,.89,.09]]){
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a);instance('plane',paper,[x,y,-1.239],[.23,.19,1],q);
  }
  for(const x of [2.26,3.24])box(.09,.10,.15,x,.05,-1.74,metal);
  prop('refrigerator',[2.15,0,-2.17],[3.35,2.58,-1.20],'kitchen');
  for(let i=0;i<4;i++){
    const x=4.10+i*1.08;
    box(1.04,1.04,.78,x,.54,-1.78,cabinetPaint,true);box(.98,.94,.035,x,.55,-1.367,cabinetPaint);
    for(const dx of [-.46,.46])box(.024,.91,.018,x+dx,.55,-1.342,cabinetEdge);
    box(.18,.027,.06,x+.28,.90,-1.32,metal);
    box(1.04,1.12,.48,x,2.85,-1.96,cabinetPaint,true);box(.99,1.05,.035,x,2.85,-1.696,cabinetPaint);
    box(.025,.99,.022,x-.46,2.85,-1.67,cabinetEdge);box(.026,.16,.05,x+.32,2.48,-1.65,metal);
  }
  box(4.45,.11,.96,5.70,1.105,-1.72,counter,true);box(4.45,.10,.12,5.70,1.20,-2.13,counter);
  // The steel sink is recessed, with curved faucet and stacked dishes.
  box(1.03,.035,.65,4.30,1.171,-1.65,zinc);box(.79,.040,.47,4.30,1.195,-1.62,black);box(.69,.025,.38,4.30,1.204,-1.62,metal);
  const faucetCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(4.54,1.19,-2.00),new THREE.Vector3(4.54,1.52,-2.00),new THREE.Vector3(4.34,1.57,-1.93),new THREE.Vector3(4.31,1.45,-1.84)]);
  mesh(new THREE.TubeGeometry(faucetCurve,12,.022,7,false),zinc);
  for(let i=0;i<4;i++)cylinder(.18,.026,4.95,1.21+i*.026,-1.57,ceramic);
  for(let i=0;i<3;i++){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2-.20,0,.12*i));instance('cylinder',ceramic,[5.13+i*.07,1.38,-1.93],[.18,.025,.18],q);}
  box(.34,.045,.25,5.50,1.19,-1.59,paper);box(.22,.10,.16,5.50,1.24,-1.59,dishGrime);
  box(1.12,1.05,.95,8.08,.55,-1.75,enamel,true);box(.94,.60,.04,8.08,.47,-1.245,metal);box(.78,.42,.025,8.08,.45,-1.21,black);box(.62,.29,.018,8.08,.45,-1.19,counter);
  box(.72,.055,.10,8.08,.85,-1.19,zinc);box(1.12,.06,.98,8.08,1.11,-1.75,enamel);
  for(const x of [7.80,8.35])for(const z of [-2.0,-1.51]){cylinder(.15,.015,x,1.154,z,black);cylinder(.11,.019,x,1.166,z,metal);}
  for(const x of [7.73,8.08,8.43])cylinder(.047,.07,x,1.00,-1.225,metal,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));
  cylinder(.23,.25,8.33,1.30,-1.92,metal);cylinder(.25,.025,8.33,1.43,-1.92,zinc);sphere(.04,.03,.04,8.33,1.46,-1.92,black);
  for(const dx of [-.27,.27])rod([8.33+dx,1.30,-1.92],[8.33+dx*1.22,1.36,-1.92],.028,black);
  cylinder(.18,.08,7.76,1.20,-1.54,metal);rod([7.76,1.22,-1.54],[7.35,1.22,-1.45],.028,black);
  prop('kitchen-units',[3.56,0,-2.24],[8.66,3.44,-1.16],'kitchen');
  function bottle(x,y,z,m=bottleGreen,h=.37){cylinder(.070,h*.68,x,y+h*.34,z,m);sphere(.068,.07,.068,x,y+h*.67,z,m);cylinder(.028,h*.32,x,y+h*.82,z,m);cylinder(.032,.022,x,y+h,z,metal);box(.12,h*.25,.007,x,y+h*.36,z+.068,paper);}
  for(let i=0;i<8;i++){
    const x=3.80+i*.59;const h=.19+random(i+172)*.13;
    cylinder(.075,h,x,2.23+h*.5,-1.99,i%2?ceramic:bottleBrown);cylinder(.080,.022,x,2.23+h,-1.99,metal);
  }
  box(4.90,.06,.44,5.70,2.20,-2.01,darkWood);
  for(let i=0;i<5;i++)cylinder(.17,.12,4.22+i*.67,3.49,-1.97,i%2?metal:darkWood);
  // The table sits slightly forward of the father's chair so his coat clears
  // its rear edge when he stands. The actor retains its own fixed anchor.
  box(2.4,.10,1.20,6,1.07,0,darkWood,true);
  for(const x of [4.99,7.01])for(const z of [-.47,.47])box(.10,1.06,.10,x,.53,z,darkWood,true);
  box(2.13,.075,.085,6,.77,.48,darkWood);box(2.13,.075,.085,6,.77,-.48,darkWood);
  const tableClothCanvas=canvas(256),cc=tableClothCanvas.getContext('2d');cc.fillStyle='#b4ad8b';cc.fillRect(0,0,256,256);
  for(let i=0;i<16;i++){cc.fillStyle=i%4===0?'rgba(107,78,46,.22)':'rgba(117,103,71,.11)';cc.fillRect(i*16,0,2,256);cc.fillRect(0,i*16,256,2);}
  for(let i=0;i<20;i++){const x=random(i+319)*256,y=random(i+753)*256,r=5+random(i+119)*17,g=cc.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(106,66,26,.22)');g.addColorStop(1,'rgba(106,66,26,0)');cc.fillStyle=g;cc.fillRect(x-r,y-r,r*2,r*2);}
  const tableCloth=mat('#b6aa8e',1,{map:texture(tableClothCanvas)});
  plane(2.43,1.21,6,1.125,0,tableCloth,qFloor);plane(2.43,.23,6,1.01,.612,tableCloth);plane(.32,.23,4.78,1.01,0,tableCloth,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2));
  bottle(5.23,1.14,-.08,bottleGreen,.45);bottle(5.48,1.14,-.33,bottleBrown,.36);cylinder(.21,.024,6.60,1.15,.26,ceramic);cylinder(.13,.008,6.60,1.166,.26,dishGrime);
  box(.25,.014,.15,5.43,1.15,.35,paper);cylinder(.10,.035,6.98,1.15,.17,metal);
  for(let i=0;i<9;i++)box(.017,.008,.012,5.7+random(i+973)*.65,1.147,.36+random(i+1123)*.19,dishGrime);
  // A vacant chair at the side, with mismatched worn rails.
  box(.58,.09,.61,4.39,.60,-.14,darkWood,true);
  for(const x of [4.14,4.64])for(const z of [-.39,.11])box(.055,.63,.055,x,.29,z,darkWood);
  for(const z of [-.39,.11])box(.055,.88,.055,4.14,1.00,z,darkWood);
  for(const y of [.94,1.14,1.35])box(.058,.10,.56,4.14,y,-.14,wood);
  prop('dining-table',[4.77,0,-.61],[7.23,1.15,.63],'kitchen');prop('vacant-chair',[4.10,0,-.45],[4.72,1.44,.18],'kitchen');
  // Lamps cast local pools of amber light rather than a global orange wash.
  const lightList=[],lightBases=[];
  function point(color,intensity,distance,x,y,z){const light=new THREE.PointLight(color,intensity,distance,2);light.position.set(x,y,z);group.add(light);lightList.push(light);lightBases.push(intensity);return light;}
  rod([5.95,4.00,-.25],[5.95,3.20,-.25],.012,black);
  const shade=mesh(new THREE.CylinderGeometry(.12,.40,.25,20,1,true),cabinetEdge);shade.position.set(5.95,3.08,-.25);sphere(.09,.10,.09,5.95,2.99,-.25,warmBulb);point('#ffd49a',27,9.0,5.95,2.84,-.20);
  // Actual apartment blocks occupy several depths outside the window. A
  // fragment portal masks their geometry to the opening, including at oblique
  // camera angles. The view therefore has parallax, recesses and balconies.
  const portals={living:{axis:'z',value:-2.36,minA:12.875,maxA:15.325,minY:1.05,maxY:3.48},
    bedroom:{axis:'x',value:25.82,minA:.65,maxA:2.30,minY:1.0,maxY:3.10}};
  const cityMaterialCache=new Map();let exteriorBuildings=0,exteriorWindows=0;
  function portalMaterial(color,portal,emissive=false){
    const key=`${portal.axis}/${color}/${emissive}`;if(cityMaterialCache.has(key))return cityMaterialCache.get(key);
    const m=mat(color,.94,{emissive:color,emissiveIntensity:emissive?.70:.13});
    m.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vApartmentCityWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 cityPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
        cityPosition=instanceMatrix*cityPosition;
        #endif
        vApartmentCityWorld=(modelMatrix*cityPosition).xyz;`);
      shader.fragmentShader='varying vec3 vApartmentCityWorld;\n'+shader.fragmentShader;
      const component=portal.axis==='z'?'z':'x',acomp=portal.axis==='z'?'x':'z';
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        vec3 cityRay=vApartmentCityWorld-cameraPosition;
        float cityT=(${portal.value.toFixed(4)}-cameraPosition.${component})/cityRay.${component};
        vec3 aperture=cameraPosition+cityRay*cityT;
        if(cityT<0.||cityT>1.||aperture.${acomp}<${portal.minA.toFixed(4)}||aperture.${acomp}>${portal.maxA.toFixed(4)}||aperture.y<${portal.minY.toFixed(4)}||aperture.y>${portal.maxY.toFixed(4)})discard;`);
    };
    m.customProgramCacheKey=()=>`apartment-city-portal-${key}`;cityMaterialCache.set(key,m);return m;
  }
  function exteriorBlock(x,y,z,w,h,d,portal,side=false,seed=1){
    exteriorBuildings++;
    const wall=portalMaterial(['#4b6571','#536c74','#60747b'][seed%3],portal),edge=portalMaterial('#7b8c8c',portal),dark=portalMaterial('#192e38',portal),window=portalMaterial('#344f61',portal),lit=portalMaterial('#a99a71',portal,true),rail=portalMaterial('#30464d',portal);
    box(w,h,d,x,y,z,wall);box(w+.22,.16,d+.16,x,y+h/2+.06,z,edge);
    const rows=Math.floor((h-.7)/1.75),columns=Math.floor((side?d:w)/1.35);
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const yy=y+h/2-1.10-row*1.75,litRoom=random(seed*41+row*113+col*71)>.89;exteriorWindows++;
      if(!side){
        const xx=x-w/2+.72+col*1.35,front=z+d/2;
        box(.72,1.03,.11,xx,yy,front+.03,dark);box(.58,.91,.03,xx,yy,front+.097,litRoom?lit:window);
        for(const dx of [-.335,.335])box(.025,1.05,.10,xx+dx,yy,front+.13,edge);
        box(.79,.05,.25,xx,yy-.55,front+.16,edge);box(.025,.96,.09,xx,yy,front+.13,rail);
        if((row+col+seed)%9===0){box(.94,.09,.62,xx,yy-.58,front+.34,wall);box(.91,.37,.04,xx,yy-.34,front+.63,rail);}
      }else{
        const zz=z-d/2+.72+col*1.35,front=x-w/2;
        box(.11,1.03,.72,front-.03,yy,zz,dark);box(.03,.91,.58,front-.097,yy,zz,litRoom?lit:window);
        for(const dz of [-.335,.335])box(.10,1.05,.025,front-.13,yy,zz+dz,edge);
        box(.25,.05,.79,front-.16,yy-.55,zz,edge);box(.09,.96,.025,front-.13,yy,zz,rail);
      }
    }
    for(let i=0;i<3;i++){
      const xx=x-w*.35+i*w*.31;
      box(.045,1.4,.045,xx,y+h/2+.70,z,rail);box(.48,.025,.025,xx,y+h/2+1.10,z,rail);
    }
  }
  exteriorBlock(12.8,.15,-9.5,8.1,13.7,3.8,portals.living,false,3);
  exteriorBlock(19.8,1.05,-16.0,7.5,17.0,5.0,portals.living,false,8);
  exteriorBlock(7.8,-.8,-20.0,8.2,14.9,4.0,portals.living,false,11);
  exteriorBlock(35.9,-.9,-24.0,3.5,15.0,8.5,portals.bedroom,true,6);
  exteriorBlock(44.0,1.5,-46.0,5.5,18.2,11.7,portals.bedroom,true,9);
  const glass=mat('#9db3bc',.15,{transparent:true,opacity:.085,metalness:.02,depthWrite:false,side:THREE.DoubleSide});
  function livingWindow(){
    const x=14.1,width=2.45,bottom=1.05,top=3.48;
    for(const dx of [-width/2,width/2])box(.083,top-bottom+.14,.18,x+dx,(top+bottom)/2,-2.18,cabinetPaint);
    for(const y of [bottom,top])box(width+.16,.075,.18,x,y,-2.18,cabinetPaint);
    box(.058,top-bottom,.16,x,(top+bottom)/2,-2.16,cabinetPaint);box(width,.047,.16,x,top-.77,-2.16,cabinetPaint);box(width+.40,.10,.37,x,bottom-.08,-2.12,cabinetPaint);
    const pane=mesh(new THREE.PlaneGeometry(width-.09,top-bottom-.08),glass);pane.position.set(x,(top+bottom)/2,-2.19);
    rod([x-width*.64,top+.15,-1.93],[x+width*.64,top+.15,-1.93],.019,metal);
    const cm=mat('#a2a696',1,{transparent:true,opacity:.62,side:THREE.DoubleSide});
    for(const side of [-1,1]){const geo=new THREE.PlaneGeometry(.40,top-bottom+.11,20,1),a=geo.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(a.getX(i)*66)*.044);geo.computeVertexNormals();const curtain=mesh(geo,cm);curtain.position.set(x+side*(width*.48-.10),(top+bottom)/2,-1.98);}
    for(let i=0;i<10;i++)box(.105,.54,.15,x-.66+i*.147,.53,-2.01,cabinetPaint);
    rod([x-.82,.73,-1.94],[x+.82,.73,-1.94],.024,metal);rod([x-.82,.28,-1.94],[x+.82,.28,-1.94],.024,metal);
    for(const dx of [-.82,.82])rod([x+dx,.27,-2.01],[x+dx,.87,-2.01],.026,metal);
  }
  livingWindow();
  // The bedroom window is beside the bed and opens outward over the escape
  // landing. Its handle, glazing and frame are geometry rather than a decal.
  for(const z of [.65,2.30])box(.20,2.25,.085,25.78,2.05,z,cabinetPaint);
  for(const y of [1.0,3.10])box(.20,.085,1.82,25.78,y,1.475,cabinetPaint);
  box(.50,.11,1.94,25.76,.96,1.475,wood);
  const windowPivot=new THREE.Group();windowPivot.position.set(25.82,1.04,.69);group.add(windowPivot);
  function dynamicBox(parent,w,h,d,x,y,z,m,shadow=true){const part=mesh(new THREE.BoxGeometry(w,h,d),m,parent,shadow);part.position.set(x,y,z);return part;}
  for(const z of [0,1.57])dynamicBox(windowPivot,.055,1.98,.055,0,.99,z,cabinetPaint);
  for(const y of [0,1.98])dynamicBox(windowPivot,.055,.055,1.61,0,y,.785,cabinetPaint);
  dynamicBox(windowPivot,.055,.045,1.57,0,1.18,.785,cabinetPaint);
  dynamicBox(windowPivot,.07,.16,.045,-.07,.93,1.45,zinc);
  const sidePane=mesh(new THREE.PlaneGeometry(1.51,1.90),glass,windowPivot);sidePane.rotation.y=Math.PI/2;sidePane.position.set(0,.99,.785);
  let windowProgress=0;
  const escapeWindow={update(p){windowProgress=clamp(Number.isFinite(p)?p:0);windowPivot.rotation.y=windowProgress*Math.PI*.52;},reset(){this.update(0);},get progress(){return windowProgress;},get angle(){return windowPivot.rotation.y;}};
  escapeWindow.reset();
  // A solid bedroom door closes across the actual front passage. Its open
  // leaf lies along the living-room side of the partition, clear of the lane.
  const bedroomPivot=new THREE.Group();bedroomPivot.position.set(17.13,0,.46);group.add(bedroomPivot);
  dynamicBox(bedroomPivot,.075,2.64,1.96,0,1.32,.98,darkWood);
  for(const y of [.67,1.77])dynamicBox(bedroomPivot,.022,.86,1.55,.051,y,.98,wood);
  for(const z of [.13,1.84])dynamicBox(bedroomPivot,.028,2.44,.035,.06,1.32,z,cabinetEdge);
  dynamicBox(bedroomPivot,.15,.035,.12,.11,1.06,1.72,zinc);
  let bedroomProgress=0;
  const bedroomDoor={update(p){bedroomProgress=clamp(Number.isFinite(p)?p:0);bedroomPivot.rotation.y=-(1-bedroomProgress)*Math.PI;},reset(){this.update(0);},get progress(){return bedroomProgress;},get angle(){return bedroomPivot.rotation.y;}};
  bedroomDoor.reset();
  // A wheeled bedside cabinet is the only movable piece of bedroom furniture.
  const nightstand=new THREE.Group();nightstand.name='bedroom-movable-nightstand';nightstand.position.set(21.2,0,1.4);group.add(nightstand);
  dynamicBox(nightstand,.72,.70,.60,0,.40,0,wood);dynamicBox(nightstand,.78,.07,.66,0,.765,0,darkWood);
  for(const y of [.29,.59]){dynamicBox(nightstand,.64,.23,.025,0,y,.313,cabinetPaint);dynamicBox(nightstand,.19,.025,.07,0,y,.35,zinc);}
  for(const x of [-.27,.27])for(const z of [-.21,.21])dynamicBox(nightstand,.065,.11,.065,x,.065,z,metal);
  const nightstandProp={id:'nightstand',room:'bedroom',movable:true,bounds:{min:[20.81,0,1.07],max:[21.59,.80,1.75]}};props.push(nightstandProp);
  const projectile=new THREE.Group();projectile.name='thrown-drink-glass';projectile.visible=false;group.add(projectile);
  const tumbler=mesh(new THREE.CylinderGeometry(.071,.059,.18,20,1,true),new THREE.MeshPhysicalMaterial({color:'#b6c2c0',roughness:.15,transparent:true,opacity:.46,depthWrite:false}),projectile);tumbler.position.y=.09;
  const rim=mesh(new THREE.TorusGeometry(.071,.005,5,20),zinc,projectile);rim.rotation.x=Math.PI/2;rim.position.y=.18;
  // Living room: sagging upholstered sofa, checked throw, books and old CRT.
  box(3.26,.31,1.12,11.74,.42,-1.14,darkWood,true);box(3.38,1.01,.30,11.74,1.12,-1.68,sofaFabric,true);
  for(const x of [10.10,13.38]){box(.33,.79,1.20,x,.73,-1.12,sofaFabric,true);sphere(.17,.16,.50,x,1.12,-1.09,sofaFabric);}
  for(let i=0;i<3;i++){box(.98,.21,.91,10.73+i*1.01,.70,-1.03,sofaFabric,true);box(.95,.53,.15,10.73+i*1.01,1.12,-1.47,sofaFabric);}
  for(const x of [10.31,13.18])for(const z of [-1.53,-.74])cylinder(.047,.20,x,.12,z,darkWood);
  const plaidCanvas=canvas(256),bc=plaidCanvas.getContext('2d');bc.fillStyle='#695d4d';bc.fillRect(0,0,256,256);
  for(let i=0;i<8;i++){bc.fillStyle=i%2?'rgba(92,65,48,.50)':'rgba(133,130,102,.38)';bc.fillRect(i*32,0,17,256);bc.fillRect(0,i*32,256,17);bc.fillStyle='rgba(191,172,126,.22)';bc.fillRect(i*32+21,0,2,256);bc.fillRect(0,i*32+21,256,2);}
  const plaid=mat('#b5a28a',1,{map:texture(plaidCanvas)});
  plane(1.30,.95,11.25,.82,-.94,plaid,qFloor);plane(1.30,.56,11.25,.54,-.448,plaid);
  for(let i=0;i<14;i++)rod([10.64+i*.094,.28,-.44],[10.64+i*.094,.22-random(i+293)*.05,-.435],.0035,cloth);
  prop('sofa',[9.93,0,-1.86],[13.56,1.64,-.40],'living');
  // Persian-inspired faded rugs have an original geometric woven motif.
  function rug(x,z,w,d,seed){
    const c=canvas(),cx=c.getContext('2d');cx.fillStyle='#58423a';cx.fillRect(0,0,512,512);
    for(let b=0;b<4;b++){cx.strokeStyle=['#8e7960','#393d36','#9b8968','#6b5e4a'][b];cx.lineWidth=b%2?6:13;cx.strokeRect(9+b*15,9+b*15,494-b*30,494-b*30);}
    for(let row=0;row<13;row++)for(let col=0;col<13;col++){const xx=66+col*31.5,yy=66+row*31.5,r=(row+col)%3===0?10:5;cx.beginPath();cx.moveTo(xx,yy-r);cx.lineTo(xx+r*.60,yy);cx.lineTo(xx,yy+r);cx.lineTo(xx-r*.60,yy);cx.closePath();cx.fillStyle=(row+col)%2?'#9a896b':'#465047';cx.globalAlpha=.48+random(row*13+col+seed)*.3;cx.fill();}cx.globalAlpha=1;
    const image=cx.getImageData(0,0,512,512);for(let i=0;i<image.data.length;i+=4){const n=(random(i*.13+seed)-.5)*28;for(let k=0;k<3;k++)image.data[i+k]=clamp(image.data[i+k]+n,0,255);}cx.putImageData(image,0,0);
    const rm=mat('#a59a85',1,{map:texture(c)});plane(w,d,x,.009,z,rm,qFloor);
    for(const side of [-1,1])for(let i=0;i<24;i++)rod([x-w/2+i*w/23,.012,z+side*d/2],[x-w/2+i*w/23,.011,z+side*(d/2+.06+random(i+seed)*.035)],.0038,cloth);
  }
  rug(1.7,1.28,2.65,1.67,51);rug(14.0,.70,5.55,3.25,119);rug(22.25,.45,5.1,3.20,391);
  // Low coffee table, cups, dog-eared papers, stacked books.
  box(1.72,.08,.72,14.18,.50,-.06,darkWood,true);for(const x of [13.46,14.90])for(const z of [-.32,.20])box(.065,.49,.065,x,.245,z,darkWood);
  box(1.51,.04,.53,14.18,.18,-.06,darkWood);box(.53,.021,.34,14.03,.56,-.03,paper);box(.44,.017,.30,14.20,.581,-.02,cloth);
  cylinder(.10,.16,13.67,.62,-.08,ceramic);cylinder(.075,.009,13.67,.707,-.08,dishGrime);instance('torus',ceramic,[13.55,.63,-.08],[.063,.067,.050],new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));
  for(let i=0;i<4;i++)box(.42,.035,.32,14.32,.22+i*.036,-.03,i%2?paper:blanketBase);
  prop('coffee-table',[13.30,0,-.42],[15.06,.73,.32],'living');
  box(.86,.64,.65,16.55,.33,-1.50,darkWood,true);box(.79,.045,.61,16.55,.68,-1.50,wood);
  for(const x of [16.24,16.86])box(.04,.13,.05,x,.065,-1.48,metal);
  box(1.08,.93,.73,16.55,1.17,-1.52,black,true);box(.77,.68,.045,16.43,1.20,-1.13,metal);
  const tvCanvas=canvas(128),tvc=tvCanvas.getContext('2d'),tvMap=texture(tvCanvas);const tvScreen=new THREE.MeshBasicMaterial({map:tvMap,color:'#768f97',toneMapped:true});plane(.66,.54,16.43,1.20,-1.098,tvScreen);
  for(const y of [.93,1.15,1.37])cylinder(.034,.025,16.98,y,-1.115,zinc,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));
  for(let i=0;i<6;i++)box(.12,.014,.025,16.98,.80+i*.035,-1.11,metal);
  for(const side of [-1,1])rod([16.57,1.65,-1.54],[16.57+side*.43,2.14,-1.62],.012,zinc);
  prop('television',[15.99,0,-1.89],[17.11,2.17,-1.08],'living');
  // A narrow bookcase and small floor lamp behind the sofa's right side.
  box(.78,2.38,.42,10.10,1.20,-1.91,darkWood);for(const y of [.12,.63,1.17,1.71,2.24])box(.81,.045,.46,10.10,y,-1.90,wood);
  for(let row=0;row<4;row++)for(let i=0;i<6;i++){const h=.22+random(row*11+i+571)*.17;box(.055+random(i+331)*.028,h,.24,9.83+i*.10,.66+row*.53+h*.5,-1.76,[cloth,paper,blanketBase,wood][(row+i)%4]);}
  cylinder(.16,.03,13.14,.10,-1.66,metal);rod([13.14,.10,-1.66],[13.14,1.83,-1.66],.018,metal);
  const floorShade=mesh(new THREE.CylinderGeometry(.20,.34,.45,18,1,true),mat('#ac9670',.96,{side:THREE.DoubleSide}));floorShade.position.set(13.14,1.88,-1.66);sphere(.055,.08,.055,13.14,1.78,-1.66,warmBulb);point('#efbd80',6.5,4.4,13.14,1.73,-1.54);
  // A few framed family pictures, no signage or text.
  function picture(x,y,w,h,seed){box(w+.10,h+.10,.075,x,y,-2.15,darkWood);box(w,h,.016,x,y,-2.102,paper);plane(w*.84,h*.78,x,y,-2.088,mat(seed%2?'#627365':'#82785b',1));for(let i=0;i<3;i++){sphere(.025,.034,.011,x+(i-1)*w*.18,y+h*.09,-2.068,cloth);box(.044,.10,.012,x+(i-1)*w*.18,y-h*.07,-2.06,darkWood);}}
  picture(11.3,2.92,.54,.39,31);picture(16.0,2.85,.43,.59,51);
  // The child's desk remains on a solid back wall, away from the escape window.
  box(1.62,.075,.72,19.24,1.02,-1.65,wood,true);for(const x of [18.54,19.94])for(const z of [-1.95,-1.36])box(.065,1.03,.065,x,.51,z,darkWood);
  box(.57,.075,.56,19.18,.55,-.98,darkWood);for(const x of [18.94,19.42])for(const z of [-1.21,-.76])box(.045,.55,.045,x,.275,z,darkWood);for(const x of [18.94,19.42])box(.045,.62,.045,x,.91,-1.23,darkWood);box(.54,.10,.05,19.18,1.20,-1.23,darkWood);
  box(.45,.014,.30,19.30,1.074,-1.55,paper);box(.032,.014,.29,19.19,1.086,-1.55,wood);for(let i=0;i<5;i++)box(.40,.031,.27,18.67,1.08+i*.032,-1.68,i%2?paper:cloth);
  cylinder(.14,.028,19.82,1.085,-1.86,metal);rod([19.82,1.10,-1.86],[19.74,1.57,-1.82],.015,metal);rod([19.74,1.57,-1.82],[19.54,1.67,-1.76],.018,metal);
  const deskShade=mesh(new THREE.CylinderGeometry(.06,.17,.18,16,1,true),metal);deskShade.position.set(19.54,1.62,-1.76);deskShade.rotation.z=.25;sphere(.04,.04,.04,19.54,1.54,-1.76,warmBulb);point('#efcb8b',3.4,3.2,19.54,1.48,-1.62);
  prop('bedroom-desk',[18.39,0,-2.04],[20.10,1.74,-.71],'bedroom');
  // Bed runs along the back wall, leaving its entire front edge behind z=.65.
  box(3.37,.15,1.48,23.43,.42,-.76,metal,true);box(3.30,.28,1.40,23.43,.63,-.76,bedSheet,true);
  for(const x of [21.77,25.09]){
    for(const z of [-1.45,-.07])rod([x,.06,z],[x,1.36,z],.033,metal);
    rod([x,1.36,-1.45],[x,1.36,-.07],.033,metal);rod([x,.98,-1.45],[x,.98,-.07],.021,metal);
    for(let i=0;i<5;i++)rod([x,.72,-1.30+i*.27],[x,1.33,-1.30+i*.27],.016,metal);
  }
  sphere(.40,.10,.55,24.57,.84,-.76,bedSheet);box(2.08,.09,1.43,22.92,.84,-.76,plaid);plane(2.08,.44,22.92,.62,-.035,plaid);
  for(let i=0;i<19;i++)rod([21.93+i*.11,.40,-.024],[21.93+i*.11,.34-random(i+777)*.04,-.022],.0035,cloth);
  // The bear is worn but recognizable, propped against the pillow.
  sphere(.17,.22,.14,24.66,1.07,-.95,teddyFur);sphere(.16,.15,.14,24.66,1.36,-.94,teddyFur);
  for(const side of [-1,1]){sphere(.065,.065,.045,24.66+side*.125,1.47,-.94,teddyFur);sphere(.065,.13,.07,24.66+side*.19,1.14,-.87,teddyFur);sphere(.085,.09,.10,24.66+side*.105,.87,-.78,teddyFur);sphere(.013,.013,.012,24.66+side*.058,1.39,-.812,black);}sphere(.06,.045,.026,24.66,1.32,-.806,cloth);sphere(.016,.014,.014,24.66,1.33,-.778,black);
  prop('child-bed',[21.72,0,-1.51],[25.15,1.56,.02],'bedroom');
  // Cold light from the courtyard keeps the bed and keepsakes legible beyond
  // the small desk lamp without turning the apartment into a bright room.
  point('#9cb7cc',5.2,6.8,22.3,2.72,.18);
  sphere(.20,.20,.20,23.50,.21,.53,ceramic);for(const [dx,dy,dz]of[[0,.14,.14],[.13,0,.14],[-.13,0,.14],[0,-.13,.14],[.12,.12,0]])sphere(.063,.060,.018,23.50+dx,.21+dy,.53+dz,black);
  prop('football',[23.29,0,.32],[23.71,.42,.74],'bedroom');
  // Children's drawings, taped at differing heights, and a quiet shelf.
  for(const [x,y,w,h,seed]of[[22.1,2.57,.42,.55,713],[22.62,2.79,.35,.45,997],[23.05,2.47,.40,.52,1213]]){
    box(w,h,.01,x,y,-2.233,paper);box(.09,.025,.015,x,y+h/2,-2.221,cloth);
    const draw=canvas(128,160),dc=draw.getContext('2d');dc.fillStyle='#c9c2a4';dc.fillRect(0,0,128,160);dc.lineWidth=3;dc.strokeStyle=seed%2?'#8d6249':'#647c76';dc.beginPath();dc.moveTo(25,94);dc.lineTo(66,49);dc.lineTo(102,95);dc.moveTo(33,85);dc.lineTo(33,137);dc.lineTo(96,137);dc.lineTo(96,85);dc.stroke();dc.strokeStyle='#a58b4a';dc.beginPath();dc.arc(102,23,11,0,6.28);dc.stroke();dc.strokeStyle='#687953';dc.beginPath();dc.moveTo(10,145);dc.lineTo(117,145);dc.stroke();plane(w*.91,h*.93,x,y,-2.223,new THREE.MeshBasicMaterial({map:texture(draw),color:'#b1ac95'}));
  }
  box(1.52,.055,.33,24.45,2.85,-2.04,darkWood);for(const x of [23.92,24.98])rod([x,2.59,-2.17],[x,2.84,-1.93],.018,metal);
  for(let i=0;i<7;i++)box(.055+random(i+51)*.035,.24+random(i+31)*.13,.20,23.90+i*.11,3.04,-2.03,i%2?paper:cloth);
  picture(24.88,3.08,.30,.37,87);
  // Small crumbled plaster and a trailing cable stay out of the playable lane.
  for(let i=0;i<35;i++){const x=.40+random(i+515)*24.9,z=-1.88+random(i+913)*2.50;box(.016+random(i+917)*.035,.009,.02+random(i+419)*.04,x,.008,z,i%3?paper:section);}
  const cable=new THREE.CatmullRomCurve3([new THREE.Vector3(16.7,.12,-1.8),new THREE.Vector3(16.0,.02,-1.54),new THREE.Vector3(15.7,.018,-1.20),new THREE.Vector3(15.8,.02,-1.0)]);mesh(new THREE.TubeGeometry(cable,20,.009,5,false),black);
  // A soft wall patch behind each warm lamp also reads in software rendering.
  const glowCanvas=canvas(128),gc=glowCanvas.getContext('2d'),glow=gc.createRadialGradient(64,64,0,64,64,64);glow.addColorStop(0,'rgba(255,200,115,.14)');glow.addColorStop(.4,'rgba(255,200,115,.05)');glow.addColorStop(1,'rgba(255,200,115,0)');gc.fillStyle=glow;gc.fillRect(0,0,128,128);const glowMat=new THREE.MeshBasicMaterial({map:texture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  plane(4.5,3.6,5.9,2.1,-2.234,glowMat);plane(2.4,2.7,13.1,1.7,-2.218,glowMat);
  // Float a few dust particles slowly through the kitchen light.
  const dustData=new Float32Array(54*3);for(let i=0;i<54;i++){dustData[i*3]=.5+random(i+323)*24.7;dustData[i*3+1]=.45+random(i+651)*2.9;dustData[i*3+2]=-.8+random(i+863)*1.6;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustData,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#c6bc9b',size:.011,transparent:true,opacity:.17,depthWrite:false}));group.add(dust);
  for(const batch of batches.values()){const m=new THREE.InstancedMesh(geometries[batch.type],batch.material,batch.matrices.length);batch.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.instanceMatrix.needsUpdate=true;m.castShadow=batch.shadow;m.receiveShadow=true;group.add(m);}
  const metadata={rooms:[{id:'kitchen',left:0,right:9.5},{id:'living',left:9.5,right:17.3},{id:'bedroom',left:17.3,right:25.8}],
    bounds:{min:[-.25,-.26,-2.50],max:[26.09,4.26,2.79]},lane:{z:1.4,minX:.42,maxX:25.25,minZ:1.10,maxZ:1.70,y:0},
    table:{position:[6,0,0],fatherAnchor:[6,0,-.2],x:6,z:0,topY:1.12,width:2.4,depth:1.2},entry:{x:1.4,y:0,z:1.4,wall:'left',doorX:.045},
    passages:[{x:9.5,minZ:.65,maxZ:2.47,height:2.72},{x:17.3,minZ:.65,maxZ:2.47,height:2.72}],
    windows:[{id:'living',wall:'back',normal:[0,0,1],x:14.1,y:2.265,z:-2.36,opening:{min:[12.875,1.05,-2.50],max:[15.325,3.48,-2.18]}},
      {id:'bedroom-escape',wall:'right',normal:[-1,0,0],x:25.82,y:2.05,z:1.475,sillY:1,opening:{min:[25.70,1,.65],max:[26.10,3.1,2.30]}}],
    externalCity:{type:'instanced-3d-buildings',buildings:exteriorBuildings,windows:exteriorWindows,portalClipped:true,imagePlanes:0},
    bedroomDoor:{x:17.3,z:.46,width:1.96,height:2.64,closedBounds:{min:[17.09,0,.46],max:[17.24,2.64,2.42]}},
    nightstand:{width:.72,height:.80,depth:.66,startX:21.2,targetX:18.36,z:1.4},
    familyPortrait:{x:1.10,y:3.15,z:-2.082,width:1.91,height:1.09,people:['father','mother','child']},props,lights:lightList.length,drawBatches:batches.size};
  group.userData.apartment=metadata;
  let lastTV=-1;
  return {group,metadata,entryDoor,bedroomDoor,window:escapeWindow,nightstand,update(time,playerX=0,state=null){
    if(!group.visible)return;
    if(state?.entryProgress!==undefined)entryDoor.update(state.entryProgress);
    if(state?.doorProgress!==undefined)bedroomDoor.update(state.doorProgress);
    if(state?.windowProgress!==undefined)escapeWindow.update(state.windowProgress);
    const cabinetX=Number.isFinite(state?.nightstandX)?state.nightstandX:21.2;
    nightstand.position.x=cabinetX;nightstand.position.z=Number.isFinite(state?.nightstandZ)?state.nightstandZ:1.4;
    const shoved=clamp(state?.shoveProgress??0);nightstand.rotation.z=-.08*shoved;nightstand.position.y=.033*shoved;
    nightstandProp.bounds.min[0]=cabinetX-.39;nightstandProp.bounds.max[0]=cabinetX+.39;
    nightstandProp.bounds.min[2]=nightstand.position.z-.33;nightstandProp.bounds.max[2]=nightstand.position.z+.35;
    const impact=Number.isFinite(state?.doorImpact)?state.doorImpact:0;
    bedroomPivot.position.x=17.13+Math.sin(time*65)*.018*impact;
    const throwProgress=Number.isFinite(state?.throwProgress)?state.throwProgress:state?.fatherPhase==='throw'?clamp((state.fatherPhaseTime??0)/.85):0;
    const glassAge=throwProgress*.85,flight=clamp((glassAge-.25)/.47);
    projectile.visible=!!state?.glassThrown&&!state?.glassRetrieved;
    if(projectile.visible){
      if(state?.fatherPhase==='throw'&&glassAge<.72){projectile.position.set(mix(16.65,17.12,flight),mix(1.72,1.42,flight)+Math.sin(flight*Math.PI)*.18,mix(1.65,1.4,flight));projectile.rotation.set(flight*2,0,-flight*3);}
      else{const age=Math.max(0,state?.fatherPhase==='throw'?glassAge-.72:state?.fatherPhase==='retrieve'?.13+(state.fatherPhaseTime??0):1);
       projectile.position.set(mix(17.12,17.0,clamp(age/.35)),Math.max(.012,1.42+.12*age-6.3*age*age),1.4);projectile.rotation.set(0,0,Math.sin(Math.min(age,.48)*24)*.30*Math.max(0,1-age/.48));}
    }
    for(let i=0;i<lightList.length;i++)lightList[i].intensity=lightBases[i]*(i===0?.990+.006*Math.sin(time*1.79)+.003*Math.sin(time*5.1):.995+.005*Math.sin(time*.8+i));
    const frame=Math.floor(time*7);if(frame!==lastTV){lastTV=frame;const image=tvc.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const at=(y*128+x)*4,v=36+random(x*13+y*109+frame*31)*109+(y%3?0:27);image.data[at]=v*.83;image.data[at+1]=v*.94;image.data[at+2]=v;image.data[at+3]=255;}tvc.putImageData(image,0,0);tvMap.needsUpdate=true;}
    dust.position.y=Math.sin(time*.12)*.025;
  }};
}
