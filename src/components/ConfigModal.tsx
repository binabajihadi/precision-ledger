/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DynamicConfig } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DynamicConfig;
  onUpdateConfig: (newConfig: DynamicConfig) => void;
  lang: 'en' | 'fa';
}

type TabType = 'strategies' | 'timeframes' | 'confluences' | 'exchanges' | 'symbols';

export default function ConfigModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  lang,
}: ConfigModalProps) {
  const isRtl = lang === 'fa';
  const [activeTab, setActiveTab] = useState<TabType>('strategies');
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  if (!isOpen) return null;

  const tabs: { key: TabType; labelEn: string; labelFa: string; icon: string }[] = [
    { key: 'strategies', labelEn: 'Strategies', labelFa: 'استراتژی‌ها', icon: 'architecture' },
    { key: 'timeframes', labelEn: 'Timeframes', labelFa: 'تایم‌فریم‌ها', icon: 'hourglass_empty' },
    { key: 'confluences', labelEn: 'Confluences', labelFa: 'تاییده‌ها', icon: 'done_all' },
    { key: 'exchanges', labelEn: 'Exchanges', labelFa: 'صرافی‌ها', icon: 'hub' },
    { key: 'symbols', labelEn: 'Symbols', labelFa: 'نمادها', icon: 'tag' },
  ];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newItem.trim();
    if (!val) return;

    const currentList = config[activeTab] || [];
    if (currentList.includes(val)) {
      alert(isRtl ? 'این مورد از قبل وجود دارد!' : 'This item already exists!');
      return;
    }

    const updatedList = [...currentList, val];
    onUpdateConfig({
      ...config,
      [activeTab]: updatedList,
    });
    setNewItem('');
  };

  const handleRemoveItem = (itemToRemove: string) => {
    const currentList = config[activeTab] || [];
    const updatedList = currentList.filter((item) => item !== itemToRemove);
    onUpdateConfig({
      ...config,
      [activeTab]: updatedList,
    });
    // Reset edit state if editing item is removed
    setEditingIndex(null);
  };

  const handleStartEdit = (index: number, value: string) => {
    setEditingIndex(index);
    setEditingValue(value);
  };

  const handleSaveEdit = (index: number) => {
    const val = editingValue.trim();
    if (!val) return;

    const currentList = [...(config[activeTab] || [])];
    if (currentList.includes(val) && currentList[index] !== val) {
      alert(isRtl ? 'این مورد از قبل وجود دارد!' : 'This item already exists!');
      return;
    }

    currentList[index] = val;
    onUpdateConfig({
      ...config,
      [activeTab]: currentList,
    });
    setEditingIndex(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface-container border border-outline-variant max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[500px]">
        {/* Left Side Tab Navigation */}
        <div className={`w-full md:w-56 bg-surface-container-high p-4 border-b md:border-b-0 ${isRtl ? 'md:border-l border-outline-variant' : 'md:border-r border-outline-variant'} flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible shrink-0`}>
          <div className="hidden md:block mb-4 px-2">
            <h3 className="text-xs font-black text-primary tracking-widest uppercase">
              {isRtl ? 'تنظیمات پویا' : 'Dynamic Config'}
            </h3>
            <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
              {isRtl ? 'لیست‌های شخصی‌سازی' : 'Customize options'}
            </p>
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setNewItem('');
                  setEditingIndex(null);
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/10'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                } ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                <span>{isRtl ? tab.labelFa : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 flex flex-col min-w-0 bg-surface">
          {/* Header */}
          <div className={`flex justify-between items-center pb-4 border-b border-outline-variant/50 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div>
              <h4 className={`text-sm font-extrabold text-on-surface capitalize ${isRtl ? 'text-right' : ''}`}>
                {isRtl 
                  ? `مدیریت ${tabs.find((t) => t.key === activeTab)?.labelFa}`
                  : `Manage ${tabs.find((t) => t.key === activeTab)?.labelEn}`}
              </h4>
              <p className={`text-[10px] text-on-surface-variant ${isRtl ? 'text-right' : ''}`}>
                {isRtl 
                  ? 'آیتم‌ها را اضافه، ویرایش یا حذف کنید تا فرم‌ها خودکار بروزرسانی شوند'
                  : 'Add, edit or remove options to auto-populate select inputs'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* List display */}
          <div className="flex-grow overflow-y-auto space-y-2 pr-1 mb-4">
            {(config[activeTab] || []).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant/50 p-6">
                <span className="material-symbols-outlined text-3xl mb-1">sentiment_dissatisfied</span>
                <p className="text-xs">{isRtl ? 'هیچ موردی یافت نشد.' : 'No items added yet.'}</p>
              </div>
            ) : (
              (config[activeTab] || []).map((item, index) => (
                <div
                  key={item}
                  className={`flex items-center justify-between p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl hover:border-outline-variant transition-all ${
                    isRtl ? 'flex-row-reverse' : ''
                  }`}
                >
                  {editingIndex === index ? (
                    <div className={`flex items-center gap-2 flex-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className={`flex-1 bg-surface border border-primary/50 text-xs px-2.5 py-1 rounded-lg focus:outline-none ${
                          isRtl ? 'text-right' : 'text-left'
                        }`}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(index)}
                        className="p-1 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary rounded transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">done</span>
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="p-1 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest rounded transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-on-surface font-mono break-all px-1">
                        {item}
                      </span>
                      <div className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index, item)}
                          className="p-1 text-on-surface-variant/70 hover:text-primary rounded hover:bg-surface-container-high transition-colors cursor-pointer"
                          title={isRtl ? 'ویرایش' : 'Edit'}
                        >
                          <span className="material-symbols-outlined text-xs">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          className="p-1 text-on-surface-variant/70 hover:text-secondary rounded hover:bg-surface-container-high transition-colors cursor-pointer"
                          title={isRtl ? 'حذف' : 'Remove'}
                        >
                          <span className="material-symbols-outlined text-xs">delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add input form */}
          <form onSubmit={handleAddItem} className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <input
              type="text"
              placeholder={
                isRtl 
                  ? `افزودن ${tabs.find((t) => t.key === activeTab)?.labelFa} جدید...` 
                  : `Add new ${tabs.find((t) => t.key === activeTab)?.labelEn.slice(0, -1)}...`
              }
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className={`flex-1 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/25 transition-all ${
                isRtl ? 'text-right' : 'text-left'
              }`}
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
