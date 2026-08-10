import { describe, expect, test } from "vitest";
import { pageMeta, parsePagination } from "@/lib/api/pagination";

describe("pagination helpers", () => {
  test("defaults page and limit", () => {
    const p = parsePagination(new URLSearchParams());
    expect(p.page).toBe(1);
    expect(p.limit).toBe(50);
    expect(p.skip).toBe(0);
  });

  test("parses page and limit", () => {
    const p = parsePagination(new URLSearchParams("page=3&limit=25"));
    expect(p.page).toBe(3);
    expect(p.limit).toBe(25);
    expect(p.skip).toBe(50);
  });

  test("caps limit at max", () => {
    const p = parsePagination(new URLSearchParams("limit=999"));
    expect(p.limit).toBe(100);
  });

  test("pageMeta computes hasMore", () => {
    expect(pageMeta(120, 1, 50)).toEqual({
      total: 120,
      page: 1,
      limit: 50,
      totalPages: 3,
      hasMore: true,
    });
    expect(pageMeta(10, 1, 50).hasMore).toBe(false);
  });
});
