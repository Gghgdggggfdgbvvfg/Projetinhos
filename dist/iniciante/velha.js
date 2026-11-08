import {panel,el,button,status} from './kit.js';
const triples=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const winningLine=board=>triples.find(([a,b,c])=>board[a]&&board[a]===board[b]&&board[a]===board[c]);
export default {title:'Jogo da velha',description:'Dois jogadores se revezam para completar uma linha no tabuleiro.',mount(root){
  const app=panel(root),out=status(app),grid=el('div',undefined,'of-board');app.append(grid);let board,turn,ended;
  function reset(){board=Array(9).fill('');turn='X';ended=false;render();}
  function render(){
    grid.replaceChildren();
    board.forEach((mark,i)=>{
      const b=button(grid,mark||'·',()=>{board[i]=turn;const won=winningLine(board);ended=Boolean(won)||board.every(Boolean);if(!ended)turn=turn==='X'?'O':'X';render();});
      b.disabled=ended||Boolean(mark);b.setAttribute('aria-label','Linha '+(Math.floor(i/3)+1)+', coluna '+(i%3+1)+': '+(mark||'vazia'));
    });
    out.value=ended?(winningLine(board)?turn+' venceu!':'Empate.'):('Vez de '+turn);
  }
  button(app,'Novo jogo',reset);reset();
}};
