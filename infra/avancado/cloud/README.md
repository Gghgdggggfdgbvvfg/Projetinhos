# Consultas distribuídas

`GET /consulta?item=zine` devolve um identificador estável para o item, o nome da instância e seu contador local. Cada réplica atende requisições de forma independente. Execute `node app.mjs` e acesse `http://localhost:8080/consulta?item=zine` para testar a API.

Em um cluster local kind com Metrics Server e Docker, execute nesta pasta:

```sh
docker build -t oficina-api:1 .
kind load docker-image oficina-api:1
kubectl apply -f kubernetes.yaml
kubectl rollout status deployment/oficina-api
kubectl get pods,hpa
kubectl port-forward svc/oficina-api 8080:80
```

Em um cluster remoto, envie a imagem para um registro acessível aos nós e ajuste o campo `image` do manifesto. O HPA usa CPU média de 60% da solicitação de 100 millicores, com 2 a 8 réplicas. As sondas usam `/ready` e `/live`. Consulte `kubectl top pods` para verificar a disponibilidade das métricas. O port-forward seleciona um pod por sessão; para observar distribuição, faça requisições independentes ao Service a partir de dentro do cluster.

```sh
kubectl run cliente-oficina --rm -i --restart=Never --image=curlimages/curl:8.10.1 --command -- sh -c 'for i in 1 2 3 4 5 6; do curl -s http://oficina-api/consulta; echo; done'
```

[Documentação do HorizontalPodAutoscaler](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
