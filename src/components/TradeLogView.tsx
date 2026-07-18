/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Trade, MarketType, StatusType, DirectionType, MarketMoodType } from '../types';
import { calculateDashboardMetrics, calculateTradePnlAndRoi } from '../utils/calculations';
import EditTradeModal from './EditTradeModal';

interface TradeLogViewProps {
  trades: Trade[];
  onDeleteTrade: (id: string) => void;
  onUpdateTrade: (trade: Trade) => void;
  onSelectTrade: (trade: Trade) => void;
  globalSearchQuery: string;
  lang?: 'en' | 'fa';
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

export default function TradeLogView({
  trades,
  onDeleteTrade,
  onUpdateTrade,
  onSelectTrade,
  globalSearchQuery,
  lang,
}: TradeLogViewProps) {
  const [marketFilter, setMarketFilter] = useState<string>('All Markets');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [strategyFilter, setStrategyFilter] = useState<string>('All Strategies');
  const [localSearch, setLocalSearch] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  // Selected trade detail modal
  const [activeDetailTrade, setActiveDetailTrade] = useState<Trade | null>(null);

  // Editing trade modal state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Dynamic lists of unique strategies available for filtering
  const availableStrategies = useMemo(() => {
    const strats = trades.map((t) => t.strategy).filter(Boolean);
    return ['All Strategies', ...Array.from(new Set(strats))];
  }, [trades]);

  // Combine global header search and local filters
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      // Market filter
      if (marketFilter !== 'All Markets' && trade.market !== marketFilter) return false;
      
      // Status filter
      if (statusFilter !== 'All Statuses' && trade.status !== statusFilter) return false;
      
      // Strategy filter
      if (strategyFilter !== 'All Strategies' && trade.strategy !== strategyFilter) return false;

      // Search query (symbol, strategy, notes)
      const query = (globalSearchQuery || localSearch).toLowerCase().trim();
      if (query) {
        const matchSymbol = trade.symbol.toLowerCase().includes(query);
        const matchStrategy = trade.strategy.toLowerCase().includes(query);
        const matchNotes = trade.notes.toLowerCase().includes(query);
        const matchMarket = trade.market.toLowerCase().includes(query);
        if (!matchSymbol && !matchStrategy && !matchNotes && !matchMarket) {
          return false;
        }
      }

      return true;
    });
  }, [trades, marketFilter, statusFilter, strategyFilter, globalSearchQuery, localSearch]);

  // Paginated chunk
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrades, currentPage]);

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage) || 1;

  // Format currency
  const formatCurrency = (val: number) => {
    const sign = val >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Automated CSV Export handler (Requirement #4)
  const handleExportCSV = () => {
    if (filteredTrades.length === 0) {
      alert('No trades available to export based on current filters.');
      return;
    }

    // Build headers
    const headers = [
      'Trade ID',
      'Date',
      'Symbol',
      'Market',
      'Direction',
      'Status',
      'Entry Price',
      'Exit Price',
      'Quantity',
      'Leverage',
      'Stop Loss',
      'Take Profit',
      'Fees',
      'PnL ($)',
      'ROI (%)',
      'Strategy',
      'Confluences',
      'Market Mood',
      'Emotional State',
      'Notes',
    ];

    // Build rows
    const rows = filteredTrades.map((t) => [
      t.id,
      t.date,
      t.symbol,
      t.market,
      t.direction,
      t.status,
      t.entryPrice,
      t.exitPrice || '',
      t.quantity,
      t.leverage,
      t.stopLoss || '',
      t.takeProfit || '',
      t.fees,
      t.pnl.toFixed(2),
      t.roi.toFixed(2),
      t.strategy,
      `"${t.confluences.join(', ')}"`,
      t.marketMood,
      t.emotionalState,
      `"${t.notes.replace(/"/g, '""')}"`, // escape quotes in CSV
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create browser-based download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Precision_Ledger_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derive dynamic Monthly/Filter Summary card metrics
  const monthlyMetrics = useMemo(() => {
    return calculateDashboardMetrics(filteredTrades);
  }, [filteredTrades]);

  // Asset icons mapping helper
  const getAssetIcon = (symbol: string) => {
    const sym = symbol.toUpperCase();
    if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL') || sym.includes('USDT')) {
      return { icon: 'currency_bitcoin', color: 'text-primary bg-primary/10' };
    }
    if (sym.includes('EUR') || sym.includes('USD') || sym.includes('GBP') || sym.includes('JPY')) {
      return { icon: 'euro', color: 'text-tertiary bg-tertiary/10' };
    }
    if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('SILVER')) {
      return { icon: 'monetization_on', color: 'text-amber-400 bg-amber-400/10' };
    }
    return { icon: 'bar_chart', color: 'text-secondary bg-secondary/10' };
  };

  return (
    <div className="space-y-6">
      {/* Filter & Action Bar */}
      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Market selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">Market:</span>
            <select
              value={marketFilter}
              onChange={(e) => {
                setMarketFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-[10px] font-bold tracking-wider uppercase text-on-surface focus:border-primary focus:ring-0 cursor-pointer"
            >
              <option>All Markets</option>
              <option>Crypto</option>
              <option>Forex</option>
              <option>Stocks</option>
              <option>Commodities</option>
            </select>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-[10px] font-bold tracking-wider uppercase text-on-surface focus:border-primary focus:ring-0 cursor-pointer"
            >
              <option>All Statuses</option>
              <option>Win</option>
              <option>Loss</option>
              <option>Open</option>
            </select>
          </div>

          {/* Strategy selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">Strategy:</span>
            <select
              value={strategyFilter}
              onChange={(e) => {
                setStrategyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-[10px] font-bold tracking-wider uppercase text-on-surface focus:border-primary focus:ring-0 cursor-pointer"
            >
              {availableStrategies.map((strat) => (
                <option key={strat} value={strat}>
                  {strat}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Local Search Input if global header is empty */}
          {!globalSearchQuery && (
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded px-3 py-1">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant mr-2">search</span>
              <input
                type="text"
                placeholder="Search ledger..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs text-on-surface focus:outline-none p-0.5 placeholder:text-on-surface-variant/40"
              />
            </div>
          )}
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCSV}
          className="bg-primary hover:bg-primary-container text-on-primary-container font-bold text-[10px] tracking-widest uppercase px-4 py-2.5 rounded-lg flex items-center transition-all active:scale-95 cursor-pointer shadow-md shadow-primary/10"
        >
          <span className="material-symbols-outlined mr-2 text-base">download</span>
          Export to CSV
        </button>
      </div>

      {/* Trade Log Table */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant">
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">Symbol</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant text-center">Direction</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant text-right">ROI %</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant text-right">PnL</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">Strategy</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {paginatedTrades.length > 0 ? (
                paginatedTrades.map((trade) => {
                  const assetDetails = getAssetIcon(trade.symbol);
                  return (
                    <tr key={trade.id} className="table-row-hover transition-colors group">
                      {/* Date */}
                      <td className="px-6 py-4 text-xs font-semibold text-on-surface whitespace-nowrap">
                        <div>
                          {parseLocalDate(trade.date).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-on-surface-variant/70 font-mono mt-0.5">
                          {parseLocalDate(trade.date).toLocaleTimeString(lang === 'fa' ? 'fa-IR' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </div>
                      </td>

                      {/* Symbol */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${assetDetails.color}`}>
                            <span className="material-symbols-outlined text-sm">{assetDetails.icon}</span>
                          </span>
                          <span className="text-xs font-bold font-mono text-on-surface">{trade.symbol}</span>
                          {trade.tradingViewUrl && (
                            <a
                              href={trade.tradingViewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#2962FF] hover:text-[#1a50db] transition-colors flex items-center ml-1"
                              title="Open TradingView Chart"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="material-symbols-outlined text-base">link</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            trade.direction === 'Long'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-secondary/10 text-secondary border-secondary/20'
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            trade.status === 'Win'
                              ? 'bg-primary-container text-on-primary-container'
                              : trade.status === 'Loss'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-surface-container-highest text-on-surface border border-outline-variant/40'
                          }`}
                        >
                          {trade.status}
                        </span>
                      </td>

                      {/* ROI % */}
                      <td
                        className={`px-6 py-4 text-right text-xs font-bold font-mono ${
                          trade.status === 'Open'
                            ? 'text-on-surface-variant'
                            : trade.roi >= 0
                            ? 'text-primary'
                            : 'text-secondary'
                        }`}
                      >
                        {trade.status === 'Open' ? '--' : `${trade.roi >= 0 ? '+' : ''}${trade.roi.toFixed(2)}%`}
                      </td>

                      {/* PnL */}
                      <td
                        className={`px-6 py-4 text-right text-xs font-bold font-mono ${
                          trade.status === 'Open'
                            ? 'text-on-surface-variant'
                            : trade.pnl >= 0
                            ? 'text-primary'
                            : 'text-secondary'
                        }`}
                      >
                        {trade.status === 'Open' ? '--' : formatCurrency(trade.pnl)}
                      </td>

                      {/* Strategy */}
                      <td className="px-6 py-4 text-xs font-semibold text-on-surface-variant">
                        {trade.strategy || 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {trade.status === 'Open' ? (
                          <button
                            onClick={() => setEditingTrade(trade)}
                            className="bg-primary/15 hover:bg-primary text-primary hover:text-on-primary border border-primary/30 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1 cursor-pointer"
                            title={lang === 'fa' ? 'بستن و ثبت خروجی این پوزیشن' : 'Close and resolve this position'}
                          >
                            <span className="material-symbols-outlined text-[13px]">gavel</span>
                            <span>{lang === 'fa' ? 'بستن پوزیشن' : 'Close Position'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingTrade(trade)}
                            className="bg-surface-container-highest hover:bg-primary hover:text-on-primary p-2 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                            title={lang === 'fa' ? 'ویرایش معامله' : 'Edit Trade'}
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => setActiveDetailTrade(trade)}
                          className="bg-surface-container-highest hover:bg-primary hover:text-on-primary p-2 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="View Reflection Notes & Details"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(lang === 'fa' ? `آیا از حذف معامله ${trade.symbol} اطمینان دارید؟` : `Are you sure you want to delete the trade for ${trade.symbol}?`)) {
                              onDeleteTrade(trade.id);
                            }
                          }}
                          className="bg-surface-container-highest hover:bg-secondary hover:text-on-secondary p-2 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="Delete Entry"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-on-surface-variant/40">
                    No matching trades logged based on active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="bg-surface-container-high px-6 py-4 border-t border-outline-variant flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
            Showing {filteredTrades.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredTrades.length)} of {filteredTrades.length} trades
          </span>
          
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`p-1.5 rounded border border-outline-variant/50 text-on-surface-variant hover:text-primary transition-colors cursor-pointer ${
                currentPage === 1 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/15'
                        : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-primary'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1.5 rounded border border-outline-variant/50 text-on-surface-variant hover:text-primary transition-colors cursor-pointer ${
                currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : ''
              }`}
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Summary Cards with Log Trends Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Trends Visual (Wins & Losses chart) */}
        <div className="lg:col-span-2 bg-surface-container-low p-6 rounded-xl border border-outline-variant">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold tracking-wider text-on-surface uppercase">Log Trends (Outcome History)</h3>
            <span className="text-primary text-[10px] font-bold tracking-wider uppercase flex items-center">
              <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
              Last {Math.min(10, filteredTrades.length)} trades sorted chronologically
            </span>
          </div>
          
          <div className="h-44 w-full flex items-end gap-3 px-2 pt-4">
            {filteredTrades.slice(-12).map((trade, idx) => {
              const isWin = trade.status === 'Win';
              const isOpen = trade.status === 'Open';
              
              // Scale height relative to absolute PnL value in the filtered dataset
              const maxVal = Math.max(...filteredTrades.map((t) => Math.abs(t.pnl)), 100);
              const heightPercent = isOpen ? '10%' : `${Math.max(15, (Math.abs(trade.pnl) / maxVal) * 100)}%`;

              return (
                <div
                  key={trade.id}
                  className={`flex-1 rounded-t transition-all duration-300 relative group cursor-pointer ${
                    isOpen
                      ? 'bg-surface-container-highest hover:bg-on-surface-variant'
                      : isWin
                      ? 'bg-primary/20 hover:bg-primary shadow-inner'
                      : 'bg-secondary/20 hover:bg-secondary shadow-inner'
                  }`}
                  style={{ height: heightPercent }}
                  onClick={() => setActiveDetailTrade(trade)}
                >
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-container-lowest border border-outline-variant p-2 rounded text-[9px] font-mono leading-normal shadow-2xl z-50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    <p className="font-bold text-on-surface">{trade.symbol}</p>
                    <p className={isWin ? 'text-primary' : isOpen ? 'text-on-surface-variant' : 'text-secondary'}>
                      {isOpen ? 'Open Position' : formatCurrency(trade.pnl)}
                    </p>
                    <p className="text-[8px] text-on-surface-variant">{trade.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Summary card */}
        <div className="bg-surface-container-high p-6 rounded-xl border border-primary/30 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold tracking-widest text-on-surface mb-6 uppercase">Filtered View Performance</h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-wider uppercase">Win Rate</span>
                <span className="text-primary font-black text-2xl">{monthlyMetrics.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-wider uppercase">Profit Factor</span>
                <span className="text-on-surface font-black text-base">
                  {monthlyMetrics.profitFactor === 99.9 ? '99.9+' : monthlyMetrics.profitFactor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-wider uppercase">Net PnL</span>
                <span className={`font-black text-base ${monthlyMetrics.netPnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                  {formatCurrency(monthlyMetrics.netPnl)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setMarketFilter('All Markets');
              setStatusFilter('All Statuses');
              setStrategyFilter('All Strategies');
              setLocalSearch('');
            }}
            className="mt-6 w-full bg-surface-container-lowest border border-outline hover:border-primary text-on-surface font-bold text-[10px] tracking-wider uppercase py-3 rounded-lg transition-all active:scale-95 cursor-pointer text-center"
          >
            Reset Active Filters
          </button>
        </div>
      </div>

      {/* Detailed Trade Reflection Modal / Overlay */}
      {activeDetailTrade && (
        <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container border border-outline-variant max-w-2xl w-full rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-surface-container-high border-b border-outline-variant flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black text-on-surface tracking-wide uppercase">
                  Reflection Detail: {activeDetailTrade.symbol}
                </h4>
                <p className="text-[10px] text-on-surface-variant mt-0.5 flex flex-wrap gap-1.5">
                  <span>
                    {lang === 'fa' ? 'باز شده در: ' : 'Opened: '}
                    <span className="font-semibold text-on-surface">
                      {parseLocalDate(activeDetailTrade.date).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </span>
                  {activeDetailTrade.closeTime && (
                    <span>
                      {lang === 'fa' ? ' • بسته شده در: ' : ' • Closed: '}
                      <span className="font-semibold text-on-surface">
                        {parseLocalDate(activeDetailTrade.closeTime).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </span>
                  )}
                  <span>
                    • {lang === 'fa' ? 'بازار: ' : 'Market: '}
                    <span className="font-semibold text-on-surface">{activeDetailTrade.market}</span>
                  </span>
                </p>
              </div>
              <button
                onClick={() => setActiveDetailTrade(null)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-highest cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-xs">
              {/* Financial Summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-surface-container-low border border-outline-variant rounded-lg">
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase font-bold">Direction</p>
                  <p className={`font-bold mt-1 ${activeDetailTrade.direction === 'Long' ? 'text-primary' : 'text-secondary'}`}>
                    {activeDetailTrade.direction.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase font-bold">Entry Price</p>
                  <p className="font-bold text-on-surface mt-1">${activeDetailTrade.entryPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase font-bold">Exit Price</p>
                  <p className="font-bold text-on-surface mt-1">
                    {activeDetailTrade.status === 'Open' ? 'Active Trade' : `$${activeDetailTrade.exitPrice.toLocaleString()}`}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase font-bold">PnL ($)</p>
                  <p className={`font-black mt-1 ${activeDetailTrade.pnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                    {activeDetailTrade.status === 'Open' ? 'Open Position' : formatCurrency(activeDetailTrade.pnl)}
                  </p>
                </div>
              </div>

              {/* Confluences and Mood row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px] mb-2">
                    Confluences & Strategy
                  </h5>
                  <p className="font-bold text-on-surface text-sm mb-1">
                    {activeDetailTrade.strategy}
                    {activeDetailTrade.timeframe && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] text-primary font-mono">
                        {activeDetailTrade.timeframe}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {activeDetailTrade.confluences.map((conf) => (
                      <span
                        key={conf}
                        className="bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded text-[8px] font-bold"
                      >
                        {conf}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div>
                    <h5 className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px] mb-2">
                      Market Mood
                    </h5>
                    <span className="px-2.5 py-1 bg-surface-container-highest text-on-surface border border-outline-variant rounded text-[10px] font-bold">
                      {activeDetailTrade.marketMood}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px] mb-2">
                      Mindset State
                    </h5>
                    <span className="text-2xl" title="Trader Emotional Reflection emoji">
                      {activeDetailTrade.emotionalState}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reflection Notes */}
              <div className="space-y-1.5 pt-2 border-t border-outline-variant/30">
                <h5 className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px]">
                  Post-Trade Analysis & Reflection Notes
                </h5>
                <p className="text-on-surface bg-surface-container-low p-3 rounded border border-outline-variant/30 leading-relaxed italic whitespace-pre-wrap">
                  {activeDetailTrade.notes || 'No reflection notes recorded for this trade.'}
                </p>
              </div>

              {/* Screenshots section */}
              {activeDetailTrade.screenshots && activeDetailTrade.screenshots.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-outline-variant/30">
                  <h5 className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px] mb-2">
                    Visual Evidence / Chart Screenshots
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    {activeDetailTrade.screenshots.map((img, idx) => (
                      <div key={idx} className="aspect-video bg-surface-dim border border-outline-variant rounded overflow-hidden">
                        <img
                          src={img}
                          alt="Trade Screenshot Visual Evidence"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TradingView URL section */}
              {activeDetailTrade.tradingViewUrl && (
                <div className="space-y-1.5 pt-2 border-t border-outline-variant/30">
                  <h5 className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px] mb-2">
                    TradingView Link
                  </h5>
                  <div className="bg-surface-container-low border border-outline-variant/60 rounded-lg p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#2962FF]/10 text-[#2962FF] flex items-center justify-center font-black text-[10px] shrink-0 select-none">
                        TV
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-on-surface truncate">
                          {activeDetailTrade.tradingViewUrl}
                        </p>
                        <p className="text-[8px] text-on-surface-variant uppercase font-semibold mt-0.5">
                          External Chart Analysis
                        </p>
                      </div>
                    </div>
                    <a
                      href={activeDetailTrade.tradingViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#2962FF] hover:bg-[#1a50db] text-white text-[9px] font-black tracking-wider uppercase rounded-md flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined !text-[11px]">open_in_new</span>
                      Open Chart
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-container-high border-t border-outline-variant flex justify-end">
              <button
                onClick={() => setActiveDetailTrade(null)}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-[10px] tracking-widest uppercase rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Close Position Modal */}
      {editingTrade && (
        <EditTradeModal
          trade={editingTrade}
          lang={lang}
          onClose={() => setEditingTrade(null)}
          onSave={(updatedTrade) => {
            onUpdateTrade(updatedTrade);
            setEditingTrade(null);
          }}
        />
      )}
    </div>
  );
}
