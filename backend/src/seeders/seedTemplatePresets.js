/**
 * Seed static TEMPLATE_PRESETS into DB (skips if slug already exists)
 * Run: node src/seeders/seedTemplatePresets.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Template = require('../models/Template');
const User     = require('../models/User');

// ── Minimal uid (no React dependency) ────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Presets (mirrored from frontend templatePresets.jsx) ──────────
const PRESETS = [
  {
    id: 'inquiry-response',
    name: 'Inquiry Response',
    subject: 'Thanks for reaching out, {{name}}!',
    blocks: [
      { type: 'heading', content: 'Hi {{name}}, we got your message! 👋', level: 1, color: '#111827' },
      { type: 'spacer', height: 8 },
      { type: 'text', content: "Thank you for reaching out to us. We've received your inquiry and our team will get back to you within 24 hours.\n\nHere's a summary of what you shared with us:\n{{message}}", color: '#374151', align: 'left' },
      { type: 'spacer', height: 16 },
      { type: 'button', label: 'View Your Inquiry', url: '{{link}}', bgColor: '#4f46e5', textColor: '#ffffff', align: 'center' },
      { type: 'spacer', height: 24 },
      { type: 'divider', color: '#e5e7eb' },
      { type: 'text', content: 'If you have any urgent concerns, feel free to reply to this email.', color: '#6b7280', align: 'center' },
    ],
  },
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome aboard, {{name}}!',
    blocks: [
      { type: 'heading', content: 'Welcome, {{name}}! 🎉', level: 1, color: '#111827' },
      { type: 'text', content: "We're thrilled to have you with us. Here's everything you need to get started.", color: '#374151', align: 'left' },
      { type: 'spacer', height: 16 },
      { type: 'columns', columns: [
        { content: '✅ Step 1\nComplete your profile to personalize your experience.' },
        { content: '📦 Step 2\nExplore our products and find what suits you best.' },
      ]},
      { type: 'spacer', height: 20 },
      { type: 'button', label: 'Get Started', url: '{{link}}', bgColor: '#059669', textColor: '#ffffff', align: 'center' },
    ],
  },
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    subject: 'Order Confirmed — {{productSku}}',
    blocks: [
      { type: 'heading', content: 'Your Order is Confirmed! ✅', level: 1, color: '#065f46' },
      { type: 'text', content: "Hi {{name}},\n\nThank you for your order! We're preparing it now and will notify you once it ships.\n\nOrder Reference: {{leadId}}\nProduct: {{productSku}}", color: '#374151', align: 'left' },
      { type: 'spacer', height: 16 },
      { type: 'button', label: 'Track Your Order', url: '{{link}}', bgColor: '#0d9488', textColor: '#ffffff', align: 'center' },
      { type: 'spacer', height: 16 },
      { type: 'divider', color: '#e5e7eb' },
      { type: 'text', content: 'Questions? Reply to this email or contact us at support@yourcompany.com', color: '#9ca3af', align: 'center' },
    ],
  },
  {
    id: 'send-quote',
    name: 'Send Quote',
    subject: 'Special Offer Just for You, {{name}} 🎯',
    blocks: [
      { type: 'heading', content: "Hi {{name}}, we've got a special deal for you! 💰", level: 1, color: '#111827' },
      { type: 'spacer', height: 8 },
      { type: 'text', content: "Thanks for your interest! We've prepared a personalized quote just for you.\n\n🎉 You're getting an exclusive discount of {{discount}} on your order.", color: '#374151', align: 'left' },
      { type: 'spacer', height: 16 },
      { type: 'heading', content: 'Limited Time Offer 🚀', level: 2, color: '#b91c1c' },
      { type: 'text', content: "Don't miss out on this deal. Click below to view your full quote and proceed.", color: '#4b5563', align: 'center' },
      { type: 'spacer', height: 16 },
      { type: 'button', label: 'View Your Quote', url: '{{link}}', bgColor: '#f59e0b', textColor: '#ffffff', align: 'center' },
      { type: 'spacer', height: 20 },
      { type: 'divider', color: '#e5e7eb' },
      { type: 'text', content: "If you have any questions or need help, just reply to this email—we're here for you 😊", color: '#6b7280', align: 'center' },
    ],
  },
];

function extractPlaceholders(text = '') {
  const matches = String(text).match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))];
}

function buildHtml(blocks) {
  return blocks.map((b) => {
    if (b.type === 'heading') return `<h${b.level||1} style="color:${b.color||'#111827'}">${b.content||''}</h${b.level||1}>`;
    if (b.type === 'text')    return `<p style="color:${b.color||'#374151'}">${(b.content||'').replace(/\n/g,'<br>')}</p>`;
    if (b.type === 'button')  return `<a href="${b.url||'#'}" style="background:${b.bgColor||'#4f46e5'};color:${b.textColor||'#fff'};padding:12px 24px;border-radius:6px;text-decoration:none">${b.label||'Click'}</a>`;
    if (b.type === 'divider') return `<hr style="border-color:${b.color||'#e5e7eb'}">`;
    if (b.type === 'spacer')  return `<div style="height:${b.height||16}px"></div>`;
    return '';
  }).join('');
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  // Use first admin user as createdBy
  const admin = await User.findOne({ role: 'admin' }).lean();
  if (!admin) { console.error('No admin user found'); process.exit(1); }

  let seeded = 0, skipped = 0;

  for (const preset of PRESETS) {
    const slug = preset.id;
    const exists = await Template.findOne({ slug }).lean();
    if (exists) { console.log(`  ⏭  Skipped (exists): ${preset.name}`); skipped++; continue; }

    const blocksWithIds = preset.blocks.map((b) => ({ ...b, id: uid() }));
    const bodyHtml = buildHtml(blocksWithIds);
    const placeholders = [...new Set([...extractPlaceholders(preset.subject), ...extractPlaceholders(bodyHtml)])];

    await Template.create({
      name: preset.name,
      slug,
      type: 'email',
      subject: preset.subject,
      body: bodyHtml,
      bodyJson: JSON.stringify(blocksWithIds),
      placeholders,
      createdBy: admin._id,
      updatedBy: admin._id,
    });
    console.log(`  ✔  Seeded: ${preset.name}`);
    seeded++;
  }

  console.log(`\nDone — ${seeded} seeded, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
