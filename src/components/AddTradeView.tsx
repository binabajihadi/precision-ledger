/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, DollarSign, Percent, Shield, ArrowRight, Save, X, Calendar, 
  Plus, Trash2, Tag, Layers, Smile, Image, AlertTriangle, Check, RefreshCw, BarChart2, 
  CheckCircle2, Sliders, Briefcase, Zap, Info, ChevronRight, Activity, Upload, Paperclip, 
  Sparkles, BookOpen, Clock, Heart, Trash, Link, HelpCircle, Edit3
} from 'lucide-react';
import { Trade, MarketType, DirectionType, MarketMoodType, StatusType, DynamicConfig, CommissionTemplate } from '../types';

declare const chrome: any;

interface AddTradeViewProps {
  onSaveTrade: (trade: Trade) => void;
  setView: (view: 'dashboard' | 'tradelog' | 'addtrade' | 'settings') => void;
  lang?: 'en' | 'fa';
  presetValues?: any;
  onClearPreset?: () => void;
  config: DynamicConfig;
  onOpenConfigModal?: () => void;
  commissionTemplates?: CommissionTemplate[];
  initialCapital?: number;
}

interface FundingFeeRecord {
  id: string;
  timestamp: string;
  ratePct: number;
  amount: number; // Positive (received) or negative (paid/deducted)
  positionSize: number;
}

export default function AddTradeView({
  onSaveTrade,
  setView,
  lang = 'en',
  presetValues,
  onClearPreset,
  config,
  onOpenConfigModal,
  commissionTemplates = [],
  initialCapital = 10000,
}: AddTradeViewProps) {
  const isRtl = lang === 'fa';

  // State parameters for Closed Trade Lifecycle
  const [symbol, setSymbol] = useState(presetValues?.entryPrice ? 'BTCUSDT' : '');
  const [market, setMarket] = useState<MarketType>('Crypto');
  const [direction, setDirection] = useState<DirectionType>('Long');
  const [executionType, setExecutionType] = useState<'Market' | 'Limit' | 'Stop'>('Limit');
  const [leverage, setLeverage] = useState<number>(10);
  const [exchange, setExchange] = useState(() => config.exchanges[0] || 'Binance');
  const [timeframe, setTimeframe] = useState<string>(() => config.timeframes[0] || '15M');
  const [strategy, setStrategy] = useState<string>(() => config.strategies[0] || 'Price Action Breakout');

  // Order Trade ID for Exchange authenticity
  const [tradeId] = useState(() => Math.floor(1000000000000000000 + Math.random() * 900000000000000000).toString());

  // Helper for dates in local timezone input format
  const getFormattedNowWithOffset = (offsetMinutes = 0) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - offsetMinutes);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [openTime, setOpenTime] = useState(() => getFormattedNowWithOffset(60)); // 1 hour ago
  const [closeTime, setCloseTime] = useState(() => getFormattedNowWithOffset(0));

  // Core prices & quantity
  const [entryPrice, setEntryPrice] = useState<number | ''>('');
  const [exitPrice, setExitPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [stopLoss, setStopLoss] = useState<number | ''>('');
  const [takeProfit, setTakeProfit] = useState<number | ''>('');

  // Fees details
  const [openTradingFee, setOpenTradingFee] = useState<number>(0);
  const [closeTradingFee, setCloseTradingFee] = useState<number>(0);

  // Dynamic list of funding fee instances (Bybit/Binance historical intervals)
  const [fundingFees, setFundingFees] = useState<FundingFeeRecord[]>([]);

  // UI inputs to add a new funding fee
  const [newFundingTime, setNewFundingTime] = useState(() => getFormattedNowWithOffset(30).slice(0, 16));
  const [newFundingRate, setNewFundingRate] = useState<string>('-0.005');
  const [newFundingAmount, setNewFundingAmount] = useState<string>('0');

  // Post trade psychology and journaling
  const [notes, setNotes] = useState('');
  const [marketMood, setMarketMood] = useState<MarketMoodType>('Neutral');
  const [preTradeEmotion, setPreTradeEmotion] = useState('🧠');
  const [postTradeEmotion, setPostTradeEmotion] = useState('🤑');
  const [tradingViewUrl, setTradingViewUrl] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [newScreenshotUrl, setNewScreenshotUrl] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Function to reset all inputs to clean defaults
  const handleResetForm = () => {
    setSymbol('');
    setMarket('Crypto');
    setDirection('Long');
    setExecutionType('Limit');
    setLeverage(10);
    setEntryPrice('');
    setExitPrice('');
    setQuantity('');
    setStopLoss('');
    setTakeProfit('');
    setOpenTradingFee(0);
    setCloseTradingFee(0);
    setFundingFees([]);
    setNotes('');
    setMarketMood('Neutral');
    setPreTradeEmotion('🧠');
    setPostTradeEmotion('🧠');
    setTradingViewUrl('');
    setScreenshots([]);
    setTimelineEvents([]);
    setStrategy(config.strategies[0] || 'Price Action Breakout');
    setTimeframe(config.timeframes[0] || '15M');
  };

  // Auto populate if preset values passed
  useEffect(() => {
    if (presetValues) {
      if (presetValues.entryPrice) setEntryPrice(presetValues.entryPrice);
      if (presetValues.stopLoss) setStopLoss(presetValues.stopLoss);
      if (presetValues.leverage) setLeverage(presetValues.leverage);
      if (presetValues.quantity) setQuantity(presetValues.quantity);
      
      // If it contains symbol/direction, populate full form fields
      if (presetValues.symbol || presetValues.direction) {
        populateForm(presetValues);
      }
      
      if (onClearPreset) onClearPreset();
    }
  }, [presetValues, onClearPreset]);

  // Unified function to populate form with trade data
  const populateForm = (data: any) => {
    if (!data) return;
    if (data.symbol) setSymbol(data.symbol.toUpperCase());
    if (data.market) setMarket(data.market);
    if (data.direction) setDirection(data.direction);
    if (data.executionType) setExecutionType(data.executionType);
    if (data.leverage) setLeverage(Number(data.leverage) || 10);
    if (data.entryPrice !== undefined && data.entryPrice !== null) setEntryPrice(data.entryPrice === '' ? '' : Number(data.entryPrice));
    if (data.exitPrice !== undefined && data.exitPrice !== null) setExitPrice(data.exitPrice === '' ? '' : Number(data.exitPrice));
    if (data.quantity !== undefined && data.quantity !== null) setQuantity(data.quantity === '' ? '' : Number(data.quantity));
    if (data.stopLoss !== undefined && data.stopLoss !== null) setStopLoss(data.stopLoss === '' ? '' : Number(data.stopLoss));
    if (data.takeProfit !== undefined && data.takeProfit !== null) setTakeProfit(data.takeProfit === '' ? '' : Number(data.takeProfit));
    if (data.openTradingFee !== undefined) setOpenTradingFee(Number(data.openTradingFee) || 0);
    if (data.closeTradingFee !== undefined) setCloseTradingFee(Number(data.closeTradingFee) || 0);
    if (Array.isArray(data.fundingFees)) setFundingFees(data.fundingFees);
    if (data.notes) setNotes(data.notes);
    if (data.marketMood) setMarketMood(data.marketMood);
    if (data.preTradeEmotion) setPreTradeEmotion(data.preTradeEmotion);
    if (data.postTradeEmotion) setPostTradeEmotion(data.postTradeEmotion);
    if (data.tradingViewUrl) setTradingViewUrl(data.tradingViewUrl);
    if (Array.isArray(data.screenshots)) setScreenshots(data.screenshots);
    if (data.openTime) setOpenTime(data.openTime);
    if (data.closeTime) setCloseTime(data.closeTime);
    if (data.strategy) setStrategy(data.strategy);
    if (data.timeframe) setTimeframe(data.timeframe);
  };

  // Load tradeData from multiple communication channels (chrome.storage, postMessage, CustomEvent)
  useEffect(() => {
    // 1. Direct chrome.storage.local check (if available in extension context)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.get('tradeData', (result: any) => {
          if (result && result.tradeData) {
            populateForm(result.tradeData);
            // Clear the storage as requested
            chrome.storage.local.remove('tradeData', () => {
              if (chrome.runtime && chrome.runtime.lastError) {
                console.warn('Error clearing tradeData:', chrome.runtime.lastError);
              }
            });
          }
        });
      } catch (err) {
        console.error('Error fetching from chrome.storage.local:', err);
      }
    }

    // 2. Listen to window.postMessage from the extension's content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data && (event.data.type === 'FROM_EXTENSION_TRADE_DATA' || event.data.type === 'tradeData')) {
        const payload = event.data.tradeData || event.data.data || event.data.payload;
        if (payload) {
          populateForm(payload);
        }
      }
    };

    // 3. Listen to CustomEvent (e.g. TradeDataExtracted or tradeDataReceived)
    const handleCustomEvent = (event: any) => {
      const payload = event.detail;
      if (payload) {
        populateForm(payload);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('TradeDataExtracted', handleCustomEvent);
    window.addEventListener('tradeDataReceived', handleCustomEvent);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('TradeDataExtracted', handleCustomEvent);
      window.removeEventListener('tradeDataReceived', handleCustomEvent);
    };
  }, []);

  // Handle auto fee estimation helper (Maker/Taker rates)
  const [makerTakerType, setMakerTakerType] = useState<'Taker' | 'Maker'>('Taker');
  const feeRate = makerTakerType === 'Taker' ? 0.05 : 0.02; // Taker standard 0.05%, Maker 0.02%

  useEffect(() => {
    const ep = Number(entryPrice) || 0;
    const xp = Number(exitPrice) || 0;
    const qty = Number(quantity) || 0;
    if (ep > 0 && qty > 0) {
      const computedOpenFee = ep * qty * (feeRate / 100);
      setOpenTradingFee(parseFloat(computedOpenFee.toFixed(8)));
    }
    if (xp > 0 && qty > 0) {
      const computedCloseFee = xp * qty * (feeRate / 100);
      setCloseTradingFee(parseFloat(computedCloseFee.toFixed(8)));
    }
  }, [entryPrice, exitPrice, quantity, feeRate]);

  // Primary Mathematical Computations
  const durationText = useMemo(() => {
    if (!openTime || !closeTime) return 'N/A';
    const openDate = new Date(openTime);
    const closeDate = new Date(closeTime);
    const diffMs = closeDate.getTime() - openDate.getTime();
    if (diffMs <= 0) return '0m';

    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const days = Math.floor(hrs / 24);

    if (days > 0) {
      return `${days}d ${hrs % 24}h ${mins}m`;
    }
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  }, [openTime, closeTime]);

  const tradingFeesTotal = useMemo(() => {
    return Number(openTradingFee) + Number(closeTradingFee);
  }, [openTradingFee, closeTradingFee]);

  const fundingFeesTotal = useMemo(() => {
    // Sum the absolute deduction/credit
    return fundingFees.reduce((sum, f) => sum + f.amount, 0);
  }, [fundingFees]);

  const grossClosedPnl = useMemo(() => {
    const ep = Number(entryPrice) || 0;
    const xp = Number(exitPrice) || 0;
    const qty = Number(quantity) || 0;
    if (ep <= 0 || xp <= 0 || qty <= 0) return 0;

    if (direction === 'Long') {
      return (xp - ep) * qty;
    } else {
      return (ep - xp) * qty;
    }
  }, [entryPrice, exitPrice, quantity, direction]);

  const netRealizedPnl = useMemo(() => {
    // Net realized pnl accounts for gross price difference minus trading fees AND funding fees
    // In exchange logs: Net Realized PnL = Gross Closed PnL - Trading Fees + Funding Fees (if Funding Fees are entered as negative numbers representing paid outgoings, we do basic addition sum: grossPnl - tradingFees + fundingFees)
    return grossClosedPnl - tradingFeesTotal + fundingFeesTotal;
  }, [grossClosedPnl, tradingFeesTotal, fundingFeesTotal]);

  const marginRequired = useMemo(() => {
    const ep = Number(entryPrice) || 0;
    const qty = Number(quantity) || 0;
    if (ep <= 0 || qty <= 0 || leverage <= 0) return 0;
    return (ep * qty) / leverage;
  }, [entryPrice, quantity, leverage]);

  const netRoi = useMemo(() => {
    if (marginRequired <= 0) return 0;
    return (netRealizedPnl / marginRequired) * 100;
  }, [netRealizedPnl, marginRequired]);

  const totalVolume = useMemo(() => {
    const ep = Number(entryPrice) || 0;
    const xp = Number(exitPrice) || 0;
    const qty = Number(quantity) || 0;
    return (ep * qty) + (xp * qty);
  }, [entryPrice, exitPrice, quantity]);

  const realizedRiskReward = useMemo(() => {
    const ep = Number(entryPrice) || 0;
    const xp = Number(exitPrice) || 0;
    const sl = Number(stopLoss) || 0;

    if (ep <= 0 || xp <= 0 || sl <= 0 || ep === sl) return 0;

    if (direction === 'Long') {
      const risk = ep - sl;
      const reward = xp - ep;
      if (risk <= 0) return 0;
      return reward / risk;
    } else {
      const risk = sl - ep;
      const reward = ep - xp;
      if (risk <= 0) return 0;
      return reward / risk;
    }
  }, [entryPrice, exitPrice, stopLoss, direction]);

  // Handlers to manage funding fees
  const handleAddFundingFee = () => {
    const amt = Number(newFundingAmount);
    const rate = Number(newFundingRate);
    if (isNaN(amt) || isNaN(rate)) {
      alert('Please enter valid numeric values for funding rates/amounts.');
      return;
    }
    const newFee: FundingFeeRecord = {
      id: `f-${Date.now()}`,
      timestamp: newFundingTime,
      ratePct: rate,
      amount: amt,
      positionSize: Number(quantity) || 0,
    };
    setFundingFees((prev) => [...prev, newFee].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    // Reset inputs
    setNewFundingAmount('-0.005');
  };

  const handleRemoveFundingFee = (id: string) => {
    setFundingFees((prev) => prev.filter((f) => f.id !== id));
  };

  // Screenshots handlers
  const handleAddScreenshot = () => {
    if (newScreenshotUrl.trim()) {
      setScreenshots((prev) => [...prev, newScreenshotUrl.trim()]);
      setNewScreenshotUrl('');
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  // Base assets/currency formatting
  const quoteCurrency = useMemo(() => {
    if (symbol.toUpperCase().endsWith('USDT')) return 'USDT';
    if (symbol.toUpperCase().endsWith('BTC')) return 'BTC';
    if (symbol.toUpperCase().endsWith('USD')) return 'USD';
    return 'USDT';
  }, [symbol]);

  const baseAsset = useMemo(() => {
    const sym = symbol.toUpperCase();
    if (sym.endsWith('USDT')) return sym.replace('USDT', '');
    if (sym.endsWith('BTC')) return sym.replace('BTC', '');
    if (sym.endsWith('USD')) return sym.replace('USD', '');
    const slashIdx = sym.indexOf('/');
    if (slashIdx > 0) return sym.substring(0, slashIdx);
    return sym || 'XPL';
  }, [symbol]);

  // Lifecycle Timeline Data representation (Ordered chronologically bottom to top)
  useEffect(() => {
    // If the form has been reset or is empty, keep the timeline completely empty
    if (!symbol && !entryPrice && !quantity) {
      setTimelineEvents([]);
      return;
    }

    const events: {
      type: 'Open' | 'Adjust' | 'Funding' | 'Close';
      title: string;
      time: string;
      amount?: number;
      currency?: string;
      statusColor?: 'green' | 'red' | 'gray';
      details: { label: string; value: string; isPrice?: boolean }[];
    }[] = [];

    // 1. Open event (Always at the very bottom chronologically)
    events.push({
      type: 'Open',
      title: isRtl 
        ? `شروع پوزیشن ${direction === 'Long' ? 'خرید (Long)' : 'فروش (Short)'} - دستی`
        : `Open ${direction} - Manual`,
      time: openTime,
      statusColor: 'green',
      details: [
        { label: isRtl ? 'نوع سفارش' : 'Order Type', value: executionType },
        { label: isRtl ? 'اهرم معاملاتی' : 'Leverage', value: `${leverage}x` },
        { label: isRtl ? 'میانگین قیمت ورود' : 'Avg. Price', value: `${Number(entryPrice).toLocaleString()} ${quoteCurrency}`, isPrice: true },
        { label: isRtl ? 'کارمزد ورود' : 'Trading Fee', value: `${Number(openTradingFee).toFixed(8)} ${quoteCurrency}` },
        { label: isRtl ? 'حجم پر شده' : 'Filled Qty', value: `${Number(quantity).toLocaleString()} ${baseAsset}` }
      ]
    });

    // 2. Adjust TP/SL event
    if (stopLoss || takeProfit) {
      events.push({
        type: 'Adjust',
        title: isRtl ? 'تنظیم حد سود / حد ضرر (TP/SL)' : 'Adjust Position TP/SL',
        time: openTime,
        statusColor: 'gray',
        details: [
          { label: isRtl ? 'حد ضرر پوزیشن (SL)' : 'SL', value: stopLoss ? `${stopLoss} ${quoteCurrency}` : '--' },
          { label: isRtl ? 'حد سود پوزیشن (TP)' : 'TP', value: takeProfit ? `${takeProfit} ${quoteCurrency}` : '--' }
        ]
      });
    }

    // 3. Funding fee events (Sorted chronologically)
    fundingFees.forEach((fee, idx) => {
      const isNegative = fee.amount < 0;
      events.push({
        type: 'Funding',
        title: isRtl ? 'کارمزد فاندینگ‌ریت' : 'Funding Fee',
        time: fee.timestamp,
        amount: fee.amount,
        currency: quoteCurrency,
        statusColor: isNegative ? 'red' : 'green',
        details: [
          { label: isRtl ? 'اندازه پوزیشن' : 'Position Size', value: `${fee.positionSize.toLocaleString()} ${baseAsset}` },
          { label: isRtl ? 'نرخ فاندینگ' : 'Funding Rate', value: `${fee.ratePct > 0 ? '+' : ''}${fee.ratePct.toFixed(4)}%` },
          { label: isRtl ? 'جهت پرداخت' : 'Direction', value: fee.ratePct < 0 ? 'Pay (Longs pay Shorts)' : 'Receive (Shorts pay Longs)' },
          { label: isRtl ? 'زمان تسویه' : 'Settlement Time', value: fee.timestamp.replace('T', ' ') }
        ]
      });
    });

    // 4. Close event (Always at the very top chronologically)
    const isWin = netRealizedPnl > 0;
    events.push({
      type: 'Close',
      title: isRtl ? 'بستن پوزیشن - TP/SL دستی' : 'Close Position - TP/SL',
      time: closeTime,
      amount: grossClosedPnl,
      currency: quoteCurrency,
      statusColor: isWin ? 'green' : 'red',
      details: [
        { label: isRtl ? 'مقدار پر شده' : 'Filled Qty', value: `${Number(quantity).toLocaleString()} ${baseAsset}` },
        { label: isRtl ? 'میانگین قیمت خروج' : 'Avg. Price', value: `${Number(exitPrice).toLocaleString()} ${quoteCurrency}`, isPrice: true },
        { label: isRtl ? 'کارمزد خروج' : 'Trading Fee', value: `${Number(closeTradingFee).toFixed(8)} ${quoteCurrency}` }
      ]
    });

    // Sort events: Open, then Adjust, then Funding, then Close
    // However, to display it top-to-bottom like the exchange: Close should be first (index 0) and Open should be last.
    // So we sort chronologically, and then reverse so the most recent (Close) is at the top.
    const sorted = events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).reverse();
    setTimelineEvents(sorted);
  }, [openTime, closeTime, direction, executionType, leverage, entryPrice, stopLoss, takeProfit, quantity, openTradingFee, closeTradingFee, fundingFees, grossClosedPnl, quoteCurrency, baseAsset, isRtl, netRealizedPnl, symbol]);

  // Main save action
  const handleSave = () => {
    if (!symbol.trim()) {
      alert(isRtl ? 'لطفاً نماد معامله را وارد کنید (مانند BTC/USDT).' : 'Please provide a Ticker Symbol (e.g. BTCUSDT).');
      return;
    }
    if (!entryPrice || Number(entryPrice) <= 0) {
      alert(isRtl ? 'لطفاً قیمت ورود معتبری وارد کنید.' : 'Please enter a valid positive Entry Price.');
      return;
    }
    if (!exitPrice || Number(exitPrice) <= 0) {
      alert(isRtl ? 'لطفاً قیمت خروج معتبری وارد کنید.' : 'Please enter a valid positive Exit Price.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      alert(isRtl ? 'لطفاً حجم معامله معتبری وارد کنید.' : 'Please enter a valid positive Quantity.');
      return;
    }

    // Prepare complete save payload
    const finalPnl = netRealizedPnl;
    const finalRoi = netRoi;

    const newTrade: Trade = {
      id: (presetValues && presetValues.id) ? presetValues.id : `t-${Date.now()}`,
      date: openTime,
      closeTime: closeTime,
      symbol: symbol.toUpperCase().trim(),
      market,
      direction,
      entryPrice: Number(entryPrice),
      exitPrice: Number(exitPrice),
      quantity: Number(quantity),
      leverage,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      fees: parseFloat((tradingFeesTotal - fundingFeesTotal).toFixed(8)), // save total fees cleanly
      status: finalPnl > 0 ? 'Win' : 'Loss',
      pnl: parseFloat(finalPnl.toFixed(8)),
      roi: parseFloat(finalRoi.toFixed(2)),
      strategy: strategy || config.strategies[0] || 'Price Action Breakout',
      confluences: [],
      marketMood,
      emotionalState: `${preTradeEmotion} ➔ ${postTradeEmotion}`,
      preTradeEmotion,
      postTradeEmotion,
      timeframe,
      notes: notes,
      screenshots: screenshots,
      tradingViewUrl: tradingViewUrl.trim() || undefined,
      exchange,
      executionType,
    };

    onSaveTrade(newTrade);
    handleResetForm();
    setView('tradelog');
  };

  const handleDiscard = () => {
    if (confirm(isRtl ? 'آیا می‌خواهید تغییرات خود را نادیده گرفته و از ثبت پوزیشن انصراف دهید؟' : 'Discard your changes and stop adding this trade log?')) {
      handleResetForm();
      setView('dashboard');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-32 animate-fade-in text-slate-100" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top red header warning & breadcrumb replacement */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-400 font-mono tracking-widest uppercase">
              {isRtl ? 'سیستم مدیریت پوزیشن لجر' : 'EXCHANGE INTEGRITY WORKSPACE'}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
            {isRtl ? 'ثبت پوزیشن بسته شده' : 'Closed Trade Lifecycle Logger'}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
          >
            {isRtl ? 'انصراف' : 'Discard Log'}
          </button>
          <button
            onClick={handleResetForm}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-amber-500 hover:text-amber-400 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            title={isRtl ? 'پاک کردن همه ورودی‌ها' : 'Clear all form entries'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isRtl ? 'ریست فرم' : 'Reset Form'}</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isRtl ? 'ثبت و ذخیره دفتر کل' : 'Save to Ledger'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Realized PnL Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className={`absolute top-0 right-0 w-64 h-full bg-gradient-to-l ${netRealizedPnl >= 0 ? 'from-emerald-500/5' : 'from-rose-500/5'} pointer-events-none`} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main big numbers */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white tracking-tight font-mono">
                {symbol.toUpperCase()}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                direction === 'Long' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {direction}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold font-mono">
                Isolated {leverage}X
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              ID {tradeId}
            </div>

            <div className="pt-2">
              <div className="text-xs text-slate-400 font-medium">{isRtl ? 'سود/زیان نهایی محقق شده (Realized PnL)' : 'Realized PnL'}</div>
              <div className="flex flex-wrap items-baseline gap-3 mt-1">
                <span className={`text-3xl md:text-4xl font-black font-mono tracking-tight ${
                  netRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {netRealizedPnl >= 0 ? '+' : ''}{netRealizedPnl.toFixed(8)} <span className="text-lg font-bold">{quoteCurrency}</span>
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500">ROI: </span>
                  <span className={`font-bold ${netRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {netRoi >= 0 ? '+' : ''}{netRoi.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{isRtl ? 'مدت زمان پوزیشن: ' : 'Duration: '}</span>
                  <span className="text-slate-300 font-bold">{durationText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details calculation break down */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/40 border border-slate-800/85 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isRtl ? 'سود/زیان ناخالص (Gross)' : 'Closed PnL'}</span>
              <span className={`text-sm font-bold font-mono mt-2 ${grossClosedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {grossClosedPnl >= 0 ? '+' : ''}{grossClosedPnl.toFixed(4)}
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/85 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isRtl ? 'کل کارمزد معاملاتی' : 'Trading Fees'}</span>
              <span className="text-sm font-bold font-mono mt-2 text-rose-400">
                -{tradingFeesTotal.toFixed(8)}
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/85 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isRtl ? 'کارمزد فاندینگ کل' : 'Funding Fees'}</span>
              <span className={`text-sm font-bold font-mono mt-2 ${fundingFeesTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fundingFeesTotal >= 0 ? '+' : ''}{fundingFeesTotal.toFixed(8)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 & 4: Main Body & Sidebar layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Main inputs & Timeline) - 8 Cols */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Trade Setup Parameters */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-800/60">
              <Activity className="w-4.5 h-4.5 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {isRtl ? 'پارامترهای پایه و ترید' : 'Trade Setup Parameters'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Asset symbol selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'نماد دارایی / جفت ارز' : 'Symbol / Ticker'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. BTCUSDT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono text-white transition-all"
                />
              </div>

              {/* Market classification */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'نوع بازار' : 'Market Type'}
                </label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value as MarketType)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all"
                >
                  <option value="Crypto">Crypto</option>
                  <option value="Forex">Forex</option>
                  <option value="Stocks">Stocks</option>
                  <option value="Commodities">Commodities</option>
                </select>
              </div>

              {/* Direction selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'جهت معامله' : 'Direction'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('Long')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      direction === 'Long'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('Short')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      direction === 'Short'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    SHORT
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Leverage */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'لوریج / اهرم' : 'Leverage'}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={leverage}
                    onChange={(e) => setLeverage(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all"
                  />
                  <span className="text-xs font-bold text-slate-500">X</span>
                </div>
              </div>

              {/* Order Execution Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'نوع اجرای سفارش' : 'Execution Type'}
                </label>
                <select
                  value={executionType}
                  onChange={(e) => setExecutionType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all"
                >
                  <option value="Limit">Limit</option>
                  <option value="Market">Market</option>
                  <option value="Stop">Stop</option>
                </select>
              </div>

              {/* Exchange classification */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'صرافی / بروکر' : 'Exchange / Broker'}
                </label>
                <select
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all"
                >
                  {config.exchanges.map((ex) => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Strategy selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'استراتژی معامله' : 'Trading Strategy'}
                </label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all"
                >
                  {config.strategies.map((strat) => (
                    <option key={strat} value={strat}>{strat}</option>
                  ))}
                </select>
              </div>

              {/* Timeframe classification */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'تایم‌فریم معامله' : 'Trade Timeframe'}
                </label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all"
                >
                  {config.timeframes.map((tf) => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800/40">
              {/* Entry Price */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'قیمت میانگین ورود' : 'Avg. Entry Price'}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all"
                />
              </div>

              {/* Exit Price */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'قیمت میانگین خروج' : 'Avg. Exit Price'}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? `حجم معامله (${baseAsset})` : `Quantity Size (${baseAsset})`}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Open Date/Time */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'زمان ورود به پوزیشن' : 'Open Datetime'}</span>
                </label>
                <input
                  type="datetime-local"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all text-left"
                />
              </div>

              {/* Close Date/Time */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>{isRtl ? 'زمان خروج از پوزیشن' : 'Close Datetime'}</span>
                </label>
                <input
                  type="datetime-local"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all text-left"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800/40">
              {/* Planned SL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'حد ضرر فرضی (SL)' : 'Stop Loss (SL)'}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="SL Target"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all"
                />
              </div>

              {/* Planned TP */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'حد سود فرضی (TP)' : 'Take Profit (TP)'}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="TP Target"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all"
                />
              </div>

              {/* Open Trading Fee */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'کارمزد گشایش (Open Fee)' : 'Open Trading Fee'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={openTradingFee}
                  onChange={(e) => setOpenTradingFee(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all"
                />
              </div>

              {/* Close Trading Fee */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'کارمزد انسداد (Close Fee)' : 'Close Trading Fee'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={closeTradingFee}
                  onChange={(e) => setCloseTradingFee(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-white transition-all"
                />
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-xs">
              <span className="text-slate-400 font-medium">{isRtl ? 'تخمین خودکار بر اساس نرخ:' : 'Estimating commissions based on:'}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMakerTakerType('Taker')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${makerTakerType === 'Taker' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Taker (0.05%)
                </button>
                <button
                  type="button"
                  onClick={() => setMakerTakerType('Maker')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${makerTakerType === 'Maker' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Maker (0.02%)
                </button>
              </div>
            </div>
          </div>

          {/* Funding Fee Manager component */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Percent className="w-4.5 h-4.5 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {isRtl ? 'مدیریت و ثبت کارمزدهای فاندینگ‌ریت' : 'Funding Rates Ledger (8h Intervals)'}
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Total: {fundingFeesTotal.toFixed(8)} {quoteCurrency}
              </span>
            </div>

            {/* List of active funding rates */}
            <div className="space-y-2 mb-4">
              {fundingFees.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  {isRtl ? 'هیچ پارت فاندینگ‌ریتی ثبت نشده است' : 'No funding fee logs entered yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fundingFees.map((fee) => (
                    <div key={fee.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500">{fee.timestamp.replace('T', ' ')}</div>
                        <div className="font-bold flex items-center gap-1.5 mt-0.5">
                          <span className={fee.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {fee.amount < 0 ? '' : '+'}{fee.amount.toFixed(8)} {quoteCurrency}
                          </span>
                          <span className="text-[10px] text-slate-500">({fee.ratePct}%)</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFundingFee(fee.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to add new funding fee */}
            <div className="bg-slate-950/50 p-4 border border-slate-800/70 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Timestamp</label>
                <input
                  type="datetime-local"
                  value={newFundingTime}
                  onChange={(e) => setNewFundingTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-none rounded-lg p-1.5 text-[11px] font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Funding Rate (%)</label>
                <input
                  type="text"
                  value={newFundingRate}
                  onChange={(e) => setNewFundingRate(e.target.value)}
                  placeholder="-0.005%"
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-none rounded-lg p-1.5 text-[11px] font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Net Amount ({quoteCurrency})</label>
                <input
                  type="text"
                  value={newFundingAmount}
                  onChange={(e) => setNewFundingAmount(e.target.value)}
                  placeholder="-0.01"
                  className="w-full bg-slate-950 border border-slate-800 focus:outline-none rounded-lg p-1.5 text-[11px] font-mono text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddFundingFee}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-[10px] uppercase font-bold py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Fee</span>
              </button>
            </div>
          </div>

          {/* Core Lifecycle timeline component */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center gap-2 mb-8 pb-3 border-b border-slate-800/60">
              <Sliders className="w-4.5 h-4.5 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {isRtl ? 'تایم‌لاین چرخه حیات پوزیشن (Lifecycle Timeline)' : 'The Lifecycle Timeline'}
              </h3>
            </div>

            <div className="relative pl-6 md:pl-8 border-l border-slate-800 space-y-10 py-2">
              {timelineEvents.map((ev, index) => {
                const isClose = ev.type === 'Close';
                const isOpen = ev.type === 'Open';
                const isFunding = ev.type === 'Funding';

                return (
                  <div key={index} className="relative group">
                    {/* Floating icon bullet on the timeline */}
                    <div className={`absolute -left-[35px] md:-left-[43px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center border text-xs shadow-md transition-all ${
                      ev.statusColor === 'green'
                        ? 'bg-emerald-500/10 border-emerald-500/45 text-emerald-400'
                        : ev.statusColor === 'red'
                        ? 'bg-rose-500/10 border-rose-500/45 text-rose-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      {isClose && <TrendingUp className="w-3.5 h-3.5" />}
                      {isOpen && <TrendingDown className="w-3.5 h-3.5" />}
                      {isFunding && <Percent className="w-3.5 h-3.5" />}
                      {!isClose && !isOpen && !isFunding && <Shield className="w-3.5 h-3.5" />}
                    </div>

                    {/* Timeline Event Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                      <div>
                        <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                          {ev.title}
                          {ev.amount !== undefined && (
                            <span className={`font-mono ${ev.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {ev.amount >= 0 ? '+' : ''}{ev.amount.toFixed(8)} {ev.currency}
                            </span>
                          )}
                        </h4>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(ev.time).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Nested details container */}
                    <div className="mt-3 bg-slate-950/45 border border-slate-800/80 rounded-xl p-4.5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ev.details.map((detail, dIdx) => (
                          <div key={dIdx} className="space-y-1">
                            <span className="text-[9.5px] text-slate-500 font-semibold tracking-wide uppercase block">
                              {detail.label}
                            </span>
                            <span className={`text-[11px] font-bold font-mono block ${
                              detail.isPrice ? 'text-slate-200' : 'text-slate-300'
                            }`}>
                              {detail.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Post-Trade Analytics - 4 Cols */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-800/60">
              <Zap className="w-4.5 h-4.5 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {isRtl ? 'آنالیز عملکرد سازمانی' : 'INSTITUTIONAL PERFORMANCE ANALYTICS'}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Asset Class overview card */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Active Contract</div>
                  <div className="text-base font-black text-white tracking-wide mt-0.5">{symbol.toUpperCase()}</div>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                  direction === 'Long' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {direction}
                </div>
              </div>

              {/* Statistical Metrics Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 font-semibold">{isRtl ? 'حجم کل معامله شده:' : 'Total Volume:'}</span>
                  <span className="font-mono font-bold text-white">${totalVolume.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 font-semibold">{isRtl ? 'کل مارجین درگیر:' : 'Total Margin:'}</span>
                  <span className="font-mono font-bold text-white">${marginRequired.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 font-semibold">{isRtl ? 'نسبت ریسک به ریوارد واقعی:' : 'Realized R:R:'}</span>
                  <span className="font-mono font-bold text-emerald-400">1:{realizedRiskReward.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 font-semibold">{isRtl ? 'جو حاکم بر بازار:' : 'Market Mood:'}</span>
                  <select
                    value={marketMood}
                    onChange={(e) => setMarketMood(e.target.value as MarketMoodType)}
                    className="bg-slate-950 border border-slate-800 focus:outline-none rounded-lg py-1 px-2 text-[11px] font-bold text-slate-300"
                  >
                    <option value="Neutral">Neutral</option>
                    <option value="Ext. Fear">Ext. Fear</option>
                    <option value="Ext. Greed">Ext. Greed</option>
                  </select>
                </div>
              </div>

              {/* Psychological states & emoji pickers */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isRtl ? 'حالت روحی پیش از ترید' : 'Pre-Trade Emotional Trigger'}
                  </label>
                  <div className="flex justify-between gap-1">
                    {['🧠', '😐', '😨', '😡', '🤑', 'FOMO'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setPreTradeEmotion(emoji)}
                        className={`flex-1 py-1.5 border rounded-lg text-xs font-bold transition-all ${
                          preTradeEmotion === emoji
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 scale-105'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isRtl ? 'حالت روحی پس از ترید' : 'Post-Trade Emotional Result'}
                  </label>
                  <div className="flex justify-between gap-1">
                    {['🤑', '😐', '😭', '😡', '😇', 'FOMO'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setPostTradeEmotion(emoji)}
                        className={`flex-1 py-1.5 border rounded-lg text-xs font-bold transition-all ${
                          postTradeEmotion === emoji
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 scale-105'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trade Notes & Journaling */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'یادداشت‌ها و ژورنال نویسی پوزیشن' : 'Trade Notes & Journaling'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Review your execution mistakes, key core rules followed, and setup confluences..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-xl p-3 text-xs text-slate-300 leading-relaxed transition-all"
                />
              </div>

              {/* Image & URL Proofs */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  TradingView Chart Links
                </label>
                <input
                  type="text"
                  placeholder="https://tradingview.com/x/..."
                  value={tradingViewUrl}
                  onChange={(e) => setTradingViewUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-slate-300 transition-all"
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Upload Screen Proofs
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste image link/URL..."
                      value={newScreenshotUrl}
                      onChange={(e) => setNewScreenshotUrl(e.target.value)}
                      className="flex-grow bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddScreenshot}
                      className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-emerald-400 cursor-pointer hover:bg-slate-850"
                    >
                      Add
                    </button>
                  </div>

                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {screenshots.map((url, sIdx) => (
                        <div key={sIdx} className="relative group rounded-lg overflow-hidden border border-slate-800 h-10 bg-slate-950">
                          <img src={url} alt="Proof" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveScreenshot(sIdx)}
                            className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white font-bold text-xs"
                          >
                            Del
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Styled Footer Block */}
      <footer className="w-full text-center py-8 mt-12 border-t border-slate-900">
        <p className="text-slate-500 text-sm font-medium">
          © 2026 Hadi Binabaji. All rights reserved. <br/>
          <span className="text-slate-600 text-xs mt-1 block">
            Designed and Developed for Professional Traders.
          </span>
        </p>
      </footer>
    </div>
  );
}
