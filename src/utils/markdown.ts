import { Emojis } from './emojis';

// Markdown helpers

// Ensures potentially user-provided content won't escape pill components
function _escapeCodeblock(content: any) {
  return content.toString().replace(/`/g, 'ˋ');
}

// Internal icon resolver
function _icon(icon: keyof typeof Emojis) {
  let i;

  if (Emojis[icon]) {
    i = Emojis[icon];
  }

  if (i) {
    // @ts-ignore
    return i.replace(/:[a-zA-Z0-9_]*:/, ':i:');
  } else {
    throw new Error(`Icon ${icon} not found`);
  }
}

// Returns a Discord inline highlight markdown
export function highlight(content: any) {
  return '`' + content.toString().replace(/\`/g, 'ˋ') + '`';
}

// Returns a Discord codeblock markdown
export function codeblock(type: string, content: any) {
  content = [content];
  if (!content.length) return '```' + type + '```';
  return '```' + type + '\n' + _escapeCodeblock(content.join('\n')) + '```';
}

// Returns a default pill component
export function pill(content: any) {
  return '**` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `**';
}

// Returns a small pill component
export function smallPill(content: any) {
  return '` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `';
}

// Returns an icon
export function icon(icon: keyof typeof Emojis) {
  return _icon(icon);
}

// Returns a discord emoji object
export function iconAsEmoji(icon: keyof typeof Emojis) {
  let i = _icon(icon);

  return {
    id: i?.replace(/<a?:[a-z0-9_]*:([0-9]*)>/g, '$1'),
    name: 'i',
    animated: i?.startsWith('<a:'),
  };
}

// Returns a pill component with an icon
export function iconPill(icon: keyof typeof Emojis, content: any) {
  return _icon(icon) + '**` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `**';
}

// Returns a small pill component with an icon
export function SmallIconPill(icon: keyof typeof Emojis, content: any) {
  return _icon(icon) + '` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `';
}

// Returns a Discord formatted link markdown
export function link(url: string, masked: string, tooltip: string = '', embed: boolean = false) {
  if (tooltip.length) tooltip = ` '${tooltip}'`;
  if (masked && !embed) return `[${masked}](<${url.replace(/\)/g, '\\)')}>${tooltip})`;
  if (masked && embed) return `[${masked}](${url.replace(/\)/g, '\\)')}${tooltip})`;

  return url;
}

// Returns a Discord formatted link markdown inside a pill component
export function linkPill(url: string, content: any = '', tooltip: string = '') {
  if (tooltip.length) tooltip = ` '${tooltip}'`;
  if (content) return `[**\` ${_escapeCodeblock(content)} \`**](${url.replace(/\)/g, '\\)')}${tooltip})`;

  return url;
}

// Returns a Discord formatted link markdown inside a pill component with an icon
export function iconLinkPill(icon: keyof typeof Emojis, url: string, content: any = '', tooltip = '') {
  if (tooltip.length) tooltip = ` '${tooltip}'`;
  if (content) {
    return `${_icon(icon)} [**\` ${_escapeCodeblock(content)} \`**](${url.replace(/\)/g, '\\)')}${tooltip})`;
  }

  return url;
}

// Returns a Discord formatted timestamp markdown
export function timestamp(time: number, flag: string = 't') {
  return `<t:${Math.floor(time / 1000)}:${flag}>`;
}

// Returns a string trimmed to fit a max length
export function stringwrap(content = '', length: number, newlines = true) {
  if (!newlines) content = content.replace(/\n/g, ' ');
  if (content.length > length) {
    let c = content.slice(0, length) + '...';
    while (c.endsWith(' ...')) c = c.slice(0, -4) + '...';
    return c;
  }
  return content;
}

// Returns a string trimmed to fit a max length without breaking words
export function stringwrapPreserveWords(content = '', lenght: number, newLines = true) {
  if (!newLines) content = content.replace(/\n/g, ' ');
  if (content.length <= lenght) return content;

  let c = content.split(' ');
  while (c.join(' ').length + (c.length - 1) > lenght - 1) {
    c.pop();
  }
  return c.join(' ') + '...';
}

// Returns a citation with optional link
export function citation(number = 1, url: string, tooltip: string = '') {
  const Superscript = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  let formatted = '';
  for (const n of number.toString().split('')) {
    formatted += Superscript[parseInt(n)];
  }
  if (url) {
    if (tooltip.length) {
      if (tooltip.endsWith(' ')) {
        tooltip = tooltip.slice(0, -1);
      }
      tooltip = ` '${tooltip.replace(/["*]/g, '')}'`;
    }
    return `[⁽${formatted}⁾](${url.replace(/\)/g, '\\)')}${tooltip})`;
  }
  return `⁽${formatted}⁾`;
}

// Returns a Discord formatted command markdown
export function commandMention(name: string, id: string) {
  return `</${name}:${id}>`;
}

// Returns a Discord embed 'inline' field layout for given columns
export function inline(cols: string[][], options?: { spacing?: number; }) {
  options = options ?? {};
  const spacing = Math.max(options.spacing ?? 1);

  const lengths = cols[0]!.map((_, colIndex) => Math.max(...cols.map(row => (row[colIndex] ?? "").length)));

  let lines = cols.map(row => row
    .map((cell, i) =>(cell ?? "").padEnd(lengths[i]! + spacing, " "))
    .join("")
  );

  return lines;
};