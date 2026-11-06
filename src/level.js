// One layout shared by the scenery, collision surfaces and checkpoints.
export const LEVEL = Object.freeze({
  roofs: Object.freeze({
    first: Object.freeze({ x: -1, w: 23, y: 0 }),
    middle: Object.freeze({ x: 24.2, w: 7.4, y: .45 }),
    final: Object.freeze({ x: 34.4, w: 18.8, y: .45 })
  }),
  bridge: Object.freeze({ x: 31.3, w: 3.4, y: .47, z: 0, safeX: 34.95 }),
  finalOffset: 10.2,
  doorX: 48.7,
  checkpoints: Object.freeze([
    Object.freeze({ x: 25.4, y: .45 }),
    Object.freeze({ x: 35.6, y: .45 })
  ])
});
