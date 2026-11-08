import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {archive} from '../dist/arquivo.js';

// Os estilos já estão presentes numa página integrada.
globalThis.document={querySelector:()=>true};
const levels=await Promise.all(['iniciante','intermediario','avancado'].map(path=>import('../dist/'+path+'/index.js')));
test('o índice expõe os 48 projetos com rotas próprias',()=>{
 assert.deepEqual(levels.map(level=>level.projects.length),[15,16,17]);
 const projects=levels.flatMap(level=>level.projects);
 const routes=new Set(projects.map(p=>p.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-')));
 assert.equal(routes.size,48);
 for(const project of projects){assert.ok(project.description);assert.equal(typeof project.mount,'function');}
});
test('cada captura e cada download do arquivo existem',async()=>{
 assert.equal(archive.length,8);
 for(const p of archive){
  if(p.picture)await access(new URL('../dist/imagens/'+p.picture+'.jpg',import.meta.url));
  if(p.file)await access(new URL('../dist/arquivo/'+p.file,import.meta.url));
 }
});
