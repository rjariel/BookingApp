import { describe, expect, it } from 'vitest';
import { computeFreeSlots } from './availability';

const date = new Date(2025, 0, 15); // Jan 15 2025 (local)
const h = (hour: number, min = 0) => new Date(2025, 0, 15, hour, min, 0, 0);

describe('computeFreeSlots', () => {
  it('returns full window when no bookings', () => {
    const slots = computeFreeSlots(date, []);
    expect(slots).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!.start).toEqual(h(9));
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!.end).toEqual(h(18));
  });

  it('returns nothing when fully booked', () => {
    const slots = computeFreeSlots(date, [{ startsAt: h(9), endsAt: h(18) }]);
    expect(slots).toHaveLength(0);
  });

  it('splits window around a mid-day booking', () => {
    const slots = computeFreeSlots(date, [{ startsAt: h(11), endsAt: h(13) }]);
    expect(slots).toHaveLength(2);
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!).toEqual({ start: h(9), end: h(11) });
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[1]!).toEqual({ start: h(13), end: h(18) });
  });

  it('handles booking at start of window', () => {
    const slots = computeFreeSlots(date, [{ startsAt: h(9), endsAt: h(10) }]);
    expect(slots).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!).toEqual({ start: h(10), end: h(18) });
  });

  it('handles booking at end of window', () => {
    const slots = computeFreeSlots(date, [{ startsAt: h(17), endsAt: h(18) }]);
    expect(slots).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!).toEqual({ start: h(9), end: h(17) });
  });

  it('filters gaps smaller than 15 min', () => {
    // Two bookings leave a 10-min gap between 11:00 and 11:10
    const slots = computeFreeSlots(date, [
      { startsAt: h(9), endsAt: h(11) },
      { startsAt: h(11, 10), endsAt: h(18) },
    ]);
    expect(slots).toHaveLength(0);
  });

  it('keeps gaps exactly 15 min', () => {
    const slots = computeFreeSlots(date, [
      { startsAt: h(9), endsAt: h(11) },
      { startsAt: h(11, 15), endsAt: h(18) },
    ]);
    expect(slots).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!).toEqual({ start: h(11), end: h(11, 15) });
  });

  it('handles multiple bookings in order', () => {
    const slots = computeFreeSlots(date, [
      { startsAt: h(10), endsAt: h(11) },
      { startsAt: h(13), endsAt: h(14) },
      { startsAt: h(16), endsAt: h(17) },
    ]);
    expect(slots).toHaveLength(4);
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!).toEqual({ start: h(9), end: h(10) });
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[1]!).toEqual({ start: h(11), end: h(13) });
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[2]!).toEqual({ start: h(14), end: h(16) });
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[3]!).toEqual({ start: h(17), end: h(18) });
  });

  it('handles unsorted bookings', () => {
    const slots = computeFreeSlots(date, [
      { startsAt: h(14), endsAt: h(15) },
      { startsAt: h(10), endsAt: h(11) },
    ]);
    expect(slots).toHaveLength(3);
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!.start).toEqual(h(9));
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[1]!.start).toEqual(h(11));
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[2]!.start).toEqual(h(15));
  });

  it('clips bookings that extend past window end', () => {
    const slots = computeFreeSlots(date, [{ startsAt: h(17), endsAt: h(19) }]);
    expect(slots).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    expect(slots[0]!).toEqual({ start: h(9), end: h(17) });
  });
});
