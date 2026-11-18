// Original woven surfaces generated locally. Colour and relief live on the
// deforming clothing's UVs, so the pattern follows the actual three-dimensional
// body in every pose and is also available in the single-file offline build.
const fabricCache=new WeakMap();
export function createFatherMaterials(THREE) {
  const SIZE=512,TAU=Math.PI*2;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const fract=v=>v-Math.floor(v);
  const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7+19.31)*43758.5453123);
  let cached=fabricCache.get(THREE);if(!cached){cached=new Map();fabricCache.set(THREE,cached);}
  function noise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(0,1,fract(x)),fy=smooth(0,1,fract(y));
    const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  }
  const bell=(u,v,x,y,sx,sy)=>Math.exp(-(((u-x)/sx)**2)-((v-y)/sy)**2);
  function texture(data,name,color=true,size=SIZE){
    const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
    map.name=name;map.wrapS=THREE.RepeatWrapping;map.wrapT=THREE.ClampToEdgeWrapping;
    map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
    map.generateMipmaps=true;map.anisotropy=4;
    if(color)map.colorSpace=THREE.SRGBColorSpace;
    map.needsUpdate=true;return map;
  }
  function maps(kind){
    if(cached.has(kind))return cached.get(kind);
    const color=new Uint8Array(SIZE*SIZE*4),height=new Uint8Array(SIZE*SIZE*4);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const u=x/(SIZE-1),v=y/(SIZE-1),n=noise(u*21,v*19)-.5,grain=hash(x,y)-.5;
      let rgb,relief;
      if(kind==='cardigan'){
        // Small offset chevrons read as knitted loops, rather than a flat
        // photographic patch. The larger diamonds remain visible at distance.
        const row=Math.floor(v*108),loopX=fract(u*112+(row%2)*.5),loopY=fract(v*108);
        const loop=Math.exp(-(((Math.abs(loopX-.5)-(.10+.24*loopY))/.095)**2));
        const mottling=noise(u*5,v*8),wear=.91+.12*mottling;
        const ribs=(Math.sin(u*TAU*96)*.5+.5),hem=1-smooth(.075,.15,v);
        const band=smooth(.39,.43,v)*(1-smooth(.69,.73,v));
        const diamondRow=(v-.43)*12,cellY=fract(diamondRow),cellX=fract(u*19+(Math.floor(diamondRow)%2)*.5);
        const diamond=Math.abs(cellX-.5)*2+Math.abs(cellY-.5)*2;
        const stitch=(1-smooth(.07,.18,Math.abs(diamond-.75)))+(.62*(1-smooth(.05,.14,Math.abs(diamond-.30))));
        const edgeBand=Math.max(Math.exp(-(((v-.39)/.012)**2)),Math.exp(-(((v-.73)/.012)**2)));
        const tinyCross=(Math.abs(fract(u*38)-.5)<.10&&Math.abs(fract(v*108)-.5)<.12)?1:0;
        const pattern=clamp(stitch*band*.80+edgeBand*.50+tinyCross*band*.12);
        const base=[91,76,65],motif=[133,119,101],shade=(loop-.45)*9+grain*5+n*10-hem*(7-ribs*9);
        rgb=base.map((c,i)=>(c+(motif[i]-c)*pattern)*wear+shade);
        relief=118+loop*35+grain*15+pattern*8+hem*(ribs-.5)*22;
      }else if(kind==='shirt'){
        const weave=Math.sin(u*TAU*210)*Math.sin(v*TAU*215),placket=Math.exp(-(((u-.5)/.008)**2));
        // Uneven age stains and faded folds, not large high-contrast splotches.
        const stains=bell(u,v,.47,.32,.09,.17)*.15+bell(u,v,.56,.61,.035,.11)*.11+bell(u,v,.51,.83,.06,.08)*.08;
        const crease=Math.sin(v*TAU*12+noise(u*4,v*7)*5)*2.4+Math.sin(u*TAU*35)*1.2;
        rgb=[155,148,130].map((c,i)=>c*(.94+n*.08-stains)+grain*5+weave*2+crease-placket*(i===2?8:5));
        relief=128+weave*13+grain*12+crease*2+placket*21;
      }else{
        const twill=Math.sin((u*178+v*90)*TAU),seam=Math.exp(-(((fract(u*2)-.21)/.014)**2));
        const fade=.94+n*.11+noise(u*5,v*7)*.09;
        rgb=[72,68,60].map(c=>c*fade+grain*5+twill*2+seam*4);
        relief=128+twill*17+grain*12+seam*16;
      }
      const i=(y*SIZE+x)*4;for(let c=0;c<3;c++){color[i+c]=Math.round(clamp(rgb[c],0,255));height[i+c]=Math.round(clamp(relief,0,255));}
      color[i+3]=height[i+3]=255;
    }
    const result={map:texture(color,`father-${kind}-woven-colour`),bumpMap:texture(height,`father-${kind}-woven-relief`,false)};
    cached.set(kind,result);return result;
  }
  function cloth(kind,roughness,bumpScale){
    const material=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness,...maps(kind),bumpScale});
    material.name=`father-${kind}`;material.userData={source:'local-procedural-fabric',textile:kind,referencePalette:'worn-brown-greige'};return material;
  }
  const cardigan=cloth('cardigan',.98,.0034),trousers=cloth('trousers',.96,.0018),shirt=cloth('shirt',.94,.0015);
  // The same fibre scale on the folded trim ties the collar and cuffs to the
  // knitted shell. Use a separate material so its tint can stay slightly worn.
  const trim=cardigan.clone();trim.name='father-ribbed-knit-trim';trim.color.set('#c2b49e');trim.vertexColors=false;
  trim.userData={...cardigan.userData,textile:'ribbed-cardigan-trim'};
  return {cardigan,trousers,shirt,trim};
}
