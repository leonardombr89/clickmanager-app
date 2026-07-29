# Renomeação do app em produção

O ERP principal passa a usar o nome oficial `clickmanager-app`.

## Alterações no servidor

No arquivo `/opt/clickmanager/docker-compose.prod.yml`, altere o serviço atual:

```yaml
frontend:
  image: ghcr.io/leonardombr89/clickmanager-frontend:latest
  container_name: clickmanager-frontend
```

para:

```yaml
app:
  image: ghcr.io/leonardombr89/clickmanager-app:latest
  container_name: clickmanager-app
```

No serviço `nginx`, altere também:

```yaml
depends_on:
  - frontend
```

para:

```yaml
depends_on:
  - app
```

Procure referências ao nome antigo nas configurações do Nginx:

```bash
cd /opt/clickmanager
grep -R "frontend" nginx/conf.d
```

Na configuração atual da VPS, altere:

```nginx
set $frontend http://clickmanager-frontend:80;
```

para:

```nginx
set $frontend http://clickmanager-app:80;
```

O nome da variável `$frontend` é apenas interno ao Nginx e pode permanecer.
O ponto importante é o endereço do container ser `clickmanager-app:80`.

## Ordem segura para a virada

1. Faça backup dos arquivos antes da alteração:

   ```bash
   cd /opt/clickmanager
   cp docker-compose.prod.yml docker-compose.prod.yml.pre-clickmanager-app
   cp -a nginx/conf.d nginx/conf.d.pre-clickmanager-app
   ```

2. Edite o Compose e o Nginx, mas não recarregue o Nginx ainda. O container
   antigo continua atendendo com a configuração já carregada.
3. Valide o Compose:

   ```bash
   docker-compose -f docker-compose.prod.yml config --quiet
   ```

4. Faça o merge na `main`. O workflow publicará
   `ghcr.io/leonardombr89/clickmanager-app:latest` e iniciará o serviço `app`.
5. Confirme que o novo container está saudável:

   ```bash
   docker-compose -f docker-compose.prod.yml ps app
   docker logs --tail 100 clickmanager-app
   ```

6. Depois que `clickmanager-app` estiver funcionando, valide e recarregue o
   Nginx:

   ```bash
   docker exec clickmanager-nginx nginx -t
   docker exec clickmanager-nginx nginx -s reload
   ```

7. Teste o ERP pelo domínio público. Só depois da validação remova o container
   antigo:

   ```bash
   docker rm -f clickmanager-frontend
   ```

O banco, o backend e os demais serviços não precisam ser reiniciados nessa
virada.

## Rollback do Nginx

Se o Nginx for recarregado antes de o container `clickmanager-app` existir,
restaure temporariamente o destino antigo:

```bash
cd /opt/clickmanager
sudo sed -i \
  's#http://clickmanager-app:80#http://clickmanager-frontend:80#g' \
  nginx/conf.d/default.conf
docker exec clickmanager-nginx nginx -t
docker exec clickmanager-nginx nginx -s reload
```

Esta VPS utiliza o executável legado `docker-compose`. Não substitua esses
comandos por `docker compose`, pois o plugin correspondente não está instalado.
