# clickmanager-app

ERP principal da plataforma ClickManager, desenvolvido com Angular.

## Endereco oficial

A aplicacao deve ser publicada na raiz do dominio:

https://app.clickmanager.com.br

Rotas internas como `/login`, `/apps/empresa` e `/page/deposito/itens` devem ser atendidas diretamente pelo Nginx do container do frontend com fallback para `/index.html`.

O build de producao usa `<base href="/">` e os arquivos estaticos sao servidos a partir da raiz de `/usr/share/nginx/html/`.

As chamadas para backend em producao devem continuar relativas ao mesmo dominio, usando caminhos como `/api/` e `/auth/`. O roteamento para o backend deve ser feito no Nginx principal da infraestrutura, fora desta aplicacao.

## Build

```bash
npm run build:prod
```

## Docker

```bash
docker build -t clickmanager-app .
docker run --rm -p 8080:80 clickmanager-app
```

Para a alteração coordenada do serviço na VPS, consulte
[docs/RENOMEACAO-APP-PRODUCAO.md](docs/RENOMEACAO-APP-PRODUCAO.md).
