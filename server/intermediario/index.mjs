import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHmac, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const derive = promisify(scrypt);
const prefix = '/api/intermediario';
const location = process.env.INTERMEDIATE_DB || fileURLToPath(new URL('../../.data/intermediario.json', import.meta.url));
const clients = new Set();
const base = { books: [], users: [], sessions: {}, messages: [], charges: [], links: [], secret: randomBytes(48).toString('hex') };
let db = existsSync(location) ? JSON.parse(readFileSync(location, 'utf8')) : base;
function commit(change) {
  const next = structuredClone(db);
  const value = change(next);
  mkdirSync(dirname(resolve(location)), { recursive: true });
  writeFileSync(location + '.tmp', JSON.stringify(next), { mode: 0o600 });
  renameSync(location + '.tmp', location);
  db = next;
  return value;
}
function reject(status, message) { throw Object.assign(new Error(message), {status}); }
function field(value, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) reject(400, 'Preencha os campos dentro do limite.');
  return value.trim();
}
function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) reject(413, 'Corpo muito grande.');
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { reject(400, 'JSON inválido.'); }
}
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const digest = token => createHash('sha256').update(token).digest('hex');
function tokenFor(email) {
  const data = encode({alg:'HS256',typ:'JWT'}) + '.' + encode({sub:email, exp:Math.floor(Date.now()/1000)+900});
  return data + '.' + createHmac('sha256',db.secret).update(data).digest('base64url');
}
function verify(token) {
  const [head, payload, signature, extra] = token.split('.');
  if (extra !== undefined || !head || !payload || !signature) return null;
  const expected = createHmac('sha256',db.secret).update(head+'.'+payload).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature, 'ascii'))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return claims.exp > Date.now()/1000 && JSON.parse(Buffer.from(head,'base64url')).alg === 'HS256' ? claims : null;
  } catch { return null; }
}
async function auth(req, res, kind, op, data) {
  const token = String(req.headers.authorization || '').replace(/^Bearer /,'');
  if (req.method === 'GET' && op === 'perfil') {
    const claims = kind === 'jwt' ? verify(token) : db.sessions[digest(token)];
    if (!claims || claims.exp <= Date.now()/1000) reject(401, 'Acesso expirado. Entre novamente.');
    return reply(res,200,{email:claims.sub, exp:claims.exp});
  }
  if (req.method === 'POST' && op === 'sair' && kind === 'login') {
    commit(d => delete d.sessions[digest(token)]);
    return reply(res,200,{ok:true});
  }
  if (req.method !== 'POST' || !['cadastro','entrar'].includes(op)) reject(404,'Rota inexistente.');
  const email = field(data.email).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) reject(400,'E-mail inválido.');
  const password = data.password;
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) reject(400,'Use uma senha entre 8 e 128 caracteres.');
  const user = db.users.find(u => u.email === email && u.kind === kind);
  if (op === 'cadastro') {
    const salt = randomBytes(16).toString('hex');
    const hash = (await derive(password,salt,64)).toString('hex');
    commit(d => {
      if (d.users.some(u => u.email === email && u.kind === kind)) reject(409,'Usuário já cadastrado.');
      d.users.push({email,kind,salt,hash});
    });
    return reply(res,201,{email});
  }
  const candidate = await derive(password,user?.salt || 'unregistered',64);
  if (!user || !timingSafeEqual(candidate,Buffer.from(user.hash,'hex'))) reject(401,'E-mail ou senha incorretos.');
  if (kind === 'jwt') return reply(res,200,{token:tokenFor(email)});
  const session = randomBytes(32).toString('base64url');
  commit(d => {
    for (const [key,v] of Object.entries(d.sessions)) if (v.exp <= Date.now()/1000) delete d.sessions[key];
    d.sessions[digest(session)] = {sub:email,exp:Math.floor(Date.now()/1000)+3600};
  });
  reply(res,200,{token:session});
}
function books(req,res,id,data) {
  if (req.method === 'GET' && !id) return reply(res,200,db.books);
  const book = db.books.find(b => b.id === id);
  if (id && !book) reject(404,'Livro não encontrado.');
  if (req.method === 'GET') return reply(res,200,book);
  if (req.method === 'DELETE' && id) {
    commit(d => { d.books = d.books.filter(b => b.id !== id); });
    return reply(res,200,{ok:true});
  }
  if ((req.method === 'POST' && !id) || (req.method === 'PUT' && id)) {
    const item = {id:id || randomUUID(), title:field(data.title), author:field(data.author)};
    commit(d => { if (id) d.books[d.books.findIndex(b => b.id === id)] = item; else d.books.push(item); });
    return reply(res,id ? 200 : 201,item);
  }
  reject(405,'Método inválido.');
}
function chat(req,res,op,data) {
  if (req.method === 'GET' && op === 'eventos') {
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    res.write('data: ' + JSON.stringify(db.messages) + '\n\n');
    clients.add(res);
    const ping = setInterval(()=>res.write(': vivo\n\n'),20000);
    res.on('close',()=>{clearInterval(ping); clients.delete(res);});
    return;
  }
  if (req.method === 'GET') return reply(res,200,db.messages);
  if (req.method !== 'POST' || op) reject(405,'Método inválido.');
  const message = {id:randomUUID(), author:field(data.author,40), text:field(data.text,500), time:new Date().toISOString()};
  commit(d => { d.messages = [...d.messages.slice(-99),message]; });
  for (const client of clients) client.write('data: '+JSON.stringify(db.messages)+'\n\n');
  reply(res,201,message);
}
function payments(req,res,id,data) {
  if (req.method === 'GET' && !id) return reply(res,200,db.charges);
  if (req.method === 'POST' && !id) {
    const reference = field(data.reference,80);
    const cents = data.cents;
    if (!Number.isSafeInteger(cents) || cents < 1 || cents > 100000000) reject(400,'Valor inválido.');
    const prior = db.charges.find(c=>c.reference === reference);
    if (prior && prior.cents !== cents) reject(409,'Referência já usada com outro valor.');
    if (prior) return reply(res,200,prior);
    const charge = {id:randomUUID(),reference,cents,status:'Pendente'};
    commit(d => d.charges.push(charge));
    return reply(res,201,charge);
  }
  const charge = db.charges.find(c => c.id === id);
  if (!charge) reject(404,'Cobrança inexistente.');
  if (req.method === 'GET') return reply(res,200,charge);
  if (req.method !== 'PATCH') reject(405,'Método inválido.');
  if (!['Pago','Cancelado'].includes(data.status) || charge.status !== 'Pendente') reject(409,'Transição indisponível.');
  commit(d => {d.charges.find(c=>c.id===id).status=data.status;});
  reply(res,200,db.charges.find(c=>c.id===id));
}
function links(req,res,id,data) {
  if (req.method === 'GET' && !id) return reply(res,200,db.links);
  if (req.method === 'POST' && !id) {
    let target;
    try {target = new URL(field(data.target,2000));} catch {reject(400,'Informe um endereço completo.');}
    if (!['http:','https:'].includes(target.protocol) || target.username || target.password) reject(400,'Use um endereço HTTP ou HTTPS.');
    const entry = {code:randomBytes(7).toString('base64url'),target:target.href,clicks:0,created:new Date().toISOString()};
    commit(d=>d.links.push(entry));
    return reply(res,201,entry);
  }
  const link = db.links.find(l=>l.code === id);
  if (!link || req.method !== 'GET') reject(404,'Link inexistente.');
  commit(d=>d.links.find(l=>l.code===id).clicks++);
  res.writeHead(302,{Location:link.target,'Cache-Control':'no-store'});
  res.end();
}
export async function handle(req,res,url) {
  if (!url.pathname.startsWith(prefix+'/')) return false;
  try {
    const [group,op,...extra] = url.pathname.slice(prefix.length+1).split('/');
    if (extra.length) reject(404,'Rota inexistente.');
    const data = ['POST','PUT','PATCH'].includes(req.method) ? await body(req) : {};
    if (group === 'ping') reply(res,200,{ok:true});
    else if (group === 'livros') books(req,res,op,data);
    else if (['jwt','login'].includes(group)) await auth(req,res,group,op,data);
    else if (group === 'chat') chat(req,res,op,data);
    else if (group === 'pagamentos') payments(req,res,op,data);
    else if (group === 'links') links(req,res,op,data);
    else reject(404,'Rota inexistente.');
  } catch (error) {
    reply(res,error.status || 500,{error:error.status ? error.message : 'Falha ao processar a operação.'});
  }
  return true;
}
