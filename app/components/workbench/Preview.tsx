import { useStore } from '@nanostores/react';
import { memo, useEffect, useRef, useState } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { PortDropdown } from './PortDropdown';
import { usePreviewStore } from '~/lib/stores/previews';

interface PreviewProps {
  setSelectedElement?: (element: any) => void;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const cssStyles = `
  .loader-container {
    display: flex;
    gap: 6px;
  }
  .loader-bar {
    width: 4px;
    height: 24px;
    background: #D97706;
    border-radius: 2px;
    animation: bar-grow 1s infinite ease-in-out;
  }
  .loader-bar:nth-child(1) { animation-delay: 0s; }
  .loader-bar:nth-child(2) { animation-delay: 0.1s; }
  .loader-bar:nth-child(3) { animation-delay: 0.2s; }
  .loader-bar:nth-child(4) { animation-delay: 0.3s; }

  @keyframes bar-grow {
    0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
    50% { transform: scaleY(1.2); opacity: 1; }
  }

  .progress-ring {
    animation: spin 2s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ESTIMATED_LOAD_TIME = 45; // seconds - target preview load time

export const Preview = memo(({ setSelectedElement }: PreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const previewStore = usePreviewStore();
  const viewMode = useStore(previewStore.previewMode);

  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];

  // Timer for tracking loading progress
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLoading && loadStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - loadStartTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, loadStartTime]);

  useEffect(() => {
    if (!activePreview) {
      setUrl('');
      return;
    }

    if (activePreview.baseUrl !== url) {
      setIsLoading(true);
      setLoadStartTime(Date.now());
      setElapsedTime(0);
      setUrl(activePreview.baseUrl);
    }
  }, [activePreview, url]);

  const onIframeLoad = () => {
    setIsLoading(false);
    setLoadStartTime(null);
    setElapsedTime(0);
  };

  const reloadPreview = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setLoadStartTime(Date.now());
      setElapsedTime(0);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const getContainerStyle = () => {
    switch (viewMode) {
      case 'tablet':
        return { width: '768px', height: '100%', boxShadow: '0 0 40px rgba(0,0,0,0.1)' };
      case 'mobile':
        return { width: '375px', height: '100%', boxShadow: '0 0 40px rgba(0,0,0,0.1)' };
      default:
        return { width: '100%', height: '100%', boxShadow: 'none' };
    }
  };

  const getProgressPercent = () => {
    if (!isLoading || elapsedTime === 0) return 0;
    return Math.min((elapsedTime / ESTIMATED_LOAD_TIME) * 100, 95);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="flex flex-col h-full w-full bg-nortex-elements-background-depth-2">
      <style>{cssStyles}</style>

      {/* Main Preview Canvas */}
      <div className="flex-1 relative w-full h-full overflow-hidden flex justify-center bg-transparent">
        {url ? (
          <div
            className="relative transition-all duration-300 ease-in-out bg-white"
            style={getContainerStyle()}
          >
            {isLoading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <div className="flex flex-col items-center gap-4">
                  {/* Animated loader */}
                  <div className="loader-container relative w-12 h-12 flex items-center justify-center">
                    <div className="loader-bar"></div>
                    <div className="loader-bar"></div>
                    <div className="loader-bar"></div>
                    <div className="loader-bar"></div>
                  </div>

                  {/* Progress info */}
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Building Preview...
                    </div>

                    {/* Progress bar */}
                    <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${getProgressPercent()}%` }}
                      />
                    </div>

                    {/* Time elapsed */}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {elapsedTime > 0 ? (
                        <span>
                          {formatTime(elapsedTime)} elapsed
                          {elapsedTime < ESTIMATED_LOAD_TIME && (
                            <span className="ml-1">
                              • ~{formatTime(Math.max(0, ESTIMATED_LOAD_TIME - elapsedTime))} remaining
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>Starting up... (typically 45-60 seconds)</span>
                      )}
                    </div>

                    {/* Status hint */}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs text-center">
                      {elapsedTime < 10 && 'Installing dependencies...'}
                      {elapsedTime >= 10 && elapsedTime < 30 && 'Compiling project...'}
                      {elapsedTime >= 30 && elapsedTime < 50 && 'Starting dev server...'}
                      {elapsedTime >= 50 && 'Almost there...'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              className="w-full h-full border-none bg-white block"
              src={url}
              onLoad={onIframeLoad}
              allow="clipboard-read; clipboard-write; allow-scripts; allow-forms; allow-popups; allow-modals; allow-storage-access-by-user-activation; allow-same-origin"
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-nortex-elements-textTertiary p-4">
            <div className="i-ph:globe-duotone text-6xl opacity-20 mb-4" />
            <div className="text-lg font-medium opacity-60">Ready to Preview</div>
            <div className="text-sm opacity-40 mt-1 text-center max-w-xs">Start your application in the terminal to view it here.</div>
            <div className="text-xs opacity-30 mt-3">Typical load time: 45-60 seconds</div>
          </div>
        )}
      </div>
    </div>
  );
});
