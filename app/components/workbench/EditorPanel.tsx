import { useStore } from '@nanostores/react';
import { memo, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  CodeMirrorEditor,
  type EditorDocument,
  type EditorSettings,
  type OnChangeCallback as OnEditorChange,
  type OnSaveCallback as OnEditorSave,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeader } from '~/components/ui/PanelHeader';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { description } from '~/lib/persistence';
import { themeStore } from '~/lib/stores/theme';
import type { FileMap } from '~/lib/stores/files';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { WORK_DIR } from '~/utils/constants';
import { renderLogger } from '~/utils/logger';
import { isMobile } from '~/utils/mobile';
import type { FileHistory } from '~/types/actions';
import { FileBreadcrumb } from './FileBreadcrumb';
import { FileTree } from './FileTree';

interface EditorPanelProps {
  files?: FileMap;
  unsavedFiles?: Set<string>;
  editorDocument?: EditorDocument;
  selectedFile?: string | undefined;
  isStreaming?: boolean;
  fileHistory?: Record<string, FileHistory>;
  onEditorChange?: OnEditorChange;
  onEditorScroll?: OnEditorScroll;
  onFileSelect?: (value?: string) => void;
  onFileSave?: OnEditorSave;
  onFileReset?: () => void;
}

const editorSettings: EditorSettings = { tabSize: 2 };

export const EditorPanel = memo(
  ({
    files,
    unsavedFiles,
    editorDocument,
    selectedFile,
    isStreaming,
    fileHistory,
    onFileSelect,
    onEditorChange,
    onEditorScroll,
    onFileSave,
    onFileReset,
  }: EditorPanelProps) => {
    renderLogger.trace('EditorPanel');

    const theme = useStore(themeStore);
    const projectTitle = useStore(description);

    const activeFileSegments = useMemo(() => {
      if (!editorDocument) {
        return undefined;
      }
      return editorDocument.filePath.split('/');
    }, [editorDocument]);

    // Simple helper to get the filename
    const activeFilename = useMemo(() => {
      return activeFileSegments?.at(-1) || 'Untitled';
    }, [activeFileSegments]);

    const activeFileUnsaved = useMemo(() => {
      if (!editorDocument || !unsavedFiles) {
        return false;
      }
      return unsavedFiles instanceof Set && unsavedFiles.has(editorDocument.filePath);
    }, [editorDocument, unsavedFiles]);

    return (
      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={15} collapsible className="border-r border-nortex-elements-borderColor bg-nortex-elements-background-depth-1 flex flex-col">
          {/* Sidebar Header */}
          <div className="flex flex-col border-b border-nortex-elements-borderColor">
            <div className="flex items-center h-10 px-3 bg-nortex-elements-background-depth-1">
              <div className="i-ph:magnifying-glass text-nortex-elements-textTertiary mr-2 text-sm" />
              <input
                type="text"
                placeholder="Search files..."
                className="bg-transparent border-none outline-none text-sm text-nortex-elements-textPrimary placeholder:text-nortex-elements-textTertiary w-full"
              />
            </div>
          </div>

          {/* Project Title & Tree */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-3 py-2 text-xs font-bold text-nortex-elements-textTertiary uppercase tracking-wider flex items-center justify-between group cursor-pointer hover:text-nortex-elements-textPrimary">
              <span>{projectTitle || 'Project'}</span>
              <div className="i-ph:caret-down text-nortex-elements-textTertiary" />
            </div>
            <div className="flex-1 overflow-y-auto modern-scrollbar">
              <FileTree
                className="h-full"
                files={files}
                hideRoot
                unsavedFiles={unsavedFiles}
                fileHistory={fileHistory}
                rootFolder={WORK_DIR}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle />

        <Panel className="flex flex-col bg-nortex-elements-background-depth-1" defaultSize={80} minSize={20}>
          {/* Editor Tabs */}
          {editorDocument && (
            <div className="flex items-center bg-nortex-elements-background-depth-2 border-b border-nortex-elements-borderColor overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 px-3 py-2 bg-nortex-elements-background-depth-1 border-r border-t border-nortex-elements-borderColor min-w-[150px] max-w-[200px] border-t-accent-500 relative group cursor-default">
                <div className="i-ph:file-code text-accent-500 text-sm" />
                <span className="text-sm text-nortex-elements-textPrimary truncate flex-1">{activeFilename}</span>
                <div className={classNames("opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-nortex-elements-background-depth-3 cursor-pointer transition-opacity", { "opacity-100": activeFileUnsaved })} onClick={(e) => { e.stopPropagation(); workbenchStore.closeFile(editorDocument.filePath); }}>
                  {activeFileUnsaved ? (
                    <div className="w-2 h-2 rounded-full bg-nortex-elements-textPrimary" />
                  ) : (
                    <div className="i-ph:x text-xs text-nortex-elements-textTertiary" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Breadcrumbs & Toolbar (repurposed PanelHeader) */}
          <div className="h-9 flex items-center px-4 border-b border-nortex-elements-borderColor bg-nortex-elements-background-depth-1">
            {activeFileSegments?.length && (
              <div className="flex items-center flex-1 text-sm">
                <FileBreadcrumb pathSegments={activeFileSegments} files={files} onFileSelect={onFileSelect} />
                {activeFileUnsaved && (
                  <div className="flex gap-1 ml-auto -mr-1.5">
                    <PanelHeaderButton onClick={onFileSave}>
                      <div className="i-ph:floppy-disk-duotone" />
                      Save
                    </PanelHeaderButton>
                    <PanelHeaderButton onClick={onFileReset}>
                      <div className="i-ph:clock-counter-clockwise-duotone" />
                      Reset
                    </PanelHeaderButton>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-full flex-1 overflow-hidden modern-scrollbar">
            <CodeMirrorEditor
              theme={theme}
              editable={!isStreaming && editorDocument !== undefined}
              settings={editorSettings}
              doc={editorDocument}
              autoFocusOnDocumentChange={!isMobile()}
              onScroll={onEditorScroll}
              onChange={onEditorChange}
              onSave={onFileSave}
            />
          </div>
        </Panel>
      </PanelGroup>
    );
  },
);
