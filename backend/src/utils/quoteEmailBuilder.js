const { callImporterrService } = require('./importerrServiceApiClient');
const { PRODUCT_API_ROUTES } = require('./constants');
const Template = require('../models/Template');
const EmailService = require('../services/EmailService');

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatInr = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const flattenVariants = (variants) => {
  if (!variants) return [];
  if (Array.isArray(variants)) return variants;
  if (Array.isArray(variants.variantLines)) return variants.variantLines;
  if (Array.isArray(variants.variants)) return variants.variants;
  if (Array.isArray(variants.items)) return variants.items;
  return [];
};

const variationLabel = (v) => {
  const attrs = Array.isArray(v?.skuAttributes) ? v.skuAttributes : [];
  const label = attrs.map((a) => a.valueTrans || a.value).filter(Boolean).join(' / ');
  return label || v?.label || `SKU ${v?.skuId ?? ''}`;
};

const variationImage = (v, fallback = '') => {
  const attrs = Array.isArray(v?.skuAttributes) ? v.skuAttributes : [];
  const imgAttr = attrs.find((a) => a.skuImageUrl || a.thumbnailImage);
  return (
    v?.imageUrl ||
    imgAttr?.skuImageUrl ||
    imgAttr?.thumbnailImage ||
    v?.skuImageUrl ||
    fallback ||
    ''
  );
};

const productImage = (product) => {
  if (!product) return '';
  if (Array.isArray(product.imgUrl)) return product.imgUrl[0] || '';
  return product.imageUrl || product.image || '';
};

async function fetchProductForQuote(offerId) {
  const baseUrl = String(process.env.IMPORTERR_BASE_URL || '').trim();
  const sku = String(offerId || '').trim();
  if (!baseUrl || !sku) return null;

  try {
    const path = PRODUCT_API_ROUTES.PRODUCT_BY_SKU.replace('{sku}', encodeURIComponent(sku));
    const payload = await callImporterrService({ baseUrl, path, method: 'GET' });
    return payload?.data ?? payload;
  } catch {
    return null;
  }
}

function buildVariantRows({ quoteVariants = [], leadVariants, product }) {
  const leadBySku = new Map(
    flattenVariants(leadVariants).map((v) => [String(v?.skuId ?? v?.id ?? ''), v])
  );
  const productBySku = new Map(
    (Array.isArray(product?.variations) ? product.variations : []).map((v) => [
      String(v?.skuId ?? ''),
      v,
    ])
  );
  const fallbackImg = productImage(product);

  return quoteVariants.map((qv) => {
    const skuKey = String(qv?.skuId ?? '');
    const leadV = leadBySku.get(skuKey);
    const prodV = productBySku.get(skuKey);
    const qty = Math.max(1, Number(qv?.selectedQuantity) || 1);
    const unitPrice =
      Number(qv?.FBP) ||
      (Number(qv?.totalFBP) > 0 ? Number(qv.totalFBP) / qty : 0) ||
      Number(leadV?.unitPrice ?? leadV?.ap ?? 0);
    const lineTotal = Number(qv?.totalFBP) > 0 ? Number(qv.totalFBP) : unitPrice * qty;

    return {
      skuId: skuKey,
      label: leadV?.label || variationLabel(prodV) || `SKU ${skuKey}`,
      imageUrl: variationImage(prodV, variationImage(leadV, fallbackImg)),
      qty,
      unitPrice,
      lineTotal,
    };
  });
}

function buildQuoteDetailsHtml({ product, variantRows, amounts, referenceId, offerId }) {
  const productTitle = product?.title || product?.name || `Product ${offerId || ''}`;
  const productImg = productImage(product);
  const rows = variantRows.length
    ? variantRows
    : [{ skuId: '', label: '—', imageUrl: productImg, qty: 1, unitPrice: 0, lineTotal: 0 }];

  const variantRowsHtml = rows
    .map(
      (row) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="width:56px;vertical-align:top;padding-right:10px;">
              ${
                row.imageUrl
                  ? `<img src="${escapeHtml(row.imageUrl)}" alt="" width="48" height="48" style="display:block;border-radius:6px;border:1px solid #e5e7eb;object-fit:cover;" />`
                  : `<div style="width:48px;height:48px;border-radius:6px;background:#f1f5f9;border:1px solid #e5e7eb;"></div>`
              }
            </td>
            <td style="vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">${escapeHtml(row.label)}</p>
              <p style="margin:0;font-size:12px;color:#64748b;">Qty: ${row.qty}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${formatInr(row.unitPrice)} × ${row.qty}</p>
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${formatInr(row.lineTotal)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    )
    .join('');

  const initial = Number(amounts?.initialFinalPrice || 0);
  const final = Number(amounts?.finalPrice || 0);
  const saved = Number(amounts?.savedAmount || 0);
  const discountPct = Number(amounts?.discountPercent || 0);

  return `
<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:560px;margin:16px 0 0;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;">
  <tr>
    <td style="padding:16px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Your quote</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:14px;">
        <tr>
          ${
            productImg
              ? `<td style="width:72px;vertical-align:top;padding-right:12px;">
              <img src="${escapeHtml(productImg)}" alt="" width="64" height="64" style="display:block;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover;" />
            </td>`
              : ''
          }
          <td style="vertical-align:top;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">${escapeHtml(productTitle)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#475569;">Variants</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${variantRowsHtml}
      </table>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
        ${
          initial > final
            ? `<tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;">Original total</td>
          <td style="padding:4px 0;text-align:right;font-size:13px;color:#94a3b8;text-decoration:line-through;">${formatInr(initial)}</td>
        </tr>`
            : ''
        }
        ${
          discountPct > 0
            ? `<tr>
          <td style="padding:4px 0;font-size:13px;color:#059669;">Discount</td>
          <td style="padding:4px 0;text-align:right;font-size:13px;font-weight:600;color:#059669;">−${discountPct.toFixed(2)}%</td>
        </tr>`
            : ''
        }
        ${
          saved > 0
            ? `<tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;">You save</td>
          <td style="padding:4px 0;text-align:right;font-size:13px;color:#059669;">${formatInr(saved)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding:8px 0 0;font-size:15px;font-weight:700;color:#111827;">Quote total</td>
          <td style="padding:8px 0 0;text-align:right;font-size:18px;font-weight:700;color:#4f46e5;">${formatInr(final)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function injectQuoteDetailsIntoBody(body, quoteDetailsHtml) {
  if (!quoteDetailsHtml) return body;
  const html = String(body || '');
  if (/\{\{\s*quoteDetails\s*\}\}/i.test(html)) {
    return html.replace(/\{\{\s*quoteDetails\s*\}\}/gi, quoteDetailsHtml);
  }
  const insertMarkers = [
    /View Your Quote/i,
    /Limited Time Offer/i,
    /<a\s+[^>]*href=/i,
  ];
  for (const marker of insertMarkers) {
    const idx = html.search(marker);
    if (idx >= 0) {
      return `${html.slice(0, idx)}${quoteDetailsHtml}${html.slice(idx)}`;
    }
  }
  return `${html}${quoteDetailsHtml}`;
}

async function buildQuoteEmailPayload({ lead, quoteDoc, variantsFromRequest }) {
  const offerId = String(quoteDoc?.offerId || lead?.productSku || '').trim();
  const product = await fetchProductForQuote(offerId);
  const quoteVariants = Array.isArray(quoteDoc?.variants) ? quoteDoc.variants : variantsFromRequest || [];
  const variantRows = buildVariantRows({
    quoteVariants,
    leadVariants: lead?.variants,
    product,
  });

  const amounts = quoteDoc?.amounts || {};
  const discountPct = Number(amounts.discountPercent || 0);
  const quoteDetails = buildQuoteDetailsHtml({
    product,
    variantRows,
    amounts,
    referenceId: quoteDoc?.referenceId,
    offerId,
  });

  return {
    name: lead?.name || 'Customer',
    discount: discountPct > 0 ? `${discountPct.toFixed(2)}%` : '0%',
    link: `${String(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/quote/${quoteDoc?.referenceId || ''}`,
    productName: product?.title || offerId || 'Product',
    productSku: offerId,
    finalPrice: formatInr(amounts.finalPrice),
    originalPrice: formatInr(amounts.initialFinalPrice),
    savedAmount: formatInr(amounts.savedAmount),
    quoteDetails,
    quoteDetailsHtml: quoteDetails,
  };
}

async function resolveQuoteTemplate() {
  const template =
    (await Template.findOne({ slug: 'discount-quote' }).lean()) ||
    (await Template.findOne({ slug: 'send-quote' }).lean());
  if (!template) {
    throw new Error('Quote email template not found (discount-quote or send-quote)');
  }
  return template;
}

/** Build subject + HTML body for quote email (preview or send). */
async function renderQuoteEmail({ lead, offerId, variants, amounts, referenceId = null }) {
  const quoteDoc = {
    offerId: String(offerId || lead?.productSku || ''),
    variants: variants || [],
    amounts: amounts || {},
    referenceId: referenceId || null,
  };
  const emailData = await buildQuoteEmailPayload({
    lead,
    quoteDoc,
    variantsFromRequest: variants,
  });
  if (!referenceId) {
    emailData.link = '#';
  }
  const template = await resolveQuoteTemplate();
  let { subject, body } = EmailService.replacePlaceholders(template, emailData);
  body = injectQuoteDetailsIntoBody(body, emailData.quoteDetails);
  return {
    subject,
    body,
    templateId: template._id,
    templateSlug: template.slug,
    to: lead?.email || '',
    placeholders: emailData,
  };
}

module.exports = {
  buildQuoteEmailPayload,
  injectQuoteDetailsIntoBody,
  buildQuoteDetailsHtml,
  buildVariantRows,
  renderQuoteEmail,
  resolveQuoteTemplate,
};
