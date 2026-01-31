import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--nortex-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--nortex-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--nortex-elements-terminal-textColor'),
    background: cssVar('--nortex-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--nortex-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--nortex-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--nortex-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--nortex-elements-terminal-color-black'),
    red: cssVar('--nortex-elements-terminal-color-red'),
    green: cssVar('--nortex-elements-terminal-color-green'),
    yellow: cssVar('--nortex-elements-terminal-color-yellow'),
    blue: cssVar('--nortex-elements-terminal-color-blue'),
    magenta: cssVar('--nortex-elements-terminal-color-magenta'),
    cyan: cssVar('--nortex-elements-terminal-color-cyan'),
    white: cssVar('--nortex-elements-terminal-color-white'),
    brightBlack: cssVar('--nortex-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--nortex-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--nortex-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--nortex-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--nortex-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--nortex-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--nortex-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--nortex-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
