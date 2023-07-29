export const objectify = <T>(o: T): T | T[] => {
  switch (typeof o) {
    case 'string':
      try {
        return objectify(JSON.parse(o));
      } catch {
        return o;
      }
    case 'object':
      if (Array.isArray(o)) {
        return o.map(objectify);
      }
      else if (o !== null) {
        try {
          return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, objectify(v)])) as T;
        } catch {
          return o;
        }
      }
      break;
  }
  return o;
};
