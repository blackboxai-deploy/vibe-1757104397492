export interface FinancialRecord {
  id: string;
  category: 'despesas' | 'receitas' | 'investimento-mensal' | 'investimentos';
  subcategory: string;
  description: string;
  amount: number;
  date: string; // ISO string
  month: string; // YYYY-MM format
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: string;
  type: 'acao' | 'cotas' | 'cdi' | 'tesouro';
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  lastUpdated: string;
  sector?: string;
}

export interface MonthlyConsolidation {
  month: string; // YYYY-MM
  totalDespesas: number;
  totalReceitas: number;
  investimentoMensal: number;
  totalInvestimentos: number;
  patrimonio: number;
  resultado: number; // receitas - despesas
  createdAt: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface FinancialSummary {
  currentMonth: string;
  totalDespesas: number;
  totalReceitas: number;
  totalInvestimentos: number;
  patrimonio: number;
  objetivo: number;
  progressoObjetivo: number;
}

export interface CategorySummary {
  name: string;
  total: number;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export type FinancialCategory = 'despesas' | 'receitas' | 'investimento-mensal' | 'investimentos';
export type InvestmentType = 'acao' | 'cotas' | 'cdi' | 'tesouro';
export type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

export interface ChartData {
  month: string;
  despesas: number;
  receitas: number;
  resultado: number;
  investimentos: number;
}

export interface DashboardMetrics {
  currentBalance: number;
  monthlyGrowth: number;
  investmentReturn: number;
  savingsRate: number;
  topExpenseCategory: string;
  topIncomeSource: string;
}