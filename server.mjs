import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {handle as intermediate} from './server/intermediario/index.mjs';
import {handle as advanced,attach} from './server/avancado/index.mjs';

const folder=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp4':'video/mp4','.zip':'application/zip','.rbxl':'application/octet-stream'};
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host){res.writeHead(403).end();return;}
  if(await intermediate(req,res,url)||await advanced(req,res,url))return;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const pathname=decodeURIComponent(url.pathname);
  const path=resolve(folder,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(resolve(folder)+sep)){res.writeHead(403).end();return;}
  const info=await stat(path);
  if(!info.isFile()){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();else createReadStream(path).on('error',()=>res.destroy()).pipe(res);
 }catch(err){
  if(res.headersSent){res.destroy();return;}
  res.writeHead(err.code==='ENOENT'?404:400,{'Content-Type':'text/plain; charset=utf-8'}).end('Recurso indisponível.');
 }
});
attach(server);
const port=Number(process.env.PORT||3000);
server.listen(port,'127.0.0.1',()=>console.log('Caderno de programação em http://127.0.0.1:'+server.address().port));

