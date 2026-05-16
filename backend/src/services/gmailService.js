const { google } = require('googleapis');

const getOAuthClient = (account = {}) => new google.auth.OAuth2(
  account.googleClientId || process.env.GOOGLE_CLIENT_ID,
  account.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET,
  account.googleRedirectUri || process.env.GOOGLE_REDIRECT_URI
);

const getAuthUrl = (account) => {
  const client = getOAuthClient(account);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'],
    state: String(account._id)
  });
};

const exchangeCode = async (account, code) => {
  const client = getOAuthClient(account);
  const { tokens } = await client.getToken(code);
  return tokens;
};

const getGmailClient = async (account) => {
  const client = getOAuthClient(account);
  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.tokenExpiry ? new Date(account.tokenExpiry).getTime() : null
  });
  
  client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      account.accessToken = tokens.access_token;
      if (tokens.expiry_date) account.tokenExpiry = new Date(tokens.expiry_date);
      if (tokens.refresh_token) account.refreshToken = tokens.refresh_token;
      await account.save();
    }
  });
  
  return google.gmail({ version: 'v1', auth: client });
};

const getEmailAddress = async (account) => {
  const client = getOAuthClient(account);
  client.setCredentials({ access_token: account.accessToken, refresh_token: account.refreshToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  return data.email;
};

const fetchEmailById = async (account, messageId) => {
  const gmail = await getGmailClient(account);
  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });
  return data;
};

const parseEmail = (message) => {
  const headers = message.payload?.headers || [];
  const get = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const from = get('From');
  const subject = get('Subject');

  // Extract name and email from "Name <email>" format
  const match = from.match(/^(.*?)\s*<(.+?)>$/);
  const name = match ? match[1].trim().replace(/"/g, '') : from.split('@')[0];
  const email = match ? match[2].trim() : from.trim();

  // Extract plain text body
  let body = '';
  const extractBody = (part) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8').trim();
    }
    if (part.parts) part.parts.forEach(extractBody);
  };
  extractBody(message.payload);

  return { name, email, subject, body, threadId: message.threadId || null };
};

const getMessagesFromHistory = async (account, startHistoryId) => {
  const gmail = await getGmailClient(account);
  try {
    console.log('Fetching history from:', startHistoryId);
    const { data } = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX'
    });
    console.log('History response:', JSON.stringify(data, null, 2));
    const messages = [];
    (data.history || []).forEach((h) => {
      (h.messagesAdded || []).forEach((m) => messages.push(m.message.id));
    });
    return { messageIds: messages, newHistoryId: data.historyId };
  } catch (err) {
    console.error('History API error:', err.message, err.code);
    if (err.code === 404) return { messageIds: [], newHistoryId: startHistoryId };
    throw err;
  }
};

const setupGmailWatch = async (account) => {
  try {
    const gmail = await getGmailClient(account);
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: account.pubsubTopic || process.env.GOOGLE_PUBSUB_TOPIC,
        labelIds: ['INBOX']
      }
    });
    return watchResponse.data.historyId;
  } catch (err) {
    console.error('Gmail watch setup failed:', err.message);
    return null;
  }
};

const encodeRawMessage = (lines) =>
  Buffer.from(lines.join('\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const getHeaderFromMessage = (message, name) => {
  const headers = message.payload?.headers || [];
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
};

const sendEmail = async (account, to, subject, message) => {
  try {
    const gmail = await getGmailClient(account);
    const emailLines = [
      `To: ${to}`,
      'Content-Type: text/plain; charset=UTF-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      message
    ];

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodeRawMessage(emailLines) }
    });

    return res.data;
  } catch (err) {
    console.error('Send email failed:', err.message);
    throw err;
  }
};

/** Reply in an existing Gmail thread using connected account + thread id. */
const replyInThread = async (account, { threadId, toEmail, replyMessage }) => {
  if (!threadId) throw new Error('threadId is required');
  if (!toEmail) throw new Error('Recipient email is required');
  if (!replyMessage || !String(replyMessage).trim()) throw new Error('Reply message is required');

  const gmail = await getGmailClient(account);
  const { data: thread } = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'Message-ID', 'References']
  });

  const messages = thread.messages || [];
  if (!messages.length) throw new Error('Email thread not found');

  const accountEmail = (account.gmailEmail || '').toLowerCase();
  let refMsg = messages[messages.length - 1];
  for (let i = messages.length - 1; i >= 0; i--) {
    const from = getHeaderFromMessage(messages[i], 'From').toLowerCase();
    if (!accountEmail || !from.includes(accountEmail)) {
      refMsg = messages[i];
      break;
    }
  }

  const subject = getHeaderFromMessage(refMsg, 'Subject') || 'Your inquiry';
  const messageIdHeader = getHeaderFromMessage(refMsg, 'Message-ID');
  const references = getHeaderFromMessage(refMsg, 'References');
  const refChain = [references, messageIdHeader].filter(Boolean).join(' ').trim();
  const reSubject = /^re:/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim()}`;

  const emailLines = [
    `To: ${toEmail}`,
    `Subject: ${reSubject}`,
    ...(messageIdHeader ? [`In-Reply-To: ${messageIdHeader}`] : []),
    ...(refChain ? [`References: ${refChain}`] : []),
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
    '',
    String(replyMessage).trim()
  ];

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodeRawMessage(emailLines),
      threadId
    }
  });

  return response.data;
};

const replyToEmail = async (account, originalMessageId, replyMessage) => {
  const gmail = await getGmailClient(account);
  const { data: original } = await gmail.users.messages.get({
    userId: 'me',
    id: originalMessageId,
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'Message-ID']
  });
  if (!original.threadId) throw new Error('Original message has no thread');
  const from = getHeaderFromMessage(original, 'From');
  const match = from.match(/<(.+?)>/);
  const toEmail = match ? match[1].trim() : from.trim();
  return replyInThread(account, {
    threadId: original.threadId,
    toEmail,
    replyMessage
  });
};

module.exports = {
  getAuthUrl,
  exchangeCode,
  getEmailAddress,
  fetchEmailById,
  parseEmail,
  getMessagesFromHistory,
  setupGmailWatch,
  sendEmail,
  replyInThread,
  replyToEmail
};
