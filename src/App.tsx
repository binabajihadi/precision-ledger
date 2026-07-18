/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Trade, DynamicConfig, CapitalFlow, CommissionTemplate } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TradeLogView from './components/TradeLogView';
import AddTradeView from './components/AddTradeView';
import SettingsView from './components/SettingsView';
import PositionCalculator from './components/PositionCalculator';
import GlobalCalculatorBar from './components/GlobalCalculatorBar';
import ConfigModal from './components/ConfigModal';
import { INITIAL_SEEDS } from './utils/seedData';
import { TRANSLATIONS } from './utils/translations';
import { calculateTradePnlAndRoi } from './utils/calculations';

// Firebase imports
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase/config';
import { signInWithGoogle, signInWithGoogleRedirect, logout } from './firebase/auth';
import {
  saveTrade,
  deleteTrade as dbDeleteTrade,
  addTransaction,
  deleteTransaction as dbDeleteTransaction,
  saveUserSettings,
  listenTrades,
  listenTransactions,
  listenUserSettings
} from './firebase/db';

const DEFAULT_CONFIG: DynamicConfig = {
  strategies: [
    'Supply & Demand',
    'Trend Following',
    'Breakout Trend',
    'Mean Reversion',
    'Scalping',
    'Fibonacci Retracement',
    'News Catalyst'
  ],
  timeframes: ['5M', '15M', '1H', '4H', '1D'],
  confluences: [
    'EMA Cross',
    'RSI Divergence',
    'SR Flip',
    'MACD',
    'Fib Retrace',
    'Volume Profile',
    'Liquidity Grab'
  ],
  exchanges: ['Binance', 'Bybit', 'Coinbase', 'MetaTrader', 'Kraken', 'KuCoin'],
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XAUUSD', 'EURUSD', 'AAPL', 'TSLA']
};

export default function App() {
  // Authentication & Session States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sign-In Helper Methods
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Popup Auth Error:", err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup') || err.message?.includes('blocked')) {
        setAuthError('popup-blocked');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored or user closed the window
      } else {
        setAuthError(err.message || 'An authentication error occurred.');
      }
    }
  };

  const handleSignInRedirect = async () => {
    setAuthError(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      console.error("Redirect Auth Error:", err);
      setAuthError(err.message || 'An authentication error occurred during redirect.');
    }
  };

  // Navigation state
  const [currentView, setCurrentView] = useState<'dashboard' | 'tradelog' | 'addtrade' | 'settings' | 'calculator'>('dashboard');

  // Database Trades state
  const [trades, setTrades] = useState<Trade[]>([]);

  // Profile username state
  const [username, setUsername] = useState<string>('Alex Rivera');

  // Dynamic Configuration state
  const [config, setConfig] = useState<DynamicConfig>(DEFAULT_CONFIG);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Initial Capital state
  const [initialCapital, setInitialCapital] = useState<number>(10000);

  // Language state (cloud synced)
  const [lang, setLang] = useState<'en' | 'fa'>('en');

  // Shared state to bridge calculator bar and addtrade view
  const [calculatorPreset, setCalculatorPreset] = useState<any>(null);

  // Shared Global Search query (Filters trades globally across tabs)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Capital Flow state management
  const [capitalFlows, setCapitalFlows] = useState<CapitalFlow[]>([]);

  // Customizable Commission Templates state management
  const [commissionTemplates, setCommissionTemplates] = useState<CommissionTemplate[]>([
    { id: 'free', name: 'Zero Fees (Free)', ratePct: 0, fixedFee: 0 },
    { id: 'standard-crypto', name: 'Standard Crypto (0.1%)', ratePct: 0.1, fixedFee: 0 },
    { id: 'futures-fee', name: 'Futures Fee (0.05% + $1.00)', ratePct: 0.05, fixedFee: 1.0 },
    { id: 'stock-broker', name: 'Stock Broker (0.0% + $4.95)', ratePct: 0.0, fixedFee: 4.95 },
  ]);

  // Compute dynamic account equity based on initialCapital, trades, and capitalFlows
  const netPnl = useMemo(() => {
    return trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [trades]);

  const netCapitalFlows = useMemo(() => {
    return capitalFlows.reduce((sum, flow) => {
      return flow.type === 'Deposit' ? sum + flow.amount : sum - flow.amount;
    }, 0);
  }, [capitalFlows]);

  const accountEquity = useMemo(() => {
    const val = initialCapital + netPnl + netCapitalFlows;
    return val > 0 ? val : 0;
  }, [initialCapital, netPnl, netCapitalFlows]);

  // Simulator overlays
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [alertCount, setAlertCount] = useState<number>(3);

  // Firebase auth listener
  useEffect(() => {
    // Capture redirect results on mount
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((err: any) => {
        console.error("Redirect auth resolution error:", err);
        setAuthError(err.message || 'An error occurred during redirect login.');
      });

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Firebase Firestore real-time sync listeners
  useEffect(() => {
    if (!user) {
      setTrades([]);
      setCapitalFlows([]);
      return;
    }

    // Subscribe to Trades (recalculates PnL/ROI on load to dynamically correct legacy/incorrectly-multiplied database values)
    const unsubscribeTrades = listenTrades(user.uid, (loadedTrades) => {
      const parsedTrades = loadedTrades.map((t) => {
        if (t.status !== 'Open') {
          const { pnl, roi } = calculateTradePnlAndRoi(
            t.direction,
            t.entryPrice,
            t.exitPrice,
            t.quantity,
            t.leverage || 1,
            t.fees || 0,
            t.status
          );
          return {
            ...t,
            pnl: parseFloat(pnl.toFixed(4)),
            roi: parseFloat(roi.toFixed(2))
          };
        }
        return t;
      });
      setTrades(parsedTrades);
    });

    // Subscribe to Capital Flows (Transactions)
    const unsubscribeFlows = listenTransactions(user.uid, (loadedFlows) => {
      setCapitalFlows(loadedFlows);
    });

    // Subscribe to User Settings
    const unsubscribeSettings = listenUserSettings(user.uid, (loadedSettings) => {
      if (loadedSettings) {
        if (loadedSettings.initialCapital !== undefined) {
          setInitialCapital(loadedSettings.initialCapital);
        }
        if ((loadedSettings as any).lang !== undefined) {
          setLang((loadedSettings as any).lang);
        }
        if ((loadedSettings as any).username !== undefined) {
          setUsername((loadedSettings as any).username);
        } else {
          setUsername(user.displayName || user.email?.split('@')[0] || 'Alex Rivera');
        }
        // Exclude initialCapital, lang, and username from the dynamic categories config
        const { initialCapital: _, lang: __, username: ___, ...categoriesConfig } = loadedSettings as any;
        
        setConfig((prev) => ({
          ...DEFAULT_CONFIG,
          ...categoriesConfig,
        }));
        if (loadedSettings.commissionTemplates) {
          setCommissionTemplates(loadedSettings.commissionTemplates);
        }
      } else {
        const defaultName = user.displayName || user.email?.split('@')[0] || 'Alex Rivera';
        setUsername(defaultName);
        // If no user settings found, save default settings
        saveUserSettings(user.uid, {
          ...DEFAULT_CONFIG,
          initialCapital: 10000,
          lang: 'en',
          username: defaultName,
          commissionTemplates: [
            { id: 'free', name: 'Zero Fees (Free)', ratePct: 0, fixedFee: 0 },
            { id: 'standard-crypto', name: 'Standard Crypto (0.1%)', ratePct: 0.1, fixedFee: 0 },
            { id: 'futures-fee', name: 'Futures Fee (0.05% + $1.00)', ratePct: 0.05, fixedFee: 1.0 },
            { id: 'stock-broker', name: 'Stock Broker (0.0% + $4.95)', ratePct: 0.0, fixedFee: 4.95 },
          ]
        });
      }
    });

    return () => {
      unsubscribeTrades();
      unsubscribeFlows();
      unsubscribeSettings();
    };
  }, [user]);

  const handleLanguageChange = async (newLang: 'en' | 'fa') => {
    setLang(newLang);
    if (user) {
      try {
        await saveUserSettings(user.uid, { lang: newLang });
      } catch (err: any) {
        console.error("Failed to save language setting to Firestore:", err);
      }
    }
  };

  const handleAddCapitalFlow = async (flow: Omit<CapitalFlow, 'id'>) => {
    if (!user) return;
    try {
      const newFlow: CapitalFlow = {
        ...flow,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)
      };
      await addTransaction(user.uid, newFlow);
    } catch (err: any) {
      console.error("Failed to save transaction to Firestore:", err);
      alert(lang === 'fa' 
        ? "خطا در ثبت تراکنش: دسترسی رد شد یا ارتباط با Firestore برقرار نشد. لطفاً قوانین امنیتی پروژه خود را بررسی کنید."
        : "Failed to save transaction: Permission denied or Firestore unreachable. Please check your database rules.");
    }
  };

  const handleDeleteCapitalFlow = async (id: string) => {
    if (!user) return;
    try {
      await dbDeleteTransaction(user.uid, id);
    } catch (err: any) {
      console.error("Failed to delete transaction from Firestore:", err);
      alert(lang === 'fa'
        ? "خطا در حذف تراکنش: دسترسی رد شد."
        : "Failed to delete transaction: Permission denied.");
    }
  };

  const handleUpdateCommissionTemplates = async (newTemplates: CommissionTemplate[]) => {
    setCommissionTemplates(newTemplates);
    if (user) {
      try {
        await saveUserSettings(user.uid, { commissionTemplates: newTemplates });
      } catch (err: any) {
        console.error("Failed to save commission templates to Firestore:", err);
      }
    }
  };

  const handleUpdateUsername = async (newName: string) => {
    setUsername(newName);
    if (user) {
      try {
        await saveUserSettings(user.uid, { username: newName });
      } catch (err: any) {
        console.error("Failed to save username to Firestore:", err);
      }
    }
  };

  const handleUpdateInitialCapital = async (val: number) => {
    setInitialCapital(val);
    if (user) {
      try {
        await saveUserSettings(user.uid, { initialCapital: val });
      } catch (err: any) {
        console.error("Failed to save initial capital to Firestore:", err);
      }
    }
  };

  const handleUpdateConfig = async (newConfig: DynamicConfig) => {
    setConfig(newConfig);
    if (user) {
      try {
        await saveUserSettings(user.uid, newConfig);
      } catch (err: any) {
        console.error("Failed to save configuration to Firestore:", err);
      }
    }
  };

  // State action: Save new trade (Saves to Firestore)
  const handleSaveTrade = async (newTrade: Trade) => {
    if (!user) return;
    try {
      await saveTrade(user.uid, newTrade);
      alert(lang === 'fa' ? 'ترید با موفقیت ذخیره شد!' : 'Trade successfully saved!');
    } catch (err: any) {
      console.error("Failed to save trade to Firestore:", err);
      const errMsg = err.message || String(err);
      if (errMsg.includes("permission") || errMsg.includes("Permission") || errMsg.includes("denied")) {
        alert(lang === 'fa' 
          ? "خطا: دسترسی به پایگاه داده Firestore رد شد. لطفاً مطمئن شوید قوانین امنیتی (Firestore Rules) روی پروژه Firebase شما فعال است."
          : "Error: Firestore database permission denied. Please ensure that Firestore Security Rules are deployed on your custom Firebase project.");
      } else {
        alert(lang === 'fa' ? `خطا در ذخیره‌سازی: ${errMsg}` : `Save Error: ${errMsg}`);
      }
    }
  };

  // State action: Delete individual trade
  const handleDeleteTrade = async (id: string) => {
    if (!user) return;
    try {
      await dbDeleteTrade(user.uid, id);
    } catch (err: any) {
      console.error("Failed to delete trade from Firestore:", err);
      alert(lang === 'fa'
        ? "خطا در حذف ترید: دسترسی رد شد."
        : "Failed to delete trade: Permission denied.");
    }
  };

  // State action: Update individual trade
  const handleUpdateTrade = async (updatedTrade: Trade) => {
    if (!user) return;
    try {
      await saveTrade(user.uid, updatedTrade);
    } catch (err: any) {
      console.error("Failed to update trade in Firestore:", err);
      alert(lang === 'fa'
        ? "خطا در ویرایش ترید: دسترسی رد شد."
        : "Failed to update trade: Permission denied.");
    }
  };

  // State action: Overwrite database back to seeds configuration
  const handleResetToSeeds = async () => {
    if (!user) return;
    // Batch write/save each of the INITIAL_SEEDS
    for (const t of INITIAL_SEEDS) {
      await saveTrade(user.uid, t);
    }
  };

  // State action: Empty database completely
  const handleWipeDatabase = async () => {
    if (!user) return;
    for (const t of trades) {
      await dbDeleteTrade(user.uid, t.id);
    }
    for (const flow of capitalFlows) {
      await dbDeleteTransaction(user.uid, flow.id);
    }
  };

  // State action: Restore backup from custom JSON backup
  const handleImportJSON = async (importedTrades: Trade[]) => {
    if (!user) return;
    for (const t of importedTrades) {
      await saveTrade(user.uid, t);
    }
  };

  // Intercept global searches: If a user starts typing from Dashboard, immediately switch to the Trade Log to show filtered results!
  useEffect(() => {
    if (searchQuery.trim() && currentView !== 'tradelog' && currentView !== 'addtrade') {
      setCurrentView('tradelog');
    }
  }, [searchQuery, currentView]);

  // Listen to browser extension messages for trade imports
  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      // Accept messages from the extension with the specific source
      if (
        !event.data ||
        event.data.source !== 'precision-ledger-extension' ||
        event.data.type !== 'IMPORT_TRADE'
      ) {
        return;
      }

      // 3. If user is not logged in, show alert and return
      if (!user) {
        alert(
          lang === 'fa'
            ? 'لطفاً ابتدا وارد حساب کاربری خود شوید تا ترید ذخیره گردد.'
            : 'Please sign in first to import and save this trade.'
        );
        return;
      }

      const payload = event.data.payload;
      if (!payload) return;

      // Helper function to extract and parse numeric values safely
      const parseNumberFromString = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const clean = String(val)
          .replace(/,/g, '') // Remove comma separation
          .replace(/[^\d.\-+]/g, '') // Keep digits, dot, sign characters
          .replace(/^\+/, ''); // Remove leading plus
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Helper to parse extracted/extension datetime strings to YYYY-MM-DDTHH:MM
      const parseExtractedDateTime = (dateTimeStr: any): string => {
        if (!dateTimeStr) return '';
        const str = String(dateTimeStr).trim();
        
        // 1. If already in YYYY-MM-DDTHH:MM format, return it
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) {
          return str;
        }

        // 2. If in YYYY-MM-DDTHH:MM:SS format, slice to 16 chars
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
          return str.slice(0, 16);
        }

        // 3. Robust regex-based parser for formats like "07-18, 10:49" or "07-18 10:49"
        const parts = str.match(/\d+/g);
        if (parts && parts.length >= 4) {
          const currentYear = new Date().getFullYear();
          let year = currentYear;
          let month = 1;
          let day = 1;
          let hour = 0;
          let minute = 0;

          // Check if any of the matched numbers is 4 digits (e.g. 2026)
          const fourDigitIndex = parts.findIndex(p => p.length === 4);

          if (fourDigitIndex !== -1) {
            // We have a 4-digit year!
            year = parseInt(parts[fourDigitIndex], 10);
            
            if (fourDigitIndex === 0) {
              // Format: YYYY-MM-DD HH:MM
              month = parseInt(parts[1], 10);
              day = parseInt(parts[2], 10);
              hour = parseInt(parts[3], 10);
              minute = parseInt(parts[4], 10);
            } else if (fourDigitIndex === 2) {
              // Format: DD-MM-YYYY HH:MM or MM-DD-YYYY HH:MM
              const first = parseInt(parts[0], 10);
              const second = parseInt(parts[1], 10);
              if (first > 12) {
                day = first;
                month = second;
              } else {
                month = first;
                day = second;
              }
              hour = parseInt(parts[3], 10);
              minute = parseInt(parts[4], 10);
            } else {
              // Fallback
              month = parseInt(parts[0], 10);
              day = parseInt(parts[1], 10);
              hour = parseInt(parts[2], 10);
              minute = parseInt(parts[3], 10);
            }
          } else {
            // No 4-digit year. Use current year!
            // Format is likely MM-DD HH:MM
            month = parseInt(parts[0], 10);
            day = parseInt(parts[1], 10);
            hour = parseInt(parts[2], 10);
            minute = parseInt(parts[3], 10);
          }

          // Validate ranges
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            const pad = (num: number) => String(num).padStart(2, '0');
            return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
          }
        }

        // 4. Try standard Date parsing as fallback
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const pad = (num: number) => String(num).padStart(2, '0');
          let year = d.getFullYear();
          // If the parsed year is suspiciously old or incorrect, override with current year
          if (year < 2020) {
            year = new Date().getFullYear();
          }
          return `${year}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }

        return '';
      };

      // 4. Extract fields from payload
      const symbol = String(payload.symbol || '').toUpperCase().trim();
      const sideStr = String(payload.side || '').toLowerCase().trim();
      const direction: 'Long' | 'Short' =
        sideStr.includes('short') || sideStr.includes('sell') || sideStr === 's'
          ? 'Short'
          : 'Long';

      const positionId = String(payload.positionId || '').trim();
      const realizedPnl = parseNumberFromString(payload.realizedPnl);
      const roi = parseNumberFromString(payload.roi);
      const entryPrice = parseNumberFromString(payload.entryPrice);
      const exitPrice = parseNumberFromString(payload.exitPrice);
      const quantity = parseNumberFromString(payload.quantity);
      const leverage = parseNumberFromString(payload.leverage) || 10;
      const tradingFees = Math.abs(parseNumberFromString(payload.tradingFees));
      const fundingFeesVal = parseNumberFromString(payload.fundingFees);
      const orderType = String(payload.orderType || '').trim();
      const executionType: 'Market' | 'Limit' | 'Stop' = orderType
        .toLowerCase()
        .includes('market')
        ? 'Market'
        : orderType.toLowerCase().includes('stop')
        ? 'Stop'
        : 'Limit';

      const openTime = parseExtractedDateTime(payload.openTime);
      const closeTime = parseExtractedDateTime(payload.closeTime) || new Date().toISOString().slice(0, 16);

      const notes =
        String(payload.notes || '').trim() ||
        (lang === 'fa'
          ? `معامله استخراج شده از افزونه. شناسه پوزیشن: ${positionId}`
          : `Imported from extension. Position ID: ${positionId}`);

      // 5. Construct a complete Trade object
      const status: 'Win' | 'Loss' = realizedPnl >= 0 ? 'Win' : 'Loss';

      const importedTrade: any = {
        id: positionId ? `ext-${positionId}` : `ext-${Date.now()}`,
        userId: user.uid,
        date: openTime ? openTime.split('T')[0] : (closeTime ? closeTime.split('T')[0] : new Date().toISOString().slice(0, 10)),
        symbol,
        market: 'Crypto',
        direction,
        entryPrice,
        exitPrice,
        quantity,
        leverage,
        fees: tradingFees,
        status,
        pnl: realizedPnl,
        roi,
        strategy: payload.strategy || 'Trend Following',
        confluences: [],
        marketMood: 'Neutral',
        emotionalState: realizedPnl >= 0 ? '🤑' : '🧠',
        preTradeEmotion: '🧠',
        postTradeEmotion: realizedPnl >= 0 ? '🤑' : '🧠',
        notes,
        screenshots: [],
        openTime,
        closeTime,
        executionType,
        openTradingFee: 0,
        closeTradingFee: tradingFees,
        fundingFees:
          fundingFeesVal !== 0
            ? [
                {
                  id: `f-${Date.now()}`,
                  timestamp: closeTime,
                  ratePct: -0.005,
                  amount: fundingFeesVal,
                  positionSize: quantity,
                },
              ]
            : [],
      };

      // 6 & 7. Load into calculatorPreset state and route to addtrade view so they can review and approve
      setCalculatorPreset(importedTrade);
      setCurrentView('addtrade');

      alert(
        lang === 'fa'
          ? `اطلاعات پوزیشن ${symbol} با موفقیت دریافت شد! لطفاً فرم را بررسی کرده و ذخیره نهایی را بزنید.`
          : `Position data for ${symbol} successfully received! Please review and click save to confirm.`
      );
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, [user, lang]);

  const isRtl = lang === 'fa';
  const t = TRANSLATIONS[lang];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans text-on-surface select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant/80 animate-pulse">
            {lang === 'fa' ? 'در حال بارگذاری داده‌های ابری...' : 'Synchronizing Secure Cloud Ledger...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans text-on-surface relative overflow-hidden select-none">
        {/* Abstract Glowing Backdrop Orbs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-surface-container-low border border-outline-variant rounded-2xl p-8 relative z-10 shadow-2xl shadow-black/40">
          <div className="flex flex-col items-center text-center space-y-6">
            
            {/* Visual Brand Accent */}
            <div className="flex items-center gap-2.5">
              <div className="bg-primary w-2 h-10 rounded-sm"></div>
              <h1 className="text-xl font-black text-on-surface tracking-wider">
                PRECISION<span className="text-primary">LEDGER</span>
              </h1>
            </div>

            <p className="text-xs text-on-surface-variant max-w-[280px] leading-relaxed">
              {lang === 'fa' 
                ? 'به پیشرفته‌ترین دفترچه مدیریت معاملات و محاسبات ریسک خوش آمدید. برای ورود، حساب خود را متصل کنید.'
                : 'Access the professional analytics terminal and dynamic margin-risk calculator. Securely authenticate using Google to begin.'}
            </p>

            <div className="w-full border-b border-outline-variant/30 py-1"></div>

            {authError === 'popup-blocked' ? (
              <div className="w-full bg-error-container/10 border border-error/30 rounded-xl p-4 text-left space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-error text-sm shrink-0 mt-0.5">warning</span>
                  <div>
                    <h3 className="text-xs font-bold text-error">
                      {lang === 'fa' ? 'پنجره بازشو مسدود شد' : 'Popup Window Blocked'}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                      {lang === 'fa'
                        ? 'مرورگر یا محیط فریم آی‌دی‌ئی پنجره ورود گوگل را مسدود کرده است. لطفا پاپ‌آپ‌ها را مجاز کرده یا از دکمه‌های زیر استفاده کنید.'
                        : 'Your browser or the workspace iframe blocked the Google Sign-In popup.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1.5">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 bg-secondary text-on-secondary font-bold text-[10px] tracking-wider uppercase rounded-lg hover:opacity-95 active:scale-[0.98] transition-all text-center cursor-pointer shadow flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                    <span>{lang === 'fa' ? 'باز کردن برنامه در تب جدید' : 'Open App in New Tab'}</span>
                  </a>

                  <button
                    onClick={handleSignInRedirect}
                    className="w-full py-2.5 px-3 bg-primary text-on-primary font-bold text-[10px] tracking-wider uppercase rounded-lg hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    <span>{lang === 'fa' ? 'ورود به روش ریدایرکت (جایگزین)' : 'Use Redirect Method'}</span>
                  </button>

                  <button
                    onClick={() => setAuthError(null)}
                    className="w-full text-center text-[10px] text-on-surface-variant/70 hover:text-on-surface underline py-1"
                  >
                    {lang === 'fa' ? 'تلاش مجدد با پاپ‌آپ' : 'Try Popup Again'}
                  </button>
                </div>
              </div>
            ) : authError ? (
              <div className="w-full bg-error-container/10 border border-error/30 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-error text-sm shrink-0 mt-0.5">error</span>
                  <div>
                    <h3 className="text-xs font-bold text-error">
                      {lang === 'fa' ? 'خطا در احراز هویت' : 'Authentication Failure'}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed break-all">
                      {authError}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSignIn}
                    className="py-1.5 px-3 bg-primary text-on-primary font-bold text-[10px] tracking-wider uppercase rounded-lg cursor-pointer"
                  >
                    {lang === 'fa' ? 'پاپ‌آپ مجدد' : 'Try Popup'}
                  </button>
                  <button
                    onClick={handleSignInRedirect}
                    className="py-1.5 px-3 bg-outline-variant text-on-surface font-bold text-[10px] tracking-wider uppercase rounded-lg cursor-pointer"
                  >
                    {lang === 'fa' ? 'ریدایرکت' : 'Try Redirect'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="w-full py-3.5 px-4 bg-primary text-on-primary font-bold text-xs tracking-wider uppercase rounded-xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.746-.08-1.32-.176-1.886H12.24z"/>
                </svg>
                <span>{lang === 'fa' ? 'ورود با حساب گوگل' : 'Sign In With Google'}</span>
              </button>
            )}

            <p className="text-[10px] text-on-surface-variant/60">
              {lang === 'fa' 
                ? 'تمام تراکنش‌ها و دفترچه معاملاتی شما به صورت ابری و کاملا امن همگام‌سازی می‌شود.'
                : 'Your transactions and logs are synchronized securely to your individual cloud space.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex min-h-screen bg-background text-on-surface font-sans antialiased overflow-x-hidden ${isRtl ? 'font-sans' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Side Navigation panel */}
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          // Auto-clear search when manually swapping tabs to avoid navigation lock-ins
          setSearchQuery('');
        }}
        onOpenHelp={() => setShowHelpModal(true)}
        onLogout={async () => {
          const msg = isRtl 
            ? 'آیا از خروج از پروفایل کاربری اطمینان دارید؟'
            : 'Are you sure you want to logout?';
          if (confirm(msg)) {
            await logout();
            const successMsg = isRtl ? 'با موفقیت خارج شدید.' : 'Successfully logged out.';
            alert(successMsg);
          }
        }}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        userEmail={user.email || undefined}
      />

      {/* Main console content wrapper */}
      <div className={`flex-1 ${isRtl ? 'mr-64' : 'ml-64'} flex flex-col min-w-0 min-h-screen`}>
        {/* Top Header navbar */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          username={username}
          alertCount={alertCount}
          onOpenNotifications={() => {
            setAlertCount(0);
            const alertMsg = isRtl ? 'شبیه‌سازی هشدارهای معاملاتی. تمامی هشدارها پاک شدند!' : 'Simulating workstation alerts. All alerts cleared!';
            alert(alertMsg);
          }}
          onOpenProfile={() => setCurrentView('settings')}
          lang={lang}
          onLanguageChange={handleLanguageChange}
        />


        {/* Dynamic Workspace Container */}
        <main className="flex-grow p-6">
          {/* Global position calculator bar is removed as requested to transform to Closed Trade Lifecycle Logger */}

          {currentView === 'dashboard' && (
            <DashboardView
              trades={trades}
              initialCapital={initialCapital}
              onUpdateInitialCapital={handleUpdateInitialCapital}
              setView={(view) => {
                setCurrentView(view);
                setSearchQuery('');
              }}
              onSelectTrade={(trade) => {
                // Clicking a bento trade details card routes to log with filter
                setCurrentView('tradelog');
                setSearchQuery(trade.symbol);
              }}
              lang={lang}
              capitalFlows={capitalFlows}
              onAddCapitalFlow={handleAddCapitalFlow}
              onDeleteCapitalFlow={handleDeleteCapitalFlow}
            />
          )}

          {currentView === 'tradelog' && (
            <TradeLogView
              trades={trades}
              onDeleteTrade={handleDeleteTrade}
              onUpdateTrade={handleUpdateTrade}
              onSelectTrade={(trade) => {
                // Detailed view modal triggers inside TradeLogView
              }}
              globalSearchQuery={searchQuery}
              lang={lang}
            />
          )}

          {currentView === 'addtrade' && (
            <AddTradeView
              onSaveTrade={handleSaveTrade}
              setView={setCurrentView}
              lang={lang}
              presetValues={calculatorPreset}
              onClearPreset={() => setCalculatorPreset(null)}
              config={config}
              onOpenConfigModal={() => setIsConfigModalOpen(true)}
              commissionTemplates={commissionTemplates}
              initialCapital={accountEquity}
            />
          )}

          {currentView === 'calculator' && (
            <PositionCalculator
              initialCapital={accountEquity}
              lang={lang}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              username={username}
              setUsername={handleUpdateUsername}
              onResetSeeds={handleResetToSeeds}
              onWipeDatabase={handleWipeDatabase}
              onImportJSON={handleImportJSON}
              tradesCount={trades.length}
              lang={lang}
              onLanguageChange={handleLanguageChange}
              onOpenConfigModal={() => setIsConfigModalOpen(true)}
              commissionTemplates={commissionTemplates}
              onUpdateTemplates={handleUpdateCommissionTemplates}
              tradesList={trades}
            />
          )}
        </main>

        {/* Footer Status */}
        <footer className={`px-6 py-2.5 bg-background border-t border-outline-variant/60 flex flex-col sm:flex-row justify-between items-center text-[10px] text-on-surface-variant font-mono select-none gap-2 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
          <div className={`flex flex-wrap gap-4 ${isRtl ? 'space-x-reverse' : ''}`}>
            <span>{isRtl ? 'نشست:' : 'Session:'} <span className="text-on-surface uppercase font-bold">{isRtl ? 'فعال' : 'ACTIVE'}</span></span>
            <span>{isRtl ? 'زمان لود دیتابیس:' : 'DB Load Time:'} <span className="text-on-surface font-bold">12ms</span></span>
            <span>{isRtl ? 'حافظه ذخیره‌سازی:' : 'Storage:'} <span className="text-on-surface font-bold">{((trades.length * 0.4) + 0.2).toFixed(2)}KB / 10MB</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-on-surface-variant uppercase font-semibold">{t.systemSynced}</span>
          </div>
        </footer>
      </div>

      {/* Simulator Help Dialog Overlay */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container border border-outline-variant max-w-md w-full rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-surface-container-high border-b border-outline-variant flex justify-between items-center">
              <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">
                {isRtl ? 'راهنمای ایستگاه معاملاتی' : 'workstation assistance'}
              </h4>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-full cursor-pointer hover:bg-surface-container-highest"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs leading-relaxed text-on-surface">
              <p className="font-bold text-primary">
                {isRtl ? 'به دفترچه معاملات دقیق خوش آمدید!' : 'Welcome to Precision Ledger!'}
              </p>
              <p>
                {isRtl 
                  ? 'این برنامه داده‌های شما را با امنیت بالا در پایگاه داده ابری Firestore حساب کاربری گوگل شما ذخیره کرده و به صورت زنده همگام‌سازی می‌کند.'
                  : "This application securely stores and synchronises your data in real-time inside your personal Google Cloud Firestore database."}
              </p>
              <p className="font-semibold text-on-surface-variant">
                {isRtl ? 'میانبرهای سریع:' : 'Quick Shortcuts:'}
              </p>
              <ul className={`list-disc list-inside space-y-1.5 pl-1 text-on-surface-variant ${isRtl ? 'pr-1' : ''}`}>
                <li>
                  <span className="text-on-surface font-semibold">{isRtl ? 'محاسبات خودکار' : 'Calculations'}</span>: {' '}
                  {isRtl 
                    ? 'درصد سود دهی (ROI) و سود/زیان خالص بر اساس قیمت‌های ورودی و خروجی به شکل خودکار و زنده بروزرسانی می‌شوند.'
                    : 'Automated ROI % and PnL values resolve dynamically as Entry/Exit prices are supplied.'}
                </li>
                <li>
                  <span className="text-on-surface font-semibold">{isRtl ? 'خروجی اکسل / CSV' : 'Workstation CSV'}</span>: {' '}
                  {isRtl 
                    ? 'پشتیبان کامل داده‌ها را به شکل اکسل یا فایل اکسپورت در بخش فیلترهای گزارش معاملات بارگیری کنید.'
                    : 'Export full backup datasets instantly from the Trade Log filter bar.'}
                </li>
                <li>
                  <span className="text-on-surface font-semibold">{isRtl ? 'آپلود تصاویر اثباتی' : 'Proof Uploads'}</span>: {' '}
                  {isRtl 
                    ? 'شواهد تصویری و نمودارهای خود را در فرم ثبت معامله جدید به عنوان ضمیمه ثبت کنید.'
                    : 'Convert screenshot evidence into offline-persisted data packages in Add Trade.'}
                </li>
              </ul>
            </div>
            <div className="p-4 bg-surface-container-high border-t border-outline-variant flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-[10px] tracking-widest uppercase rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                {isRtl ? 'فهمیدم' : 'Got It'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Management Modal Overlay */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        lang={lang}
      />
    </div>
  );
}
