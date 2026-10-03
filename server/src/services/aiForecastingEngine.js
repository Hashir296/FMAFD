/**
 * FinGuard AI - Financial Trend & Cash Flow Forecasting Engine
 * Generates statistical projections for revenue, expenses, and liquidity with confidence intervals.
 */

class AIForecastingEngine {
  /**
   * Generates a 6-month forward forecast based on historical monthly financial trends.
   */
  generateForecast(historicalMonthlyData = [], cashOnHand = 0) {
    const baseData = historicalMonthlyData;
    if (baseData.length < 2) {
      return {
        historical: baseData.map((d) => ({ ...d, type: 'actual' })),
        forecast: [],
        summary: {
          note: 'At least two months of posted transactions are required before a projection is calculated.',
        },
      };
    }

    // Compute month-over-month growth rates
    let revGrowthTotal = 0;
    let expGrowthTotal = 0;
    for (let i = 1; i < baseData.length; i++) {
      if (baseData[i - 1].revenue) {
        revGrowthTotal += (baseData[i].revenue - baseData[i - 1].revenue) / baseData[i - 1].revenue;
      }
      if (baseData[i - 1].expenses) {
        expGrowthTotal += (baseData[i].expenses - baseData[i - 1].expenses) / baseData[i - 1].expenses;
      }
    }
    const avgRevGrowth = Math.max(-0.2, Math.min(0.2, revGrowthTotal / (baseData.length - 1) || 0));
    const avgExpGrowth = Math.max(-0.2, Math.min(0.2, expGrowthTotal / (baseData.length - 1) || 0));

    const lastHistorical = baseData[baseData.length - 1];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const futureMonths = [];
    if (lastHistorical.key) {
      let [year, month] = lastHistorical.key.split('-').map(Number);
      for (let i = 0; i < 6; i += 1) {
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
        futureMonths.push(`${monthNames[month - 1]} ${String(year).slice(2)}`);
      }
    } else {
      futureMonths.push('M+1', 'M+2', 'M+3', 'M+4', 'M+5', 'M+6');
    }

    let currentRev = lastHistorical.revenue;
    let currentExp = lastHistorical.expenses;
    let currentCash = Number(cashOnHand) || 0;

    const forecastPoints = [];

    futureMonths.forEach((m, idx) => {
      currentRev = Math.round(currentRev * (1 + avgRevGrowth));
      currentExp = Math.round(currentExp * (1 + avgExpGrowth));
      const netProfit = currentRev - currentExp;
      currentCash += netProfit;

      // Calculate confidence interval (widens with forecast horizon)
      const varianceFactor = 0.035 * (idx + 1);
      const revLower = Math.round(currentRev * (1 - varianceFactor));
      const revUpper = Math.round(currentRev * (1 + varianceFactor));
      const expLower = Math.round(currentExp * (1 - varianceFactor * 0.8));
      const expUpper = Math.round(currentExp * (1 + varianceFactor * 0.8));
      const cashLower = Math.round(currentCash * (1 - varianceFactor * 1.2));
      const cashUpper = Math.round(currentCash * (1 + varianceFactor * 1.2));

      forecastPoints.push({
        month: m,
        type: 'forecast',
        revenue: currentRev,
        revenueLower: revLower,
        revenueUpper: revUpper,
        expenses: currentExp,
        expensesLower: expLower,
        expensesUpper: expUpper,
        netProfit,
        cashFlow: currentCash,
        cashLower,
        cashUpper,
        operatingMargin: currentRev ? Math.round((netProfit / currentRev) * 100) : 0,
      });
    });

    return {
      historical: baseData.map((d) => ({ ...d, type: 'actual' })),
      forecast: forecastPoints,
      summary: {
        avgProjectedMonthlyRevenue: Math.round(
          forecastPoints.reduce((acc, f) => acc + f.revenue, 0) / forecastPoints.length
        ),
        avgProjectedMonthlyExpenses: Math.round(
          forecastPoints.reduce((acc, f) => acc + f.expenses, 0) / forecastPoints.length
        ),
        projectedQuarterEndCash: forecastPoints[2]?.cashFlow || currentCash,
        runwayMonths:
          forecastPoints[0] && forecastPoints[0].expenses > 0
            ? Math.round((Number(cashOnHand) / forecastPoints[0].expenses) * 10) / 10
            : null,
        note: 'This repeats the average month-to-month change already in the ledger. It is a projection, not a booked result.',
      },
    };
  }
}

module.exports = new AIForecastingEngine();
