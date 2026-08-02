import { Transaction, BudgetGoal, MonthlyReport, PaymentMethod } from '../types';

export class ExportUtils {
  /**
   * Generates a monthly budget summary report object for a given YYYY-MM month
   */
  static generateMonthlyReport(
    yearMonth: string, // YYYY-MM
    transactions: Transaction[],
    budgets: BudgetGoal[]
  ): MonthlyReport {
    const monthTx = transactions.filter((t) => t.date.startsWith(yearMonth));

    let totalExpense = 0;
    let totalIncome = 0;

    const categoryMap: Record<string, number> = {};
    const merchantMap: Record<string, { amount: number; count: number }> = {};
    const paymentMap: Record<string, number> = {};

    monthTx.forEach((tx) => {
      if (tx.type === 'expense') {
        totalExpense += tx.amount;

        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;

        const m = tx.merchant || 'Unknown';
        if (!merchantMap[m]) merchantMap[m] = { amount: 0, count: 0 };
        merchantMap[m].amount += tx.amount;
        merchantMap[m].count += 1;

        const pm = tx.paymentMethod || 'Other';
        paymentMap[pm] = (paymentMap[pm] || 0) + tx.amount;
      } else {
        totalIncome += tx.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRatePercent = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

    // Daily average based on days in month or current day
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyExpenseAverage = Math.round((totalExpense / (daysInMonth || 30)) * 100) / 100;

    // Top Category
    let topCatName = 'None';
    let topCatAmount = 0;
    Object.entries(categoryMap).forEach(([cat, amt]) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatName = cat;
      }
    });

    // Top Merchant
    let topMerchName = 'None';
    let topMerchAmount = 0;
    let topMerchCount = 0;
    Object.entries(merchantMap).forEach(([m, obj]) => {
      if (obj.amount > topMerchAmount) {
        topMerchAmount = obj.amount;
        topMerchName = m;
        topMerchCount = obj.count;
      }
    });

    // Category Breakdown with Budget Limits
    const categoryBreakdown = Object.entries(categoryMap).map(([cat, amt]) => {
      const bGoal = budgets.find((b) => b.categoryName === cat);
      const limit = bGoal ? bGoal.monthlyLimit : 0;
      const percentOfTotal = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;

      let status: 'under' | 'warning' | 'exceeded' = 'under';
      if (limit > 0) {
        const spentPercentOfBudget = (amt / limit) * 100;
        if (spentPercentOfBudget >= 100) status = 'exceeded';
        else if (spentPercentOfBudget >= (bGoal?.warnThresholdPercent || 80)) status = 'warning';
      }

      return {
        category: cat,
        amount: amt,
        percentOfTotal,
        budgetLimit: limit,
        status,
      };
    }).sort((a, b) => b.amount - a.amount);

    // Payment Method Breakdown
    const paymentMethodBreakdown = Object.entries(paymentMap).map(([pm, amt]) => ({
      method: pm as PaymentMethod,
      amount: amt,
      percent: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // Format Month Name (e.g. "August 2026")
    const dateObj = new Date(year, month - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return {
      monthKey: yearMonth,
      monthName,
      totalExpense,
      totalIncome,
      netSavings,
      savingsRatePercent,
      dailyExpenseAverage,
      transactionCount: monthTx.length,
      topCategory: {
        name: topCatName,
        amount: topCatAmount,
        percent: totalExpense > 0 ? Math.round((topCatAmount / totalExpense) * 100) : 0,
      },
      topMerchant: {
        name: topMerchName,
        amount: topMerchAmount,
        count: topMerchCount,
      },
      categoryBreakdown,
      paymentMethodBreakdown,
    };
  }

  /**
   * Export transactions array to downloadable CSV
   */
  static exportTransactionsToCSV(transactions: Transaction[], filename = 'homelab_spend_transactions.csv'): void {
    const headers = [
      'ID',
      'Date',
      'Type',
      'Category',
      'Merchant',
      'Description',
      'Amount',
      'Payment Method',
      'Tags',
      'Notes',
    ];

    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.type === 'expense' ? `-${t.amount}` : `${t.amount}`,
      `"${t.paymentMethod}"`,
      `"${(t.tags || []).join(';')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    ExportUtils.downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Download generic blob helper
   */
  static downloadBlob(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Print / PDF HTML Generator for Monthly Budget Report
   */
  static printMonthlyReport(report: MonthlyReport, currencySymbol = '$'): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Budget Report - ${report.monthName}</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 30px; color: #1e293b; background: #fff; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { margin: 0; color: #0f172a; font-size: 24px; }
          .header p { margin: 4px 0 0; color: #64748b; font-size: 14px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
          .kpi-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
          .kpi-value { font-size: 20px; font-weight: 700; color: #0f172a; }
          .section-title { font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          th { background: #f1f5f9; color: #475569; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
          .badge-under { background: #dcfce7; color: #166534; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-exceeded { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
            Print / Save to PDF
          </button>
        </div>

        <div class="header">
          <div>
            <h1>Monthly Budget & Spend Report</h1>
            <p>Period: ${report.monthName} | Homelab Spend Tracker</p>
          </div>
          <div style="text-align: right;">
            <p>Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Total Spending</div>
            <div class="kpi-value" style="color: #e11d48;">${currencySymbol}${report.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Total Income</div>
            <div class="kpi-value" style="color: #059669;">${currencySymbol}${report.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Net Cash Flow</div>
            <div class="kpi-value">${currencySymbol}${report.netSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Daily Average Spend</div>
            <div class="kpi-value">${currencySymbol}${report.dailyExpenseAverage.toFixed(2)}</div>
          </div>
        </div>

        <div class="section-title">Category Spending Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount Spent</th>
              <th>% of Total</th>
              <th>Monthly Budget</th>
              <th>Budget Status</th>
            </tr>
          </thead>
          <tbody>
            ${report.categoryBreakdown
              .map(
                (c) => `
              <tr>
                <td><strong>${c.category}</strong></td>
                <td>${currencySymbol}${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>${c.percentOfTotal}%</td>
                <td>${c.budgetLimit > 0 ? `${currencySymbol}${c.budgetLimit}` : 'Unset'}</td>
                <td>
                  <span class="badge badge-${c.status}">
                    ${c.status === 'exceeded' ? 'OVER BUDGET' : c.status === 'warning' ? 'NEAR LIMIT' : 'OK'}
                  </span>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="section-title">Payment Method Analysis</div>
        <table>
          <thead>
            <tr>
              <th>Payment Method</th>
              <th>Total Spent</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            ${report.paymentMethodBreakdown
              .map(
                (p) => `
              <tr>
                <td>${p.method}</td>
                <td>${currencySymbol}${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>${p.percent}%</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          Report compiled by Homelab Spend Tracker Engine. Self-Hosted Privacy Protected.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
