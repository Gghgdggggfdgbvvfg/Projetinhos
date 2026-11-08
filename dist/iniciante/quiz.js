import {panel,el,actions,button,status} from './kit.js';
const rounds=[
  ['Qual estrutura segue a ordem de chegada?', ['Pilha','Fila','Árvore'],1,'Em uma fila, o primeiro elemento inserido é o primeiro a sair.'],
  ['Qual formato aceita objetos e arrays?', ['CSV','TXT','JSON'],2,'JSON representa objetos, arrays e valores simples.'],
  ['Em CSS, qual seletor representa uma classe?', ['.item','#item','item'],0,'O ponto indica um seletor de classe.'],
  ['O que indica o status HTTP 404?', ['Recurso não encontrado','Requisição aceita','Acesso proibido'],0,'O servidor não encontrou o recurso solicitado.'],
  ['Qual comando mostra as alterações do Git?', ['git clone','git diff','git init'],1,'git diff compara o conteúdo entre versões.']
];
export default {title:'Quiz',description:'Responda a cinco perguntas de programação e confira cada resposta.',mount(root){
  const app=panel(root);let index=0,score=0;
  function show(){
    app.replaceChildren();
    if(index===rounds.length){
      status(app,'Resultado: '+score+' de '+rounds.length);
      button(app,'Jogar novamente',()=>{index=score=0;show();});return;
    }
    const [question,choices,answer,why]=rounds[index];
    app.append(el('small','Pergunta '+(index+1)+' de '+rounds.length),el('h3',question));
    const row=actions(app),out=status(app);
    choices.forEach((choice,i)=>button(row,choice,()=>{
      for(const b of row.children)b.disabled=true;
      if(i===answer)score++;
      out.value=(i===answer?'Acertou! ':'Resposta: '+choices[answer]+'. ')+why;
      button(app,index===rounds.length-1?'Ver resultado':'Próxima pergunta',()=>{index++;show();});
    }));
  }
  show();
}};
