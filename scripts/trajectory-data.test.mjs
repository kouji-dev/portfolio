import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucket, weekCount } from './trajectory-data.mjs';

test('weekCount counts the current partial week', () => {
  assert.equal(weekCount(Date.parse('2025-12-01T00:00:00Z')), 1);
  assert.equal(weekCount(Date.parse('2025-12-07T23:59:59Z')), 1);
  assert.equal(weekCount(Date.parse('2025-12-08T00:00:00Z')), 2);
});

test('bucket drops dates outside the window', () => {
  const m = bucket([
    '2025-11-30T23:59:59Z', // before start
    '2025-12-01T00:00:00Z', '2025-12-07T12:00:00+02:00', // week 0
    '2025-12-15T09:00:00Z', // week 2
    '2026-01-05T00:00:00Z', // week 5, past n
  ], 3);
  assert.deepEqual(m, [2, 0, 1]);
});
