import { OnceIn, User } from '../mongo';

export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never;

const weekDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const reverseDayOfMonthSuffix = {
  st: [1, 21, 31],
  nd: [2, 22],
  rd: [3, 23],
  th: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 25, 26, 27, 28, 29, 30]
};
const dayOfMonthSuffix = Object.fromEntries(
  Object.entries(reverseDayOfMonthSuffix).flatMap(([suffix, dates]) => {
    return dates.map((d) => [d, suffix]);
  })
);

export const formatLabelAlert = (
  alertConfig: ArrayElement<ArrayElement<NonNullable<User['labels']>>['alertConfig']>
): string => {
  const startOn = typeof alertConfig.startOn === "string" ? new Date(alertConfig.startOn) : alertConfig.startOn;
  const s = alertConfig.onceInValue !== 1 ? 's' : '';
  const v = s ? `${alertConfig.onceInValue} ` : ''; // With space if needed
  const secs = `${startOn.getSeconds()}`.padStart(2, '0');
  const mins = `${startOn.getMinutes()}`.padStart(2, '0');
  const hrs = `${startOn.getHours()}`.padStart(2, '0');
  const time = `${hrs}:${mins}:${secs}`;
  const sum =
    alertConfig.summarizeAbove > 0
      ? `Sums above ${alertConfig.summarizeAbove}`
      : alertConfig.summarizeAbove === 0
      ? 'Always Sums'
      : 'Never Sums';
  switch (alertConfig.onceInType) {
    case OnceIn.Immediate:
      return 'Immediate';
    case OnceIn.Minutes:
      return `Every ${v}minute${s} from 00:${mins}:${secs}, ${sum}`;
    case OnceIn.Hours:
      return `Every ${v}hour${s} at 00:${mins}:${secs}, ${sum}`;
    case OnceIn.Days:
      return `Every ${v}day${s} at ${time}, ${sum}`;
    case OnceIn.Weeks:
      return `Every ${v}week${s} on ${weekDay[startOn.getDay()]}, at ${time}, ${sum}`;
    case OnceIn.Months:
      return `Every ${v}month${s} on the ${startOn.getDate()}${
        dayOfMonthSuffix[startOn.getDate()]
      }, at ${time}, ${sum}`;
  }
};
