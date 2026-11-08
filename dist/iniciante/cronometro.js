import {panel,el,actions,button} from './kit.js';
export function formatTime(ms) {
  const cs=Math.floor(ms/10);
  return [Math.floor(cs/6000),Math.floor(cs/100)%60,cs%100].map(n=>String(n).padStart(2,'0')).join(':');
}
export default {title:'Cronômetro',description:'Cronometre um intervalo, pause e registre voltas com centésimos.',mount(root){
  const app=panel(root), clock=el('div','00:00:00','of-clock'), list=el('ol');
  app.append(clock);const row=actions(app);
  let elapsed=0, start=null, timer;
  const total=()=>elapsed+(start===null?0:performance.now()-start);
  const tick=()=>{clock.textContent=formatTime(total());};
  const toggle=button(row,'Iniciar',()=>{
    if(start===null){start=performance.now();timer=setInterval(tick,30);toggle.textContent='Pausar';lap.disabled=false;}
    else{elapsed=total();start=null;clearInterval(timer);tick();toggle.textContent='Continuar';lap.disabled=true;}
  });
  const lap=button(row,'Registrar volta',()=>list.append(el('li',formatTime(total()))));
  lap.disabled=true;
  button(row,'Zerar',()=>{clearInterval(timer);elapsed=0;start=null;tick();list.replaceChildren();toggle.textContent='Iniciar';lap.disabled=true;});
  app.append(list);return ()=>clearInterval(timer);
}};
