import {panel,el,actions,button,status,randomBelow} from './kit.js';
const hands=['Pedra','Papel','Tesoura'];
export const result=(a,b)=>(a-b+3)%3;
export default {title:'Pedra, papel e tesoura',description:'Dispute rodadas contra o computador e acompanhe o placar.',mount(root){
  const app=panel(root),row=actions(app),out=status(app,'Escolha sua jogada.');
  const placar=el('p');app.append(placar);let points=[0,0,0];
  function score(){placar.textContent='Vitórias '+points[1]+' · Derrotas '+points[2]+' · Empates '+points[0];}
  hands.forEach((name,i)=>button(row,name,()=>{
    const computer=randomBelow(3),r=result(i,computer);points[r]++;
    out.value='Você: '+name+'. Computador: '+hands[computer]+'. '+['Empate.','Você venceu!','Computador venceu.'][r];
    score();
  }));
  button(app,'Reiniciar placar',()=>{points=[0,0,0];score();out.value='Escolha sua jogada.';});score();
}};
