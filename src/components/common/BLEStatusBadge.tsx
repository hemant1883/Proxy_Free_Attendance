import React, { useState, useEffect } from 'react';
import { Bluetooth, Radio } from 'lucide-react';
import { mockBLEService } from '../../services/ble/MockBLEService';

export const BLEStatusBadge: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [isBroadcasting, setIsBroadcasting] = useState(mockBLEService.isBroadcasting());
  const [currentRSSI, setCurrentRSSI] = useState(mockBLEService.getSimulatedRSSIValue());

  useEffect(() => {
    const checkStatus = () => {
      setIsBroadcasting(mockBLEService.isBroadcasting());
    };
    const interval = setInterval(checkStatus, 1500);

    const unsubscribe = mockBLEService.subscribeRSSI((newRSSI) => {
      setCurrentRSSI(newRSSI);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return (
    <button
      onClick={onClick}
      title="Click to open BLE Proximity Simulator"
      className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm"
    >
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
      </span>
      <Bluetooth className="w-3.5 h-3.5 text-blue-600" />
      <span className="font-semibold">MockBLE Mode</span>
      <span className="hidden sm:inline text-slate-500">|</span>
      <span className="hidden sm:inline text-slate-700 font-mono">{currentRSSI} dBm</span>
      {isBroadcasting && (
        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
          <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
          Beacon Active
        </span>
      )}
    </button>
  );
};
