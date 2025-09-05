import { FinancialRecord, Investment, MonthlyConsolidation } from '@/types/financial';

export class FinancialStorage {
  private static readonly RECORDS_KEY = 'financial_records';
  private static readonly INVESTMENTS_KEY = 'financial_investments';
  private static readonly CONSOLIDATION_KEY = 'monthly_consolidation';
  private static readonly BACKUP_KEY = 'financial_backup';

  // Financial Records Management
  static getRecords(): FinancialRecord[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.RECORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static saveRecords(records: FinancialRecord[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.RECORDS_KEY, JSON.stringify(records));
    this.createBackup();
  }

  static addRecord(record: Omit<FinancialRecord, 'id' | 'createdAt' | 'updatedAt'>): string {
    const records = this.getRecords();
    const newRecord: FinancialRecord = {
      ...record,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    records.push(newRecord);
    this.saveRecords(records);
    return newRecord.id;
  }

  static updateRecord(id: string, updates: Partial<FinancialRecord>): boolean {
    const records = this.getRecords();
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) return false;
    
    records[index] = {
      ...records[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.saveRecords(records);
    return true;
  }

  static deleteRecord(id: string): boolean {
    const records = this.getRecords();
    const filteredRecords = records.filter(r => r.id !== id);
    
    if (filteredRecords.length === records.length) return false;
    
    this.saveRecords(filteredRecords);
    return true;
  }

  // Investment Management
  static getInvestments(): Investment[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.INVESTMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static saveInvestments(investments: Investment[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.INVESTMENTS_KEY, JSON.stringify(investments));
    this.createBackup();
  }

  static addInvestment(investment: Omit<Investment, 'id' | 'lastUpdated'>): string {
    const investments = this.getInvestments();
    const newInvestment: Investment = {
      ...investment,
      id: this.generateId(),
      lastUpdated: new Date().toISOString(),
    };
    
    investments.push(newInvestment);
    this.saveInvestments(investments);
    return newInvestment.id;
  }

  static updateInvestment(id: string, updates: Partial<Investment>): boolean {
    const investments = this.getInvestments();
    const index = investments.findIndex(i => i.id === id);
    
    if (index === -1) return false;
    
    investments[index] = {
      ...investments[index],
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    
    this.saveInvestments(investments);
    return true;
  }

  static deleteInvestment(id: string): boolean {
    const investments = this.getInvestments();
    const filteredInvestments = investments.filter(i => i.id !== id);
    
    if (filteredInvestments.length === investments.length) return false;
    
    this.saveInvestments(filteredInvestments);
    return true;
  }

  // Monthly Consolidation
  static getConsolidations(): MonthlyConsolidation[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.CONSOLIDATION_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static saveConsolidation(consolidation: MonthlyConsolidation): void {
    if (typeof window === 'undefined') return;
    const consolidations = this.getConsolidations();
    const existingIndex = consolidations.findIndex(c => c.month === consolidation.month);
    
    if (existingIndex >= 0) {
      consolidations[existingIndex] = consolidation;
    } else {
      consolidations.push(consolidation);
    }
    
    consolidations.sort((a, b) => b.month.localeCompare(a.month));
    localStorage.setItem(this.CONSOLIDATION_KEY, JSON.stringify(consolidations));
    this.createBackup();
  }

  // Utility functions
  private static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  static formatMonth(month: string): string {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
  }

  // Backup and restore
  static createBackup(): void {
    if (typeof window === 'undefined') return;
    
    const backup = {
      timestamp: new Date().toISOString(),
      records: this.getRecords(),
      investments: this.getInvestments(),
      consolidations: this.getConsolidations(),
    };
    
    localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
  }

  static exportData(): string {
    return JSON.stringify({
      records: this.getRecords(),
      investments: this.getInvestments(),
      consolidations: this.getConsolidations(),
      exportDate: new Date().toISOString(),
    }, null, 2);
  }

  static importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.records) this.saveRecords(data.records);
      if (data.investments) this.saveInvestments(data.investments);
      if (data.consolidations) {
        data.consolidations.forEach((c: MonthlyConsolidation) => this.saveConsolidation(c));
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  static clearAllData(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.RECORDS_KEY);
    localStorage.removeItem(this.INVESTMENTS_KEY);
    localStorage.removeItem(this.CONSOLIDATION_KEY);
  }
}