// Original rooftop set, built entirely from local geometry and procedural textures.
export function createWorld(THREE, scene) {
  const world = new THREE.Group();
  scene.add(world);
  const random = n => { const f = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return f - Math.floor(f); };
  function texture(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const c = canvas.getContext('2d');
    c.fillStyle = kind === 'wood' ? '#8b8271' : '#a4aaa8'; c.fillRect(0, 0, 512, 512);
    const image = c.getImageData(0, 0, 512, 512);
    for (let i = 0; i < image.data.length; i += 4) {
      const r = random(i * .13), shade = (r - .5) * (kind === 'wood' ? 30 : 36);
      image.data[i] += shade; image.data[i + 1] += shade; image.data[i + 2] += shade;
    }
    c.putImageData(image, 0, 0);
    for (let i = 0; i < 70; i++) {
      const x = random(i + 100) * 512, y = random(i + 203) * 512;
      if (kind === 'wood') {
        c.strokeStyle = `rgba(44,39,29,${.04 + random(i) * .08})`;
        c.lineWidth = 1 + random(i + 3) * 2;
        c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 10, 180, x - 9, 350, x, 512); c.stroke();
      } else {
        const glow = c.createRadialGradient(x, y, 0, x, y, 10 + random(i) * 60);
        glow.addColorStop(0, `rgba(39,49,46,${.018 + random(i + 1) * .055})`); glow.addColorStop(1, 'rgba(39,49,46,0)');
        c.fillStyle = glow; c.fillRect(0, 0, 512, 512);
      }
    }
    if (kind === 'concrete') {
      c.fillStyle = 'rgba(21,32,34,.15)'; c.fillRect(0, 0, 512, 2); c.fillRect(0, 510, 512, 2);
      c.fillStyle = 'rgba(223,231,225,.11)'; c.fillRect(0, 3, 512, 1);
      for (let i = 0; i < 7; i++) {
        const x = random(i + 270) * 512;
        c.fillStyle = 'rgba(44,55,48,.05)'; c.fillRect(x, 0, 3 + random(i + 20) * 5, 50 + random(i + 21) * 250);
      }
    }
    if (kind === 'concrete') {
      // Fine repaired cracks and aggregate stay subtle beneath the lighting.
      c.lineWidth = .65; c.strokeStyle = 'rgba(31,42,41,.09)';
      for (let i = 0; i < 13; i++) {
        const x = random(i + 370) * 512, y = random(i + 440) * 512;
        c.beginPath(); c.moveTo(x, y);
        for (let j = 1; j < 5; j++) c.lineTo(x + j * 8 + random(i * 21 + j) * 9, y + j * 5 + random(i * 19 + j) * 11);
        c.stroke();
      }
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
    return map;
  }
  const concreteMap = texture('concrete'), woodMap = texture('wood');
  const concreteRelief = concreteMap.clone(); concreteRelief.colorSpace = THREE.NoColorSpace;
  const mat = (color, roughness = .88, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const roofMat = mat('#65716f', .83, { map: concreteMap, bumpMap: concreteRelief, bumpScale: .026, roughnessMap: concreteRelief });
  const rimMat = mat('#7d8581', .88, { map: concreteMap, bumpMap: concreteRelief, bumpScale: .018 });
  const wallMat = mat('#6a7675', .95, { map: concreteMap, bumpMap: concreteRelief, bumpScale: .028 });
  const darkMetal = mat('#323f40', .78, { metalness: .45 });
  const zinc = mat('#6c7b78', .59, { metalness: .56 });
  const rust = mat('#615546', .94);
  const black = mat('#1d2b30');
  function box(w, h, d, x, y, z, material, parent = world, shadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = shadow; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function beveledBox(w, h, d, bevel, x, y, z, material, parent = world) {
    const b = Math.min(bevel, w / 4, h / 4, d / 4), shape = new THREE.Shape();
    shape.moveTo(-w / 2 + b, -h / 2 + b); shape.lineTo(w / 2 - b, -h / 2 + b);
    shape.lineTo(w / 2 - b, h / 2 - b); shape.lineTo(-w / 2 + b, h / 2 - b); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * b, steps: 1, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
    geometry.translate(0, 0, -d / 2 + b);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(radius, height, x, y, z, material = darkMetal, parent = world) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function wire(points, color = '#1b2b30', radius = .014) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 4, false), mat(color, .8));
    world.add(mesh); return mesh;
  }
  const panes = [], warmPanes = [], frames = [], stairGlass = [], wetPatches = [], dampPatches = [], ribbons = [];
  const wetMat = mat('#53686b', .24, { metalness: .27 });
  const dampMat = mat('#526160', .56, { metalness: .07 });
  const glass = mat('#586e75', .39, { metalness: .22 });
  const balconyMat = mat('#7d8987', .91, { map: concreteMap });

  function facade(x, width, top, bottom, z, seed, spacing = 1.7, windowW = .65, windowH = 1.15) {
    const columns = Math.floor((width - 1) / spacing), rows = Math.floor((top - bottom - 2) / 2.4);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const xx = x - width / 2 + 1 + col * spacing, yy = top - 2 - row * 2.4;
        const spec = { x: xx, y: yy, z, w: windowW, h: windowH, shade: random(seed + col * 19 + row * 137) };
        if (spec.shade > .973) warmPanes.push(spec); else panes.push(spec);
        frames.push({ ...spec, y: yy - windowH / 2 - .07, w: windowW + .16, h: .07, z: z + .04 });
      }
    }
  }
  function rooftop(left, right, level, seed) {
    const center = (left + right) / 2, width = right - left;
    box(width, 35, 4.3, center, level - 17.7, -.25, wallMat);
    beveledBox(width + .12, .28, 4.55, .045, center, level - .14, -.25, roofMat);
    // A thin bright cornice makes the height and roof thickness readable.
    box(width + .23, .12, .15, center, level - .18, 2.05, rimMat);
    box(.14, .12, 4.5, left + .02, level - .16, -.25, rimMat);
    box(.14, .12, 4.5, right - .02, level - .16, -.25, rimMat);
    facade(center, width, level - .1, level - 34, 1.91, seed, 1.8, .71, 1.25);
    // Panel seams and modest rain streaks across the front face.
    for (let x = left + .8; x < right; x += 3.6) {
      box(.026, 34.7, .014, x, level - 17.7, 1.914, darkMetal, world, false);
      if (random(x + seed) > .65) box(.06, 9, .02, x + .07, level - 4.7, 1.93, rust, world, false);
    }
    for (let x = left + .5; x < right; x += 3) {
      box(.018, .006, 4.2, x, level + .005, -.25, darkMetal, world, false);
    }
    for (let z = -1.8; z < 1.7; z += 1.2) box(width - .3, .007, .014, center, level + .006, z, darkMetal, world, false);
    // Rear parapet and old safety rail stay behind the playable lane.
    box(width, .19, .21, center, level + .095, -2.38, rimMat);
    for (let x = left + 1; x < right - .3; x += 2.8) {
      cylinder(.026, .87, x, level + .6, -2.35);
      box(2.8, .035, .035, x + 1.4, level + 1.02, -2.35, darkMetal);
    }
    // Layered irregular patches read as rainwater, with a darker damp perimeter.
    for (let i = 0; i < 7; i++) {
      const spec = { x: left + 1.1 + random(seed + i + 50) * (width - 2.2), y: level + .008,
        z: -.8 + random(seed + i + 15) * 2, sx: .48 + random(seed + i) * .88,
        sz: .13 + random(seed + i + 10) * .27, angle: random(seed + i + 311) * 3 };
      dampPatches.push(spec); wetPatches.push({ ...spec, y: level + .011, sx: spec.sx * .81, sz: spec.sz * .77 });
    }
    for (let i = 0; i < 12; i++) {
      const x = left + .7 + random(seed + i + 119) * (width - 1.4), z = random(seed + i + 132) > .5 ? -1.8 : 1.45;
      const stone = box(.05 + random(i + seed) * .09, .025, .04 + random(i + 20) * .07, x, level + .025, z, random(i) > .5 ? darkMetal : rimMat);
      stone.rotation.y = random(i + 28) * 6;
    }
  }
  rooftop(-1, 22, 0, 38); rooftop(24.2, 43, .45, 91);
  // A small improvised sleeping spot is protected by the fixed end guard.
  // These constants are also consumed by movement so art and collision agree.
  const restArea = {
    spawnX: 0, surfaceY: .12,
    mattress: { x: -.9, w: 2.2, y: .12 },
    leftWall: { x: -1.04, w: .18, y: 1.32 }
  };
  box(.18, .32, 4.4, -.95, .16, -.15, rimMat);
  // Thin rusty rails keep the head and hands readable against the city.
  for (const z of [-2.30, -1.43, -.56, .31, 1.18, 2.02]) {
    box(.047, 1.0, .047, -.95, .82, z, darkMetal);
    box(.055, .13, .055, -.95, .43 + random(z + 340) * .24, z, rust);
    box(.105, .045, .105, -.95, .34, z, zinc);
  }
  for (const y of [.76, 1.295]) box(.045, .05, 4.36, -.95, y, -.14, darkMetal);
  // The tiny front return stops at x=-.68, clear of the child's silhouette.
  box(.27, .22, .18, -.815, .11, 2.01, rimMat);
  for (const y of [.76, 1.295]) box(.27, .05, .045, -.815, y, 2.02, darkMetal);
  box(.045, .99, .045, -.70, .815, 2.02, darkMetal);
  const bed = new THREE.Group(); bed.name = 'rest-area'; world.add(bed);
  const fabricCanvas = document.createElement('canvas'); fabricCanvas.width = 512; fabricCanvas.height = 256;
  const fabricCtx = fabricCanvas.getContext('2d');
  fabricCtx.fillStyle = '#aaa99a'; fabricCtx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 20; i++) {
    const x = random(i + 522) * 512, y = random(i + 721) * 256, radius = 18 + random(i + 821) * 54;
    const stain = fabricCtx.createRadialGradient(x, y, 2, x, y, radius);
    stain.addColorStop(0, `rgba(72,74,58,${.035 + random(i + 540) * .09})`); stain.addColorStop(1, 'rgba(72,74,58,0)');
    fabricCtx.fillStyle = stain; fabricCtx.fillRect(0, 0, 512, 256);
  }
  fabricCtx.lineWidth = .65;
  for (let i = 1; i < 256; i += 2) { fabricCtx.strokeStyle = 'rgba(32,38,34,.042)'; fabricCtx.beginPath(); fabricCtx.moveTo(0, i); fabricCtx.lineTo(512, i); fabricCtx.stroke(); }
  for (let i = 1; i < 512; i += 3) { fabricCtx.strokeStyle = 'rgba(231,231,213,.055)'; fabricCtx.beginPath(); fabricCtx.moveTo(i, 0); fabricCtx.lineTo(i, 256); fabricCtx.stroke(); }
  // Faded quilt channels and a double stitched border are baked into the fabric.
  fabricCtx.strokeStyle = 'rgba(58,64,57,.16)'; fabricCtx.lineWidth = 1;
  for (let y = 40; y < 240; y += 39) { fabricCtx.beginPath(); fabricCtx.moveTo(14, y); fabricCtx.bezierCurveTo(180, y + 6, 310, y - 5, 497, y); fabricCtx.stroke(); }
  fabricCtx.strokeStyle = 'rgba(46,51,45,.25)'; fabricCtx.setLineDash([4, 3]);
  fabricCtx.strokeRect(12, 11, 488, 234); fabricCtx.strokeRect(17, 16, 478, 224); fabricCtx.setLineDash([]);
  const fabricMap = new THREE.CanvasTexture(fabricCanvas); fabricMap.colorSpace = THREE.SRGBColorSpace; fabricMap.anisotropy = 4;
  fabricMap.wrapS = fabricMap.wrapT = THREE.RepeatWrapping;
  const fabricBump = fabricMap.clone(); fabricBump.colorSpace = THREE.NoColorSpace;
  const mattressFabric = mat('#a2a99a', .99, { map: fabricMap, bumpMap: fabricBump, bumpScale: .008 });
  const mattressSide = mat('#8e9686', .99, { map: fabricMap, bumpMap: fabricBump, bumpScale: .008 });
  // The front corner is absent from the cloth shell; the shell is mirrored so
  // the exposed foam faces the camera away from the guard.
  const mattressShape = new THREE.Shape(), hx = 1.088, hz = .513, corner = .07;
  mattressShape.moveTo(-hx + .26, -hz); mattressShape.lineTo(hx - corner, -hz);
  mattressShape.quadraticCurveTo(hx, -hz, hx, -hz + corner); mattressShape.lineTo(hx, hz - corner);
  mattressShape.quadraticCurveTo(hx, hz, hx - corner, hz); mattressShape.lineTo(-hx + corner, hz);
  mattressShape.quadraticCurveTo(-hx, hz, -hx, hz - corner); mattressShape.lineTo(-hx, -.20);
  mattressShape.lineTo(-hx + .04, -.31); mattressShape.lineTo(-hx + .11, -.285);
  mattressShape.lineTo(-hx + .14, -.42); mattressShape.lineTo(-hx + .23, -.415); mattressShape.closePath();
  const mattressGeometry = new THREE.ExtrudeGeometry(mattressShape, { depth: .09, steps: 1, bevelEnabled: true, bevelSize: .012, bevelThickness: .015, bevelSegments: 2, curveSegments: 4 });
  mattressGeometry.rotateX(-Math.PI / 2); mattressGeometry.translate(0, .015, 0);
  const mattressPositions = mattressGeometry.attributes.position, mattressUV = mattressGeometry.attributes.uv;
  for (let i = 0; i < mattressPositions.count; i++) mattressUV.setXY(i, mattressPositions.getX(i) / 2.2 + .5, .5 - mattressPositions.getZ(i) / 1.05);
  const mattress = new THREE.Mesh(mattressGeometry, [mattressFabric, mattressSide]); mattress.name = 'torn-mattress'; mattress.position.x = .2; mattress.scale.x = -1;
  mattress.castShadow = true; mattress.receiveShadow = true; bed.add(mattress);
  const foam = beveledBox(.27, .067, .27, .008, 1.15, .043, .39, mat('#a39b73', .99, { map: concreteMap, bumpMap: concreteRelief, bumpScale: .012 }), bed); foam.name = 'exposed-foam';
  const springs = new THREE.InstancedMesh(new THREE.TorusGeometry(.023, .004, 4, 12), rust, 3), springDummy = new THREE.Object3D();
  for (let i = 0; i < 3; i++) { springDummy.position.set(1.24 - i * .063, .037, .52); springDummy.rotation.z = i * .2; springDummy.updateMatrix(); springs.setMatrixAt(i, springDummy.matrix); }
  springs.name = 'exposed-springs'; bed.add(springs);
  const pillow = beveledBox(.5, .075, .42, .018, .68, .158, 0, mat('#c0c0ad', .99, { map: fabricMap, bumpMap: fabricBump, bumpScale: .004 }), bed); pillow.name = 'pillow';
  pillow.rotation.y = -.055;
  // The folded blanket lies on the far edge, away from the child's z=±.255 hands.
  const blanketGeometry = new THREE.PlaneGeometry(1.5, .17, 16, 4); blanketGeometry.rotateX(-Math.PI / 2);
  const blanketVertices = blanketGeometry.attributes.position;
  for (let i = 0; i < blanketVertices.count; i++) {
    const x = blanketVertices.getX(i), z = blanketVertices.getZ(i);
    blanketVertices.setY(i, .139 + Math.sin(x * 16 + z * 15) * .017 + Math.cos(x * 6 - z * 21) * .012);
  }
  blanketGeometry.computeVertexNormals();
  const blanket = new THREE.Mesh(blanketGeometry, mat('#637277', .98, { map: fabricMap, bumpMap: fabricBump, bumpScale: .006, side: THREE.DoubleSide }));
  blanket.name = 'folded-blanket'; blanket.position.set(-.04, 0, -.43); blanket.castShadow = true; blanket.receiveShadow = true; bed.add(blanket);
  // Low vent: first readable jump, open space around it.
  beveledBox(1.6, .76, 1.08, .035, 7, .38, 0, zinc);
  beveledBox(1.68, .09, 1.15, .018, 7, .805, 0, rimMat);
  box(1.38, .46, .025, 7, .4, .55, black);
  for (let i = 0; i < 7; i++) {
    const louver = box(1.35, .025, .08, 7, .22 + i * .06, .58, zinc);
    louver.rotation.x = -.3;
  }
  box(1.3, .025, .86, 7, .8375, 0, zinc);
  // Tall flue: reachable from the movable crate.
  cylinder(.265, 1.42, 17, .71, 0, darkMetal);
  cylinder(.305, .13, 17, .065, 0, zinc);
  cylinder(.292, .055, 17, 1.22, 0, zinc);
  cylinder(.285, .07, 17, 1.455, 0, zinc);
  box(.25, .02, .25, 17, 1.495, 0, black);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.36, .16, 16), zinc);
  cap.position.set(17, 1.57, 0); cap.castShadow = true; world.add(cap);
  // Main crate, locally rooted so physics can move the whole prop.
  const crate = new THREE.Group(); crate.position.set(13, 0, 0); world.add(crate);
  const wood = mat('#8c8571', .91, { map: woodMap, bumpMap: woodMap, bumpScale: .012 });
  const woodDark = mat('#615e4d', .91, { map: woodMap });
  const strap = mat('#4b5651', .67, { metalness: .4 });
  box(1.1, .85, .82, 0, .425, 0, woodDark, crate);
  for (let i = 0; i < 5; i++) box(.204, .8, .025, -.43 + i * .215, .425, .425, wood, crate);
  for (const x of [-.4, .4]) {
    box(.075, .87, .86, x, .435, 0, strap, crate);
    for (const y of [.12, .74]) {
      const bolt = new THREE.Mesh(new THREE.SphereGeometry(.024, 7, 5), zinc); bolt.position.set(x, y, .442); crate.add(bolt);
    }
  }
  box(1.11, .07, .86, 0, .06, 0, wood, crate);
  box(1.11, .065, .86, 0, .82, 0, wood, crate);
  // A faded shipping mark gives the crate scale.
  const mark = document.createElement('canvas'); mark.width = 128; mark.height = 64;
  const mc = mark.getContext('2d'); mc.fillStyle = '#ded9bf'; mc.globalAlpha = .7; mc.font = 'bold 28px monospace'; mc.fillText('09', 22, 43);
  const markMap = new THREE.CanvasTexture(mark); markMap.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(.35, .18), new THREE.MeshStandardMaterial({ map: markMap, transparent: true, roughness: 1, depthWrite: false }));
  label.position.set(0, .45, .446); crate.add(label);
  // Rooftop access house, door facing the viewer behind the walking path.
  box(4.0, 3.2, 2.0, 39, 2.05, -1.55, wallMat);
  beveledBox(4.22, .18, 2.2, .025, 39, 3.74, -1.55, roofMat);
  box(4.2, .09, .18, 39, 3.69, -.46, rimMat);
  const door = new THREE.Group(); door.position.set(38.5, .45, -.505); world.add(door);
  box(1.18, 2.28, .12, 0, 1.14, 0, black, door);
  box(1.02, 2.16, .06, 0, 1.08, .075, darkMetal, door);
  const warmGlass = mat('#e5c88c', .58, { emissive: '#c39345', emissiveIntensity: .65 });
  box(.72, .5, .02, 0, 1.62, .115, warmGlass, door);
  box(.72, .025, .025, 0, 1.62, .137, darkMetal, door);
  box(.025, .5, .025, 0, 1.62, .137, darkMetal, door);
  const knob = cylinder(.022, .12, .38, 1.0, .15, zinc, door); knob.rotation.z = Math.PI / 2;
  box(1.28, .1, .65, 0, .035, .12, rimMat, door);
  box(.3, .065, .16, 0, 2.51, .07, zinc, door);
  box(.24, .025, .12, 0, 2.47, .08, warmGlass, door);
  const doorLight = new THREE.PointLight('#f7c875', 14, 5, 2);
  doorLight.position.set(38.5, 2.85, .1); world.add(doorLight);
  // Cable, an old junction box, a small TV aerial and two background flues.
  box(.48, .67, .15, 40.45, 1.2, -.47, darkMetal);
  wire([[38.5, 3.0, -.35], [39.3, 2.8, -.36], [40.45, 2.93, -.37], [40.45, 1.6, -.37]]);
  for (const [x, height, z] of [[3.0, .6, -1.5], [30.2, 1.0, -1.55]]) {
    cylinder(.13, height, x, (x > 23 ? .45 : 0) + height / 2, z, zinc);
    cylinder(.2, .06, x, (x > 23 ? .45 : 0) + height, z, darkMetal);
  }
  cylinder(.035, 3.2, 33, 2.05, -1.9, zinc);
  for (let i = 0; i < 6; i++) box(.9 - Math.abs(i - 2) * .1, .025, .025, 33, 2.2 + i * .22, -1.9, zinc);
  wire([[33, .5, -1.9], [33.25, .46, -1.8], [35, .46, -1.8], [37, .48, -1.8]]);
  // City layers: intact apartment slabs with staggered setbacks and muted facades.
  const colors = ['#687c80', '#63787e', '#738486', '#61757b', '#7c8a89'];
  const cityMaterials = colors.map(color => mat(color, .98, { map: concreteMap }));
  for (let layer = 0; layer < 3; layer++) {
    const z = [-24, -48, -77][layer], count = layer === 0 ? 9 : 12;
    for (let i = 0; i < count; i++) {
      const seed = 1000 + layer * 131 + i * 37;
      const width = 7.5 + random(seed) * 7.5;
      const center = -47 + i * (layer === 0 ? 14 : 17) + layer * 4;
      const top = -5.5 + random(seed + 1) * 20 - layer * 1.1;
      const depth = 5 + random(seed + 2) * 7;
      const material = cityMaterials[(i + layer * 2) % cityMaterials.length];
      box(width, top + 40, depth, center, (top - 40) / 2, z - depth / 2, material, world, false);
      box(width + .18, .22, depth + .1, center, top + .1, z - depth / 2, material, world, false);
      facade(center, width, top, layer === 0 ? -30 : -24, z + .02, seed, layer === 2 ? 1.9 : 1.7, .66, 1.2);
      // Narrow glazed stairwells and a few cantilever balconies break the slab rhythm.
      const stairX = center + width * .22;
      box(.62, top + 39, .035, stairX, (top - 39) / 2, z + .045, darkMetal, world, false);
      if (layer < 2) {
        for (let row = 0; row < Math.min(13, Math.floor((top + 36) / 2.4)); row++) {
          stairGlass.push({ x: stairX, y: top - 1.85 - row * 2.4, z: z + .072, w: .46, h: 1.7 });
          if (layer === 0 && i % 3 === 1 && row < 7) {
            const bx = center - width * .29, by = top - 2.6 - row * 2.4;
            box(1.45, .11, .9, bx, by, z + .43, balconyMat, world, false);
            box(1.42, .55, .07, bx, by + .32, z + .85, balconyMat, world, false);
            box(.06, .55, .76, bx - .68, by + .32, z + .44, darkMetal, world, false);
            box(.06, .55, .76, bx + .68, by + .32, z + .44, darkMetal, world, false);
            box(1.4, .035, .06, bx, by + .61, z + .85, zinc, world, false);
          }
        }
      }
      for (let x = center - width / 2 + 3.4; x < center + width / 2; x += 3.4) {
        box(.025, top + 39, .022, x, (top - 39) / 2, z + .035, darkMetal, world, false);
      }
      if (random(seed + 3) > .45) {
        cylinder(.07, 2.1, center + width * .28, top + 1.1, z - 1.5, zinc).castShadow = false;
        box(1.4, .03, .03, center + width * .28, top + 1.8, z - 1.5, darkMetal, world, false);
      }
    }
  }
  // Industrial silhouettes give each layer an identity without adding draw calls:
  // these beams and tanks enter the same static primitive batches as the city.
  function structuralBeam(a, b, thickness = .09, material = darkMetal) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const center = from.clone().add(to).multiplyScalar(.5);
    const beam = box(thickness, direction.length(), thickness, center.x, center.y, center.z, material, world, false);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return beam;
  }
  for (const [cx, z, top, span] of [[18, -44, 18, 23], [-28, -69, 16, 17]]) {
    for (const dx of [-.25, .25]) structuralBeam([cx + dx, 0, z], [cx + dx, top, z], .12);
    for (let y = .8; y < top - .8; y += 2) {
      structuralBeam([cx - .25, y, z], [cx + .25, y + 1.8, z], .045);
      structuralBeam([cx + .25, y, z], [cx - .25, y + 1.8, z], .045);
    }
    box(span, .12, .32, cx + span * .22, top, z, darkMetal, world, false);
    box(span, .09, .09, cx + span * .22, top + .85, z, darkMetal, world, false);
    for (let x = cx - span * .28; x < cx + span * .72; x += 2.1) structuralBeam([x, top, z], [Math.min(x + 2.1, cx + span * .72), top + .85, z], .045);
    box(1.2, .8, .7, cx - span * .23, top - .15, z, zinc, world, false);
    structuralBeam([cx + span * .6, top, z], [cx + span * .6, top - 6, z], .018);
    box(.28, .12, .15, cx + span * .6, top - 6, z, darkMetal, world, false);
  }
  for (const [x, y, z] of [[8.2, 10.4, -26], [49.5, 11, -28], [-35, 4, -51]]) {
    // Old rooftop water tanks, supported on visible narrow legs.
    cylinder(.65, 1.15, x, y + 1.65, z, zinc).castShadow = false;
    cylinder(.7, .1, x, y + 2.28, z, darkMetal).castShadow = false;
    cylinder(.68, .1, x, y + 1.08, z, darkMetal).castShadow = false;
    for (const dx of [-.4, .4]) for (const dz of [-.35, .35]) structuralBeam([x + dx, y, z + dz], [x + dx, y + 1.1, z + dz], .07);
  }
  // Set-back ventilation banks and roof service runs never enter the playable lane.
  for (const [bx, by, bz] of [[-5, 3.05, -26], [23, 9.25, -27]]) {
    for (let i = 0; i < 3; i++) {
      box(.85, .55, .75, bx + i * 1.05, by + .275, bz, zinc, world, false);
      for (let slot = 0; slot < 4; slot++) box(.65, .025, .025, bx + i * 1.05, by + .13 + slot * .09, bz + .39, darkMetal, world, false);
    }
    box(3.4, .08, .16, bx + 1.1, by + .08, bz - .5, darkMetal, world, false);
  }
  // An elevated tram line lives well below the rooftop; it is glimpsed beyond edges.
  box(118, .15, .65, 7, -7.2, -18, darkMetal, world, false);
  for (let x = -45; x < 65; x += 15) {
    box(.32, 17, .4, x, -15.8, -18, darkMetal, world, false);
    structuralBeam([x, -7.2, -18], [x + 2, -9.1, -18], .15);
  }
  const tram = new THREE.Group(); tram.position.set(-22, -6.68, -17.85); world.add(tram);
  const tramBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), darkMetal, 3);
  const tramWindows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat('#a49f88', .83, { emissive: '#9b977b', emissiveIntensity: .16 }), 18);
  const tramDummy = new THREE.Object3D();
  for (let car = 0; car < 3; car++) {
    tramDummy.position.set(car * 3.7, 0, 0); tramDummy.scale.set(3.5, .84, .63); tramDummy.updateMatrix(); tramBody.setMatrixAt(car, tramDummy.matrix);
    for (let w = 0; w < 6; w++) {
      tramDummy.position.set(car * 3.7 - 1.4 + w * .55, .12, .326); tramDummy.scale.set(.37, .33, 1); tramDummy.updateMatrix(); tramWindows.setMatrixAt(car * 6 + w, tramDummy.matrix);
    }
  }
  tram.add(tramBody, tramWindows);
  // Two tiny roof workers are readable only as distant silhouettes.
  for (const [x, y, z] of [[20.3, 9.25, -26], [21.4, 9.25, -26.4]]) {
    box(.21, .49, .16, x, y + .48, z, darkMetal, world, false);
    cylinder(.115, .19, x, y + .83, z, darkMetal).castShadow = false;
    for (const dx of [-.065, .065]) box(.055, .25, .06, x + dx, y + .125, z, darkMetal, world, false);
  }
  function instancedWindows(list, material) {
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, list.length);
    const dummy = new THREE.Object3D(), color = new THREE.Color();
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z); dummy.scale.set(p.w, p.h, 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      if (list === panes) { color.setRGB(.58 + p.shade * .24, .63 + p.shade * .22, .66 + p.shade * .24); mesh.setColorAt(i, color); }
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.receiveShadow = true; world.add(mesh); return mesh;
  }
  instancedWindows(panes, mat('#29414b', .63, { metalness: .12 }));
  const warmWindows = instancedWindows(warmPanes, mat('#c8b383', .79, { emissive: '#d8ae61', emissiveIntensity: .28 }));
  const warmColor = new THREE.Color();
  instancedWindows(frames, mat('#8b9690', .96));
  instancedWindows(stairGlass, glass);
  // All puddles share a low-poly irregular outline and render in two instanced draws.
  const waterShape = new THREE.Shape();
  for (let i = 0; i <= 32; i++) {
    const a = i / 32 * Math.PI * 2, r = 1 + .11 * Math.sin(a * 3 + 1) + .07 * Math.cos(a * 7);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) waterShape.moveTo(x, y); else waterShape.lineTo(x, y);
  }
  waterShape.closePath();
  const waterGeometry = new THREE.ShapeGeometry(waterShape, 1); waterGeometry.rotateX(-Math.PI / 2);
  function waterInstances(list, material) {
    const mesh = new THREE.InstancedMesh(waterGeometry, material, list.length), dummy = new THREE.Object3D();
    list.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.scale.set(p.sx, 1, p.sz); dummy.rotation.y = p.angle; dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.instanceMatrix.needsUpdate = true; mesh.receiveShadow = true; world.add(mesh);
  }
  waterInstances(dampPatches, dampMat); waterInstances(wetPatches, wetMat);
  // Short frayed ties breathe in the wind behind the walking lane.
  const tieMaterial = mat('#898d7b', .96, { side: THREE.DoubleSide });
  for (const [x, y] of [[4.2, 1], [10, 1], [28, 1.45]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, y, -2.34);
    const tieShape = new THREE.Shape(); tieShape.moveTo(0, 0); tieShape.lineTo(.07, -.02); tieShape.lineTo(.055, -.24); tieShape.lineTo(.015, -.31); tieShape.lineTo(.02, -.13); tieShape.closePath();
    const tie = new THREE.Mesh(new THREE.ShapeGeometry(tieShape), tieMaterial); pivot.add(tie); world.add(pivot); ribbons.push(pivot);
  }
  // Aerial cables bridge the background rather than the actual jumping gap.
  wire([[-8, 7, -23], [12, 3.2, -25], [37, 8, -26]], '#293d45', .025);
  wire([[26, 12, -48], [47, 7, -49], [72, 11, -48]], '#354a53', .025);
  // Thin translucent cloud wisps rolling between tower layers.
  const mist = [];
  const mistCanvas = document.createElement('canvas'); mistCanvas.width = 256; mistCanvas.height = 64;
  const fc = mistCanvas.getContext('2d'), cloud = fc.createImageData(256, 64);
  // Elliptical falloff reaches exact zero on every texture edge: no sprite bands.
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 256; x++) {
      const nx = (x - 127.5) / 127.5, ny = (y - 31.5) / 31.5;
      const falloff = Math.max(0, 1 - nx * nx - ny * ny), i = (y * 256 + x) * 4;
      cloud.data[i] = 172; cloud.data[i + 1] = 190; cloud.data[i + 2] = 193;
      cloud.data[i + 3] = Math.round(255 * .22 * falloff * falloff);
    }
  }
  fc.putImageData(cloud, 0, 0);
  const mistTexture = new THREE.CanvasTexture(mistCanvas); mistTexture.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < 6; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTexture, transparent: true, depthWrite: false, opacity: .23, fog: true }));
    sprite.position.set(-17 + i * 21, -3 + random(i + 17) * 6, -9 - i * 5);
    sprite.scale.set(32 + i * 4, 5, 1); sprite.userData.startX = sprite.position.x; mist.push(sprite); world.add(sprite);
  }
  // A distant security searchlight wakes up while the sleeping child remains protected.
  const searchOrigin = new THREE.Vector3(-5, 4.25, -23.6);
  box(.14, 1.1, .14, -5, 3.6, -24, darkMetal, world, false);
  box(.7, .15, .5, -5, 3.1, -24, zinc, world, false);
  const searchRig = new THREE.Group(); searchRig.position.copy(searchOrigin); world.add(searchRig);
  const searchLength = 20;
  const beamGeometry = new THREE.ConeGeometry(1.55, searchLength, 18, 1, true); beamGeometry.translate(0, -searchLength / 2, 0);
  const beamMaterial = new THREE.MeshBasicMaterial({ color: '#c0d7df', transparent: true, opacity: .029, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: true });
  const searchBeam = new THREE.Mesh(beamGeometry, beamMaterial); searchRig.add(searchBeam);
  const beaconMaterial = new THREE.MeshBasicMaterial({ color: '#c8dfe6', transparent: true, opacity: .8, fog: true });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.105, 8, 6), beaconMaterial); searchRig.add(beacon);
  searchRig.visible = false;
  const searchDirection = new THREE.Vector3(), beamDown = new THREE.Vector3(0, -1, 0);
  // The waking place is protected; only the distant searchlight drives the opening.
  let openingState = { active: false, elapsed: 0, wake: 0, escaped: false }, beamArmed = false, lastWorldTime = 0;
  const opening = {
    reset() {
      openingState = { active: false, elapsed: 0, wake: 0, escaped: false }; beamArmed = false;
      searchRig.visible = false;
    },
    update(state = {}) {
      openingState = { ...openingState, ...state };
      if (Number.isFinite(openingState.wake) && openingState.wake >= .5 && (openingState.active || openingState.escaped)) beamArmed = true;
    },
    get state() { return { beamOn: beamArmed, stoneFalling: false, escaped: !!openingState.escaped }; }
  };
  function updateOpening(time) {
    searchRig.visible = beamArmed;
    if (beamArmed) {
      searchDirection.set(.45 + Math.sin(time * .24) * .55, -.15 + Math.sin(time * .17) * .035, 1).normalize();
      searchRig.quaternion.setFromUnitVectors(beamDown, searchDirection);
      beaconMaterial.opacity = .7 + Math.sin(time * 1.8) * .1;
    }
  }
  // Consolidate static set dressing without touching the moving crate, door or mist.
  // Shared unit primitives retain individual transforms and normals in a handful of draws.
  const batches = new Map(), disposedGeometry = new Set();
  for (const child of [...world.children]) {
    const type = child.geometry?.type;
    if (!child.isMesh || child.isInstancedMesh || child.userData.keepDynamic || !['BoxGeometry', 'CylinderGeometry'].includes(type)) continue;
    const p = child.geometry.parameters;
    if (type === 'CylinderGeometry' && p.radiusTop !== p.radiusBottom) continue;
    const key = `${type}/${child.material.uuid}/${child.castShadow}/${child.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, { type, material: child.material, castShadow: child.castShadow, receiveShadow: child.receiveShadow, instances: [] });
    child.updateMatrix();
    const scale = type === 'BoxGeometry' ? [p.width, p.height, p.depth] : [p.radiusTop, p.height, p.radiusTop];
    batches.get(key).instances.push(child.matrix.clone().multiply(new THREE.Matrix4().makeScale(...scale)));
    world.remove(child); disposedGeometry.add(child.geometry);
  }
  for (const batch of batches.values()) {
    const geometry = batch.type === 'BoxGeometry' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.CylinderGeometry(1, 1, 1, 16);
    const mesh = new THREE.InstancedMesh(geometry, batch.material, batch.instances.length);
    batch.instances.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = batch.castShadow; mesh.receiveShadow = batch.receiveShadow; world.add(mesh);
  }
  for (const geometry of disposedGeometry) geometry.dispose();
  return { crate, door, doorLight, world, opening, restArea, update(time, playerX = 0, openingUpdate) {
    lastWorldTime = Number.isFinite(time) ? time : lastWorldTime;
    if (openingUpdate) opening.update(openingUpdate);
    updateOpening(lastWorldTime);
    tram.position.x = -35 + ((lastWorldTime * .65) % 100);
    if (warmPanes.length) {
      warmColor.setScalar(.87 + Math.sin(lastWorldTime * .3) * .13); warmWindows.setColorAt(0, warmColor);
      if (warmPanes.length > 17) { warmColor.setScalar(.82 + Math.sin(lastWorldTime * .21 + 2) * .18); warmWindows.setColorAt(17, warmColor); }
      warmWindows.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < ribbons.length; i++) { ribbons[i].rotation.x = .12 + Math.sin(time * 2.2 + i * 1.7) * .18; ribbons[i].rotation.z = Math.sin(time * 1.8 + i) * .12; }
    for (let i = 0; i < mist.length; i++) mist[i].position.x = mist[i].userData.startX + Math.sin(time * .017 + i) * 7;
    doorLight.intensity = 14 * (.98 + Math.sin(time * 1.7) * .012);
  } };
}
