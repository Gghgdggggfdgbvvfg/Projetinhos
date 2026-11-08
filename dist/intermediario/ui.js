export function el(tag,text,attrs={}) {
  const node = document.createElement(tag);
  if(text != null) node.textContent=text;
  for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
  return node;
}
export const money = cents => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function cents(value) {
  const n=Math.round(Number(value)*100);
  if(!Number.isSafeInteger(n) || n<1 || n>100000000) throw new Error('Valor fora do intervalo.');
  return n;
}
export function integer(value) {
  const n=Number(value);
  if(!Number.isSafeInteger(n) || n<1 || n>100000) throw new Error('Quantidade inválida.');
  return n;
}
export function id(){return crypto.randomUUID();}
export function storage(key, initial){
  const name='caderno.intermediario.'+key;
  const read=()=>{const raw=localStorage.getItem(name); return raw===null ? structuredClone(initial) : JSON.parse(raw);};
  return {read,change(fn){const state=read(); fn(state); localStorage.setItem(name,JSON.stringify(state));}};
}
export function panel(root) {
  const frame=el('section',null,{class:'int-app'});
  const area=el('div',null,{class:'int-body'});
  const status=el('p','',{class:'int-status',role:'status'});
  frame.append(area,status);
  root.replaceChildren(frame);
  const say=message=>{status.textContent=message;};
  function action(label,fn) {
    const b=el('button',label,{type:'button'});
    b.onclick=async()=>{b.disabled=true; try{say('');await fn();}catch(e){say(e.message);}finally{b.disabled=false;}};
    return b;
  }
  function section(title){const box=el('section'); box.append(el('h3',title)); area.append(box); return box;}
  function line(box,title,detail='',buttons=[]) {
    const row=el('div',null,{class:'int-row'}), copy=el('div');
    copy.append(el('strong',title));
    if(detail)copy.append(el('p',detail));
    row.append(copy,...buttons);
    box.append(row);
    return row;
  }
  function form(box,fields,submit,fn,defaults={}){
    const f=el('form');
    for(const [name,label,type='text',options] of fields){
      const l=el('label',label);
      const inp=el(type==='select'?'select':type==='textarea'?'textarea':'input');
      inp.name=name;
      if(type==='select') for(const item of options){const [value,caption]=Array.isArray(item)?item:[item,item];inp.append(el('option',caption,{value}));}
      else if(type!=='textarea') inp.type=type;
      if(type==='number'){inp.min='0.01';inp.step='0.01';}
      if(type==='password')inp.minLength=8;
      if(type!=='select')inp.maxLength=type==='password'?128:type==='textarea'?8000:2000;
      inp.required=true;
      if(defaults[name]!=null)inp.value=defaults[name];
      l.append(inp);f.append(l);
    }
    const button=el('button',submit,{type:'submit'});f.append(button);
    f.onsubmit=async e=>{
      e.preventDefault();button.disabled=true;say('');
      try{
        const data=Object.fromEntries([...new FormData(f)].map(([k,v])=>[k,String(v).trim()]));
        if(Object.values(data).some(v=>!v)) throw new Error('Preencha todos os campos.');
        await fn(data,f);
      }catch(err){say(err.message);}finally{button.disabled=false;}
    };
    box.append(f);return f;
  }
  return {area,action,form,line,section,say};
}
export function localProject(title,description,key,initial,render) {
  return {title,description,mount(root){
    const ui=panel(root), db=storage(key,initial), view={};
    function draw(){ui.area.replaceChildren();render({...ui,db,view,draw,state:db.read(),change(fn,msg){db.change(fn);draw();ui.say(msg||'');}});}
    draw();
    window.addEventListener('storage',draw);
    return ()=>window.removeEventListener('storage',draw);
  }};
}
const css=new URL('./style.css',import.meta.url);
if(!document.querySelector('link[data-intermediario]')){
  const link=document.createElement('link');link.rel='stylesheet';link.href=css.href;link.dataset.intermediario='';document.head.append(link);
}
