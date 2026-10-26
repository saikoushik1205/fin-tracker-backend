const {
  toPaise,
  fromPaise,
  isRepayment,
  isLegacySplitLoan,
  isLegacyCompletedLoan,
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

  describe("Classification Helpers", () => {
    test("identifies new clean repayment by type", () => {
      expect(isRepayment({ type: "repayment", amount: 500 })).toBe(true);
      expect(isRepayment({ type: "REPAYMENT", amount: 500 })).toBe(true);
    });

    test("identifies legacy settlement by remarks", () => {
      expect(isRepayment({ remarks: "Settlement received: ₹500 via Cash" })).toBe(true);
      expect(isRepayment({ remarks: "Normal loan to friend" })).toBe(false);
    });

    test("identifies legacy split loan", () => {
      expect(
        isLegacySplitLoan({
          remarks: "Grocery loan (Remaining pending after partial settlement)",
        })
      ).toBe(true);
      expect(isLegacySplitLoan({ remarks: "Grocery loan" })).toBe(false);
    });

    test("identifies legacy completed loan", () => {
      expect(isLegacyCompletedLoan({ status: "completed", type: "" })).toBe(true);
      expect(isLegacyCompletedLoan({ status: "pending", type: "" })).toBe(false);
      // A repayment with completed status is not a legacy completed loan
      expect(isLegacyCompletedLoan({ status: "completed", type: "repayment" })).toBe(false);
    });
  });

  describe("calculatePersonStats - Clean Ledger & Legacy Scenarios", () => {
    test("returns zeroes for empty or null transactions", () => {
      expect(calculatePersonStats([])).toEqual({
        transactionCount: 0,
        total: 0,
        completed: 0,
        pending: 0,
        advance: 0,
      });
      expect(calculatePersonStats(null)).toEqual({
        transactionCount: 0,
        total: 0,
        completed: 0,
        pending: 0,
        advance: 0,
      });
    });

    test("single clean pending loan", () => {
      const txs = [{ amount: 5000, status: "pending", type: "" }];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(5000);
      expect(res.completed).toBe(0);
      expect(res.pending).toBe(5000);
      expect(res.advance).toBe(0);
    });

    test("scenario 1: partial settlement (1 loan, 1 repayment)", () => {
      const txs = [
        { amount: 10000, status: "pending", type: "" },
        { amount: 3000, status: "completed", type: "repayment" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(10000);
      expect(res.completed).toBe(3000);
      expect(res.pending).toBe(7000);
      expect(res.advance).toBe(0);
      expect(res.pending).toBe(res.total - res.completed);
    });

    test("scenario 2: full settlement (1 loan, 1 full repayment)", () => {
      const txs = [
        { amount: 5000, status: "pending", type: "" },
        { amount: 5000, status: "completed", type: "repayment" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(5000);
      expect(res.completed).toBe(5000);
      expect(res.pending).toBe(0);
      expect(res.advance).toBe(0);
    });

    test("scenario 3: multiple partial settlements (1 loan, 3 repayments)", () => {
      const txs = [
        { amount: 10000, status: "pending", type: "" },
        { amount: 2000, status: "completed", type: "repayment" },
        { amount: 3000, status: "completed", type: "repayment" },
        { amount: 1500, status: "completed", type: "repayment" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(10000);
      expect(res.completed).toBe(6500);
      expect(res.pending).toBe(3500);
      expect(res.advance).toBe(0);
      expect(res.pending).toBe(res.total - res.completed);
    });

    test("scenario 4: overpayment / advance (repayments > loan)", () => {
      const txs = [
        { amount: 5000, status: "pending", type: "" },
        { amount: 6000, status: "completed", type: "repayment" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(5000);
      expect(res.completed).toBe(6000);
      expect(res.pending).toBe(0);
      expect(res.advance).toBe(1000);
    });

    test("scenario 5: legacy rows with remarks 'Settlement received'", () => {
      const txs = [
        { amount: 1540, status: "pending", remarks: "Dinner share", type: "" },
        {
          amount: 540,
          status: "completed",
          remarks: "Settlement received: ₹540.00 via GPay",
          type: "",
        },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(1540);
      expect(res.completed).toBe(540);
      expect(res.pending).toBe(1000);
      expect(res.advance).toBe(0);
    });

    test("scenario 6: legacy completed loan without repayment is not counted as pending", () => {
      const txs = [
        { amount: 2500, status: "completed", remarks: "Old loan settled years ago", type: "" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(2500);
      expect(res.completed).toBe(2500);
      expect(res.pending).toBe(0);
      expect(res.advance).toBe(0);
    });

    test("scenario 7: deleting or editing a repayment cleanly recomputes totals", () => {
      const initialTxs = [
        { id: 1, amount: 8000, status: "pending", type: "" },
        { id: 2, amount: 3000, status: "completed", type: "repayment" },
      ];
      let res = calculatePersonStats(initialTxs);
      expect(res.pending).toBe(5000);

      // Edit repayment from 3000 to 4000
      const editedTxs = [
        { id: 1, amount: 8000, status: "pending", type: "" },
        { id: 2, amount: 4000, status: "completed", type: "repayment" },
      ];
      res = calculatePersonStats(editedTxs);
      expect(res.pending).toBe(4000);
      expect(res.completed).toBe(4000);

      // Delete repayment
      const afterDelete = [{ id: 1, amount: 8000, status: "pending", type: "" }];
      res = calculatePersonStats(afterDelete);
      expect(res.pending).toBe(8000);
      expect(res.completed).toBe(0);
    });

    test("ignores cancelled transactions completely", () => {
      const txs = [
        { amount: 1000, status: "pending", type: "" },
        { amount: 9999, status: "cancelled", type: "" },
        { amount: 200, status: "cancelled", type: "repayment" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(1000);
      expect(res.completed).toBe(0);
      expect(res.pending).toBe(1000);
      expect(res.transactionCount).toBe(1);
    });

    test("handles decimal paise amounts properly without floating precision bugs", () => {
      const txs = [
        { amount: 100.25, status: "pending", type: "" },
        { amount: 200.75, status: "pending", type: "" },
        { amount: 50.1, status: "completed", type: "repayment" },
      ];
      const res = calculatePersonStats(txs);
      expect(res.total).toBe(301);
      expect(res.completed).toBe(50.1);
      expect(res.pending).toBe(250.9);
      expect(res.advance).toBe(0);
    });
  });

  describe("aggregateSectionTotals", () => {
    test("aggregates empty list to 0", () => {
      expect(aggregateSectionTotals([])).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        advance: 0,
      });
    });

    test("guarantees aggregate pending equals total minus completed", () => {
      const persons = [
        { stats: { total: 2650, completed: 1110, pending: 1540, advance: 0 } },
        { stats: { total: 99109, completed: 4500, pending: 94609, advance: 0 } },
      ];
      const agg = aggregateSectionTotals(persons);
      expect(agg.total).toBe(101759);
      expect(agg.completed).toBe(5610);
      expect(agg.pending).toBe(96149);
      expect(agg.pending).toBe(agg.total - agg.completed);
    });
  });
});
