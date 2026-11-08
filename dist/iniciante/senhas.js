import {panel,field,form,submit,status,alphabet,randomBelow} from './kit.js';
export function generatePassword(size, groups) {
  if(!groups.length) throw new Error('Selecione pelo menos um grupo de caracteres.');
  const pick=s=>s[randomBelow(s.length)];
  const all=groups.join(''), chars=groups.map(pick);
  while(chars.length<size) chars.push(pick(all));
  for(let i=chars.length-1;i>0;i--){const j=randomBelow(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}
  return chars.join('');
}
export default {title:'Gerador de senhas',description:'Escolha o tamanho e os grupos de caracteres da sua senha.',mount(root){
  const app=panel(root);
  const f=form(app,()=>{
    try { out.value=generatePassword(size.valueAsNumber,checks.filter(c=>c.checked).map(c=>alphabet[c.value])); }
    catch(e){out.value=e.message;}
  });
  const size=field(f,'Comprimento',{type:'number',min:4,max:128,step:1,value:16,required:true});
  const checks=Object.keys(alphabet).map(group=>field(f,group,{type:'checkbox',value:group,checked:true}));
  submit(f,'Gerar senha');const out=status(app);
}};
