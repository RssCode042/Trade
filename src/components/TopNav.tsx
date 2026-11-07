import React from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, FileSpreadsheet, RefreshCw } from 'lucide-react';

interface TopNavProps {
  activeTab: 'open' | 'closed' | 'calculator' | 'analytics';
  setActiveTab: (tab: 'open' | 'closed' | 'calculator' | 'analytics') => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenNewPosition: () => void;
  onOpenGoogleSheetsModal: () => void;
  isRefreshing: boolean;
  onRefreshQuotes: () => void;
  lastUpdatedTime: string | null;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogin,
  onLogout,
  onOpenNewPosition,
  onOpenGoogleSheetsModal,
  isRefreshing,
  onRefreshQuotes,
  lastUpdatedTime,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-emerald-400 transition-colors"
        >
          ApexTrade
        </a>
        <span className="text-xs text-slate-500 font-mono hidden sm:inline">
          Journal & Risk
        </span>
      </div>

      {/* Zone 2: Concise navigation links (single-line text) */}
      <nav className="flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('open')}
          className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
            activeTab === 'open'
              ? 'text-white border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Отворени позиции
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
            activeTab === 'closed'
              ? 'text-white border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Затворени сделки
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
            activeTab === 'analytics'
              ? 'text-white border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Статистика
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
            activeTab === 'calculator'
              ? 'text-white border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Риск калкулатор
        </button>
      </nav>

      {/* Zone 3: 1 primary action area */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Refresh Status */}
        <button
          onClick={onRefreshQuotes}
          disabled={isRefreshing}
          title={lastUpdatedTime ? `Последно обновяване: ${lastUpdatedTime}` : 'Обнови котировки'}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded-md hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{lastUpdatedTime ? lastUpdatedTime : 'Котировки'}</span>
        </button>

        {/* Google Workspace Account / Sign-In */}
        {user ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGoogleSheetsModal}
              title="Google Sheets експорт"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 rounded-md hover:bg-emerald-900/50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Google Sheets</span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Потребител'}
                  className="w-6 h-6 rounded-full ring-1 ring-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={onLogout}
                title="Изход от Google"
                className="text-slate-400 hover:text-rose-400 transition-colors p-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 rounded-md hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-400" />
            <span>Вход с Google</span>
          </button>
        )}

        {/* Primary CTA */}
        <button
          onClick={onOpenNewPosition}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-emerald-500/20 cursor-pointer"
        >
          + Нова позиция
        </button>
      </div>
    </header>
  );
};
