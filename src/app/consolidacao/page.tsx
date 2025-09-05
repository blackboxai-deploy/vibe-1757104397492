'use client';

import { useState, useEffect } from 'react';
import { FinancialRecord, Investment, MonthlyConsolidation } from '@/types/financial';
import { FinancialStorage } from '@/lib/storage';
import { FinancialCalculations } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ConsolidacaoPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [consolidations, setConsolidations] = useState<MonthlyConsolidation[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedRecords = FinancialStorage.getRecords();
    const loadedInvestments = FinancialStorage.getInvestments();
    const loadedConsolidations = FinancialStorage.getConsolidations();
    
    setRecords(loadedRecords);
    setInvestments(loadedInvestments);
    setConsolidations(loadedConsolidations);
    
    const current = FinancialStorage.getCurrentMonth();
    setCurrentMonth(current);
    
    // Get all available months from records
    const months = Array.from(new Set(loadedRecords.map(record => record.month)))
      .sort((a, b) => b.localeCompare(a));
    
    if (!months.includes(current)) {
      months.unshift(current);
    }
    
    setAvailableMonths(months);
    setSelectedMonths(months.slice(0, 3)); // Show last 3 months by default
  };

  const generateConsolidation = () => {
    // Generate consolidation for current month
    const consolidation = FinancialCalculations.generateMonthlyConsolidation(
      records,
      investments,
      currentMonth
    );
    
    FinancialStorage.saveConsolidation(consolidation);
    loadData();
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      months: selectedMonths,
      consolidations: consolidations.filter(c => selectedMonths.includes(c.month)),
      summary: {
        totalMonths: selectedMonths.length,
        averageIncome: 0,
        averageExpenses: 0,
        totalGrowth: 0
      }
    };

    // Calculate summary statistics
    const validConsolidations = reportData.consolidations;
    if (validConsolidations.length > 0) {
      reportData.summary.averageIncome = validConsolidations.reduce((sum, c) => sum + c.totalReceitas, 0) / validConsolidations.length;
      reportData.summary.averageExpenses = validConsolidations.reduce((sum, c) => sum + c.totalDespesas, 0) / validConsolidations.length;
      reportData.summary.totalGrowth = validConsolidations[0]?.patrimonio - validConsolidations[validConsolidations.length - 1]?.patrimonio || 0;
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-consolidacao-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getConsolidationForMonth = (month: string): MonthlyConsolidation | null => {
    const existing = consolidations.find(c => c.month === month);
    if (existing) return existing;

    // Generate on-the-fly if not exists
    if (month <= currentMonth) {
      return FinancialCalculations.generateMonthlyConsolidation(records, investments, month);
    }
    
    return null;
  };

  const getComparisonData = () => {
    return selectedMonths.map(month => {
      const consolidation = getConsolidationForMonth(month);
      return {
        month,
        consolidation
      };
    }).filter(item => item.consolidation !== null);
  };

  const comparisonData = getComparisonData();

  // Calculate trends
  const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    if (Math.abs(current - previous) < 0.01) return 'stable';
    return current > previous ? 'up' : 'down';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Consolidação Mensal</h1>
              <p className="text-sm text-gray-600">
                Análise comparativa e evolução patrimonial
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => window.location.href = '/'} variant="outline" size="sm">
                Dashboard
              </Button>
              <Button onClick={generateConsolidation} variant="outline" size="sm">
                Gerar Consolidação
              </Button>
              <Button onClick={exportReport} variant="outline" size="sm">
                Exportar Relatório
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selecionar Períodos para Comparação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableMonths.map(month => (
                <div key={month} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={month}
                    checked={selectedMonths.includes(month)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMonths([...selectedMonths, month]);
                      } else {
                        setSelectedMonths(selectedMonths.filter(m => m !== month));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={month} className="text-sm font-medium">
                    {FinancialStorage.formatMonth(month)}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {comparisonData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Receitas Médias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {FinancialCalculations.formatCurrency(
                    comparisonData.reduce((sum, item) => sum + (item.consolidation?.totalReceitas || 0), 0) / comparisonData.length
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Média dos {comparisonData.length} meses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Despesas Médias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {FinancialCalculations.formatCurrency(
                    comparisonData.reduce((sum, item) => sum + (item.consolidation?.totalDespesas || 0), 0) / comparisonData.length
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Média dos {comparisonData.length} meses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resultado Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {FinancialCalculations.formatCurrency(
                    comparisonData.reduce((sum, item) => sum + (item.consolidation?.resultado || 0), 0) / comparisonData.length
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Receitas - Despesas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Crescimento Patrimonial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {comparisonData.length > 1 ? FinancialCalculations.formatCurrency(
                    (comparisonData[0].consolidation?.patrimonio || 0) - (comparisonData[comparisonData.length - 1].consolidation?.patrimonio || 0)
                  ) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {comparisonData.length > 1 ? 'Comparado ao período inicial' : 'Necessário 2+ meses'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Comparação Mensal Detalhada</CardTitle>
          </CardHeader>
          <CardContent>
            {comparisonData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Selecione ao menos um mês para visualizar a comparação</p>
                <p className="text-sm text-gray-400">
                  Utilize as caixas de seleção acima para escolher os períodos que deseja analisar
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead>Receitas</TableHead>
                      <TableHead>Despesas</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Inv. Mensal</TableHead>
                      <TableHead>Total Investimentos</TableHead>
                      <TableHead>Patrimônio</TableHead>
                      <TableHead>Tendência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.map((item, index) => {
                      const consolidation = item.consolidation!;
                      const previousItem = comparisonData[index + 1]?.consolidation;
                      const resultadoTrend = previousItem ? 
                        calculateTrend(consolidation.resultado, previousItem.resultado) : 'stable';
                      const patrimonioTrend = previousItem ? 
                        calculateTrend(consolidation.patrimonio, previousItem.patrimonio) : 'stable';

                      return (
                        <TableRow key={item.month}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{FinancialStorage.formatMonth(item.month)}</span>
                              <span className="text-xs text-gray-500">
                                {item.month === currentMonth && <Badge variant="default" className="text-xs">Atual</Badge>}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            {FinancialCalculations.formatCurrency(consolidation.totalReceitas)}
                          </TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            {FinancialCalculations.formatCurrency(consolidation.totalDespesas)}
                          </TableCell>
                          <TableCell className={consolidation.resultado >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <div className="flex items-center space-x-1">
                              <span className="font-semibold">
                                {FinancialCalculations.formatCurrency(consolidation.resultado)}
                              </span>
                              {resultadoTrend !== 'stable' && (
                                <span className={resultadoTrend === 'up' ? 'text-green-500' : 'text-red-500'}>
                                  {resultadoTrend === 'up' ? '↗' : '↘'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-blue-600 font-semibold">
                            {FinancialCalculations.formatCurrency(consolidation.investimentoMensal)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {FinancialCalculations.formatCurrency(consolidation.totalInvestimentos)}
                          </TableCell>
                          <TableCell className="text-purple-600 font-semibold">
                            <div className="flex items-center space-x-1">
                              <span>{FinancialCalculations.formatCurrency(consolidation.patrimonio)}</span>
                              {patrimonioTrend !== 'stable' && (
                                <span className={patrimonioTrend === 'up' ? 'text-green-500' : 'text-red-500'}>
                                  {patrimonioTrend === 'up' ? '↗' : '↘'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Badge 
                                variant={resultadoTrend === 'up' ? 'default' : resultadoTrend === 'down' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                Resultado {resultadoTrend === 'up' ? '↗' : resultadoTrend === 'down' ? '↘' : '→'}
                              </Badge>
                              <Badge 
                                variant={patrimonioTrend === 'up' ? 'default' : patrimonioTrend === 'down' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                Patrimônio {patrimonioTrend === 'up' ? '↗' : patrimonioTrend === 'down' ? '↘' : '→'}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Análise Rápida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Melhor Mês (Resultado)</span>
                  <span className="text-sm font-semibold">
                    {comparisonData.length > 0 ? FinancialStorage.formatMonth(
                      comparisonData.reduce((best, current) => 
                        (current.consolidation?.resultado || 0) > (best.consolidation?.resultado || 0) ? current : best
                      ).month
                    ) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Maior Patrimônio</span>
                  <span className="text-sm font-semibold">
                    {comparisonData.length > 0 ? FinancialStorage.formatMonth(
                      comparisonData.reduce((best, current) => 
                        (current.consolidation?.patrimonio || 0) > (best.consolidation?.patrimonio || 0) ? current : best
                      ).month
                    ) : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Meta de Investimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Meta Mensal</span>
                  <span className="text-sm font-semibold">R$ 2.000,00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Meses Atingidos</span>
                  <Badge variant="secondary">
                    {comparisonData.filter(item => (item.consolidation?.investimentoMensal || 0) >= 2000).length} / {comparisonData.length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Próximos Passos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>• Revisar gastos mensais</p>
                <p>• Otimizar carteira de investimentos</p>
                <p>• Definir metas para próximo mês</p>
                <p>• Acompanhar evolução patrimonial</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}