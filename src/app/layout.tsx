import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Planilha Financeira Dinâmica',
  description: 'Sistema completo para controle financeiro pessoal com gestão de despesas, receitas, investimentos e análises mensais.',
  keywords: ['finanças', 'investimentos', 'controle financeiro', 'planilha', 'ações', 'tesouro direto'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  );
}