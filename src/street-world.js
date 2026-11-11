import {STREET} from './street.js';

// An original courtyard street. The walking strip is kept in front of the
// parking pockets, so scenery never intersects the child's playable plane.
export function createStreetWorld(THREE,scene){
  const group=new THREE.Group();group.name='empty-street';group.visible=false;scene.add(group);
  const random=n=>{const f=Math.sin(n*127.13+73.71)*43758.5453;return f-Math.floor(f);};
  const mat=(color,roughness=.9,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  function surfaceTexture(kind){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const c=canvas.getContext('2d');c.fillStyle=kind==='asphalt'?'#929a97':'#b1b4a9';c.fillRect(0,0,512,512);
    const pixels=c.getImageData(0,0,512,512);
    for(let i=0;i<pixels.data.length;i+=4){const shade=(random(i*.19)-.5)*(kind==='asphalt'?65:25);for(let k=0;k<3;k++)pixels.data[i+k]+=shade;}
    c.putImageData(pixels,0,0);
    for(let i=0;i<48;i++){
      const x=random(i+17)*512,y=random(i+177)*512,r=8+random(i+321)*75;
      const stain=c.createRadialGradient(x,y,0,x,y,r);stain.addColorStop(0,kind==='asphalt'?'rgba(20,31,30,.18)':'rgba(29,37,31,.15)');stain.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=stain;c.fillRect(x-r,y-r,r*2,r*2);
    }
    if(kind==='asphalt'){
      c.strokeStyle='rgba(17,25,25,.46)';c.lineWidth=1.5;
      for(let i=0;i<11;i++){const x=random(i+603)*512,y=random(i+750)*512;c.beginPath();c.moveTo(x,y);for(let j=1;j<7;j++)c.lineTo(x+j*9+random(i*17+j)*12,y+j*5+random(i*33+j)*20);c.stroke();}
      c.fillStyle='rgba(211,211,183,.17)';for(let i=0;i<1200;i++)c.fillRect(random(i+991)*512,random(i+2091)*512,1.3,1);
    }else{
      // Islands of old paint and fine repaired cracks are part of the plaster.
      for(let i=0;i<27;i++){
        const x=random(i+450)*512,y=random(i+800)*512,r=4+random(i+930)*28;c.beginPath();
        for(let j=0;j<10;j++){const a=j/9*Math.PI*2,s=r*(.35+random(i*29+j)*.8);const xx=x+Math.cos(a)*s,yy=y+Math.sin(a)*s*.65;if(j===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.closePath();c.fillStyle='#858c80';c.fill();c.strokeStyle='rgba(215,214,188,.25)';c.lineWidth=.8;c.stroke();
      }
      c.strokeStyle='rgba(24,34,29,.23)';c.lineWidth=.65;
      for(let i=0;i<9;i++){const x=random(i+1301)*512,y=random(i+1654)*512;c.beginPath();c.moveTo(x,y);for(let j=1;j<5;j++)c.lineTo(x+j*4+random(i*11+j)*7,y+j*8+random(i*21+j)*7);c.stroke();}
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
  }
  const plasterMap=surfaceTexture('plaster'),roadMap=surfaceTexture('asphalt');
  const roadBump=roadMap.clone();roadBump.colorSpace=THREE.NoColorSpace;
  const plasterBump=plasterMap.clone();plasterBump.colorSpace=THREE.NoColorSpace;
  roadMap.repeat.set(25,6);roadBump.repeat.copy(roadMap.repeat);
  const plaster=mat('#7b8479',.98,{map:plasterMap,bumpMap:plasterBump,bumpScale:.035});
  const distantWall=mat('#65767a',.98,{map:plasterMap,bumpMap:plasterBump,bumpScale:.015});
  const farWall=mat('#526b76',1,{map:plasterMap});
  const pavement=mat('#727a71',.79,{map:plasterMap,bumpMap:plasterBump,bumpScale:.025,metalness:.04});
  const asphalt=mat('#4b5654',.30,{map:roadMap,bumpMap:roadBump,bumpScale:.026,metalness:.19});
  const darkConcrete=mat('#414d48',.96,{map:plasterMap});
  const metal=mat('#303d3a',.75,{metalness:.48}),trim=mat('#7e867a',.59,{metalness:.62});
  const rust=mat('#625441',.97),black=mat('#152020',.97),rubber=mat('#15201f',.99);
  const glass=mat('#3e5356',.28,{metalness:.29,side:THREE.DoubleSide}),windowGlass=mat('#364b51',.46,{metalness:.2});
  const curtain=mat('#6d7160',1),warmWindow=mat('#c3a675',.68,{emissive:'#c99c5b',emissiveIntensity:.72});
  const lampGlass=mat('#e1c295',.43,{emissive:'#ffce88',emissiveIntensity:2.2});
  const wet=mat('#354c51',.13,{metalness:.39}),damp=mat('#354442',.57,{metalness:.08});
  const reflection=mat('#84754e',.16,{metalness:.5,emissive:'#574629',emissiveIntensity:.10});
  const puddleCanvas=document.createElement('canvas');puddleCanvas.width=puddleCanvas.height=128;
  const pc=puddleCanvas.getContext('2d');pc.fillStyle='#000';pc.fillRect(0,0,128,128);pc.filter='blur(5px)';pc.beginPath();
  for(let i=0;i<17;i++){const a=i/16*Math.PI*2,r=43+random(i+740)*12;const xx=64+Math.cos(a)*r,yy=64+Math.sin(a)*r*.86;if(!i)pc.moveTo(xx,yy);else pc.lineTo(xx,yy);}pc.closePath();pc.fillStyle='#fff';pc.fill();pc.filter='none';
  const puddleAlpha=new THREE.CanvasTexture(puddleCanvas);for(const m of [wet,damp,reflection]){m.alphaMap=puddleAlpha;m.transparent=true;m.opacity=m===reflection?.46:.64;m.depthWrite=false;m.polygonOffset=true;m.polygonOffsetFactor=-1;}
  const leafMat=mat('#4e5540',.94,{side:THREE.DoubleSide}),wood=mat('#454c40',.94,{map:plasterMap});
  const paints=[mat('#817e63',.64,{metalness:.23}),mat('#6b3b33',.73,{metalness:.17}),mat('#536761',.71,{metalness:.18}),mat('#676d69',.68,{metalness:.2}),mat('#5e6350',.77,{metalness:.15})];
  const lightList=[],cars=[],props=[],lamps=[];
  const batches=new Map(),dummy=new THREE.Object3D();let placement=null;
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),leaf:new THREE.PlaneGeometry(1,1),patch:new THREE.PlaneGeometry(1,1)};
  function instance(type,material,position,scale,quaternion=null,shadow=true){
    const key=`${type}/${material.uuid}/${shadow}`;if(!batches.has(key))batches.set(key,{type,material,shadow,matrices:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.quaternion.identity();if(quaternion)dummy.quaternion.copy(quaternion);dummy.updateMatrix();const matrix=dummy.matrix.clone();if(placement)matrix.premultiply(placement);batches.get(key).matrices.push(matrix);
  }
  function box(w,h,d,x,y,z,material=pavement,shadow=true){instance('box',material,[x,y,z],[w,h,d],null,shadow);}
  function cylinder(r,h,x,y,z,material=metal,quaternion=null){instance('cylinder',material,[x,y,z],[r,h,r],quaternion);}
  function rod(a,b,r=.025,material=metal){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());instance('cylinder',material,a.map((n,i)=>(n+b[i])/2),[r,v.length(),r],q);}
  function mesh(geometry,material,parent=group,shadow=true){const object=new THREE.Mesh(geometry,material);object.castShadow=shadow;object.receiveShadow=true;parent.add(object);return object;}
  function wire(points,r=.014,material=black){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,18,r,4,false),material,group,false);}
  function flatPatch(x,z,w,d,material,y=-.073,seed=0){
    // Feathered irregular edges and a slight rotation avoid rectangular pools.
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,(random(seed+3)-.5)*.22));
    instance('patch',material,[x,y,z],[w,d,1],q,false);
  }
  // A broad, rain-soaked courtyard roadway and a supported near walking strip.
  box(150,.30,90,40,-.30,-32,darkConcrete);
  box(110,.28,20,35,-.22,-.7,darkConcrete);box(110,.035,20,35,-.095,-.7,asphalt);
  box(80,.08,1.7,30,-.04,0,pavement);
  for(let x=-8;x<71;x+=1.14){box(.018,.004,1.68,x,.003,0,darkConcrete,false);box(1.10,.13,.22,x,-.025,.93,pavement);}
  for(let x=-2;x<57;x+=6.9){box(.64,.015,.32,x,-.035,1.27,metal);for(let n=0;n<9;n++)box(.027,.008,.29,x-.28+n*.07,-.023,1.27,black,false);}
  for(let i=0;i<54;i++){const x=-2+random(i+11)*61,z=-6.5+random(i+53)*12;flatPatch(x,z,.6+random(i+98)*3.5,.25+random(i+221)*1.4,i%4===0?damp:wet,z>-.8&&z<.8?.004:-.073,i*31);}
  for(let i=0;i<80;i++){const x=-2+random(i+242)*58,z=-.7+random(i+322)*1.4;box(.018+random(i+400)*.05,.009,.015+random(i+500)*.04,x,.007,z,darkConcrete,false);}
  function facade(center,width,bottom,top,z,material,seed,near=false){
    box(width,top-bottom,3.7,center,(top+bottom)/2,z-1.9,material);
    const left=center-width/2,columns=Math.max(1,Math.floor((width-1)/2.1)),firstWindowY=bottom+(near&&z>-3?4.1:2.0);
    for(let row=0;firstWindowY+row*2.8<top-.7;row++)for(let col=0;col<columns;col++){
      const x=left+1.15+col*(width-2.1)/Math.max(1,columns-1),y=firstWindowY+row*2.8;
      const lit=random(seed+row*97+col*31)>.875,wm=lit?warmWindow:windowGlass;
      box(.93,1.35,.035,x,y,z+.025,black,false);box(.80,1.21,.018,x,y,z+.049,wm,false);
      for(const dx of [-.43,.43])box(.044,1.32,.07,x+dx,y,z+.071,trim,false);
      box(.032,1.25,.06,x,y,z+.083,metal,false);box(.88,.035,.06,x,y-.13,z+.083,metal,false);
      box(1.02,.09,.18,x,y-.70,z+.10,pavement);
      if(lit){box(.21,1.17,.009,x-.27,y,z+.064,curtain,false);box(.13,1.17,.009,x+.31,y,z+.064,curtain,false);}
      if(near&&col===0&&row%2===1){
        box(1.5,.15,.83,x,y-.93,z+.32,darkConcrete);box(1.5,.10,.10,x,y-.15,z+.70,metal);
        for(let p=0;p<7;p++)rod([x-.69+p*.23,y-.87,z+.70],[x-.69+p*.23,y-.16,z+.70],.016,metal);
      }
    }
    for(let y=bottom+3.5;y<top;y+=2.8)box(width,.055,.09,center,y,z+.045,darkConcrete,false);
    box(width+.24,.20,4.05,center,top+.04,z-1.8,darkConcrete);
    for(const x of [left+.18,left+width-.20])rod([x,bottom+.1,z+.14],[x,top-.12,z+.14],.039,metal);
    for(let n=0;n<2;n++){
      const x=left+1.2+n*(width-2.5);rod([x,top+.1,z-1.5],[x,top+1.8,z-1.5],.017,metal);
      for(let k=0;k<4;k++)rod([x-.42+k*.08,top+.7+k*.22,z-1.7],[x+.42-k*.08,top+.7+k*.22,z-1.3],.009,metal);
    }
  }
  // The exit building is close enough to read its worn plaster and fittings.
  facade(-.6,15.2,0,16.4,-2.12,plaster,17,true);
  // A neighbouring apartment block meets the left edge of the entry building.
  facade(-15.1,13.8,0,18.1,-2.12,plaster,1907,true);
  box(.13,18.1,.19,-8.2,9.05,-1.99,darkConcrete);
  // A projecting end face lets the opening street read beyond the entry block.
  box(.13,16.3,4.4,7.03,8.15,-4.1,darkConcrete);
  const doorX=STREET.doorX??1.2,doorZ=-1.88;
  box(1.52,2.74,.20,doorX,1.35,doorZ-.15,darkConcrete);box(1.24,2.47,.025,doorX,1.23,doorZ-.035,black);
  for(const dx of [-.71,.71])box(.09,2.77,.15,doorX+dx,1.36,doorZ+.04,trim);
  box(1.52,.09,.15,doorX,2.73,doorZ+.04,trim);box(1.54,.08,.39,doorX,.035,doorZ+.14,pavement);
  const entryLeaf=new THREE.Group();entryLeaf.position.set(doorX-.59,.02,doorZ+.05);entryLeaf.rotation.y=1.05;group.add(entryLeaf);
  const leafBase=mesh(new THREE.BoxGeometry(1.18,2.4,.09),wood,entryLeaf);leafBase.position.set(.59,1.2,0);
  const leafGlass=mesh(new THREE.BoxGeometry(.45,.65,.025),warmWindow,entryLeaf,false);leafGlass.position.set(.59,1.64,.06);
  const leafHandle=mesh(new THREE.BoxGeometry(.17,.026,.045),trim,entryLeaf);leafHandle.position.set(.96,1.02,.075);
  box(.39,.33,.12,doorX,2.99,doorZ+.12,metal);cylinder(.13,.24,doorX,2.98,doorZ+.28,lampGlass);
  for(const dx of [-.10,.10])rod([doorX+dx,2.85,doorZ+.37],[doorX+dx,3.11,doorZ+.37],.012,metal);
  const entryLight=new THREE.PointLight('#ffd293',15,7.5,2);entryLight.position.set(doorX,2.7,doorZ+.8);group.add(entryLight);lightList.push(entryLight);
  flatPatch(doorX,.1,2.1,2.0,reflection,.007,2001);
  // Graffiti and old notices are marks on the building, not gameplay text.
  const noticeCanvas=document.createElement('canvas');noticeCanvas.width=256;noticeCanvas.height=384;const nc=noticeCanvas.getContext('2d');nc.fillStyle='#666e61';nc.fillRect(0,0,256,384);
  for(let i=0;i<26;i++){const x=12+random(i+60)*190,y=10+random(i+160)*320,w=25+random(i+260)*70,h=24+random(i+360)*95;nc.fillStyle=['#9b9a7b','#747b6b','#b0ac8b'][i%3];nc.fillRect(x,y,w,h);nc.strokeStyle='rgba(37,44,36,.46)';nc.lineWidth=2;for(let k=0;k<4;k++){nc.beginPath();nc.moveTo(x+4,y+8+k*6);nc.lineTo(x+w-5-random(i+k)*9,y+8+k*6);nc.stroke();}}
  const noticeMap=new THREE.CanvasTexture(noticeCanvas);noticeMap.colorSpace=THREE.SRGBColorSpace;
  box(.92,1.27,.065,4.7,1.3,-1.98,metal);const notices=mesh(new THREE.PlaneGeometry(.82,1.17),new THREE.MeshStandardMaterial({map:noticeMap,roughness:1}),group,false);notices.position.set(4.7,1.3,-1.936);
  const graffitiCanvas=document.createElement('canvas');graffitiCanvas.width=512;graffitiCanvas.height=256;const gc=graffitiCanvas.getContext('2d');gc.strokeStyle='#263b39';gc.lineWidth=8;gc.lineCap='round';
  for(let i=0;i<8;i++){gc.beginPath();gc.moveTo(35+i*48,210);gc.bezierCurveTo(5+i*48,35,100+i*42,15,57+i*45,180);gc.bezierCurveTo(105+i*38,230,15+i*45,100,80+i*45,115);gc.stroke();}
  const graffitiMap=new THREE.CanvasTexture(graffitiCanvas);const graffiti=mesh(new THREE.PlaneGeometry(1.62,.82),new THREE.MeshBasicMaterial({map:graffitiMap,transparent:true,depthWrite:false}),group,false);graffiti.position.set(3.05,1.12,-1.927);
  const muralCanvas=document.createElement('canvas');muralCanvas.width=1024;muralCanvas.height=384;
  const mc=muralCanvas.getContext('2d');mc.lineCap='round';mc.lineJoin='round';
  // An original, loosely lettered tag with uneven spray strokes and worn paint.
  const tagStrokes=[
    'M 70 91 Q 108 168 132 281 L 289 65 M 69 116 L 127 297 L 317 75',
    'M 385 75 C 278 70 268 292 360 290 C 474 309 522 54 385 75 M 386 105 C 326 111 310 257 361 259 C 415 260 466 98 386 105',
    'M 542 100 L 686 79 M 623 90 L 558 278 M 494 289 L 648 265',
    'M 721 96 L 678 285 C 913 309 1025 48 721 96 M 739 122 L 705 255 C 856 253 935 97 739 122',
    'M 56 320 Q 468 293 941 318 M 133 332 Q 534 343 974 287'
  ];
  for(let layer=0;layer<3;layer++){
    mc.strokeStyle=['rgba(29,42,41,.80)','rgba(118,126,105,.74)','rgba(173,159,121,.37)'][layer];mc.lineWidth=[32,19,4][layer];
    mc.save();if(layer===2)mc.translate(-3,-4);for(const stroke of tagStrokes)mc.stroke(new Path2D(stroke));mc.restore();
  }
  mc.strokeStyle='rgba(103,112,96,.35)';mc.lineWidth=3;
  for(let i=0;i<19;i++){const x=70+random(i+982)*870,y=225+random(i+1191)*51;mc.beginPath();mc.moveTo(x,y);mc.lineTo(x+random(i+341)*3,y+18+random(i+415)*55);mc.stroke();}
  mc.globalCompositeOperation='destination-out';for(let i=0;i<950;i++){mc.fillStyle=`rgba(0,0,0,${.15+random(i+177)*.65})`;mc.fillRect(random(i+814)*1024,random(i+945)*384,1+random(i+734)*8,1+random(i+125)*3);}
  const muralMap=new THREE.CanvasTexture(muralCanvas);muralMap.colorSpace=THREE.SRGBColorSpace;
  const mural=mesh(new THREE.PlaneGeometry(4.65,1.48),new THREE.MeshStandardMaterial({map:muralMap,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1}),group,false);mural.position.set(-3.45,1.20,-1.924);
  box(.34,.54,.09,doorX-.97,1.18,doorZ+.09,metal);for(let i=0;i<5;i++)box(.11,.025,.012,doorX-.98,1.28-i*.055,doorZ+.145,black,false);
  for(const x of [-2.95,4.78]){
    box(.83,.62,.32,x,4.38,-1.82,trim);cylinder(.23,.05,x,4.38,-1.63,metal,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));
    for(let i=0;i<6;i++)rod([x-.22,4.13+i*.09,-1.59],[x+.22,4.13+i*.09,-1.59],.007,black);
    wire([[x+.4,4.19,-1.75],[x+.6,3.9,-1.77],[x+.65,2.8,-1.79]],.012,metal);
  }
  // Beyond the entry block, a parking court opens in front of layered blocks.
  for(const spec of [[15,16,17,-13.5,431],[33,15,21,-17,731],[51,18,18,-13,1103]])facade(spec[0],spec[1],-.1,spec[2],spec[3],distantWall,spec[4],true);
  for(const spec of [[23,13,26,-29,1765],[44,20,29,-36,2031],[66,16,24,-30,2701]])facade(spec[0],spec[1],-.1,spec[2],spec[3],farWall,spec[4]);
  // Retaining wall and a chain-link fence divide the parking court from gardens.
  box(52,.66,.33,32.5,.24,-5.9,darkConcrete);box(52,.10,.44,32.5,.61,-5.9,pavement);
  for(let x=7.2;x<59;x+=2.7){rod([x,.64,-5.84],[x,2.37,-5.84],.028,metal);box(.11,.06,.11,x,2.4,-5.84,metal);}
  rod([7,.82,-5.84],[58.4,.82,-5.84],.017,metal);rod([7,2.23,-5.84],[58.4,2.23,-5.84],.017,metal);
  for(let x=7.1;x<58.3;x+=.34){rod([x,.85,-5.84],[x+1.02,2.21,-5.84],.0065,metal);rod([x,2.21,-5.84],[x+1.02,.85,-5.84],.0065,metal);}
  function tree(x,z,seed,height=7.5){
    const trunkMat=darkConcrete;rod([x,-.08,z],[x+.1,height*.65,z+.07],.10,trunkMat);
    for(let b=0;b<10;b++){
      const side=b%2?-1:1,baseY=height*(.25+b*.052),endX=x+side*(.8+random(seed+b)*1.1),endY=baseY+1.1+random(seed+20+b)*1.5,endZ=z+(random(seed+30+b)-.5)*1.2;
      rod([x+.05,baseY,z],[endX,endY,endZ],.027,trunkMat);
      for(let j=0;j<3;j++){const xx=endX+side*(.3+random(seed+b*31+j)*.55),yy=endY+.28+random(seed+b*23+j)*.8,zz=endZ+(random(seed+b*17+j)-.5)*.65;rod([endX,endY,endZ],[xx,yy,zz],.010,trunkMat);
        for(let k=0;k<5;k++){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(random(seed+b+j+k)*2,random(seed+100+b+j+k)*3,random(seed+200+b+j+k)*2));instance('leaf',leafMat,[xx+(random(seed+k+43)-.5)*.48,yy+(random(seed+k+87)-.5)*.38,zz+(random(seed+k+61)-.5)*.4],[.13,.065,1],q,false);}
      }
    }
  }
  tree(8.5,-6.3,460,7.9);tree(22.6,-6.8,560,8.6);tree(38.7,-7.2,660,7.4);tree(51.8,-7.5,760,8.1);
  for(let i=0;i<52;i++){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,random(i+3)*6));instance('leaf',leafMat,[5+random(i+80)*49,-.064,-.55+random(i+180)*1.1],[.10,.055,1],q,false);}
  function bin(x,z,seed){
    box(.87,.93,.65,x,.42,z,metal);box(.93,.13,.73,x,.94,z-.02,darkConcrete);box(.88,.04,.74,x,.995,z-.02,trim);
    for(const dx of [-.34,.34]){cylinder(.075,.09,x+dx,.01,z+.24,rubber,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));rod([x+dx,.75,z+.35],[x+dx,.86,z+.35],.018,trim);}
    for(let i=0;i<5;i++)box(.055,.014,.010,x-.24+i*.12,.70,z+.332,rust,false);
    props.push({id:`bin-${seed}`,bounds:{min:[x-.48,-.08,z-.39],max:[x+.48,1.03,z+.39]}});
  }
  bin(5.8,-2.15,1);bin(6.85,-2.28,2);
  const sackGeometry=new THREE.IcosahedronGeometry(1,1);
  for(const [x,z,s]of[[5,-2.0,.24],[7.5,-2.35,.30],[6.1,-2.85,.22]]){const sack=mesh(sackGeometry,black);sack.position.set(x,s*.65-.08,z);sack.scale.set(s,s*.83,s*.77);rod([x,s*1.32-.08,z],[x+.02,s*1.55-.08,z],.027,black);}
  // A few geometric helpers make the cars read as vehicles instead of crates.
  function profileGeometry(points,depth,bevel=.045){const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:depth-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:1});geometry.translate(0,0,-depth/2+bevel);return geometry;}
  function quad(points,material,parent){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();return mesh(geometry,material,parent);}
  function car(cx,cz,colorIndex,seed,hatch=false,flip=false){
    const carGroup=new THREE.Group();carGroup.position.set(cx,-.08,cz);if(flip)carGroup.rotation.y=Math.PI;group.add(carGroup);
    const paint=paints[colorIndex],halfWidth=.79,front=-2.06,rear=hatch?1.78:2.06;
    const outline=[[front,.34],[front,.62],[front+.20,.77],[-1.0,.84],[.9,.84],[rear-.10,.77],[rear,.60],[rear,.34],[1.60,.34]];
    for(let i=1;i<=10;i++){const a=i/10*Math.PI;outline.push([1.25+.35*Math.cos(a),.34+.35*Math.sin(a)]);}
    outline.push([-.90,.34]);for(let i=1;i<=10;i++){const a=i/10*Math.PI;outline.push([-1.25+.35*Math.cos(a),.34+.35*Math.sin(a)]);}outline.push([front,.34]);
    mesh(profileGeometry(outline,halfWidth*2,.035),paint,carGroup);
    const roofRear=hatch?.89:.65,bottomRear=hatch?1.46:1.10;
    const cabin=profileGeometry([[-1.03,.83],[-.55,1.41],[roofRear,1.41],[bottomRear,.83]],1.38,.025);mesh(cabin,paint,carGroup);
    // Side windows are inset into body-colour pillars, with separate panes.
    for(const side of [-1,1]){
      const z=side*.707;
      const frontWindow=[[-.91,.91,z],[-.49,1.33,z],[.07,1.33,z],[.07,.91,z]];
      const rearWindow=[[.14,.91,z],[.14,1.33,z],[roofRear-.08,1.33,z],[bottomRear-.15,.91,z]];
      if(side<0){frontWindow.reverse();rearWindow.reverse();}
      quad(frontWindow,glass,carGroup);quad(rearWindow,glass,carGroup);
    }
    quad([[-1.045,.88,-.65],[-.57,1.36,-.65],[-.57,1.36,.65],[-1.045,.88,.65]],glass,carGroup);
    quad([[bottomRear-.03,.88,.65],[roofRear-.01,1.36,.65],[roofRear-.01,1.36,-.65],[bottomRear-.03,.88,-.65]],glass,carGroup);
    const transform=new THREE.Matrix4().makeRotationY(flip?Math.PI:0);transform.setPosition(cx,-.08,cz);placement=transform;
    const wheelQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
    for(const x of [-1.25,1.25])for(const side of [-1,1]){
      cylinder(.31,.17,x,.31,side*.77,rubber,wheelQ);cylinder(.185,.018,x,.31,side*.865,trim,wheelQ);cylinder(.12,.025,x,.31,side*.878,metal,wheelQ);
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;cylinder(.018,.027,x+Math.cos(a)*.115,.31+Math.sin(a)*.115,side*.895,black,wheelQ);}
    }
    for(const side of [-1,1]){
      box(rear-front-.12,.035,.035,(front+rear)/2,.77,side*.805,trim);box(2.0,.045,.04,.07,.40,side*.79,metal);
      for(const x of [-.90,.12,1.04])box(.016,.35,.013,x,.60,side*.803,black,false);
      for(const x of [-.38,.70]){box(.17,.025,.035,x,.80,side*.824,trim);box(.20,.025,.014,x,.78,side*.816,black);}
      box(.11,.095,.11,-.78,1.00,side*.81,paint);rod([-.72,.96,side*.73],[-.78,1.00,side*.81],.015,metal);
      // Fine irregular sill/arch corrosion is subdued, not wrecked-body damage.
      for(let i=0;i<21;i++){const x=front+.22+random(seed+i)*(rear-front-.44),y=.39+random(seed+i+29)*.13;box(.025+random(seed+i+43)*.10,.012+random(seed+i+61)*.033,.009,x,y,side*.797,rust,false);}
    }
    for(const x of [front-.035,rear+.035]){box(.105,.12,1.60,x,.40,0,trim);box(.12,.07,.19,x,.40,-.49,black);box(.12,.07,.19,x,.40,.49,black);}
    box(.04,.17,.95,front-.071,.62,0,metal);for(let n=0;n<10;n++)box(.041,.012,.043,front-.094,.57+n*.01,-.43+n*.085,black);
    const headlight=mat('#a3a282',.45,{metalness:.15});for(const side of [-1,1]){box(.042,.19,.27,front-.086,.66,side*.60,headlight);box(.045,.14,.26,rear+.065,.63,side*.60,side>0?paints[1]:rust);}
    box(.022,.10,.36,front-.10,.40,0,pavement);box(.022,.10,.36,rear+.095,.40,0,pavement);
    rod([-.46,.90,-.48],[-.80,1.11,-.51],.007,black);rod([-.46,.90,.12],[-.80,1.11,.09],.007,black);
    placement=null;
    const bounds=new THREE.Box3().setFromObject(carGroup);
    // Trim is instanced outside the group, so include its small outer margins.
    cars.push({id:`parked-${seed}`,type:hatch?'hatchback':'sedan',color:['cream','rust-red','blue-green','grey','olive'][colorIndex],bounds:{min:[cx-2.21,-.08,cz-.94],max:[cx+2.21,1.38,cz+.94]},bodyBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
    flatPatch(cx,cz,4.6,1.5,damp,-.073,seed+700);flatPatch(cx-.6,cz+.8,2.3,.48,wet,-.071,seed+911);
  }
  car(10.5,-3.12,0,301,false);car(16.7,-3.5,1,401,true);car(27.3,-3.1,2,501,false,true);car(38.8,-3.65,3,601,false);car(48.2,-3.18,4,701,true,true);
  function streetLamp(x,z,index){
    const height=4.65;
    cylinder(.16,.25,x,.045,z,darkConcrete);rod([x,-.03,z],[x,height,z],.063,metal);
    rod([x,height-.12,z],[x+.14,height+.12,z+.55],.042,metal);rod([x+.14,height+.12,z+.55],[x+.30,height+.08,z+1.03],.035,metal);
    box(.62,.11,.37,x+.33,height+.04,z+1.08,metal);box(.49,.025,.29,x+.33,height-.025,z+1.08,lampGlass);
    const light=new THREE.PointLight('#ffd29a',18,10.8,2);light.position.set(x+.33,height-.12,z+1.08);light.castShadow=false;group.add(light);lightList.push(light);
    lamps.push({x:x+.33,y:height-.12,z:z+1.08,index});
    for(let i=0;i<8;i++){const xx=x+.3+(random(index*23+i)-.5)*.60,zz=.3+random(index*37+i)*3.5;flatPatch(xx,zz,.25+random(index*71+i)*.8,.12+random(index*83+i)*.5,reflection,-.071,index*311+i);}
    flatPatch(x+.3,0,1.5,.7,reflection,.005,index*633);
  }
  streetLamp(9.0,-1.55,1);streetLamp(23.5,-1.65,2);streetLamp(39.7,-1.55,3);streetLamp(53.1,-1.7,4);
  for(let i=0;i<lamps.length-1;i++){
    const a=lamps[i],b=lamps[i+1];wire([[a.x-.33,4.55,a.z-1.08],[(a.x+b.x)/2,4.05,(a.z+b.z)/2-1.2],[b.x-.33,4.55,b.z-1.08]],.014,black);
    wire([[a.x-.33,4.65,a.z-1.23],[(a.x+b.x)/2,4.26,(a.z+b.z)/2-1.35],[b.x-.33,4.65,b.z-1.23]],.009,black);
  }
  wire([[-4,10.1,-2.0],[2,8.7,-2.7],[9,4.62,-1.56]],.018,black);
  // A quiet, closed gate marks the visible end of the prototype street.
  box(.34,2.7,.36,55.8,1.25,-2.4,darkConcrete);box(3.8,.07,.09,57.7,2.5,-2.4,metal);
  for(let i=0;i<17;i++)rod([56.0+i*.22,-.05,-2.4],[56.0+i*.22,2.45,-2.4],.014,metal);
  const gateX=STREET.fence.x+STREET.fence.w/2,gateTop=STREET.fence.y,gateBack=-1.05,gateFront=1.75;
  for(const z of [gateBack,gateFront])rod([gateX,-.08,z],[gateX,gateTop,z],.065,metal);
  for(const y of [.12,1.10,gateTop])rod([gateX,y,gateBack],[gateX,y,gateFront],.027,metal);
  for(let z=gateBack+.16;z<gateFront-.05;z+=.19)rod([gateX,.12,z],[gateX,gateTop,z],.014,metal);
  rod([gateX,.16,gateBack+.05],[gateX,2.15,gateFront-.05],.019,metal);
  box(.10,.17,.18,gateX+.02,1.15,.38,rust);
  const endGate={bounds:{min:[gateX-.08,-.08,gateBack-.08],max:[gateX+.08,gateTop+.027,gateFront+.08]}};
  const dumpsterConfig=STREET.dumpster??{startX:43.5,w:1.9,y:1.05,z:0,minX:8.2,maxX:53.25};
  const dumpsterGroup=new THREE.Group();dumpsterGroup.name='movable-dumpster';dumpsterGroup.position.set(dumpsterConfig.startX,0,0);group.add(dumpsterGroup);
  const dumpsterPaint=mat('#4f6557',.87,{metalness:.26,map:plasterMap,bumpMap:plasterBump,bumpScale:.009});
  const dumpsterInset=mat('#364e42',.91,{metalness:.16}),lidPaint=mat('#3e5248',.73,{metalness:.30});
  // Keep the many small steel details batched while the casters turn independently.
  const dumpsterBatches=new Map(),localDummy=new THREE.Object3D();
  function localInstance(type,material,position,scale,quaternion=null){
    const key=`${type}/${material.uuid}`;
    if(!dumpsterBatches.has(key))dumpsterBatches.set(key,{type,material,matrices:[]});
    localDummy.position.set(...position);localDummy.scale.set(...scale);localDummy.quaternion.identity();
    if(quaternion)localDummy.quaternion.copy(quaternion);localDummy.updateMatrix();
    dumpsterBatches.get(key).matrices.push(localDummy.matrix.clone());
  }
  function localBox(w,h,d,x,y,z,material=dumpsterPaint){localInstance('box',material,[x,y,z],[w,h,d]);}
  function localRod(a,b,r=.018,material=trim){
    const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),length=delta.length();
    localInstance('cylinder',material,a.map((v,i)=>(v+b[i])/2),[r,length,r],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
  }
  mesh(profileGeometry([[-.81,.22],[-.925,.92],[-.925,1.0],[.925,1.0],[.925,.92],[.81,.22]],.94,.018),dumpsterPaint,dumpsterGroup);
  localBox(1.90,.055,1.0,0,1.0225,0,lidPaint);
  localBox(1.80,.025,.91,0,.995,0,metal);
  for(const z of [-.479,.479]){
    localBox(1.53,.55,.012,0,.58,z,dumpsterInset);
    for(const x of [-.69,0,.69])localBox(.028,.58,.022,x,.60,z,trim);
    for(let i=0;i<20;i++){const x=(random(i+1287)-.5)*1.60,h=.025+random(i+1488)*.16;localBox(.015+random(i+1788)*.055,h,.007,x,.32+h/2,z+(z>0?.01:-.01),rust);}
  }
  for(const x of [-.965,.965]){
    localRod([x,.82,-.23],[x,.82,.23],.018,trim);
    for(const z of [-.23,.23])localRod([x*.965,.72,z],[x,.82,z],.014,metal);
  }
  for(const x of [-.62,0,.62])localBox(.14,.026,.09,x,1.018,-.45,metal);
  const wheels=[];
  for(const x of [-.69,.69])for(const z of [-.39,.39]){
    localBox(.17,.055,.18,x,.235,z,metal);
    for(const dx of [-.073,.073])localBox(.025,.12,.14,x+dx,.176,z,trim);
    const wheel=new THREE.Group();wheel.position.set(x,.11,z);dumpsterGroup.add(wheel);
    const tyre=mesh(new THREE.CylinderGeometry(.11,.11,.115,14),rubber,wheel);tyre.rotation.x=Math.PI/2;
    const hub=mesh(new THREE.CylinderGeometry(.055,.055,.128,12),trim,wheel);hub.rotation.x=Math.PI/2;wheels.push(wheel);
  }
  for(const batch of dumpsterBatches.values()){
    const object=new THREE.InstancedMesh(geometries[batch.type],batch.material,batch.matrices.length);
    batch.matrices.forEach((matrix,index)=>object.setMatrixAt(index,matrix));object.instanceMatrix.needsUpdate=true;
    object.castShadow=true;object.receiveShadow=true;dumpsterGroup.add(object);
  }
  const dumpsterMetadata={id:'dumpster',type:'movable-steel-dumpster',centerX:dumpsterConfig.startX,width:1.9,topY:1.05,z:0,
    bounds:{min:[dumpsterConfig.startX-.99,0,-.5],max:[dumpsterConfig.startX+.99,1.05,.5]}};
  const dumpster={group:dumpsterGroup,position:dumpsterGroup.position,get bounds(){return dumpsterMetadata.bounds;},setPosition(value){
    if(!Number.isFinite(value))return;const x=Math.max(dumpsterConfig.minX,Math.min(dumpsterConfig.maxX,value)),delta=x-dumpsterGroup.position.x;
    dumpsterGroup.position.x=x;dumpsterMetadata.centerX=x;dumpsterMetadata.bounds.min[0]=x-.99;dumpsterMetadata.bounds.max[0]=x+.99;
    for(const wheel of wheels)wheel.rotation.z-=delta/.11;
  }};
  for(const batch of batches.values()){
    const object=new THREE.InstancedMesh(geometries[batch.type],batch.material,batch.matrices.length);batch.matrices.forEach((m,i)=>object.setMatrixAt(i,m));object.instanceMatrix.needsUpdate=true;object.castShadow=batch.shadow;object.receiveShadow=true;group.add(object);
  }
  const metadata={entryDoor:{x:doorX,y:0,z:doorZ,kind:'building-exit'},route:{minX:STREET.minX,maxX:STREET.maxX,y:0,z:0,clearHalfWidth:.5},cars,props,lamps,endGate,fence:endGate,dumpster:dumpsterMetadata,
    neighbouringBuilding:{minX:-22,maxX:-8.2,z:-2.12},graffiti:{x:-3.45,y:1.20,z:-1.924,width:4.65,height:1.48},lights:lightList.length,drawBatches:batches.size};
  group.userData.street=metadata;let enteredAt=null;
  const entryDoor={reset(){enteredAt=null;entryLeaf.rotation.y=1.05;},get angle(){return entryLeaf.rotation.y;}};
  return {group,metadata,entryDoor,dumpster,update(time,playerX,streetState){
    if(!group.visible)return;
    if(enteredAt===null)enteredAt=time;
    dumpster.setPosition(streetState?.dumpsterX??dumpsterConfig.startX);
    const closing=Math.max(0,Math.min(1,(time-enteredAt-.8)/2.4));entryLeaf.rotation.y=1.05*(1-closing*closing*(3-2*closing));
    for(let i=0;i<lightList.length;i++){const base=i===0?15:18;lightList[i].intensity=base*(.992+.006*Math.sin(time*.85+i*1.9));}
  }};
}
