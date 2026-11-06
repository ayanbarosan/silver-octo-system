// One layout shared by the scenery, collision surfaces and checkpoints.
export const LEVEL = Object.freeze({
  roofs: Object.freeze({
    first: Object.freeze({ x: -1, w: 23, y: 0 }),
    middle: Object.freeze({ x: 24.2, w: 7.4, y: .45 }),
    landing: Object.freeze({ x: 34.4, w: 3.6, y: .45 }),
    final: Object.freeze({ x: 38, w: 15.2, y: 4.65 })
  }),
  bridge: Object.freeze({ x: 31.3, w: 3.4, y: .47, z: 0, safeX: 34.95 }),
  finalOffset: 10.2,
  doorX: 48.7,
  slipPuddle: Object.freeze({x:9.75,w:1.0,y:0,z:0,centerX:10.3335,centerZ:-.38,sx:1.15,sz:.38,angle:1.026}),
  ladder: Object.freeze({
    wallX: 38, x: 37.58, rungX: 37.82, bottomY: .45, topY: 4.65,
    rungBaseY: .65, spacing: .30, width: .58, exitX: 38.65
  }),
  checkpoints: Object.freeze([
    Object.freeze({ x: 25.4, y: .45 }),
    Object.freeze({ x: 35.6, y: .45 }),
    Object.freeze({ x: 39.2, y: 4.65 })
  ])
});
