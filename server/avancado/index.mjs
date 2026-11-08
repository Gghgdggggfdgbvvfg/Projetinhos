import { fork, execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { DatabaseSync } from "node:sqlite";
import { initial, partition, transition } from "../../dist/avancado/domain.js";

const api="/api/avancado";
const ids=new Set("social market stream bank micro gateway queue saas recommend chat distrib traffic events notify ci kafka cloud".split(" "));
const movie=fileURLToPath(new URL("../../dist/avancado/orbita.mp4",import.meta.url));
const catalog=new Map(Array.from({length:10000},(_,id)=>[id,JSON.stringify({id,title:"Peça "+id,family:id%37})]));
const services=new Map(), pending=new Map(), sockets=new Set(), locks=new Map();
let db, checks;
function database() {
  if(db)return db;
  const file=process.env.AV_DB||resolve(".data","avancado.sqlite");
  if(file!==":memory:")mkdirSync(dirname(file),{recursive:true});
  db=new DatabaseSync(file);db.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS states (session TEXT, project TEXT, value TEXT, PRIMARY KEY(session,project));");
  return db;
}
const load=(session,id)=>{const row=database().prepare("SELECT value FROM states WHERE session=? AND project=?").get(session,id);return row?JSON.parse(row.value):initial(id);};
const save=(session,id,s)=>database().prepare("INSERT INTO states VALUES(?,?,?) ON CONFLICT(session,project) DO UPDATE SET value=excluded.value").run(session,id,JSON.stringify(s));
function sessionFor(req,res){
  const cookie=(req.headers.cookie||"").match(/(?:^|;\s*)av_session=([a-f0-9-]{36})(?:;|$)/);
  if(cookie)return cookie[1];const session=randomUUID();res.setHeader("Set-Cookie","av_session="+session+"; HttpOnly; SameSite=Strict; Path="+api);return session;
}
function json(res,code,value){
  res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify(value));
}
async function body(req){let text="";for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>8192)throw Error("Corpo muito grande.");}return JSON.parse(text);}
function service(name,op,payload){
  let child=services.get(name);
  if(!child){
    child=fork(fileURLToPath(new URL("./service.mjs",import.meta.url)),[],{stdio:["ignore","ignore","ignore","ipc"],execArgv:[]});
    services.set(name,child);
    child.on("message",({ticket,result,error})=>{const waiter=pending.get(ticket);if(!waiter)return;pending.delete(ticket);clearTimeout(waiter.timer);error?waiter.reject(Error(error)):waiter.resolve(result);});
    child.on("error",()=>{});child.on("exit",()=>{if(services.get(name)===child)services.delete(name);for(const [key,w] of pending)if(w.child===child){pending.delete(key);clearTimeout(w.timer);w.reject(Error("Serviço encerrou."));}});
  }
  return new Promise((resolve,reject)=>{const ticket=randomUUID();const timer=setTimeout(()=>{pending.delete(ticket);reject(Error("Tempo limite do serviço."));},3000);
    pending.set(ticket,{resolve,reject,timer,child});child.send({ticket,op,payload},err=>{if(err){clearTimeout(timer);pending.delete(ticket);reject(err);}});
  });
}
function sequential(key,task){
  const job=(locks.get(key)||Promise.resolve()).catch(()=>{}).then(task);locks.set(key,job);job.finally(()=>{if(locks.get(key)===job)locks.delete(key);}).catch(()=>{});return job;
}
async function apply(session,id,action,p){
  return sequential(session+"/"+id,async()=>{
    if(!p||typeof p!=="object"||Array.isArray(p))throw Error("Parâmetros inválidos.");
    const prev=load(session,id),state=transition(id,prev,action,p);
    if(id==="micro"){
      const order=state.orders[0], reserved=await service("estoque","reserve",{stock:prev.stock});
      if(!reserved)throw Error("Reserva indisponível.");
      const payment=await service("pagamento","charge",{accepted:order.accepted});
      const fulfillment=await service(order.accepted?"expedicao":"estoque","ship",{accepted:order.accepted});order.trace=[reserved,payment,fulfillment];
    }
    if(id==="distrib" && action==="put"){
      const key=String(p.key).trim().slice(0,200),n=partition(key);
      await Promise.all([n,(n+1)%3].map(i=>service("no-"+i,"write",{key,value:state.shards[i][key],session})));
    }
    save(session,id,state);return state;
  });
}
function media(req,res) {
  const {size}=statSync(movie);
  const headers={"Content-Type":"video/mp4","Accept-Ranges":"bytes"};
  const range=req.headers.range;
  let start=0,end=size-1;
  if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!m||(!m[1]&&!m[2])){res.writeHead(416,{"Content-Range":"bytes */"+size});res.end();return;}
    if(!m[1])start=Math.max(0,size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(Number(m[2]),end);}
    if(start>end||start>=size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{"Content-Range":"bytes */"+size});res.end();return;}
    headers["Content-Range"]="bytes "+start+"-"+end+"/"+size;
  }
  res.writeHead(range?206:200,{...headers,"Content-Length":end-start+1});
  if(req.method==="HEAD")res.end();else createReadStream(movie,{start,end}).pipe(res);
}
export async function handle(req,res,url) {
  if(!url.pathname.startsWith(api+"/"))return false;
  try{
    if(req.method==="POST" && req.headers.origin && new URL(req.headers.origin).host!==req.headers.host){json(res,403,{error:"Origem inválida."});return true;}
    const route=url.pathname.slice(api.length),id=route.slice("/state/".length);
    if(route==="/video" && ["GET","HEAD"].includes(req.method)){media(req,res);return true;}
    if(route==="/lookup" && req.method==="GET"){const raw=url.searchParams.get("id");const found=/^\d{1,4}$/.test(raw||"")&&catalog.get(Number(raw));
      if(!found)json(res,404,{error:"Peça desconhecida."});else{res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(found);}return true;}
    if(route==="/checks" && req.method==="POST"){
      const env={...process.env};
      delete env.NODE_TEST_CONTEXT;
      checks??=promisify(execFile)(process.execPath,["--test","--test-reporter=tap",fileURLToPath(new URL("./domain.test.mjs",import.meta.url))],{env,timeout:15000,windowsHide:true})
        .then(({stdout})=>stdout.split(/\r?\n/).filter(x=>/^ok \d/.test(x)))
        .finally(()=>{checks=null;});
      json(res,200,{lines:await checks});return true;
    }
    if(!route.startsWith("/state/")||!ids.has(id)){json(res,404,{error:"Projeto desconhecido."});return true;}
    const session=id==="chat"?"sala":sessionFor(req,res);
    if(req.method==="GET")json(res,200,{state:load(session,id)});
    else if(req.method==="POST" && id!=="chat"){const {action,p}=await body(req);json(res,200,{state:await apply(session,id,action,p)});}
    else json(res,405,{error:"Método indisponível."});
  }catch(e){if(!res.headersSent)json(res,400,{error:e.message});}
  return true;
}
function frame(op,payload){
  const bytes=Buffer.from(payload);
  const width=bytes.length<126?0:bytes.length<=65535?2:8;
  const head=Buffer.alloc(2+width);
  head[0]=128|op;
  head[1]=width===0?bytes.length:width===2?126:127;
  if(width===2)head.writeUInt16BE(bytes.length,2);
  if(width===8)head.writeBigUInt64BE(BigInt(bytes.length),2);
  return Buffer.concat([head,bytes]);
}
function broadcast(state){const bytes=frame(1,JSON.stringify({state}));for(const socket of sockets){if(socket.writableLength>128*1024)socket.destroy();else socket.write(bytes);}}
export function attach(server){
  server.on("upgrade",(req,socket,head)=>{
    if(req.url!==api+"/chat"){socket.end("HTTP/1.1 404 Not Found\r\n\r\n");return;}
    if(req.headers.upgrade?.toLowerCase()!=="websocket"||req.headers["sec-websocket-version"]!=="13" || !/^[A-Za-z0-9+/]{22}==$/.test(req.headers["sec-websocket-key"]||"") || (req.headers.origin && req.headers.origin!==((req.socket.encrypted?"https://":"http://")+req.headers.host))){socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");return;}
    const accept=createHash("sha1").update(req.headers["sec-websocket-key"]+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: "+accept+"\r\n\r\n");
    sockets.add(socket);socket.write(frame(1,JSON.stringify({state:load("sala","chat")})));
    let buffer=Buffer.alloc(0),fragments=null,fragmentSize=0;
    const onData=chunk=>{
      buffer=Buffer.concat([buffer,chunk]);while(buffer.length>=2){
        const fin=!!(buffer[0]&128),op=buffer[0]&15;let size=buffer[1]&127,at=2;
        if(buffer[0]&112 || !(buffer[1]&128) || size===127){socket.destroy();return;}
        if(size===126){if(buffer.length<4)return;size=buffer.readUInt16BE(2);at=4;}
        if(size>8192 || (op>=8&&(!fin||size>125))){socket.destroy();return;}if(buffer.length<at+4+size)return;
        const mask=buffer.subarray(at,at+4),data=Buffer.from(buffer.subarray(at+4,at+4+size));for(let i=0;i<size;i++)data[i]^=mask[i%4];buffer=buffer.subarray(at+4+size);
        if(op===8){socket.end(frame(8,data));return;}if(op===9){socket.write(frame(10,data));continue;}if(op===10)continue;
        if((op!==1 && op!==0)||(op===1 && fragments!==null)||(op===0 && fragments===null)){socket.destroy();return;}
        if(op===1){fragments=[];fragmentSize=0;}fragmentSize+=size;if(fragmentSize>8192){socket.destroy();return;}fragments.push(data);if(!fin)continue;
        try{const msg=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(fragments)));fragments=null;
          const state=transition("chat",load("sala","chat"),"send",msg);save("sala","chat",state);broadcast(state);
        }catch(e){fragments=null;socket.write(frame(1,JSON.stringify({error:e.message})));} 
      }
    };socket.on("data",onData);socket.on("error",()=>{});socket.on("close",()=>sockets.delete(socket));if(head.length)onData(head);
  });
  server.on("close",()=>{for(const child of services.values())child.kill();services.clear();});
}
