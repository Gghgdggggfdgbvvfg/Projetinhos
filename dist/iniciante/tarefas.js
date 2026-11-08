import {panel,field,form,submit,status,records,remove,line,button,el} from './kit.js';
export default {title:'Lista de tarefas', description:'Anote pendências, marque o que terminou e filtre sua lista.',mount(root){
  const app=panel(root), data=records('tarefas');
  const f=form(app,()=>{
    if (!input.value.trim()) return;
    data.list.push({name:input.value.trim(),done:false}); finish(); f.reset(); input.focus();
  });
  const input=field(f,'Nova tarefa',{required:true,maxLength:160});
  submit(f,'Adicionar tarefa');
  const filter=field(app,'Mostrar',{choices:['Todas','Pendentes','Concluídas']});
  filter.onchange=render;
  const out=status(app), list=el('div'); app.append(list);
  function finish(){ const saved=data.save(); render(); if(!saved) out.value+=' · Disponível só nesta sessão.'; }
  function render(){
    list.replaceChildren();
    const done=data.list.filter(t=>t.done).length;
    out.value=done+' de '+data.list.length+' concluídas';
    for(const t of data.list.filter(t=>filter.value==='Todas'||t.done===(filter.value==='Concluídas'))){
      const row=line(list,t.name);
      button(row,t.done?'Reabrir':'Concluir',()=>{t.done=!t.done;finish();});
      button(row,'Excluir',()=>{remove(data.list,t);finish();});
    }
  }
  render();
}};
