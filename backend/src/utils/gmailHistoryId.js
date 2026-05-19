/** Gmail history IDs are large integers; compare with BigInt, store as strings. */

const parseGmailHistoryId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  try {
    return BigInt(String(value).trim());
  } catch {
    return null;
  }
};

const formatGmailHistoryId = (value) => {
  const parsed = parseGmailHistoryId(value);
  return parsed === null ? null : String(parsed);
};

const gmailHistoryIdBefore = (value) => {
  const parsed = parseGmailHistoryId(value);
  if (parsed === null) return null;
  return parsed > 1n ? String(parsed - 1n) : '1';
};

module.exports = {
  parseGmailHistoryId,
  formatGmailHistoryId,
  gmailHistoryIdBefore,
};
