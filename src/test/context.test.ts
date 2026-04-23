import { getCurrentCredentials, withCredentials } from "../context.js";

describe("context", () => {
  it("returns undefined outside of a withCredentials scope", () => {
    expect(getCurrentCredentials()).toBeUndefined();
  });

  it("exposes credentials inside a synchronous scope", () => {
    const creds = { apiKey: "k1", organizationId: "o1" };
    const seen = withCredentials(creds, () => getCurrentCredentials());
    expect(seen).toEqual(creds);
  });

  it("exposes credentials across awaits inside the scope", async () => {
    const creds = { apiKey: "k2", organizationId: "o2" };
    const seen = await withCredentials(creds, async () => {
      await Promise.resolve();
      await new Promise((resolve) => setImmediate(resolve));
      return getCurrentCredentials();
    });
    expect(seen).toEqual(creds);
  });

  it("isolates credentials across concurrent scopes", async () => {
    const credsA = { apiKey: "keyA", organizationId: "orgA" };
    const credsB = { apiKey: "keyB", organizationId: "orgB" };

    const run = async (creds: typeof credsA) =>
      withCredentials(creds, async () => {
        await new Promise((resolve) => setImmediate(resolve));
        return getCurrentCredentials();
      });

    const [seenA, seenB] = await Promise.all([run(credsA), run(credsB)]);

    expect(seenA).toEqual(credsA);
    expect(seenB).toEqual(credsB);
  });

  it("clears the scope after the callback resolves", async () => {
    await withCredentials({ apiKey: "k", organizationId: "o" }, async () => {
      await Promise.resolve();
    });
    expect(getCurrentCredentials()).toBeUndefined();
  });
});
