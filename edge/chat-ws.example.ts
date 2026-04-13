/**
 * Exemplo para Bunny Edge Scripting (@bunny.net/edgescript-sdk).
 * Copie para o painel Bunny ou publique via CLI; associe a uma Pull Zone com WebSockets ativados.
 *
 * Em produção: valide JWT, verifique participants no Bunny Database antes de ecoar mensagens.
 */
/*
import * as BunnySDK from "@bunny.net/edgescript-sdk";

BunnySDK.net.http.serve(async (request: Request) => {
  const url = new URL(request.url);

  if (url.pathname === "/ws" && request.headers.get("upgrade") === "websocket") {
    const { response, socket } = request.upgradeWebSocket();

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "hello", from: "ghost-chat-edge" }));
    });

    socket.addEventListener("message", (event) => {
      socket.send(JSON.stringify({ type: "echo", data: event.data }));
    });

    return response;
  }

  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Ghost Chat Edge", { status: 404 });
});
*/

export {};
