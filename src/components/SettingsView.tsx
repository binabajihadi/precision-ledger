/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trade, CommissionTemplate } from '../types';
import { TRANSLATIONS } from '../utils/translations';

interface SettingsViewProps {
  username: string;
  setUsername: (name: string) => void;
  onResetSeeds: () => void;
  onWipeDatabase: () => void;
  onImportJSON: (trades: Trade[]) => void;
  tradesCount: number;
  lang?: 'en' | 'fa';
  onLanguageChange?: (lang: 'en' | 'fa') => void;
  onOpenConfigModal?: () => void;
  commissionTemplates?: CommissionTemplate[];
  onUpdateTemplates?: (templates: CommissionTemplate[]) => void;
  tradesList?: Trade[];
}

export default function SettingsView({
  username,
  setUsername,
  onResetSeeds,
  onWipeDatabase,
  onImportJSON,
  tradesCount,
  lang,
  onLanguageChange,
  onOpenConfigModal,
  commissionTemplates,
  onUpdateTemplates,
  tradesList = [],
}: SettingsViewProps) {
  const isRtl = lang === 'fa';
  const t = TRANSLATIONS[lang || 'en'];

  const [nameInput, setNameInput] = useState(username);
  const [importError, setImportError] = useState('');

  // Customizable commissions template local states
  const [templateName, setTemplateName] = useState('');
  const [templateRatePct, setTemplateRatePct] = useState<string>('');
  const [templateFixedFee, setTemplateFixedFee] = useState<string>('');

  const templates = commissionTemplates || [];

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      alert(isRtl ? 'لطفاً نام قالب را وارد کنید.' : 'Please enter template name.');
      return;
    }
    const rate = parseFloat(templateRatePct) || 0;
    const fixed = parseFloat(templateFixedFee) || 0;
    
    const newTemplate: CommissionTemplate = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name: templateName.trim(),
      ratePct: Math.max(0, rate),
      fixedFee: Math.max(0, fixed)
    };

    if (onUpdateTemplates) {
      onUpdateTemplates([...templates, newTemplate]);
    }

    setTemplateName('');
    setTemplateRatePct('');
    setTemplateFixedFee('');
  };

  const handleDeleteTemplate = (id: string) => {
    if (onUpdateTemplates) {
      onUpdateTemplates(templates.filter(t => t.id !== id));
    }
  };

  // Save profile name
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      alert(isRtl ? 'نام پروفایل نمی‌تواند خالی باشد.' : 'Profile name cannot be empty.');
      return;
    }
    setUsername(nameInput.trim());
    alert(isRtl ? 'تغییرات پروفایل با موفقیت ذخیره شد!' : 'Profile configurations updated successfully!');
  };

  // Full backup JSON download
  const handleBackupExport = () => {
    // Get full database array from cloud-synchronized trades list prop
    const dataToExport = tradesList || [];
    if (dataToExport.length === 0) {
      alert(isRtl ? 'هیچ داده‌ای برای پشتیبان‌گیری وجود ندارد.' : 'No database content to back up.');
      return;
    }

    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `Precision_Ledger_FullBackup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON backup file
  const handleJSONImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          // Perform brief validation check of properties
          const isValid = parsed.every((t) => t.id && t.symbol && typeof t.entryPrice === 'number');
          if (isValid) {
            onImportJSON(parsed as Trade[]);
            alert(
              isRtl
                ? `پشتیبان با موفقیت بازیابی شد! تعداد ${parsed.length} معامله وارد شد.`
                : `Backup restored successfully! Imported ${parsed.length} trades.`
            );
          } else {
            setImportError(
              isRtl
                ? 'فایل پشتیبان نامعتبر است. خصوصیات مورد نیاز معامله یافت نشد.'
                : 'Invalid backup file. Missing required trade attributes.'
            );
          }
        } else {
          setImportError(
            isRtl
              ? 'فرمت فایل پشتیبان نامعتبر است. انتظار می‌رفت یک آرایه JSON باشد.'
              : 'Invalid backup file format. Expected a JSON array.'
          );
        }
      } catch (err) {
        setImportError(
          isRtl
            ? 'خطا در تجزیه فایل JSON. از صحت فایل پشتیبان مطمئن شوید.'
            : 'Failed to parse JSON file. Ensure it is a valid backup export.'
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto select-none">
      {/* Title */}
      <div className={isRtl ? 'text-right' : 'text-left'}>
        <h2 className="text-xl font-black text-on-surface">{t.settingsViewTitle}</h2>
        <p className="text-xs text-on-surface-variant">{t.settingsViewDesc}</p>
      </div>

      {/* Language Selection Toggle */}
      {onLanguageChange && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className={`flex items-center gap-2 mb-4 text-primary ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <span className="material-symbols-outlined text-xl">translate</span>
            <h3 className="text-xs font-bold tracking-widest uppercase">{t.languageSelection}</h3>
          </div>

          <p className={`text-xs text-on-surface-variant mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t.chooseLanguage}
          </p>

          <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => onLanguageChange('en')}
              className={`flex-1 py-3 px-4 border rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                lang === 'en'
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-outline-variant hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="text-xs">English (US)</span>
              {lang === 'en' && <span className="material-symbols-outlined text-sm">done</span>}
            </button>
            <button
              onClick={() => onLanguageChange('fa')}
              className={`flex-1 py-3 px-4 border rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                lang === 'fa'
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-outline-variant hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="text-xs font-sans">فارسی (RTL)</span>
              {lang === 'fa' && <span className="material-symbols-outlined text-sm">done</span>}
            </button>
          </div>
        </div>
      )}

      {/* Profile settings */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className={`flex items-center gap-2 mb-4 text-primary ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <span className="material-symbols-outlined text-xl">account_circle</span>
          <h3 className="text-xs font-bold tracking-widest uppercase">{t.profileConfig}</h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className={`space-y-1 ${isRtl ? 'text-right' : 'text-left'}`}>
            <label className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
              {t.workstationUsername}
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className={`w-full bg-surface-dim border border-outline-variant rounded-lg p-3 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 ${
                isRtl ? 'text-right' : 'text-left'
              }`}
              placeholder={isRtl ? 'به عنوان مثال: علی رضایی' : 'e.g. Alex Rivera'}
            />
          </div>

          <div className={`flex ${isRtl ? 'justify-start' : 'justify-start'}`}>
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-on-primary font-bold text-[10px] tracking-wider uppercase rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-md shadow-primary/10"
            >
              {t.saveUsername}
            </button>
          </div>
        </form>
      </div>

      {/* Dynamic Configurations Settings Option */}
      {onOpenConfigModal && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <div className={`flex items-center gap-2 mb-4 text-primary ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <span className="material-symbols-outlined text-xl">settings_suggest</span>
            <h3 className="text-xs font-bold tracking-widest uppercase">
              {isRtl ? 'شخصی‌سازی لیست‌های پویا' : 'Dynamic Configuration'}
            </h3>
          </div>

          <p className={`text-xs text-on-surface-variant leading-relaxed mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
            {isRtl
              ? 'شما می‌توانید گزینه‌های فرم‌های ثبت معامله را بر اساس استراتژی، تایم‌فریم، تاییده‌های فنی، صرافی‌ها و نمادهای دلخواه خود به صورت دستی شخصی‌سازی کنید.'
              : 'Customize the input options for your trade entries, including strategies, timeframes, technical confluences, exchanges, and symbols/tickers.'}
          </p>

          <div className={`flex ${isRtl ? 'justify-start' : 'justify-start'}`}>
            <button
              type="button"
              onClick={onOpenConfigModal}
              className="px-4 py-2.5 bg-primary text-on-primary font-bold text-[10px] tracking-wider uppercase rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-md shadow-primary/10 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-xs">edit_attributes</span>
              <span>{isRtl ? 'مدیریت و ویرایش گزینه‌ها' : 'Manage List Options'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Backup and restore */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className={`flex items-center gap-2 mb-4 text-tertiary ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <span className="material-symbols-outlined text-xl">cloud_sync</span>
          <h3 className="text-xs font-bold tracking-widest uppercase">{t.databaseActions}</h3>
        </div>

        <p className={`text-xs text-on-surface-variant leading-relaxed mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
          {isRtl
            ? `دفترچه معاملات دقیق به صورت محلی و امن در فضای ذخیره‌سازی مرورگر شما کار می‌کند (در حال حاضر ${tradesCount} معامله ذخیره شده است). شما می‌توانید از دیتابیس خود نسخه پشتیبان تهیه کرده و یا آن را بازیابی کنید.`
            : `Precision Ledger operates offline-first using your local browser storage space (${tradesCount} trades currently saved). You can back up your database files or restore them below.`}
        </p>

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRtl ? 'direction-rtl' : ''}`}>
          {/* Export card */}
          <div className={`bg-surface-container border border-outline-variant/50 p-4 rounded-lg space-y-3 ${isRtl ? 'text-right' : 'text-left'}`}>
            <h4 className="text-[10px] font-bold text-on-surface tracking-wider uppercase">{t.backupExport}</h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {t.backupExportDesc}
            </p>
            <button
              onClick={handleBackupExport}
              className="w-full py-2 bg-surface-container-low hover:bg-surface-container-highest border border-outline hover:border-primary text-on-surface text-[10px] font-bold tracking-wider uppercase rounded transition-colors cursor-pointer"
            >
              {isRtl ? 'دانلود نسخه پشتیبان JSON' : 'Download JSON Backup'}
            </button>
          </div>

          {/* Import card */}
          <div className={`bg-surface-container border border-outline-variant/50 p-4 rounded-lg space-y-3 ${isRtl ? 'text-right' : 'text-left'}`}>
            <h4 className="text-[10px] font-bold text-on-surface tracking-wider uppercase">{t.backupImport}</h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {t.backupImportDesc}
            </p>
            
            <label className="block w-full text-center py-2 bg-surface-container-low hover:bg-surface-container-highest border border-outline hover:border-primary text-on-surface text-[10px] font-bold tracking-wider uppercase rounded transition-colors cursor-pointer">
              <span>{isRtl ? 'انتخاب فایل پشتیبان' : 'Choose Backup File'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleJSONImport}
                className="hidden"
              />
            </label>

            {importError && (
              <p className="text-[10px] font-semibold text-secondary text-center leading-normal">
                {importError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Customizable Commissions Section */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className={`flex items-center gap-2 mb-4 text-primary ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <span className="material-symbols-outlined text-xl">payments</span>
          <h3 className="text-xs font-bold tracking-widest uppercase">
            {isRtl ? 'قالب‌های کارمزد سفارشی' : 'Customizable Commissions & Fees'}
          </h3>
        </div>

        <p className={`text-xs text-on-surface-variant leading-relaxed mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
          {isRtl
            ? 'قالب‌های پیش‌فرض کارمزد و هزینه‌ها را بر اساس درصد یا هزینه ثابت تعریف کنید تا در هنگام ثبت معامله از آن‌ها استفاده کنید.'
            : 'Define your default fee templates with percentage or fixed costs to easily select and apply them during trade creation.'}
        </p>

        {/* Form to add template */}
        <form onSubmit={handleAddTemplate} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 border-b border-outline-variant/30 pb-5">
          <div className={`space-y-1 ${isRtl ? 'text-right' : 'text-left'}`}>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase">{isRtl ? 'نام قالب کارمزد' : 'Template Name'}</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={isRtl ? 'مثلا: کارمزد فیوچرز' : 'e.g. Standard Crypto'}
              className={`w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary ${isRtl ? 'text-right' : 'text-left'}`}
            />
          </div>
          <div className={`space-y-1 ${isRtl ? 'text-right' : 'text-left'}`}>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase">{isRtl ? 'نرخ کارمزد (%)' : 'Percentage Fee (%)'}</label>
            <input
              type="number"
              step="any"
              value={templateRatePct}
              onChange={(e) => setTemplateRatePct(e.target.value)}
              placeholder="0.05"
              className={`w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary ${isRtl ? 'text-right' : 'text-left'}`}
            />
          </div>
          <div className="space-y-1 flex flex-col justify-between">
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase">{isRtl ? 'کارمزد ثابت ($)' : 'Fixed Fee ($)'}</label>
              <input
                type="number"
                step="any"
                value={templateFixedFee}
                onChange={(e) => setTemplateFixedFee(e.target.value)}
                placeholder="1.00"
                className={`w-full bg-surface-dim border border-outline-variant rounded-lg p-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary ${isRtl ? 'text-right font-sans' : 'text-left'}`}
              />
            </div>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-on-primary font-bold text-[10px] tracking-wider uppercase rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-md shadow-primary/10 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              <span>{isRtl ? 'افزودن قالب' : 'Add Template'}</span>
            </button>
          </div>
        </form>

        {/* Template List */}
        <div className="space-y-2">
          <span className={`text-[9px] font-bold tracking-widest text-on-surface-variant uppercase block ${isRtl ? 'text-right' : 'text-left'}`}>
            {isRtl ? 'قالب‌های ثبت شده' : 'Registered Templates'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.length === 0 ? (
              <p className="text-[10px] text-on-surface-variant/45 italic col-span-2 text-center py-2">{isRtl ? 'قالبی ثبت نشده است' : 'No commission templates registered'}</p>
            ) : (
              templates.map((temp) => (
                <div key={temp.id} className={`flex justify-between items-center bg-surface-container-lowest border border-outline-variant/30 p-2.5 rounded-lg text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`space-y-0.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <span className="font-bold text-on-surface">{temp.name}</span>
                    <div className="text-[10px] text-on-surface-variant font-mono">
                      {isRtl ? `درصد: ${temp.ratePct}% | ثابت: $${temp.fixedFee}` : `Rate: ${temp.ratePct}% | Fixed: $${temp.fixedFee}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(temp.id)}
                    className="text-on-surface-variant hover:text-secondary rounded p-1 transition-colors cursor-pointer"
                    title={isRtl ? 'حذف قالب' : 'Delete template'}
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className={`flex items-center gap-2 mb-4 text-secondary ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <span className="material-symbols-outlined text-xl text-secondary">warning</span>
          <h3 className="text-xs font-bold tracking-widest uppercase text-secondary">
            {isRtl ? 'منطقه حساس و بحرانی' : 'DANGER ZONE'}
          </h3>
        </div>

        <div className="space-y-4">
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-surface-container border border-outline-variant/40 rounded-lg gap-4 ${isRtl ? 'sm:flex-row-reverse text-right' : 'text-left'}`}>
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold text-on-surface tracking-wider uppercase">{t.databaseResetSeeds}</h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                {t.databaseResetSeedsDesc}
              </p>
            </div>
            <button
              onClick={() => {
                const message = isRtl
                  ? 'آیا مطمئن هستید که می‌خواهید دیتابیس را بازنشانی و معاملات نمونه را بارگذاری کنید؟ این عمل جایگزین معاملات فعلی شما خواهد شد.'
                  : 'Are you sure you want to restore the default high-fidelity seed trades? This will replace your current journal.';
                if (confirm(message)) {
                  onResetSeeds();
                  alert(isRtl ? 'معاملات نمونه با موفقیت بارگذاری شدند!' : 'Default seed trades restored successfully!');
                }
              }}
              className="px-4 py-2 bg-secondary-container hover:bg-red-700 text-on-secondary-container hover:text-white font-bold text-[10px] tracking-wider uppercase rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              {isRtl ? 'بارگذاری مجدد دمو' : 'Reset to Seeds'}
            </button>
          </div>

          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-surface-container border border-outline-variant/40 rounded-lg gap-4 ${isRtl ? 'sm:flex-row-reverse text-right' : 'text-left'}`}>
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold text-on-surface tracking-wider uppercase">{t.databaseWipe}</h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                {t.databaseWipeDesc}
              </p>
            </div>
            <button
              onClick={() => {
                const message = isRtl
                  ? 'هشدار بسیار حیاتی: این عمل تمام اطلاعات و تاریخچه معاملات شما را برای همیشه از این مرورگر پاک خواهد کرد. این عملیات غیرقابل بازگشت است. آیا مطمئن هستید؟'
                  : 'CRITICAL WARNING: This will permanently delete ALL your trading records from this browser. This action cannot be undone. Are you sure?';
                if (confirm(message)) {
                  onWipeDatabase();
                  alert(isRtl ? 'پایگاه داده محلی با موفقیت به طور کامل تخلیه شد.' : 'Your trading journal database has been successfully emptied.');
                }
              }}
              className="px-4 py-2 bg-[#410004] hover:bg-red-950 text-secondary font-bold text-[10px] tracking-wider uppercase rounded border border-outline-variant/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              {isRtl ? 'تخلیه کامل دیتابیس' : 'Wipe Database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
