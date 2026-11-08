import {el,panel,money,cents} from './ui.js';

const prefix='/api/intermediario/';
function remote(title,description,start) {
  return {title,description,mount(root){
    const ui=panel(root);
    const abort=new AbortController();
    let cleanup;
    async function api(path,method='GET',data,token){
      const response=await fetch(prefix+path,{
        method,headers:{Accept:'application/json',...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
        body:data?JSON.stringify(data):undefined,signal:abort.signal,cache:'no-store'
      });
      if(!response.headers.get('Content-Type')?.includes('application/json'))throw new Error('Servidor indisponível.');
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Falha na requisição.');
      return result;
    }
    const launch=async()=>{
      ui.area.replaceChildren();ui.say('Conectando ao servidor…');
      try{
        const ping=await api('ping');
        if(!ping.ok)throw new Error('Servidor indisponível.');
      }catch{
        if(abort.signal.aborted)return;
        const box=ui.section('Executar este projeto');
        box.append(el('p','Este projeto usa o servidor Node.js do portfólio. Na pasta do repositório, execute o comando abaixo e abra o endereço indicado no terminal.'),el('pre','npm start'),ui.action('Testar conexão',launch));
        ui.say('');return;
      }
      ui.say('');
      try{
        const end=await start({...ui,api,signal:abort.signal});
        if(abort.signal.aborted)end?.();else cleanup=end;
      }catch(e){if(!abort.signal.aborted)ui.say(e.message);}
    };
    launch();
    return ()=>{abort.abort();cleanup?.();};
  }};
}
export const rest=remote('API REST','Gerencie uma biblioteca com GET, POST, PUT e DELETE.',async({section,area,form,line,action,api,say})=>{
  let editing=null,receipt='';
  async function draw(){
    const books=await api('livros'); area.replaceChildren();
    form(section(editing?'Editar livro':'Cadastrar livro'),[['title','Título'],['author','Autor']],editing?'Salvar edição':'Adicionar livro',async d=>{
      const path=editing?'livros/'+editing.id:'livros',method=editing?'PUT':'POST';
      const result=await api(path,method,d);receipt=method+' '+prefix+path+'\n'+JSON.stringify(result,null,2);editing=null;await draw();
    },editing||{});
    const list=section('Biblioteca ('+books.length+')');
    books.forEach(b=>line(list,b.title,b.author,[action('Editar',async()=>{editing=b;await draw();}),action('Excluir',async()=>{
      await api('livros/'+b.id,'DELETE');if(editing?.id===b.id)editing=null;receipt='DELETE '+prefix+'livros/'+b.id;await draw();say('Livro excluído.');
    })]));
    const inspect=section('Resposta HTTP');
    inspect.append(el('pre',receipt||'GET '+prefix+'livros\n'+JSON.stringify(books,null,2)));
  }
  await draw();
});
function accounts(jwt){
  const kind=jwt?'jwt':'login';
  return remote(jwt?'Sistema de autenticação com JWT':'Sistema de login',jwt?'Emita um token assinado e use-o para acessar uma rota protegida.':'Cadastre uma conta, abra uma sessão e acesse o perfil.',async({api,area,section,line,form,action,say})=>{
    const key='intermediario.'+kind;
    async function draw(){
      area.replaceChildren();
      const token=sessionStorage.getItem(key);
      if(token){
        try{
          const profile=await api(kind+'/perfil','GET',null,token);
          const box=section('Perfil autenticado');
          line(box,profile.email,'Acesso válido até '+new Date(profile.exp*1000).toLocaleTimeString('pt-BR'));
          if(jwt){box.append(el('p','Token de acesso · HS256'),el('pre',token));}
          box.append(action('Consultar perfil',async()=>{await draw();say('Perfil consultado.');}),action('Sair',async()=>{
            if(!jwt)await api(kind+'/sair','POST',{},token);sessionStorage.removeItem(key);await draw();
          }));return;
        }catch(e){sessionStorage.removeItem(key);say(e.message);}
      }
      const fields=[['email','E-mail','email'],['password','Senha (8–128 caracteres)','password']];
      form(section('Entrar'),fields,'Acessar perfil',async d=>{
        const result=await api(kind+'/entrar','POST',d);sessionStorage.setItem(key,result.token);await draw();
      });
      form(section('Criar conta de teste'),fields,'Cadastrar',async(d,f)=>{
        await api(kind+'/cadastro','POST',d);f.reset();say('Conta criada. Use o formulário de entrada.');
      });
    }
    await draw();
  });
}
export const login=accounts(false), jwt=accounts(true);
export const chat=remote('Chat em tempo real','Converse na mesma sala em duas janelas, com atualização por SSE.',async({api,section,line,form,say,signal})=>{
  const initial=await api('chat');
  const history=section('Sala de conversa');
  const messages=el('div',null,{'aria-live':'polite'});history.append(messages);
  function render(list){
    messages.replaceChildren();
    list.forEach(m=>line(messages,m.author+' · '+new Date(m.time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),m.text));
    if(!list.length)messages.append(el('p','Abra a conversa com uma mensagem.'));
  }
  render(initial);
  form(section('Escrever'),[['author','Seu nome'],['text','Mensagem','textarea']],'Enviar',async(d,f)=>{
    await api('chat','POST',d);f.elements.text.value='';
  });
  if(signal.aborted)return;
  const events=new EventSource(prefix+'chat/eventos');
  events.onmessage=e=>{render(JSON.parse(e.data));say('');};
  events.onerror=()=>say('Reconectando à sala…');
  return ()=>events.close();
});
export const payments=remote('API de pagamentos','Crie cobranças de teste, confirme um pagamento ou cancele a operação.',async({api,section,area,line,form,action,say})=>{
  async function draw(){
    const items=await api('pagamentos');area.replaceChildren();
    const box=section('Cobrança de teste');
    box.append(el('p','Simulação local em reais. Repita a referência para consultar a mesma cobrança.'));
    form(box,[['reference','Referência do pedido'],['value','Valor (R$)','number']],'Emitir cobrança',async d=>{
      await api('pagamentos','POST',{reference:d.reference,cents:cents(d.value)});await draw();say('Cobrança consultada.');
    });
    const list=section('Cobranças');
    for(const c of items.slice().reverse()){
      const settle=status=>async()=>{await api('pagamentos/'+c.id,'PATCH',{status});await draw();};
      line(list,c.reference,money(c.cents)+' · '+c.status,c.status==='Pendente'?[action('Simular pagamento',settle('Pago')),action('Cancelar',settle('Cancelado'))]:[]);
    }
  }
  await draw();
});
export const short=remote('Encurtador de links com métricas','Crie atalhos HTTP e conte os acessos de cada endereço.',async({api,section,area,line,form,action})=>{
  async function draw(){
    const items=await api('links');area.replaceChildren();
    form(section('Novo atalho'),[['target','URL de destino','url']],'Encurtar',async d=>{await api('links','POST',d);await draw();});
    const list=section('Atalhos');list.append(action('Atualizar contagem',draw));
    items.slice().reverse().forEach(l=>{
      const anchor=el('a',l.code,{href:prefix+'links/'+l.code,target:'_blank',rel:'noopener noreferrer',class:'int-link'});
      line(list,l.target,l.clicks+' acessos',[anchor]);
    });
  }
  await draw();
});
