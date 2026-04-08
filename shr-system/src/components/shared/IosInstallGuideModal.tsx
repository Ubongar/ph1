interface IosInstallGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function IosInstallGuideModal({ open, onClose }: IosInstallGuideModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[71] w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <h2 id="ios-install-title" className="text-lg font-semibold text-gray-900">Install on iPhone or iPad</h2>
        <p className="mt-2 text-sm text-gray-600">
          Safari on iOS does not always show a direct install prompt. Use these steps to add SHR to your home screen.
        </p>

        <ol className="mt-4 space-y-2 text-sm text-gray-700 list-decimal pl-5">
          <li>Open this app in Safari.</li>
          <li>Tap the Share button in the browser toolbar.</li>
          <li>Scroll and tap Add to Home Screen.</li>
          <li>Confirm by tapping Add in the top-right corner.</li>
        </ol>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
