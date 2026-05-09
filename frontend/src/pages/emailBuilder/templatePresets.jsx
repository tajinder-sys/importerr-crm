import { uid } from './generateEmailHtml';

export const TEMPLATE_PRESETS = [
  {
    id: 'inquiry-response',
    label: '📨 Inquiry Response',
    description: 'Follow up on a customer inquiry',
    name: 'Inquiry Response',
    subject: 'Thanks for reaching out, {{name}}!',
    blocks: () => [
      { id: uid(), type: 'heading', content: 'Hi {{name}}, we got your message! 👋', level: 1, color: '#111827' },
      { id: uid(), type: 'spacer', height: 8 },
      { id: uid(), type: 'text', content: "Thank you for reaching out to us. We've received your inquiry and our team will get back to you within 24 hours.\n\nHere's a summary of what you shared with us:\n{{message}}", color: '#374151', align: 'left' },
      { id: uid(), type: 'spacer', height: 16 },
      { id: uid(), type: 'button', label: 'View Your Inquiry', url: '{{link}}', bgColor: '#4f46e5', textColor: '#ffffff', align: 'center' },
      { id: uid(), type: 'spacer', height: 24 },
      { id: uid(), type: 'divider', color: '#e5e7eb' },
      { id: uid(), type: 'text', content: "If you have any urgent concerns, feel free to reply to this email.", color: '#6b7280', align: 'center' },
    ],
  },
  {
    id: 'welcome',
    label: '🎉 Welcome',
    description: 'Greet a new customer or lead',
    name: 'Welcome Email',
    subject: 'Welcome aboard, {{name}}!',
    blocks: () => [
      { id: uid(), type: 'heading', content: 'Welcome, {{name}}! 🎉', level: 1, color: '#111827' },
      { id: uid(), type: 'text', content: "We're thrilled to have you with us. Here's everything you need to get started.", color: '#374151', align: 'left' },
      { id: uid(), type: 'spacer', height: 16 },
      { id: uid(), type: 'columns', columns: [
        { content: '✅ Step 1\nComplete your profile to personalize your experience.' },
        { content: '📦 Step 2\nExplore our products and find what suits you best.' },
      ]},
      { id: uid(), type: 'spacer', height: 20 },
      { id: uid(), type: 'button', label: 'Get Started', url: '{{link}}', bgColor: '#059669', textColor: '#ffffff', align: 'center' },
    ],
  },
  {
    id: 'order-confirmation',
    label: '📦 Order Confirmation',
    description: 'Confirm a product order',
    name: 'Order Confirmation',
    subject: 'Order Confirmed — {{productSku}}',
    blocks: () => [
      { id: uid(), type: 'heading', content: 'Your Order is Confirmed! ✅', level: 1, color: '#065f46' },
      { id: uid(), type: 'text', content: "Hi {{name}},\n\nThank you for your order! We're preparing it now and will notify you once it ships.\n\nOrder Reference: {{leadId}}\nProduct: {{productSku}}", color: '#374151', align: 'left' },
      { id: uid(), type: 'spacer', height: 16 },
      { id: uid(), type: 'button', label: 'Track Your Order', url: '{{link}}', bgColor: '#0d9488', textColor: '#ffffff', align: 'center' },
      { id: uid(), type: 'spacer', height: 16 },
      { id: uid(), type: 'divider', color: '#e5e7eb' },
      { id: uid(), type: 'text', content: 'Questions? Reply to this email or contact us at support@yourcompany.com', color: '#9ca3af', align: 'center' },
    ],
  },{
  id: 'send-quote',
  label: '💰 Send Quote',
  description: 'Share a personalized quote with discount',
  name: 'Send Quote',
  subject: 'Special Offer Just for You, {{name}} 🎯',
  blocks: () => [
    {
      id: uid(),
      type: 'heading',
      content: 'Hi {{name}}, we’ve got a special deal for you! 💰',
      level: 1,
      color: '#111827'
    },

    { id: uid(), type: 'spacer', height: 8 },

    {
      id: uid(),
      type: 'text',
      content:
        "Thanks for your interest! We've prepared a personalized quote just for you.\n\n🎉 You're getting an exclusive discount of {{discount}} on your order.",
      color: '#374151',
      align: 'left'
    },

    { id: uid(), type: 'spacer', height: 16 },

    {
      id: uid(),
      type: 'heading',
      content: 'Limited Time Offer 🚀',
      level: 2,
      color: '#b91c1c'
    },

    {
      id: uid(),
      type: 'text',
      content:
        'Don’t miss out on this deal. Click below to view your full quote and proceed.',
      color: '#4b5563',
      align: 'center'
    },

    { id: uid(), type: 'spacer', height: 16 },

    {
      id: uid(),
      type: 'button',
      label: 'View Your Quote',
      url: '{{link}}',
      bgColor: '#f59e0b',
      textColor: '#ffffff',
      align: 'center'
    },

    { id: uid(), type: 'spacer', height: 20 },

    {
      id: uid(),
      type: 'divider',
      color: '#e5e7eb'
    },

    {
      id: uid(),
      type: 'text',
      content:
        'If you have any questions or need help, just reply to this email—we’re here for you 😊',
      color: '#6b7280',
      align: 'center'
    }
  ]
}
];