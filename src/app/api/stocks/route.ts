import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    // Using Alpha Vantage as a free alternative (demo data)
    // In production, you would use a real API key
    const mockData = generateMockStockData(symbol);
    
    return NextResponse.json({
      symbol: symbol,
      price: mockData.price,
      change: mockData.change,
      changePercent: mockData.changePercent,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data' }, 
      { status: 500 }
    );
  }
}

// Mock data generator for demonstration
function generateMockStockData(symbol: string) {
  // Generate realistic mock data based on symbol
  const basePrice = getBasePriceForSymbol(symbol);
  const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
  const price = basePrice * (1 + variation);
  const change = basePrice * variation;
  const changePercent = variation * 100;

  return {
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
  };
}

function getBasePriceForSymbol(symbol: string): number {
  // Base prices for common Brazilian stocks (approximate values)
  const basePrices: Record<string, number> = {
    'PETR4.SA': 35.50,
    'VALE3.SA': 65.80,
    'ITUB4.SA': 25.30,
    'BBDC4.SA': 18.90,
    'ABEV3.SA': 12.40,
    'WEGE3.SA': 45.20,
    'MGLU3.SA': 8.50,
    'VVAR3.SA': 4.20,
    'GGBR4.SA': 22.10,
    'USIM5.SA': 8.80,
  };

  return basePrices[symbol] || Math.random() * 100 + 10; // Random price between 10-110
}