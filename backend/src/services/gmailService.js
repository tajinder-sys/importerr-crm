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
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/userinfo.email'],
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

module.exports = { getAuthUrl, exchangeCode, getEmailAddress, fetchEmailById, parseEmail, getMessagesFromHistory, setupGmailWatch };
