import { ApiError } from "../errors";
import { createMockTransport } from "../mock-transport";

describe("mock transport", () => {
  const store = { clients: [{ id: "c1", name: "Maria" }] };
  const transport = createMockTransport(
    [
      { method: "GET", path: "/v1/clients", handler: () => ({ data: store.clients }) },
      { method: "GET", path: "/v1/clients/:id", handler: ({ params }) => store.clients.find((c) => c.id === params.id) },
      {
        method: "POST",
        path: "/v1/fail",
        handler: () => {
          throw new ApiError({ status: 422, code: "BUSINESS_RULE", message: "Regra" });
        }
      }
    ],
    { latencyMs: 0 }
  );

  it("matches paths with params and ignores query strings", async () => {
    await expect(transport.request({ method: "GET", path: "/v1/clients/c1?x=1" })).resolves.toEqual({ id: "c1", name: "Maria" });
  });

  it("returns copies so callers cannot mutate mock state", async () => {
    const result = await transport.request<{ data: { name: string }[] }>({ method: "GET", path: "/v1/clients" });
    result.data[0]!.name = "changed";
    expect(store.clients[0]!.name).toBe("Maria");
  });

  it("propagates simulated backend errors", async () => {
    await expect(transport.request({ method: "POST", path: "/v1/fail" })).rejects.toMatchObject({ code: "BUSINESS_RULE" });
  });

  it("fails loudly for routes without a mock", async () => {
    await expect(transport.request({ method: "GET", path: "/v1/unknown" })).rejects.toMatchObject({
      status: 404,
      code: "MOCK_NOT_FOUND"
    });
  });
});
