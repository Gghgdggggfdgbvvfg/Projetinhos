import {panel,field,form,submit,status,records,remove,line,button,el} from './kit.js';
export default {title:'Agenda de contatos',description:'Guarde nomes, telefones e e-mails e encontre um contato pela busca.',mount(root){
  const app=panel(root),data=records('agenda');let editing=null;
  const f=form(app,()=>{
    const name=nome.value.trim(),tel=fone.value.trim(),email=mail.value.trim();
    if(!name||(!tel&&!email)){out.value='Informe um nome e pelo menos um telefone ou e-mail.';return;}
    const details={name,tel,email};
    if(editing)Object.assign(editing,details);else data.list.push(details);
    reset();const ok=data.save();render();if(!ok)out.value+=' · Disponível só nesta sessão.';
  });
  const nome=field(f,'Nome',{required:true,maxLength:100}),fone=field(f,'Telefone',{type:'tel',maxLength:40});
  const mail=field(f,'E-mail',{type:'email',maxLength:160}),send=submit(f,'Adicionar contato');
  const cancel=button(f,'Cancelar edição',reset);cancel.hidden=true;
  const search=field(app,'Buscar contato',{type:'search'});search.oninput=render;
  const out=status(app),list=el('div');app.append(list);
  function reset(){editing=null;f.reset();send.textContent='Adicionar contato';cancel.hidden=true;}
  function render(){
    list.replaceChildren();const q=search.value.trim().toLocaleLowerCase('pt-BR');
    const visible=data.list.filter(c=>[c.name,c.tel,c.email].join(' ').toLocaleLowerCase('pt-BR').includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    out.value=visible.length+' contato(s)';
    for(const c of visible){
      const row=line(list,[c.name,c.tel,c.email].filter(Boolean).join(' · '));
      button(row,'Editar',()=>{editing=c;nome.value=c.name;fone.value=c.tel;mail.value=c.email;send.textContent='Salvar alterações';cancel.hidden=false;nome.focus();});
      button(row,'Excluir',()=>{if(editing===c)reset();remove(data.list,c);const ok=data.save();render();if(!ok)out.value+=' · Disponível só nesta sessão.';});
    }
  }
  render();
}};
