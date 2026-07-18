/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Trade, MarketType, StatusType, DirectionType, MarketMoodType } from '../types';
import { calculateTradePnlAndRoi } from '../utils/calculations';

interface EditTradeModalProps {
  trade: Trade;
  onClose: () => void;
  onSave: (updatedTrade: Trade) => void;
  lang?: 'en' | 'fa';
}

const TRANSLATIONS = {
  en: {
    editTrade: 'Edit Trade Entry',
    closePosition: 'Close / Resolve Position',
    symbol: 'Symbol',
    market: 'Market',
    direction: 'Direction',
    entryPrice: 'Entry Price ($)',
    exitPrice: 'Exit Price ($)',
    quantity: 'Quantity / Size',
    leverage: 'Leverage',
    fees: 'Commissions & Fees ($)',
    status: 'Outcome Status',
    openTime: 'Open Date & Time',
    closeTime: 'Close Date & Time',
    notes: 'Post-Trade reflections & Notes',
    notesPlaceholder: 'What did you see? Emotional traps? Retrospective confluences...',
    tradingViewUrl: 'TradingView Chart / Idea Link',
    save: 'Save Changes',
    cancel: 'Cancel',
    win: 'Win',
    loss: 'Loss',
    open: 'Keep Position Open',
    recalculatedPnl: 'Live PnL Summary',
    recalculatedRoi: 'Live ROI',
    sl: 'Stop Loss (SL)',
    tp: 'Take Profit (TP)',
    risk: 'Risk Percentage (%)',
    marketMood: 'Market Sentiment',
    emotion: 'Emotional State',
    strategy: 'Strategy',
  },
  fa: {
    editTrade: 'ویرایش اطلاعات معامله',
    closePosition: 'بستن / تسویه موقعیت معاملاتی',
    symbol: 'نماد معاملاتی',
    market: 'نوع بازار',
    direction: 'جهت معامله',
    entryPrice: 'قیمت ورود ($)',
    exitPrice: 'قیمت خروج ($)',
    quantity: 'حجم معامله',
    leverage: 'اهرم (Leverage)',
    fees: 'کارمزدها ($)',
    status: 'وضعیت معامله',
    openTime: 'تاریخ و ساعت ورود',
    closeTime: 'تاریخ و ساعت خروج',
    notes: 'یادداشت‌ها و تحلیل پس از معامله',
    notesPlaceholder: 'احساسات خود، اشتباهات یا دلایل روان‌شناختی خروج را بنویسید...',
    tradingViewUrl: 'لینک چارت TradingView',
    save: 'ذخیره تغییرات',
    cancel: 'انصراف',
    win: 'سود (Win)',
    loss: 'ضرر (Loss)',
    open: 'باز نگه داشتن موقعیت',
    recalculatedPnl: 'سود/زیان لحظه‌ای',
    recalculatedRoi: 'بازدهی لحظه‌ای ROI',
    sl: 'حد ضرر (SL)',
    tp: 'حد سود (TP)',
    risk: 'درصد ریسک (%)',
    marketMood: 'حس و حال بازار',
    emotion: 'حالت روحی شما',
    strategy: 'استراتژی',
  }
};

const formatToDatetimeLocal = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.length === 10) {
    return `${dateStr}T12:00`;
  }
  return dateStr;
};

export default function EditTradeModal({ trade, onClose, onSave, lang = 'en' }: EditTradeModalProps) {
  const isRtl = lang === 'fa';
  const t = TRANSLATIONS[lang];

  // Form State
  const [symbol, setSymbol] = useState(trade.symbol);
  const [market, setMarket] = useState<MarketType>(trade.market);
  const [direction, setDirection] = useState<DirectionType>(trade.direction);
  const [status, setStatus] = useState<StatusType>(trade.status);
  
  const [entryPrice, setEntryPrice] = useState<number | ''>(trade.entryPrice || '');
  const [exitPrice, setExitPrice] = useState<number | ''>(trade.exitPrice || '');
  const [quantity, setQuantity] = useState<number | ''>(trade.quantity || '');
  const [leverage, setLeverage] = useState<number | ''>(trade.leverage || '');
  const [fees, setFees] = useState<number | ''>(trade.fees || 0);
  const [stopLoss, setStopLoss] = useState<number | ''>(trade.stopLoss || '');
  const [takeProfit, setTakeProfit] = useState<number | ''>(trade.takeProfit || '');
  const [riskPercentage, setRiskPercentage] = useState<number | ''>(trade.riskPercentage || '');

  const [openTime, setOpenTime] = useState(() => formatToDatetimeLocal(trade.date));
  const [closeTime, setCloseTime] = useState(() => {
    if (trade.closeTime) return formatToDatetimeLocal(trade.closeTime);
    // Suggest current time for closing open positions
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  const [strategy, setStrategy] = useState(trade.strategy || '');
  const [marketMood, setMarketMood] = useState<MarketMoodType>(trade.marketMood || 'Neutral');
  const [emotionalState, setEmotionalState] = useState(trade.emotionalState || '😐');
  const [notes, setNotes] = useState(trade.notes || '');
  const [tradingViewUrl, setTradingViewUrl] = useState(trade.tradingViewUrl || '');
  const [screenshots, setScreenshots] = useState<string[]>(trade.screenshots || []);

  // Set default status suggestion based on Exit Price when resolving an open trade
  useEffect(() => {
    if (trade.status === 'Open' && status === 'Open' && typeof exitPrice === 'number' && exitPrice > 0) {
      const entryNum = Number(entryPrice) || 0;
      if (entryNum > 0) {
        if (direction === 'Long') {
          setStatus(exitPrice > entryNum ? 'Win' : 'Loss');
        } else {
          setStatus(exitPrice < entryNum ? 'Win' : 'Loss');
        }
      }
    }
  }, [exitPrice, entryPrice, direction, trade.status]);

  // Live Recalculations of PnL and ROI inside the modal (Strict Crypto Futures Formulas)
  const computedMetrics = useMemo(() => {
    const isActuallyOpen = status === 'Open';
    const entryNum = Number(entryPrice) || 0;
    const exitNum = isActuallyOpen ? 0 : (Number(exitPrice) || 0);
    const qtyNum = Number(quantity) || 0;
    const levNum = Number(leverage) || 1;
    const feesNum = Number(fees) || 0;

    // Strict Crypto Futures Formulas used dynamically inside modal:
    // PnL (Long)  = (ExitPrice - EntryPrice) * Quantity - Fees
    // PnL (Short) = (EntryPrice - ExitPrice) * Quantity - Fees
    // Margin      = (EntryPrice * Quantity) / Leverage
    // ROI         = (PnL / Margin) * 100
    //
    // NO leverage multiplication on PnL occurs here.
    return calculateTradePnlAndRoi(direction, entryNum, exitNum, qtyNum, levNum, feesNum, status);
  }, [direction, entryPrice, exitPrice, quantity, leverage, fees, status]);

  const handleTradingViewUrlChange = (val: string) => {
    setTradingViewUrl(val);
    if (val.trim()) {
      const match = val.match(/tradingview\.com\/x\/([A-Za-z0-9]+)/i);
      if (match && match[1]) {
        const id = match[1];
        const directImg = `https://charts.tradingview.com/x/${id}.png`;
        if (!screenshots.includes(directImg)) {
          setScreenshots((prev) => [...prev, directImg]);
        }
      }
    }
  };

  const handleRemoveScreenshot = (idx: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol.trim()) {
      alert(isRtl ? 'لطفاً یک نماد معتبر وارد کنید.' : 'Please provide a valid symbol.');
      return;
    }

    const entryNum = Number(entryPrice) || 0;
    if (entryNum <= 0) {
      alert(isRtl ? 'قیمت ورود باید بیشتر از صفر باشد.' : 'Entry price must be greater than zero.');
      return;
    }

    const qtyNum = Number(quantity) || 0;
    if (qtyNum <= 0) {
      alert(isRtl ? 'حجم معامله باید بیشتر از صفر باشد.' : 'Quantity must be greater than zero.');
      return;
    }

    const exitNum = status === 'Open' ? 0 : (Number(exitPrice) || 0);
    if (status !== 'Open' && exitNum <= 0) {
      alert(isRtl ? 'برای معاملات بسته شده، قیمت خروج باید وارد شود.' : 'Exit price is required for closed positions.');
      return;
    }

    const updatedTrade: Trade = {
      ...trade,
      symbol: symbol.trim().toUpperCase(),
      market,
      direction,
      status,
      entryPrice: entryNum,
      exitPrice: exitNum,
      quantity: qtyNum,
      leverage: Number(leverage) || 1,
      fees: Number(fees) || 0,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      riskPercentage: riskPercentage ? Number(riskPercentage) : undefined,
      date: openTime,
      closeTime: status !== 'Open' ? closeTime : undefined,
      strategy: strategy.trim(),
      marketMood,
      emotionalState,
      notes: notes.trim(),
      tradingViewUrl: tradingViewUrl.trim() || undefined,
      screenshots,
      pnl: computedMetrics.pnl,
      roi: computedMetrics.roi,
    };

    onSave(updatedTrade);
  };

  return (
    <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface-container border border-outline-variant max-w-4xl w-full rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-surface-container-high border-b border-outline-variant flex justify-between items-center">
          <div className={isRtl ? 'text-right' : 'text-left'}>
            <h4 className="text-sm font-black text-on-surface tracking-wide uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">edit_note</span>
              {trade.status === 'Open' ? t.closePosition : t.editTrade} ({trade.symbol})
            </h4>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              {isRtl ? 'ویرایش جزئیات معامله و به روزرسانی آمار' : 'Update the workstation log metrics dynamically'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-highest cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMN 1: Entry details */}
            <div className="space-y-4">
              <h5 className={`font-bold text-on-surface-variant uppercase tracking-wider text-[9px] pb-1 border-b border-outline-variant/30 ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'مشخصات ورود به معامله' : 'Trade Entry Metrics'}
              </h5>

              <div className="grid grid-cols-2 gap-3">
                {/* Symbol */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.symbol}</label>
                  <input
                    type="text"
                    required
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-bold font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Market */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.market}</label>
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value as MarketType)}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-semibold text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="Crypto">Crypto</option>
                    <option value="Forex">Forex</option>
                    <option value="Stocks">Stocks</option>
                    <option value="Commodities">Commodities</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Direction */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.direction}</label>
                  <div className="flex bg-surface-dim border border-outline-variant rounded-lg overflow-hidden p-0.5">
                    <button
                      type="button"
                      onClick={() => setDirection('Long')}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${
                        direction === 'Long'
                          ? 'bg-primary text-on-primary shadow'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Long
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('Short')}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${
                        direction === 'Short'
                          ? 'bg-secondary text-on-secondary shadow'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Short
                    </button>
                  </div>
                </div>

                {/* Entry Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.entryPrice}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-bold font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.quantity}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2 font-bold font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Leverage */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.leverage}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2 font-bold font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Fees */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.fees}</label>
                  <input
                    type="number"
                    step="any"
                    value={fees}
                    onChange={(e) => setFees(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2 font-bold font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* SL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.sl}</label>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2 font-semibold font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                {/* TP */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.tp}</label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2 font-semibold font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Risk */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.risk}</label>
                  <input
                    type="number"
                    step="any"
                    value={riskPercentage}
                    onChange={(e) => setRiskPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2 font-semibold font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Open Datetime */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant">{t.openTime}</label>
                <input
                  type="datetime-local"
                  required
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-bold font-mono text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Strategy */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant">{t.strategy}</label>
                <input
                  type="text"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  placeholder="e.g. Breakout Retest"
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-semibold text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* COLUMN 2: Close details, calculations & notes */}
            <div className="space-y-4">
              <h5 className={`font-bold text-on-surface-variant uppercase tracking-wider text-[9px] pb-1 border-b border-outline-variant/30 ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'وضیعت تسویه و روان‌شناسی' : 'Trade Close & Reflections'}
              </h5>

              {/* Outcome Status Picker */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant">{t.status}</label>
                <div className="flex bg-surface-dim border border-outline-variant rounded-lg overflow-hidden p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setStatus('Open')}
                    className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${
                      status === 'Open'
                        ? 'bg-surface-container-highest text-on-surface border border-outline-variant/40 shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {isRtl ? 'پوزیشن باز' : 'Open'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('Win')}
                    className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${
                      status === 'Win'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {isRtl ? 'سود (Win)' : 'Win'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('Loss')}
                    className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${
                      status === 'Loss'
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {isRtl ? 'ضرر (Loss)' : 'Loss'}
                  </button>
                </div>
              </div>

              {/* Exit Price and Close Time (Only relevant if not open status) */}
              {status !== 'Open' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                  {/* Exit Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant">{t.exitPrice}</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-bold font-mono text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Close Time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant">{t.closeTime}</label>
                    <input
                      type="datetime-local"
                      required
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-bold font-mono text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* Psychology: Mood and Emotion */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.marketMood}</label>
                  <select
                    value={marketMood}
                    onChange={(e) => setMarketMood(e.target.value as MarketMoodType)}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-semibold text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="Ext. Fear">Ext. Fear</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Ext. Greed">Ext. Greed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">{t.emotion}</label>
                  <div className="flex bg-surface-dim border border-outline-variant rounded-lg p-1.5 justify-around items-center gap-1">
                    {['😐', '😊', '😭', '😡', '😱'].map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => setEmotionalState(emo)}
                        className={`text-base p-1 rounded-md transition-all hover:scale-125 ${
                          emotionalState === emo ? 'bg-surface-container-highest shadow-sm' : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Calculations Banner */}
              <div className="p-3.5 bg-surface-container-low border border-outline-variant/60 rounded-lg space-y-1">
                <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider">{t.recalculatedPnl}:</span>
                  <span className={`font-mono font-black text-xs ${computedMetrics.pnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                    {status === 'Open' ? (isRtl ? 'در حال پایش بازار...' : 'Live Monitoring...') : `${computedMetrics.pnl >= 0 ? '+' : ''}${computedMetrics.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`}
                  </span>
                </div>
                <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider">{t.recalculatedRoi}:</span>
                  <span className={`font-mono font-black text-xs ${computedMetrics.pnl >= 0 ? 'text-primary' : 'text-secondary'}`}>
                    {status === 'Open' ? '--' : `${computedMetrics.roi >= 0 ? '+' : ''}${computedMetrics.roi.toFixed(2)}%`}
                  </span>
                </div>
              </div>

              {/* TradingView URL input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant">{t.tradingViewUrl}</label>
                <input
                  type="url"
                  placeholder={isRtl ? 'https://www.tradingview.com/x/... یا لینک ایده' : 'https://www.tradingview.com/x/... or idea link'}
                  value={tradingViewUrl}
                  onChange={(e) => handleTradingViewUrlChange(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-semibold text-on-surface focus:outline-none focus:border-primary placeholder:text-on-surface-variant/40"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant">{t.notes}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.notesPlaceholder}
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 font-semibold text-on-surface focus:outline-none focus:border-primary resize-none placeholder:text-on-surface-variant/40"
                />
              </div>

              {/* Interactive screenshots view */}
              {screenshots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider">
                    {isRtl ? 'تصاویر ضمیمه شده' : 'Attached Evidence Screenshots'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {screenshots.map((img, idx) => (
                      <div key={idx} className="relative aspect-video bg-surface-dim border border-outline-variant rounded overflow-hidden group">
                        <img src={img} alt="Screenshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => handleRemoveScreenshot(idx)}
                          className="absolute top-1 right-1 bg-secondary/80 hover:bg-secondary text-on-secondary p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className={`pt-4 border-t border-outline-variant/30 flex items-center justify-end gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-container-highest text-on-surface font-bold text-[10px] tracking-widest uppercase rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-on-primary font-bold text-[10px] tracking-widest uppercase rounded-lg hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-md"
            >
              <span className="material-symbols-outlined text-[13px]">save</span>
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
