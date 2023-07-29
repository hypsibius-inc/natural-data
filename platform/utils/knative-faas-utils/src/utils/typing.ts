export type Values<T> = T[keyof T];

export type TypedObject = {
  type: string;
};

export type TypedObjectExtractor<T extends TypedObject, V extends T['type']> = Extract<T, { type: V }>;

export type ConditionalFunc<
  T extends TypedObject,
  R extends Record<T['type'], any>,
  E extends Record<T['type'], any> = never,
  dataProp extends string = 'data',
  extraProp extends string = 'extra'
> = <K extends T['type'], V extends TypedObjectExtractor<T, K>>(
  args: {
    [k in dataProp]: k extends dataProp ? V & { type: K } : never;
  } & {
    [k in extraProp]?: E[K];
  }
) => R[K];
