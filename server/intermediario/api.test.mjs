import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, PassThrough } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('fluxos HTTP dos seis projetos com servidor',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'portfolio-int-'));
  process.env.INTERMEDIATE_DB=join(dir,'teste.json');
  const {handle}=await import('./index.mjs');
  t.after(async()=>{await rm(dir,{recursive:true,force:true});});
  async function request(path,method='GET',data,token){
    const req=Readable.from(data?[Buffer.from(JSON.stringify(data))]:[]);
    req.method=method;
    req.headers=token?{authorization:'Bearer '+token}:{};
    const res=new PassThrough();
    res.writeHead=(status,headers)=>{res.status=status;res.headers=headers;return res;};
    await handle(req,res,new URL('/api/intermediario/'+path,'http://localhost'));
    return res;
  }
  const call=async(path,method='GET',data,token)=>{
    const response=await request(path,method,data,token);
    return [response.status,JSON.parse(response.read().toString())];
  };
  await t.test('biblioteca permite CRUD',async()=>{
    const [s,book]=await call('livros','POST',{title:'O livro',author:'Lia'});assert.equal(s,201);
    assert.equal((await call('livros/'+book.id))[1].title,'O livro');
    assert.equal((await call('livros/'+book.id,'PUT',{title:'Revisto',author:'Lia'}))[1].title,'Revisto');
    assert.equal((await call('livros/'+book.id,'DELETE'))[0],200);
    assert.equal((await call('livros/'+book.id))[0],404);
  });
  for(const kind of ['login','jwt'])await t.test(kind+' valida credenciais e protege o perfil',async()=>{
    const user={email:'teste@example.org',password:'segredodeexemplo'};
    assert.equal((await call(kind+'/perfil'))[0],401);
    assert.equal((await call(kind+'/cadastro','POST',user))[0],201);
    assert.equal((await call(kind+'/cadastro','POST',user))[0],409);
    assert.equal((await call(kind+'/entrar','POST',{...user,password:'outrasenha'}))[0],401);
    const [,session]=await call(kind+'/entrar','POST',user);
    assert.equal((await call(kind+'/perfil','GET',null,session.token))[1].email,user.email);
    assert.equal((await call(kind+'/perfil','GET',null,session.token+'x'))[0],401);
    if(kind==='login'){
      await call(kind+'/sair','POST',{},session.token);
      assert.equal((await call(kind+'/perfil','GET',null,session.token))[0],401);
    }
  });
  await t.test('sala transmite uma mensagem ao cliente conectado',async()=>{
    const stream=await request('chat/eventos');
    try{
      assert.match(stream.read().toString(),/data: \[\]/);
      assert.equal((await call('chat','POST',{author:'Maria',text:'Olá, sala!'}))[0],201);
      assert.match(stream.read().toString(),/Olá, sala!/);
    }finally{stream.destroy();}
  });
  await t.test('cobrança é idempotente e só admite um desfecho',async()=>{
    const input={reference:'ensaio',cents:1490};
    const [s,charge]=await call('pagamentos','POST',input);assert.equal(s,201);
    assert.equal((await call('pagamentos','POST',input))[1].id,charge.id);
    assert.equal((await call('pagamentos','POST',{...input,cents:60}))[0],409);
    assert.equal((await call('pagamentos/'+charge.id,'PATCH',{status:'Pago'}))[1].status,'Pago');
    assert.equal((await call('pagamentos/'+charge.id,'PATCH',{status:'Cancelado'}))[0],409);
  });
  await t.test('atalho redireciona e contabiliza o acesso',async()=>{
    assert.equal((await call('links','POST',{target:'javascript:alert(1)'}))[0],400);
    const [,link]=await call('links','POST',{target:'https://example.org/'});
    const redirect=await request('links/'+link.code);
    assert.equal(redirect.status,302);assert.equal(redirect.headers.Location,link.target);
    assert.equal((await call('links'))[1][0].clicks,1);
  });
});
