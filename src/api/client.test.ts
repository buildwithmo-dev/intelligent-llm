import { api, ApiError, setUnauthorizedHandler, tokenStore } from "./client";

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
}

afterEach(() => setUnauthorizedHandler(null));

describe("api client", () => {
  it("sends the bearer token on authenticated calls", async () => {
    tokenStore.set("abc");
    const spy = mockFetch(200, []);
    await api.listConversations();
    const headers = spy.mock.calls[0][1]!.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer abc");
  });

  it("does not send a token on login", async () => {
    tokenStore.set("stale");
    const spy = mockFetch(200, { access_token: "t" });
    await api.login("a@b.co", "password1");
    const headers = spy.mock.calls[0][1]!.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("surfaces the server's error message", async () => {
    mockFetch(401, { detail: "Invalid email or password" });
    await expect(api.login("a@b.co", "bad")).rejects.toMatchObject({
      status: 401,
      message: "Invalid email or password",
    });
  });

  it("does not log out when a login attempt fails", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    tokenStore.set("existing");
    mockFetch(401, { detail: "Invalid email or password" });
    await expect(api.login("a@b.co", "bad")).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it("logs out when an authenticated call is rejected", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    tokenStore.set("expired");
    mockFetch(401, { detail: "Not authenticated" });
    await expect(api.listConversations()).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("turns validation errors into a readable message", async () => {
    mockFetch(422, { detail: [{ loc: ["body", "email"], msg: "bad" }] });
    await expect(api.signup("x", "y")).rejects.toThrow("not valid");
  });

  it("reports network failure clearly", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fail"));
    await expect(api.me()).rejects.toMatchObject({ status: 0 });
  });
});
