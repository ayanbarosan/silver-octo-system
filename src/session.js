import {LEVEL} from './level.js';
import {TUTORIAL_IDS} from './tutorial.js';

export const DEFAULT_SETTINGS=Object.freeze({hints:false,sound:true,volume:.65,brightness:1});
const SETTINGS_KEY='runaway.settings.v1',SAVE_KEY='runaway.save.v1';
const EDGE_INSET=.23,BODY_RADIUS=.21,SURFACE_TOLERANCE=.025,EPSILON=1e-7;
const mattress=Object.freeze({x:-.9,w:2.2,y:.12});
const vent=Object.freeze({x:6.2,w:1.6,y:.85});
const pipe=Object.freeze({x:16.725,w:.55,y:1.65});
const guard=Object.freeze({x:-1.04,w:.18,y:1.32});
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const inRange=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const copySave=value=>value?{...value,player:{...value.player},learnedMechanics:[...value.learnedMechanics]}:null;
const learnedFrom=value=>Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&TUTORIAL_IDS.includes(id)))]:[];

function settingsFrom(value,base=DEFAULT_SETTINGS){
  const settings={...base};
  if(!record(value))return settings;
  for(const key of ['hints','sound'])if(typeof value[key]==='boolean')settings[key]=value[key];
  if(inRange(value.volume,0,1))settings.volume=value.volume;
  if(inRange(value.brightness,.7,1.3))settings.brightness=value.brightness;
  return settings;
}

function normalizeSave(value,requireGrounded=false){
  if(!record(value)||value.version!==1||!record(value.player))return null;
  const {player,checkpoint,crateX,bridgeBroken,slipPlayed,awakened}=value;
  if(!Number.isInteger(checkpoint)||checkpoint<0||checkpoint>LEVEL.checkpoints.length)return null;
  if(!inRange(crateX,10.5,16)||typeof bridgeBroken!=='boolean'||typeof slipPlayed!=='boolean'||typeof awakened!=='boolean')return null;
  if(!Number.isFinite(player.x)||!Number.isFinite(player.y)||(player.face!==1&&player.face!==-1))return null;
  if(requireGrounded&&player.grounded!==true)return null;

  const crate={x:crateX-.55,w:1.1,y:.85};
  const surfaces=[...Object.values(LEVEL.roofs),mattress,vent,crate,pipe];
  const blockers=[mattress,vent,crate,pipe,guard,LEVEL.roofs.final];
  const supports=surfaces.filter(surface=>
    player.x>=surface.x+EDGE_INSET-EPSILON&&player.x<=surface.x+surface.w-EDGE_INSET+EPSILON&&
    Math.abs(player.y-surface.y)<=SURFACE_TOLERANCE+EPSILON
  ).sort((a,b)=>b.y-a.y);
  const support=supports.find(surface=>!blockers.some(blocker=>
    surface.y<blocker.y-SURFACE_TOLERANCE&&
    player.x+BODY_RADIUS>blocker.x+EPSILON&&player.x-BODY_RADIUS<blocker.x+blocker.w-EPSILON
  ));
  if(!support)return null;
  return {version:1,checkpoint,player:{x:player.x,y:support.y,face:player.face},crateX,bridgeBroken,slipPlayed,awakened,learnedMechanics:learnedFrom(value.learnedMechanics)};
}

// Save only settled feet on permanent geometry. Transient ladders, jumps,
// mantles and broken planks resume from the most recent stable floor instead.
export function createSaveSnapshot(value){
  if(!record(value))return null;
  return normalizeSave({...value,version:1},true);
}

export function createSession(storage=undefined){
  let store=storage;
  if(store===undefined){try{store=globalThis.localStorage;}catch{store=null;}}
  function read(key){
    try{const raw=store?.getItem(key);return typeof raw==='string'?JSON.parse(raw):null;}catch{return null;}
  }
  function write(key,value){try{store?.setItem(key,JSON.stringify(value));}catch{/* The current session remains usable without browser storage. */}}
  const storedSettings=read(SETTINGS_KEY);
  let settings=settingsFrom(record(storedSettings)&&storedSettings.version===1?storedSettings:null);
  let saved=normalizeSave(read(SAVE_KEY));
  return {
    getSettings(){return {...settings};},
    setSettings(patch){settings=settingsFrom(patch,settings);write(SETTINGS_KEY,{version:1,...settings});return {...settings};},
    getSave(){return copySave(saved);},
    save(snapshot){
      const next=normalizeSave(snapshot);
      if(!next)return false;
      saved=next;write(SAVE_KEY,saved);return true;
    },
    clearSave(){
      saved=null;
      try{store?.removeItem(SAVE_KEY);}catch{write(SAVE_KEY,null);}
    }
  };
}
