/** Small pooled sprays and surface ripples. Coordinates use the wet surface Y. */
export function createWaterEffects(THREE, scene) {
  const DROP_COUNT = 192, RING_COUNT = 16, GRAVITY = 10;
  const root = new THREE.Group();
  root.name = 'WaterEffects';
  scene.add(root);
  let seed = 0x51a7c0de, dropCursor = 0, ringCursor = 0, emitted = 0;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const positions = new Float32Array(DROP_COUNT * 3);
  const sizes = new Float32Array(DROP_COUNT);
  const opacities = new Float32Array(DROP_COUNT);
  const drops = Array.from({length: DROP_COUNT}, () => ({active: false}));
  const rings = Array.from({length: RING_COUNT}, () => ({active: false}));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1).setUsage(THREE.DynamicDrawUsage));
  const uniforms = () => THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {uColor: {value: new THREE.Color('#c2d7de')}},
  ]);
  const dropMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms(), fog: true, transparent: true, depthWrite: false,
    vertexShader: `
      attribute float aSize;
      attribute float aOpacity;
      varying float vOpacity;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vOpacity = aOpacity;
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(aSize * 700.0 / max(0.1, -mvPosition.z), 1.0, 7.0);
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vOpacity;
      #include <fog_pars_fragment>
      void main() {
        vec2 point = (gl_PointCoord - 0.5) * vec2(2.4, 1.8);
        float coverage = 1.0 - smoothstep(0.18, 1.0, length(point));
        float alpha = coverage * vOpacity;
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(uColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  const spray = new THREE.Points(geometry, dropMaterial);
  spray.name = 'WaterDroplets';
  spray.frustumCulled = false;
  spray.renderOrder = 3;
  root.add(spray);

  const ringGeometry = new THREE.RingGeometry(.955, 1, 36);
  const ringAlpha = new Float32Array(RING_COUNT);
  ringGeometry.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(ringAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  const ringMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms(), fog: true, transparent: true, depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float aOpacity;
      varying float vOpacity;
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vOpacity = aOpacity;
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vOpacity;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        float radius = length((vUv - 0.5) * 2.0);
        float softEdge = smoothstep(.955, .967, radius) * (1.0 - smoothstep(.986, 1.0, radius));
        float alpha = vOpacity * softEdge;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(uColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  const ripples = new THREE.InstancedMesh(ringGeometry, ringMaterial, RING_COUNT);
  ripples.name = 'WaterRipples';
  ripples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ripples.frustumCulled = false;
  ripples.renderOrder = 2;
  root.add(ripples);
  const transform = new THREE.Object3D();
  transform.rotation.x = -Math.PI / 2;

  function updateDrop(index) {
    const p = drops[index], offset = index * 3;
    if (!p.active) {
      positions[offset] = 0; positions[offset + 1] = -1000; positions[offset + 2] = 0;
      sizes[index] = 0; opacities[index] = 0;
      return;
    }
    const progress = Math.min(1, p.age / p.life);
    positions[offset] = p.x; positions[offset + 1] = p.y; positions[offset + 2] = p.z;
    sizes[index] = p.size;
    opacities[index] = p.opacity * (1 - progress) ** 1.25;
  }
  function updateRing(index) {
    const ring = rings[index];
    if (!ring.active) {
      transform.position.set(0, -1000, 0); transform.scale.setScalar(0); ringAlpha[index] = 0;
    } else {
      const p = ring.age / ring.life;
      const radius = .045 + ring.radius * (1 - (1 - p) ** 1.7);
      transform.position.set(ring.x, ring.y, ring.z);
      transform.scale.set(radius, radius * .94, 1);
      ringAlpha[index] = ring.opacity * Math.min(1, p * 8) * (1 - p) ** 1.4;
    }
    transform.updateMatrix();
    ripples.setMatrixAt(index, transform.matrix);
  }
  function markBuffers() {
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aOpacity.needsUpdate = true;
    ripples.instanceMatrix.needsUpdate = true;
    ringGeometry.attributes.aOpacity.needsUpdate = true;
  }
  function splash({x, y, z = 0, strength = 1} = {}) {
    if (![x, y, z, strength].every(Number.isFinite) || strength <= 0) return;
    const force = Math.min(1.35, strength);
    const count = Math.min(30, Math.round(7 + force * 15));
    emitted++;
    root.visible = true;
    for (let n = 0; n < count; n++) {
      const index = dropCursor++ % DROP_COUNT, angle = random() * Math.PI * 2;
      const speed = (.22 + force * .95) * (.4 + random() * .6);
      const radius = .015 + random() * .06;
      const p = drops[index];
      Object.assign(p, {
        active: true,
        x: x + Math.cos(angle) * radius,
        y: y + .024 + random() * .023,
        z: z + Math.sin(angle) * radius,
        vx: Math.cos(angle) * speed,
        vy: (.4 + 2.7 * force ** .75) * (.65 + random() * .35),
        vz: Math.sin(angle) * speed,
        floor: y + .012, age: 0, life: .45 + random() * .34,
        opacity: .54 + random() * .28,
        size: .023 + random() * .033,
        landed: false,
      });
      updateDrop(index);
    }
    const index = ringCursor++ % RING_COUNT;
    Object.assign(rings[index], {
      active: true, x, y: y + .014, z, age: .025,
      life: .62 + force * .24,
      radius: .13 + force * .29,
      opacity: .17 + force * .13,
    });
    updateRing(index);
    markBuffers();
  }
  function update(dt) {
    if (!Number.isFinite(dt) || dt < 0) return;
    let active = 0;
    const drag = Math.exp(-1.2 * dt), horizontalStep = (1 - drag) / 1.2;
    for (let i = 0; i < DROP_COUNT; i++) {
      const p = drops[i];
      if (p.active) {
        p.age += dt;
        if (p.age >= p.life) p.active = false;
        else {
          p.x += p.vx * horizontalStep; p.z += p.vz * horizontalStep;
          p.vx *= drag; p.vz *= drag;
          if (!p.landed) {
            p.y += p.vy * dt - .5 * GRAVITY * dt * dt;
            p.vy -= GRAVITY * dt;
            if (p.y <= p.floor) {
              p.y = p.floor; p.vy = 0; p.landed = true;
              p.life = Math.min(p.life, p.age + .075);
            }
          }
          active++;
        }
      }
      updateDrop(i);
    }
    for (let i = 0; i < RING_COUNT; i++) {
      const p = rings[i];
      if (p.active) {
        p.age += dt;
        if (p.age >= p.life) p.active = false;
        else active++;
      }
      updateRing(i);
    }
    root.visible = active > 0;
    markBuffers();
  }
  function reset() {
    seed = 0x51a7c0de; dropCursor = ringCursor = emitted = 0;
    for (let i = 0; i < DROP_COUNT; i++) { drops[i].active = false; updateDrop(i); }
    for (let i = 0; i < RING_COUNT; i++) { rings[i].active = false; updateRing(i); }
    root.visible = false;
    markBuffers();
  }
  reset();
  return {
    splash, update, reset,
    get activeCount() { return drops.reduce((n, p) => n + Number(p.active), 0) + rings.reduce((n, p) => n + Number(p.active), 0); },
    get emittedCount() { return emitted; },
  };
}
