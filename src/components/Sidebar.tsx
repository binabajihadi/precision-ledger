/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TRANSLATIONS } from '../utils/translations';

interface SidebarProps {
  currentView: 'dashboard' | 'tradelog' | 'addtrade' | 'settings' | 'calculator';
  setCurrentView: (view: 'dashboard' | 'tradelog' | 'addtrade' | 'settings' | 'calculator') => void;
  onOpenHelp: () => void;
  onLogout: () => void;
  lang: 'en' | 'fa';
  onLanguageChange: (lang: 'en' | 'fa') => void;
  userEmail?: string;
}

export default function Sidebar({
  currentView,
  setCurrentView,
  onOpenHelp,
  onLogout,
  lang,
  onLanguageChange,
  userEmail = 'trader@precisionledger.com',
}: SidebarProps) {
  const isRtl = lang === 'fa';
  const t = TRANSLATIONS[lang];

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: 'dashboard' },
    { id: 'tradelog', label: t.tradeLog, icon: 'format_list_bulleted' },
    { id: 'addtrade', label: t.addTrade, icon: 'add_chart' },
    { id: 'calculator', label: t.riskCalc, icon: 'calculate' },
    { id: 'settings', label: t.settings, icon: 'settings' },
  ] as const;

  return (
    <aside className={`h-screen w-64 fixed ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} top-0 bg-surface-container-low border-outline-variant flex flex-col py-6 z-50 select-none`}>
      {/* Brand Header */}
      <div className={`px-6 mb-4 flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="bg-primary w-2 h-10 rounded-sm shrink-0"></div>
        <div className="min-w-0">
          {isRtl ? (
            <h1 className="text-sm font-black text-on-surface tracking-normal leading-tight">
              دفترچه معاملات <span className="text-primary">دقیق</span>
            </h1>
          ) : (
            <h1 className="text-base font-black text-on-surface tracking-wider">
              PRECISION<span className="text-primary">LEDGER</span>
            </h1>
          )}
          
          <div className={`flex flex-wrap gap-1.5 text-[8px] font-mono text-on-surface-variant uppercase tracking-widest mt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="px-1 py-0.2 border border-outline-variant/60 rounded">IDB 2.0</span>
            <span className="px-1 py-0.2 border border-outline-variant/60 rounded text-primary font-bold">{t.active}</span>
          </div>

          {/* Email removed as requested */}
        </div>
      </div>

      <div className="px-4 mb-4 border-b border-outline-variant/30 pb-3"></div>

      {/* Language Quick Toggle */}
      <div className="px-4 mb-5">
        <div className="flex bg-surface-container border border-outline-variant rounded-lg p-0.5">
          <button
            onClick={() => onLanguageChange('en')}
            className={`flex-1 text-[9px] font-bold py-1 rounded transition-all cursor-pointer ${
              lang === 'en'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            English
          </button>
          <button
            onClick={() => onLanguageChange('fa')}
            className={`flex-1 text-[9px] font-bold py-1 rounded transition-all cursor-pointer ${
              lang === 'fa'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            فارسی
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all active:scale-95 duration-150 group cursor-pointer ${isRtl ? 'text-right flex-row-reverse' : 'text-left'} ${
                isActive
                  ? 'text-primary font-bold bg-surface-container-high ' + (isRtl ? 'border-l-4 border-primary' : 'border-r-4 border-primary')
                  : 'text-on-surface-variant font-medium hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl transition-colors duration-150"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-xs font-semibold tracking-wide uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer Support/Logout actions */}
      <div className="px-3 border-t border-outline-variant pt-4 mt-auto space-y-1">
        <button
          onClick={onOpenHelp}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-highest hover:text-on-surface transition-all active:scale-95 duration-150 cursor-pointer ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
        >
          <span className="material-symbols-outlined text-xl">help</span>
          <span className="text-xs font-semibold tracking-wide uppercase">{t.help}</span>
        </button>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-highest hover:text-error transition-all active:scale-95 duration-150 cursor-pointer ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
        >
          <span className="material-symbols-outlined text-xl group-hover:text-error">logout</span>
          <span className="text-xs font-semibold tracking-wide uppercase">{t.logout}</span>
        </button>

        {/* Sidebar Copyright Footer */}
        <div className="pt-4 border-t border-outline-variant/20 mt-3 text-center">
          <p className="text-[9px] text-slate-500 font-medium tracking-wide">
            © 2026 Hadi Binabaji. All rights reserved.
          </p>
          <p className="text-[8px] text-slate-600 mt-0.5 font-medium uppercase tracking-wider">
            Designed and Developed for Professional Traders.
          </p>
        </div>
      </div>
    </aside>
  );
}
