// ============================================================
//  Proxy reverso REAL (Cloudflare Worker)
// ------------------------------------------------------------
//  - Roteia por PATH  ( /Servidor1/... )  e/ou
//  - Roteia por HEADER ( Backend: servidor1 )
//  - Injeta o header "Backend" no servidor de destino
//  - Faz ponte de WebSocket (Upgrade) sem alterar o corpo
//
//  Isto e o que o GitHub Pages NAO consegue fazer.
//  Deploy: Cloudflare -> Workers -> Create -> cole este arquivo.
//  Teste:  https://SEU-WORKER.workers.dev/Servidor1/
// ============================================================

const BACKENDS = {
  cloudjf: { host: "134.65.24.126", port: 80, secure: false },
  rvsnet: { host: "167.126.9.217", port: 80, secure: false },
};

// Opcional: se o path tiver prefixo (ex.: /redirecionamento/Servidor1), informe aqui.
const PATH_PREFIX = ""; // ex.: "/redirecionamento"

function pickBackend(url, request) {
  // 1) header Backend: servidor1
  const h = (request.headers.get("Backend") || "").trim().toLowerCase();
  if (h && BACKENDS[h]) return [h, BACKENDS[h]];

  // 2) primeiro segmento do path
  let path = url.pathname;
  if (PATH_PREFIX && path.startsWith(PATH_PREFIX)) path = path.slice(PATH_PREFIX.length);
  const seg = path.split("/").filter(Boolean)[0];
  const name = decodeURIComponent(seg || "").toLowerCase();
  if (BACKENDS[name]) return [name, BACKENDS[name]];

  return [null, null];
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const [name, backend] = pickBackend(url, request);

    if (!backend) {
      return new Response(
        "Backend nao encontrado. Use /Servidor1 ou o header 'Backend: servidor1'.\n",
        { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    // Monta a URL de destino, removendo o prefixo /ServidorX
    let rest = url.pathname;
    if (PATH_PREFIX && rest.startsWith(PATH_PREFIX)) rest = rest.slice(PATH_PREFIX.length);
    rest = rest.replace(new RegExp("^/" + name + "(?=/|$)", "i"), "");
    if (rest === "") rest = "/";

    const target = new URL(url);
    target.protocol = backend.secure ? "https:" : "http:";
    target.host = backend.host + (backend.port ? ":" + backend.port : "");
    target.pathname = rest;
    // target.search mantido

    const headers = new Headers(request.headers);
    headers.set("Host", backend.host);
    headers.set("Backend", name);              // injeta/reescreve o header
    headers.set("X-Forwarded-Host", url.host);
    headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

    // WebSocket + streaming: repassa o body e os headers de Upgrade como estao.
    return fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });
  },
};
