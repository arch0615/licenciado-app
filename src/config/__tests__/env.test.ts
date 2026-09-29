import { isFirebaseConfigured, parseConfig } from "../env";

const productionBase = {
  EXPO_PUBLIC_APP_ENV: "production",
  EXPO_PUBLIC_AUTH_API_URL: "https://auth.acvel.test",
  EXPO_PUBLIC_BUSINESS_API_URL: "https://api.acvel.test",
  EXPO_PUBLIC_FIREBASE_API_KEY: "key",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "acvel",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:2:web:3"
};

describe("app config", () => {
  it("defaults to development with mocks off and nothing configured", () => {
    const config = parseConfig({});
    expect(config).toMatchObject({
      appEnv: "development",
      useMocks: false,
      authApiUrl: "",
      businessApiUrl: "",
      rateioApiUrl: "",
      apiTimeoutMs: 15000
    });
    expect(isFirebaseConfigured(config)).toBe(false);
  });

  it("parses the mock toggle and trims trailing slashes of every service URL", () => {
    const config = parseConfig({
      EXPO_PUBLIC_USE_MOCKS: "true",
      EXPO_PUBLIC_AUTH_API_URL: "http://localhost:3333/",
      EXPO_PUBLIC_BUSINESS_API_URL: "http://localhost:3333//",
      EXPO_PUBLIC_RATEIO_API_URL: "http://localhost:4000/"
    });
    expect(config.useMocks).toBe(true);
    expect(config.authApiUrl).toBe("http://localhost:3333");
    expect(config.businessApiUrl).toBe("http://localhost:3333");
    expect(config.rateioApiUrl).toBe("http://localhost:4000");
  });

  it("accepts a complete production configuration", () => {
    const config = parseConfig(productionBase);
    expect(config.appEnv).toBe("production");
    expect(isFirebaseConfigured(config)).toBe(true);
  });

  it("forbids mocks in production", () => {
    expect(() => parseConfig({ ...productionBase, EXPO_PUBLIC_USE_MOCKS: "true" })).toThrow(/Mocks are not allowed/);
  });

  it("requires https in production", () => {
    expect(() => parseConfig({ ...productionBase, EXPO_PUBLIC_BUSINESS_API_URL: "http://api.x" })).toThrow(/https/);
  });

  it("requires the service URLs and Firebase config in production", () => {
    expect(() => parseConfig({ ...productionBase, EXPO_PUBLIC_AUTH_API_URL: "" })).toThrow(/auth and business/);
    expect(() => parseConfig({ ...productionBase, EXPO_PUBLIC_FIREBASE_API_KEY: "" })).toThrow(/Firebase/);
  });

  it("rejects malformed URLs", () => {
    expect(() => parseConfig({ EXPO_PUBLIC_AUTH_API_URL: "api.x" })).toThrow(/http\(s\)/);
  });
});
