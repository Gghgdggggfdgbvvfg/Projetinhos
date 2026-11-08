import test from 'node:test';
import assert from 'node:assert/strict';
import {initial, partition, projection, recommendations, transition} from '../../dist/avancado/domain.js';

function exercise(id) {
  let state = initial(id);
  return (action, fields) => state = transition(id, state, action, fields);
}

test('uma publicação recebe curtida e comentário', () => {
  const run = exercise('social');
  const [post] = run('post', {author:'Ana', text:'Jogo pronto'}).posts;
  run('like', {id:post.id});
  const [updated] = run('comment', {id:post.id, text:'Vou testar'}).posts;
  assert.equal(updated.likes, 1);
  assert.deepEqual(updated.comments, ['Vou testar']);
});

test('compra usa preço em centavos e respeita o estoque', () => {
  const run = exercise('market');
  for (let i=0; i<3; i++) run('add', {id:'zine'});
  assert.throws(()=>run('add', {id:'zine'}), /Estoque/);
  const sale = run('checkout');
  assert.equal(sale.orders[0].total, 5400);
  assert.equal(sale.listings[0].stock, 0);
});

test('repetir uma transferência preserva saldo e histórico', () => {
  const run = exercise('bank');
  const transfer = {from:'Corrente', amount:'12,50', key:'Luz'};
  run('transfer', transfer);
  const repeated = run('transfer', transfer);
  assert.deepEqual(repeated.balances, {Corrente:8750,Reserva:4250});
  assert.equal(repeated.entries.length, 1);
  assert.throws(()=>run('transfer', {...transfer, amount:'1'}), /chave/);
  assert.throws(()=>run('transfer', {...transfer, amount:'450', key:'nova'}), /Saldo/);
});

test('recusa compensa a reserva, aprovação consome uma unidade', () => {
  const run = exercise('micro');
  assert.equal(run('order', {result:'recusar'}).stock, 8);
  assert.equal(run('order', {result:'aprovar'}).stock, 7);
});

test('captura e estorno seguem a autorização', () => {
  const run = exercise('gateway');
  const payment = {key:'xyz', amount:'19,90'};
  const [first] = run('authorize', payment).payments;
  assert.equal(run('authorize', payment).payments.length, 1);
  assert.throws(()=>run('refund', {id:first.id}));
  run('capture', {id:first.id});
  assert.equal(run('refund', {id:first.id}).payments[0].status, 'Estornado');
});

test('a fila encaminha a terceira falha ao histórico', () => {
  const run = exercise('queue');
  run('enqueue', {task:'Imprimir'});
  run('fail'); run('fail');
  const last = run('fail');
  assert.equal(last.dead[0].tries, 3);
  assert.equal(last.jobs.length, 0);
});

test('cotas e notas pertencem ao espaço selecionado', () => {
  const run=exercise('saas');
  run('note',{text:'A'}); run('note',{text:'B'});
  assert.throws(()=>run('note',{text:'C'}), /cota/);
  const switched = run('switch',{team:'Estúdio'});
  assert.equal(switched.teams['Estúdio'].notes.length,0);
  assert.equal(switched.teams.Oficina.notes.length,2);
});

test('recomendação desconsidera o favorito e prioriza suas tags', () => {
  const state=exercise('recommend')('toggle',{id:'orb'});
  const list=recommendations(state.liked);
  assert.ok(list[0].score>0);
  assert.ok(list.every(item=>item.id!=='orb'));
});

test('chat guarda as últimas 80 mensagens', () => {
  const run=exercise('chat');
  for(let i=0;i<80;i++) run('send',{author:'Ana',text:String(i)});
  const state=run('send',{author:'Ana',text:'fim'});
  assert.equal(state.messages.length,80);
  assert.equal(state.messages[0].text,'1');
});

test('duas réplicas confirmam a gravação; queda impede a próxima', () => {
  const run=exercise('distrib');
  const node=partition('papel');
  const state=run('put',{key:'papel',value:'azul'});
  assert.equal(state.shards[node].papel,'azul');
  assert.equal(state.shards[(node+1)%3].papel,'azul');
  run('toggle',{node});
  assert.throws(()=>run('put',{key:'papel',value:'verde'}),/ambas/);
  assert.throws(()=>run('toggle',{node:20}),/Nó/);
});

test('projeção reconstitui eventos e rejeita retiradas excessivas', () => {
  const run=exercise('events');
  run('in',{item:'toString',qty:4});
  const result=run('out',{item:'toString',qty:1});
  assert.equal(projection(result.events).toString,3);
  assert.throws(()=>run('out',{item:'toString',qty:4}));
});

test('assinatura controla entrega e leitura de notificações', () => {
  const run=exercise('notify');
  run('filter',{channel:'produto'});
  assert.equal(run('publish',{channel:'produto',text:'V1'}).inbox.length,0);
  const [item]=run('publish',{channel:'pedidos',text:'Pronto'}).inbox;
  assert.equal(run('read',{id:item.id}).inbox[0].read,true);
});

test('cada grupo Kafka possui offsets próprios por partição', () => {
  const run=exercise('kafka');
  run('publish',{key:'azul',text:'criado'});
  const first=run('consume',{group:'toString'});
  const second=run('consume',{group:'estoque'});
  assert.deepEqual(first.offsets.toString,second.offsets.estoque);
  assert.throws(()=>run('consume',{group:'estoque'}),/todos/);
});

test('carga se distribui entre três réplicas', () => {
  const run=exercise('cloud');
  run('scale',{count:3});
  assert.deepEqual(run('load').served,[8,8,8]);
  assert.throws(()=>run('scale',{count:0}));
});
