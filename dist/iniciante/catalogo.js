import {panel,el,field,button,line,status,money} from './kit.js';
const goods=[
  ['Caderno pontilhado','Papel',26.9,'96 folhas em papel marfim.'],['Bloco de bolso','Papel',12,'Cabe no bolso de trás.'],
  ['Caneta 0,5','Escrita',8.5,'Tinta preta e ponta fina.'],['Lápis 2B','Escrita',3.8,'Grafite macio para traço e sombra.'],
  ['Estojo de lona','Acessórios',34,'Lona crua com zíper metálico.'],['Régua de aço','Acessórios',17.5,'Escala gravada de 15 cm.']
];
export default {title:'Catálogo de produtos',description:'Explore uma papelaria por categoria, preço e nome do produto.',mount(root){
  const app=panel(root),query=field(app,'Buscar produto',{type:'search'}),
        category=field(app,'Categoria',{choices:['Todas','Papel','Escrita','Acessórios']}),
        sort=field(app,'Ordenação',{choices:['Nome','Menor preço','Maior preço']});
  const out=status(app),list=el('div');app.append(list);query.oninput=category.onchange=sort.onchange=render;
  function render(){
    list.replaceChildren();const q=query.value.trim().toLocaleLowerCase('pt-BR');
    const rows=goods.filter(([name,cat])=>name.toLocaleLowerCase('pt-BR').includes(q)&&(category.value==='Todas'||category.value===cat));
    rows.sort((a,b)=>sort.value==='Nome'?a[0].localeCompare(b[0],'pt-BR'):sort.value==='Menor preço'?a[2]-b[2]:b[2]-a[2]);
    out.value=rows.length+' produto(s)';
    for(const [name,cat,price,desc] of rows){
      const row=line(list,name+' · '+cat+' · '+money(price)),details=el('p',desc);details.hidden=true;
      const toggle=button(row,'Detalhes',()=>{details.hidden=!details.hidden;toggle.setAttribute('aria-expanded',String(!details.hidden));});
      toggle.setAttribute('aria-expanded','false');list.append(details);
    }
  }
  render();
}};
