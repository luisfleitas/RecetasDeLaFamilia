"use client";

type FamilySecondaryTab<TTab extends string> = {
  isDisabled?: boolean;
  id: TTab;
  label: string;
};

type FamilySecondaryTabsProps<TTab extends string> = {
  activeTab: TTab;
  ariaLabel: string;
  idPrefix: string;
  onTabSelect: (tab: TTab) => void;
  tabs: FamilySecondaryTab<TTab>[];
};

export default function FamilySecondaryTabs<TTab extends string>({
  activeTab,
  ariaLabel,
  idPrefix,
  onTabSelect,
  tabs,
}: FamilySecondaryTabsProps<TTab>) {
  return (
    <div id={`${idPrefix}-tabs`} className="secondary-tab-strip" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          id={`${idPrefix}-tab-${tab.id}`}
          key={tab.id}
          type="button"
          className="secondary-tab-strip-item"
          role="tab"
          aria-selected={tab.id === activeTab}
          aria-disabled={tab.isDisabled || undefined}
          data-active={tab.id === activeTab}
          disabled={tab.isDisabled}
          onClick={() => {
            if (!tab.isDisabled) {
              onTabSelect(tab.id);
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
