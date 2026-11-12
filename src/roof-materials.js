// Rooftop-only PBR surfaces. Every texture is generated locally so the offline
// build has the same wet concrete, worn plaster and reflections as the browser.
export function createRoofMaterials(THREE){
  const random=n=>{const v=Math.sin(n*127.13+319.71)*43758.5453123;return v-Math.floor(v);};
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const noise=(x,y,seed=0)=>{
    const ix=Math.floor(x),iy=Math.floor(y),a=x-ix,b=y-iy,u=a*a*(3-2*a),v=b*b*(3-2*b);
    return mix(mix(random(ix*19.19+iy*71.13+seed),random((ix+1)*19.19+iy*71.13+seed),u),mix(random(ix*19.19+(iy+1)*71.13+seed),random((ix+1)*19.19+(iy+1)*71.13+seed),u),v);
  };
  const canvas=size=>{const c=document.createElement('canvas');c.width=c.height=size;return c;};
  function map(c,{color=false,repeat=[1,1]}={}){
    const t=new THREE.CanvasTexture(c);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.repeat.set(...repeat);t.anisotropy=4;return t;
  }
  function polygon(ctx,x,y,rx,ry,seed,fill){
    ctx.beginPath();for(let n=0;n<=16;n++){const a=n/16*Math.PI*2,r=.68+random(seed+n*13)*.40,xx=x+Math.cos(a)*rx*r,yy=y+Math.sin(a)*ry*r;if(n)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  }
  function maps(kind,size=512,repeat=[1,1]){
    const color=canvas(size),height=canvas(size),roughness=canvas(size),c=color.getContext('2d'),h=height.getContext('2d'),r=roughness.getContext('2d');
    const cp=c.createImageData(size,size),hp=h.createImageData(size,size),rp=r.createImageData(size,size);
    const wall=kind==='wall',wood=kind==='wood',steel=kind==='steel';
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4,large=noise(x/115,y/128,17),cloud=noise(x/38,y/51,221),grain=random(x*13.71+y*137.17+41),fine=noise(x/4.5,y/4.5,711);
      let base,relief,rough;
      if(wood){
        const bands=Math.sin(x*.093+noise(x/66,y/128,773)*9+Math.sin(y*.014)*.8),thread=Math.sin(x*.79+noise(x/18,y/110,712)*4);
        const shade=15*bands+4*thread+(grain-.5)*19+(cloud-.5)*18;
        base=[117+shade,99+shade*.92,73+shade*.78];relief=125+bands*28+thread*7+(grain-.5)*18;rough=170+cloud*55+grain*20;
      }else if(steel){
        const line=noise(x/95,y/2.5,535),shade=(large-.5)*22+(line-.5)*17+(grain-.5)*14;
        base=[117+shade,132+shade,132+shade];relief=128+(line-.5)*10+(grain-.5)*17;rough=95+cloud*88+grain*26;
      }else{
        const aggregate=(grain>.95?12:grain<.08?-16:0),shade=(large-.5)*(wall?51:23)+(cloud-.5)*25+(fine-.5)*13+(grain-.5)*15+aggregate;
        base=wall?[129+shade,137+shade,136+shade]:[116+shade,124+shade,125+shade];
        relief=126+(fine-.5)*(wall?15:8)+(grain-.5)*(wall?12:5)+(grain>.98?(wall?8:3):0);
        rough=wall?210+cloud*30:175+noise(x/70,y/58,411)*67;
      }
      cp.data[i]=clamp(base[0],0,255);cp.data[i+1]=clamp(base[1],0,255);cp.data[i+2]=clamp(base[2],0,255);cp.data[i+3]=255;
      for(let k=0;k<3;k++){hp.data[i+k]=clamp(relief,0,255);rp.data[i+k]=clamp(rough,0,255);}hp.data[i+3]=rp.data[i+3]=255;
    }
    c.putImageData(cp,0,0);h.putImageData(hp,0,0);r.putImageData(rp,0,0);
    if(wall){
      // Exposed dark masonry and the lifted pale rim of old paint. Individual
      // islands keep the texture from reading as one cloudy noise overlay.
      for(let i=0;i<20;i++){
        const x=random(i+281)*size,y=random(i+531)*size,rx=8+random(i+891)*56,ry=rx*(.4+random(i+1289)*1.25),seed=i*61+389;
        polygon(c,x,y,rx+1.5,ry+1.5,seed,'rgba(188,196,181,.13)');
        const exposed=c.createLinearGradient(x-rx,y-ry,x+rx,y+ry);exposed.addColorStop(0,'rgba(91,103,100,.25)');exposed.addColorStop(.55,'rgba(116,126,118,.18)');exposed.addColorStop(1,'rgba(143,150,137,.11)');
        polygon(c,x,y,rx,ry,seed,exposed);
        c.save();c.clip();c.globalAlpha=.10;c.drawImage(height,0,0);c.restore();
        polygon(h,x,y,rx,ry,seed,'#6e6e6e');polygon(r,x,y,rx,ry,seed,'#ebebeb');
        // Fine crumbling edges give flakes a real highlight in grazing light.
        c.strokeStyle='rgba(28,40,39,.06)';c.lineWidth=.8;c.stroke();
      }
      for(let i=0;i<29;i++){
        const x=random(i+2191)*size,y=random(i+3419)*size,w=2+random(i+719)*13,len=35+random(i+1539)*240;
        const stain=c.createLinearGradient(x,y,x,y+len);stain.addColorStop(0,'rgba(25,43,42,.28)');stain.addColorStop(.6,'rgba(35,52,49,.10)');stain.addColorStop(1,'rgba(40,55,50,0)');polygon(c,x,y+len*.43,w,len*.55,i*71+914,stain);
        for(let k=0;k<3;k++){c.strokeStyle=`rgba(35,51,49,${.09-k*.02})`;c.lineWidth=1;c.beginPath();c.moveTo(x+k*2,y);c.bezierCurveTo(x+k*2-2,y+len*.3,x+k*2+3,y+len*.7,x+k*2,y+len);c.stroke();}
      }
    }
    if(!wood&&!steel){
      const count=wall?17:11;
      for(let i=0;i<count;i++){
        const x=random(i+3171)*size,y=random(i+5197)*size,points=[[x,y]];
        for(let n=1;n<8;n++)points.push([x+n*(5+random(i+816)*6)+(random(i*27+n)-.5)*14,y+n*5+(random(i*13+n+431)-.5)*15]);
        for(const [ctx,stroke,width]of[[c,'rgba(26,42,43,.48)',.8],[h,'#4e4e4e',1.1],[r,'#c8c8c8',1.4]]){
          ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,n)=>n?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
          if(i%3===0){const p=points[3];ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(p[0]-6,p[1]+14);ctx.lineTo(p[0]-17,p[1]+23);ctx.stroke();}
        }
      }
    }
    if(kind==='roof'){
      // Water is authored as localized surface geometry. Keep the underlying
      // concrete mottled and mostly matte, without a tiled pool/stencil pattern.
      for(let i=0;i<95;i++){
        const x=random(i+5471)*size,y=random(i+9517)*size;
        c.fillStyle=i%7===0?'rgba(184,173,132,.24)':'rgba(20,40,43,.24)';c.fillRect(x,y,.6+random(i+471)*2.3,.6+random(i+851)*2.3);
      }
    }
    if(wood){
      for(let i=0;i<9;i++){
        const x=(i+.2+random(i+482)*.5)/9*size;
        c.fillStyle='rgba(22,27,24,.46)';c.fillRect(x,0,1.3,size);h.fillStyle='#393939';h.fillRect(x,0,1.5,size);
        c.fillStyle='rgba(210,187,139,.24)';c.fillRect(x+2.5,0,1,size);
      }
      for(let i=0;i<18;i++){
        const x=random(i+699)*size,y=random(i+983)*size;
        c.strokeStyle='rgba(49,40,28,.36)';c.lineWidth=.8;c.beginPath();c.ellipse(x,y,2+random(i+119)*4,8+random(i+749)*18,-.08,0,Math.PI*2);c.stroke();
      }
    }
    if(steel){
      for(let i=0;i<33;i++){
        const x=random(i+1441)*size,y=random(i+2443)*size,seed=i*61+31,rx=2+random(i+919)*13,ry=2+random(i+671)*21;
        polygon(c,x,y,rx,ry,seed,'rgba(96,66,40,.56)');polygon(r,x,y,rx,ry,seed,'#d5d5d5');
        c.fillStyle='rgba(30,44,43,.29)';c.fillRect(x,y+ry*.5,.7,6+random(i+1417)*33);
      }
    }
    return {color:map(color,{color:true,repeat}),height:map(height,{repeat}),roughness:map(roughness,{repeat})};
  }
  function cityEnvironment(){
    // A local reflected skyline. The scene background is deliberately not
    // changed: these six small maps belong only to rooftop materials.
    const images=[];
    for(let face=0;face<6;face++){
      const c=canvas(256),ctx=c.getContext('2d');
      const sky=ctx.createLinearGradient(0,0,0,256);sky.addColorStop(0,'#a7beca');sky.addColorStop(.34,'#617f90');sky.addColorStop(.57,'#344c59');sky.addColorStop(1,'#14262e');ctx.fillStyle=sky;ctx.fillRect(0,0,256,256);
      if(face===2){
        ctx.fillStyle='#8ba5b4';ctx.fillRect(0,0,256,256);
        for(let i=0;i<17;i++){const g=ctx.createRadialGradient(random(i+73)*256,random(i+191)*256,1,128,128,130);g.addColorStop(0,'rgba(196,208,212,.10)');g.addColorStop(1,'rgba(64,88,102,0)');ctx.fillStyle=g;ctx.fillRect(0,0,256,256);}
      }else if(face===3){ctx.fillStyle='#1c3038';ctx.fillRect(0,0,256,256);}else{
        for(let i=0;i<8;i++){
          const x=i*38-15+random(i+face*73)*8,y=38+random(i+face*151)*74,w=34+random(i+31)*14;
          ctx.fillStyle=['#233b47','#2a434f','#314955'][i%3];ctx.fillRect(x,y,w,256-y);
          ctx.fillStyle='rgba(131,156,163,.18)';ctx.fillRect(x,y,w,1);
          for(let row=0;row<9;row++)for(let col=0;col<3;col++){
            const wx=x+6+col*10,wy=y+12+row*16,lit=random(face*111+i*137+row*19+col*33)>.91;
            ctx.fillStyle=lit?'#d5b478':'rgba(111,139,151,.20)';ctx.fillRect(wx,wy,4,7);
            if(lit){const g=ctx.createRadialGradient(wx+2,wy+3,0,wx+2,wy+3,8);g.addColorStop(0,'rgba(234,193,115,.16)');g.addColorStop(1,'rgba(234,193,115,0)');ctx.fillStyle=g;ctx.fillRect(wx-6,wy-5,16,16);}
          }
        }
      }
      images.push(c);
    }
    const texture=new THREE.CubeTexture(images);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
  }
  const roofMaps=maps('roof',512,[.22,.22]),wallMaps=maps('wall',1024,[1.35,2.5]),woodMaps=maps('wood',512,[1,1]),steelMaps=maps('steel',512,[1,1]);
  const envMap=cityEnvironment();
  const standard=(color,roughness,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
  const roof=new THREE.MeshPhysicalMaterial({color:'#91a0a2',map:roofMaps.color,bumpMap:roofMaps.height,bumpScale:.009,roughnessMap:roofMaps.roughness,roughness:.94,metalness:.025,envMap,envMapIntensity:.45,clearcoat:.08,clearcoatRoughness:.25});
  const wall=standard('#a1afad',.98,{map:wallMaps.color,bumpMap:wallMaps.height,bumpScale:.032,roughnessMap:wallMaps.roughness});
  const rim=standard('#a6b5b5',.66,{map:roofMaps.color,bumpMap:roofMaps.height,bumpScale:.010,envMap,envMapIntensity:.30});
  const metal=standard('#4c6269',.43,{map:steelMaps.color,roughnessMap:steelMaps.roughness,bumpMap:steelMaps.height,bumpScale:.012,metalness:.72,envMap,envMapIntensity:.9});
  const zinc=standard('#b3c1c0',.32,{map:steelMaps.color,roughnessMap:steelMaps.roughness,bumpMap:steelMaps.height,bumpScale:.008,metalness:.79,envMap,envMapIntensity:1});
  const rust=standard('#79563c',.94,{map:woodMaps.color,bumpMap:woodMaps.height,bumpScale:.016});
  const wood=standard('#a7a897',.88,{map:woodMaps.color,bumpMap:woodMaps.height,bumpScale:.026,roughnessMap:woodMaps.roughness});
  const wet=new THREE.MeshPhysicalMaterial({color:'#344e5d',roughness:.075,metalness:.06,envMap,envMapIntensity:1.15,clearcoat:1,clearcoatRoughness:.035});
  const damp=standard('#435b66',.47,{envMap,envMapIntensity:.35,metalness:.05});
  const glass=standard('#597b8b',.18,{envMap,envMapIntensity:.8,metalness:.18});
  const result={roof,wall,rim,metal,zinc,rust,wood,wet,damp,glass,envMap,maps:{roof:roofMaps,wall:wallMaps,wood:woodMaps,steel:steelMaps}};
  for(const [key,material]of Object.entries(result))if(material?.isMaterial)material.name=`rooftop-${key}`;
  return result;
}
