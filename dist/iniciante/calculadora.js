import {panel,field,form,submit,status} from './kit.js';

export function calculate(a, sign, b) {
  if (sign === '÷' && b === 0) throw new Error('Divisão por zero não tem resultado.');
  const operations = {'+':()=>a+b, '−':()=>a-b, '×':()=>a*b, '÷':()=>a/b};
  return operations[sign]();
}
export default { title:'Calculadora', description:'Faça as quatro operações e confira o resultado com até dez casas decimais.', mount(root) {
  const app = panel(root);
  const f = form(app, () => {
    try { out.value = calculate(a.valueAsNumber, sign.value, b.valueAsNumber).toLocaleString('pt-BR',{maximumFractionDigits:10}); }
    catch (e) { out.value = e.message; }
  });
  const a = field(f,'Primeiro número',{type:'number',step:'any',required:true});
  const sign = field(f,'Operação',{choices:['+','−','×','÷']});
  const b = field(f,'Segundo número',{type:'number',step:'any',required:true});
  submit(f,'Calcular');
  const out = status(app);
}};
