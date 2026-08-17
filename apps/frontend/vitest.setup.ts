// Global test setup for the frontend vitest suite.
// Intentionally minimal: the pure-logic specs (parsers, url builders, dedup)
// need nothing here, and component specs bring their own mocks. Kept as a stable
// hook so future shared setup (e.g. jest-dom matchers, once added) has a home.
export {};
