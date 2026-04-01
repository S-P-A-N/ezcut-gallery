export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
        }
      });
    }

    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey || apiKey !== env.UPLOAD_API_KEY) {
      return new Response("Unauthorized. Valid X-API-Key header required.", {
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    const url = new URL(request.url);

    const contentsPrefix = "/repos/S-P-A-N/ezcut-gallery/contents/";
    if (!url.pathname.startsWith(contentsPrefix)) {
      return new Response("Forbidden. Only /repos/S-P-A-N/ezcut-gallery/contents/ paths are allowed.", {
        status: 403,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    const repoPath = url.pathname.slice(contentsPrefix.length);
    if (!repoPath.startsWith("emojis/") && repoPath !== "gallery.json") {
      return new Response("Forbidden. Only emojis/ and gallery.json paths are allowed.", {
        status: 403,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) {
      return new Response("Payload Too Large. Max 50MB.", {
        status: 413,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    const targetUrl = `https://api.github.com${url.pathname}${url.search}`;
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    if (!env.GITHUB_PAT) {
      return new Response("Server Misconfiguration: GITHUB_PAT is missing in Cloudflare environment.", {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    newRequest.headers.set("Authorization", `Bearer ${env.GITHUB_PAT}`);
    newRequest.headers.set("User-Agent", "ezcut-cloudflare-proxy");

    newRequest.headers.delete("Host");
    newRequest.headers.delete("Origin");
    newRequest.headers.delete("X-API-Key");

    try {
      const response = await fetch(newRequest);

      const res = new Response(response.body, response);
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    } catch (e) {
      return new Response(`Proxy Fetch Error: ${e.message}`, {
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
