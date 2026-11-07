import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { TradePosition, PortfolioSummary } from '../types/trade';
import {
  createTradingSpreadsheet,
  updateExistingSpreadsheet,
  CreateSpreadsheetResult,
} from '../services/googleSheets';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
  positions: TradePosition[];
  closedTrades?: TradePosition[];
  summary: PortfolioSummary;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogin,
  positions,
  closedTrades = [],
  summary,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState(
    `ApexTrade Journal - ${new Date().toISOString().split('T')[0]}`
  );
  const [existingId, setExistingId] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<CreateSpreadsheetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Confirmation state for modifying existing spreadsheets (MANDATORY per Workspace Integration skill)
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);

  const openPositions = positions.filter((p) => p.status !== 'closed');

  const handleCreateNew = async () => {
    setIsExporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await createTradingSpreadsheet(
        positions,
        summary,
        spreadsheetTitle.trim(),
        closedTrades
      );
      setResult(res);
    } catch (err: any) {
      console.error('Error creating Google Sheet:', err);
      setError(err.message || 'Възникна грешка при създаването на Google Sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleTriggerExistingUpdate = () => {
    if (!existingId.trim()) {
      setError('Моля, въведете валиден Spreadsheet ID или пълен URL адрес на таблицата.');
      return;
    }
    setError(null);
    // Show mandatory explicit confirmation dialog before overwriting data
    setShowConfirmUpdate(true);
  };

  const executeExistingUpdate = async () => {
    setShowConfirmUpdate(false);
    setIsExporting(true);
    setError(null);
    setResult(null);

    // Extract ID if user pasted full URL
    let cleanId = existingId.trim();
    const urlMatch = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      cleanId = urlMatch[1];
    }

    try {
      await updateExistingSpreadsheet(cleanId, positions, summary, closedTrades);
      setResult({
        spreadsheetId: cleanId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        title: 'Актуализиран Google Sheet',
      });
    } catch (err: any) {
      console.error('Error updating Google Sheet:', err);
      setError(err.message || 'Възникна грешка при обновяването на Google Sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Google Sheets Интеграция
              </h2>
              <p className="text-xs text-slate-400">
                Синхронизиране и експорт на позиции и R-multiple метрики в облака
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Auth State Checking */}
          {!user ? (
            <div className="p-6 text-center space-y-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Свържете се с вашия Google акаунт
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  За да експортирате дневника си с акции и криптовалути директно в Google Sheets, е необходимо да влезете с Google.
                </p>
              </div>

              {/* Official Google Sign-In button styling per Workspace skill */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onLogin}
                  className="inline-flex items-center gap-3 px-5 py-2.5 bg-white text-slate-800 rounded-md font-medium text-xs hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>Вход с Google</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Authenticated User Status */}
              <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || ''}
                      className="w-7 h-7 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="text-slate-200 font-semibold block">
                      {user.displayName || user.email}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {user.email}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[11px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 rounded">
                  Google Свързан
                </span>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-850 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`py-2 px-3 rounded font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'new'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Нов Google Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('existing')}
                  className={`py-2 px-3 rounded font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'existing'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Обнови съществуващ</span>
                </button>
              </div>

              {/* Mode: Create New Spreadsheet */}
              {mode === 'new' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 font-medium">
                      Заглавие на новия Google Sheet
                    </label>
                    <input
                      type="text"
                      value={spreadsheetTitle}
                      onChange={(e) => setSpreadsheetTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg text-xs text-slate-400 space-y-1">
                    <p>
                      Ще бъде създаден нов документ с <strong className="text-slate-200">{openPositions.length}</strong> позиции, форматирани колони (R-multiple, Open Risk, Open PnL) и обобщени статистики.
                    </p>
                  </div>

                  <button
                    onClick={handleCreateNew}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Генериране в Google Sheets...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Създай Google Sheet сега</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Mode: Update Existing Spreadsheet */}
              {mode === 'existing' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 font-medium">
                      Spreadsheet ID или пълен Google Sheets линк
                    </label>
                    <input
                      type="text"
                      placeholder="напр. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms или https://docs.google.com/..."
                      value={existingId}
                      onChange={(e) => setExistingId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    onClick={handleTriggerExistingUpdate}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Обновяване на таблицата...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Синхронизирай с таблицата</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Error feedback */}
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg flex items-start gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success feedback with direct Link */}
              {result && (
                <div className="p-4 bg-emerald-950/50 border border-emerald-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Успешно синхронизирано с Google Sheets!</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Таблицата е готова и съдържа всички най-актуални пазарни данни и изчисления.
                  </p>
                  <a
                    href={result.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Отвори таблицата в Google Sheets</span>
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mandatory User Confirmation Dialog for Overwrite / Update */}
        {showConfirmUpdate && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-750 p-5 rounded-xl max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    Потвърждение за обновяване на Google Sheet
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Сигурни ли сте, че искате да презапишете съдържанието на работния лист в избраната таблица с текущите {openPositions.length} отворени позиции? Това действие ще замени съществуващите редове в диапазона A1.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfirmUpdate(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Отказ
                </button>
                <button
                  type="button"
                  onClick={executeExistingUpdate}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer"
                >
                  Потвърждавам и записвам
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
