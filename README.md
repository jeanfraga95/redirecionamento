# redirecionamento

Roteamento de acesso por **path** (`/Servidor1`, `/Servidor2`, ...) e/ou **header**
(`Backend: servidor1`) para servidores WebSocket.

## ⚠️ Fato técnico (leia primeiro)

O **GitHub Pages é hospedagem estática**. Ele **não** é proxy reverso:

- ❌ não repassa conexão **WebSocket** (`Upgrade`) para outro IP;
- ❌ não injeta/reescreve o header `Backend: servidor1`;
- ❌ não emite `HTTP 302` para um IP arbitrário (só `/pasta` → `/pasta/`).

Ele apenas **entrega arquivos**. Logo, o comportamento "igual proxy reverso nginx"
**não pode** ficar só no GitHub Pages. O roteamento real precisa rodar num servidor
(nginx) ou numa borda (Cloudflare Worker).

Verificação rápida: `curl -i https://jeanfraga95.github.io/redirecionamento/Servidor1`
traz a página do GitHub, **não** a resposta do seu servidor.

## O que tem neste repositório

| Arquivo | Papel | Alcance |
|---|---|---|
| `servers.json` | mapa `path → IP/porta` | estático (GitHub Pages) |
| `index.html` | landing + redireciona o **navegador** pelo path | GitHub Pages |
| `404.html` | idem, para paths sem pasta (`/Servidor1`) | GitHub Pages |
| `proxy/cloudflare-worker.js` | **proxy reverso real** (path/header → IP, WebSocket, injeta `Backend`) | Cloudflare |
| `proxy/nginx.conf.example` | **proxy reverso real** com nginx | VPS |

> O `index.html`/`404.html` só funcionam em **navegador** (o cliente executa o JS).
> Um app de túnel que espera `302`/WebSocket não é atendido por eles — para isso use
> o proxy real.

## Como usar

1. Edite `servers.json` com os IPs/portas reais.
2. Habilite o Pages: **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.
3. Para o roteamento de verdade, faça o deploy do **proxy** escolhido:
   - Cloudflare Worker: cole `proxy/cloudflare-worker.js`, ajuste `BACKENDS` e o
     `PATH_PREFIX`, e aponte o cliente para a URL do Worker; **ou**
   - nginx: use `proxy/nginx.conf.example` no VPS.

## Estrutura de um servidor

```json
"Servidor1": {
  "host": "203.0.113.10",
  "port": 8080,
  "secure": false,
  "path": "/",
  "header": "Backend: servidor1"
}
```
