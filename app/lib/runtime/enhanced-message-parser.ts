import { createScopedLogger } from '~/utils/logger';
import { StreamingMessageParser, type StreamingMessageParserOptions } from './message-parser';

const logger = createScopedLogger('EnhancedMessageParser');

/**
 * Enhanced message parser that detects code blocks and file patterns
 * even when AI models don't wrap them in proper artifact tags.
 * Fixes issue #1797 where code outputs to chat instead of files.
 */
export class EnhancedStreamingMessageParser extends StreamingMessageParser {
  private _processedCodeBlocks = new Map<string, Set<string>>();
  private _artifactCounter = 0;

  // Optimized command pattern lookup
  private _commandPatternMap = new Map<string, RegExp>([
    ['npm', /^(npm|yarn|pnpm)\s+(install|run|start|build|dev|test|init|create|add|remove)/],
    ['git', /^(git)\s+(add|commit|push|pull|clone|status|checkout|branch|merge|rebase|init|remote|fetch|log)/],
    ['docker', /^(docker|docker-compose)\s+/],
    ['build', /^(make|cmake|gradle|mvn|cargo|go)\s+/],
    ['network', /^(curl|wget|ping|ssh|scp|rsync)\s+/],
    ['webcontainer', /^(cat|chmod|cp|echo|hostname|kill|ln|ls|mkdir|mv|ps|pwd|rm|rmdir|xxd)\s*/],
    ['webcontainer-extended', /^(alias|cd|clear|env|false|getconf|head|sort|tail|touch|true|uptime|which)\s*/],
    ['interpreters', /^(node|python|python3|java|go|rust|ruby|php|perl)\s+/],
    ['text-processing', /^(grep|sed|awk|cut|tr|sort|uniq|wc|diff)\s+/],
    ['archive', /^(tar|zip|unzip|gzip|gunzip)\s+/],
    ['process', /^(ps|top|htop|kill|killall|jobs|nohup)\s*/],
    ['system', /^(df|du|free|uname|whoami|id|groups|date|uptime)\s*/],
  ]);

  constructor(options: StreamingMessageParserOptions = {}) {
    super(options);
  }

  parse(messageId: string, input: string): string {
    // First try the normal parsing
    let output = super.parse(messageId, input);

    // Always check for code blocks that should be files, but prioritize existing artifacts
    const enhancedInput = this._detectAndWrapCodeBlocks(messageId, input);

    if (enhancedInput !== input) {
      // Reset and reparse with enhanced input
      this.reset();
      output = super.parse(messageId, enhancedInput);
    }

    return output;
  }

  private _detectAndWrapCodeBlocks(messageId: string, input: string): string {
    // Initialize processed blocks for this message if not exists
    if (!this._processedCodeBlocks.has(messageId)) {
      this._processedCodeBlocks.set(messageId, new Set());
    }

    const processed = this._processedCodeBlocks.get(messageId)!;

    let enhanced = input;

    // First, detect and handle shell commands separately
    enhanced = this._detectAndWrapShellCommands(messageId, enhanced, processed);

    // Optimized regex patterns with better performance
    const patterns = [
      // Pattern 1: File path followed by code block (most common, check first)
      {
        regex: /(?:^|\n)([\/\w\-\.]+\.\w+):?\s+```(\w*)\n([\s\S]*?)```/gim,
        type: 'file_path',
      },

      // Pattern 2: Explicit file creation mentions
      {
        regex:
          /(?:create|update|modify|edit|write|add|generate|here'?s?|file:?)\s+(?:a\s+)?(?:new\s+)?(?:file\s+)?(?:called\s+)?[`'"]*([\/\w\-\.]+\.\w+)[`'"]*:?\s+```(\w*)\n([\s\S]*?)```/gi,
        type: 'explicit_create',
      },

      // Pattern 3: Code blocks with filename comments
      {
        regex: /```(\w*)\n(?:\/\/|#|<!--)\s*(?:file:?|filename:?)\s*([\/\w\-\.]+\.\w+).*?\n([\s\S]*?)```/gi,
        type: 'comment_filename',
      },

      // Pattern 4: Code block with "in <filename>" context
      {
        regex: /(?:in|for|update)\s+[`'"]*([\/\w\-\.]+\.\w+)[`'"]*:?\s+```(\w*)\n([\s\S]*?)```/gi,
        type: 'in_filename',
      },

      // Pattern 5: Special format {{[[ name="..." branch="..." ]] for file creation
      {
        regex: /\{\{\[\[\s*name="([^"]+)"(?:\s+branch="([^"]*)")?\s*\]\]\s*([\s\S]*?)\{\{\]\]/gi,
        type: 'special_token',
      },

      // Pattern 6: Structured files (package.json, components)
      {
        regex:
          /```(?:json|jsx?|tsx?|html?|vue|svelte)\n(\{[\s\S]*?"(?:name|version|scripts|dependencies|devDependencies)"[\s\S]*?\}|<\w+[^>]*>[\s\S]*?<\/\w+>[\s\S]*?)```/gi,
        type: 'structured_file',
      },
    ];

    // Process each pattern in order of likelihood
    for (const pattern of patterns) {
      enhanced = enhanced.replace(pattern.regex, (match, ...args) => {
        const blockHash = this._hashBlock(match);

        if (processed.has(blockHash)) {
          return match;
        }

        let filePath: string;
        let language: string;
        let content: string;

        // Extract based on pattern type
        if (pattern.type === 'comment_filename') {
          [language, filePath, content] = args;
        } else if (pattern.type === 'special_token') {
          let branch: string;
          [filePath, branch, content] = args;
          language = filePath.split('.').pop() || 'plaintext';

          if (branch) {
            logger.debug(`File branch: ${branch}`);
          }
        } else if (pattern.type === 'structured_file') {
          content = args[0];
          language = pattern.regex.source.includes('json') ? 'json' : 'jsx';
          filePath = this._inferFileNameFromContent(content, language);
        } else {
          // file_path, explicit_create, in_filename patterns
          [filePath, language, content] = args;
        }

        // Check if this should be treated as a shell command instead of a file
        if (this._isShellCommand(content, language)) {
          processed.add(blockHash);
          logger.debug(`Auto-wrapped code block as shell command instead of file`);

          return this._wrapInShellAction(content, messageId);
        }

        // Clean up the file path
        filePath = this._normalizeFilePath(filePath);

        // Validate file path
        if (!this._isValidFilePath(filePath)) {
          return match;
        }

        // Check if there's proper context for file creation
        if (!this._hasFileContext(enhanced, match)) {
          const isExplicitFilePattern =
            pattern.type === 'explicit_create' ||
            pattern.type === 'comment_filename' ||
            pattern.type === 'file_path' ||
            pattern.type === 'special_token';

          if (!isExplicitFilePattern) {
            return match;
          }
        }

        // Mark as processed
        processed.add(blockHash);

        // Generate artifact wrapper
        const artifactId = `artifact-${messageId}-${this._artifactCounter++}`;
        const wrapped =
          pattern.type === 'special_token'
            ? this._wrapInArtifact(artifactId, filePath, content, (args as any)[1])
            : this._wrapInArtifact(artifactId, filePath, content);

        logger.debug(`Auto-wrapped code block as file: ${filePath}`);

        return wrapped;
      });
    }

    // Also detect standalone file operations without code blocks
    const fileOperationPattern =
      /(?:create|write|save|generate)\s+(?:a\s+)?(?:new\s+)?file\s+(?:at\s+)?[`'"]*([\/\w\-\.]+\.\w+)[`'"]*\s+with\s+(?:the\s+)?(?:following\s+)?content:?\s*\n([\s\S]+?)(?=\n\n|\n(?:create|write|save|generate|now|next|then|finally)|$)/gi;

    enhanced = enhanced.replace(fileOperationPattern, (match, filePath, content) => {
      const blockHash = this._hashBlock(match);

      if (processed.has(blockHash)) {
        return match;
      }

      filePath = this._normalizeFilePath(filePath);

      if (!this._isValidFilePath(filePath)) {
        return match;
      }

      processed.add(blockHash);

      const artifactId = `artifact-${messageId}-${this._artifactCounter++}`;
      content = content.trim();

      const wrapped = this._wrapInArtifact(artifactId, filePath, content);
      logger.debug(`Auto-wrapped file operation: ${filePath}`);

      return wrapped;
    });

    return enhanced;
  }

  private _wrapInArtifact(artifactId: string, filePath: string, content: string, branch?: string): string {
    let title = filePath.split('/').pop() || 'File';

    if (branch) {
      title += ` [${branch}]`;
    }

    return `<nortexArtifact id="${artifactId}" title="${title}" type="bundled">
<nortexAction type="file" filePath="${filePath}">
${content}
</nortexAction>
</nortexArtifact>`;
  }

  private _wrapInShellAction(content: string, messageId: string): string {
    const artifactId = `artifact-${messageId}-${this._artifactCounter++}`;

    return `<nortexArtifact id="${artifactId}" title="Shell Command" type="shell">
<nortexAction type="shell">
${content.trim()}
</nortexAction>
</nortexArtifact>`;
  }

  private _normalizeFilePath(filePath: string): string {
    filePath = filePath.replace(/[`'"]/g, '').trim();
    filePath = filePath.replace(/\\/g, '/');

    if (filePath.startsWith('./')) {
      filePath = filePath.substring(2);
    }

    if (!filePath.startsWith('/') && !filePath.startsWith('.')) {
      filePath = '/' + filePath;
    }

    return filePath;
  }

  private _isValidFilePath(filePath: string): boolean {
    const hasExtension = /\.\w+$/.test(filePath);

    if (!hasExtension) {
      return false;
    }

    const isValid = /^[\/\w\-\.]+$/.test(filePath);

    if (!isValid) {
      return false;
    }

    const excludePatterns = [
      /^\/?(tmp|temp|test|example)\//i,
      /\.(tmp|temp|bak|backup|old|orig)$/i,
      /^\/?(output|result|response)\//i,
      /^code_\d+\.(sh|bash|zsh)$/i,
      /^(untitled|new|demo|sample)\d*\./i,
    ];

    for (const pattern of excludePatterns) {
      if (pattern.test(filePath)) {
        return false;
      }
    }

    return true;
  }

  private _hasFileContext(input: string, codeBlockMatch: string): boolean {
    const matchIndex = input.indexOf(codeBlockMatch);

    if (matchIndex === -1) {
      return false;
    }

    const beforeContext = input.substring(Math.max(0, matchIndex - 200), matchIndex);
    const afterContext = input.substring(matchIndex + codeBlockMatch.length, matchIndex + codeBlockMatch.length + 100);

    const fileContextPatterns = [
      /\b(create|write|save|add|update|modify|edit|generate)\s+(a\s+)?(new\s+)?file/i,
      /\b(file|filename|filepath)\s*[:=]/i,
      /\b(in|to|as)\s+[`'"]?[\w\-\.\/]+\.[a-z]{2,4}[`'"]?/i,
      /\b(component|module|class|function)\s+\w+/i,
    ];

    const contextText = beforeContext + afterContext;

    return fileContextPatterns.some((pattern) => pattern.test(contextText));
  }

  private _inferFileNameFromContent(content: string, language: string): string {
    const componentMatch = content.match(
      /(?:function|class|const|export\s+default\s+function|export\s+function)\s+(\w+)/,
    );

    if (componentMatch) {
      const name = componentMatch[1];
      const ext = language === 'jsx' ? '.jsx' : language === 'tsx' ? '.tsx' : '.js';

      return `/components/${name}${ext}`;
    }

    if (content.includes('function App') || content.includes('const App')) {
      return '/App.jsx';
    }

    return `/component-${Date.now()}.jsx`;
  }

  private _hashBlock(content: string): string {
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return hash.toString(36);
  }

  private _isShellCommand(content: string, language: string): boolean {
    const shellLanguages = ['bash', 'sh', 'shell', 'zsh', 'fish', 'powershell', 'ps1'];
    const isShellLang = shellLanguages.includes(language.toLowerCase());

    if (!isShellLang) {
      return false;
    }

    const trimmedContent = content.trim();
    const lines = trimmedContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return false;
    }

    if (this._looksLikeScriptContent(trimmedContent)) {
      return false;
    }

    if (lines.length === 1) {
      return this._isSingleLineCommand(lines[0]);
    }

    return this._isCommandSequence(lines);
  }

  private _isSingleLineCommand(line: string): boolean {
    const hasChaining = /[;&|]{1,2}/.test(line);

    if (hasChaining) {
      const parts = line.split(/[;&|]{1,2}/).map((p) => p.trim());
      return parts.every((part) => part.length > 0 && !this._looksLikeScriptContent(part));
    }

    const prefixPatterns = [
      /^sudo\s+/,
      /^time\s+/,
      /^nohup\s+/,
      /^watch\s+/,
      /^env\s+\w+=\w+\s+/,
    ];

    let cleanLine = line;

    for (const prefix of prefixPatterns) {
      cleanLine = cleanLine.replace(prefix, '');
    }

    for (const [, pattern] of this._commandPatternMap) {
      if (pattern.test(cleanLine)) {
        return true;
      }
    }

    return this._isSimpleCommand(cleanLine);
  }

  private _isCommandSequence(lines: string[]): boolean {
    const commandLikeLines = lines.filter(
      (line) =>
        line.length > 0 && !line.startsWith('#') && (this._isSingleLineCommand(line) || this._isSimpleCommand(line)),
    );

    return commandLikeLines.length / lines.length > 0.7;
  }

  private _isSimpleCommand(line: string): boolean {
    const words = line.split(/\s+/);

    if (words.length === 0) {
      return false;
    }

    const firstWord = words[0];

    if (line.includes('=') && !line.startsWith('export ') && !line.startsWith('env ') && !firstWord.includes('=')) {
      return false;
    }

    if (line.includes('function ') || line.match(/^\w+\s*\(\s*\)/)) {
      return false;
    }

    if (/^(if|for|while|case|function|until|select)\s/.test(line)) {
      return false;
    }

    if (line.includes('<<') || line.startsWith('EOF') || line.startsWith('END')) {
      return false;
    }

    if (line.includes('"""') || line.includes("'''")) {
      return false;
    }

    const commandLikePatterns = [
      /^[a-z][a-z0-9-_]*$/i,
      /^\.\/[a-z0-9-_./]+$/i,
      /^\/[a-z0-9-_./]+$/i,
      /^[a-z][a-z0-9-_]*\s+-.+/i,
    ];

    return commandLikePatterns.some((pattern) => pattern.test(firstWord));
  }

  private _looksLikeScriptContent(content: string): boolean {
    const lines = content.trim().split('\n');

    const scriptIndicators = [
      /^#!/,
      /function\s+\w+/,
      /^\w+\s*\(\s*\)\s*\{/,
      /^(if|for|while|case)\s+.*?(then|do|in)/,
      /^\w+=[^=].*$/,
      /^(local|declare|readonly)\s+/,
      /^(source|\.)\s+/,
      /^(exit|return)\s+\d+/,
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
        continue;
      }

      if (scriptIndicators.some((pattern) => pattern.test(trimmedLine))) {
        return true;
      }
    }

    return false;
  }

  private _detectAndWrapShellCommands(_messageId: string, input: string, processed: Set<string>): string {
    const shellCommandPattern = /```(bash|sh|shell|zsh|fish|powershell|ps1)\n([\s\S]*?)```/gi;

    return input.replace(shellCommandPattern, (match, language, content) => {
      const blockHash = this._hashBlock(match);

      if (processed.has(blockHash)) {
        return match;
      }

      if (this._isShellCommand(content, language)) {
        processed.add(blockHash);
        logger.debug(`Auto-wrapped shell code block as command: ${language}`);

        return this._wrapInShellAction(content, _messageId);
      }

      return match;
    });
  }

  reset() {
    super.reset();
    this._processedCodeBlocks.clear();
    this._artifactCounter = 0;
  }
}
