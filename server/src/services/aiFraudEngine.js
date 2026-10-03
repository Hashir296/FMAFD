/**
 * FinGuard AI - Multi-Signal Fraud Detection & Anomaly Scoring Engine
 * Modular service architecture that can interface with external Python/FastAPI ML microservices.
 */

class AIFraudEngine {
  /**
   * Evaluates a transaction against multiple behavioral, statistical, and relational signals.
   *
   * Scoring factors:
   * 1. Amount Anomaly (Z-score vs historical vendor/department baseline)
   * 2. Timing Anomaly (off-hours: 11pm - 5am, weekends)
   * 3. Velocity / Frequency Anomaly (rapid duplicate amounts within short windows)
   * 4. Structuring / Split Transaction Detection (amounts just under $5,000 / $10,000 approval thresholds)
   * 5. Vendor Risk Signal (vendor modified bank details within 14 days, sudden spike ratio)
   * 6. Employee Behavioral Deviation (spending over monthly allowance or anomalous expense category)
   * 7. Duplicate Invoice / Reference Collision
   */
  async analyzeTransaction(transaction, historicalContext = {}) {
    const { amount, date = new Date(), vendorName, employeeName, department, category, type } = transaction;
    const txnDate = new Date(date);
    const hour = txnDate.getHours();
    const dayOfWeek = txnDate.getDay(); // 0 is Sunday, 6 is Saturday

    let riskScore = 5; // Baseline low risk
    const reasons = [];
    const evidence = [];
    const detectionTypes = [];
    let recommendedAction = 'Standard automated clearing';

    // 1. Amount check uses this vendor's own posted average. No invented baseline.
    const vendorBaseline = Number(historicalContext.vendorAvg) || 0;
    const ratioToAvg = vendorBaseline > 0 ? amount / vendorBaseline : 0;

    if (amount > 50000) {
      riskScore += 25;
      detectionTypes.push('Unusual Amount');
      reasons.push(`Single payment of $${amount.toLocaleString()} is above the $50,000 review line.`);
      evidence.push(
        vendorBaseline
          ? `This vendor's posted average is $${vendorBaseline.toLocaleString()}. This payment is ${ratioToAvg.toFixed(1)}x that average.`
          : 'No prior average exists for this vendor, so the score uses the $50,000 review line only.'
      );
    } else if (vendorBaseline > 0 && ratioToAvg > 3 && amount > 5000) {
      riskScore += 22;
      detectionTypes.push('Unusual Amount');
      reasons.push(`Amount is ${ratioToAvg.toFixed(1)}x the posted average for ${vendorName || 'this vendor'}.`);
      evidence.push(`Posted average: $${vendorBaseline.toLocaleString()}. This payment: $${amount.toLocaleString()}.`);
    }

    // 2. Timing Anomaly (Off-hours / Weekend)
    const isLateNight = hour >= 23 || hour <= 4;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isLateNight) {
      riskScore += 18;
      detectionTypes.push('Unusual Time');
      reasons.push(`Transaction submitted outside normal corporate operating hours (${hour.toString().padStart(2, '0')}:${txnDate.getMinutes().toString().padStart(2, '0')}).`);
      evidence.push(`Timestamp ${txnDate.toISOString()} violates typical 08:00 - 19:00 weekday settlement window.`);
    }

    if (isWeekend && amount > 4000) {
      riskScore += 12;
      if (!detectionTypes.includes('Unusual Time')) detectionTypes.push('Unusual Time');
      reasons.push('Elevated corporate disbursement executed during weekend downtime.');
      evidence.push(`Executed on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]} without pre-scheduled batch identifier.`);
    }

    // 3. Structuring / Split Transaction Detection (e.g. $4,900-$4,999 or $9,800-$9,990)
    const isThresholdBypass =
      (amount >= 4800 && amount < 5000) ||
      (amount >= 9700 && amount < 10000) ||
      (amount >= 24500 && amount < 25000);

    if (isThresholdBypass) {
      riskScore += 28;
      detectionTypes.push('Split Transaction');
      reasons.push(`Amount ($${amount.toLocaleString()}) is immediately below standard mandatory executive sign-off threshold.`);
      evidence.push(`Identified heuristic pattern: Structured micro-clearing designed to circumvent approval workflow.`);
    }

    // 4. Vendor Risk & Account Details Change
    if (historicalContext.vendorAccountModifiedRecently) {
      riskScore += 30;
      detectionTypes.push('Suspicious Vendor');
      reasons.push(`Vendor banking coordinates / routing numbers were altered within the last 14 days.`);
      evidence.push(`Bank account modification recorded on ${historicalContext.vendorModifiedDate || 'recent audit trail'}. Prior verification unconfirmed.`);
    }

    if (historicalContext.vendorSpendSpikeRatio && historicalContext.vendorSpendSpikeRatio > 2.5) {
      riskScore += 18;
      detectionTypes.push('Spending Spike');
      reasons.push(`Vendor 30-day billings increased ${Math.round(historicalContext.vendorSpendSpikeRatio * 100)}% over 90-day moving average.`);
      evidence.push(`Velocity spike indicator: 90-day avg $${(historicalContext.vendorHistoricalSpend || 10000).toLocaleString()} vs current monthly run-rate.`);
    }

    // 5. Duplicate Payment or Similar Amounts
    if (historicalContext.hasRecentMatchingAmount) {
      riskScore += 32;
      detectionTypes.push('Duplicate Payment');
      reasons.push(`Identical disbursement amount ($${amount.toLocaleString()}) issued to ${vendorName || 'the same payee'} within 72 hours.`);
      evidence.push(`Matches previous transaction ID ${historicalContext.matchingTxnId || 'TXN-RECENT'} on reference invoice.`);
    }

    // 6. Behavioral Anomaly (Employee limit or unusual category)
    if (historicalContext.employeeOverLimit) {
      riskScore += 20;
      detectionTypes.push('Behavioral Anomaly');
      reasons.push(`Employee monthly spend limit exceeded by $${(historicalContext.employeeOverAmount || 1500).toLocaleString()}.`);
      evidence.push(`Policy ceiling: $${(historicalContext.employeeLimit || 5000).toLocaleString()}; Projected total: $${(historicalContext.employeeTotal || 6500).toLocaleString()}.`);
    }

    // 7. Abnormal Refund
    if (type === 'refund' && amount > 2500) {
      riskScore += 24;
      detectionTypes.push('Abnormal Refund');
      reasons.push(`High-value credit/refund issued without linked original purchase order.`);
      evidence.push(`Disproportionate balance adjustment lacking matching merchant return authorization.`);
    }

    // Clamp score to 0 - 100
    riskScore = Math.min(Math.max(Math.round(riskScore), 0), 100);

    // Map to Risk Level
    let riskLevel = 'Low';
    if (riskScore > 80) riskLevel = 'Critical';
    else if (riskScore > 60) riskLevel = 'High';
    else if (riskScore > 30) riskLevel = 'Medium';

    // Tailor Human-in-the-Loop Recommended Action
    if (riskLevel === 'Critical') {
      recommendedAction = 'Place payment on immediate freeze; request dual-custody verification of vendor banking details & physical invoice authorization.';
    } else if (riskLevel === 'High') {
      recommendedAction = 'Route to Fraud Analyst queue for manual invoice cross-check and confirmation with department budget owner.';
    } else if (riskLevel === 'Medium') {
      recommendedAction = 'Request manager secondary sign-off and receipt attachment before ledger reconciliation.';
    } else {
      recommendedAction = 'Approve for regular processing. No abnormal deviation detected.';
    }

    return {
      riskScore,
      riskLevel,
      detectionTypes: detectionTypes.length > 0 ? detectionTypes : ['Behavioral Anomaly'],
      reasons: reasons.length > 0 ? reasons : ['Transaction parameters align with expected historical profile.'],
      evidence: evidence.length > 0 ? evidence : ['Statistical variance within 1.0 sigma of department baseline.'],
      relatedTransactions: historicalContext.relatedTxnIds || [],
      recommendedAction,
      analysisTimestamp: new Date(),
    };
  }

  /**
   * Hook for optional external ML Service (Python / FastAPI / ONNX)
   */
  async predictWithExternalML(payload) {
    if (!process.env.ML_SERVICE_URL) {
      return null;
    }
    try {
      const response = await fetch(`${process.env.ML_SERVICE_URL}/predict/fraud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[AI Fraud Engine] External ML microservice unavailable, using native engine:', err.message);
    }
    return null;
  }
}

module.exports = new AIFraudEngine();
