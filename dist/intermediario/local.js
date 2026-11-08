import {localProject as project, el, money, cents, integer, id} from './ui.js';

export const blog=project('Blog completo','Escreva rascunhos, edite textos e publique no mural.','blog',[],ui=>{
  const {view,section,form,line,action,change,draw,state}=ui;
  const post=state.find(p=>p.id===view.edit);
  form(section(post?'Editar texto':'Novo texto'),[['title','Título'],['text','Texto','textarea'],['status','Visibilidade','select',['Rascunho','Publicado']]],'Salvar texto',data=>{
    change(posts=>{
      if(post) Object.assign(posts.find(p=>p.id===post.id),data);
      else posts.unshift({...data,id:id(),date:new Date().toISOString()});
      delete view.edit;
    },'Texto salvo.');
  },post);
  for(const status of ['Publicado','Rascunho']){
    const posts=state.filter(p=>p.status===status),box=section(status==='Publicado'?'Mural':'Rascunhos');
    if(!posts.length) box.append(el('p','Nenhum texto por aqui.'));
    posts.forEach(p=>line(box,p.title,p.text,[action('Editar',()=>{view.edit=p.id;draw();}),action('Excluir',()=>change(list=>list.splice(list.findIndex(x=>x.id===p.id),1)))]));
  }
});
const goods=[['Caderno pautado',2450],['Lápis de desenho',790],['Estojo de lona',3600]];
export const shop=project('E-commerce','Uma papelaria com carrinho, quantidades e histórico de pedidos.','loja',{cart:{},orders:[]},({section,state,line,action,change})=>{
  const catalog=section('Papelaria');
  goods.forEach(([name,price],i)=>line(catalog,name,money(price),[action('Adicionar',()=>change(d=>{d.cart[i]=(d.cart[i]||0)+1;}))]));
  const cart=section('Carrinho');
  let total=0;
  for(const [i,q] of Object.entries(state.cart)){
    const [name,price]=goods[i];total+=price*q;
    line(cart,name,q+' × '+money(price),[action('Retirar uma',()=>change(d=>{if(--d.cart[i]<=0) delete d.cart[i];}))]);
  }
  if(total){
    line(cart,'Total',money(total),[action('Finalizar pedido',()=>change(d=>{d.orders.unshift({id:id(),cart:d.cart,total});d.cart={};},'Pedido registrado.'))]);
  }else cart.append(el('p','Carrinho vazio.'));
  const orders=section('Pedidos');
  state.orders.forEach(o=>line(orders,'Pedido '+o.id.slice(0,8),Object.entries(o.cart).map(([i,q])=>q+' × '+goods[i][0]).join(', ')+' · '+money(o.total)));
});
export const finance=project('Controle financeiro','Registre receitas e despesas e acompanhe o saldo por mês.','financeiro',[],({section,state,line,action,change,form,view,draw})=>{
  const month=view.month||new Date().toLocaleDateString('sv-SE').slice(0,7);
  form(section('Período'),[['month','Mês','month']],'Consultar',d=>{view.month=d.month;draw();},{month});
  const entries=state.filter(e=>e.date.startsWith(month));
  const total=type=>entries.reduce((s,e)=>s+(e.type===type?e.value:0),0);
  const box=section('Extrato mensal');
  line(box,'Saldo',money(total('Receita')-total('Despesa')));
  line(box,'Entradas e saídas',money(total('Receita'))+' em receitas · '+money(total('Despesa'))+' em despesas');
  entries.sort((a,b)=>b.date.localeCompare(a.date)).forEach(e=>line(box,e.title,e.date+' · '+e.type+' · '+money(e.value),[action('Excluir',()=>change(d=>d.splice(d.findIndex(x=>x.id===e.id),1)))]));
  form(section('Lançamento'),[['title','Descrição'],['date','Data','date'],['type','Tipo','select',['Despesa','Receita']],['value','Valor (R$)','number']],'Lançar',d=>{
    const value=cents(d.value);view.month=d.date.slice(0,7);change(list=>list.push({...d,value,id:id()}),'Lançamento registrado.');
  },{date:new Date().toLocaleDateString('sv-SE')});
});
export const reservations=project('Sistema de reservas','Organize horários de duas salas e detecte conflitos na agenda.','reservas',[],({section,state,line,action,change,form})=>{
  form(section('Reservar uma sala'),[['room','Sala','select',['Ipê','Cedro']],['date','Dia','date'],['start','Início','time'],['end','Fim','time'],['name','Responsável']],'Reservar',d=>{
    if(d.end<=d.start || new Date(d.date+'T'+d.start)<=new Date())throw new Error('Escolha um horário futuro, com o fim após o início.');
    change(list=>{
      if(list.some(r=>r.room===d.room&&r.date===d.date&&d.start<r.end&&d.end>r.start))throw new Error('A sala já está reservada nesse intervalo.');
      list.push({...d,id:id()});
    },'Reserva confirmada.');
  });
  const box=section('Agenda');
  if(!state.length)box.append(el('p','As salas estão livres.'));
  state.sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).forEach(r=>line(box,r.room+' · '+r.name,r.date+' · '+r.start+'–'+r.end,[action('Cancelar',()=>change(d=>d.splice(d.findIndex(x=>x.id===r.id),1)))]));
});
export const tasks=project('Gerenciador de tarefas','Distribua tarefas por responsável, prioridade e prazo.','tarefas',[],({section,state,line,action,change,form})=>{
  form(section('Planejar tarefa'),[['title','Tarefa'],['owner','Responsável'],['due','Prazo','date'],['priority','Prioridade','select',['Normal','Alta','Baixa']]],'Criar tarefa',d=>change(list=>list.push({...d,id:id(),done:false})));
  for(const done of [false,true]){
    const box=section(done?'Concluídas':'Em aberto');
    const subset=state.filter(t=>t.done===done).sort((a,b)=>a.due.localeCompare(b.due));
    if(!subset.length)box.append(el('p','Nenhuma tarefa.'));
    subset.forEach(t=>line(box,t.title,t.owner+' · '+t.due+' · '+t.priority,[action(done?'Reabrir':'Concluir',()=>change(d=>{d.find(x=>x.id===t.id).done=!done;})),action('Excluir',()=>change(d=>d.splice(d.findIndex(x=>x.id===t.id),1)))]));
  }
});
const columns=['A fazer','Em andamento','Entregue'];
export const trello=project('Clone do Trello','Mova cartões entre três listas com o mouse ou com os botões.','quadro',[],({section,state,line,action,change,form})=>{
  form(section('Novo cartão'),[['title','Título'],['notes','Descrição','textarea']],'Criar cartão',d=>change(list=>list.push({...d,id:id(),stage:0})));
  const move=(item,stage)=>change(list=>{const card=list.find(c=>c.id===item);if(card)card.stage=stage;});
  columns.forEach((title,stage)=>{
    const box=section(title+' ('+state.filter(x=>x.stage===stage).length+')');
    box.ondragover=e=>e.preventDefault();
    box.ondrop=e=>{e.preventDefault();move(e.dataTransfer.getData('text/plain'),stage);};
    for(const c of state.filter(x=>x.stage===stage)){
      const buttons=[];
      if(stage>0)buttons.push(action('Voltar',()=>move(c.id,stage-1)));
      if(stage<2)buttons.push(action('Avançar',()=>move(c.id,stage+1)));
      buttons.push(action('Arquivar',()=>change(d=>d.splice(d.findIndex(x=>x.id===c.id),1))));
      const row=line(box,c.title,c.notes,buttons);row.draggable=true;row.ondragstart=e=>e.dataTransfer.setData('text/plain',c.id);
    }
  });
});
export const inventory=project('Sistema de estoque','Registre entradas e saídas por SKU com histórico de movimentações.','estoque',{items:[],log:[]},({section,state,line,change,form})=>{
  form(section('Cadastrar produto'),[['sku','SKU'],['name','Produto']],'Cadastrar',d=>change(s=>{
    const sku=d.sku.toUpperCase();if(s.items.some(i=>i.sku===sku))throw new Error('SKU já cadastrado.');
    s.items.push({sku,name:d.name,qty:0});
  }));
  const items=section('Posição de estoque');state.items.forEach(i=>line(items,i.name,i.sku+' · '+i.qty+' unidades'));
  if(state.items.length)form(section('Movimentar'),[['sku','Produto','select',state.items.map(i=>[i.sku,i.name])],['type','Operação','select',['Entrada','Saída']],['qty','Quantidade','number']],'Registrar',d=>change(s=>{
    const item=s.items.find(i=>i.sku===d.sku),qty=integer(d.qty)*(d.type==='Entrada'?1:-1);
    if(item.qty+qty<0)throw new Error('Saldo insuficiente.');
    item.qty+=qty;s.log.unshift({...d,qty,time:new Date().toLocaleString('pt-BR')});
  }));
  const log=section('Movimentações');state.log.forEach(m=>line(log,m.sku+' · '+m.type,Math.abs(m.qty)+' un. · '+m.time));
});
const samples=[{name:'Cadernos',units:18,price:2400},{name:'Canetas',units:43,price:590},{name:'Adesivos',units:25,price:420}];
export const dashboard=project('Dashboard de dados','Compare vendas por produto e importe uma tabela CSV.','dashboard',samples,({section,state,line,form,change})=>{
  const box=section('Vendas por produto'),total=state.reduce((s,r)=>s+r.units*r.price,0),units=state.reduce((s,r)=>s+r.units,0);
  line(box,'Receita',money(total));line(box,'Unidades vendidas',String(units));
  for(const r of state.slice().sort((a,b)=>b.units*b.price-a.units*a.price)){
    const value=r.units*r.price,row=line(box,r.name,money(value)+' · '+r.units+' un.');
    row.append(el('progress',null,{value,max:Math.max(1,total),'aria-label':'Participação na receita de '+r.name}));
  }
  const imp=section('Importar CSV');imp.append(el('p','Cabeçalho: produto;unidades;preco. Use uma linha por produto e valores em reais.'));
  form(imp,[['csv','Tabela','textarea']],'Substituir dados',d=>{
    const [header,...rows]=d.csv.split(/\r?\n/);
    if(header.trim()!=='produto;unidades;preco'||!rows.length)throw new Error('Verifique o cabeçalho e inclua ao menos um produto.');
    const parsed=rows.map(row=>{const values=row.split(';').map(v=>v.trim());if(values.length!==3 || !values[0])throw new Error('Linha inválida.');return {name:values[0],units:integer(values[1]),price:cents(values[2].replace(',','.'))};});
    change(list=>list.splice(0,list.length,...parsed),'Tabela importada.');
  });
});
const lessons=[
  ['Fundamentos de HTML',[['Documento','Declare o idioma em html lang="pt-BR". Use title para nomear a aba e main para o conteúdo principal.'],['Formulários','Associe cada label a um campo. O atributo required ativa a validação de preenchimento pelo navegador.'],['Semântica','Use nav para navegação, article para conteúdo independente e headings na ordem de leitura.']]],
  ['Git no dia a dia',[['Primeiro commit','Use git init, adicione arquivos com git add e grave a primeira versão com git commit.'],['Branches','Crie uma branch com git switch -c recurso. Faça commits pequenos e revise as mudanças com git diff.'],['Revisão','Use git log --oneline para localizar commits e git show para inspecionar alterações.']]]
];
export const courses=project('Plataforma de cursos','Leia aulas curtas e acompanhe o progresso em duas trilhas.','cursos',{},({section,state,line,action,change,view,draw})=>{
  lessons.forEach(([course,classes],i)=>{
    const box=section(course),done=state[i]||[];
    box.append(el('progress',null,{value:done.length,max:classes.length,'aria-label':'Aulas concluídas'}),el('p',done.length+' de '+classes.length+' aulas concluídas'));
    classes.forEach(([name,text],j)=>{
      const active=view.open===i+'-'+j;
      const buttons=[action(active?'Fechar aula':'Ler aula',()=>{view.open=active?'':i+'-'+j;draw();})];
      if(active)buttons.push(action(done.includes(j)?'Reabrir':'Concluir aula',()=>change(d=>{const arr=d[i]||[];d[i]=arr.includes(j)?arr.filter(n=>n!==j):[...arr,j];})));
      line(box,name+(done.includes(j)?' ✓':''),active?text:'',buttons);
    });
  });
});
const menu=[['Sanduíche de cogumelos',2600],['Caldo de mandioca',1800],['Suco de caju',900]];
const steps=['Recebido','Em preparo','Saiu para entrega','Entregue'];
export const delivery=project('Sistema de delivery','Monte uma encomenda e acompanhe o preparo até a entrega.','delivery',{cart:[],orders:[]},({section,state,line,action,change,form})=>{
  const box=section('Cozinha do bairro');
  menu.forEach(([name,value],i)=>line(box,name,money(value),[action('Adicionar',()=>change(s=>s.cart.push(i)))]));
  const cart=section('Sua encomenda');
  state.cart.forEach((i,n)=>line(cart,menu[i][0],money(menu[i][1]),[action('Retirar',()=>change(s=>s.cart.splice(n,1)))]));
  if(state.cart.length){
    const total=state.cart.reduce((v,i)=>v+menu[i][1],0);
    line(cart,'Total',money(total));
    form(cart,[['name','Nome'],['address','Endereço de entrega']],'Enviar à cozinha',d=>change(s=>{
      s.orders.unshift({...d,id:id(),items:s.cart.map(i=>menu[i][0]),total,step:0});s.cart=[];
    }));
  }else cart.append(el('p','Escolha um item do cardápio.'));
  const kitchen=section('Acompanhamento dos pedidos');
  state.orders.forEach(o=>line(kitchen,o.name+' · '+steps[o.step],o.items.join(', ')+' · '+money(o.total)+'\n'+o.address,o.step<3?[action('Marcar: '+steps[o.step+1],()=>change(s=>s.orders.find(x=>x.id===o.id).step++))]:[]));
});
