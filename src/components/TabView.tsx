/**
 * TabView - Simple tab component for switching between different panels
 */

import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabViewProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export const TabView: React.FC<TabViewProps> = ({
  tabs,
  defaultTab,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={`tab-view ${className}`}>
      {/* Tab headers */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 font-medium text-sm transition-colors relative
              ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }
            `}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content">{activeTabContent}</div>
    </div>
  );
};

export default TabView;
