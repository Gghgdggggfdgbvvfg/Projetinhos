const books = [
  { id: "eco", title: "Ruído de oficina", tags: ["som", "documentário"] },
  { id: "orb", title: "Órbita em seis segundos", tags: ["movimento", "forma"] },
  { id: "tipo", title: "Letra de rua", tags: ["forma", "design"] },
  { id: "linha", title: "Linhas de montagem", tags: ["documentário", "movimento"] },
  { id: "papel", title: "Oficina de papel", tags: ["design", "documentário"] },
  { id: "freq", title: "Mapa de frequências", tags: ["som", "movimento"] },
];
export const materials = books;
export function initial(id) {
  const states = {
    social: { posts: [{ id: "inicio", author: "Oficina", text: "O que você está construindo hoje?", likes: 0, comments: [] }] },
    market: { listings: [{ id: "zine", title: "Zine de tipografia", price: 1800, stock: 3 }], cart: {}, orders: [] },
    bank: { balances: { Corrente: 10000, Reserva: 3000 }, entries: [], keys: {} },
    micro: { stock: 8, orders: [] },
    gateway: { payments: [] },
    queue: { jobs: [], dead: [] },
    saas: { current: "Oficina", teams: { Oficina: { plan: "Livre", notes: [] }, Estúdio: { plan: "Livre", notes: [] } } },
    recommend: { liked: [] },
    chat: { messages: [] },
    distrib: { offline: null, shards: [{}, {}, {}] },
    events: { events: [] },
    notify: { inbox: [], filters: { produto: true, pedidos: true } },
    kafka: { log: [], offsets: {} },
    cloud: { replicas: 1, requests: 0, served: [0] },
  };
  return states[id] || {};
}
const trim = (s, limit = 200) => String(s ?? "").trim().slice(0, limit);
function insist(condition, message) { if (!condition) throw Error(message); }
function required(s) { const v = trim(s); insist(v, "Preencha o campo antes de continuar."); return v; }
function cents(raw) {
  const s = trim(raw).replace(",", ".");
  insist(/^\d{1,7}(\.\d{1,2})?$/.test(s), "Informe um valor com até duas casas decimais.");
  const n = Math.round(Number(s) * 100);
  insist(n > 0, "O valor precisa ser positivo.");
  return n;
}
export const money = cents => (cents/100).toLocaleString("pt-BR",{style:"currency", currency:"BRL"});
export function partition(key) {
  let n = 0;
  for (const c of key) n = (31*n + c.charCodeAt(0)) >>> 0;
  return n % 3;
}
export function recommendations(liked) {
  const weights = new Map();
  for (const item of books.filter(b => liked.includes(b.id))) for (const tag of item.tags) weights.set(tag, (weights.get(tag) || 0) + 1);
  return books.filter(b => !liked.includes(b.id)).map(b => ({...b, score:b.tags.reduce((n,t)=>n+(weights.get(t)||0),0)})).sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title,"pt-BR"));
}
export function projection(events) {
  const tally = Object.create(null);
  for (const e of events) tally[e.item] = (tally[e.item] || 0) + e.delta;
  return tally;
}
export function transition(id, current, action, p = {}) {
  const s = structuredClone(current);
  const uid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const item = () => { const post = s.posts.find(x=>x.id===p.id); insist(post,"Publicação inexistente."); return post; };
  if (id === "social") {
    if (action === "post") s.posts.unshift({id:uid(),author:required(p.author),text:required(p.text),likes:0,comments:[]});
    else if (action === "like") item().likes++;
    else if (action === "comment") item().comments.push(required(p.text));
    else throw Error("Ação inválida.");
  } else if (id === "market") {
    if (action === "list") s.listings.push({id:uid(),title:required(p.title),price:cents(p.price),stock:1});
    else if (action === "add") {
      const item = s.listings.find(x=>x.id===p.id);
      insist(item && item.stock > (s.cart[p.id] || 0), "Estoque insuficiente.");
      s.cart[p.id] = (s.cart[p.id] || 0) + 1;
    } else if (action === "clear") s.cart = {};
    else if (action === "checkout") {
      const rows = Object.entries(s.cart);
      insist(rows.length,"Adicione um produto ao carrinho.");
      let total = 0;
      for (const [k,qty] of rows) { const x = s.listings.find(x=>x.id===k); insist(x && x.stock >= qty,"Estoque insuficiente."); x.stock -= qty; total += qty*x.price; }
      s.orders.unshift({ id:uid(), total, lines:rows.length }); s.cart = {};
    } else throw Error("Ação inválida.");
  } else if (id === "bank") {
    insist(action === "transfer","Ação inválida.");
    const from = p.from, to = from === "Corrente" ? "Reserva" : "Corrente";
    const amount = cents(p.amount), key = required(p.key);
    insist(Object.hasOwn(s.balances,from),"Conta desconhecida.");
    const signature = JSON.stringify([from,amount]);
    if (Object.hasOwn(s.keys,key)) { insist(s.keys[key]===signature,"A chave já representa outra transferência."); return s; }
    insist(amount <= s.balances[from], "Saldo insuficiente.");
    Object.defineProperty(s.keys,key,{value:signature,enumerable:true,writable:true,configurable:true});
    s.balances[from] -= amount; s.balances[to] += amount;
    s.entries.unshift({from,to,amount,at:now()});
  } else if (id === "micro") {
    insist(action==="order" && s.stock>0,"Estoque esgotado.");
    const accepted = p.result !== "recusar";
    if (accepted) s.stock--;
    s.orders.unshift({id:uid(), trace:["Estoque reservado",accepted?"Pagamento autorizado":"Pagamento recusado",accepted?"Expedição confirmada":"Reserva compensada"],accepted});
  } else if (id === "gateway") {
    if (action==="authorize") {
      const key=required(p.key), amount=cents(p.amount), old=s.payments.find(x=>x.key===key);
      if (old) { insist(old.amount===amount,"A chave já foi usada com outro valor."); return s; }
      s.payments.unshift({id:uid(),key,amount,status:p.result==="recusar"?"Recusado":"Autorizado"});
    } else {
      const x=s.payments.find(x=>x.id===p.id);
      insist(x && (action==="capture" && x.status==="Autorizado" || action==="refund" && x.status==="Capturado"),"Transição indisponível.");
      x.status = action==="capture"?"Capturado":"Estornado";
    }
  } else if (id === "queue") {
    if (action==="enqueue") s.jobs.push({id:uid(),task:required(p.task),tries:0});
    else {
      insist(["ok","fail"].includes(action),"Ação inválida.");
      const job=s.jobs.shift(); insist(job,"A fila está vazia.");
      if (action==="fail") { job.tries++; (job.tries>=3?s.dead:s.jobs).push(job); }
    }
  } else if (id === "saas") {
    const team=s.teams[s.current];
    if (action==="switch") { insist(Object.hasOwn(s.teams,p.team),"Equipe inválida."); s.current=p.team; }
    else if (action==="plan") team.plan="Estúdio";
    else if (action==="note") { insist(team.notes.length<(team.plan==="Livre"?2:20),"A equipe atingiu a cota do plano."); team.notes.unshift(required(p.text)); }
    else throw Error("Ação inválida.");
  } else if (id === "recommend") {
    insist(action==="toggle" && books.some(x=>x.id===p.id),"Título desconhecido.");
    s.liked=s.liked.includes(p.id)?s.liked.filter(k=>k!==p.id):[...s.liked,p.id];
  } else if (id === "chat") {
    insist(action==="send","Ação inválida."); s.messages.push({author:required(p.author),text:required(p.text),at:now()}); s.messages=s.messages.slice(-80);
  } else if (id === "distrib") {
    if(action==="toggle") {
      const node = Number(p.node);
      insist(Number.isInteger(node) && node >= 0 && node < s.shards.length, "Nó inválido.");
      s.offline = s.offline === null ? node : null;
    }
    else {
      insist(action==="put","Ação inválida."); const key=required(p.key), value=required(p.value);
      insist(!["__proto__","constructor","prototype"].includes(key),"Chave reservada.");
      const primary=partition(key), backup=(primary+1)%3;
      insist(s.offline!==primary && s.offline!==backup,"Escrita exige confirmação de ambas as réplicas.");
      s.shards[primary][key]=value; s.shards[backup][key]=value;
    }
  } else if (id==="events") {
    insist(["in","out"].includes(action),"Ação inválida.");
    const item=required(p.item); insist(!["__proto__","constructor","prototype"].includes(item),"Nome reservado.");
    const qty=Number(p.qty); insist(Number.isSafeInteger(qty)&&qty>=1&&qty<=10000,"Quantidade inválida.");
    const delta=action==="in"?qty:-qty;
    insist((projection(s.events)[item]||0)+delta>=0,"Saldo insuficiente no estoque.");
    s.events.push({ seq:s.events.length+1, item,delta,at:now() });
  } else if (id==="notify") {
    if(action==="read") { const x=s.inbox.find(x=>x.id===p.id); insist(x,"Aviso inexistente."); x.read=true; }
    else { const channel=p.channel; insist(Object.hasOwn(s.filters,channel),"Categoria inválida.");
      if(action==="filter") s.filters[channel]=!s.filters[channel];
      else { insist(action==="publish","Ação inválida."); const text=required(p.text); if(s.filters[channel]) s.inbox.unshift({id:uid(),text,channel,read:false,at:now()}); }
    }
  } else if(id==="kafka") {
    if(action==="publish") { const key=required(p.key), part=partition(key); s.log.push({key,part,offset:s.log.filter(x=>x.part===part).length,text:required(p.text)}); }
    else { insist(action==="consume","Ação inválida."); const group=required(p.group);
      insist(!["__proto__","constructor","prototype"].includes(group),"Nome reservado.");
      const offsets=Object.hasOwn(s.offsets,group)?s.offsets[group]:[0,0,0], next=s.log.find(e=>e.offset>=offsets[e.part]); insist(next,"O grupo já consumiu todos os eventos.");
      offsets[next.part]=next.offset+1; s.offsets[group]=offsets;
    }
  } else if(id==="cloud") {
    if(action==="scale") { const count=Number(p.count); insist(Number.isInteger(count)&&count>=1&&count<=8,"Informe de 1 a 8 réplicas."); s.replicas=count; while(s.served.length<count)s.served.push(0); }
    else { insist(action==="load","Ação inválida."); for(let n=0;n<24;n++)s.served[s.requests++%s.replicas]++; }
  } else throw Error("Projeto desconhecido.");
  return s;
}
