import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable, Writable} from 'node:stream';
import {EventEmitter, once} from 'node:events';
import {handle, attach} from './index.mjs';
import {projects} from '../../dist/avancado/index.js';

process.env.AV_DB=':memory:';
async function call(path, options={}) {
  const req=Readable.from([]);
  req.method=options.method||'GET';
  req.headers=options.headers||{};
  const chunks=[];
  const res=new Writable({write(chunk,encoding,done){chunks.push(chunk);done();}});
  res.headers={};
  res.setHeader=(name,value)=>{res.headers[name]=value;};
  res.writeHead=(status,headers)=>{res.status=status;Object.assign(res.headers,headers);};
  const finished=once(res,'finish');
  assert.equal(await handle(req,res,new URL('http://localhost/api/avancado'+path)),true);
  await finished;
  return {status:res.status,headers:res.headers,body:Buffer.concat(chunks)};
}

test('stream entrega bytes por faixa e informa limites', async()=>{
  const response=await call('/video',{headers:{range:'bytes=0-63'}});
  assert.equal(response.status,206);
  assert.equal(response.body.length,64);
  assert.match(response.headers['Content-Range'],/^bytes 0-63\//);
  assert.equal((await call('/video',{headers:{range:'bytes=-0'}})).status,416);
});

test('catálogo atende a última chave de dez mil registros', async()=>{
  const response=await call('/lookup?id=9999');
  assert.equal(JSON.parse(response.body).id,9999);
  assert.equal((await call('/lookup?id=10000')).status,404);
});

test('painel de CI executa a suíte no servidor', async()=>{
  const response=await call('/checks',{method:'POST'});
  assert.equal(response.status,200);
  assert.ok(JSON.parse(response.body).lines.length>=14);
});

class TestSocket extends EventEmitter {
  constructor(){super();this.writes=[];this.writableLength=0;}
  write(data){this.writes.push(data);}
  end(data){this.write(data);this.emit('close');}
  destroy(){this.emit('close');}
}
function maskedMessage(message){
  const data=Buffer.from(JSON.stringify(message));
  const mask=Buffer.from([1,2,3,4]);
  const head=Buffer.alloc(data.length<126?2:4);
  head[0]=0x81;head[1]=128|(data.length<126?data.length:126);
  if(data.length>=126)head.writeUInt16BE(data.length,2);
  for(let i=0;i<data.length;i++)data[i]^=mask[i%4];
  return Buffer.concat([head,mask,data]);
}

test('WebSocket faz upgrade e distribui a mensagem entre dois clientes', ()=>{
  const server=new EventEmitter();
  attach(server);
  const request={url:'/api/avancado/chat',headers:{upgrade:'websocket','sec-websocket-version':'13','sec-websocket-key':'dGhlIHNhbXBsZSBub25jZQ=='}};
  const first=new TestSocket(), second=new TestSocket();
  for(const socket of [first,second])server.emit('upgrade',request,socket,Buffer.alloc(0));
  assert.match(first.writes[0],/101 Switching Protocols/);
  first.emit('data',maskedMessage({author:'Nina',text:'Boa noite'}));
  const reply=second.writes.at(-1);
  const offset=reply[1]===126?4:2;
  assert.equal(JSON.parse(reply.subarray(offset)).state.messages.at(-1).text,'Boa noite');
  first.destroy();second.destroy();
});

test('os 17 estudos criam e desmontam a interface estática', ()=>{
  class Element {
    constructor(tag){this.tag=tag;this.children=[];}
    replaceChildren(...nodes){this.children=nodes;}
    append(...nodes){this.children.push(...nodes);}
    prepend(...nodes){this.children.unshift(...nodes);}
    setAttribute(){}
  }
  globalThis.document={createElement:tag=>new Element(tag)};
  globalThis.window={addEventListener(){},removeEventListener(){}};
  globalThis.fetch=async()=>{throw Error('Modo estático');};
  assert.equal(projects.length,17);
  for(const project of projects){
    const root=new Element('main');
    const close=project.mount(root);
    assert.equal(root.children.length,1,project.title);
    close();
    assert.equal(root.children.length,0,project.title);
  }
});
