# Pedidos e expedição

Um serviço HTTP publica pedidos no tópico `pedidos`, com três partições. O outro serviço consome o tópico com o grupo `expedicao`, registra a remessa em SQLite e confirma o offset após o commit. A chave primária do pedido torna a entrega repetida idempotente.

Com Docker Compose e Docker ativos, nesta pasta execute:

```sh
docker compose up --build -d
docker compose ps
```

Envie um pedido pelo PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8088/pedidos -ContentType application/json -Body '{"id":"pedido-01","item":"zine"}'
docker compose logs expedicao
```

Repita com o mesmo ID para observar `nova_remessa=False`. Envie um ID diferente para criar outra remessa. Para consultar os offsets do grupo:

```sh
docker compose exec broker /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server broker:9092 --describe --group expedicao
docker compose down
```

O Compose monta um broker de laboratório com fator de replicação 1. Os volumes guardam o log e o banco entre reinicializações. [Documentação da imagem Apache Kafka](https://kafka.apache.org/41/getting-started/docker/)
