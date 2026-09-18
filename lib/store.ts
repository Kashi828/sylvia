import { hashDeviceToken, tokenMatchesHash, generateDeviceToken, tokenFingerprint } from './device-auth';

export type ServerDevice={id:number;name:string;type:string;tokenHash:string;tokenPreview:string;online:boolean;temperature:number;battery:number;lastSeen:string};
export type ServerStream={id:number;name:string;deviceId:number;type:'Number'|'Boolean'|'String';unit:string;value:string|number|boolean;updatedAt:string};

const seed=(token:string)=>({tokenHash:hashDeviceToken(token),tokenPreview:tokenFingerprint(token)});
const initialDevices:ServerDevice[]=[];
const initialStreams:ServerStream[]=[];

type DeviceCommand={id:string;deviceId:number;command:string;payload:unknown;createdAt:string;deliveredAt?:string;ackedAt?:string;result?:unknown};
type Store={devices:ServerDevice[];streams:ServerStream[];events:{id:number;type:string;deviceId?:number;streamId?:number;message:string;createdAt:string}[];commands:Record<number,DeviceCommand[]>;inflight:Record<string,DeviceCommand>};
const g=globalThis as typeof globalThis & {__sylviaStore?:Store};
if(!g.__sylviaStore)g.__sylviaStore={devices:structuredClone(initialDevices),streams:structuredClone(initialStreams),events:[],commands:{},inflight:{}};
export const store=g.__sylviaStore;
export function findDevice(id:number){return store.devices.find(d=>d.id===id)}
export function findStream(id:number){return store.streams.find(s=>s.id===id)}
export function addEvent(type:string,message:string,deviceId?:number,streamId?:number){store.events.unshift({id:Date.now()+Math.floor(Math.random()*999),type,message,deviceId,streamId,createdAt:new Date().toISOString()});store.events=store.events.slice(0,100)}
export function extractBearer(request:Request){const value=request.headers.get('authorization')||'';return value.replace(/^Bearer\s+/i,'').trim()||null}
export function authenticateDeviceToken(token:string|undefined, deviceId?:number){
  if(!token)return null;
  const device=deviceId===undefined ? store.devices.find(d=>tokenMatchesHash(token,d.tokenHash)) : store.devices.find(d=>d.id===deviceId && tokenMatchesHash(token,d.tokenHash));
  return device ?? null;
}
export function validBearer(requestOrToken:Request|string, deviceId?:number){
  const token=typeof requestOrToken==='string'?requestOrToken:extractBearer(requestOrToken);
  const device=authenticateDeviceToken(token||undefined,deviceId);
  return device ? token : null;
}
export function findDeviceByToken(token:string){return authenticateDeviceToken(token)}
export function issueDeviceToken(){return generateDeviceToken()}
export function createDevice(name:string,type:string){
  const token=generateDeviceToken();
  const device:ServerDevice={
    id:Date.now()+Math.floor(Math.random()*1000),
    name:name.trim(),
    type:type.trim()||'ESP32 Device',
    ...seed(token),
    online:false,
    temperature:0,
    battery:0,
    lastSeen:new Date(0).toISOString(),
  };
  store.devices.push(device);
  return {device,token};
}
export function rotateDeviceToken(deviceId:number){const device=findDevice(deviceId);if(!device)return null;const token=generateDeviceToken();device.tokenHash=hashDeviceToken(token);device.tokenPreview=tokenFingerprint(token);return {device,token}}
export function publicDevice(device:ServerDevice){const {tokenHash,...safe}=device;return safe}
export function queueCommand(deviceId:number,command:string,payload:unknown=null){const item={id:`cmd_${Date.now()}_${Math.floor(Math.random()*9999)}`,deviceId,command,payload,createdAt:new Date().toISOString()};(store.commands[deviceId]??=[]).push(item);return item}
export function markCommandInFlight(commandId:string){
  for(const queue of Object.values(store.commands)){
    const index=queue.findIndex(item=>item.id===commandId);
    if(index>=0){
      const [item]=queue.splice(index,1);
      item.deliveredAt=new Date().toISOString();
      store.inflight[item.id]=item;
      return item;
    }
  }
  return store.inflight[commandId] ?? null;
}
export function takeCommands(deviceId:number,limit=10){const queue=store.commands[deviceId]??[];const items=queue.splice(0,Math.max(1,Math.min(limit,50)));store.commands[deviceId]=queue;for(const item of items){item.deliveredAt=new Date().toISOString();store.inflight[item.id]=item}return items}
export function ackCommand(deviceId:number,commandId:string,result:unknown=null){const item=store.inflight[commandId];if(!item||item.deviceId!==deviceId)return null;item.ackedAt=new Date().toISOString();item.result=result;delete store.inflight[commandId];return item}
