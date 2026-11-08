import json
import sqlite3

from kafka import KafkaConsumer

db = sqlite3.connect("/data/expedicao.sqlite")
db.execute("CREATE TABLE IF NOT EXISTS remessas (pedido TEXT PRIMARY KEY, item TEXT NOT NULL)")
consumer = KafkaConsumer(
    "pedidos", bootstrap_servers="broker:9092", group_id="expedicao",
    auto_offset_reset="earliest", enable_auto_commit=False, max_poll_records=1,
    value_deserializer=lambda value: json.loads(value.decode("utf-8")),
)
for record in consumer:
    event = record.value
    with db:
        row = db.execute("INSERT OR IGNORE INTO remessas VALUES (?, ?)", (event["id"], event["item"]))
    print(f"pedido={event['id']} partição={record.partition} offset={record.offset} nova_remessa={bool(row.rowcount)}")
    consumer.commit()
