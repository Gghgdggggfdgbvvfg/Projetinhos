import {panel,field,form,submit,status,records,remove,line,button,el,money} from './kit.js';
function localDate(){
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
export default {title:'Controle de gastos',description:'Registre despesas por categoria e consulte o total de cada mês.',mount(root){
  const app=panel(root),data=records('gastos');
  const f=form(app,()=>{
    if(!name.value.trim())return;
    data.list.push({name:name.value.trim(),cents:Math.round(amount.valueAsNumber*100),category:cat.value,date:date.value});
    month.value=date.value.slice(0,7);name.value=amount.value='';const ok=data.save();render();if(!ok)out.value+=' · Disponível só nesta sessão.';
  });
  const name=field(f,'Descrição',{required:true,maxLength:120});
  const amount=field(f,'Valor em reais',{type:'number',step:'.01',min:'.01',max:999999999,required:true});
  const cat=field(f,'Categoria',{choices:['Alimentação','Transporte','Moradia','Lazer','Outros']});
  const date=field(f,'Data',{type:'date',required:true,value:localDate()});submit(f,'Registrar despesa');
  const month=field(app,'Mês do extrato',{type:'month',value:localDate().slice(0,7)});month.oninput=render;
  const out=status(app),list=el('div');app.append(list);
  function render(){
    list.replaceChildren();const rows=data.list.filter(g=>g.date.startsWith(month.value)).sort((a,b)=>b.date.localeCompare(a.date));
    out.value='Total: '+money(rows.reduce((s,g)=>s+g.cents,0)/100);
    for(const g of rows){
      const row=line(list,g.date.split('-').reverse().join('/')+' · '+g.name+' · '+g.category+' · '+money(g.cents/100));
      button(row,'Excluir',()=>{remove(data.list,g);const ok=data.save();render();if(!ok)out.value+=' · Disponível só nesta sessão.';});
    }
  }
  render();
}};
