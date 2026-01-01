function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getCslString(csl: Record<string, unknown>, key: string): string | undefined {
  return asString(csl[key]);
}

function getCslNumber(csl: Record<string, unknown>, key: string): number | undefined {
  const value = csl[key];
  return typeof value === 'number' ? value : undefined;
}

function getIssuedYear(csl: Record<string, unknown>): string | undefined {
  const issued = csl['issued'];
  if (!issued || typeof issued !== 'object') return undefined;
  const dateParts = (issued as Record<string, unknown>)['date-parts'];
  if (!Array.isArray(dateParts) || dateParts.length === 0) return undefined;
  const first = dateParts[0];
  if (!Array.isArray(first) || first.length === 0) return undefined;
  const year = first[0];
  return typeof year === 'number' ? String(year) : typeof year === 'string' ? year : undefined;
}

function formatAuthors(csl: Record<string, unknown>): string[] {
  const authors = csl['author'];
  if (!Array.isArray(authors)) return [];
  const names: string[] = [];
  for (const author of authors) {
    if (!author || typeof author !== 'object') continue;
    const family = asString((author as Record<string, unknown>)['family']) || '';
    const given = asString((author as Record<string, unknown>)['given']) || '';
    const formatted = family && given ? `${family}, ${given}` : family || given;
    if (formatted) names.push(formatted);
  }
  return names;
}

function formatBibtexAuthors(csl: Record<string, unknown>): string | undefined {
  const authors = csl['author'];
  if (!Array.isArray(authors) || authors.length === 0) return undefined;
  const parts: string[] = [];
  for (const author of authors) {
    if (!author || typeof author !== 'object') continue;
    const family = asString((author as Record<string, unknown>)['family']);
    const given = asString((author as Record<string, unknown>)['given']);
    if (family && given) parts.push(`${family}, ${given}`);
    else if (family) parts.push(family);
    else if (given) parts.push(given);
  }
  return parts.length ? parts.join(' and ') : undefined;
}

function escapeBibtex(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n+/g, ' ')
    .trim();
}

function makeBibtexKey(doi: string, csl?: Record<string, unknown>): string {
  const base = doi.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const year = csl ? getIssuedYear(csl) : undefined;
  const firstAuthor = csl ? formatAuthors(csl)[0] : undefined;
  const firstAuthorToken = firstAuthor ? firstAuthor.split(',')[0].replace(/[^a-zA-Z0-9]+/g, '') : '';
  const key = `${firstAuthorToken || 'ref'}${year ? `_${year}` : ''}_${base}`.slice(0, 80);
  return key || base || 'ref';
}

function pickBibtexType(csl: Record<string, unknown>): string {
  const type = getCslString(csl, 'type');
  switch (type) {
    case 'journal-article':
      return 'article';
    case 'book':
      return 'book';
    case 'book-chapter':
      return 'incollection';
    case 'proceedings-article':
      return 'inproceedings';
    case 'report':
      return 'techreport';
    case 'thesis':
      return 'phdthesis';
    default:
      return 'misc';
  }
}

export function cslToBibtex(doi: string, csl: Record<string, unknown>): string {
  const entryType = pickBibtexType(csl);
  const key = makeBibtexKey(doi, csl);

  const fields: Array<[string, string | undefined]> = [
    ['title', getCslString(csl, 'title')],
    ['author', formatBibtexAuthors(csl)],
    ['journal', toArray(getCslString(csl, 'container-title')).join(' ') || undefined],
    ['year', getIssuedYear(csl)],
    ['volume', getCslString(csl, 'volume')],
    [
      'number',
      getCslString(csl, 'issue') ??
        (getCslNumber(csl, 'issue') !== undefined ? String(getCslNumber(csl, 'issue')) : undefined),
    ],
    ['pages', getCslString(csl, 'page')],
    ['publisher', getCslString(csl, 'publisher')],
    ['doi', getCslString(csl, 'DOI') ?? doi],
    ['url', getCslString(csl, 'URL')],
  ];

  const lines: string[] = [];
  lines.push(`@${entryType}{${key},`);
  for (const [field, value] of fields) {
    if (!value) continue;
    lines.push(`  ${field} = {${escapeBibtex(value)}},`);
  }
  lines.push('}');
  return lines.join('\n');
}

export function cslToRis(csl: Record<string, unknown>): string {
  const type = getCslString(csl, 'type');
  const ty =
    type === 'book'
      ? 'BOOK'
      : type === 'book-chapter'
        ? 'CHAP'
        : type === 'proceedings-article'
          ? 'CPAPER'
          : 'JOUR';

  const lines: string[] = [];
  lines.push(`TY  - ${ty}`);

  const authors = csl['author'];
  if (Array.isArray(authors)) {
    for (const author of authors) {
      if (!author || typeof author !== 'object') continue;
      const family = asString((author as Record<string, unknown>)['family']);
      const given = asString((author as Record<string, unknown>)['given']);
      const value = family && given ? `${family}, ${given}` : family || given;
      if (value) lines.push(`AU  - ${value}`);
    }
  }

  const title = getCslString(csl, 'title');
  if (title) lines.push(`TI  - ${title}`);

  const journal = toArray(getCslString(csl, 'container-title')).join(' ');
  if (journal) lines.push(`JO  - ${journal}`);

  const year = getIssuedYear(csl);
  if (year) lines.push(`PY  - ${year}`);

  const volume = getCslString(csl, 'volume');
  if (volume) lines.push(`VL  - ${volume}`);

  const issue = getCslString(csl, 'issue') ?? (getCslNumber(csl, 'issue') ? String(getCslNumber(csl, 'issue')) : undefined);
  if (issue) lines.push(`IS  - ${issue}`);

  const pages = getCslString(csl, 'page');
  if (pages) lines.push(`SP  - ${pages}`);

  const doi = getCslString(csl, 'DOI');
  if (doi) lines.push(`DO  - ${doi}`);

  const url = getCslString(csl, 'URL');
  if (url) lines.push(`UR  - ${url}`);

  lines.push('ER  -');
  return lines.join('\n');
}
