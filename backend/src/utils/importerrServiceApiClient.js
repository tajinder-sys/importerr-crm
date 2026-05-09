const importerrServiceTokenManager = require('./importerrServiceTokenManager');

const DEFAULT_TIMEOUT_MS = Number(process.env.IMPORTERR_TIMEOUT_MS || 15000);
const SOURCE_SERVICE_NAME = process.env.INTERNAL_SERVICE_NAME || 'crm';
const INTERNAL_SERVICE_API_KEY = String(process.env.INTERNAL_SERVICE_API_KEY || '').trim();

const buildUrl = (baseUrl, path) => {
  const normalizedBase = String(baseUrl || '').replace(/\/+$/, '');
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`;
  const fullUrl = `${normalizedBase}${normalizedPath}`;
  try {
    const parsed = new URL(fullUrl);
    // Avoid potential localhost resolution delays on some environments.
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
      return parsed.toString();
    }
  } catch (_error) {
    // no-op, fallback to original url
  }
  return fullUrl;
};

const parseResponse = async (response) => {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return { raw };
  }
};

const requestImporterrToken = async (baseUrl) => {
  const apiKey = String(process.env.INTERNAL_SERVICE_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('INTERNAL_SERVICE_API_KEY is not configured');
  }

  const tokenEndpoint = '/generate-token';
  const tokenUrl = buildUrl(baseUrl, tokenEndpoint);
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({ requesterService: SOURCE_SERVICE_NAME })
  });

  const payload = await parseResponse(response);
  if (!response.ok || !payload?.data?.token) {
    throw new Error(payload?.message || 'Unable to generate Importerr service token');
  }

  // await importerrServiceTokenManager.setImporterrServiceToken(payload.data.token);
  return payload.data.token;
};

const callImporterrService = async ({
  baseUrl,
  path,
  method = 'GET',
  body,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  if (!baseUrl) {
    throw new Error('Target service base URL is not configured');
  }

  const url = buildUrl(baseUrl, path);
  const send = async ({ token, useApiKey = false }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, Number(timeoutMs) || DEFAULT_TIMEOUT_MS);
    const start = Date.now();
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(useApiKey && INTERNAL_SERVICE_API_KEY ? { 'x-api-key': INTERNAL_SERVICE_API_KEY } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal
      });
      const payload = await parseResponse(response);
      if (String(process.env.DEBUG_IMPORTERR_PROXY_TIMING || '').toLowerCase() === 'true') {
        console.log(`[ImporterrProxy] ${method} ${path} -> ${response.status} in ${Date.now() - start}ms`);
      }
      return { response, payload };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(`Importerr service timeout after ${Number(timeoutMs) || DEFAULT_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  // Preferred fast-path for internal service calls: shared API key header.
  if (INTERNAL_SERVICE_API_KEY) {
    const { response, payload } = await send({ useApiKey: true });
    if (!response.ok) {
      throw new Error(
        payload?.status?.message ||
        payload?.error?.message ||
        payload?.message ||
        `Importerr service call failed with status ${response.status}`
      );
    }
    return payload;
  }

  let token = await importerrServiceTokenManager.getImporterrServiceToken();
  if (!token) {
    token = await requestImporterrToken(baseUrl);
    await importerrServiceTokenManager.setImporterrServiceToken(token);
  }

  let { response, payload } = await send({ token });
  if (response.status === 401) {
    await importerrServiceTokenManager.clearImporterrServiceToken();
    token = await requestImporterrToken(baseUrl);
    await importerrServiceTokenManager.setImporterrServiceToken(token);
    ({ response, payload } = await send({ token }));
  }

  if (!response.ok) {
    throw new Error(
      payload?.status?.message ||
      payload?.error?.message ||
      payload?.message ||
      `Importerr service call failed with status ${response.status}`
    );
  }

  return payload;
};

module.exports = {
  callImporterrService
};
