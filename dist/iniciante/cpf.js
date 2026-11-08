import {panel,field,form,submit,status} from './kit.js';
export function validCPF(input) {
  const raw=input.trim();
  if(!/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(raw)) return false;
  const digits=raw.replace(/\D/g,'');
  if(/^(\d)\1+$/.test(digits)) return false;
  for(const length of [9,10]){
    const sum=[...digits.slice(0,length)].reduce((s,n,i)=>s+Number(n)*(length+1-i),0);
    const digit=(sum*10%11)%10;
    if(digit!==Number(digits[length])) return false;
  }
  return true;
}
export default {title:'Validador de CPF',description:'Confira localmente os dígitos verificadores de um CPF.',mount(root){
  const app=panel(root),f=form(app,()=>{out.value=validCPF(input.value)?'Dígitos verificadores válidos.':'CPF inválido.';});
  const input=field(f,'CPF',{inputMode:'numeric',placeholder:'000.000.000-00',required:true,maxLength:14});
  submit(f,'Validar dígitos');const out=status(app);
}};
