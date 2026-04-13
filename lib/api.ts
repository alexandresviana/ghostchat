const base = () =>
  process.env.NEXT_PUBLIC_EDGE_API_URL?.replace(/\/$/, "") ?? "";

/**
 * Chamadas HTTP ao Bunny Edge Script (REST). WebSocket: use `new WebSocket` com a mesma origem/wss.
 */
export async function edgeFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const root = base();
  if (!root) {
    throw new Error("Configure NEXT_PUBLIC_EDGE_API_URL para chamar a API Edge.");
  }
  const url = `${root}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
