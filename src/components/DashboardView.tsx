/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Trade, CapitalFlow } from '../types';
import {
  calculateDashboardMetrics,
  calculateStrategyStats,
  calculatePairStats,
} from '../utils/calculations';
import { TRADING_QUOTES } from '../utils/seedData';
import { TRANSLATIONS, PERSISTENT_QUOTES_FA } from '../utils/translations';

interface DashboardViewProps {
  trades: Trade[];
  initialCapital: number;
  onUpdateInitialCapital: (val: number) => void;
  setView: (view: 'dashboard' | 'tradelog' | 'addtrade' | 'settings' | 'calculator') => void;
  onSelectTrade: (trade: Trade) => void;
  lang: 'en' | 'fa';
  capitalFlows?: CapitalFlow[];
  onAddCapitalFlow?: (flow: Omit<CapitalFlow, 'id'>) => void;
  onDeleteCapitalFlow?: (id: string) => void;
}

// Helper to parse date string in local timezone instead of UTC to avoid timezone one-day-behind offsets
const parseLocalDate = (dateStr: string | undefined | null): Date => {
  if (!dateStr) return new Date();
  const clean = dateStr.replace('T', ' ').replace('/', '-');
  const parts = clean.split(' ');
  const dateParts = parts[0].split('-');
  
  if (dateParts.length < 3) return new Date(dateStr);
  
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  
  if (parts[1]) {
    const timeParts = parts[1].split(':');
    hours = parseInt(timeParts[0], 10) || 0;
    minutes = parseInt(timeParts[1], 10) || 0;
    seconds = parseInt(timeParts[2], 10) || 0;
  }
  
  return new Date(year, month, day, hours, minutes, seconds);
};

export default function DashboardView({
  trades,
  initialCapital,
  onUpdateInitialCapital,
  setView,
  onSelectTrade,
  lang,
  capitalFlows = [],
  onAddCapitalFlow,
  onDeleteCapitalFlow,
}: DashboardViewProps) {
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | 'YTD'>('3M');
  const [chartTab, setChartTab] = useState<'equity' | 'drawdown' | 'dailyBar'>('equity');
  const [timeAnalysisTab, setTimeAnalysisTab] = useState<'dow' | 'tod'>('dow');
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Floating Tooltip state for custom charts and heatmap
  const [chartTooltip, setChartTooltip] = useState<{
    date: string;
    pnl: number;
    cumulative?: number;
    drawdown?: number;
    x: number;
    y: number;
  } | null>(null);

  const [heatmapTooltip, setHeatmapTooltip] = useState<{
    date: string;
    pnl: number;
    x: number;
    y: number;
  } | null>(null);

  const isRtl = lang === 'fa';
  const t = TRANSLATIONS[lang];
  const activeQuotesList = isRtl ? PERSISTENT_QUOTES_FA : TRADING_QUOTES;

  const nextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % activeQuotesList.length);
  };

  // Derive core metrics with initial capital passed for drawdown calculations
  const metrics = useMemo(() => {
    return calculateDashboardMetrics(trades, initialCapital);
  }, [trades, initialCapital]);

  const strategyStats = useMemo(() => calculateStrategyStats(trades), [trades]);
  const pairStats = useMemo(() => calculatePairStats(trades), [trades]);

  // Capital Flow state and calculations
  const [flowAmount, setFlowAmount] = useState<number | ''>('');
  const [flowNote, setFlowNote] = useState<string>('');
  const [flowSearchQuery, setFlowSearchQuery] = useState<string>('');
  const [flowDate, setFlowDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const netCapitalFlows = useMemo(() => {
    return (capitalFlows || []).reduce((sum, flow) => {
      return flow.type === 'Deposit' ? sum + flow.amount : sum - flow.amount;
    }, 0);
  }, [capitalFlows]);

  const totalEquity = useMemo(() => {
    return initialCapital + metrics.netPnl + netCapitalFlows;
  }, [initialCapital, metrics.netPnl, netCapitalFlows]);

  const handleAddFlow = (type: 'Deposit' | 'Withdrawal') => {
    const amt = Number(flowAmount);
    if (!amt || amt <= 0) {
      alert(isRtl ? 'لطفاً یک مبلغ معتبر وارد کنید.' : 'Please enter a valid amount.');
      return;
    }
    if (type === 'Withdrawal' && amt > totalEquity) {
      alert(isRtl ? 'کاهش سرمایه بیش از حد موجودی حساب است!' : 'Withdrawal amount exceeds total account equity!');
      return;
    }
    if (onAddCapitalFlow) {
      onAddCapitalFlow({
        type,
        amount: amt,
        date: flowDate,
        note: flowNote.trim() || undefined,
      });
    }
    setFlowAmount('');
    setFlowNote('');
  };

  const highValueTrades = useMemo(() => {
    return [...trades]
      .filter((t) => t.status !== 'Open')
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 3);
  }, [trades]);

  const filteredFlows = useMemo(() => {
    const list = capitalFlows || [];
    if (!flowSearchQuery.trim()) {
      return list;
    }
    const q = flowSearchQuery.toLowerCase();
    return list.filter(flow => 
      flow.type.toLowerCase().includes(q) ||
      (flow.note && flow.note.toLowerCase().includes(q)) ||
      flow.date.includes(q) ||
      flow.amount.toString().includes(q)
    );
  }, [capitalFlows, flowSearchQuery]);

  // Chronologically Filtered Trades for Charts
  const chronologicalClosedTrades = useMemo(() => {
    const sortedClosed = [...trades]
      .filter((t) => t.status !== 'Open')
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

    let filtered = sortedClosed;
    if (sortedClosed.length > 0) {
      const latestDate = parseLocalDate(sortedClosed[sortedClosed.length - 1].date);
      let cutoffDate = new Date(latestDate);
      
      if (timeframe === '1M') {
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      } else if (timeframe === '3M') {
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
      } else if (timeframe === 'YTD') {
        cutoffDate.setMonth(0);
        cutoffDate.setDate(1);
      }

      filtered = sortedClosed.filter((t) => parseLocalDate(t.date) >= cutoffDate);
    }
    return filtered;
  }, [trades, timeframe]);

  // Equity Curve Point Coordinates
  const equityPoints = useMemo(() => {
    let runningSum = 0;
    const points = chronologicalClosedTrades.map((t) => {
      runningSum += t.pnl;
      return {
        date: t.date,
        pnl: t.pnl,
        cumulative: runningSum,
      };
    });
    return [{ date: 'Start', pnl: 0, cumulative: 0 }, ...points];
  }, [chronologicalClosedTrades]);

  // Drawdown Points for Underwater Chart
  const drawdownPoints = useMemo(() => {
    let peak = initialCapital > 0 ? initialCapital : 10000;
    let balance = peak;
    const points = [];

    points.push({ date: 'Start', pnl: 0, balance, peak, drawdownPct: 0 });

    chronologicalClosedTrades.forEach((t) => {
      balance += t.pnl;
      if (balance > peak) {
        peak = balance;
      }
      const ddPct = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      points.push({
        date: t.date,
        pnl: t.pnl,
        balance,
        peak,
        drawdownPct: -ddPct, // negative value for underwater downward display
      });
    });

    return points;
  }, [chronologicalClosedTrades, initialCapital]);

  // Daily PnL aggregated points
  const dailyPnLPoints = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    chronologicalClosedTrades.forEach((t) => {
      const cleanDate = t.date ? t.date.split(/[ T]/)[0] : '';
      if (cleanDate) {
        dailyMap[cleanDate] = (dailyMap[cleanDate] || 0) + t.pnl;
      }
    });

    return Object.entries(dailyMap)
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  }, [chronologicalClosedTrades]);

  // Interactive Chart SVG Renderer helper parameters
  const chartParams = useMemo(() => {
    const width = 1000;
    const height = 300;
    const paddingX = 50;
    const paddingY = 40;

    if (chartTab === 'equity') {
      const values = equityPoints.map((p) => p.cumulative);
      const minVal = Math.min(...values, 0);
      const maxVal = Math.max(...values, 100);
      const range = maxVal - minVal || 1;

      const mapped = equityPoints.map((p, index) => {
        const x = paddingX + (index / (equityPoints.length - 1)) * (width - paddingX * 2);
        const y = height - paddingY - ((p.cumulative - minVal) / range) * (height - paddingY * 2);
        return { x, y, ...p };
      });

      let linePath = `M ${mapped[0].x} ${mapped[0].y}`;
      for (let i = 1; i < mapped.length; i++) {
        linePath += ` L ${mapped[i].x} ${mapped[i].y}`;
      }

      const areaPath = `${linePath} L ${mapped[mapped.length - 1].x} ${height - paddingY} L ${mapped[0].x} ${height - paddingY} Z`;

      return { mapped, linePath, areaPath, minVal, maxVal };
    } else if (chartTab === 'drawdown') {
      const values = drawdownPoints.map((p) => p.drawdownPct);
      const minVal = Math.min(...values, -10);
      const maxVal = 0;
      const range = maxVal - minVal || 1;

      const mapped = drawdownPoints.map((p, index) => {
        const x = paddingX + (index / (drawdownPoints.length - 1)) * (width - paddingX * 2);
        const y = paddingY + ((p.drawdownPct - maxVal) / minVal) * (height - paddingY * 2);
        return { x, y, ...p };
      });

      let linePath = `M ${mapped[0].x} ${mapped[0].y}`;
      for (let i = 1; i < mapped.length; i++) {
        linePath += ` L ${mapped[i].x} ${mapped[i].y}`;
      }

      const areaPath = `${linePath} L ${mapped[mapped.length - 1].x} ${paddingY} L ${mapped[0].x} ${paddingY} Z`;

      return { mapped, linePath, areaPath, minVal, maxVal };
    } else {
      // Daily Bar Chart Parameters
      if (dailyPnLPoints.length === 0) return { mapped: [] };
      const values = dailyPnLPoints.map((p) => Math.abs(p.pnl));
      const maxVal = Math.max(...values, 100);

      const barWidth = Math.max(2, Math.min(30, (width - paddingX * 2) / dailyPnLPoints.length * 0.6));
      const spacing = (width - paddingX * 2) / dailyPnLPoints.length;

      const mapped = dailyPnLPoints.map((p, index) => {
        const x = paddingX + index * spacing + spacing / 2;
        const zeroY = height / 2; // middle axis
        const barHeight = (p.pnl / maxVal) * (height / 2 - paddingY);
        
        // y coordinate starts from top of bar down to bottom
        const y = p.pnl >= 0 ? zeroY - barHeight : zeroY;
        const h = Math.abs(barHeight) || 2; // minimum height 2px for visual trace

        return { x, y, h, barWidth, zeroY, ...p };
      });

      return { mapped, maxVal };
    }
  }, [equityPoints, drawdownPoints, dailyPnLPoints, chartTab]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    const sign = val >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Periodic statistics breakdown
  const periodicStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
    
    const getLocalDateObject = (dateStr: string) => {
      const d = parseLocalDate(dateStr);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    let pnlToday = 0;
    let pnlWeek = 0;
    let pnlMonth = 0;
    let pnlYear = 0;
    let pnlAll = 0;

    trades.forEach((t) => {
      if (t.status === 'Open') return;
      const tDate = getLocalDateObject(t.date);
      const tTime = tDate.getTime();

      pnlAll += t.pnl;

      if (tTime === todayStart) {
        pnlToday += t.pnl;
      }
      if (tTime >= sevenDaysAgoStart) {
        pnlWeek += t.pnl;
      }
      if (tDate.getFullYear() === now.getFullYear() && tDate.getMonth() === now.getMonth()) {
        pnlMonth += t.pnl;
      }
      if (tDate.getFullYear() === now.getFullYear()) {
        pnlYear += t.pnl;
      }
    });

    const calcRoi = (pnl: number) => {
      if (!initialCapital || initialCapital <= 0) return 0;
      return (pnl / initialCapital) * 100;
    };

    return [
      { label: t.today, pnl: pnlToday, roi: calcRoi(pnlToday) },
      { label: t.thisWeek, pnl: pnlWeek, roi: calcRoi(pnlWeek) },
      { label: t.thisMonth, pnl: pnlMonth, roi: calcRoi(pnlMonth) },
      { label: t.thisYear, pnl: pnlYear, roi: calcRoi(pnlYear) },
      { label: t.allTime, pnl: pnlAll, roi: calcRoi(pnlAll) },
    ];
  }, [trades, initialCapital, t]);

  // 1. Heatmap Data Generation
  const heatmapData = useMemo(() => {
    const dailyPnL: Record<string, number> = {};
    trades.forEach((t) => {
      if (t.status === 'Open') return;
      const cleanDate = t.date ? t.date.split(/[ T]/)[0] : '';
      if (cleanDate) {
        dailyPnL[cleanDate] = (dailyPnL[cleanDate] || 0) + t.pnl;
      }
    });

    const list = [];
    // End Date is Saturday of the current week to align with Sunday-Saturday rows
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const currentDay = endDate.getDay(); // 0 is Sunday, 6 is Saturday
    endDate.setDate(endDate.getDate() + (6 - currentDay));

    const totalDays = 371; // 53 weeks * 7 days
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - totalDays + 1);

    for (let i = 0; i < totalDays; i++) {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + i);
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      list.push({
        date: dateStr,
        pnl: dailyPnL[dateStr] || 0,
        dayOfWeek: current.getDay(),
        monthLabel: current.toLocaleString('en-US', { month: 'short' }),
        dayOfMonth: current.getDate(),
      });
    }
    return list;
  }, [trades]);

  // Partition Heatmap Data into 53 weeks (columns) x 7 days (rows)
  const heatmapWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7));
    }
    return weeks;
  }, [heatmapData]);

  // Find Month labels and column indices for heatmap header
  const monthHeaders = useMemo(() => {
    const headers: { label: string; index: number }[] = [];
    let prevMonth = '';
    heatmapWeeks.forEach((week, weekIdx) => {
      const firstDay = week[0];
      if (firstDay && firstDay.monthLabel !== prevMonth) {
        headers.push({ label: firstDay.monthLabel, index: weekIdx });
        prevMonth = firstDay.monthLabel;
      }
    });
    return headers;
  }, [heatmapWeeks]);

  // Determine dynamic range for heatmap scaling colors
  const maxDayWin = useMemo(() => {
    const gains = heatmapData.map((d) => d.pnl).filter((p) => p > 0);
    return gains.length > 0 ? Math.max(...gains) : 100;
  }, [heatmapData]);

  const maxDayLoss = useMemo(() => {
    const losses = heatmapData.map((d) => d.pnl).filter((p) => p < 0);
    return losses.length > 0 ? Math.abs(Math.min(...losses)) : 100;
  }, [heatmapData]);

  // Heatmap Aggregate Stats
  const heatmapStats = useMemo(() => {
    let tradingDays = 0;
    let winDays = 0;
    let lossDays = 0;
    let totalProfits = 0;
    let totalLosses = 0;

    heatmapData.forEach((day) => {
      if (day.pnl > 0) {
        tradingDays++;
        winDays++;
        totalProfits += day.pnl;
      } else if (day.pnl < 0) {
        tradingDays++;
        lossDays++;
        totalLosses += day.pnl;
      }
    });

    const avgWinDay = winDays > 0 ? totalProfits / winDays : 0;
    const avgLossDay = lossDays > 0 ? totalLosses / lossDays : 0;

    return {
      tradingDays,
      winDays,
      lossDays,
      avgWinDay,
      avgLossDay,
      winRatio: tradingDays > 0 ? (winDays / tradingDays) * 100 : 0,
    };
  }, [heatmapData]);

  // 2. Long vs Short Performance metrics
  const longShortStats = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status !== 'Open');
    const longs = closedTrades.filter((t) => t.direction === 'Long');
    const shorts = closedTrades.filter((t) => t.direction === 'Short');

    const longTotal = longs.length;
    const longWins = longs.filter((t) => t.pnl > 0 || t.status === 'Win').length;
    const longWinRate = longTotal > 0 ? (longWins / longTotal) * 100 : 0;
    const longPnl = longs.reduce((sum, t) => sum + t.pnl, 0);

    const shortTotal = shorts.length;
    const shortWins = shorts.filter((t) => t.pnl > 0 || t.status === 'Win').length;
    const shortWinRate = shortTotal > 0 ? (shortWins / shortTotal) * 100 : 0;
    const shortPnl = shorts.reduce((sum, t) => sum + t.pnl, 0);

    return {
      longTotal,
      longWins,
      longLosses: longTotal - longWins,
      longWinRate,
      longPnl,
      shortTotal,
      shortWins,
      shortLosses: shortTotal - shortWins,
      shortWinRate,
      shortPnl,
    };
  }, [trades]);

  // 3. Best & Worst Performers Widget
  const performers = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status !== 'Open');
    
    // By Asset
    const assetPnL: Record<string, number> = {};
    closedTrades.forEach((t) => {
      const sym = t.symbol.toUpperCase();
      assetPnL[sym] = (assetPnL[sym] || 0) + t.pnl;
    });

    let bestAsset = '';
    let bestAssetPnl = -Infinity;
    let worstAsset = '';
    let worstAssetPnl = Infinity;

    Object.entries(assetPnL).forEach(([sym, pnl]) => {
      if (pnl > bestAssetPnl) {
        bestAssetPnl = pnl;
        bestAsset = sym;
      }
      if (pnl < worstAssetPnl) {
        worstAssetPnl = pnl;
        worstAsset = sym;
      }
    });

    // By Strategy
    const stratPnL: Record<string, number> = {};
    closedTrades.forEach((t) => {
      const strat = t.strategy || 'No Strategy';
      stratPnL[strat] = (stratPnL[strat] || 0) + t.pnl;
    });

    let bestStrat = '';
    let bestStratPnl = -Infinity;
    let worstStrat = '';
    let worstStratPnl = Infinity;

    Object.entries(stratPnL).forEach(([strat, pnl]) => {
      if (pnl > bestStratPnl) {
        bestStratPnl = pnl;
        bestStrat = strat;
      }
      if (pnl < worstStratPnl) {
        worstStratPnl = pnl;
        worstStrat = strat;
      }
    });

    return {
      bestAsset: bestAssetPnl > 0 ? bestAsset : null,
      bestAssetPnl: bestAssetPnl > 0 ? bestAssetPnl : 0,
      worstAsset: worstAssetPnl < 0 ? worstAsset : null,
      worstAssetPnl: worstAssetPnl < 0 ? worstAssetPnl : 0,
      bestStrat: bestStratPnl > 0 ? bestStrat : null,
      bestStratPnl: bestStratPnl > 0 ? bestStratPnl : 0,
      worstStrat: worstStratPnl < 0 ? worstStrat : null,
      worstStratPnl: worstStratPnl < 0 ? worstStratPnl : 0,
    };
  }, [trades]);

  // 4. Time of Day / Day of Week analysis data
  const timeStats = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status !== 'Open');

    // Day of week stats: 0-6 (Sun-Sat)
    const dayWinRate = Array.from({ length: 7 }, (_, i) => ({
      day: i,
      wins: 0,
      total: 0,
      pnl: 0,
    }));

    // Hourly blocks (4-hour intervals)
    const hourWins = Array.from({ length: 6 }, (_, i) => ({
      block: `${i*4}:00-${(i+1)*4}:00`,
      wins: 0,
      total: 0,
      pnl: 0,
    }));

    const DAYS_ENG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const DAYS_FA = ['یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

    closedTrades.forEach((t) => {
      const dateObj = parseLocalDate(t.date);
      const dow = dateObj.getDay();
      const isWin = t.pnl > 0 || t.status === 'Win';

      dayWinRate[dow].total++;
      if (isWin) dayWinRate[dow].wins++;
      dayWinRate[dow].pnl += t.pnl;

      let hour = 12; // default
      if (t.closeTime && t.closeTime.includes('T')) {
        const parts = t.closeTime.split('T');
        if (parts[1]) {
          const hh = parseInt(parts[1].split(':')[0]);
          if (!isNaN(hh)) hour = hh;
        }
      }
      const blockIdx = Math.min(5, Math.floor(hour / 4));
      hourWins[blockIdx].total++;
      if (isWin) hourWins[blockIdx].wins++;
      hourWins[blockIdx].pnl += t.pnl;
    });

    return {
      dayStats: dayWinRate.map((d) => ({
        name: isRtl ? DAYS_FA[d.day] : DAYS_ENG[d.day],
        winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0,
        total: d.total,
        pnl: d.pnl,
      })).filter((d) => d.total > 0),
      hourStats: hourWins.map((h) => ({
        name: h.block,
        winRate: h.total > 0 ? Math.round((h.wins / h.total) * 100) : 0,
        total: h.total,
        pnl: h.pnl,
      })).filter((h) => h.total > 0),
    };
  }, [trades, isRtl]);

  return (
    <div className="space-y-6 select-none text-on-surface">
      {/* Capital Tracking & Period Performance Panel */}
      <div className="bg-[#0D1117] border border-outline-variant rounded-2xl p-5 space-y-6 shadow-xl">
        <div className={`flex flex-col lg:flex-row gap-6 justify-between lg:items-center ${isRtl ? 'lg:flex-row-reverse' : ''}`}>
          {/* Capital inputs & NAV */}
          <div className={`flex flex-col sm:flex-row gap-6 items-start sm:items-center w-full lg:w-auto ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
            <div className="space-y-1.5 shrink-0">
              <label className={`text-[10px] font-bold tracking-widest text-on-surface-variant uppercase flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <span className="material-symbols-outlined text-[14px] text-primary">account_balance_wallet</span>
                {t.initialCapital}
              </label>
              <div className="relative">
                <span className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant`}>$</span>
                <input
                  type="number"
                  value={initialCapital || ''}
                  onChange={(e) => onUpdateInitialCapital(Number(e.target.value))}
                  placeholder="10,000"
                  className={`bg-surface-container border border-outline-variant rounded-lg ${isRtl ? 'pr-7 pl-3 text-right' : 'pl-7 pr-3 text-left'} py-1.5 text-xs font-bold text-on-surface w-36 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-all`}
                />
              </div>
            </div>

            <div className={`space-y-1 ${isRtl ? 'text-right' : 'text-left'}`}>
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                {isRtl ? 'مجموع ارزش کل دارایی (Equity)' : 'Total Account Equity'}
              </p>
              <div className={`flex items-baseline gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <span className="text-3xl font-black text-on-surface tracking-tight">
                  ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${metrics.netPnl >= 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
                  {isRtl ? 'بازده ترید:' : 'Trade ROI:'} {metrics.netPnl >= 0 ? '+' : ''}
                  {(initialCapital > 0 ? (metrics.netPnl / initialCapital) * 100 : 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats banner */}
          <div className={`flex items-center gap-3 bg-surface-container p-3 rounded-xl border border-outline-variant/45 w-full lg:max-w-md ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
            <span className="material-symbols-outlined text-primary text-xl shrink-0 select-none">psychology</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-on-surface font-semibold italic line-clamp-2">
                "{activeQuotesList[quoteIndex]}"
              </p>
            </div>
            <button onClick={nextQuote} className="p-1 text-on-surface-variant hover:text-on-surface rounded-full cursor-pointer hover:bg-surface-container-high shrink-0">
              <span className="material-symbols-outlined text-sm">refresh</span>
            </button>
          </div>
        </div>

        {/* Periodic Performance Breakdown Grid */}
        <div className="pt-4 border-t border-outline-variant/40">
          <p className={`text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t.periodicPerformance}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {periodicStats.map((stat) => {
              const isProfit = stat.pnl >= 0;
              return (
                <div key={stat.label} className={`bg-[#161b22] p-3 rounded-xl border border-outline-variant/60 flex flex-col justify-between ${isRtl ? 'text-right' : 'text-left'}`}>
                  <p className="text-[9px] font-bold tracking-wider text-on-surface-variant uppercase">
                    {stat.label}
                  </p>
                  <div className="mt-1.5">
                    <p className={`text-sm font-black ${isProfit ? 'text-primary' : 'text-secondary'}`}>
                      {formatCurrency(stat.pnl)}
                    </p>
                    <p className={`text-[9px] font-mono font-bold mt-0.5 ${isProfit ? 'text-primary' : 'text-secondary'}`}>
                      {isProfit ? '+' : ''}{stat.roi.toFixed(2)}% ROI
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced Metrics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Net PnL */}
        <div className={`bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-md ${isRtl ? 'text-right' : 'text-left'}`}>
          <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{t.netPnL}</p>
          <h3 className={`text-2xl font-black mt-2 tracking-tight ${metrics.netPnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
            {formatCurrency(metrics.netPnl)}
          </h3>
          <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${isRtl ? 'flex-row-reverse' : ''} ${metrics.netPnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
            <span className="material-symbols-outlined text-xs">
              {metrics.netPnl >= 0 ? 'trending_up' : 'trending_down'}
            </span>
            <span>{isRtl ? 'عملکرد انباشته کل دوره' : 'Cumulative growth'}</span>
          </div>
        </div>

        {/* Metric 2: Win Rate */}
        <div className={`bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-md ${isRtl ? 'text-right' : 'text-left'}`}>
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{t.winRate}</p>
            <span className="text-[9px] text-primary font-mono font-black">{trades.length} {isRtl ? 'معامله' : 'Trades'}</span>
          </div>
          <h3 className="text-2xl font-black text-on-surface mt-2 tracking-tight">{metrics.winRate.toFixed(1)}%</h3>
          <div className="w-full bg-surface-container h-1.5 mt-3 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${metrics.winRate}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Profit Factor */}
        <div className={`bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-md ${isRtl ? 'text-right' : 'text-left'}`}>
          <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{t.profitFactor}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-black text-on-surface tracking-tight">
              {metrics.profitFactor === 99.9 ? '99.9+' : metrics.profitFactor.toFixed(2)}
            </h3>
            {metrics.profitFactor >= 1.5 && (
              <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                PRO
              </span>
            )}
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium mt-2">{isRtl ? 'نسبت سود ناخالص به ضرر' : 'Gross wins / Gross losses'}</p>
        </div>

        {/* Metric 4: Maximum Drawdown (MDD) */}
        <div className={`bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-md ${isRtl ? 'text-right' : 'text-left'}`}>
          <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{isRtl ? 'حداکثر افت سرمایه (MDD)' : 'Max Drawdown (MDD)'}</p>
          <h3 className={`text-2xl font-black mt-2 tracking-tight ${metrics.maxDrawdown > 15 ? 'text-secondary' : metrics.maxDrawdown > 5 ? 'text-amber-500' : 'text-primary'}`}>
            -{metrics.maxDrawdown.toFixed(2)}%
          </h3>
          <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${isRtl ? 'flex-row-reverse' : ''} text-on-surface-variant`}>
            <span className="material-symbols-outlined text-xs">analytics</span>
            <span>{isRtl ? 'حداکثر کاهش سرمایه متوالی' : 'Peak-to-trough drop'}</span>
          </div>
        </div>

        {/* Metric 5: Sharpe Ratio */}
        <div className={`bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-md ${isRtl ? 'text-right' : 'text-left'}`}>
          <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{isRtl ? 'نسبت شارپ (Sharpe)' : 'Sharpe Ratio'}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-black text-on-surface tracking-tight">
              {metrics.sharpeRatio.toFixed(2)}
            </h3>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
              metrics.sharpeRatio >= 2.0 
                ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400' 
                : metrics.sharpeRatio >= 1.0 
                ? 'bg-primary/10 border border-primary/20 text-primary' 
                : 'bg-on-surface-variant/10 border border-outline-variant text-on-surface-variant'
            }`}>
              {metrics.sharpeRatio >= 2.0 ? 'Elite' : metrics.sharpeRatio >= 1.0 ? 'Good' : 'Weak'}
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium mt-2">{isRtl ? 'کیفیت بازدهی متناسب با ریسک' : 'Risk-adjusted return efficiency'}</p>
        </div>

        {/* Metric 6: Trade Expectancy */}
        <div className={`bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-md ${isRtl ? 'text-right' : 'text-left'}`}>
          <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{isRtl ? 'امید ریاضی معامله (Expectancy)' : 'Expectancy / Trade'}</p>
          <h3 className={`text-2xl font-black mt-2 tracking-tight ${metrics.tradeExpectancy >= 0 ? 'text-primary' : 'text-secondary'}`}>
            {metrics.tradeExpectancy >= 0 ? '+' : ''}${metrics.tradeExpectancy.toLocaleString('en-US')}
          </h3>
          <p className="text-[10px] text-on-surface-variant font-medium mt-2">
            {isRtl ? 'میانگین ارزش انتظاری هر ترید' : 'Expected net value per execution'}
          </p>
        </div>

        {/* Metric 7: Total Trades */}
        <div className={`bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-md ${isRtl ? 'text-right' : 'text-left'}`}>
          <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{t.totalTrades}</p>
          <h3 className="text-2xl font-black text-on-surface mt-2 tracking-tight">{metrics.totalTrades}</h3>
          <p className="text-[10px] text-on-surface-variant font-medium mt-2">
            {isRtl ? `میانگین ${(metrics.totalTrades / 30).toFixed(1)} معامله در روز` : `Avg ${(metrics.totalTrades / 30).toFixed(1)} trades / day`}
          </p>
        </div>

        {/* Metric 8: Avg Win vs Loss Ratio */}
        <div className={`bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-md ${isRtl ? 'text-right' : 'text-left'}`}>
          <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{isRtl ? 'میانگین سود به ضرر' : 'Avg Win vs Loss'}</p>
          <h3 className="text-2xl font-black text-on-surface mt-2 tracking-tight">{metrics.avgWinLossRatio}</h3>
          <p className="text-[10px] text-on-surface-variant font-medium mt-2">
            {isRtl ? 'توازن سودآوری سیستم' : 'Historical payoff ratio'}
          </p>
        </div>
      </div>

      {/* GitHub style PnL Calendar Heatmap Widget */}
      <div className="bg-[#0D1117] border border-outline-variant p-6 rounded-2xl shadow-xl space-y-4">
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
          <div className={isRtl ? 'text-right' : 'text-left'}>
            <h2 className="text-base font-black text-on-surface flex items-center gap-2 justify-start">
              <span className="material-symbols-outlined text-primary text-xl">calendar_month</span>
              {isRtl ? 'نقشه حرارتی تقویم معاملاتی سود و زیان' : 'PnL Calendar Heatmap'}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isRtl ? 'الگوهای ترید روزانه، پایداری و عادات معاملاتی شما در ۳۶۵ روز اخیر' : 'Daily visual of trading habits and consistency over the last 365 days'}
            </p>
          </div>

          {/* Quick Heatmap Stats */}
          <div className="flex gap-4 text-[10px] font-semibold bg-surface-container p-2 rounded-xl border border-outline-variant/50">
            <div>
              <span className="text-on-surface-variant block uppercase text-[8px]">{isRtl ? 'روزهای معاملاتی' : 'Active Days'}</span>
              <span className="text-on-surface font-black">{heatmapStats.tradingDays} days</span>
            </div>
            <div className="border-r border-outline-variant"></div>
            <div>
              <span className="text-on-surface-variant block uppercase text-[8px]">{isRtl ? 'روزهای مثبت' : 'Win Days'}</span>
              <span className="text-primary font-black">{heatmapStats.winDays} ({heatmapStats.winRatio.toFixed(0)}%)</span>
            </div>
            <div className="border-r border-outline-variant"></div>
            <div>
              <span className="text-on-surface-variant block uppercase text-[8px]">{isRtl ? 'میانگین سود روز' : 'Avg Win Day'}</span>
              <span className="text-primary font-black">${Math.round(heatmapStats.avgWinDay).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Frame */}
        <div className="relative border border-outline-variant/40 bg-[#161b22]/40 rounded-xl p-4 overflow-x-auto no-scrollbar">
          
          {/* Custom Floating Tooltip */}
          {heatmapTooltip && (
            <div
              className="absolute z-30 pointer-events-none bg-surface-container border border-outline-variant/80 p-2 rounded-lg shadow-xl text-[10px] font-mono flex flex-col gap-0.5 leading-none shrink-0"
              style={{
                left: `${heatmapTooltip.x + 10}px`,
                top: `${heatmapTooltip.y - 45}px`,
              }}
            >
              <div className="text-on-surface font-black">{heatmapTooltip.date}</div>
              <div className={`font-black ${heatmapTooltip.pnl > 0 ? 'text-primary' : heatmapTooltip.pnl < 0 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                {heatmapTooltip.pnl === 0 ? 'No Trades' : formatCurrency(heatmapTooltip.pnl)}
              </div>
            </div>
          )}

          <div className="min-w-[700px] flex flex-col space-y-1">
            {/* 1. Month Labels Row */}
            <div className="relative h-4 text-[9px] font-bold text-on-surface-variant/70 font-mono">
              {monthHeaders.map((header) => (
                <span
                  key={`${header.label}-${header.index}`}
                  className="absolute"
                  style={{ left: `${header.index * 13 + 32}px` }}
                >
                  {header.label}
                </span>
              ))}
            </div>

            {/* 2. Heatmap Grid with left daylabels */}
            <div className="flex gap-2.5">
              {/* Day of Week Labels Column */}
              <div className="flex flex-col justify-between text-[8px] font-bold text-on-surface-variant/60 font-mono h-[88px] pr-1 pt-1.5 shrink-0 w-6">
                <span>Sun</span>
                <span>Tue</span>
                <span>Thu</span>
                <span>Sat</span>
              </div>

              {/* Grid representation */}
              <div className="flex gap-[3px]">
                {heatmapWeeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[3px]">
                    {week.map((day) => {
                      // Determine cell color
                      let bgClass = 'bg-[#161b22]/50 hover:bg-[#30363d]';
                      let borderClass = 'border border-outline-variant/15';

                      if (day.pnl > 0) {
                        if (day.pnl < maxDayWin * 0.33) {
                          bgClass = 'bg-emerald-950/40 hover:bg-emerald-900/50';
                          borderClass = 'border border-emerald-900/40';
                        } else if (day.pnl < maxDayWin * 0.66) {
                          bgClass = 'bg-emerald-800/60 hover:bg-emerald-700/80';
                          borderClass = 'border border-emerald-500/30';
                        } else {
                          bgClass = 'bg-emerald-500 hover:bg-emerald-400';
                          borderClass = 'border border-emerald-400';
                        }
                      } else if (day.pnl < 0) {
                        const absLoss = Math.abs(day.pnl);
                        if (absLoss < maxDayLoss * 0.33) {
                          bgClass = 'bg-rose-950/40 hover:bg-rose-900/50';
                          borderClass = 'border border-rose-900/40';
                        } else if (absLoss < maxDayLoss * 0.66) {
                          bgClass = 'bg-rose-800/60 hover:bg-rose-700/80';
                          borderClass = 'border border-rose-500/30';
                        } else {
                          bgClass = 'bg-rose-500 hover:bg-rose-400';
                          borderClass = 'border border-rose-400';
                        }
                      }

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const parentRect = e.currentTarget.offsetParent?.getBoundingClientRect();
                            if (parentRect) {
                              setHeatmapTooltip({
                                date: day.date,
                                pnl: day.pnl,
                                x: rect.left - parentRect.left,
                                y: rect.top - parentRect.top,
                              });
                            }
                          }}
                          onMouseLeave={() => setHeatmapTooltip(null)}
                          className={`w-2.5 h-2.5 rounded-[2px] transition-all cursor-crosshair shrink-0 ${bgClass} ${borderClass}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Legend Frame */}
        <div className={`flex justify-between items-center text-[9px] font-mono text-on-surface-variant/70 border-t border-outline-variant/20 pt-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span>{isRtl ? 'آخرین به‌روزرسانی سیستم همگام' : 'Synchronized with live broker logs'}</span>
          <div className="flex items-center gap-1.5">
            <span>Loss</span>
            <div className="w-2.5 h-2.5 bg-rose-500 rounded-[2px]" />
            <div className="w-2.5 h-2.5 bg-rose-800/60 rounded-[2px]" />
            <div className="w-2.5 h-2.5 bg-[#161b22]/50 rounded-[2px]" />
            <div className="w-2.5 h-2.5 bg-emerald-950/40 rounded-[2px]" />
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-[2px]" />
            <span>Profit</span>
          </div>
        </div>
      </div>

      {/* Main Chart section with Curve Tabs */}
      <div className="bg-[#0D1117] border border-outline-variant p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 ${isRtl ? 'lg:flex-row-reverse' : ''}`}>
          <div className={isRtl ? 'text-right' : 'text-left'}>
            <div className="flex flex-wrap gap-2 mb-1.5">
              <button
                onClick={() => setChartTab('equity')}
                className={`px-3 py-1 text-xs font-black tracking-wider uppercase rounded-lg border transition-all cursor-pointer ${
                  chartTab === 'equity'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-[#161b22]/40 border-outline-variant/50 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {isRtl ? 'رشد سرمایه انباشته' : 'Equity Curve'}
              </button>
              <button
                onClick={() => setChartTab('drawdown')}
                className={`px-3 py-1 text-xs font-black tracking-wider uppercase rounded-lg border transition-all cursor-pointer ${
                  chartTab === 'drawdown'
                    ? 'bg-secondary/15 border-secondary text-secondary'
                    : 'bg-[#161b22]/40 border-outline-variant/50 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {isRtl ? 'نمودار افت سرمایه' : 'Underwater Drawdown'}
              </button>
              <button
                onClick={() => setChartTab('dailyBar')}
                className={`px-3 py-1 text-xs font-black tracking-wider uppercase rounded-lg border transition-all cursor-pointer ${
                  chartTab === 'dailyBar'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-[#161b22]/40 border-outline-variant/50 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {isRtl ? 'سود روزانه میله‌ای' : 'Daily PnL Bars'}
              </button>
            </div>
            <p className="text-xs text-on-surface-variant">
              {chartTab === 'equity' && (isRtl ? 'نمایش پیوسته رشد انباشته سود و زیان معاملات' : 'Continuous chronological growth trace of portfolio performance')}
              {chartTab === 'drawdown' && (isRtl ? 'بررسی ریسک و میزان افت سرمایه متوالی از قله قبلی' : 'Continuous diagnostic of peak-to-trough account drawdown metrics')}
              {chartTab === 'dailyBar' && (isRtl ? 'نمایش سود و زیان روزهای معاملاتی به صورت میله‌ای منفرد' : 'Daily net execution return bars centered on zero balance axis')}
            </p>
          </div>

          <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant">
            {(['1M', '3M', 'YTD'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-lg cursor-pointer transition-all ${
                  timeframe === tf
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart area */}
        <div className="h-72 w-full relative flex flex-col justify-end">
          
          {/* Custom Interactive Floating Tooltip */}
          {chartTooltip && (
            <div
              className="absolute z-20 pointer-events-none bg-surface-container border border-outline-variant/90 p-2.5 rounded-lg shadow-2xl text-[10px] font-mono leading-tight shrink-0 flex flex-col gap-0.5"
              style={{
                left: `${Math.min(800, chartTooltip.x + 15)}px`,
                top: `${Math.max(10, chartTooltip.y - 50)}px`,
              }}
            >
              <div className="text-on-surface-variant font-bold">{chartTooltip.date}</div>
              {chartTooltip.cumulative !== undefined && (
                <div>
                  <span className="text-on-surface-variant font-medium">Cumulative: </span>
                  <span className="font-extrabold text-on-surface">${chartTooltip.cumulative.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {chartTooltip.drawdown !== undefined && (
                <div>
                  <span className="text-on-surface-variant font-medium">Drawdown: </span>
                  <span className="font-extrabold text-secondary">{chartTooltip.drawdown.toFixed(2)}%</span>
                </div>
              )}
              <div>
                <span className="text-on-surface-variant font-medium">Trade Net: </span>
                <span className={`font-extrabold ${chartTooltip.pnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                  {formatCurrency(chartTooltip.pnl)}
                </span>
              </div>
            </div>
          )}

          {chronologicalClosedTrades.length >= 1 ? (
            <>
              <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="equityGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="drawdownGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.0" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <g className="stroke-outline-variant/15" strokeWidth="1" strokeDasharray="4 4">
                  <line x1="0" x2="1000" y1="40" y2="40" />
                  <line x1="0" x2="1000" y1="105" y2="105" />
                  <line x1="0" x2="1000" y1="170" y2="170" />
                  <line x1="0" x2="1000" y1="235" y2="235" />
                </g>

                {/* Render Selected Tab Chart */}
                {chartTab === 'equity' && chartParams.mapped && (
                  <>
                    <path d={chartParams.areaPath} fill="url(#equityGradient)" />
                    <path
                      d={chartParams.linePath}
                      fill="none"
                      stroke="#10b981"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                    />
                    {chartParams.mapped.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={chartTooltip?.date === pt.date ? '6' : '3.5'}
                        fill="#10b981"
                        stroke="#0B0E14"
                        strokeWidth="2"
                        className="transition-all cursor-crosshair"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const parentRect = e.currentTarget.offsetParent?.getBoundingClientRect();
                          if (parentRect) {
                            setChartTooltip({
                              date: pt.date,
                              pnl: pt.pnl,
                              cumulative: pt.cumulative,
                              x: rect.left - parentRect.left,
                              y: rect.top - parentRect.top,
                            });
                          }
                        }}
                        onMouseLeave={() => setChartTooltip(null)}
                      />
                    ))}
                  </>
                )}

                {chartTab === 'drawdown' && chartParams.mapped && (
                  <>
                    <path d={chartParams.areaPath} fill="url(#drawdownGradient)" />
                    <path
                      d={chartParams.linePath}
                      fill="none"
                      stroke="#ef4444"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                    {chartParams.mapped.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={chartTooltip?.date === pt.date ? '6' : '3.5'}
                        fill="#ef4444"
                        stroke="#0B0E14"
                        strokeWidth="2"
                        className="transition-all cursor-crosshair"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const parentRect = e.currentTarget.offsetParent?.getBoundingClientRect();
                          if (parentRect) {
                            setChartTooltip({
                              date: pt.date,
                              pnl: pt.pnl,
                              drawdown: pt.drawdownPct,
                              x: rect.left - parentRect.left,
                              y: rect.top - parentRect.top,
                            });
                          }
                        }}
                        onMouseLeave={() => setChartTooltip(null)}
                      />
                    ))}
                  </>
                )}

                {chartTab === 'dailyBar' && chartParams.mapped && (
                  <>
                    {/* Baseline axis */}
                    <line x1="0" x2="1000" y1="150" y2="150" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 2" />
                    
                    {chartParams.mapped.map((pt: any, i: number) => {
                      const isUp = pt.pnl >= 0;
                      return (
                        <rect
                          key={i}
                          x={pt.x - pt.barWidth / 2}
                          y={pt.y}
                          width={pt.barWidth}
                          height={pt.h}
                          fill={isUp ? '#10b981' : '#ef4444'}
                          opacity={chartTooltip?.date === pt.date ? '1.0' : '0.8'}
                          className="transition-all cursor-crosshair hover:opacity-100"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const parentRect = e.currentTarget.offsetParent?.getBoundingClientRect();
                            if (parentRect) {
                              setChartTooltip({
                                date: pt.date,
                                pnl: pt.pnl,
                                x: rect.left - parentRect.left,
                                y: rect.top - parentRect.top,
                              });
                            }
                          }}
                          onMouseLeave={() => setChartTooltip(null)}
                        />
                      );
                    })}
                  </>
                )}
              </svg>

              {/* Dynamic Axis Dates */}
              <div className={`flex justify-between text-[9px] text-on-surface-variant mt-2 font-mono ${isRtl ? 'flex-row-reverse' : ''}`}>
                <span>{chartTab === 'dailyBar' ? dailyPnLPoints[0]?.date : chronologicalClosedTrades[0]?.date}</span>
                <span>{isRtl ? 'تراز بازده محور زمانی' : 'Broker Sync Timeframe Axis'}</span>
                <span>{chartTab === 'dailyBar' ? dailyPnLPoints[dailyPnLPoints.length - 1]?.date : chronologicalClosedTrades[chronologicalClosedTrades.length - 1]?.date}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-on-surface-variant/40">
              <span className="material-symbols-outlined text-4xl mb-2">monitoring</span>
              <p className="text-xs">
                {isRtl ? 'پوزیشن‌های بسته شده بیشتری وارد کنید تا نمودار ترسیم شود.' : 'Add more closed trades to plot your active curves.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comparative Performance Bento Row (Long/Short, Best/Worst, Time Analysis) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: Long vs Short Breakdown */}
        <div className="bg-[#0D1117] border border-outline-variant p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className={`flex justify-between items-center mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5 justify-start">
                <span className="material-symbols-outlined text-primary text-lg">swap_calls</span>
                {isRtl ? 'مقایسه عملکرد خرید در برابر فروش' : 'Long vs. Short'}
              </h2>
            </div>

            <div className="space-y-5">
              {/* Longs Stats panel */}
              <div className="bg-[#161b22]/40 border border-outline-variant/60 p-3.5 rounded-xl space-y-2">
                <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">arrow_upward</span>
                    {isRtl ? 'موقعیت‌های خرید (Longs)' : 'Long trades'}
                  </span>
                  <span className="text-xs font-black font-mono text-on-surface">
                    {longShortStats.longWins}W - {longShortStats.longLosses}L
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-outline-variant/20">
                  <div>
                    <span className="text-[8px] text-on-surface-variant uppercase font-medium">{isRtl ? 'درصد برد خرید' : 'Win Rate'}</span>
                    <p className="text-sm font-black text-on-surface font-mono">{longShortStats.longWinRate.toFixed(1)}%</p>
                  </div>
                  <div className={isRtl ? 'text-left' : 'text-right'}>
                    <span className="text-[8px] text-on-surface-variant uppercase font-medium">{isRtl ? 'سود/زیان خرید' : 'Net Returns'}</span>
                    <p className={`text-sm font-black font-mono ${longShortStats.longPnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                      {formatCurrency(longShortStats.longPnl)}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-surface-container h-1 overflow-hidden rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${longShortStats.longWinRate}%` }} />
                </div>
              </div>

              {/* Shorts Stats panel */}
              <div className="bg-[#161b22]/40 border border-outline-variant/60 p-3.5 rounded-xl space-y-2">
                <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-bold text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">arrow_downward</span>
                    {isRtl ? 'موقعیت‌های فروش (Shorts)' : 'Short trades'}
                  </span>
                  <span className="text-xs font-black font-mono text-on-surface">
                    {longShortStats.shortWins}W - {longShortStats.shortLosses}L
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-outline-variant/20">
                  <div>
                    <span className="text-[8px] text-on-surface-variant uppercase font-medium">{isRtl ? 'درصد برد فروش' : 'Win Rate'}</span>
                    <p className="text-sm font-black text-on-surface font-mono">{longShortStats.shortWinRate.toFixed(1)}%</p>
                  </div>
                  <div className={isRtl ? 'text-left' : 'text-right'}>
                    <span className="text-[8px] text-on-surface-variant uppercase font-medium">{isRtl ? 'سود/زیان فروش' : 'Net Returns'}</span>
                    <p className={`text-sm font-black font-mono ${longShortStats.shortPnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                      {formatCurrency(longShortStats.shortPnl)}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-surface-container h-1 overflow-hidden rounded-full">
                  <div className="bg-secondary h-full rounded-full" style={{ width: `${longShortStats.shortWinRate}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-on-surface-variant mt-4 leading-normal italic text-center">
            {isRtl ? 'تعداد کل معاملات ثبت شده: ' : 'Distribution balance: '} 
            <span className="font-bold text-on-surface">{longShortStats.longTotal} Longs</span> vs <span className="font-bold text-on-surface">{longShortStats.shortTotal} Shorts</span>
          </div>
        </div>

        {/* Widget 2: Best & Worst Performers */}
        <div className="bg-[#0D1117] border border-outline-variant p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className={`flex justify-between items-center mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5 justify-start">
                <span className="material-symbols-outlined text-primary text-lg">insights</span>
                {isRtl ? 'بهترین و بدترین نمادها و استراتژی‌ها' : 'Best & Worst Performers'}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Best Performers */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl space-y-2.5">
                <div className={`flex items-center gap-1.5 text-xs font-black text-primary ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="material-symbols-outlined text-base">emoji_events</span>
                  <span>{isRtl ? 'برترین بازدهی‌ها (🏆)' : 'Top Outperformers'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-container/40 p-2 rounded-lg">
                    <span className="text-[8px] text-on-surface-variant uppercase font-medium">{isRtl ? 'نماد برتر' : 'Best Asset'}</span>
                    <p className="text-xs font-black text-on-surface font-mono truncate">{performers.bestAsset || 'N/A'}</p>
                    <span className="text-[9px] text-primary font-bold font-mono">
                      {performers.bestAssetPnl > 0 ? `+$${Math.round(performers.bestAssetPnl).toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div className="bg-surface-container/40 p-2 rounded-lg">
                    <span className="text-[8px] text-on-surface-variant uppercase font-medium">{isRtl ? 'استراتژی برتر' : 'Best Strategy'}</span>
                    <p className="text-xs font-black text-on-surface truncate">{performers.bestStrat || 'N/A'}</p>
                    <span className="text-[9px] text-primary font-bold font-mono">
                      {performers.bestStratPnl > 0 ? `+$${Math.round(performers.bestStratPnl).toLocaleString()}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Worst Performers */}
              <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-xl space-y-2.5">
                <div className={`flex items-center gap-1.5 text-xs font-black text-secondary ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="material-symbols-outlined text-base">gpp_maybe</span>
                  <span>{isRtl ? 'بیشترین آسیب به سبد (⚠️)' : 'Worst Performers'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-container/40 p-2 rounded-lg">
                    <span className="text-[8px] text-on-surface-variant uppercase font-medium">{isRtl ? 'نماد بازنده' : 'Worst Asset'}</span>
                    <p className="text-xs font-black text-on-surface font-mono truncate">{performers.worstAsset || 'N/A'}</p>
                    <span className="text-[9px] text-secondary font-bold font-mono">
                      {performers.worstAssetPnl < 0 ? `-$${Math.round(Math.abs(performers.worstAssetPnl)).toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div className="bg-surface-container/40 p-2 rounded-lg">
                    <span className="text-[8px] text-on-surface-variant uppercase font-medium">{isRtl ? 'استراتژی بازنده' : 'Worst Strategy'}</span>
                    <p className="text-xs font-black text-on-surface truncate">{performers.worstStrat || 'N/A'}</p>
                    <span className="text-[9px] text-secondary font-bold font-mono">
                      {performers.worstStratPnl < 0 ? `-$${Math.round(Math.abs(performers.worstStratPnl)).toLocaleString()}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[9px] text-on-surface-variant leading-relaxed text-center mt-4">
            {isRtl ? 'برای تغییر عادات، استراتژی‌های بازنده را بازبینی کنید.' : 'Review worst strategies periodically to optimize risk ratios.'}
          </div>
        </div>

        {/* Widget 3: Time of Day / Day of Week Analysis */}
        <div className="bg-[#0D1117] border border-outline-variant p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className={`flex justify-between items-center mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5 justify-start">
                <span className="material-symbols-outlined text-primary text-lg">alarm</span>
                {isRtl ? 'تحلیل زمانی و کارایی ترید' : 'Trading Efficiency'}
              </h2>
              
              <div className="flex bg-[#161b22] border border-outline-variant/40 rounded-lg p-0.5 text-[9px] font-bold">
                <button
                  onClick={() => setTimeAnalysisTab('dow')}
                  className={`px-2 py-1 rounded cursor-pointer ${timeAnalysisTab === 'dow' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {isRtl ? 'روز' : 'Day'}
                </button>
                <button
                  onClick={() => setTimeAnalysisTab('tod')}
                  className={`px-2 py-1 rounded cursor-pointer ${timeAnalysisTab === 'tod' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {isRtl ? 'ساعت' : 'Hour'}
                </button>
              </div>
            </div>

            {/* Render selected time statistics tab */}
            <div className="space-y-3 max-h-[190px] overflow-y-auto no-scrollbar pr-1">
              {timeAnalysisTab === 'dow' ? (
                timeStats.dayStats.length > 0 ? (
                  timeStats.dayStats.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className={`flex justify-between text-[10px] font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-on-surface">{item.name}</span>
                        <span className="text-on-surface-variant font-mono">{item.winRate}% Win Rate ({item.total} trades)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${item.winRate >= 50 ? 'bg-primary' : 'bg-secondary'}`}
                            style={{ width: `${item.winRate}%` }}
                          />
                        </div>
                        <span className={`text-[9px] font-bold font-mono w-12 text-right ${item.pnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                          {item.pnl >= 0 ? '+' : ''}{Math.round(item.pnl)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-on-surface-variant/40 italic">
                    {isRtl ? 'اطلاعاتی ثبت نشده است' : 'No time logs recorded'}
                  </div>
                )
              ) : (
                timeStats.hourStats.length > 0 ? (
                  timeStats.hourStats.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className={`flex justify-between text-[10px] font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-on-surface font-mono">{item.name}</span>
                        <span className="text-on-surface-variant font-mono">{item.winRate}% Win Rate ({item.total} trades)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${item.winRate >= 50 ? 'bg-primary' : 'bg-secondary'}`}
                            style={{ width: `${item.winRate}%` }}
                          />
                        </div>
                        <span className={`text-[9px] font-bold font-mono w-12 text-right ${item.pnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                          {item.pnl >= 0 ? '+' : ''}{Math.round(item.pnl)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-on-surface-variant/40 italic">
                    {isRtl ? 'اطلاعاتی ثبت نشده است' : 'No hour logs recorded'}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="text-[9px] text-on-surface-variant text-center mt-3 leading-normal font-mono">
            {isRtl ? 'بر اساس زمان اتمام و بسته‌شدن موقعیت‌ها' : 'Based on actual close times of records'}
          </div>
        </div>

      </div>

      {/* Secondary Charts Section (Strategy winrate, Asset distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss by Strategy */}
        <div className="bg-[#0D1117] border border-outline-variant p-6 rounded-2xl shadow-xl">
          <div className={`flex justify-between items-center mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">donut_large</span>
              {isRtl ? 'نسبت سود/زیان براساس استراتژی' : 'Win/Loss by Strategy'}
            </h2>
          </div>

          <div className="space-y-4">
            {strategyStats.slice(0, 4).map((strat) => {
              const winCount = strat.wins;
              const totalCount = strat.wins + strat.losses;
              const displayWinRate = totalCount > 0 ? strat.winRate : 50;

              return (
                <div key={strat.name} className="space-y-1.5">
                  <div className={`flex justify-between text-[11px] font-semibold text-on-surface ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="truncate max-w-[200px]">{strat.name}</span>
                    <span className="text-on-surface-variant font-mono">
                      {totalCount > 0 
                        ? (isRtl ? `${strat.winRate}% برد (${totalCount} معامله)` : `${strat.winRate}% Win Rate (${totalCount} trades)`) 
                        : (isRtl ? 'بدون معامله' : 'No Trades')}
                    </span>
                  </div>
                  <div className="flex h-5 rounded-lg overflow-hidden bg-surface-container border border-outline-variant/20">
                    <div
                      className="bg-primary hover:bg-primary transition-all duration-300 relative flex items-center pl-2 shrink-0 cursor-pointer"
                      style={{ width: `${displayWinRate}%` }}
                      title={`Wins: ${winCount}`}
                    >
                      {winCount > 0 && (
                        <span className="text-[9px] font-black text-on-primary">
                          {winCount}W
                        </span>
                      )}
                    </div>
                    <div
                      className="bg-[#3b1219] hover:bg-secondary transition-all duration-300 relative flex items-center justify-end pr-2 shrink-0 cursor-pointer"
                      style={{ width: `${100 - displayWinRate}%` }}
                      title={`Losses: ${strat.losses}`}
                    >
                      {strat.losses > 0 && (
                        <span className="text-[9px] font-black text-secondary">
                          {strat.losses}L
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-5 flex items-center gap-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-primary rounded-sm"></div>
              <span>{isRtl ? 'بردها' : 'Wins'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#3b1219] rounded-sm"></div>
              <span>{isRtl ? 'باخت‌ها' : 'Losses'}</span>
            </div>
          </div>
        </div>

        {/* Most Traded Pairs Distribution */}
        <div className="bg-[#0D1117] border border-outline-variant p-6 rounded-2xl shadow-xl">
          <div className={`flex justify-between items-center mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">{t.assetDistribution}</h2>
            <button
              onClick={() => setView('tradelog')}
              className="text-primary text-[10px] font-bold tracking-wider uppercase hover:underline transition-all cursor-pointer"
            >
              {isRtl ? 'خروجی گزارش' : 'Export Report'}
            </button>
          </div>

          <div className={`flex flex-col sm:flex-row items-center gap-8 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
            {/* SVG Donut Chart */}
            <div className="relative w-44 h-44 flex-shrink-0">
              <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#1e293b" strokeWidth="3" />
                {pairStats.map((pair, index) => {
                  let offset = 0;
                  for (let i = 0; i < index; i++) {
                    offset += pairStats[i].percentage;
                  }

                  const colors = ['#10b981', '#60a5fa', '#f43f5e', '#94a3b8'];
                  const currentColor = colors[index % colors.length];

                  return (
                    <circle
                      key={pair.symbol}
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="transparent"
                      stroke={currentColor}
                      strokeWidth="3.5"
                      strokeDasharray={`${pair.percentage} ${100 - pair.percentage}`}
                      strokeDashoffset={-offset}
                      className="transition-all duration-500"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-on-surface">{trades.length}</span>
                <span className="text-[9px] font-bold tracking-wider uppercase text-on-surface-variant">
                  {isRtl ? 'کل معاملات' : 'Total Entries'}
                </span>
              </div>
            </div>

            {/* Legend info */}
            <div className="flex-1 w-full space-y-3">
              {pairStats.map((pair, idx) => {
                const colors = ['bg-primary', 'bg-[#60a5fa]', 'bg-secondary', 'bg-on-surface-variant'];
                const colorClass = colors[idx % colors.length];

                return (
                  <div key={pair.symbol} className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-2.5 h-2.5 ${colorClass} rounded-full`}></div>
                      <span className="text-xs font-semibold text-on-surface">{pair.symbol}</span>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-on-surface-variant">
                      {pair.percentage}% ({pair.trades})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent High-Impact Trades Bento Section & Capital Flow Manager */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#0D1117] border border-outline-variant rounded-2xl overflow-hidden shadow-xl">
          <div className={`p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container ${isRtl ? 'flex-row-reverse' : ''}`}>
            <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">military_tech</span>
              {isRtl ? 'آخرین معاملات حائز اهمیت بالا' : 'Recent High-Value Trades'}
            </h3>
            <span
              onClick={() => setView('tradelog')}
              className="text-primary text-[10px] font-bold tracking-wider uppercase cursor-pointer hover:underline"
            >
              {isRtl ? 'مشاهده همه' : 'View All'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full border-collapse ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant bg-surface-container-low border-b border-outline-variant/40">
                  <th className="px-4 py-3">{t.symbol}</th>
                  <th className="px-4 py-3">{t.strategy}</th>
                  <th className="px-4 py-3">{t.status}</th>
                  <th className={`px-4 py-3 ${isRtl ? 'text-left' : 'text-right'}`}>{t.netPnL}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {highValueTrades.length > 0 ? (
                  highValueTrades.map((trade) => (
                    <tr
                      key={trade.id}
                      onClick={() => onSelectTrade(trade)}
                      className="hover:bg-[#161b22]/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3 text-xs font-bold font-mono text-on-surface">
                        <div className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <span>{trade.symbol}</span>
                          <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${
                            trade.direction === 'Long'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-secondary/10 text-secondary border border-secondary/20'
                          }`}>
                            {trade.direction === 'Long' ? t.long : t.short}
                          </span>
                          {trade.tradingViewUrl && (
                            <a
                              href={trade.tradingViewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#2962FF] hover:text-[#1a50db] transition-colors flex items-center ml-0.5 animate-pulse"
                              title="Open TradingView Chart"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="material-symbols-outlined text-xs">link</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {trade.strategy}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-1.5 py-0.5 text-[8px] rounded uppercase font-bold tracking-widest ${
                            trade.status === 'Win'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-secondary/10 text-secondary border border-secondary/20'
                          }`}
                        >
                          {trade.status === 'Win' ? t.win : (trade.status === 'Loss' ? t.loss : t.open)}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-xs font-bold font-mono ${isRtl ? 'text-left' : 'text-right'} ${
                          trade.pnl >= 0 ? 'text-primary' : 'text-secondary'
                        }`}
                      >
                        {formatCurrency(trade.pnl)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-on-surface-variant/40">
                      {t.noData}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Capital Flow Manager Panel */}
        <div className="bg-[#0D1117] border border-outline-variant p-4.5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
          <div className={isRtl ? 'text-right' : 'text-left'}>
            <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3 flex items-center gap-1.5 justify-start">
              <span className="material-symbols-outlined text-[14px] text-primary">swap_vertical_circle</span>
              {isRtl ? 'جریان سرمایه و تراز حساب' : 'Capital Flow Ledger'}
            </h3>
            
            {/* Capital flow stats */}
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="bg-[#161b22]/40 p-2 border border-outline-variant/50 rounded-lg">
                <span className="text-[8px] text-on-surface-variant uppercase font-bold tracking-wider">{isRtl ? 'خالص واریزی' : 'Net Flow'}</span>
                <p className={`text-xs font-mono font-bold mt-0.5 ${netCapitalFlows >= 0 ? 'text-primary' : 'text-secondary'}`}>
                  {netCapitalFlows >= 0 ? '+' : ''}${netCapitalFlows.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-[#161b22]/40 p-2 border border-outline-variant/50 rounded-lg">
                <span className="text-[8px] text-on-surface-variant uppercase font-bold tracking-wider">{isRtl ? 'تعداد تراکنش‌ها' : 'Transactions'}</span>
                <p className="text-xs font-mono font-bold text-on-surface mt-0.5">{capitalFlows.length}</p>
              </div>
            </div>

            {/* Form for new deposit / withdrawal */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">{isRtl ? 'مبلغ ($)' : 'Amount ($)'}</label>
                  <input
                    type="number"
                    value={flowAmount}
                    onChange={(e) => setFlowAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="500"
                    className={`bg-[#161b22]/80 border border-outline-variant rounded-lg py-1 px-2 text-xs text-on-surface w-full focus:outline-none focus:ring-1 focus:ring-primary/25 ${isRtl ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">{isRtl ? 'تاریخ' : 'Date'}</label>
                  <input
                    type="date"
                    value={flowDate}
                    onChange={(e) => setFlowDate(e.target.value)}
                    className="bg-[#161b22]/80 border border-outline-variant rounded-lg py-1 px-2 text-xs text-on-surface w-full focus:outline-none focus:ring-1 focus:ring-primary/25 font-mono text-[10px]"
                  />
                </div>
              </div>

              {/* Note field */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-on-surface-variant uppercase">{isRtl ? 'یادداشت (اختیاری)' : 'Note (Optional)'}</label>
                <input
                  type="text"
                  value={flowNote}
                  onChange={(e) => setFlowNote(e.target.value)}
                  placeholder={isRtl ? 'افزایش موجودی، پاداش صرافی...' : 'e.g. Deposit bonus, profit top-up'}
                  className={`bg-[#161b22]/80 border border-outline-variant rounded-lg py-1.5 px-2 text-xs text-on-surface w-full focus:outline-none focus:ring-1 focus:ring-primary/25 ${isRtl ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddFlow('Deposit')}
                  className="py-1.5 bg-primary/10 hover:bg-primary hover:text-on-primary border border-primary/20 text-primary rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">south</span>
                  {isRtl ? 'واریز' : 'Deposit'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFlow('Withdrawal')}
                  className="py-1.5 bg-secondary/10 hover:bg-secondary hover:text-on-secondary border border-secondary/20 text-secondary rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">north</span>
                  {isRtl ? 'برداشت' : 'Withdrawal'}
                </button>
              </div>
            </div>

            {/* Transaction History Dense Ledger Table */}
            <div className="mt-4 pt-4 border-t border-outline-variant/35">
              <div className={`flex justify-between items-center mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                  {isRtl ? 'تاریخچه تراکنش‌ها' : 'Ledger History'}
                </span>
                <input
                  type="text"
                  value={flowSearchQuery}
                  onChange={(e) => setFlowSearchQuery(e.target.value)}
                  placeholder={isRtl ? 'جستجو...' : 'Search...'}
                  className="bg-[#161b22] border border-outline-variant rounded px-1.5 py-0.5 text-[9px] text-on-surface w-20 focus:outline-none focus:ring-1 focus:ring-primary/25 font-semibold"
                />
              </div>

              <div className="max-h-[160px] overflow-y-auto border border-outline-variant/30 rounded-lg bg-surface-container-lowest/20">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-surface-container text-on-surface-variant uppercase font-bold tracking-wider text-[8px] border-b border-outline-variant/30">
                      <th className="p-1.5 text-center w-8">Type</th>
                      <th className="p-1.5 text-right">Amount</th>
                      <th className="p-1.5 text-left">Note</th>
                      <th className="p-1.5 text-center w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFlows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center italic text-on-surface-variant/50 text-[9px]">
                          {isRtl ? 'تراکنشی یافت نشد' : 'No transactions'}
                        </td>
                      </tr>
                    ) : (
                      [...filteredFlows].reverse().map((flow) => {
                        const isDep = flow.type === 'Deposit';
                        return (
                          <tr key={flow.id} className="border-b border-outline-variant/15 hover:bg-[#161b22]/40 transition-colors">
                            <td className="p-1.5 text-center">
                              <span className={`inline-flex items-center justify-center rounded px-1 py-0.5 text-[8px] font-bold ${
                                isDep ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                              }`}>
                                {isDep ? 'DEP' : 'WTD'}
                              </span>
                            </td>
                            <td className="p-1.5 text-right font-mono font-bold text-on-surface">
                              ${flow.amount.toLocaleString('en-US')}
                            </td>
                            <td className="p-1.5 text-left text-on-surface-variant leading-tight max-w-[80px] truncate" title={flow.note || flow.date}>
                              <div className="font-semibold truncate">{flow.note || '-'}</div>
                              <div className="text-[8px] opacity-60 font-mono">{flow.date}</div>
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => onDeleteCapitalFlow?.(flow.id)}
                                className="text-on-surface-variant hover:text-secondary p-0.5 rounded transition-colors cursor-pointer"
                                title={isRtl ? 'حذف' : 'Delete'}
                              >
                                <span className="material-symbols-outlined text-[11px] font-semibold">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
