/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TRANSLATIONS } from '../utils/translations';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  username: string;
  alertCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  lang: 'en' | 'fa';
  onLanguageChange: (lang: 'en' | 'fa') => void;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  username,
  alertCount,
  onOpenNotifications,
  onOpenProfile,
  lang,
  onLanguageChange,
}: HeaderProps) {
  const isRtl = lang === 'fa';
  const t = TRANSLATIONS[lang];

  return (
    <header className={`w-full h-16 sticky top-0 z-40 bg-surface-container border-b border-outline-variant flex justify-between items-center px-6 select-none ${isRtl ? 'flex-row-reverse' : ''}`}>
      {/* Search Input Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full group">
          <span className={`absolute inset-y-0 ${isRtl ? 'right-3' : 'left-3'} flex items-center text-on-surface-variant pointer-events-none`}>
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 ${isRtl ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} text-xs font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all`}
            placeholder={t.searchPlaceholder}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs cursor-pointer`}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Right side indicators */}
      <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        {/* Dynamic Alerts Pill */}
        <button
          onClick={onOpenNotifications}
          className={`flex items-center px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant cursor-pointer hover:bg-surface-container-highest transition-colors active:opacity-80 ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <span className={`material-symbols-outlined text-primary text-lg ${isRtl ? 'ml-2' : 'mr-2'}`}>notifications</span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-on-surface">
            {alertCount} {alertCount === 1 ? t.alert : t.alerts}
          </span>
        </button>

        {/* User Profile Quick Tag */}
        <div
          onClick={onOpenProfile}
          className={`flex items-center gap-3 ${isRtl ? 'pr-4 border-r' : 'pl-4 border-l'} border-outline-variant cursor-pointer p-1 rounded-lg hover:bg-surface-container-high transition-colors select-none ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <div className={`${isRtl ? 'text-left' : 'text-right'} hidden sm:block`}>
            <p className="text-xs font-bold text-on-surface leading-none">{username}</p>
            <p className="text-[9px] font-bold text-primary mt-1.5 uppercase tracking-wider">
              {isRtl ? 'معامله‌گر حرفه‌ای' : 'PRO TRADER'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
            {username.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
