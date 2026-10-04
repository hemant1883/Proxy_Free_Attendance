import React, { useState, useEffect } from 'react';
import { X, Radio, Sliders, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { mockBLEService, RSSI_PRESETS } from '../../services/ble/MockBLEService';
import { RSSIIndicator, getRSSICategory } from './RSSIIndicator';

interface BLESimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BLESimulationModal: React.FC<BLESimulationModalProps> = ({ isOpen, onClose }) => {
  const [sliderValue, setSliderValue] = useState<number>(mockBLEService.getSimulatedRSSIValue());
  const [broadcastActive, setBroadcastActive] = useState<boolean>(mockBLEService.isBroadcasting());
  const activeBroadcast = mockBLEService.getActiveBroadcast();

  useEffect(() => {
    if (isOpen) {
      setSliderValue(mockBLEService.getSimulatedRSSIValue());
      setBroadcastActive(mockBLEService.isBroadcasting());
    }
  }, [isOpen]);

  const handlePresetSelect = (val: number) => {
    setSliderValue(val);
    mockBLEService.setSimulatedRSSI(val);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSliderValue(val);
    mockBLEService.setSimulatedRSSI(val);
  };

  const cat = getRSSICategory(sliderValue);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-base">BLE RF Simulation Controller</h3>
              <p className="text-xs text-slate-300">Phase 1 Development &amp; Evaluation Tool</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational banner */}
        <div className="bg-blue-50 border-b border-blue-100 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
          <Sliders className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">MockBLEService Abstraction:</span> In Phase 1, browsers lack full peripheral BLE advertising. This simulator lets you test RSSI values against the backend's <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-800">RSSI ≥ -70 dBm</code> threshold before replacing with Android/Kotlin in Phase 2.
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Active Broadcast Status */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 font-medium">Classroom Beacon Status:</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {broadcastActive && activeBroadcast ? (
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Broadcasting ({activeBroadcast.courseCode} - {activeBroadcast.teacherDeviceId})
                  </span>
                ) : (
                  <span className="text-slate-600">No active beacon broadcast (Teacher must start broadcast)</span>
                )}
              </p>
            </div>
            {broadcastActive && (
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-medium">
                Active
              </span>
            )}
          </div>

          {/* Current Signal Preview */}
          <div className={`p-4 rounded-xl border ${cat.borderColor} ${cat.bgColor} flex items-center justify-between`}>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                Simulated RSSI Signal
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {sliderValue} <span className="text-sm font-normal text-slate-600">dBm</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                {cat.eligible ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Eligible for Attendance
                  </span>
                ) : (
                  <span className="text-rose-700 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Ineligible: Move Closer to Classroom
                  </span>
                )}
              </div>
            </div>
            <div className="scale-125 pr-2">
              <RSSIIndicator rssi={sliderValue} showDetails={false} size="lg" />
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Classroom Distance Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RSSI_PRESETS.map((preset) => {
                const isSelected = sliderValue === preset.value;
                const isEligible = preset.value >= -70;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetSelect(preset.value)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{preset.label}</span>
                      <span className={`font-mono font-bold ${isEligible ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {preset.value} dBm
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fine Tuning Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wide">Continuous RF Slider</span>
              <span className="text-slate-500 font-mono text-[11px]">Threshold: -70 dBm</span>
            </div>
            <input
              type="range"
              min="-95"
              max="-35"
              step="1"
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
              <span>-95 dBm (Far)</span>
              <span className="text-rose-600 font-semibold">-70 dBm (Cut-off)</span>
              <span>-35 dBm (Adjacent)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handlePresetSelect(-55)}
            className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset to Inside (-55 dBm)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
