// The courtyard behind the boy's building. Equipment lives behind the side-on
// walking lane: its faded colour and small movement remain scenery for now.
export function createPlaygroundWorld(THREE,scene){
  const group=new THREE.Group();group.name='home-playground';group.visible=false;scene.add(group);
  const rand=n=>{const v=Math.sin(n*129.71+31.37)*43758.5453;return v-Math.floor(v);};
  const mat=(color,roughness=.9,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  function texture(kind){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const c=canvas.getContext('2d');c.fillStyle=kind==='sand'?'#aaa38a':kind==='ground'?'#818a80':'#a6a99a';c.fillRect(0,0,256,256);
    const pixels=c.getImageData(0,0,256,256);
    for(let n=0;n<pixels.data.length;n+=4){const shade=(rand(n*.013)-.5)*(kind==='sand'?53:33);for(let k=0;k<3;k++)pixels.data[n+k]+=shade;}c.putImageData(pixels,0,0);
    for(let n=0;n<55;n++){
      const x=rand(n+53)*256,y=rand(n+155)*256,r=3+rand(n+419)*31;
      const stain=c.createRadialGradient(x,y,0,x,y,r);stain.addColorStop(0,'rgba(31,41,34,.14)');stain.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=stain;c.fillRect(x-r,y-r,2*r,2*r);
    }
    if(kind==='plaster'){
      c.strokeStyle='rgba(30,37,29,.24)';c.lineWidth=.8;
      for(let n=0;n<12;n++){const x=rand(n+625)*256,y=rand(n+748)*256;c.beginPath();c.moveTo(x,y);for(let j=1;j<5;j++)c.lineTo(x+j*3+rand(n*13+j)*7,y+j*7);c.stroke();}
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;return map;
  }
  const plasterMap=texture('plaster'),groundMap=texture('ground'),sandMap=texture('sand');
  const plasterBump=plasterMap.clone();plasterBump.colorSpace=THREE.NoColorSpace;
  const groundBump=groundMap.clone();groundBump.colorSpace=THREE.NoColorSpace;
  const plaster=mat('#78796a',.98,{map:plasterMap,bumpMap:plasterBump,bumpScale:.045});
  const distant=mat('#697975',.99,{map:plasterMap}),farWall=mat('#586d76',1,{map:plasterMap});
  const concrete=mat('#545f57',.93,{map:groundMap,bumpMap:groundBump,bumpScale:.018});
  const paving=mat('#737d70',.73,{map:groundMap,bumpMap:groundBump,bumpScale:.022,metalness:.04});
  const soil=mat('#525746',.97,{map:groundMap}),sand=mat('#958966',.97,{map:sandMap});
  const metal=mat('#3e4e47',.80,{metalness:.44}),trim=mat('#899081',.52,{metalness:.68});
  const rust=mat('#71533d',.97),dark=mat('#1b2827',.99),wood=mat('#776953',.98,{map:plasterMap});
  const red=mat('#925b49',.87,{metalness:.15}),teal=mat('#587e76',.84,{metalness:.20}),ochre=mat('#a08c54',.85,{metalness:.17});
  const blue=mat('#536f83',.84,{metalness:.18}),brick=mat('#765847',.99),mortar=mat('#5e6557',1);
  const grass=mat('#535c3f',1),leaves=mat('#766b43',1,{side:THREE.DoubleSide});
  const glass=mat('#324b52',.45,{metalness:.22}),curtain=mat('#8a896d',1);
  const warmWindow=mat('#b6a078',.73,{emissive:'#ba945d',emissiveIntensity:.58});
  const lampGlass=mat('#d9bd8c',.43,{emissive:'#ffd49a',emissiveIntensity:2.1});
  const wet=mat('#38545a',.15,{metalness:.44,transparent:true,opacity:.56,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const reflection=mat('#8b805a',.14,{metalness:.49,transparent:true,opacity:.4,depthWrite:false,emissive:'#514a2e',emissiveIntensity:.1});
  const alphaCanvas=document.createElement('canvas');alphaCanvas.width=alphaCanvas.height=128;const ac=alphaCanvas.getContext('2d');
  ac.fillStyle='#000';ac.fillRect(0,0,128,128);ac.filter='blur(4px)';ac.beginPath();
  for(let i=0;i<20;i++){const a=i/19*Math.PI*2,r=39+rand(i+943)*17,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r*.82;if(i)ac.lineTo(x,y);else ac.moveTo(x,y);}ac.closePath();ac.fillStyle='#fff';ac.fill();
  const alpha=new THREE.CanvasTexture(alphaCanvas);wet.alphaMap=reflection.alphaMap=alpha;
  const batches=new Map(),dummy=new THREE.Object3D();
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),plane:new THREE.PlaneGeometry(1,1)};
  function instance(type,material,position,scale,q=null,shadow=true){
    const key=`${type}/${material.uuid}/${shadow}`;if(!batches.has(key))batches.set(key,{type,material,shadow,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();if(q)dummy.quaternion.copy(q);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
  }
  function box(w,h,d,x,y,z,material=concrete,shadow=true){instance('box',material,[x,y,z],[w,h,d],null,shadow);}
  function rod(a,b,r=.025,material=metal,shadow=true){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));instance('cylinder',material,a.map((n,i)=>(n+b[i])/2),[r,v.length(),r],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()),shadow);}
  function mesh(geometry,material,parent=group,shadow=true){const object=new THREE.Mesh(geometry,material);object.castShadow=shadow;object.receiveShadow=true;parent.add(object);return object;}
  const floorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  function patch(x,z,w,d,material=wet,y=.006){instance('plane',material,[x,y,z],[w,d,1],floorQ,false);}
  const equipment=[],lights=[],swingPivots=[];
  function bounds(id,type,min,max){equipment.push({id,type,bounds:{min,max}});}

  // Rain-darkened paving continues directly out of the rear entrance.
  box(90,.32,65,99,-.27,-24,concrete);box(54,.10,15,98,-.12,-4.8,soil);
  box(42,.08,1.7,97,-.04,0,paving);
  for(let x=77;x<119;x+=1.12){box(.018,.005,1.69,x,.003,0,concrete,false);box(1.10,.13,.21,x,-.025,.93,paving);}
  for(let i=0;i<38;i++)patch(79+rand(i+15)*38,-.25+rand(i+77)*-6,.65+rand(i+135)*2.2,.25+rand(i+247)*.95,wet,rand(i+77)<.18?.006:-.058);
  for(let x=84;x<115;x+=6.3){box(.56,.016,.26,x,-.032,1.24,metal);for(let n=0;n<8;n++)box(.026,.01,.24,x-.24+n*.067,-.02,1.24,dark,false);}
  // A faded rubber play surface has settled into the muddy yard.
  for(let x=86;x<112;x+=1.0)for(let z=-6.9;z<-1.9;z+=1.0)box(.985,.028,.985,x,-.055,z,(Math.round(x-z)%7===0?teal:concrete),false);
  for(let i=0;i<120;i++){const x=82+rand(i+491)*33,z=-1.25-rand(i+523)*6.3;box(.025+rand(i+609)*.055,.01,.025,x,-.04,z,rand(i+749)>.5?rust:concrete,false);}

  function facade(x,width,height,z,material,seed,near=false){
    box(width,height,3.4,x,height/2,z-1.72,material);
    const columns=Math.max(2,Math.floor(width/2.1));
    for(let row=0;2.9+row*2.75<height-.6;row++)for(let col=0;col<columns;col++){
      const wx=x-width/2+1.12+col*(width-2.24)/(columns-1),wy=2.9+row*2.75,lit=rand(seed+row*43+col*13)>.87;
      box(.91,1.29,.035,wx,wy,z+.01,dark,false);box(.78,1.16,.022,wx,wy,z+.04,lit?warmWindow:glass,false);
      for(const dx of [-.421,.421])box(.04,1.26,.06,wx+dx,wy,z+.065,metal,false);
      box(.031,1.22,.06,wx,wy,z+.071,metal,false);box(.85,.035,.06,wx,wy-.12,z+.071,metal,false);box(1.00,.09,.17,wx,wy-.68,z+.07,paving);
      if(lit)for(const dx of [-.28,.29])box(.15,1.13,.01,wx+dx,wy,z+.06,curtain,false);
      if(near&&row>0&&col===1&&row%2===1){box(1.48,.13,.75,wx,wy-.84,z+.32,concrete);rod([wx-.72,wy-.2,z+.66],[wx+.72,wy-.2,z+.66],.022);for(let k=0;k<7;k++)rod([wx-.69+k*.23,wy-.78,z+.66],[wx-.69+k*.23,wy-.20,z+.66],.014);}
    }
    for(let y=3.9;y<height;y+=2.75)box(width,.052,.08,x,y,z+.04,concrete,false);
    box(width+.18,.18,3.7,x,height+.04,z-1.61,concrete);
    for(const dx of [-width/2+.18,width/2-.18])rod([x+dx,.12,z+.14],[x+dx,height-.13,z+.14],.039,metal);
  }
  // This close rear wall belongs to the same poor block as the wooden door.
  facade(77.3,12.0,13.4,-2.3,plaster,1021,true);
  box(12,.60,.13,77.3,.28,-2.24,concrete);
  for(const [px,py,ww,hh,seed]of[[78.0,1.15,2.4,1.7,1],[82.4,3.6,1.4,1.1,31],[74.2,5.0,2.1,1.25,67]]){
    const shape=new THREE.Shape();for(let i=0;i<9;i++){const a=i/8*Math.PI*2,r=.78+rand(seed+i)*.22,xx=Math.cos(a)*ww*.5*r,yy=Math.sin(a)*hh*.5*r;if(i)shape.lineTo(xx,yy);else shape.moveTo(xx,yy);}shape.closePath();
    const recess=mesh(new THREE.ShapeGeometry(shape),mortar,group,false);recess.position.set(px,py,-2.255);
    for(let row=0;row<Math.floor(hh/.17);row++)for(let col=0;col<Math.floor(ww/.33);col++){
      const xx=(col-(Math.floor(ww/.33)-1)/2)*.33+(row%2?.10:0),yy=(row-(Math.floor(hh/.17)-1)/2)*.17;
      if((xx/(ww*.49))**2+(yy/(hh*.47))**2<.91)box(.306,.145,.026,px+xx,py+yy,-2.23,brick,false);
    }
  }
  const rearDoorX=81.8,rearDoorZ=-2.10;
  box(1.47,2.65,.16,rearDoorX,1.30,rearDoorZ-.10,concrete);box(1.22,2.37,.04,rearDoorX,1.20,rearDoorZ+.01,dark);
  for(const dx of [-.68,.68])box(.085,2.56,.13,rearDoorX+dx,1.28,rearDoorZ+.06,wood);
  box(1.45,.09,.13,rearDoorX,2.56,rearDoorZ+.06,wood);box(1.52,.06,.34,rearDoorX,.025,rearDoorZ+.11,paving);
  const rearLeaf=new THREE.Group();rearLeaf.position.set(rearDoorX-.60,.03,rearDoorZ+.07);rearLeaf.rotation.y=-.91;group.add(rearLeaf);
  const leaf=mesh(new THREE.BoxGeometry(1.20,2.33,.075),wood,rearLeaf);leaf.position.set(.60,1.165,0);
  for(let n=0;n<5;n++){const seam=mesh(new THREE.BoxGeometry(.012,2.28,.008),dark,rearLeaf,false);seam.position.set(.2+n*.20,1.16,.043);}
  const handle=mesh(new THREE.BoxGeometry(.14,.026,.05),rust,rearLeaf);handle.position.set(1.00,1.08,.07);
  box(.29,.18,.16,rearDoorX,2.85,rearDoorZ+.10,metal);box(.20,.08,.14,rearDoorX,2.81,rearDoorZ+.18,lampGlass,false);
  const doorLight=new THREE.PointLight('#e2bd83',12,8,2);doorLight.position.set(rearDoorX,2.68,rearDoorZ+.6);group.add(doorLight);lights.push({light:doorLight,base:12});
  patch(rearDoorX,.05,1.5,.65,reflection);
  facade(98.5,24,18.8,-15.5,distant,1823);facade(118.5,17,23.5,-27,farWall,2211);facade(83,16,24.8,-31,farWall,3197);
  for(const [x,z,h]of[[93.7,-16.2,20.9],[107,-17,21.6],[119,-28,26]]){
    rod([x,h-2,z],[x,h,z],.017,metal);for(let n=0;n<4;n++)rod([x-.42+n*.07,h-1.2+n*.22,z-.15],[x+.42-n*.07,h-1.2+n*.22,z+.15],.009,metal);
  }
  // Finished boundary railings enclose the yard behind the equipment.
  box(34,.42,.24,99,.17,-8.65,concrete);box(34,.08,.34,99,.41,-8.65,paving);
  for(let x=82.6;x<116.1;x+=2.6){rod([x,.42,-8.64],[x,2.05,-8.64],.032);box(.10,.055,.10,x,2.07,-8.64,metal);}
  for(const y of [.55,1.96])rod([82.6,y,-8.64],[116.0,y,-8.64],.023);
  for(let x=82.78;x<116;x+=.22)rod([x,.54,-8.64],[x,1.96,-8.64],.010,metal,false);

  // Two empty swings move just a little in the wind. Their entire swing arc
  // stays behind the playable strip, including the hanging seats.
  const swingZ=-4.12,swingTop=3.25;
  for(const x of [86.7,92.1]){
    rod([x,0,swingZ-1.16],[x,swingTop,swingZ],.058,red);rod([x,0,swingZ+1.16],[x,swingTop,swingZ],.058,red);
    rod([x,.85,swingZ-.86],[x,.85,swingZ+.86],.029,metal);
    for(const z of [swingZ-1.16,swingZ+1.16])box(.27,.10,.25,x,-.03,z,concrete);
  }
  rod([86.63,swingTop,swingZ],[92.17,swingTop,swingZ],.067,red);
  for(const [i,x]of[[0,88.25],[1,90.55]]){
    const pivot=new THREE.Group();pivot.position.set(x,swingTop-.02,swingZ);group.add(pivot);swingPivots.push(pivot);
    const length=2.47;
    for(const dx of [-.34,.34]){
      const chain=mesh(new THREE.CylinderGeometry(.011,.011,length,6),trim,pivot);chain.position.set(dx,-length/2,0);
      for(let n=0;n<7;n++){const link=mesh(new THREE.TorusGeometry(.019,.004,3,6),metal,pivot,false);link.position.set(dx,-.20-n*.33,0);if(n%2)link.rotation.y=Math.PI/2;}
    }
    const seat=mesh(new THREE.BoxGeometry(.80,.065,.38),i?teal:ochre,pivot);seat.position.set(0,-length,-.01);
    for(const dx of [-.37,.37]){const end=mesh(new THREE.BoxGeometry(.035,.09,.39),metal,pivot);end.position.set(dx,-length-.015,-.01);}
    for(let k=0;k<6;k++){const chip=mesh(new THREE.BoxGeometry(.035,.003,.08),wood,pivot,false);chip.position.set((rand(k+i*11)-.5)*.66,-length+.035,(rand(k+19)-.5)*.29);}
  }
  bounds('empty-swings','swings',[86.55,-.08,-5.42],[92.25,3.34,-2.78]);

  // The sandpit and its low painted timber edge soften the hard courtyard.
  const sandX=95.5,sandZ=-4.35;
  box(3.50,.13,2.20,sandX,-.035,sandZ,sand);
  for(const dx of [-1.84,1.84])box(.17,.22,2.51,sandX+dx,.045,sandZ,teal);
  for(const dz of [-1.17,1.17])box(3.85,.22,.17,sandX,.045,sandZ+dz,ochre);
  for(const [dx,dz]of[[-1.84,-1.17],[-1.84,1.17],[1.84,-1.17],[1.84,1.17]])box(.35,.07,.35,sandX+dx,.19,sandZ+dz,red);
  for(let n=0;n<16;n++)box(.09+rand(n+90)*.10,.012,.05,sandX+(rand(n+789)-.5)*3.2,.04,sandZ+(rand(n+899)-.5)*1.9,soil,false);
  // A forgotten small bucket and spade are storytelling props, not controls.
  const bucket=mesh(new THREE.CylinderGeometry(.13,.10,.23,12),blue);bucket.position.set(96.25,.15,-4.0);bucket.rotation.z=.14;
  const handleCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(96.12,.24,-4),new THREE.Vector3(96.24,.42,-4),new THREE.Vector3(96.37,.24,-4)]);mesh(new THREE.TubeGeometry(handleCurve,12,.011,5,false),metal);
  box(.075,.018,.18,95.90,.056,-3.72,red,false);rod([95.90,.06,-3.80],[95.75,.075,-4.10],.014,wood,false);
  bounds('sandpit','sandpit',[93.47,-.10,-5.72],[97.53,.44,-2.97]);

  // A recognisable old metal slide: guarded platform, visible rungs, two
  // curved sheet-metal runners and a gently flattened run-out at the bottom.
  const sx=100.4,sz=-4.15;
  for(const x of [sx-.52,sx+.52])for(const z of [sz-.48,sz+.48])rod([x,0,z],[x,2.15,z],.043,teal);
  box(1.22,.12,1.12,sx,2.05,sz,ochre);
  for(const z of [sz-.55,sz+.55]){
    rod([sx-.58,2.12,z],[sx-.58,2.94,z],.030,teal);rod([sx+.58,2.12,z],[sx+.58,2.94,z],.030,teal);rod([sx-.58,2.94,z],[sx+.58,2.94,z],.030,teal);
    for(let n=0;n<5;n++)rod([sx-.47+n*.23,2.12,z],[sx-.47+n*.23,2.92,z],.016,teal);
  }
  for(const z of [sz-.40,sz+.40])rod([sx-1.34,.10,z],[sx-.60,2.10,z],.040,teal);
  for(let n=0;n<8;n++){const t=(n+.5)/8,x=sx-1.34+.74*t,y=.1+2.0*t;rod([x,y,sz-.40],[x,y,sz+.40],.025,ochre);}
  const path=[[sx+.46,2.10],[sx+.79,2.00],[sx+1.20,1.51],[sx+1.70,.93],[sx+2.22,.41],[sx+2.65,.23],[sx+3.06,.20]];
  const sheet=new THREE.BufferGeometry(),positions=[],indices=[];
  path.forEach(([x,y],i)=>{positions.push(x,y,sz-.42,x,y,sz+.42);if(i<path.length-1)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);});
  sheet.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));sheet.setIndex(indices);sheet.computeVertexNormals();
  mesh(sheet,new THREE.MeshStandardMaterial({color:'#8c9c9a',roughness:.42,metalness:.72,side:THREE.DoubleSide}));
  for(const z of [sz-.43,sz+.43])for(let i=0;i<path.length-1;i++)rod([path[i][0],path[i][1]+.105,z],[path[i+1][0],path[i+1][1]+.105,z],.037,red);
  rod([sx+1.68,.03,sz],[sx+1.68,.91,sz],.044,teal);rod([sx+2.8,.01,sz],[sx+2.8,.22,sz],.034,teal);
  for(let n=0;n<11;n++)box(.04,.019,.08,sx-.51+(n%4)*.32,2.12,sz-.38+Math.floor(n/4)*.36,rust,false);
  bounds('metal-slide','slide',[98.91,-.05,-4.76],[103.58,3.01,-3.54]);

  // Small seesaw with curved handholds and worn seat ends.
  const seesawX=107.75,seesawZ=-3.70;
  for(const z of [seesawZ-.27,seesawZ+.27]){rod([seesawX-.40,.03,z],[seesawX,.62,z],.045,teal);rod([seesawX+.40,.03,z],[seesawX,.62,z],.045,teal);}
  const plankQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-.075);instance('box',ochre,[seesawX,.64,seesawZ],[3.65,.13,.36],plankQ);
  for(const side of [-1,1]){
    const x=seesawX+side*1.55,y=.64-side*.115;box(.51,.08,.55,x,y+.08,seesawZ,side<0?red:blue);
    rod([x-side*.32,y+.11,seesawZ-.16],[x-side*.32,y+.50,seesawZ-.16],.022,metal);rod([x-side*.32,y+.50,seesawZ-.16],[x-side*.32,y+.50,seesawZ+.16],.022,metal);rod([x-side*.32,y+.50,seesawZ+.16],[x-side*.32,y+.11,seesawZ+.16],.022,metal);
    box(.38,.10,.32,x,-.02,seesawZ,dark);for(let n=0;n<4;n++)box(.04,.006,.09,x+(rand(n+side*17)-.5)*.4,y+.123,seesawZ+(rand(n+443)-.5)*.29,wood,false);
  }
  bounds('wooden-seesaw','seesaw',[105.72,-.08,-4.05],[109.78,1.32,-3.35]);

  // Benches sit to the rear of the path, with capped feet and wet slats.
  for(const [x,z]of[[85.1,-1.93],[112.3,-3.48]]){
    for(const dx of [-.88,.88]){rod([x+dx,0,z-.20],[x+dx,.52,z-.20],.040);rod([x+dx,0,z+.20],[x+dx,.52,z+.20],.040);rod([x+dx,.45,z-.20],[x+dx,1.17,z-.40],.035);}
    for(let n=0;n<4;n++)box(2.12,.07,.11,x,.53,z-.20+n*.13,wood);
    for(let n=0;n<3;n++)box(2.12,.12,.055,x,.82+n*.16,z-.33,wood);
    for(const dx of [-.96,.96])rod([x+dx,.58,z+.17],[x+dx,.78,z+.17],.024);
    bounds(`bench-${x}`,'bench',[x-1.1,-.04,z-.48],[x+1.1,1.25,z+.28]);
  }
  // Sparse weeds, fallen leaves and a bare tree show the same neglected yard.
  for(let i=0;i<90;i++){
    const x=83+rand(i+2501)*32,z=-1.32-rand(i+3301)*7.05,h=.06+rand(i+4401)*.18;
    for(let n=0;n<3;n++)rod([x,-.04,z],[x+(rand(i*3+n+431)-.5)*.17,h,z+(rand(i*3+n+675)-.5)*.11],.006,grass,false);
  }
  for(let i=0;i<65;i++)instance('plane',leaves,[83+rand(i+5401)*31,-.042,-1.1-rand(i+6101)*7],[.03+rand(i+7201)*.07,.025+rand(i+8201)*.045,1],new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,rand(i+9301)*6.2)),false);
  for(const [x,z,seed]of[[92.8,-7.5,33],[110.7,-7.8,77]]){
    rod([x,-.03,z],[x+.10,5.65,z-.1],.10,wood);
    for(let n=0;n<11;n++){
      const y=2.0+n*.29,side=n%2?1:-1,xx=x+side*(.65+rand(seed+n)*1.5),zz=z+(rand(seed+n+40)-.5)*.9;
      rod([x+.04,y,z],[xx,y+.7+rand(seed+n+10),zz],.024+n*.001,wood);rod([xx,y+.7,zz],[xx+side*.36,y+1.23,zz-.16],.011,wood);
    }
  }
  // Dim practical lamps and restrained pool reflections keep the stage legible.
  for(const [x,z]of[[93.3,-2.13],[109.9,-2.03]]){
    rod([x,-.04,z],[x,4.4,z],.055,metal);box(.24,.14,.25,x,4.42,z,metal);rod([x,4.4,z],[x+.46,4.46,z+.25],.032,metal);
    box(.58,.12,.32,x+.56,4.45,z+.33,metal);box(.45,.026,.25,x+.56,4.38,z+.33,lampGlass,false);
    const light=new THREE.PointLight('#e3c18a',17,10,2);light.position.set(x+.56,4.30,z+.33);group.add(light);lights.push({light,base:17});
    patch(x+.55,-.02,1.7,.65,reflection);patch(x+.42,-2.0,1.1,1.3,reflection,-.044);
  }
  for(const batch of batches.values()){
    const object=new THREE.InstancedMesh(geometries[batch.type],batch.material,batch.matrices.length);batch.matrices.forEach((m,i)=>object.setMatrixAt(i,m));object.instanceMatrix.needsUpdate=true;object.castShadow=batch.shadow;object.receiveShadow=true;group.add(object);
  }
  const metadata={
    route:{minX:82,maxX:112,y:0,z:0,clearHalfWidth:.60},
    rearEntrance:{x:rearDoorX,y:0,z:rearDoorZ,building:'home',open:true},
    equipment,lights:lights.length,drawBatches:batches.size,area:'playground'
  };
  group.userData.playground=metadata;
  return {group,metadata,update(time){
    if(!group.visible)return;
    swingPivots.forEach((pivot,i)=>{pivot.rotation.x=Math.sin(time*.72+i*2.1)*(.045+i*.012);});
    for(let i=0;i<lights.length;i++)lights[i].light.intensity=lights[i].base*(.993+.005*Math.sin(time*.85+i*2.3));
  }};
}
