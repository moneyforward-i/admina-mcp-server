export function filtersToParams(filters: Record<string, any>): URLSearchParams {
  const queryParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)) {
      if (Array.isArray(value) && value.length > 0) {
        // Append each array value separately to generate format: key=value1&key=value2
        value.forEach(item => {
          queryParams.append(key, String(item));
        });
      } else if (typeof value === "boolean") {
        queryParams.append(key, value.toString());
      } else {
        queryParams.append(key, String(value));
      }
    }
  });
  return queryParams;
}
