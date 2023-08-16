export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never;

export type ReverseMap<
  K extends string | number | symbol,
  V extends string | number | symbol,
  R extends Record<K, V>
> = {
  [k in keyof R as R[k]]: k;
};
