// Allow importing server-only modules in unit tests.
import { vi } from "vitest";

vi.mock("server-only", () => ({}));
