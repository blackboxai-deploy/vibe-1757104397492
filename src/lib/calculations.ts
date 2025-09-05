import { FinancialRecord, Investment, MonthlyConsolidation, CategorySummary, ChartData, DashboardMetrics } from '@/types/financial';

export class FinancialCalculations {
  // Basic calculations
  static calculateTotal(records: FinancialRecord[]): number {
    return records.reduce((sum, record) => sum + record.amount, 0);
  }

  static calculateTotalByCategory(records: FinancialRecord[], category: string): number {
    return records
      .filter(r => r.category === category)
      .reduce((sum, record) => sum + record.amount, 0);
  }

  static calculateTotalByMonth(records: FinancialRecord[], month: string): number {
    return records
      .filter(r => r.month === month)
      .reduce((sum, record) => sum + record.amount, 0);
  }

  static calculateTotalBySubcategory(records: FinancialRecord[], subcategory: string): number {
    return records
      .filter(r => r.subcategory === subcategory)
      .reduce((sum, record) => sum + record.amount, 0);
  }

  // Investment calculations
  static calculateInvestmentValue(investments: Investment[]): number {
    return investments.reduce((sum, investment) => {
      return sum + (investment.quantity * investment.currentPrice);
    }, 0);
  }

  static calculateInvestmentGain(investments: Investment[]): number {
    return investments.reduce((sum, investment) => {
      const purchaseValue = investment.quantity * investment.purchasePrice;
      const currentValue = investment.quantity * investment.currentPrice;
      return sum + (currentValue - purchaseValue);
    }, 0);
  }

  static calculateInvestmentGainPercent(investments: Investment[]): number {
    const totalPurchaseValue = investments.reduce((sum, investment) => {
      return sum + (investment.quantity * investment.purchasePrice);
    }, 0);

    if (totalPurchaseValue === 0) return 0;

    const totalGain = this.calculateInvestmentGain(investments);
    return (totalGain / totalPurchaseValue) * 100;
  }

  // Monthly consolidation
  static generateMonthlyConsolidation(
    records: FinancialRecord[],
    investments: Investment[],
    month: string
  ): MonthlyConsolidation {
    const monthRecords = records.filter(r => r.month === month);
    
    const totalDespesas = this.calculateTotalByCategory(monthRecords, 'despesas');
    const totalReceitas = this.calculateTotalByCategory(monthRecords, 'receitas');
    const investimentoMensal = this.calculateTotalByCategory(monthRecords, 'investimento-mensal');
    const totalInvestimentos = this.calculateInvestmentValue(investments);
    const patrimonio = totalInvestimentos + investimentoMensal;
    const resultado = totalReceitas - totalDespesas;

    return {
      month,
      totalDespesas,
      totalReceitas,
      investimentoMensal,
      totalInvestimentos,
      patrimonio,
      resultado,
      createdAt: new Date().toISOString(),
    };
  }

  // Category summaries
  static generateCategorySummary(
    records: FinancialRecord[],
    category: string,
    currentMonth: string,
    previousMonth?: string
  ): CategorySummary[] {
    const currentRecords = records.filter(r => r.category === category && r.month === currentMonth);
    const previousRecords = previousMonth 
      ? records.filter(r => r.category === category && r.month === previousMonth)
      : [];

    const subcategories = Array.from(new Set(currentRecords.map(r => r.subcategory)));
    
    return subcategories.map(subcategory => {
      const currentTotal = this.calculateTotalBySubcategory(currentRecords, subcategory);
      const previousTotal = this.calculateTotalBySubcategory(previousRecords, subcategory);
      const categoryTotal = this.calculateTotalByCategory(currentRecords, category);
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (previousTotal > 0) {
        if (currentTotal > previousTotal) trend = 'up';
        else if (currentTotal < previousTotal) trend = 'down';
      } else if (currentTotal > 0) {
        trend = 'up';
      }

      return {
        name: subcategory,
        total: currentTotal,
        count: currentRecords.filter(r => r.subcategory === subcategory).length,
        percentage: categoryTotal > 0 ? (currentTotal / categoryTotal) * 100 : 0,
        trend,
      };
    }).sort((a, b) => b.total - a.total);
  }

  // Chart data
  static generateChartData(
    records: FinancialRecord[],
    _investments: Investment[],
    months: string[]
  ): ChartData[] {
    return months.map(month => {
      const monthRecords = records.filter(r => r.month === month);
      
      return {
        month: this.formatMonthForChart(month),
        despesas: this.calculateTotalByCategory(monthRecords, 'despesas'),
        receitas: this.calculateTotalByCategory(monthRecords, 'receitas'),
        resultado: this.calculateTotalByCategory(monthRecords, 'receitas') - this.calculateTotalByCategory(monthRecords, 'despesas'),
        investimentos: this.calculateTotalByCategory(monthRecords, 'investimento-mensal'),
      };
    });
  }

  // Dashboard metrics
  static generateDashboardMetrics(
    records: FinancialRecord[],
    investments: Investment[],
    currentMonth: string,
    previousMonth?: string
  ): DashboardMetrics {
    const currentRecords = records.filter(r => r.month === currentMonth);
    const previousRecords = previousMonth 
      ? records.filter(r => r.month === previousMonth) 
      : [];

    const currentReceitas = this.calculateTotalByCategory(currentRecords, 'receitas');
    const currentDespesas = this.calculateTotalByCategory(currentRecords, 'despesas');
    const currentBalance = currentReceitas - currentDespesas;
    
    const previousReceitas = this.calculateTotalByCategory(previousRecords, 'receitas');
    const previousDespesas = this.calculateTotalByCategory(previousRecords, 'despesas');
    const previousBalance = previousReceitas - previousDespesas;
    
    const monthlyGrowth = previousBalance > 0 
      ? ((currentBalance - previousBalance) / previousBalance) * 100 
      : 0;

    const investmentReturn = this.calculateInvestmentGainPercent(investments);
    
    const savingsRate = currentReceitas > 0 
      ? (this.calculateTotalByCategory(currentRecords, 'investimento-mensal') / currentReceitas) * 100 
      : 0;

    // Find top categories
    const despesasSummary = this.generateCategorySummary(currentRecords, 'despesas', currentMonth);
    const receitasSummary = this.generateCategorySummary(currentRecords, 'receitas', currentMonth);
    
    const topExpenseCategory = despesasSummary.length > 0 ? despesasSummary[0].name : 'Nenhuma';
    const topIncomeSource = receitasSummary.length > 0 ? receitasSummary[0].name : 'Nenhuma';

    return {
      currentBalance,
      monthlyGrowth,
      investmentReturn,
      savingsRate,
      topExpenseCategory,
      topIncomeSource,
    };
  }

  // Utility functions
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  static formatPercent(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(value / 100);
  }

  private static formatMonthForChart(month: string): string {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }

  // Date utilities
  static getMonthsRange(startMonth: string, endMonth: string): string[] {
    const months: string[] = [];
    let current = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  static getLastNMonths(n: number): string[] {
    const months: string[] = [];
    const current = new Date();
    
    for (let i = 0; i < n; i++) {
      const month = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const year = month.getFullYear();
      const monthNum = String(month.getMonth() + 1).padStart(2, '0');
      months.unshift(`${year}-${monthNum}`);
    }
    
    return months;
  }

  static getPreviousMonth(month: string): string {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    date.setMonth(date.getMonth() - 1);
    
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${prevYear}-${prevMonth}`;
  }
}