/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MarketType = 'Crypto' | 'Forex' | 'Stocks' | 'Commodities';
export type DirectionType = 'Long' | 'Short';
export type StatusType = 'Win' | 'Loss' | 'Open';
export type MarketMoodType = 'Ext. Fear' | 'Neutral' | 'Ext. Greed';

export interface Trade {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  symbol: string;
  market: MarketType;
  direction: DirectionType;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  fees: number;
  status: StatusType;
  pnl: number; // Calculated automatically, can be overridden
  roi: number; // Calculated ROI %
  strategy: string;
  confluences: string[];
  marketMood: MarketMoodType;
  emotionalState: string; // Emoji
  preTradeEmotion?: string; // Emoji
  postTradeEmotion?: string; // Emoji
  timeframe?: string; // e.g. 5M, 15M, 1H
  notes: string;
  screenshots: string[]; // Base64 strings or URLs
  tradingViewUrl?: string; // TradingView chart or idea link
  closeTime?: string; // Position close timestamp YYYY-MM-DDTHH:mm
  riskPercentage?: number; // Risk percentage of capital (%)
  exchange?: string; // e.g. Binance, Bybit
  analysisType?: string; // Technical, Fundamental, Sentiment, etc.
  executionType?: 'Market' | 'Limit' | 'Stop';
  takeProfits?: { id: string; price: number; sizePct: number }[];
  slippage?: number;
  postTradeNotes?: string;
  strategies?: string[];
}

export interface CapitalFlow {
  id: string;
  userId?: string;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string; // Additional reflection note or details
}

export interface CommissionTemplate {
  id: string;
  name: string;
  ratePct: number; // Percentage fee e.g. 0.1 for 0.1%
  fixedFee: number; // Fixed fee in $ e.g. 1.50
}

export interface DynamicConfig {
  strategies: string[];
  timeframes: string[];
  confluences: string[];
  exchanges: string[];
  symbols: string[];
  commissionTemplates?: CommissionTemplate[];
  initialCapital?: number;
  lang?: 'en' | 'fa';
  username?: string;
}

export interface StrategyStats {
  name: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export interface PairStats {
  symbol: string;
  trades: number;
  percentage: number;
}
