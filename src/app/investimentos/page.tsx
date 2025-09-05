'use client';

import { useState, useEffect } from 'react';
import { Investment, FinancialRecord } from '@/types/financial';
import { FinancialStorage } from '@/lib/storage';
import { FinancialCalculations } from '@/lib/calculations';
import { StockService } from '@/lib/stocks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export default function InvestimentosPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    type: 'acao' as Investment['type'],
    symbol: '',
    name: '',
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    sector: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedInvestments = FinancialStorage.getInvestments();
    const loadedRecords = FinancialStorage.getRecords();
    setInvestments(loadedInvestments);
    setRecords(loadedRecords);
  };

  const updatePrices = async () => {
    setLoading(true);
    try {
      const stockInvestments = investments.filter(inv => inv.type === 'acao');
      const symbols = stockInvestments.map(inv => inv.symbol);
      
      if (symbols.length > 0) {
        const quotes = await StockService.getMultipleQuotes(symbols);
        
        quotes.forEach(quote => {
          const investment = stockInvestments.find(inv => inv.symbol === quote.symbol);
          if (investment) {
            FinancialStorage.updateInvestment(investment.id, {
              currentPrice: quote.price
            });
          }
        });
        
        loadData();
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('Erro ao atualizar cotações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseFloat(formData.quantity);
    const purchasePrice = parseFloat(formData.purchasePrice);
    
    if (isNaN(quantity) || quantity <= 0 || isNaN(purchasePrice) || purchasePrice <= 0) {
      alert('Por favor, insira valores válidos');
      return;
    }

    if (!formData.symbol || !formData.name) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const investmentData = {
      type: formData.type,
      symbol: StockService.formatSymbol(formData.symbol),
      name: formData.name,
      quantity: quantity,
      purchasePrice: purchasePrice,
      currentPrice: purchasePrice, // Initial value
      purchaseDate: formData.purchaseDate,
      sector: formData.sector || undefined
    };

    if (editingInvestment) {
      FinancialStorage.updateInvestment(editingInvestment.id, investmentData);
    } else {
      FinancialStorage.addInvestment(investmentData);
    }

    // Reset form and close dialog
    setFormData({
      type: 'acao' as Investment['type'],
      symbol: '',
      name: '',
      quantity: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      sector: ''
    });
    setEditingInvestment(null);
    setIsDialogOpen(false);
    loadData();
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormData({
      type: investment.type,
      symbol: investment.symbol,
      name: investment.name,
      quantity: investment.quantity.toString(),
      purchasePrice: investment.purchasePrice.toString(),
      purchaseDate: investment.purchaseDate.slice(0, 10),
      sector: investment.sector || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (investmentId: string) => {
    if (confirm('Tem certeza que deseja excluir este investimento?')) {
      FinancialStorage.deleteInvestment(investmentId);
      loadData();
    }
  };

  const getInvestmentsByType = (type: Investment['type']) => {
    return investments.filter(inv => inv.type === type);
  };

  const calculateTypeTotal = (type: Investment['type']) => {
    const typeInvestments = getInvestmentsByType(type);
    return FinancialCalculations.calculateInvestmentValue(typeInvestments);
  };

  const totalInvestmentValue = FinancialCalculations.calculateInvestmentValue(investments);
  const totalGain = FinancialCalculations.calculateInvestmentGain(investments);
  const totalGainPercent = FinancialCalculations.calculateInvestmentGainPercent(investments);

  const currentMonth = FinancialStorage.getCurrentMonth();
  const monthlyContribution = FinancialCalculations.calculateTotalByCategory(
    records.filter(r => r.month === currentMonth),
    'investimento-mensal'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Investimentos</h1>
              <p className="text-sm text-gray-600">
                Patrimônio Total: {FinancialCalculations.formatCurrency(totalInvestmentValue)} • 
                {totalGain >= 0 ? ' Ganho: ' : ' Perda: '}
                <span className={totalGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {FinancialCalculations.formatCurrency(Math.abs(totalGain))} 
                  ({FinancialCalculations.formatPercent(totalGainPercent)})
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => window.location.href = '/'} variant="outline" size="sm">
                Dashboard
              </Button>
              <Button 
                onClick={updatePrices} 
                variant="outline" 
                size="sm" 
                disabled={loading}
              >
                {loading ? 'Atualizando...' : 'Atualizar Cotações'}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Novo Investimento</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingInvestment ? 'Editar Investimento' : 'Novo Investimento'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="type">Tipo *</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData({...formData, type: value as Investment['type']})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="acao">Ação</SelectItem>
                          <SelectItem value="cotas">Cotas</SelectItem>
                          <SelectItem value="cdi">CDI</SelectItem>
                          <SelectItem value="tesouro">Tesouro Direto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="symbol">Símbolo/Código *</Label>
                      <Input
                        id="symbol"
                        value={formData.symbol}
                        onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                        placeholder="Ex: PETR4, ITUB4, etc."
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Petrobras PN"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="quantity">Quantidade *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        placeholder="100"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="purchasePrice">Preço de Compra (R$) *</Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        value={formData.purchasePrice}
                        onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                        placeholder="25.50"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="purchaseDate">Data da Compra *</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                        required
                      />
                    </div>

                    {formData.type === 'acao' && (
                      <div>
                        <Label htmlFor="sector">Setor (opcional)</Label>
                        <Input
                          id="sector"
                          value={formData.sector}
                          onChange={(e) => setFormData({...formData, sector: e.target.value})}
                          placeholder="Ex: Financeiro, Petróleo"
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingInvestment ? 'Atualizar' : 'Adicionar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
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
              <CardTitle className="text-sm font-medium">Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {FinancialCalculations.formatCurrency(calculateTypeTotal('acao'))}
              </div>
              <p className="text-xs text-muted-foreground">
                {getInvestmentsByType('acao').length} posições
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cotas/Fundos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {FinancialCalculations.formatCurrency(calculateTypeTotal('cotas'))}
              </div>
              <p className="text-xs text-muted-foreground">
                {getInvestmentsByType('cotas').length} fundos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CDI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {FinancialCalculations.formatCurrency(calculateTypeTotal('cdi'))}
              </div>
              <p className="text-xs text-muted-foreground">
                {getInvestmentsByType('cdi').length} aplicações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tesouro Direto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {FinancialCalculations.formatCurrency(calculateTypeTotal('tesouro'))}
              </div>
              <p className="text-xs text-muted-foreground">
                {getInvestmentsByType('tesouro').length} títulos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Investimento Mensal */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Investimento Mensal (Caixinha)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Total do Mês</Label>
                <div className="text-2xl font-bold text-blue-600">
                  {FinancialCalculations.formatCurrency(monthlyContribution)}
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Meta Mensal</Label>
                <div className="text-xl font-semibold">R$ 2.000,00</div>
                <Progress 
                  value={Math.min((monthlyContribution / 2000) * 100, 100)} 
                  className="mt-2" 
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Progresso</Label>
                <div className="text-lg">
                  <Badge variant={monthlyContribution >= 2000 ? "default" : "secondary"}>
                    {((monthlyContribution / 2000) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Faltam {FinancialCalculations.formatCurrency(Math.max(2000 - monthlyContribution, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investment Types Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="acoes">Ações</TabsTrigger>
            <TabsTrigger value="cotas">Cotas</TabsTrigger>
            <TabsTrigger value="outros">CDI / Tesouro</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Carteira</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Valor Investido</TableHead>
                        <TableHead>Valor Atual</TableHead>
                        <TableHead>Ganho/Perda</TableHead>
                        <TableHead>%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['acao', 'cotas', 'cdi', 'tesouro'].map(type => {
                        const typeInvestments = getInvestmentsByType(type as Investment['type']);
                        const typeTotal = calculateTypeTotal(type as Investment['type']);
                        const typeGain = FinancialCalculations.calculateInvestmentGain(typeInvestments);
                        const typeGainPercent = FinancialCalculations.calculateInvestmentGainPercent(typeInvestments);

                        if (typeInvestments.length === 0) return null;

                        return (
                          <TableRow key={type}>
                            <TableCell>
                              <Badge variant="secondary">
                                {type === 'acao' ? 'Ações' : 
                                 type === 'cotas' ? 'Cotas' :
                                 type === 'cdi' ? 'CDI' : 'Tesouro'}
                              </Badge>
                            </TableCell>
                            <TableCell>{typeInvestments.length}</TableCell>
                            <TableCell>
                              {FinancialCalculations.formatCurrency(
                                typeInvestments.reduce((sum, inv) => sum + (inv.quantity * inv.purchasePrice), 0)
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {FinancialCalculations.formatCurrency(typeTotal)}
                            </TableCell>
                            <TableCell className={typeGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {typeGain >= 0 ? '+' : ''}{FinancialCalculations.formatCurrency(typeGain)}
                            </TableCell>
                            <TableCell className={typeGainPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {typeGainPercent >= 0 ? '+' : ''}{FinancialCalculations.formatPercent(typeGainPercent)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acoes" className="mt-6">
            <InvestmentTable 
              investments={getInvestmentsByType('acao')} 
              onEdit={handleEdit}
              onDelete={handleDelete}
              showSector={true}
            />
          </TabsContent>

          <TabsContent value="cotas" className="mt-6">
            <InvestmentTable 
              investments={getInvestmentsByType('cotas')} 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="outros" className="mt-6">
            <div className="space-y-6">
              <InvestmentTable 
                investments={getInvestmentsByType('cdi')} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                title="CDI"
              />
              <InvestmentTable 
                investments={getInvestmentsByType('tesouro')} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                title="Tesouro Direto"
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface InvestmentTableProps {
  investments: Investment[];
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  title?: string;
  showSector?: boolean;
}

function InvestmentTable({ investments, onEdit, onDelete, title, showSector = false }: InvestmentTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Investimentos'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Símbolo</TableHead>
                <TableHead>Nome</TableHead>
                {showSector && <TableHead>Setor</TableHead>}
                <TableHead>Qtd</TableHead>
                <TableHead>Preço Compra</TableHead>
                <TableHead>Preço Atual</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Ganho/Perda</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showSector ? 9 : 8} className="text-center py-8 text-gray-500">
                    Nenhum investimento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                investments.map(investment => {
                  const currentValue = investment.quantity * investment.currentPrice;
                  const purchaseValue = investment.quantity * investment.purchasePrice;
                  const gain = currentValue - purchaseValue;
                  const gainPercent = ((gain / purchaseValue) * 100);

                  return (
                    <TableRow key={investment.id}>
                      <TableCell>
                        <Badge variant="outline">{investment.symbol}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={investment.name}>
                        {investment.name}
                      </TableCell>
                      {showSector && (
                        <TableCell>
                          {investment.sector && (
                            <Badge variant="secondary" className="text-xs">
                              {investment.sector}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>{investment.quantity}</TableCell>
                      <TableCell>{FinancialCalculations.formatCurrency(investment.purchasePrice)}</TableCell>
                      <TableCell>{FinancialCalculations.formatCurrency(investment.currentPrice)}</TableCell>
                      <TableCell className="font-semibold">
                        {FinancialCalculations.formatCurrency(currentValue)}
                      </TableCell>
                      <TableCell className={gain >= 0 ? 'text-green-600' : 'text-red-600'}>
                        <div className="flex flex-col">
                          <span>{gain >= 0 ? '+' : ''}{FinancialCalculations.formatCurrency(gain)}</span>
                          <span className="text-xs">
                            ({gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(investment)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(investment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}