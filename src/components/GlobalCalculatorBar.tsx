/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';

interface GlobalCalculatorBarProps {
  initialCapital: number;
  onUpdateCapital?: (val: number) => void;
  lang?: 'en' | 'fa';
  onApplyToForm?: (data: {
    entryPrice: number;
    stopLoss: number;
    leverage: number;
    riskPct: number;
    quantity: number;
  }) => void;
}

export default function GlobalCalculatorBar({
  initialCapital,
  onUpdateCapital,
  lang = 'en',
  onApplyToForm,
}: GlobalCalculatorBarProps) {
  const isRtl = lang === 'fa';

  // State for visibility
  const [isExpanded, setIsExpanded] = useState(true);

  // Input states
  const [capital, setCapital] = useState<string>(initialCapital?.toString() || '10000');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [leverage, setLeverage] = useState<string>('10');
  const [riskPct, setRiskPct] = useState<string>('1');

  // Visual feedback and action lock-in
  const [isApplying, setIsApplying] = useState(false);

  // Keep capital in sync if initialCapital updates from parent
  useEffect(() => {
    if (initialCapital) {
      setCapital(initialCapital.toString());
    }
  }, [initialCapital]);

  // Update parent capital if changed in this calculator bar
  const handleCapitalChange = (val: string) => {
    setCapital(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && onUpdateCapital) {
      onUpdateCapital(num);
    }
  };

  // Perform dynamic calculations
  const metrics = useMemo(() => {
    const cap = parseFloat(capital) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopLoss) || 0;
    const lev = parseFloat(leverage) || 1;
    const risk = parseFloat(riskPct) || 0;

    if (cap <= 0 || entry <= 0 || stop <= 0 || risk < 0 || entry === stop) {
      return {
        maxLoss: 0,
        positionQty: 0,
        requiredMargin: 0,
        notionalSize: 0,
        isValid: false,
      };
    }

    // Math Logic:
    // 1. Max Loss Allowed ($) = Capital * (Risk % / 100)
    const maxLoss = cap * (risk / 100);

    // 2. Risk per unit = |Entry - Stop|
    const riskPerUnit = Math.abs(entry - stop);

    // 3. Position Size Quantity = Max Loss / Risk per Unit
    const positionQty = maxLoss / riskPerUnit;

    // 4. Total position value (Notional) = Quantity * Entry Price
    const notionalSize = positionQty * entry;

    // 5. Required Margin = Total Position Value / Leverage
    const requiredMargin = notionalSize / lev;

    return {
      maxLoss,
      positionQty,
      requiredMargin,
      notionalSize,
      isValid: true,
    };
  }, [capital, entryPrice, stopLoss, leverage, riskPct]);

  // Translations object specific to this bar
  const t = {
    en: {
      barTitle: "Live Position size & Margin calculator",
      capital: "Total Capital ($)",
      entry: "Entry Price ($)",
      stop: "Stop Loss ($)",
      leverage: "Leverage (x)",
      risk: "Risk (%)",
      reqMargin: "Required Margin",
      posSize: "Position Size (Qty)",
      maxLoss: "Max Loss",
      invalidTip: "Enter entry, stop, & capital to calculate...",
      copyBtn: "Copy Size",
      copied: "Copied!",
      placeholder: "e.g. 10000",
      applyBtn: "Apply to Form",
      applied: "Applied!",
    },
    fa: {
      barTitle: "محاسبه‌گر زنده حجم معامله و مارجین مورد نیاز",
      capital: "سرمایه کل حساب ($)",
      entry: "قیمت ورود ($)",
      stop: "حد ضرر ($)",
      leverage: "اهرم معاملاتی (x)",
      risk: "درصد ریسک (%)",
      reqMargin: "مارجین مورد نیاز",
      posSize: "حجم معامله (تعداد)",
      maxLoss: "حداکثر ضرر مجاز",
      invalidTip: "برای محاسبه، قیمت ورود، حد ضرر و سرمایه را وارد کنید...",
      copyBtn: "کپی حجم",
      copied: "کپی شد!",
      placeholder: "نمونه: 10000",
      applyBtn: "اعمال روی فرم",
      applied: "اعمال شد!",
    },
  }[lang];

  const handleApplyToForm = () => {
    if (!metrics.isValid || !onApplyToForm || isApplying) return;

    // Trigger visual feedback
    setIsApplying(true);

    // Wait 1 second (1000ms) for the flash transition, then propagate, collapse, and reset
    setTimeout(() => {
      onApplyToForm({
        entryPrice: parseFloat(entryPrice) || 0,
        stopLoss: parseFloat(stopLoss) || 0,
        leverage: parseFloat(leverage) || 10,
        riskPct: parseFloat(riskPct) || 1,
        quantity: metrics.positionQty,
      });

      // Clear input fields so they are fresh
      setEntryPrice('');
      setStopLoss('');
      setLeverage('10');
      setRiskPct('1');

      // Collapse the panel
      setIsExpanded(false);
      setIsApplying(false);
    }, 1000);
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (val: number, label: string) => {
    if (!metrics.isValid) return;
    navigator.clipboard.writeText(val.toFixed(4));
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="w-full bg-surface-container-high border border-outline/35 rounded-xl shadow-lg transition-all duration-300 overflow-hidden mb-6">
      {/* Bar Header Header / Toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex justify-between items-center px-5 py-3 cursor-pointer select-none hover:bg-surface-container-highest/50 transition-colors ${
          isRtl ? 'flex-row-reverse' : ''
        }`}
      >
        <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="material-symbols-outlined text-tertiary text-xl">calculate</span>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            {t.barTitle}
          </span>
          {metrics.isValid && (
            <span className="animate-pulse flex h-2 w-2 rounded-full bg-primary"></span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
          </span>
        </div>
      </div>

      {/* Inputs and outputs layout wrapper */}
      {isExpanded && (
        <div className="p-5 border-t border-outline/20 bg-surface-container-low">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
            
            {/* Inputs Panel (8 Cols) */}
            <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              {/* Capital */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-[9px] font-bold text-on-surface-variant uppercase tracking-wider ${isRtl ? 'text-right' : ''}`}>
                  {t.capital}
                </label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface-variant`}>$</span>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => handleCapitalChange(e.target.value)}
                    placeholder={t.placeholder}
                    className={`w-full bg-surface-container border border-outline-variant rounded-lg py-2 ${isRtl ? 'pr-6 pl-2.5 text-right' : 'pl-6 pr-2.5 text-left'} text-xs font-semibold text-on-surface focus:outline-none focus:border-primary transition-colors`}
                  />
                </div>
              </div>

              {/* Entry Price */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-[9px] font-bold text-on-surface-variant uppercase tracking-wider ${isRtl ? 'text-right' : ''}`}>
                  {t.entry}
                </label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface-variant`}>$</span>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="0.00"
                    className={`w-full bg-surface-container border border-outline-variant rounded-lg py-2 ${isRtl ? 'pr-6 pl-2.5 text-right' : 'pl-6 pr-2.5 text-left'} text-xs font-semibold text-on-surface focus:outline-none focus:border-primary transition-colors`}
                  />
                </div>
              </div>

              {/* Stop Loss */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-[9px] font-bold text-secondary uppercase tracking-wider ${isRtl ? 'text-right' : ''}`}>
                  {t.stop}
                </label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-[10px] font-bold text-secondary/70`}>$</span>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="0.00"
                    className={`w-full bg-surface-container border border-outline-variant rounded-lg py-2 ${isRtl ? 'pr-6 pl-2.5 text-right' : 'pl-6 pr-2.5 text-left'} text-xs font-semibold text-on-surface focus:outline-none focus:border-secondary transition-colors`}
                  />
                </div>
              </div>

              {/* Leverage */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-[9px] font-bold text-on-surface-variant uppercase tracking-wider ${isRtl ? 'text-right' : ''}`}>
                  {t.leverage}
                </label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface-variant`}>x</span>
                  <input
                    type="number"
                    min="1"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    placeholder="10"
                    className={`w-full bg-surface-container border border-outline-variant rounded-lg py-2 ${isRtl ? 'pr-2.5 pl-6 text-right' : 'pl-2.5 pr-6 text-left'} text-xs font-semibold text-on-surface focus:outline-none focus:border-primary transition-colors`}
                  />
                </div>
              </div>

              {/* Risk % */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-[9px] font-bold text-on-surface-variant uppercase tracking-wider ${isRtl ? 'text-right' : ''}`}>
                  {t.risk}
                </label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface-variant`}>%</span>
                  <input
                    type="number"
                    step="0.1"
                    value={riskPct}
                    onChange={(e) => setRiskPct(e.target.value)}
                    placeholder="1.0"
                    className={`w-full bg-surface-container border border-outline-variant rounded-lg py-2 ${isRtl ? 'pr-2.5 pl-6 text-right' : 'pl-2.5 pr-6 text-left'} text-xs font-semibold text-on-surface focus:outline-none focus:border-primary transition-colors`}
                  />
                </div>
              </div>
            </div>

            {/* Calculated Outputs Panel (4 Cols) */}
            <div className={`xl:col-span-4 border-t xl:border-t-0 ${isRtl ? 'xl:border-r xl:pr-5' : 'xl:border-l xl:pl-5'} border-outline/25 pt-4 xl:pt-0`}>
              {metrics.isValid ? (
                <div className="space-y-3.5">
                  <div className={`grid grid-cols-2 gap-3.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {/* Position Size (Quantity) */}
                    <div
                      onClick={() => handleCopy(metrics.positionQty, 'qty')}
                      className="bg-surface-container/60 hover:bg-surface-container-high border border-outline-variant p-3 rounded-lg cursor-pointer transition-all group relative"
                      title="Click to copy size"
                    >
                      <div className={`flex justify-between items-center mb-0.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[8.5px] font-bold text-primary tracking-wider uppercase">
                          {t.posSize}
                        </span>
                        <span className="material-symbols-outlined text-[11px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">content_copy</span>
                      </div>
                      <p className="text-sm font-extrabold text-on-surface font-mono truncate">
                        {metrics.positionQty.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </p>
                      {copiedField === 'qty' && (
                        <span className={`absolute bottom-1 ${isRtl ? 'left-2' : 'right-2'} text-[8px] text-primary font-bold`}>
                          {t.copied}
                        </span>
                      )}
                    </div>

                    {/* Required Margin */}
                    <div
                      onClick={() => handleCopy(metrics.requiredMargin, 'margin')}
                      className="bg-surface-container/60 hover:bg-surface-container-high border border-outline-variant p-3 rounded-lg cursor-pointer transition-all group relative"
                      title="Click to copy margin"
                    >
                      <div className={`flex justify-between items-center mb-0.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[8.5px] font-bold text-tertiary tracking-wider uppercase">
                          {t.reqMargin}
                        </span>
                        <span className="material-symbols-outlined text-[11px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">content_copy</span>
                      </div>
                      <p className="text-sm font-extrabold text-on-surface font-mono truncate">
                        ${metrics.requiredMargin.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      {copiedField === 'margin' && (
                        <span className={`absolute bottom-1 ${isRtl ? 'left-2' : 'right-2'} text-[8px] text-tertiary font-bold`}>
                          {t.copied}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Apply to Form Button with Distinct Visual Feedback */}
                  {onApplyToForm && (
                    <button
                      type="button"
                      onClick={handleApplyToForm}
                      disabled={isApplying}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        isApplying
                          ? 'bg-emerald-500 text-on-primary shadow-emerald-500/20 scale-95 border-emerald-400/30'
                          : 'bg-primary text-on-primary hover:bg-primary/95 shadow-primary/10 hover:shadow-primary/15 border border-primary/20 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="material-symbols-outlined !text-xs font-bold animate-pulse">
                        {isApplying ? 'check_circle' : 'assignment_returned'}
                      </span>
                      <span>
                        {isApplying ? t.applied : t.applyBtn}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className={`flex items-center gap-2 py-4 px-3.5 bg-surface-container/30 border border-dashed border-outline-variant/75 rounded-lg text-on-surface-variant/70 text-[10px] font-medium leading-normal ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                  <span className="material-symbols-outlined text-base text-tertiary animate-pulse">info</span>
                  <p>{t.invalidTip}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
