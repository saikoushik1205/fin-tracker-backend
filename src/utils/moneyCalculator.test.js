const {
  toPaise,
  fromPaise,
  calculatePersonStats,
  aggregateSectionTotals,
} = require("./moneyCalculator");

describe("Money Calculator Utility (Backend)", () => {
  describe("Paise conversion", () => {
    test("converts rupees to paise accurately", () => {
      expect(toPaise(100)).toBe(10000);
      expect(toPaise(0.5)).toBe(50);
      expect(toPaise(1234.56)).toBe(123456);
      expect(toPaise(null)).toBe(0);
      expect(toPaise(undefined)).toBe(0);
      expect(toPaise(NaN)).toBe(0);
    });

    test("handles IEEE floating point edge cases without rounding error", () => {
      const sum = 0.1 + 0.2;
      expect(toPaise(sum)).toBe(30);
      expect(fromPaise(30)).toBe(0.3);
    });

    test("converts paise to rupees accurately", () => {
      expect(fromPaise(10000)).toBe(100);
      expect(fromPaise(50)).toBe(0.5);
      expect(fromPaise(123456)).toBe(1234.56);
      expect(fromPaise(0)).toBe(0);
    });
  });

  describe("calculatePersonStats", () => {
    test("returns zeroes for empty or zero-transaction person", () => {
      expect(calculatePersonStats([])).toEqual({
        transactionCount: 0,
        total: 0,
        completed: 0,
        pending: 0,
      });
      expect(calculatePersonStats(null)).toEqual({
        transactionCount: 0,
        total: 0,
        completed: 0,
        pending: 0,
      });
    });

    test("accurately calculates single pending transaction", () => {
      const txs = [{ amount: 5000, status: "pending" }];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(5000);
      expect(res.completed).toBe(0);
      expect(res.pending).toBe(5000);
      expect(res.pending).toBe(res.total - res.completed);
    });

    test("accurately calculates single completed transaction", () => {
      const txs = [{ amount: 2500, status: "completed" }];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(2500);
      expect(res.completed).toBe(2500);
      expect(res.pending).toBe(0);
      expect(res.pending).toBe(res.total - res.completed);
    });

    test("reconciles legacy records so only pending and completed exist", () => {
      const txs = [
        { amount: 1540, status: "pending" },
        { amount: 1110, status: "completed" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(2650);
      expect(res.completed).toBe(1110);
      expect(res.pending).toBe(1540);
      expect(res.pending).toBe(res.total - res.completed);
    });

    test("ignores cancelled transactions completely", () => {
      const txs = [
        { amount: 1000, status: "pending" },
        { amount: 9999, status: "cancelled" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(1000);
      expect(res.completed).toBe(0);
      expect(res.pending).toBe(1000);
      expect(res.transactionCount).toBe(1);
    });

    test("handles decimal paise amounts properly", () => {
      const txs = [
        { amount: 100.25, status: "pending" },
        { amount: 200.75, status: "completed" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(301);
      expect(res.completed).toBe(200.75);
      expect(res.pending).toBe(100.25);
      expect(res.pending).toBe(Number((res.total - res.completed).toFixed(2)));
    });

    test("accurately calculates settlements without misclassifying pending loans that mention settled via", () => {
      const txs = [
        {
          amount: 426,
          status: "completed",
          type: "repayment",
          remarks: "Settlement received: ₹426 via UPI / Online - PAY-PAL TRANSFER",
        },
        { amount: 604, status: "pending", remarks: "Nothing Charger Order" },
        {
          amount: 5385,
          status: "pending",
          remarks: "Mobile Order (Remaining pending after partial settlement)",
        },
        {
          amount: 300,
          status: "pending",
          remarks: "Transfer | Settled via UPI / Online",
        },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(6289);
      expect(res.completed).toBe(426);
      expect(res.pending).toBe(5863);
      expect(res.transactionCount).toBe(4);
    });
  });

  describe("aggregateSectionTotals", () => {
    test("aggregates empty list to 0", () => {
      expect(aggregateSectionTotals([])).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
      });
    });

    test("guarantees aggregate pending equals total minus completed", () => {
      const persons = [
        { stats: { total: 2650, completed: 1110, pending: 1540 } },
        { stats: { total: 99109, completed: 4500, pending: 94609 } },
      ];
      const agg = aggregateSectionTotals(persons);
      expect(agg.total).toBe(101759);
      expect(agg.completed).toBe(5610);
      expect(agg.pending).toBe(96149);
      expect(agg.pending).toBe(agg.total - agg.completed);
    });
  });
});
