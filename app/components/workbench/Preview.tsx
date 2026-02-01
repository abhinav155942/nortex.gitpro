import { useStore } from '@nanostores/react';
import { memo, useMemo } from 'react';
import { SandpackProvider, SandpackLayout, SandpackPreview } from '@codesandbox/sandpack-react';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';

interface PreviewProps {
  setSelectedElement?: (element: any) => void;
}

export const Preview = memo(({ setSelectedElement }: PreviewProps) => {
  const files = useStore(workbenchStore.files);

  const sandpackFiles = useMemo(() => {
    const res: Record<string, string> = {};
    const workDir = WORK_DIR.endsWith('/') ? WORK_DIR : `${WORK_DIR}/`;

    Object.entries(files).forEach(([absPath, file]) => {
      if (file?.type === 'file' && !file.isBinary) {
        let relPath = absPath;
        if (absPath.startsWith(workDir)) {
          relPath = absPath.slice(workDir.length);
        } else if (absPath.startsWith(WORK_DIR)) {
          relPath = absPath.slice(WORK_DIR.length);
          if (relPath.startsWith('/')) relPath = relPath.slice(1);
        }

        res[relPath] = file.content;
      }
    });
    return res;
  }, [files]);

  return (
    <div className="h-full w-full bg-nortex-elements-background-depth-2 flex flex-col">
      <SandpackProvider
        template="nextjs"
        theme="dark"
        files={sandpackFiles}
        options={{
          classes: {
            "sp-layout": "!h-full !border-none !rounded-none",
            "sp-wrapper": "!h-full",
            "sp-preview-iframe": "!h-full",
          },
          externalResources: ["https://cdn.tailwindcss.com"]
        }}
        customSetup={{
          dependencies: {
            "lab": "latest" // Just to ensure it triggers update if needed, but dependencies are read from package.json in files usually
          }
        }}
      >
        <SandpackLayout className="!h-full !border-none !rounded-none">
          <SandpackPreview
            className="!h-full"
            showOpenInCodeSandbox={false}
            showRefreshButton={true}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
});

