import {panel,el,field,form,submit,status,records,remove,line,button,randomBelow} from './kit.js';
export function httpAddress(value) {
  try { const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null; }
  catch { return null; }
}
export default {title:'Encurtador de URL',description:'Crie atalhos para endereços longos, guardados neste navegador.',mount(root){
  const app=panel(root),data=records('atalhos');
  const f=form(app,()=>{
    const url=httpAddress(input.value.trim());
    if(!url){out.value='Informe uma URL que comece com https:// ou http://.';return;}
    let code;do{code=randomBelow(36**5).toString(36).padStart(5,'0');}while(data.list.some(x=>x.code===code));
    data.list.push({url,code});if(!data.save()){data.list.pop();out.value='Ative o armazenamento local para criar o atalho.';return;}
    input.value='';render();out.value='Atalho criado.';
  });
  const input=field(f,'Endereço original',{type:'url',placeholder:'https://',required:true});
  submit(f,'Criar atalho');const out=status(app),list=el('div');app.append(list);
  function render(){
    list.replaceChildren();
    for(const item of data.list){
      const row=line(list,item.url);const link=el('a','Abrir /'+item.code);
      const url=new URL('ir.html',import.meta.url);url.hash=item.code;link.href=url.href;link.target='_blank';link.rel='noopener';row.append(link);
      button(row,'Copiar',async()=>{try{await navigator.clipboard.writeText(link.href);out.value='Atalho copiado.';}catch{out.value=link.href;}});
      button(row,'Excluir',()=>{remove(data.list,item);const ok=data.save();render();out.value=ok?'Atalho removido.':'Alteração disponível só nesta sessão.';});
    }
  }
  render();
}};
