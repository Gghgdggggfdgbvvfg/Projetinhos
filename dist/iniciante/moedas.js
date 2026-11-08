import {panel,field,form,submit,status} from './kit.js';
export default {title:'Conversor de moedas',description:'Converta valores usando a cotação que você informar.',mount(root){
  const app=panel(root);
  const f=form(app,()=>{
    const value=from.value===to.value?amount.valueAsNumber:amount.valueAsNumber*rate.valueAsNumber;
    out.value=value.toLocaleString('pt-BR',{style:'currency',currency:to.value});
  });
  const currency=['BRL','USD','EUR','GBP','ARS','JPY'];
  const amount=field(f,'Valor de origem',{type:'number',step:'any',min:0,required:true,value:1});
  const from=field(f,'De',{choices:currency});
  const to=field(f,'Para',{choices:currency,value:'USD'});
  const rate=field(f,'Cotação manual',{type:'number',min:'0.000000000001',step:'any',required:true});
  function refresh(){rate.disabled=from.value===to.value;rate.value=rate.disabled?'1':'';rate.parentElement.firstChild.textContent='Valor de 1 '+from.value+' em '+to.value;out.value='';}
  from.onchange=to.onchange=refresh;
  submit(f,'Converter');
  const out=status(app);refresh();
}};
