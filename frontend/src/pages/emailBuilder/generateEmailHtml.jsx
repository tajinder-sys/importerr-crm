/**
 * generateEmailHtml
 * Converts a blocks array into a full email-safe HTML string.
 */
const BLOCKS_COMMENT_START = '<!--BLOCKS_JSON:';
const BLOCKS_COMMENT_END   = ':BLOCKS_JSON-->';

/**
 * Extract embedded block JSON from generated HTML (if present).
 * Returns parsed block array or null.
 */
export function extractBlocksFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  const start = html.indexOf(BLOCKS_COMMENT_START);
  const end   = html.indexOf(BLOCKS_COMMENT_END);
  if (start === -1 || end === -1) return null;
  try {
    const json = html.slice(start + BLOCKS_COMMENT_START.length, end);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function generateEmailHtml(blocks = []) {
  const rows = blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return `
          <tr>
            <td style="padding: 12px 32px 4px;">
              <h${block.level || 1} style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: ${block.level === 2 ? '22px' : '28px'}; font-weight: 700; color: ${block.color || '#111827'}; line-height: 1.3;">
                ${escapeHtml(block.content || '')}
              </h${block.level || 1}>
            </td>
          </tr>`;

      case 'text':
        return `
          <tr>
            <td style="padding: 8px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.7; color: ${block.color || '#374151'}; text-align: ${block.align || 'left'};">
              ${block.content ? block.content.replace(/\n/g, '<br>') : ''}
            </td>
          </tr>`;

      case 'button':
        return `
          <tr>
            <td style="padding: 16px 32px; text-align: ${block.align || 'center'};">
              <a href="${block.url || '#'}"
                 style="display: inline-block; background-color: ${block.bgColor || '#4f46e5'}; color: ${block.textColor || '#ffffff'}; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px;">
                ${escapeHtml(block.label || 'Click Here')}
              </a>
            </td>
          </tr>`;

      case 'image':
        return `
          <tr>
            <td style="padding: 12px 32px; text-align: ${block.align || 'center'};">
              <img src="${block.src || ''}" alt="${escapeHtml(block.alt || '')}"
                   style="max-width: 100%; height: auto; border-radius: ${block.rounded ? '8px' : '0'};" />
            </td>
          </tr>`;

      case 'divider':
        return `
          <tr>
            <td style="padding: 12px 32px;">
              <hr style="border: none; border-top: 1px solid ${block.color || '#e5e7eb'}; margin: 0;" />
            </td>
          </tr>`;

      case 'spacer':
        return `
          <tr>
            <td style="height: ${block.height || 24}px; line-height: ${block.height || 24}px;">&nbsp;</td>
          </tr>`;

      case 'columns': {
        const cols = (block.columns || []).map((col) => `
          <td style="width: ${Math.floor(100 / (block.columns?.length || 2))}%; vertical-align: top; padding: 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #374151;">
            ${col.content ? col.content.replace(/\n/g, '<br>') : ''}
          </td>`).join('');
        return `
          <tr>
            <td style="padding: 12px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>${cols}</tr>
              </table>
            </td>
          </tr>`;
      }

      default:
        return '';
    }
  }).join('');

  const embeddedJson = `${BLOCKS_COMMENT_START}${JSON.stringify(blocks)}${BLOCKS_COMMENT_END}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${rows}
          <tr>
            <td style="padding: 24px 32px 32px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #9ca3af;">
            &copy; ${new Date().getFullYear()} Importerr.com.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
${embeddedJson}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert legacy body HTML string → single text block
 */
export function htmlToBlocks(html) {
  if (!html || typeof html !== 'string') return [];
  return [{ id: uid(), type: 'text', content: html.replace(/<[^>]+>/g, '') }];
}

/**
 * Parse stored bodyJson safely
 */
export function parseBodyJson(bodyJson) {
  if (!bodyJson) return null;

  // Backend stores bodyJson as ["[{...}]"] — unwrap array containing a JSON string
  const raw = Array.isArray(bodyJson) && typeof bodyJson[0] === 'string'
    ? bodyJson[0]
    : bodyJson;

  // Already a proper block array
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') return raw;

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}