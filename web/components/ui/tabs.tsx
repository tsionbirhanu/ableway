"use client";

import React, { useId, useState, useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  ariaLabel: string;
  className?: string;
  onTabChange?: (tabId: string) => void;
}

/**
 * Accessible WAI-ARIA Tabs component with roving tabindex, arrow-key navigation (Left/Right/Home/End),
 * 44px minimum target sizes, and high-contrast indicators.
 */
export function Tabs({ items, defaultTabId, ariaLabel, className = "", onTabChange }: TabsProps) {
  const baseId = useId();
  const [activeTabId, setActiveTabId] = useState<string>(
    defaultTabId || (items[0] ? items[0].id : ""),
  );

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = items.map((item, idx) => ({ item, idx })).filter((t) => !t.item.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((t) => t.idx === index);
    if (currentEnabledIndex === -1) return;

    let targetIndex: number | null = null;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (currentEnabledIndex + 1) % enabledTabs.length;
      targetIndex = enabledTabs[next].idx;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
      targetIndex = enabledTabs[prev].idx;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = enabledTabs[0].idx;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIndex = enabledTabs[enabledTabs.length - 1].idx;
    }

    if (targetIndex !== null) {
      const targetItem = items[targetIndex];
      handleSelectTab(targetItem.id);
      tabRefs.current[targetIndex]?.focus();
    }
  };

  const activeItem = items.find((item) => item.id === activeTabId) || items[0];

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-2 border-b-2 border-[var(--color-border)] pb-1"
      >
        {items.map((tab, index) => {
          const isSelected = tab.id === activeTabId;
          const tabElementId = `${baseId}-tab-${tab.id}`;
          const panelElementId = `${baseId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={tabElementId}
              aria-selected={isSelected}
              aria-controls={panelElementId}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`min-h-[44px] px-5 py-2.5 font-bold rounded-t-lg transition-colors focus:outline focus:outline-3 focus:outline-[var(--color-focus)] focus:outline-offset-2 ${
                isSelected
                  ? "bg-[var(--color-surface)] text-[var(--color-text)] border-b-4 border-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-transparent"
              } ${tab.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeItem && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          tabIndex={0}
          className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] focus:outline focus:outline-3 focus:outline-[var(--color-focus)] focus:outline-offset-2"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
