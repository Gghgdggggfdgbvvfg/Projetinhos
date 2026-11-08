import {archive} from './arquivo.js';
import {projects as beginner} from './iniciante/index.js';
import {projects as middle} from './intermediario/index.js';
import {projects as advanced} from './avancado/index.js';

const groups = [['Iniciante',beginner],['Intermediário',middle],['Avançado',advanced]];
const find = id => document.getElementById(id);
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slug = title => normalize(title).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const projects = groups.flatMap(([level,items]) => items.map(project=>({...project,level,id:slug(project.title)})));
const el = (tag,content,className) => {
 const node=document.createElement(tag);
 if(content) node.textContent=content;
 if(className) node.className=className;
 return node;
};
function image(project) {
 const img=el('img'); img.src='./imagens/'+project.picture+'.jpg'; img.alt='Captura de '+project.title; img.loading='lazy'; return img;
}
for(const project of archive) {
 const card=el('a',null,'work'); card.href='#arquivo/'+project.id;
 if(project.picture) card.append(image(project));
 card.append(el('span',project.type,'meta'),el('strong',project.title)); find('works').append(card);
}
let feature=0;
function cycle(delta) {
 feature=(feature+delta+4)%4;
 const p=archive[feature], img=find('hero-image');
 img.src='./imagens/'+p.picture+'.jpg'; img.alt='Captura de '+p.title;
 const link=find('feature-link'); link.href='#arquivo/'+p.id; link.textContent=p.title+' ↗';
}
find('prev').onclick=()=>cycle(-1); find('next').onclick=()=>cycle(1);
let level='Todos';
function refresh() {
 const query=normalize(find('search').value.trim());
 const rows=projects.filter(p=>(level==='Todos'||level===p.level)&&normalize(p.title+' '+p.description).includes(query));
 find('count').textContent=rows.length+' de '+projects.length+' projetos';
 const list=find('studies'); list.replaceChildren();
 for(const p of rows) {
  const a=el('a',null,'study'); a.href='#estudo/'+p.id;
  a.append(el('strong',p.title),el('span',p.level),el('b','↗')); list.append(a);
 }
 if(!rows.length) list.append(el('p','Nenhum projeto corresponde à busca.'));
 for(const b of find('filters').children) b.setAttribute('aria-pressed',String(b.textContent===level));
}
for(const name of ['Todos',...groups.map(([name])=>name)]) {
 const b=el('button',name); b.onclick=()=>{level=name;refresh();}; find('filters').append(b);
}
find('search').oninput=refresh; refresh();
let cleanup;
function route() {
 if(typeof cleanup==='function') cleanup(); cleanup=null;
 const [section,id]=location.hash.slice(1).split('/');
 const historical=section==='arquivo' && Boolean(id);
 const showProject=section==='estudo'||historical;
 find('home').hidden=showProject; find('detail').hidden=!showProject;
 const demo=find('demo'); demo.replaceChildren(); demo.hidden=false;
 if(!showProject) {
  document.title='Caderno de programação · Portfólio';
  if(section) find(section)?.scrollIntoView(); return;
 }
 const p=(historical?archive:projects).find(p=>p.id===id);
 const back=find('back'); back.href=historical?'#arquivo':'#estudos'; back.textContent=historical?'← Voltar ao arquivo':'← Voltar aos estudos';
 find('kind').textContent=p?(historical?p.type:'Estudo · '+p.level):'Caderno';
 find('project-title').textContent=p?.title||'Projeto não encontrado';
 find('summary').textContent=p?.description||'Use o índice para escolher outro projeto.';
 document.title=find('project-title').textContent+' · Caderno de programação';
 if(p && historical) {
  if(p.picture){const img=image(p);img.className='history-image';demo.append(img);}
  if(p.url||p.file){const a=el('a',p.url?'Ver código no GitHub ↗':'Baixar projeto ↓','explore');a.href=p.url||'./arquivo/'+p.file;if(p.file)a.download=p.file;demo.append(a);}
  demo.hidden=!demo.childNodes.length;
 }
 if(p && !historical) {
  try{cleanup=p.mount(demo);}catch(err){console.error(err);demo.textContent='Não foi possível iniciar este projeto. Recarregue a página e tente novamente.';}
  const folder={'Iniciante':'iniciante','Intermediário':'intermediario','Avançado':'avancado'}[p.level];
  const source=el('a','Ver código deste nível no GitHub ↗');
  source.href='https://github.com/Gghgdggggfdgbvvfg/Projetinhos/tree/main/dist/'+folder;
  find('summary').append(document.createElement('br'),source);
 }
 window.scrollTo({top:0,behavior:'instant'});
}
addEventListener('hashchange',route);route();
