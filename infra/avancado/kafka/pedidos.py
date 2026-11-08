import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from uuid import uuid4

from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers="broker:9092", acks="all",
    value_serializer=lambda value: json.dumps(value).encode("utf-8"),
)


class Orders(BaseHTTPRequestHandler):
    def reply(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/pedidos":
            return self.reply(HTTPStatus.NOT_FOUND, {"erro": "Rota desconhecida"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 4096:
                raise ValueError()
            data = json.loads(self.rfile.read(size))
            item = data["item"]
            order_id = data.get("id", str(uuid4()))
            if not all(isinstance(s, str) and 0 < len(s.strip()) <= 100 for s in (order_id, item)):
                raise ValueError()
        except (ValueError, KeyError, TypeError):
            return self.reply(HTTPStatus.BAD_REQUEST, {"erro": "Informe um item e, opcionalmente, um id."})
        try:
            event = {"id": order_id, "item": item}
            receipt = producer.send("pedidos", key=order_id.encode("utf-8"), value=event).get(timeout=10)
        except Exception:
            return self.reply(HTTPStatus.SERVICE_UNAVAILABLE, {"erro": "O broker não confirmou o envio. Repita com o mesmo id."})
        self.reply(HTTPStatus.ACCEPTED, {"id": order_id, "particao": receipt.partition, "offset": receipt.offset})


ThreadingHTTPServer(("0.0.0.0", 8088), Orders).serve_forever()
