import { StockQuote } from '@/types/financial';

export class StockService {
  private static readonly CACHE_KEY = 'stock_quotes_cache';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get stock quote from Yahoo Finance API (free alternative)
  static async getStockQuote(symbol: string): Promise<StockQuote | null> {
    try {
      // First check cache
      const cached = this.getCachedQuote(symbol);
      if (cached) return cached;

      // Fetch from API
      const response = await fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}`);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const quote: StockQuote = {
        symbol: data.symbol || symbol,
        price: data.price || 0,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      this.setCachedQuote(symbol, quote);
      
      return quote;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  // Get multiple stock quotes
  static async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    const promises = symbols.map(symbol => this.getStockQuote(symbol));
    const results = await Promise.all(promises.map(p => 
      p.then(value => ({ status: 'fulfilled' as const, value }))
       .catch(error => ({ status: 'rejected' as const, error }))
    ));
    
    return results
      .filter((result): result is { status: 'fulfilled'; value: StockQuote } => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  // Cache management
  private static getCachedQuote(symbol: string): StockQuote | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(`${this.CACHE_KEY}_${symbol}`);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const cacheTime = new Date(data.timestamp).getTime();
      const now = Date.now();

      if (now - cacheTime > this.CACHE_DURATION) {
        localStorage.removeItem(`${this.CACHE_KEY}_${symbol}`);
        return null;
      }

      return data.quote;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  private static setCachedQuote(symbol: string, quote: StockQuote): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData = {
        quote,
        timestamp: new Date().toISOString(),
      };
      
      localStorage.setItem(`${this.CACHE_KEY}_${symbol}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  // Utility functions
  static formatSymbol(symbol: string): string {
    // Convert to B3 format if needed
    const upperSymbol = symbol.toUpperCase().trim();
    
    // Add .SA suffix for Brazilian stocks if not present
    if (!upperSymbol.includes('.') && this.isBrazilianStock(upperSymbol)) {
      return `${upperSymbol}.SA`;
    }
    
    return upperSymbol;
  }

  private static isBrazilianStock(symbol: string): boolean {
    // Brazilian stocks typically end with numbers
    return /\d+$/.test(symbol);
  }

  static getDefaultStocks(): string[] {
    return [
      'PETR4.SA', // Petrobras
      'VALE3.SA', // Vale
      'ITUB4.SA', // Itaú
      'BBDC4.SA', // Bradesco
      'ABEV3.SA', // Ambev
      'WEGE3.SA', // WEG
      'MGLU3.SA', // Magazine Luiza
      'VVAR3.SA', // Via Varejo
      'GGBR4.SA', // Gerdau
      'USIM5.SA', // Usiminas
    ];
  }

  // Market status
  static isMarketOpen(): boolean {
    const now = new Date();
    const brasilia = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const [hours, minutes] = brasilia.split(':').map(Number);
    const currentTime = hours * 100 + minutes;
    const dayOfWeek = now.getDay();

    // Monday to Friday
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Market hours: 10:00 to 18:00 (Brazil time)
      return currentTime >= 1000 && currentTime <= 1800;
    }

    return false;
  }

  static getMarketStatus(): string {
    if (this.isMarketOpen()) {
      return 'Mercado Aberto';
    } else {
      const now = new Date();
      const dayOfWeek = now.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return 'Mercado Fechado - Final de Semana';
      } else {
        return 'Mercado Fechado';
      }
    }
  }

  // Clear cache
  static clearCache(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_KEY)) {
        localStorage.removeItem(key);
      }
    });
  }
}