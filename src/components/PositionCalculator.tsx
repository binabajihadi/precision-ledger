/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from '../utils/translations';

interface PositionCalculatorProps {
  initialCapital?: number;
  lang?: 'en' | 'fa';
}

const LOCAL_T = {
  en: {
    long: "LONG (Buy)",
    short: "SHORT (Sell)",
    direction: "Trade Direction",
    targetPrice: "Target Price (Take Profit / TP)",
    targetPriceLabel: "Target Price ($)",
    rrRatio: "Risk / Reward (R:R)",
    feesInput: "Maker/Taker Commission (%)",
    feesConfig: "Trading Fees & Commissions",
    feePresetFree: "Zero Fees (0.00%)",
    feePresetCryptoMaker: "Crypto Maker (0.02%)",
    feePresetCryptoTaker: "Crypto Taker (0.05%)",
    feePresetSpot: "Standard Spot/Forex (0.10%)",
    customFee: "Custom Fee (%)",
    netProfit: "Net Profit (After Fees)",
    netLoss: "Net Loss (With Fees)",
    grossProfit: "Gross Profit",
    grossLoss: "Gross Loss",
    marginUtilization: "Margin Utilization",
    riskRewardBalance: "Risk vs Reward Zone Balance",
    pipValue: "Estimated 1% Price Move Value",
    pipValueDesc: "Varying USD value gain/loss per 1% movement in underlying asset price.",
    safe: "Safe Margin",
    moderate: "Moderate Leverage",
    highExposure: "High Exposure",
    marginCall: "⚠️ INSUFFICIENT CAPITAL / MARGIN EXCEEDED!",
    slWarningLong: "Stop Loss must be BELOW Entry Price for LONG trades.",
    slWarningShort: "Stop Loss must be ABOVE Entry Price for SHORT trades.",
    tpWarningLong: "Target Price (TP) must be ABOVE Entry Price for LONG trades.",
    tpWarningShort: "Target Price (TP) must be BELOW Entry Price for SHORT trades.",
    pnlImpact: "Commission & Fee Impact",
    feesPaid: "Total Round-Trip Fees",
    valuePerTick: "Est. Value per 1% Move",
    collapsibleOpen: "Configure Trading Fees",
    collapsibleClose: "Hide Trading Fees",
  },
  fa: {
    long: "خرید (LONG)",
    short: "فروش (SHORT)",
    direction: "جهت معامله",
    targetPrice: "قیمت هدف (حد سود - TP)",
    targetPriceLabel: "قیمت هدف / حد سود ($)",
    rrRatio: "نسبت ریسک به ریوارد (R:R)",
    feesInput: "میزان کارمزد صرافی (%)",
    feesConfig: "کارمزد و کمیسیون‌های معاملاتی",
    feePresetFree: "بدون کارمزد (۰.۰۰٪)",
    feePresetCryptoMaker: "میکر کریپتو (۰.۰۲٪)",
    feePresetCryptoTaker: "تیکر کریپتو (۰.۰۵٪)",
    feePresetSpot: "اسپات استاندارد / فارکس (۰.۱۰٪)",
    customFee: "کارمزد سفارشی (%)",
    netProfit: "سود خالص (بعد از کسر کارمزد)",
    netLoss: "ضرر خالص (با احتساب کارمزد)",
    grossProfit: "سود ناخالص",
    grossLoss: "ضرر ناخالص",
    marginUtilization: "میزان مارجین استفاده‌شده (Margin)",
    riskRewardBalance: "توازن نواحی ریسک و ریوارد",
    pipValue: "نوسان دلاری موقعیت به ازای ۱٪ حرکت قیمت",
    pipValueDesc: "میزان سود یا زیان به دلار در صورت جابجایی ۱ درصدی قیمت دارایی پایه.",
    safe: "مارجین ایمن",
    moderate: "اهرم متوسط",
    highExposure: "ریسک بالا / اهرم شدید",
    marginCall: "⚠️ هشدار: مارجین از کل سرمایه بیشتر است (عدم امکان معامله!)",
    slWarningLong: "حد ضرر برای معاملات خرید باید کمتر از قیمت ورود باشد.",
    slWarningShort: "حد ضرر برای معاملات فروش باید بیشتر از قیمت ورود باشد.",
    tpWarningLong: "حد سود برای معاملات خرید باید بیشتر از قیمت ورود باشد.",
    tpWarningShort: "حد سود برای معاملات فروش باید کمتر از قیمت ورود باشد.",
    pnlImpact: "تاثیر کارمزد بر سود و زیان",
    feesPaid: "مجموع کارمزد رفت‌وبرگشت",
    valuePerTick: "ارزش حرکت ۱٪ قیمت دارایی",
    collapsibleOpen: "تنظیم کارمزد معاملاتی",
    collapsibleClose: "پنهان کردن تنظیمات کارمزد",
  }
};

export default function PositionCalculator({ initialCapital, lang }: PositionCalculatorProps) {
  const isRtl = lang === 'fa';
  const t = TRANSLATIONS[lang || 'en'];
  const lt = LOCAL_T[lang || 'en'];

  // State Inputs
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [capital, setCapital] = useState<string>(initialCapital?.toString() || '10000');
  const [riskPct, setRiskPct] = useState<string>('1');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [leverage, setLeverage] = useState<string>('1');
  
  // Fees states
  const [showFeesConfig, setShowFeesConfig] = useState<boolean>(false);
  const [feeType, setFeeType] = useState<'free' | 'maker' | 'taker' | 'spot' | 'custom'>('taker');
  const [customFeeVal, setCustomFeeVal] = useState<string>('0.075');
  const [feePct, setFeePct] = useState<number>(0.05);

  // Sync capital with initialCapital
  useEffect(() => {
    if (initialCapital) {
      setCapital(initialCapital.toString());
    }
  }, [initialCapital]);

  // Update calculated fee rate whenever presets or custom inputs change
  useEffect(() => {
    switch (feeType) {
      case 'free':
        setFeePct(0);
        break;
      case 'maker':
        setFeePct(0.02);
        break;
      case 'taker':
        setFeePct(0.05);
        break;
      case 'spot':
        setFeePct(0.10);
        break;
      case 'custom':
        const parsed = parseFloat(customFeeVal);
        setFeePct(isNaN(parsed) || parsed < 0 ? 0 : parsed);
        break;
    }
  }, [feeType, customFeeVal]);

  // Calculation Outputs
  const [maxLoss, setMaxLoss] = useState<number | null>(null);
  const [positionQty, setPositionQty] = useState<number | null>(null);
  const [notionalSize, setNotionalSize] = useState<number | null>(null);
  const [requiredMargin, setRequiredMargin] = useState<number | null>(null);
  const [rrRatio, setRrRatio] = useState<number | null>(null);

  const [totalFeesAtSL, setTotalFeesAtSL] = useState<number>(0);
  const [totalFeesAtTP, setTotalFeesAtTP] = useState<number>(0);
  const [grossProfit, setGrossProfit] = useState<number | null>(null);
  const [netProfit, setNetProfit] = useState<number | null>(null);
  const [netLoss, setNetLoss] = useState<number | null>(null);
  const [valuePer1PercentMove, setValuePer1PercentMove] = useState<number | null>(null);

  // Validation feedback states
  const [slWarning, setSlWarning] = useState<string | null>(null);
  const [tpWarning, setTpWarning] = useState<string | null>(null);

  // Calculate live workstation metrics
  useEffect(() => {
    const cap = parseFloat(capital);
    const rPct = parseFloat(riskPct);
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const target = parseFloat(targetPrice);
    const lev = parseFloat(leverage) || 1;
    const isLong = direction === 'long';

    // Clear warnings
    setSlWarning(null);
    setTpWarning(null);

    if (
      isNaN(cap) || cap <= 0 ||
      isNaN(rPct) || rPct < 0 || rPct > 100 ||
      isNaN(entry) || entry <= 0 ||
      isNaN(stop) || stop <= 0 ||
      entry === stop
    ) {
      setMaxLoss(null);
      setPositionQty(null);
      setNotionalSize(null);
      setRequiredMargin(null);
      setRrRatio(null);
      setGrossProfit(null);
      setNetProfit(null);
      setNetLoss(null);
      setValuePer1PercentMove(null);
      return;
    }

    // Directional validation checks & warning messages
    if (isLong && stop >= entry) {
      setSlWarning(lt.slWarningLong);
      setMaxLoss(null);
      setPositionQty(null);
      setNotionalSize(null);
      setRequiredMargin(null);
      setRrRatio(null);
      setGrossProfit(null);
      setNetProfit(null);
      setNetLoss(null);
      setValuePer1PercentMove(null);
      return;
    }
    if (!isLong && stop <= entry) {
      setSlWarning(lt.slWarningShort);
      setMaxLoss(null);
      setPositionQty(null);
      setNotionalSize(null);
      setRequiredMargin(null);
      setRrRatio(null);
      setGrossProfit(null);
      setNetProfit(null);
      setNetLoss(null);
      setValuePer1PercentMove(null);
      return;
    }

    // 1. Raw Allowed Capital Loss
    const computedMaxLoss = cap * (rPct / 100);

    // 2. Unit Risk
    const riskPerUnit = Math.abs(entry - stop);

    // 3. Position Quantity
    const computedQty = computedMaxLoss / riskPerUnit;

    // 4. Notional Value
    const computedNotional = computedQty * entry;

    // 5. Margin Locked Up
    const computedMargin = computedNotional / lev;

    // 6. 1% Price Move value
    const calculatedValue1Pct = computedNotional * 0.01;

    // 7. Commissions & Fees Round-trip
    const buyCommission = computedNotional * (feePct / 100);
    const sellCommissionAtSL = (computedQty * stop) * (feePct / 100);
    const feesAtSL = buyCommission + sellCommissionAtSL;

    // Save States
    setMaxLoss(computedMaxLoss);
    setPositionQty(computedQty);
    setNotionalSize(computedNotional);
    setRequiredMargin(computedMargin);
    setValuePer1PercentMove(calculatedValue1Pct);
    setTotalFeesAtSL(feesAtSL);
    setNetLoss(computedMaxLoss + feesAtSL);

    // Optional Take Profit Calculations
    if (!isNaN(target) && target > 0) {
      const isTpValid = isLong ? target > entry : target < entry;
      if (!isTpValid) {
        setTpWarning(isLong ? lt.tpWarningLong : lt.tpWarningShort);
        setRrRatio(null);
        setGrossProfit(null);
        setNetProfit(null);
      } else {
        const rewardPerUnit = Math.abs(entry - target);
        const computedRR = rewardPerUnit / riskPerUnit;
        const computedGrossProfit = computedQty * rewardPerUnit;
        const sellCommissionAtTP = (computedQty * target) * (feePct / 100);
        const feesAtTP = buyCommission + sellCommissionAtTP;

        setRrRatio(computedRR);
        setGrossProfit(computedGrossProfit);
        setTotalFeesAtTP(feesAtTP);
        setNetProfit(computedGrossProfit - feesAtTP);
      }
    } else {
      setRrRatio(null);
      setGrossProfit(null);
      setNetProfit(null);
    }

  }, [capital, riskPct, entryPrice, stopLoss, targetPrice, leverage, direction, feePct, lt]);

  // Presets
  const riskPresets = [0.5, 1, 2, 3, 5];
  const leveragePresets = [1, 3, 5, 10, 20, 50, 100];

  const isValid = maxLoss !== null && positionQty !== null && notionalSize !== null && requiredMargin !== null;
  const parsedCapital = parseFloat(capital) || 10000;
  
  // Calculate margin usage percentage
  const marginUsagePct = requiredMargin && parsedCapital > 0 
    ? Math.min((requiredMargin / parsedCapital) * 100, 200) 
    : 0;

  // Determine R:R rating color classes
  const getRrColorClasses = (ratio: number) => {
    if (ratio >= 3.0) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (ratio >= 1.5) return 'text-primary border-primary/30 bg-primary/10';
    if (ratio >= 1.0) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-secondary border-secondary/30 bg-secondary/10';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* View Header */}
      <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl shadow-xl shadow-surface-container-lowest/20">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? 'md:flex-row-reverse text-right' : 'text-left'}`}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-3xl">calculate</span>
            </span>
            <div>
              <h1 className="text-xl font-black text-on-surface uppercase tracking-wider font-sans">{t.riskCalcTitle}</h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {t.riskCalcDesc}
              </p>
            </div>
          </div>
          
          {/* Quick Stats Banner inside Header */}
          <div className={`flex gap-3 text-xs bg-surface-container-high border border-outline-variant p-3 rounded-xl font-mono ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div>
              <span className="text-on-surface-variant block text-[10px] uppercase">{isRtl ? 'موجودی کل' : 'Balance'}</span>
              <span className="text-on-surface font-bold text-sm">${parsedCapital.toLocaleString('en-US')}</span>
            </div>
            <div className="border-r border-outline-variant mx-1"></div>
            <div>
              <span className="text-on-surface-variant block text-[10px] uppercase">{isRtl ? 'ریسک انتخابی' : 'Risk Target'}</span>
              <span className="text-secondary font-bold text-sm">{riskPct}% (${(parsedCapital * (parseFloat(riskPct) / 100 || 0)).toLocaleString('en-US')})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Inputs Form (Span 7) */}
        <div className="lg:col-span-7 bg-surface-container-low border border-outline-variant p-6 rounded-2xl shadow-lg space-y-6">
          
          {/* Segmented Long / Short Selector */}
          <div className="space-y-2">
            <label className={`text-[10px] font-bold tracking-wider text-on-surface-variant uppercase block ${isRtl ? 'text-right' : 'text-left'}`}>
              {lt.direction}
            </label>
            <div className="bg-surface-container p-1 rounded-xl border border-outline-variant flex gap-1">
              <button
                type="button"
                onClick={() => setDirection('long')}
                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  direction === 'long'
                    ? 'bg-primary/20 border border-primary text-primary shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : 'bg-transparent border border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">trending_up</span>
                {lt.long}
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  direction === 'short'
                    ? 'bg-secondary/20 border border-secondary text-secondary shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : 'bg-transparent border border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">trending_down</span>
                {lt.short}
              </button>
            </div>
          </div>

          {/* Account Capital Input */}
          <div className="space-y-2">
            <label className={`text-[10px] font-bold tracking-wider text-on-surface-variant uppercase flex justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span>{t.accountCapital}</span>
              <span className="text-primary font-mono text-[9px] uppercase">{isRtl ? 'الزامی' : 'required'}</span>
            </label>
            <div className="relative">
              <span className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant`}>$</span>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="10,000"
                className={`w-full bg-surface-container border border-outline-variant rounded-xl ${isRtl ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4 text-left'} py-3 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-all placeholder:text-on-surface-variant/20`}
              />
            </div>
          </div>

          {/* Risk Percentage Inputs & Presets */}
          <div className="space-y-2">
            <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
              <label className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
                {t.desiredRisk}
              </label>
              <span className="text-[10px] font-mono text-secondary font-bold">
                {parseFloat(capital) && parseFloat(riskPct)
                  ? `${isRtl ? 'ریسک:' : 'Total Risk:'} $${(parseFloat(capital) * (parseFloat(riskPct) / 100 || 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                  : ''}
              </span>
            </div>
            <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  value={riskPct}
                  onChange={(e) => setRiskPct(e.target.value)}
                  placeholder="1.0"
                  className={`w-full bg-surface-container border border-outline-variant rounded-xl ${isRtl ? 'pr-4 pl-10 text-right' : 'pl-4 pr-10 text-left'} py-3 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-all placeholder:text-on-surface-variant/20`}
                />
                <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant`}>%</span>
              </div>
              <div className={`flex gap-1.5 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {riskPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRiskPct(preset.toString())}
                    className={`px-3 text-[10px] font-extrabold rounded-xl border transition-all cursor-pointer ${
                      parseFloat(riskPct) === preset
                        ? 'bg-primary/15 border-primary text-primary shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entry, Stop Loss & Take Profit Section */}
          <div className="space-y-3">
            {/* Entry Price */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold tracking-wider text-on-surface-variant uppercase block ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'قیمت ورود ($)' : 'Entry Price ($)'}
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00"
                className={`w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-xs font-semibold text-on-surface focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/25 transition-all placeholder:text-on-surface-variant/20 ${isRtl ? 'text-right' : 'text-left'}`}
              />
            </div>

            {/* Stop Loss & Target Price Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Stop Loss */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold tracking-wider text-on-surface-variant uppercase block ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'قیمت حد ضرر (SL)' : 'Stop Loss Price (SL)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="0.00"
                  className={`w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-xs font-semibold text-on-surface focus:outline-none transition-all placeholder:text-on-surface-variant/20 ${
                    slWarning 
                      ? 'border-secondary/50 focus:border-secondary focus:ring-1 focus:ring-secondary/25' 
                      : 'border-outline-variant focus:border-secondary/80 focus:ring-1 focus:ring-secondary/25'
                  } ${isRtl ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold tracking-wider text-on-surface-variant uppercase block ${isRtl ? 'text-right' : 'text-left'}`}>
                  {lt.targetPriceLabel}
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="0.00"
                  className={`w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-xs font-semibold text-on-surface focus:outline-none transition-all placeholder:text-on-surface-variant/20 ${
                    tpWarning 
                      ? 'border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25' 
                      : 'border-outline-variant focus:border-primary/80 focus:ring-1 focus:ring-primary/25'
                  } ${isRtl ? 'text-right' : 'text-left'}`}
                />
              </div>
            </div>

            {/* Error & Warning Notices */}
            {slWarning && (
              <p className={`text-[10px] font-bold text-secondary flex items-center gap-1.5 mt-1.5 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <span className="material-symbols-outlined text-[13px]">gpp_maybe</span>
                {slWarning}
              </p>
            )}
            {tpWarning && (
              <p className={`text-[10px] font-bold text-amber-500 flex items-center gap-1.5 mt-1.5 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <span className="material-symbols-outlined text-[13px]">info</span>
                {tpWarning}
              </p>
            )}
          </div>

          {/* Leverage Slider & Field */}
          <div className="space-y-2">
            <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
              <label className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
                {t.leverage}
              </label>
              <span className="text-[9px] text-on-surface-variant/60 font-mono">
                {isRtl ? 'کاهش وثیقه معاملاتی (Margin)' : 'Reduces collateral requirements'}
              </span>
            </div>
            <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="125"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  placeholder="1"
                  className={`w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-all placeholder:text-on-surface-variant/20 ${isRtl ? 'text-right' : 'text-left'}`}
                />
                <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant`}>x</span>
              </div>
              <div className={`flex gap-1 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {leveragePresets.map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setLeverage(lev.toString())}
                    className={`px-3.5 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                      parseInt(leverage) === lev
                        ? 'bg-primary/15 border-primary text-primary'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible Commission & Fee Input */}
          <div className="border border-outline-variant/60 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFeesConfig(!showFeesConfig)}
              className="w-full bg-surface-container px-4 py-3 flex items-center justify-between text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">percent</span>
                {lt.feesConfig}
                <span className="text-[10px] font-mono font-normal text-on-surface-variant">
                  ({feePct.toFixed(3)}%)
                </span>
              </span>
              <span className="material-symbols-outlined text-sm transition-transform duration-200">
                {showFeesConfig ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            
            {showFeesConfig && (
              <div className="p-4 bg-surface-container/35 border-t border-outline-variant/60 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeeType('free')}
                    className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                      feeType === 'free'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {isRtl ? 'بدون کارمزد' : 'Zero (0%)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeType('maker')}
                    className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                      feeType === 'maker'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {isRtl ? 'میکر فی' : 'Maker (0.02%)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeType('taker')}
                    className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                      feeType === 'taker'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {isRtl ? 'تیکر فی' : 'Taker (0.05%)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeType('spot')}
                    className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                      feeType === 'spot'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {isRtl ? 'اسپات' : 'Spot (0.10%)'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFeeType('custom')}
                    className={`px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                      feeType === 'custom'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {isRtl ? 'دلخواه %' : 'Custom %'}
                  </button>
                  
                  <input
                    type="number"
                    step="0.001"
                    disabled={feeType !== 'custom'}
                    value={customFeeVal}
                    onChange={(e) => setCustomFeeVal(e.target.value)}
                    placeholder="0.075"
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[10px] font-mono font-bold text-on-surface disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Calculated Outputs (Span 5) */}
        <div className="lg:col-span-5 bg-surface-container-low border border-outline-variant p-6 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h2 className={`text-xs font-black text-on-surface uppercase tracking-wider border-b border-outline-variant/40 pb-2 mb-5 flex items-center gap-2 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <span className="material-symbols-outlined text-base text-primary">assessment</span>
              {isRtl ? 'محاسبات و ارزیابی ریسک' : 'Calculated Metrics'}
            </h2>

            {isValid ? (
              <div className="space-y-5">
                
                {/* 1. Primary Metrics Table */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Position Quantity */}
                  <div className={`bg-surface-container p-4 rounded-xl border border-outline-variant/60 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <p className="text-[9px] font-extrabold tracking-widest text-on-surface-variant uppercase">
                      {t.positionQty}
                    </p>
                    <p className="text-xl font-black text-primary mt-1 font-mono leading-none">
                      {positionQty!.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </p>
                    <span className="text-[8px] font-semibold text-on-surface-variant/60 block mt-1.5">
                      {isRtl ? 'تعداد واحدهای خرید/فروش' : 'Units to hold'}
                    </span>
                  </div>

                  {/* Risk Reward Ratio metric */}
                  <div className={`bg-surface-container p-4 rounded-xl border border-outline-variant/60 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <p className="text-[9px] font-extrabold tracking-widest text-on-surface-variant uppercase">
                      {lt.rrRatio}
                    </p>
                    {rrRatio !== null ? (
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-on-surface font-mono">
                          1 : {rrRatio.toFixed(2)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${getRrColorClasses(rrRatio)}`}>
                          {rrRatio >= 2.0 ? 'Pro' : 'Low'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-on-surface-variant/40 mt-1">--</p>
                    )}
                    <span className="text-[8px] font-semibold text-on-surface-variant/60 block mt-1.5">
                      {isRtl ? 'نسبت بازدهی به خطر' : 'Reward per unit of risk'}
                    </span>
                  </div>
                </div>

                {/* 2. Dynamic Profit vs Loss Visual Card */}
                <div className="bg-surface-container p-4.5 rounded-xl border border-outline-variant/60 space-y-3.5">
                  <div className="grid grid-cols-2 gap-3 divide-x divide-outline-variant/40">
                    {/* Expected Profit */}
                    <div className={`px-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                      <span className="text-[9px] font-bold text-primary tracking-wider uppercase block">
                        {isRtl ? 'سود خالص (TP)' : 'Net Profit (TP)'}
                      </span>
                      {netProfit !== null ? (
                        <div>
                          <span className="text-lg font-black text-primary font-mono block mt-1">
                            +${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[8px] text-on-surface-variant/50 block font-mono">
                            {lt.grossProfit}: ${grossProfit!.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-on-surface-variant/40 block mt-1">--</span>
                      )}
                    </div>

                    {/* Expected Loss */}
                    <div className="px-4 text-left">
                      <span className="text-[9px] font-bold text-secondary tracking-wider uppercase block">
                        {isRtl ? 'ضرر خالص (SL)' : 'Net Loss (SL)'}
                      </span>
                      {netLoss !== null ? (
                        <div>
                          <span className="text-lg font-black text-secondary font-mono block mt-1">
                            -${netLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[8px] text-on-surface-variant/50 block font-mono">
                            {lt.grossLoss}: ${maxLoss!.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-on-surface-variant/40 block mt-1">--</span>
                      )}
                    </div>
                  </div>

                  {/* Commission Paid row */}
                  {feePct > 0 && (
                    <div className={`flex justify-between items-center text-[10px] bg-surface-container-high border border-outline-variant/40 p-2.5 rounded-lg ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="text-on-surface-variant font-medium">{lt.feesPaid}:</span>
                      <span className="font-bold text-amber-500 font-mono">
                        {netProfit !== null 
                          ? `$${totalFeesAtTP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `$${totalFeesAtSL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Detailed Financial Sizes */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Position Value / Notional */}
                  <div className={`bg-surface-container p-3.5 rounded-xl border border-outline-variant/60 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase">
                      {t.positionValue}
                    </p>
                    <p className="text-sm font-black text-on-surface mt-1 font-mono">
                      ${notionalSize!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[8px] text-on-surface-variant/60 mt-0.5">{isRtl ? 'ارزش اسمی موقعیت' : 'Notional size'}</p>
                  </div>

                  {/* Required Margin */}
                  <div className={`bg-surface-container p-3.5 rounded-xl border border-outline-variant/60 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase">
                      {t.requiredMargin}
                    </p>
                    <p className="text-sm font-black text-on-surface mt-1 font-mono">
                      ${requiredMargin!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[8px] text-on-surface-variant/60 mt-0.5">
                      {isRtl ? `با اهرم ${leverage}x` : `At ${leverage}x leverage`}
                    </p>
                  </div>
                </div>

                {/* 4. Horizontal Progress Indicators (Visual Risk Bar & Margin utilization) */}
                <div className="space-y-4 pt-2 border-t border-outline-variant/30">
                  
                  {/* Progress Meter A: Margin Utilization */}
                  <div className="space-y-1.5">
                    <div className={`flex justify-between items-center text-[10px] ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="font-bold text-on-surface-variant">{lt.marginUtilization}</span>
                      <span className={`font-mono font-bold ${
                        marginUsagePct > 100 ? 'text-secondary animate-pulse' : 'text-on-surface'
                      }`}>
                        {marginUsagePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-outline-variant/60 relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          marginUsagePct > 100 
                            ? 'bg-secondary shadow-[0_0_8px_#ef4444]' 
                            : marginUsagePct > 75 
                            ? 'bg-orange-500' 
                            : marginUsagePct > 25 
                            ? 'bg-amber-400' 
                            : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(marginUsagePct, 100)}%` }}
                      />
                    </div>
                    {/* Over Leverage Indicator Warning */}
                    {marginUsagePct > 100 && (
                      <div className={`text-[9px] font-black text-secondary flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="material-symbols-outlined text-[12px] animate-bounce">warning</span>
                        {lt.marginCall}
                      </div>
                    )}
                  </div>

                  {/* Progress Meter B: Risk vs Reward Zones */}
                  {rrRatio !== null && (
                    <div className="space-y-1.5">
                      <div className={`flex justify-between items-center text-[10px] ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="font-bold text-on-surface-variant">{lt.riskRewardBalance}</span>
                        <span className="font-mono text-[9px] text-primary">R:R = 1:{rrRatio.toFixed(1)}</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-outline-variant/60 flex">
                        {/* Risk segment (Red) */}
                        <div 
                          className="bg-secondary/80 transition-all duration-300"
                          style={{ width: `${(1 / (1 + rrRatio)) * 100}%` }}
                          title="Risk Zone"
                        />
                        {/* Reward segment (Green) */}
                        <div 
                          className="bg-primary/80 transition-all duration-300"
                          style={{ width: `${(rrRatio / (1 + rrRatio)) * 100}%` }}
                          title="Reward Zone"
                        />
                      </div>
                      <div className={`flex justify-between text-[8px] font-mono font-bold text-on-surface-variant/60 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-secondary">{lt.grossLoss}</span>
                        <span className="text-primary">{lt.grossProfit}</span>
                      </div>
                    </div>
                  )}

                  {/* 1% movement value info */}
                  {valuePer1PercentMove !== null && (
                    <div className={`bg-surface-container-high/50 p-2.5 rounded-lg border border-outline-variant/40 space-y-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                      <div className={`flex justify-between items-center text-[10px] font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-on-surface">{lt.pipValue}</span>
                        <span className="text-primary font-mono">${valuePer1PercentMove.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-[8px] text-on-surface-variant/60 leading-normal">
                        {lt.pipValueDesc}
                      </p>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-outline-variant rounded-xl h-72 bg-surface-container/20">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 mb-3 animate-pulse">
                  calculate
                </span>
                <p className="text-xs font-bold text-on-surface-variant/80">{t.pendingCalculation}</p>
                <p className="text-[10px] text-on-surface-variant/50 mt-1.5 max-w-xs leading-relaxed">
                  {t.pendingDesc}
                </p>
              </div>
            )}
          </div>

          {/* Quick instructions / tips */}
          <div className={`bg-surface-container border border-outline-variant/60 p-4 rounded-xl text-[10px] text-on-surface-variant leading-relaxed space-y-1.5 mt-6 shadow-inner ${isRtl ? 'text-right' : 'text-left'}`}>
            <p className={`font-bold text-on-surface flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span className="material-symbols-outlined text-[13px] text-primary">gpp_good</span>
              {t.riskPrincipleTitle}
            </p>
            <p>
              {isRtl ? (
                <>
                  هرگز بیش از <span className="text-primary font-bold">۱٪ الی ۲٪</span> از سرمایه خود را در یک معامله به خطر نیندازید. اهرم (Leverage) زیان مطلق شما را تغییر نمی‌دهد، بلکه صرفاً مارجین مورد نیاز برای وثیقه معامله را کاهش می‌دهد.
                </>
              ) : (
                <>
                  Never risk more than <span className="text-primary font-bold">1% to 2%</span> of your capital on a single workstation trade. Leverage does not change your absolute loss amount, it only reduces the required collateral margin.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
