'use client';

import { useState, useEffect } from 'react';
import { FinancialRecord } from '@/types/financial';
import { FinancialStorage } from '@/lib/storage';
import { FinancialCalculations } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Vestuário',
  'Serviços',
  'Impostos',
  'Outros'
];

export default function DespesasPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinancialRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    subcategory: '',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    tags: ''
  });

  useEffect(() => {
    loadData();
    const current = FinancialStorage.getCurrentMonth();
    setCurrentMonth(current);
    setSelectedMonth(current);
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, selectedMonth, searchTerm, selectedCategory]);

  const loadData = () => {
    const loadedRecords = FinancialStorage.getRecords();
    setRecords(loadedRecords);
  };

  const filterRecords = () => {
    let filtered = records.filter(record => 
      record.category === 'despesas' && 
      record.month === selectedMonth
    );

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.subcategory.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(record => record.subcategory === selectedCategory);
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredRecords(filtered);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    if (!formData.subcategory || !formData.description) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const recordData = {
      category: 'despesas' as const,
      subcategory: formData.subcategory,
      description: formData.description,
      amount: amount,
      date: formData.date,
      month: formData.date.slice(0, 7), // YYYY-MM
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : undefined
    };

    if (editingRecord) {
      FinancialStorage.updateRecord(editingRecord.id, recordData);
    } else {
      FinancialStorage.addRecord(recordData);
    }

    // Reset form and close dialog
    setFormData({
      subcategory: '',
      description: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      tags: ''
    });
    setEditingRecord(null);
    setIsDialogOpen(false);
    loadData();
  };

  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record);
    setFormData({
      subcategory: record.subcategory,
      description: record.description,
      amount: record.amount.toString(),
      date: record.date.slice(0, 10),
      tags: record.tags ? record.tags.join(', ') : ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (recordId: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      FinancialStorage.deleteRecord(recordId);
      loadData();
    }
  };

  const getAvailableMonths = () => {
    const months = Array.from(new Set(records.map(record => record.month)))
      .sort((a, b) => b.localeCompare(a));
    
    if (months.length === 0) {
      return [currentMonth];
    }
    
    return months;
  };

  const totalDespesas = FinancialCalculations.calculateTotal(filteredRecords);
  const categoryTotals = EXPENSE_CATEGORIES.map(category => ({
    name: category,
    total: FinancialCalculations.calculateTotalBySubcategory(filteredRecords, category)
  })).filter(cat => cat.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Despesas</h1>
              <p className="text-sm text-gray-600">
                {FinancialStorage.formatMonth(selectedMonth)} • Total: {FinancialCalculations.formatCurrency(totalDespesas)}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => window.location.href = '/'} variant="outline" size="sm">
                Dashboard
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Nova Despesa</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRecord ? 'Editar Despesa' : 'Nova Despesa'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="subcategory">Categoria *</Label>
                      <Select 
                        value={formData.subcategory} 
                        onValueChange={(value) => setFormData({...formData, subcategory: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Descrição *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Ex: Compras no supermercado"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="amount">Valor (R$) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="date">Data *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="tags">Tags (opcional)</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        placeholder="tag1, tag2, tag3"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingRecord ? 'Atualizar' : 'Adicionar'}
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
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label>Mês</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableMonths().map(month => (
                  <SelectItem key={month} value={month}>
                    {FinancialStorage.formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                {EXPENSE_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="md:col-span-2">
            <Label>Buscar</Label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição ou categoria..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Summary Cards */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {FinancialCalculations.formatCurrency(totalDespesas)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryTotals.slice(0, 5).map(category => (
                    <div key={category.name} className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">{category.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {FinancialCalculations.formatCurrency(category.total)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Records Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Despesas Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Nenhuma despesa registrada para os filtros selecionados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.map(record => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {new Date(record.date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{record.subcategory}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={record.description}>
                              {record.description}
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {FinancialCalculations.formatCurrency(record.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {record.tags?.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {record.tags && record.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{record.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(record)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(record.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Excluir
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}