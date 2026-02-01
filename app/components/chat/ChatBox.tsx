import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { SendButton } from './SendButton.client';
import { IconButton } from '~/components/ui/IconButton';
import { toast } from 'react-toastify';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import { SupabaseConnection } from './SupabaseConnection';
import { ExpoQrModal } from '~/components/workbench/ExpoQrModal';
import styles from './BaseChat.module.scss';
import type { ProviderInfo } from '~/types/model';
import { ColorSchemeDialog } from '~/components/ui/ColorSchemeDialog';
import { Dialog, DialogTitle, DialogDescription, DialogRoot } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/Button';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { APIKeyManager } from '~/components/chat/APIKeyManager';
import { LOCAL_PROVIDERS } from '~/utils/constants';
import type { DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import { McpTools } from './MCPTools';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface ChatBoxProps {
  isModelSettingsCollapsed: boolean;
  setIsModelSettingsCollapsed: (collapsed: boolean) => void;
  provider: any;
  providerList: any[];
  modelList: any[];
  apiKeys: Record<string, string>;
  isModelLoading: string | undefined;
  onApiKeysChange: (providerName: string, apiKey: string) => void;
  uploadedFiles: File[];
  imageDataList: string[];
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined;
  input: string;
  handlePaste: (e: React.ClipboardEvent) => void;
  TEXTAREA_MIN_HEIGHT: number;
  TEXTAREA_MAX_HEIGHT: number;
  isStreaming: boolean;
  handleSendMessage: (event: React.UIEvent, messageInput?: string) => void;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  chatStarted: boolean;
  exportChat?: () => void;
  qrModalOpen: boolean;
  setQrModalOpen: (open: boolean) => void;
  handleFileUpload: () => void;
  setProvider?: ((provider: ProviderInfo) => void) | undefined;
  model?: string | undefined;
  setModel?: ((model: string) => void) | undefined;
  setUploadedFiles?: ((files: File[]) => void) | undefined;
  setImageDataList?: ((dataList: string[]) => void) | undefined;
  handleInputChange?: ((event: React.ChangeEvent<HTMLTextAreaElement>) => void) | undefined;
  handleStop?: (() => void) | undefined;
  enhancingPrompt?: boolean | undefined;
  enhancePrompt?: (() => void) | undefined;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
  selectedElement?: ElementInfo | null;
  setSelectedElement?: ((element: ElementInfo | null) => void) | undefined;
  importChat?: ((description: string, messages: any[]) => Promise<void>) | undefined;
}

export const ChatBox: React.FC<ChatBoxProps> = (props) => {
  const {
    textareaRef,
    input,
    handleInputChange,
    handlePaste,
    TEXTAREA_MAX_HEIGHT,
    isStreaming,
    handleSendMessage,
    handleStop,
    uploadedFiles,
    imageDataList,
    setUploadedFiles,
    setImageDataList,
    chatMode,
    setChatMode,
    isModelSettingsCollapsed,
  } = props;

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
      if (isStreaming) {
        handleStop?.();
        return;
      }
      if (event.nativeEvent.isComposing) {
        return;
      }
      handleSendMessage?.(event);
    }
  };

  const [isModelSettingsOpen, setIsModelSettingsOpen] = React.useState(false);
  const [isSupabaseDialogOpen, setIsSupabaseDialogOpen] = React.useState(false);
  const [isMcpDialogOpen, setIsMcpDialogOpen] = React.useState(false);
  const [isColorSchemeOpen, setIsColorSchemeOpen] = React.useState(false);

  return (
    <>
      <div
        className={classNames(
          'relative w-full max-w-chat mx-auto z-prompt flex flex-col',
          props.isModelSettingsCollapsed ? '' : '',
        )}
      >
        {/* File Previews */}
        <FilePreview
          files={props.uploadedFiles}
          imageDataList={props.imageDataList}
          onRemove={(index) => {
            props.setUploadedFiles?.(props.uploadedFiles.filter((_, i) => i !== index));
            props.setImageDataList?.(props.imageDataList.filter((_, i) => i !== index));
          }}
        />
        <ClientOnly>
          {() => (
            <ScreenshotStateManager
              setUploadedFiles={props.setUploadedFiles}
              setImageDataList={props.setImageDataList}
              uploadedFiles={props.uploadedFiles}
              imageDataList={props.imageDataList}
            />
          )}
        </ClientOnly>

        {/* Selected Element Preview */}
        {props.selectedElement && (
          <div className="flex mx-1.5 gap-2 items-center justify-between rounded-lg rounded-b-none border border-b-none border-nortex-elements-borderColor text-nortex-elements-textPrimary flex py-1 px-2.5 font-medium text-xs bg-nortex-elements-background-depth-2">
            <div className="flex gap-2 items-center lowercase">
              <code className="bg-nortex-elements-item-backgroundAccent rounded-md px-1.5 py-1 mr-0.5 text-nortex-elements-item-contentAccent">
                {props?.selectedElement?.tagName}
              </code>
              selected for inspection
            </div>
            <button
              className="bg-transparent text-nortex-elements-item-contentAccent pointer-auto hover:text-red-500 transition-colors"
              onClick={() => props.setSelectedElement?.(null)}
            >
              Clear
            </button>
          </div>
        )}

        {/* Main Capsular Input Container */}
        <div
          className={classNames(
            'relative w-full shadow-sm border border-nortex-elements-borderColor backdrop-blur rounded-2xl bg-nortex-elements-background-depth-2 overflow-hidden transition-all duration-200 focus-within:ring-1 focus-within:ring-blue-500/20 focus-within:border-blue-500/30'
          )}
        >
          <div className="flex flex-col">
            {/* Plan/Builder Segmented Control (Top of Input) */}
            <div className="flex items-center gap-4 px-4 pt-3 pb-1">
              <div className="flex bg-nortex-elements-background-depth-1 p-0.5 rounded-lg border border-nortex-elements-borderColor">
                <button
                  onClick={() => props.setChatMode?.('discuss')}
                  className={classNames(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all",
                    props.chatMode === 'discuss'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary'
                  )}
                >
                  <div className="i-ph:chat-circle-text text-sm" />
                  <span>Plan</span>
                </button>
                <button
                  onClick={() => props.setChatMode?.('build')}
                  className={classNames(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all",
                    props.chatMode === 'build'
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary'
                  )}
                >
                  <div className="i-ph:code text-sm" />
                  <span>Code</span>
                </button>
              </div>

              {/* Hint Text */}
              <div className="text-[10px] text-nortex-elements-textTertiary">
                {props.chatMode === 'discuss' ? 'Define architecture & requirements' : 'Generate production-ready code'}
              </div>
            </div>

            {/* Text Area */}
            <div className="relative">
              <textarea
                ref={props.textareaRef}
                className={classNames(
                  'w-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm px-4 py-3 text-nortex-elements-textPrimary placeholder-nortex-elements-textTertiary leading-6',
                )}
                onKeyDown={onKeyDown}
                placeholder={props.chatMode === 'build' ? 'Describe the feature to build...' : 'What are we planning today?'}
                rows={1}
                style={{
                  minHeight: '52px',
                  maxHeight: props.TEXTAREA_MAX_HEIGHT,
                }}
                value={props.input}
                onChange={(event) => props.handleInputChange?.(event)}
                onPaste={props.handlePaste}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  files.forEach((file) => {
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const base64Image = e.target?.result as string;
                        props.setUploadedFiles?.([...props.uploadedFiles, file]);
                        props.setImageDataList?.([...props.imageDataList, base64Image]);
                      };
                      reader.readAsDataURL(file);
                    }
                  });
                }}
              />
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex items-center gap-1">
                {/* Plus Menu (Connectors & Upload) */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      title="More options"
                      className="p-1.5 flex items-center justify-center text-nortex-elements-textTertiary hover:text-nortex-elements-textPrimary hover:bg-nortex-elements-background-depth-3 rounded-lg transition-colors"
                    >
                      <div className="i-ph:plus-circle text-lg" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-[2000] min-w-[280px] bg-nortex-elements-background-depth-2 border border-nortex-elements-borderColor rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
                      sideOffset={5}
                      align="start"
                    >
                      {/* Files & Data Section */}
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-nortex-elements-textTertiary uppercase tracking-wider">
                        Files & Data
                      </div>

                      <DropdownMenu.Item
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none transition-all group"
                        onSelect={() => props.handleFileUpload()}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                          <div className="i-ph:file-arrow-up text-blue-500 text-lg" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-nortex-elements-textPrimary">Upload Files</div>
                          <div className="text-xs text-nortex-elements-textTertiary">Images, docs, code</div>
                        </div>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none transition-all group"
                        onSelect={() => toast.info('Git import available via the clone button below')}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                          <div className="i-ph:git-branch text-gray-400 text-lg" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-nortex-elements-textPrimary">Import from Git</div>
                          <div className="text-xs text-nortex-elements-textTertiary">Clone a repository</div>
                        </div>
                      </DropdownMenu.Item>

                      <div className="h-px bg-nortex-elements-borderColor my-2 mx-2" />

                      {/* Integrations Section */}
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-nortex-elements-textTertiary uppercase tracking-wider">
                        Integrations
                      </div>

                      <DropdownMenu.Item
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none transition-all group"
                        onSelect={() => setIsSupabaseDialogOpen(true)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                          <img
                            className="w-4 h-4"
                            height="16"
                            width="16"
                            crossOrigin="anonymous"
                            src="https://cdn.simpleicons.org/supabase"
                            alt="Supabase"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-nortex-elements-textPrimary">Supabase</div>
                          <div className="text-xs text-nortex-elements-textTertiary">Database connection</div>
                        </div>
                        <div className="i-ph:caret-right text-nortex-elements-textTertiary group-hover:text-nortex-elements-textSecondary" />
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none transition-all group"
                        onSelect={() => setIsMcpDialogOpen(true)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                          <div className="i-ph:plug-charging text-orange-500 text-lg" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-nortex-elements-textPrimary">MCP Tools</div>
                          <div className="text-xs text-nortex-elements-textTertiary">External tool connections</div>
                        </div>
                        <div className="i-ph:caret-right text-nortex-elements-textTertiary group-hover:text-nortex-elements-textSecondary" />
                      </DropdownMenu.Item>

                      <div className="h-px bg-nortex-elements-borderColor my-2 mx-2" />

                      {/* AI Configuration Section */}
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-nortex-elements-textTertiary uppercase tracking-wider">
                        AI Configuration
                      </div>

                      <DropdownMenu.Item
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none transition-all group"
                        onSelect={(e) => {
                          e.preventDefault();
                          setIsModelSettingsOpen(true);
                        }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                          <div className="i-ph:cpu text-violet-500 text-lg" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-nortex-elements-textPrimary">Model & Provider</div>
                          <div className="text-xs text-nortex-elements-textTertiary">With API selector</div>
                        </div>
                        <div className="i-ph:caret-right text-nortex-elements-textTertiary group-hover:text-nortex-elements-textSecondary" />
                      </DropdownMenu.Item>

                      <div className="h-px bg-nortex-elements-borderColor my-2 mx-2" />

                      {/* Design Section */}
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-nortex-elements-textTertiary uppercase tracking-wider">
                        Appearance
                      </div>

                      <DropdownMenu.Item
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none transition-all group"
                        onSelect={() => setIsColorSchemeOpen(true)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                          <div className="i-ph:palette text-pink-500 text-lg" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-nortex-elements-textPrimary">Themes</div>
                          <div className="text-xs text-nortex-elements-textTertiary">Colors & appearance</div>
                        </div>
                        <div className="i-ph:caret-right text-nortex-elements-textTertiary group-hover:text-nortex-elements-textSecondary" />
                      </DropdownMenu.Item>

                      <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger className="flex items-center gap-3 px-3 py-2.5 text-sm text-nortex-elements-textSecondary hover:text-nortex-elements-textPrimary hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none transition-all group data-[state=open]:bg-nortex-elements-background-depth-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                            <div className="i-ph:layout text-cyan-500 text-lg" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-nortex-elements-textPrimary">Templates</div>
                            <div className="text-xs text-nortex-elements-textTertiary">Next.js & React</div>
                          </div>
                          <div className="i-ph:caret-right text-nortex-elements-textTertiary group-hover:text-nortex-elements-textSecondary" />
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.SubContent
                            className="z-[1000] min-w-[220px] bg-nortex-elements-background-depth-2 border border-nortex-elements-borderColor rounded-xl shadow-2xl p-2 animate-in fade-in slide-in-from-left-2 duration-200"
                            sideOffset={8}
                          >
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none"
                              onClick={() => toast.info('Next.js App Router template selected')}
                            >
                              <div className="i-logos:nextjs-icon text-lg" />
                              <span className="text-nortex-elements-textPrimary">Next.js 15 (App Router)</span>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none"
                              onClick={() => toast.info('React + Vite template selected')}
                            >
                              <div className="i-logos:react text-lg" />
                              <span className="text-nortex-elements-textPrimary">React + Vite</span>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none"
                              onClick={() => toast.info('Remix template selected')}
                            >
                              <div className="i-logos:remix-icon text-lg" />
                              <span className="text-nortex-elements-textPrimary">Remix</span>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-nortex-elements-background-depth-3 rounded-lg cursor-pointer outline-none"
                              onClick={() => toast.info('Astro template selected')}
                            >
                              <div className="i-logos:astro-icon text-lg" />
                              <span className="text-nortex-elements-textPrimary">Astro</span>
                            </DropdownMenu.Item>
                          </DropdownMenu.SubContent>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Sub>

                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <div className="w-px h-4 bg-nortex-elements-borderColor mx-1" />

                {/* Enhance Prompt */}
                <IconButton
                  title="Enhance prompt"
                  disabled={props.input.length === 0 || props.enhancingPrompt}
                  className={classNames('transition-all p-1.5 rounded-lg hover:bg-nortex-elements-background-depth-3', props.enhancingPrompt ? 'opacity-100' : 'opacity-60 hover:opacity-100')}
                  onClick={() => {
                    props.enhancePrompt?.();
                    toast.success('Prompt enhanced!');
                  }}
                >
                  {props.enhancingPrompt ? (
                    <div className="i-svg-spinners:90-ring-with-bg text-blue-500 text-lg animate-spin" />
                  ) : (
                    <div className="i-nortex:stars text-lg" />
                  )}
                </IconButton>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice Input */}
                <SpeechRecognitionButton
                  isListening={props.isListening}
                  onStart={props.startListening}
                  onStop={props.stopListening}
                  disabled={props.isStreaming}
                />

                {/* Send Button */}
                <ClientOnly>
                  {() => (
                    <SendButton
                      show={props.input.length > 0 || props.isStreaming || props.uploadedFiles.length > 0}
                      isStreaming={props.isStreaming}
                      disabled={!props.providerList || props.providerList.length === 0}
                      onClick={(event) => {
                        if (props.isStreaming) {
                          props.handleStop?.();
                        } else if (props.input.length > 0 || props.uploadedFiles.length > 0) {
                          props.handleSendMessage?.(event);
                        }
                      }}
                    />
                  )}
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Text / Branding */}
        <div className="flex justify-between items-center mt-2 px-1">
          <div className="text-[10px] text-nortex-elements-textTertiary flex items-center gap-1 mx-auto">
            <div className="i-ph:sparkle-fill text-blue-500" />
            <span>AI can make mistakes. Please review generated code.</span>
          </div>

          <ExpoQrModal open={props.qrModalOpen} onClose={() => props.setQrModalOpen(false)} />
        </div>
      </div>

      {/* Supabase Connection Dialog */}
      <SupabaseConnection open={isSupabaseDialogOpen} onOpenChange={setIsSupabaseDialogOpen} showTrigger={false} />

      {/* MCP Tools Dialog */}
      <McpTools open={isMcpDialogOpen} onOpenChange={setIsMcpDialogOpen} showTrigger={false} />

      {/* Color Scheme / Theme Dialog */}
      <ColorSchemeDialog
        designScheme={props.designScheme}
        setDesignScheme={props.setDesignScheme}
        open={isColorSchemeOpen}
        onOpenChange={setIsColorSchemeOpen}
        showTrigger={false}
      />

      {/* Model Configuration Dialog */}
      <DialogRoot open={isModelSettingsOpen} onOpenChange={setIsModelSettingsOpen}>
        <Dialog>
          <div className="p-6 min-w-[400px] max-w-[90vw] flex flex-col gap-4">
            <div>
              <DialogTitle className="text-xl font-bold text-nortex-elements-textPrimary mb-1">Model Configuration</DialogTitle>
              <DialogDescription className="text-nortex-elements-textSecondary">Select and configure the AI model you want to use.</DialogDescription>
            </div>

            <div className="flex flex-col gap-4">
              <ClientOnly>
                {() => (
                  <>
                    <ModelSelector
                      key={props.provider?.name + ':' + props.modelList.length}
                      model={props.model}
                      setModel={props.setModel}
                      modelList={props.modelList}
                      provider={props.provider}
                      setProvider={props.setProvider}
                      providerList={props.providerList || (PROVIDER_LIST as ProviderInfo[])}
                      apiKeys={props.apiKeys}
                      modelLoading={props.isModelLoading}
                    />
                    {(props.providerList || []).length > 0 &&
                      props.provider &&
                      !LOCAL_PROVIDERS.includes(props.provider.name) && (
                        <APIKeyManager
                          provider={props.provider}
                          apiKey={props.apiKeys[props.provider.name] || ''}
                          setApiKey={(key) => {
                            props.onApiKeysChange(props.provider.name, key);
                          }}
                        />
                      )}
                  </>
                )}
              </ClientOnly>
            </div>

            <div className="flex justify-end mt-2">
              <Button variant="secondary" onClick={() => setIsModelSettingsOpen(false)}>Close</Button>
            </div>
          </div>
        </Dialog>
      </DialogRoot>
    </>
  );
};
