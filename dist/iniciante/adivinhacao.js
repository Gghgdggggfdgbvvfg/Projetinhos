import {panel,form,field,submit,status,button,randomBelow} from './kit.js';
export default {title:'Jogo de adivinhação',description:'Descubra um número entre 1 e 100 em até sete tentativas.',mount(root){
  const app=panel(root); let secret,tries;
  const f=form(app,()=>{
    const n=input.valueAsNumber; tries++;
    if(n===secret||tries===7){
      out.value=n===secret?'Acertou na tentativa '+tries+'!':'Fim da rodada. O número era '+secret+'.';
      send.disabled=input.disabled=true;
    } else {
      out.value='O número é '+(n<secret?'maior':'menor')+' que '+n+'. Restam '+(7-tries)+' tentativas.';
      input.select();
    }
  });
  const input=field(f,'Seu palpite',{type:'number',min:1,max:100,step:1,required:true});
  const send=submit(f,'Conferir');const out=status(app);
  function reset(){secret=randomBelow(100)+1;tries=0;send.disabled=input.disabled=false;input.value='';out.value='Você tem sete tentativas.';}
  button(app,'Nova rodada',reset);reset();
}};
