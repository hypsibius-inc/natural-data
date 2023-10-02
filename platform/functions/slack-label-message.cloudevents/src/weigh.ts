import math from 'mathjs';

const CONTEXT_WEIGHT = 1;

const sum = (arr: number[]) => arr.reduce((partialSum, a) => partialSum + a, 0);

/**
 * Get the weights for each of the texts.
 * @param texts An ordered list of texts, from newest (current) to oldest.
 *              Must be at least of length 1.
 * @param context Text representing the context within which the other texts were created (initial thread message);
 * @returns An array of the weights required to multiply for each text. The sum of all weights is 1.
 */
export const getWeights = (
  texts: string[],
  context?: string
): {
  weights: number[];
  contextWeight?: number;
} => {
  const weights = texts.map(
    (t, i) =>
      getWeightByTextLength(getNumberOfWords(t)) * getWeightByTextLocation(i)
  );
  const contextWeight = context?.length
    ? getWeightByTextLength(getNumberOfWords(context)) * CONTEXT_WEIGHT
    : 0;
  const weightSum = sum(weights) + contextWeight;
  return {
    weights: weights.map((w) => w / weightSum),
    contextWeight: contextWeight / weightSum
  };
};

const getNumberOfWords = (t: string): number =>
  t.split(/\s+/gm).filter((v) => v.trim().length).length;

const getWeightByTextLength = (length: number): number => {
  const x = Math.min(length, 33);
  if (x < 5) {
    return 0;
  }
  const res = math.pow(x - 14, 3.6);
  const real =
    typeof res === 'number'
      ? res
      : math.typeOf(res) === 'Complex'
      ? (res as math.Complex).re
      : null;
  if (real === null) throw Error(`Unexpected power with ${x}`);
  return (0.002 * Math.pow(x - 1, 3) - 0.0008 * real) / 42 + 0.2;
  //   return 0.172727 * Math.pow(length, 0.357607) + 0.0214873;
};

const getWeightByTextLocation = (index: number): number => {
  return 1 / Math.pow(index + 1, 0.95);
};
