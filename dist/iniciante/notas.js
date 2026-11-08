import {panel,field,form,submit,status,records,remove,line,button,el} from './kit.js';
export default {title:'Sistema de notas',description:'Registre avaliações com pesos e calcule a média por disciplina.',mount(root){
  const app=panel(root),data=records('notas');
  const f=form(app,()=>{
    if(!subject.value.trim()||!name.value.trim())return;
    data.list.push({subject:subject.value.trim(),name:name.value.trim(),grade:grade.valueAsNumber,weight:weight.valueAsNumber});
    name.value=grade.value='';const ok=data.save();render();if(!ok)out.value='Disponível só nesta sessão.';
  });
  const subject=field(f,'Disciplina',{required:true,maxLength:80});
  const name=field(f,'Avaliação',{required:true,maxLength:80});
  const grade=field(f,'Nota (0 a 10)',{type:'number',step:'any',min:0,max:10,required:true});
  const weight=field(f,'Peso',{type:'number',step:'any',min:'.01',max:1000,value:1,required:true});submit(f,'Registrar nota');
  const out=status(app),list=el('div');app.append(list);
  function render(){
    list.replaceChildren();out.value=data.list.length?'':'Nenhuma avaliação registrada.';
    const groups=new Map();
    for(const item of data.list){if(!groups.has(item.subject))groups.set(item.subject,[]);groups.get(item.subject).push(item);}
    for(const [sub,items] of groups){
      const average=items.reduce((s,x)=>s+x.grade*x.weight,0)/items.reduce((s,x)=>s+x.weight,0);
      list.append(el('h3',sub+' · média '+average.toLocaleString('pt-BR',{maximumFractionDigits:2})));
      for(const item of items){
        const row=line(list,item.name+' · '+item.grade+' (peso '+item.weight+')');
        button(row,'Excluir',()=>{remove(data.list,item);const ok=data.save();render();if(!ok)out.value='Disponível só nesta sessão.';});
      }
    }
  }
  render();
}};
