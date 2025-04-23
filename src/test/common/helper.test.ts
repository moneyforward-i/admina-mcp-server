import { filtersToParams } from "../../common/helper.js";

describe("filtersToParams", () => {
  it("should convert an object to URLSearchParams", () => {
    const filters = {
      name: "test",
      count: 10,
      active: true,
    };

    const params = filtersToParams(filters);

    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.get("name")).toBe("test");
    expect(params.get("count")).toBe("10");
    expect(params.get("active")).toBe("true");
  });

  it("should join array values with commas", () => {
    const filters = {
      tags: ["tag1", "tag2", "tag3"],
      ids: [1, 2, 3],
    };

    const params = filtersToParams(filters);

    expect(params.get("tags")).toBe("tag1,tag2,tag3");
    expect(params.get("ids")).toBe("1,2,3");
  });

  it("should skip undefined and null values", () => {
    const filters = {
      name: "test",
      description: undefined,
      category: null,
      active: true,
    };

    const params = filtersToParams(filters);

    expect(params.has("name")).toBe(true);
    expect(params.has("description")).toBe(false);
    expect(params.has("category")).toBe(false);
    expect(params.has("active")).toBe(true);
  });

  it("should handle empty filter object", () => {
    const filters = {};

    const params = filtersToParams(filters);

    expect(params).toBeInstanceOf(URLSearchParams);
    expect(Array.from(params.entries()).length).toBe(0);
  });

  it("should skip empty arrays", () => {
    const filters = {
      tags: [],
      name: "test",
    };

    const params = filtersToParams(filters);

    // Empty arrays should be skipped entirely
    expect(params.has("tags")).toBe(false);
    expect(params.has("name")).toBe(true);
  });
});
