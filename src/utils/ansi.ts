export interface Colors {
  reset: '\u001b[0m';
  black: '\u001b[30m';
  red: '\u001b[31m';
  green: '\u001b[32m';
  yellow: '\u001b[33m';
  blue: '\u001b[34m';
  magenta: '\u001b[35m';
  cyan: '\u001b[36m';
  white: '\u001b[37m';
}

interface Aliases {
  rs: 'reset';
  b: 'black';
  r: 'red';
  g: 'green';
  y: 'yellow';
  bl: 'blue';
  m: 'magenta';
  c: 'cyan';
  w: 'white';
}

export type ColorsType = keyof Colors | keyof Aliases;

const colors: Record<keyof Colors, string> = {
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

const aliases: Record<keyof Aliases, keyof Colors> = {
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

export function formatAnsi(text: string, color: ColorsType) {
  const col = (aliases[color as keyof Aliases] || color) as keyof Colors;
  return `${colors[col]}${text}${colors.reset}`;
}
