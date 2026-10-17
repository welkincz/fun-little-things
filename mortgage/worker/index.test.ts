import { describe, expect, it, vi } from "vitest";
import worker from "./index";

const HOST = "https://charliebuild.com";

function assetEnv() {
  const fetched: string[] = [];
  const env = {
    ASSETS: {
      fetch(input: RequestInfo | URL) {
        fetched.push(input instanceof Request ? input.url : input.toString());
        return Promise.resolve(new Response("asset", { status: 200 }));
      },
    },
  };
  return { env, fetched };
}

describe("mortgage worker paths", () => {
  it("redirects /tools/mortgage to /tools/mortgage/ and keeps the query", async () => {
    const { env, fetched } = assetEnv();
    const response = await worker.fetch(new Request(`${HOST}/tools/mortgage?p=800000`), env as Env);

    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(`${HOST}/tools/mortgage/?p=800000`);
    expect(fetched).toEqual([]);
  });

  it("maps /tools/mortgage/assets/x.js to the asset /assets/x.js", async () => {
    const { env, fetched } = assetEnv();
    const response = await worker.fetch(new Request(`${HOST}/tools/mortgage/assets/x.js`), env as Env);

    expect(response.status).toBe(200);
    expect(fetched).toHaveLength(1);
    expect(new URL(fetched[0]).pathname).toBe("/assets/x.js");
    expect(new URL(fetched[0]).search).toBe("");
  });

  it("maps /tools/mortgage/?p=800000 to the asset / and keeps the query", async () => {
    const { env, fetched } = assetEnv();
    const response = await worker.fetch(new Request(`${HOST}/tools/mortgage/?p=800000`), env as Env);

    expect(response.status).toBe(200);
    expect(fetched).toHaveLength(1);
    const assetUrl = new URL(fetched[0]);
    expect(assetUrl.pathname).toBe("/");
    expect(assetUrl.search).toBe("?p=800000");
  });

  it("passes through other paths the mortgage route can catch", async () => {
    const { env, fetched } = assetEnv();
    const url = `${HOST}/tools/mortgagefoo`;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("passed", { status: 200 }));

    try {
      const response = await worker.fetch(new Request(url), env as Env);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("passed");
      expect(fetchSpy).toHaveBeenCalledOnce();
      const forwarded = fetchSpy.mock.calls[0][0];
      const forwardedUrl = forwarded instanceof Request ? forwarded.url : String(forwarded);
      expect(forwardedUrl).toBe(url);
      expect(fetched).toEqual([]);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
