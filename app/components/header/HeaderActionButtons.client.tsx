import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { usePreviewStore } from '~/lib/stores/previews';
import { DeployButton } from '~/components/deploy/DeployButton';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

export function HeaderActionButtons({ chatStarted: _chatStarted }: HeaderActionButtonsProps) {
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const currentView = useStore(workbenchStore.currentView);
  const previewStore = usePreviewStore();
  const previewMode = useStore(previewStore.previewMode);

  const shouldShowButtons = activePreview;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-2">
        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary bg-nortex-elements-button-secondary-background hover:bg-nortex-elements-button-secondary-backgroundHover rounded-md transition-colors"
          title="Share"
        >
          <div className="i-ph:share-network" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* GitHub Button */}
        <button
          onClick={() => {
            toast.info("Select 'Deploy to GitHub' from the Publish menu to configure.");
          }}
          className="flex items-center justify-center w-8 h-8 text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary bg-nortex-elements-button-secondary-background hover:bg-nortex-elements-button-secondary-backgroundHover rounded-full transition-colors"
          title="GitHub"
        >
          <div className="i-ph:github-logo text-lg" />
        </button>

        {/* Upgrade Button */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
          title="Upgrade Plan"
          onClick={() => window.open('https://nortex.dev/pricing', '_blank')}
        >
          <div className="i-ph:lightning" />
          <span>Upgrade</span>
        </button>

        {/* Publish/Deploy Button */}
        <div className="relative">
          <DeployButton />
        </div>

      </div>
    </div>
  );
}


