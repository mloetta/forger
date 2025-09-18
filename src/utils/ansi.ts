export const Colors: Record<string, string> = {
  reset: '\u001b[0m',
  black: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
};

export const Aliases: Record<string, string> = {
  rs: 'reset',
  b: 'black',
  r: 'red',
  g: 'green',
  y: 'yellow',
  bl: 'blue',
  m: 'magenta',
  c: 'cyan',
  w: 'white',
};

export function formatAnsi(text: string, color: string) {
  let colorKey = color;
  if (!Colors[colorKey] && !Aliases[colorKey]) {
    throw new Error('Invalid ANSI Color');
  }

  if (!Colors[colorKey]) {
    const alias = Aliases[colorKey];
    if (!alias) {
      throw new Error('Invalid ANSI Color');
    }
    colorKey = alias;
  }

  return `${Colors[colorKey]}${text}${Colors['reset']}`;
}
