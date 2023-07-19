export type Values<T> = T[keyof T];

export type ConditionalFunc<
  T,
  R extends Record<keyof T, any>,
  E extends Record<keyof T, any> = never,
  keyProp extends string = 'type',
  dataProp extends string = 'data',
  extraProp extends string = 'extra'
> = <Key extends keyof T>(
  args: {
    [k in keyProp | dataProp]: k extends keyProp ? Key : k extends dataProp ? T[Key] : never;
  } & {
    [k in extraProp]?: E[Key];
  }
) => R[Key];
