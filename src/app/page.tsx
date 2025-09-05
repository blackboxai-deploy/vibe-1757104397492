'use client';

import { useState, useEffect } from 'react';
import { FinancialRecord, Investment, DashboardMetrics } from '@/types/financial';
import { FinancialStorage } from '@/lib/storage';
import { FinancialCalculations } from '@/lib/calculations';
import { StockService } from '@/lib/stocks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>('');
  const [marketStatus, setMarketStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    setCurrentMonth(FinancialStorage.getCurrentMonth());
    setMarketStatus(StockService.getMarketStatus());

    // Update market status every minute
    const interval = setInterval(() => {
      setMarketStatus(StockService.getMarketStatus());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      const loadedRecords = FinancialStorage.getRecords();
      const loadedInvestments = FinancialStorage.getInvestments();
      
      setRecords(loadedRecords);
      setInvestments(loadedInvestments);
      
      const currentMonth = FinancialStorage.getCurrentMonth();
      const previousMonth = FinancialCalculations.getPreviousMonth(currentMonth);
      
      const dashboardMetrics = FinancialCalculations.generateDashboardMetrics(
        loadedRecords,
        loadedInvestments,
        currentMonth,
        previousMonth
      );
      
      setMetrics(dashboardMetrics);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = FinancialStorage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilha-financeira-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonString = e.target?.result as string;
          const success = FinancialStorage.importData(jsonString);
          if (success) {
            loadData();
            alert('Dados importados com sucesso!');
          } else {
            alert('Erro ao importar dados. Verifique o formato do arquivo.');
          }
        } catch (error) {
          alert('Erro ao ler o arquivo.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Planilha Financeira</h1>
              <p className="text-sm text-gray-600">
                {FinancialStorage.formatMonth(currentMonth)} • {marketStatus}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={StockService.isMarketOpen() ? "default" : "secondary"}>
                {StockService.isMarketOpen() ? "Mercado Aberto" : "Mercado Fechado"}
              </Badge>
              <Button onClick={exportData} variant="outline" size="sm">
                Exportar
              </Button>
              <Button onClick={importData} variant="outline" size="sm">
                Importar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics ? FinancialCalculations.formatCurrency(metrics.currentBalance) : 'R$ 0,00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics && metrics.monthlyGrowth !== 0 && (
                  <span className={metrics.monthlyGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                    {metrics.monthlyGrowth > 0 ? '↗' : '↘'} {Math.abs(metrics.monthlyGrowth).toFixed(1)}%
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retorno dos Investimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics ? FinancialCalculations.formatPercent(metrics.investmentReturn) : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                Variação dos ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Poupança</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics ? FinancialCalculations.formatPercent(metrics.savingsRate) : '0%'}
              </div>
              <Progress 
                value={metrics?.savingsRate || 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patrimônio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {FinancialCalculations.formatCurrency(
                  FinancialCalculations.calculateInvestmentValue(investments)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Investimentos totais
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="despesas">Despesas</TabsTrigger>
            <TabsTrigger value="receitas">Receitas</TabsTrigger>
            <TabsTrigger value="investimentos">Investimentos</TabsTrigger>
            <TabsTrigger value="consolidacao">Consolidação</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Receitas</span>
                      <span className="font-semibold text-green-600">
                        {FinancialCalculations.formatCurrency(
                          FinancialCalculations.calculateTotalByCategory(
                            records.filter(r => r.month === currentMonth),
                            'receitas'
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Despesas</span>
                      <span className="font-semibold text-red-600">
                        {FinancialCalculations.formatCurrency(
                          FinancialCalculations.calculateTotalByCategory(
                            records.filter(r => r.month === currentMonth),
                            'despesas'
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Investimento Mensal</span>
                      <span className="font-semibold text-blue-600">
                        {FinancialCalculations.formatCurrency(
                          FinancialCalculations.calculateTotalByCategory(
                            records.filter(r => r.month === currentMonth),
                            'investimento-mensal'
                          )
                        )}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Resultado</span>
                      <span className="font-bold">
                        {FinancialCalculations.formatCurrency(metrics?.currentBalance || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Principais Categorias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Maior Despesa</span>
                        <span className="font-semibold">
                          {metrics?.topExpenseCategory || 'Nenhuma'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Maior Receita</span>
                        <span className="font-semibold">
                          {metrics?.topIncomeSource || 'Nenhuma'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="despesas">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold mb-2">Página de Despesas em Desenvolvimento</h3>
                  <p className="text-gray-600 mb-4">
                    Esta seção permitirá o controle completo de todas as suas despesas.
                  </p>
                  <Button onClick={() => window.location.href = '/despesas'}>
                    Acessar Despesas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receitas">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold mb-2">Página de Receitas em Desenvolvimento</h3>
                  <p className="text-gray-600 mb-4">
                    Esta seção permitirá o controle completo de todas as suas receitas.
                  </p>
                  <Button onClick={() => window.location.href = '/receitas'}>
                    Acessar Receitas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investimentos">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Investimentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold mb-2">Página de Investimentos em Desenvolvimento</h3>
                  <p className="text-gray-600 mb-4">
                    Esta seção incluirá ações, cotas, CDI e Tesouro Direto com cotações atualizadas.
                  </p>
                  <Button onClick={() => window.location.href = '/investimentos'}>
                    Acessar Investimentos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consolidacao">
            <Card>
              <CardHeader>
                <CardTitle>Consolidação Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold mb-2">Página de Consolidação em Desenvolvimento</h3>
                  <p className="text-gray-600 mb-4">
                    Esta seção permitirá comparar diferentes meses e visualizar tendências.
                  </p>
                  <Button onClick={() => window.location.href = '/consolidacao'}>
                    Acessar Consolidação
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}