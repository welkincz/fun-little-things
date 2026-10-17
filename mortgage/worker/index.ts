const PREFIX = "/tools/mortgage";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === PREFIX) {
      url.pathname = `${PREFIX}/`;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith(`${PREFIX}/`)) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = url.pathname.slice(PREFIX.length);
      return env.ASSETS.fetch(assetUrl.toString());
    }

    // `charliebuild.com/tools/mortgage*` also matches paths like /tools/mortgagefoo.
    return fetch(request);
  },
} satisfies ExportedHandler<Env>;
