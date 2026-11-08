import { initial, materials, money, projection, recommendations, transition } from "./domain.js";

const catalog = [
  ["social","Rede social","Um mural de oficina para publicar, comentar e curtir."],
  ["market","Marketplace","Anuncie uma peça, separe unidades e feche a compra com estoque limitado."],
  ["stream","Streaming de vídeos","Órbita, um curta de seis segundos sobre movimento circular."],
  ["bank","Sistema bancário","Transfira saldo entre duas contas e confira as duas pontas do lançamento."],
  ["micro","Microsserviços de e-commerce","Acompanhe a reserva, a cobrança e a compensação de um pedido."],
  ["gateway","Gateway de pagamentos","Autorize, capture e estorne uma cobrança em ambiente de testes."],
  ["queue","Sistema de filas","Enfileire trabalhos e acompanhe tentativas até a fila de falhas."],
  ["saas","Plataforma SaaS","Dois espaços de trabalho com dados separados e cotas por plano."],
  ["recommend","Sistema de recomendação","Escolha filmes de um acervo e veja como as afinidades mudam a ordem das sugestões."],
  ["chat","Chat com WebSockets","Um mural de conversa entre abas, com transmissão ao vivo."],
  ["distrib","Sistema distribuído","Observe a distribuição das chaves e interrompa um nó para testar a replicação."],
  ["traffic","API com alto volume de requisições","Meça consultas concorrentes a um catálogo indexado de dez mil peças."],
  ["events","Arquitetura orientada a eventos","Reconstrua um saldo de estoque a partir do histórico de entradas e saídas."],
  ["notify","Sistema de notificações","Escolha categorias, publique avisos e marque as entregas como lidas."],
  ["ci","Aplicação com CI/CD completo","Rode a verificação do domínio e acompanhe as etapas de integração e entrega."],
  ["kafka","Microsserviços com Kafka","Observe chaves, partições e offsets de grupos de consumo independentes."],
  ["cloud","Aplicação escalável na Cloud","Distribua uma carga entre réplicas e compare os contadores de atendimento."],
];
const API = "/api/avancado";
const txt = (tag, value) => { const e=document.createElement(tag); e.textContent=value; return e; };
const field = (key,label,type="text",value="") => ({key,label,type,value});
const choose = (key,label,options) => ({key,label,options});
const button = (name,click) => { const b=txt("button",name); b.type="button"; b.onclick=click; return b; };
function line(parent, value) { parent.append(txt("p",value)); }
function panel(parent,title) {
  const e=document.createElement("section"); e.className="av-section"; e.append(txt("h3",title)); parent.append(e); return e;
}
function form(parent, label, fields, action) {
  const f=document.createElement("form"); f.className="av-form";
  for(const spec of fields) {
    const l=txt("label",spec.label);
    let input;
    if(spec.options) { input=document.createElement("select"); for(const option of spec.options) {
      const [value,title]=Array.isArray(option)?option:[option,option]; const o=txt("option",title); o.value=value; input.append(o);
    }} else { input=document.createElement("input"); input.type=spec.type; input.value=spec.value;
      input.required=true; input.maxLength=200; if(spec.type==="number"){input.min="1";input.step="1";}
    }
    input.name=spec.key; l.append(input); f.append(l);
  }
  const submit=txt("button",label); submit.type="submit"; f.append(submit);
  f.onsubmit=e=>{e.preventDefault(); action(Object.fromEntries(new FormData(f)));};
  parent.append(f);
}
function row(parent,title, detail,actions=[]) {
  const e=document.createElement("div"); e.className="av-row"; const main=document.createElement("div");
  main.append(txt("strong",title)); if(detail)main.append(txt("small",detail)); e.append(main,...actions); parent.append(e);
  return e;
}
const localStore = {
  get(key,fallback){try {return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},
  set(key,state){try{localStorage.setItem(key,JSON.stringify(state));}catch{}},
};
export const projects=catalog.map(([id,title,description])=>({title,description,mount:root=>mount(root,id)}));

function mount(root,id) {
  const key="oficina.av.v1."+id;
  let state=localStore.get(key,initial(id)), online=false, disposed=false, socket, channel, working=false;
  let transient="", dataView=null, alias=localStore.get("oficina.av.alias","Visitante");
  root.replaceChildren(); const box=document.createElement("div"); box.className="av-app"; root.append(box);
  const status=txt("p",""); status.className="av-status";
  const body=document.createElement("div"), feedback=txt("p",""); feedback.role="status"; box.append(status,body,feedback);
  const style=document.createElement("link"); style.rel="stylesheet";style.href=new URL("./style.css",import.meta.url);box.prepend(style);
  const request=async(path,options)=>{const r=await fetch(API+path,options); if(!r.headers.get("content-type")?.includes("application/json"))throw Error("Servidor local indisponível.");const result=await r.json();if(!r.ok)throw Error(result.error||"Não foi possível concluir.");return result;};
  const run=async(action,p={})=>{
    if(working)return; working=true;
    try{
      if(id==="chat" && action==="send"){alias=p.author;localStore.set("oficina.av.alias",alias);}
      if(online && id==="chat"){
        if(socket?.readyState!==1)throw Error("A conexão com a sala ainda não está pronta.");
        socket.send(JSON.stringify(p));
      } else if(online){const res=await request("/state/"+id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,p})}); state=res.state;transient=res.info||"Alteração registrada.";}
      else{state=transition(id,localStore.get(key,state),action,p);localStore.set(key,state);channel?.postMessage("refresh");transient="Alteração registrada no navegador.";}
      if(!disposed)draw();
    }catch(e){if(!disposed)feedback.textContent=e.message;}finally{working=false;}
  };
  const listen=()=>{if(!online && !disposed){state=localStore.get(key,state);draw();}};
  function draw() {
    body.replaceChildren(); feedback.textContent=transient;
    status.textContent=online?"Servidor local conectado":"Edição de navegador · dados neste dispositivo";
    const group=t=>panel(body,t);
    const act=(node,label,a,p)=>node.append(button(label,()=>run(a,p)));
    const edit=(node,label,fields,a)=>form(node,label,fields,p=>run(a,p));
    switch(id) {
    case "social": {
      edit(group("Publicar no mural"),"Publicar",[field("author","Nome"),field("text","Texto")],"post");
      const wall=group("Mural");
      for(const post of state.posts) {
        const e=row(wall,post.author,post.text,[button("Curtir · "+post.likes,()=>run("like",{id:post.id}))]);
        const comments=txt("ul","");for(const v of post.comments)comments.append(txt("li",v));wall.append(comments);
        form(wall,"Comentar",[field("text","Comentário")],p=>run("comment",{...p,id:post.id}));
      } break;
    }
    case "market": {
      edit(group("Nova peça"),"Anunciar",[field("title","Produto"),field("price","Preço em R$")],"list");
      const items=group("Banca"); for(const x of state.listings)row(items,x.title,money(x.price)+" · "+x.stock+" disponíveis",[button("Adicionar",()=>run("add",{id:x.id}))]);
      const cart=group("Sacola"); let total=0;for(const [k,n] of Object.entries(state.cart)){const x=state.listings.find(y=>y.id===k);total+=x.price*n;row(cart,x.title,n+" × "+money(x.price));}
      line(cart,"Total "+money(total));act(cart,"Concluir compra","checkout");act(cart,"Esvaziar","clear");
      state.orders.forEach(x=>row(cart,"Pedido "+x.id.slice(0,8),money(x.total)));break;
    }
    case "stream": {
      const g=group("Órbita"); const video=document.createElement("video");video.controls=true;video.preload="metadata";video.playsInline=true;video.setAttribute("aria-label","Órbita, estudo de movimento sem áudio");
      video.src=online?API+"/video":new URL("./orbita.mp4",import.meta.url).href;g.append(video);
      line(g,"Animação original · 640 × 360 · 6 s · sem áudio");
      const base=group("Capítulos");for(const [name,t] of [["Entrada",0],["Oposição",2],["Encontro",4]])base.append(button(name,()=>{video.currentTime=t;video.play().catch(()=>{});}));
      if(online)line(base,"O servidor atende intervalos de bytes para permitir o avanço no vídeo.");
      break;
    }
    case "bank": {
      const g=group("Contas de demonstração");for(const [k,v] of Object.entries(state.balances))row(g,k,money(v));
      edit(group("Transferência"),"Transferir",[choose("from","Debitar de",["Corrente","Reserva"]),field("amount","Valor em R$"),field("key","Referência única","text","tr-"+(state.entries.length+1))],"transfer");
      const e=group("Extrato");for(const x of state.entries)row(e,x.from+" → "+x.to,money(x.amount));break;
    }
    case "micro": {
      const g=group("Pedido de uma unidade");line(g,state.stock+" unidades em estoque. Cada pedido aciona estoque, pagamento e expedição.");
      edit(g,"Executar pedido",[choose("result","Resposta da cobrança",[["aprovar","Aprovar"],["recusar","Recusar"]])],"order");
      for(const o of state.orders)row(g,"Pedido "+o.id.slice(0,8),o.trace.join(" → ")); break;
    }
    case "gateway": {
      edit(group("Cobrança de teste"),"Autorizar",[field("key","Chave de idempotência","text","pg-"+(state.payments.length+1)),field("amount","Valor em R$"),choose("result","Resposta",[["aprovar","Aprovar"],["recusar","Recusar"]])],"authorize");
      const g=group("Transações");for(const x of state.payments)row(g,x.key+" · "+money(x.amount),x.status,x.status==="Autorizado"?[button("Capturar",()=>run("capture",{id:x.id}))]:x.status==="Capturado"?[button("Estornar",()=>run("refund",{id:x.id}))]:[]);break;
    }
    case "queue": {
      edit(group("Novo trabalho"),"Enfileirar",[field("task","Descrição")],"enqueue");const g=group("Fila de execução");
      line(g,"Uma falha devolve o trabalho ao fim da fila. A terceira envia o trabalho à fila de falhas.");
      act(g,"Processar primeiro","ok");act(g,"Forçar falha","fail"); state.jobs.forEach((j,i)=>row(g,(i+1)+". "+j.task,j.tries+" falhas"));
      const d=group("Fila de falhas");state.dead.forEach(j=>row(d,j.task,j.tries+" tentativas"));break;
    }
    case "saas": {
      const g=group("Espaços de trabalho");for(const name of Object.keys(state.teams))act(g,name,"switch",{team:name});
      const t=state.teams[state.current], h=group(state.current+" · plano "+t.plan);line(h,t.notes.length+" / "+(t.plan==="Livre"?2:20)+" notas");
      if(t.plan==="Livre")act(h,"Ativar plano Estúdio de teste","plan");
      edit(h,"Guardar nota",[field("text","Nota da equipe")],"note");t.notes.forEach(n=>row(h,n));break;
    }
    case "recommend": {
      const g=group("Meu acervo");for(const x of materials)row(g,x.title,x.tags.join(" / "),[button(state.liked.includes(x.id)?"Remover favorito":"Favoritar",()=>run("toggle",{id:x.id}))]);
      const rec=group("Sugestões");for(const x of recommendations(state.liked))row(rec,x.title,x.score+" afinidades com seus favoritos");break;
    }
    case "chat": {
      const g=group("Sala da oficina");line(g,online?"Abra outra aba do servidor para conversar ao vivo.":"Abra outra aba deste endereço para conversar entre abas deste navegador.");
      for(const x of state.messages)row(g,x.author,x.text);
      edit(g,"Enviar",[field("author","Apelido","text",alias),field("text","Mensagem")],"send");break;
    }
    case "distrib": {
      const g=group("Armazém replicado");line(g,"Cada chave tem duas cópias. Uma escrita aguarda os dois nós responsáveis.");
      edit(g,"Gravar",[field("key","Chave"),field("value","Valor")],"put");
      state.shards.forEach((s,i)=>{const n=group("Nó "+(i+1)+(state.offline===i?" · fora do ar":" · disponível"));if(state.offline===null || state.offline===i)act(n,state.offline===i?"Reconectar":"Interromper","toggle",{node:i});for(const [k,v] of Object.entries(s))row(n,k,v);});break;
    }
    case "traffic": {
      const g=group("Bancada de carga");line(g,online?"O cliente envia consultas HTTP em paralelo e mede o tempo de resposta.":"A medição local consulta um índice na memória do navegador. O servidor habilita o teste HTTP.");
      form(g,"Medir carga",[choose("n","Consultas",["100","250","500"]),choose("parallel","Concorrência",["1","4","12"])],async p=>{
        if(working)return; working=true; feedback.textContent="Medindo…";
        try{dataView=await measure(Number(p.n),Number(p.parallel),online?async i=>request("/lookup?id="+i):null);if(!disposed)draw();}catch(e){feedback.textContent=e.message;}finally{working=false;}
      });if(dataView)row(g,Math.round(dataView.rate)+" consultas/s","p95 "+dataView.p95.toFixed(2)+" ms · "+dataView.total+" respostas");break;
    }
    case "events": {
      const g=group("Movimento de estoque");form(g,"Registrar",[choose("action","Movimento",[["in","Entrada"],["out","Saída"]]),field("item","Item","text","Bobina"),field("qty","Quantidade","number","1")],p=>run(p.action,p));
      const pr=group("Projeção");Object.entries(projection(state.events)).forEach(([k,v])=>row(pr,k,String(v)));const log=group("Registro de eventos");for(const x of state.events.slice().reverse())row(log,"#"+x.seq+" · "+x.item,(x.delta>0?"+":"")+x.delta);break;
    }
    case "notify": {
      const g=group("Assinaturas");for(const [k,v] of Object.entries(state.filters))act(g,k+" · "+(v?"ativa":"pausada"),"filter",{channel:k});
      edit(group("Emitir aviso"),"Publicar",[choose("channel","Categoria",Object.keys(state.filters)),field("text","Mensagem")],"publish");
      const io=group("Caixa de entrada");for(const x of state.inbox)row(io,x.text,x.channel+" · "+(x.read?"lido":"novo"),x.read?[]:[button("Marcar lido",()=>run("read",{id:x.id}))]);break;
    }
    case "ci": {
      const g=group("Verificação da aplicação");line(g,online?"Executa a suíte de testes do módulo no Node.js.":"Executa verificações de domínio no navegador. A suíte completa acompanha o repositório.");
      g.append(button("Rodar verificações",async()=>{if(working)return;working=true;feedback.textContent="Em execução…";try{dataView=online?(await request("/checks",{method:"POST"})).lines:browserChecks();if(!disposed)draw();}catch(e){feedback.textContent=e.message;}finally{working=false;}}));
      if(dataView){for(const x of dataView)row(g,x);}break;
    }
    case "kafka": {
      const g=group("Tópico pedidos");line(g,"Laboratório de partições em memória lógica. A edição com broker Apache Kafka está em infra/avancado/kafka.");
      edit(g,"Produzir",[field("key","Chave"),field("text","Evento")],"publish");edit(g,"Consumir próximo",[field("group","Grupo","text","expedicao")],"consume");
      state.log.forEach(x=>row(g,"P"+x.part+" / "+x.offset+" · "+x.key,x.text));const h=group("Offsets confirmados");Object.entries(state.offsets).forEach(([k,v])=>row(h,k,v.join(" / ")));break;
    }
    case "cloud": {
      const g=group("Balanceador round-robin");line(g,"Modelo de carga por réplica. A implantação Kubernetes com sondas e autoscaling está em infra/avancado/cloud.");
      edit(g,"Aplicar escala",[choose("count","Réplicas",Array.from({length:8},(_,i)=>String(i+1)))],"scale");act(g,"Enviar 24 requisições","load");
      for(let i=0;i<state.replicas;i++)row(g,"Réplica "+(i+1),state.served[i]+" requisições");break;
    }
    }
  }
  draw();
  if(id==="chat" && "BroadcastChannel" in window){channel=new BroadcastChannel(key);channel.onmessage=listen;}
  window.addEventListener("storage",listen);
  request("/state/"+id).then(res=>{
    if(disposed)return;online=true;state=res.state;draw();
    if(id==="chat"){
      socket=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host+API+"/chat");
      socket.onmessage=e=>{if(!disposed){const x=JSON.parse(e.data);if(x.error)feedback.textContent=x.error;else{state=x.state;draw();}}};
      socket.onclose=()=>{if(!disposed)feedback.textContent="Sala desconectada. Reabra o projeto para reconectar.";};
    }
  }).catch(()=>{});
  return ()=>{disposed=true;socket?.close();channel?.close();window.removeEventListener("storage",listen);root.replaceChildren();};
}
async function measure(total, parallel, remote) {
  const catalog=new Map(Array.from({length:10000},(_,i)=>[i,"Peça "+i]));
  let cursor=0;const times=[],start=performance.now();
  async function worker(){while(cursor<total){const i=cursor++, key=(i*197)%10000,begin=performance.now();if(remote)await remote(key);else if(!catalog.has(key))throw Error("Peça ausente.");times.push(performance.now()-begin);}}
  await Promise.all(Array.from({length:parallel},worker));times.sort((a,b)=>a-b);
  return {total,rate:total*1000/Math.max(.01,performance.now()-start),p95:times[Math.ceil(total*.95)-1]};
}
function browserChecks(){
  const s=transition("bank",initial("bank"),"transfer",{from:"Corrente",amount:"1,50",key:"a"});
  if(s.balances.Corrente!==9850||s.balances.Reserva!==3150)throw Error("Saldos inconsistentes.");
  const again=transition("bank",s,"transfer",{from:"Corrente",amount:"1,50",key:"a"});if(again.entries.length!==1)throw Error("Falha de idempotência.");
  const q=transition("queue",initial("queue"),"enqueue",{task:"x"});if(transition("queue",q,"ok").jobs.length)throw Error("Falha na fila.");
  return ["Passou · transferência entre contas","Passou · repetição idempotente","Passou · processamento de fila"];
}
