# Estudos avançados

Execute `node server.mjs` na raiz do projeto e abra o endereço impresso. O servidor usa SQLite para persistir o estado de cada sessão avançada. A sala de conversa é compartilhada entre as sessões locais. No site estático, as demonstrações guardam dados no navegador.

| Estudo | Experimento |
| --- | --- |
| Rede social | Publique no mural, comente e marque uma curtida. |
| Marketplace | Anuncie uma peça, adicione-a ao carrinho e observe a redução no estoque ao finalizar. |
| Streaming de vídeos | Pule de capítulo e examine as respostas HTTP 206 no servidor local. |
| Sistema bancário | Repita uma transferência com a mesma referência e confira os saldos. |
| Microsserviços de e-commerce | Compare o histórico de um pedido aprovado com o de uma cobrança recusada. Estoque, pagamento e expedição rodam em processos filhos locais. |
| Gateway de pagamentos | Autorize um valor fictício, capture e estorne. |
| Sistema de filas | Force três falhas no processamento e inspecione a fila de falhas. |
| Plataforma SaaS | Alterne espaços e teste a cota de notas dos planos. |
| Sistema de recomendação | Marque títulos favoritos e compare as afinidades por tag. |
| Chat com WebSockets | Abra duas abas do servidor local para trocar mensagens. A edição estática usa comunicação entre abas do mesmo navegador. |
| Sistema distribuído | Grave uma chave em duas réplicas, interrompa um nó e tente gravá-la novamente. O servidor local executa os nós em processos separados. |
| API com alto volume de requisições | Compare consultas com concorrência 1, 4 e 12. Taxa e latência são medidas na execução. |
| Arquitetura orientada a eventos | Registre entradas e retiradas. O saldo é reconstruído a partir da sequência de eventos. |
| Sistema de notificações | Pause uma categoria, publique um aviso e veja quais mensagens chegam à caixa de entrada. |
| Aplicação com CI/CD | Rode a suíte de domínio na página do estudo. O workflow do repositório testa e empacota a distribuição estática. |
| Microsserviços com Kafka | Observe partições e offsets pela interface. A pasta [kafka](kafka) contém os serviços com broker Apache Kafka. |
| Aplicação escalável na Cloud | Compare réplicas no modelo de carga do navegador. A pasta [cloud](cloud) contém uma API sem estado e manifestos de implantação. |

As operações comerciais e bancárias usam dados fictícios. Os ambientes Kafka e Kubernetes têm instruções próprias e podem ser executados separadamente do portfólio.
