import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, Globe, Smartphone } from 'lucide-react';
import axios from 'axios';
import {
  DEFAULT_CLOUD_BACKEND_URL,
  getConfiguredServerOrigin,
  isExplicitOfflineMode
} from '../../services/api';

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
    if (saved === 'OFFLINE') {
      setServerUrl('');
    } else {
      setServerUrl(saved || DEFAULT_CLOUD_BACKEND_URL);
    }
    setTestResult(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid URL first (e.g. https://presenceguard-backend.onrender.com or http://192.168.1.15:8080)' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const cleanUrl = serverUrl.trim().replace(/\/$/, '');
    try {
      const res = await axios.get(`${cleanUrl}/api/auth/health`, { timeout: 30000 });
      setTestResult({
        success: true,
        message: `Connected successfully! Backend responded with HTTP ${res.status} (${res.data?.status || 'UP'})`
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
          message: `Could not reach server: ${err.message}. If using Render free tier, it may take ~30s to wake up.`
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

  const handleUseDefaultCloud = () => {
    localStorage.removeItem('presenceguard_api_url');
    setServerUrl(DEFAULT_CLOUD_BACKEND_URL);
    window.location.reload();
  };

  const handleUseOffline = () => {
    localStorage.setItem('presenceguard_api_url', 'OFFLINE');
    window.location.reload();
  };

  const offlineMode = isExplicitOfflineMode();
  const activeOrigin = getConfiguredServerOrigin() || 'Cloud / Proxy (/api)';

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
          {/* Explanation */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <Smartphone className="w-4 h-4" />
              <span>Multi-Device Attendance Sync:</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Both Teacher and Student devices automatically sync through the shared Spring Boot + TiDB server (<code className="font-mono text-[11px]">{DEFAULT_CLOUD_BACKEND_URL}</code>). You can also point to a local Wi-Fi Spring Boot server below.
            </p>
          </div>

          {/* Current Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-600 font-medium block">Active Connection:</span>
              <span className="font-mono text-[11px] text-slate-500">{offlineMode ? 'Offline Local Memory' : activeOrigin}</span>
            </div>
            {offlineMode ? (
              <span className="font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 self-start sm:self-center">
                <AlertCircle className="w-3.5 h-3.5" />
                Single-Device Offline
              </span>
            ) : (
              <span className="font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 self-start sm:self-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Shared Live Server
              </span>
            )}
          </div>

          {/* Server URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Backend Server URL (HTTP/HTTPS):
            </label>
            <div className="relative">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder={DEFAULT_CLOUD_BACKEND_URL}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
              />
              <Globe className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUseOffline}
                className="px-3 py-2 text-amber-700 hover:bg-amber-50 text-xs font-semibold rounded-lg transition-colors"
              >
                Offline Mode
              </button>
              <button
                type="button"
                onClick={handleUseDefaultCloud}
                className="px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Default Cloud
              </button>
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
