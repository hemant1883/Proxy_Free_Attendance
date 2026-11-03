import React, { useState, useEffect } from 'react';
import { Server, Wifi, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, Globe, Smartphone } from 'lucide-react';
import axios from 'axios';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({ isOpen, onClose }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('presenceguard_api_url') || '';
    setServerUrl(saved);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid URL first (e.g. http://192.168.1.15:8080 or https://your-app.onrender.com)' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const cleanUrl = serverUrl.trim().replace(/\/$/, '');
    try {
      // Test ping to /api or base URL
      const res = await axios.get(`${cleanUrl}/api/sessions/active`, { timeout: 6000 });
      setTestResult({
        success: true,
        message: `Connected successfully! (Server responded with HTTP ${res.status})`
      });
    } catch (err: any) {
      if (err.response) {
        setTestResult({
          success: true,
          message: `Server reached! (HTTP ${err.response.status} - ${err.response.statusText || 'Online'})`
        });
      } else {
        setTestResult({
          success: false,
          message: `Could not reach server: ${err.message}. Make sure phones and computer are on the same Wi-Fi and firewall allows port 8080.`
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (serverUrl.trim()) {
      localStorage.setItem('presenceguard_api_url', serverUrl.trim().replace(/\/$/, ''));
    } else {
      localStorage.removeItem('presenceguard_api_url');
    }
    window.location.reload();
  };

  const handleClear = () => {
    localStorage.removeItem('presenceguard_api_url');
    setServerUrl('');
    window.location.reload();
  };

  const isConfigured = !!localStorage.getItem('presenceguard_api_url');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Shared Backend Server Connection</h3>
              <p className="text-[11px] text-slate-300">Sync live attendance between Teacher and Student devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Why sync is needed explanation */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <Smartphone className="w-4 h-4" />
              <span>Why Student marking doesn't show on Teacher's phone yet:</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              BLE is a broadcast beacon (proximity proof). When a student marks attendance, the record must be posted to a <strong>shared backend database</strong> so the teacher's phone can display it. Without a server, each phone stores records in its own offline memory.
            </p>
          </div>

          {/* Current Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-600 font-medium">Current Connection Mode:</span>
            {isConfigured ? (
              <span className="font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live Cloud / LAN Server
              </span>
            ) : (
              <span className="font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Offline Device Memory Only
              </span>
            )}
          </div>

          {/* Server URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Shared Backend Server URL (HTTP/HTTPS):
            </label>
            <div className="relative">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="e.g. https://your-backend.onrender.com or http://192.168.1.15:8080"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
              />
              <Globe className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-500">
              Tip: Enter your laptop's Wi-Fi IP (e.g. <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">http://192.168.x.x:8080</code>) or your Render cloud URL.
            </p>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  Clear & Use Offline
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

