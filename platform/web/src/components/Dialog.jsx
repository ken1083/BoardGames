import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Dialog({ toast, confirmState, onDismissToast, onConfirm, onCancel }) {
  const [toastVisible, setToastVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setToastVisible(true);
    } else {
      setToastVisible(false);
    }
  }, [toast]);

  useEffect(() => {
    if (confirmState) {
      setModalVisible(true);
    } else {
      setModalVisible(false);
    }
  }, [confirmState]);

  // Toast Component
  const renderToast = () => {
    if (!toast) return null;

    const icons = {
      success: <CheckCircle className="text-emerald-500" size={20} />,
      error: <AlertCircle className="text-red-500" size={20} />,
      warning: <AlertTriangle className="text-amber-500" size={20} />,
      info: <Info className="text-blue-500" size={20} />,
    };

    const backgrounds = {
      success: 'bg-emerald-50 border-emerald-100',
      error: 'bg-red-50 border-red-100',
      warning: 'bg-amber-50 border-amber-100',
      info: 'bg-blue-50 border-blue-100',
    };

    return (
      <div className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-500 transform",
        toastVisible ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0 pointer-events-none"
      )}>
        <div className={cn(
          "flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl backdrop-blur-md min-w-[320px] max-w-md",
          backgrounds[toast.type] || backgrounds.info
        )}>
          {icons[toast.type] || icons.info}
          <p className="text-sm font-bold text-neutral-800 flex-1">{toast.message}</p>
          <button
            onClick={onDismissToast}
            className="p-1 hover:bg-black/5 rounded-full transition-colors text-neutral-400 hover:text-neutral-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Confirm Modal Component
  const renderModal = () => {
    if (!confirmState) return null;

    return (
      <div className={cn(
        "fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-all duration-300",
        modalVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
          onClick={onCancel}
        />

        {/* Modal Card */}
        <div className={cn(
          "relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 transform transition-all duration-300",
          modalVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}>
          <div className="flex flex-col items-center text-center">
            <p className="text-neutral-900 font-medium leading-relaxed mb-8">
              {confirmState.message}
            </p>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={onConfirm}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                Confirm
              </button>
              <button
                onClick={onCancel}
                className="w-full py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl font-bold text-lg transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderToast()}
      {renderModal()}
    </>
  );
}
