import { isApiError, ApiError } from "@/services/api/errors";

import { createQueryClient } from "../query-client";
import { queryKeys } from "../query-keys";

describe("query keys", () => {
  it("scopes user data by user id so accounts never share cache entries", () => {
    expect(queryKeys.user("u1", "clients", { page: 1 })).toEqual(["user", "u1", "clients", { page: 1 }]);
    expect(queryKeys.user("u1", "dashboard")).not.toEqual(queryKeys.user("u2", "dashboard"));
    expect(queryKeys.auth.me("u1")[1]).toBe("u1");
  });
});

describe("query client defaults", () => {
  const client = createQueryClient();
  const retry = client.getDefaultOptions().queries?.retry as (count: number, error: unknown) => boolean;

  it("does not retry client errors", () => {
    const error = new ApiError({ status: 403, code: "FORBIDDEN", message: "x" });
    expect(isApiError(error)).toBe(true);
    expect(retry(0, error)).toBe(false);
  });

  it("retries network and server errors up to twice", () => {
    const error = new ApiError({ status: 503, code: "DEPENDENCY_UNAVAILABLE", message: "x" });
    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });
});
