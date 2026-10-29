import { expect, it } from 'vitest';
import { formatBookmarkTime, parseBookmarkTime } from './bookmark-time';

it.each([
  [0, '00:00:00'],
  [25, '00:00:25'],
  [35.125, '00:00:35.125'],
  [59.9996, '00:01:00'],
  [3723.1, '01:02:03.100'],
  [360000, '100:00:00'],
] as const)('formats %s seconds as %s', (seconds, expected) => {
  expect(formatBookmarkTime(seconds)).toBe(expected);
});

it.each([
  ['00:00:00', 0],
  ['01:02:03.125', 3723.125],
  ['1:02:03', 3723],
  ['02:03.100', 123.1],
  ['75:03', 4503],
  ['35.125', 35.125],
  [' 00:01:02 ', 62],
  ['100:00:00', 360000],
] as const)('parses %s without losing its time', (value, seconds) => {
  expect(parseBookmarkTime(value)).toBe(seconds);
});

it.each([
  '',
  ':',
  '1:',
  '::1',
  '-1',
  'NaN',
  'Infinity',
  '1e3',
  '00:60:00',
  '00:00:60',
  '1:60',
  '00:00:01.2345',
  '1:2:3:4',
  '99999999999999999999',
])('rejects an invalid timestamp (%s)', (value) => {
  expect(parseBookmarkTime(value)).toBeNull();
});
