export function filtersToParams(filters: Record<string, any>): URLSearchParams {
  const queryParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length > 0) {
        queryParams.append(key, value.join(","));
      } else if (typeof value === "boolean") {
        queryParams.append(key, value.toString());
      } else {
        queryParams.append(key, String(value));
      }
    }
  });
  return queryParams;
}
