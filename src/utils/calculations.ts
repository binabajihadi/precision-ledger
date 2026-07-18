/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trade, StrategyStats, PairStats } from '../types';

/**
 * Calculates the PnL and ROI for a trade.
 */
export function calculateTradePnlAndRoi(
  direction: 'Long' | 'Short',
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  leverage: number,
  fees: number,
  status: 'Win' | 'Loss' | 'Open'
): { pnl: number; roi: number } {
  if (status === 'Open' || !entryPrice || !quantity) {
    return { pnl: 0, roi: 0 };
  }

  const effectiveExit = exitPrice || entryPrice;
  const effectiveLeverage = leverage || 1;

  // STRICT CRYPTO FUTURES FORMULAS
  // 1. Raw PnL (Without Leverage Multiplication on PnL since volume/quantity is already in asset size)
  // For LONG:  PnL = (ExitPrice - EntryPrice) * Quantity - Fees
  // For SHORT: PnL = (EntryPrice - ExitPrice) * Quantity - Fees
  const rawDiff = direction === 'Long' ? effectiveExit - entryPrice : entryPrice - effectiveExit;
  const rawPnl = rawDiff * quantity;
  const pnl = rawPnl - fees;

  // 2. Margin = (EntryPrice * Quantity) / Leverage
  const marginUsed = (entryPrice * quantity) / effectiveLeverage;

  // 3. ROI = (PnL / Margin) * 100
  const roi = marginUsed > 0 ? (pnl / marginUsed) * 100 : 0;

  return { pnl, roi };
}

export interface DashboardMetrics {
  netPnl: number;
  winRate: number;
  totalTrades: number;
  avgWinLossRatio: string;
  profitFactor: number;
  activeStreak: string;
  maxDrawdown: number; // MDD as percentage e.g. 5.2
  sharpeRatio: number; // Sharpe Ratio e.g. 1.84
  tradeExpectancy: number; // Expectancy value e.g. 15.20 or ratio
}

/**
 * Calculates aggregate performance statistics from all saved trades.
 */
export function calculateDashboardMetrics(trades: Trade[], initialCapital: number = 10000): DashboardMetrics {
  const closedTrades = trades.filter((t) => t.status !== 'Open');
  const totalTrades = trades.length;
  const totalClosed = closedTrades.length;

  if (totalClosed === 0) {
    return {
      netPnl: 0,
      winRate: 0,
      totalTrades,
      avgWinLossRatio: '1:1',
      profitFactor: 0,
      activeStreak: 'No Trades',
      maxDrawdown: 0,
      sharpeRatio: 0,
      tradeExpectancy: 0,
    };
  }

  // Net PnL is the sum of PnLs of all trades
  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  // Wins and Losses
  const wins = closedTrades.filter((t) => t.pnl > 0 || t.status === 'Win');
  const losses = closedTrades.filter((t) => t.pnl < 0 || t.status === 'Loss');

  const winRate = totalClosed > 0 ? (wins.length / totalClosed) * 100 : 0;

  // Gross profits and losses
  const grossProfit = wins.reduce((sum, t) => sum + Math.max(0, t.pnl), 0);
  const grossLoss = losses.reduce((sum, t) => sum + Math.abs(Math.min(0, t.pnl)), 0);

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  // Avg Win vs Avg Loss
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;

  let avgWinLossRatio = '1:1';
  if (avgLoss > 0 && avgWin > 0) {
    const ratio = avgWin / avgLoss;
    avgWinLossRatio = `${ratio.toFixed(1)}:1`;
  } else if (avgWin > 0) {
    avgWinLossRatio = 'Win Only';
  } else if (avgLoss > 0) {
    avgWinLossRatio = 'Loss Only';
  }

  // Active Streak
  // Sort trades by date descending (newest first) to find current active streak
  const sortedTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streakCount = 0;
  let streakType: 'Win' | 'Loss' | null = null;

  for (const t of sortedTrades) {
    if (t.status === 'Open') continue;
    const isWin = t.pnl > 0 || t.status === 'Win';
    if (streakType === null) {
      streakType = isWin ? 'Win' : 'Loss';
      streakCount = 1;
    } else {
      if ((streakType === 'Win' && isWin) || (streakType === 'Loss' && !isWin)) {
        streakCount++;
      } else {
        break; // Streak broken
      }
    }
  }

  const activeStreak = streakType ? `${streakCount} ${streakType}s` : '0 Streak';

  // 1. Maximum Drawdown (MDD) calculation
  let peak = initialCapital > 0 ? initialCapital : 10000;
  let currentBalance = peak;
  let maxDD = 0;
  
  // Sort closed trades chronologically (oldest first)
  const chronoClosed = [...closedTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const t of chronoClosed) {
    currentBalance += t.pnl;
    if (currentBalance > peak) {
      peak = currentBalance;
    }
    const dd = peak > 0 ? ((peak - currentBalance) / peak) * 100 : 0;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }

  // 2. Sharpe Ratio calculation
  const pnls = closedTrades.map((t) => t.pnl);
  const meanPnl = pnls.reduce((sum, val) => sum + val, 0) / totalClosed;
  const variance = pnls.reduce((sum, val) => sum + Math.pow(val - meanPnl, 2), 0) / totalClosed;
  const stdDev = Math.sqrt(variance);
  // Sharpe Ratio = mean / standard deviation. Since it's trade-by-trade, we use standard ratio.
  const sharpeRatio = stdDev > 0 ? meanPnl / stdDev : 0;

  // 3. Trade Expectancy calculation
  // Expectancy = (Win Rate / 100 * Avg Win) - (Loss Rate / 100 * Avg Loss)
  const winPct = winRate / 100;
  const lossPct = 1 - winPct;
  const tradeExpectancy = (winPct * avgWin) - (lossPct * avgLoss);

  return {
    netPnl,
    winRate,
    totalTrades,
    avgWinLossRatio,
    profitFactor: Math.min(99.9, Number(profitFactor.toFixed(2))),
    activeStreak,
    maxDrawdown: Math.max(0, Number(maxDD.toFixed(2))),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    tradeExpectancy: Number(tradeExpectancy.toFixed(2)),
  };
}

/**
 * Calculates win/loss breakdown by strategy.
 */
export function calculateStrategyStats(trades: Trade[]): StrategyStats[] {
  const strategies = Array.from(new Set(trades.map((t) => t.strategy).filter(Boolean)));
  
  // Default strategies to show if not in trades
  const defaultStrats = ['Breakout Trend', 'Mean Reversion', 'Fibonacci Retracement', 'News Catalyst'];
  const allStrats = Array.from(new Set([...defaultStrats, ...strategies]));

  return allStrats.map((strat) => {
    const stratTrades = trades.filter((t) => t.strategy === strat && t.status !== 'Open');
    const total = stratTrades.length;
    const wins = stratTrades.filter((t) => t.pnl > 0 || t.status === 'Win').length;
    const losses = total - wins;
    const winRate = total > 0 ? (wins / total) * 100 : 50; // default 50% for display visual if empty
    
    return {
      name: strat,
      wins,
      losses,
      total,
      winRate: Math.round(winRate),
    };
  });
}

/**
 * Calculates most traded pairs for the Donut chart.
 */
export function calculatePairStats(trades: Trade[]): PairStats[] {
  const pairs = trades.map((t) => t.symbol.toUpperCase().replace('-', '/')).filter(Boolean);
  const total = pairs.length;

  if (total === 0) {
    return [
      { symbol: 'EUR/USD', trades: 0, percentage: 45 },
      { symbol: 'GBP/JPY', trades: 0, percentage: 25 },
      { symbol: 'BTC/USD', trades: 0, percentage: 20 },
      { symbol: 'XAU/USD', trades: 0, percentage: 10 },
    ];
  }

  const counts: Record<string, number> = {};
  pairs.forEach((p) => {
    const key = p.includes('/') ? p : p.slice(0, 3) + '/' + p.slice(3);
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .map(([symbol, count]) => ({
      symbol,
      trades: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.trades - a.trades);

  // Return top 4 or fill with defaults
  return sorted.slice(0, 4);
}
