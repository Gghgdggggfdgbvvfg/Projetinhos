/* Um processo por serviço local. Apenas mensagens IPC do coordenador são aceitas. */
const inventory = new Map();
process.on("message", ({ ticket, op, payload })=>{
  try {
    let result;
    switch(op) {
    case "reserve": result=payload.stock>0?"Estoque reservado":null;break;
    case "charge": result=payload.accepted?"Pagamento autorizado":"Pagamento recusado";break;
    case "ship": result=payload.accepted?"Expedição confirmada":"Reserva compensada";break;
    case "write":
      inventory.set(payload.session+"\n"+payload.key,payload.value);
      result=inventory.get(payload.session+"\n"+payload.key);break;
    default: throw Error("Operação indisponível.");
    }
    process.send({ticket,result});
  }catch(e){process.send({ticket,error:e.message});}
});
