import { useMemo, useState } from 'react';

const HtmlEditor = ({
  value = '',
  onChange,
  placeholder = 'Paste HTML here...',
  editorRows = 12
}) => {
  const [activeTab, setActiveTab] = useState('editor');

  const hasContent = useMemo(() => String(value || '').trim().length > 0, [value]);

  return (
    <div className="overflow-hidden rounded-md border border-gray-300">
      <div className="flex items-center border-b border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            activeTab === 'editor'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            activeTab === 'preview'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Preview
        </button>
      </div>

      {activeTab === 'editor' ? (
        <textarea
          rows={editorRows}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          className="w-full resize-y border-0 p-3 text-sm focus:outline-none focus:ring-0"
        />
      ) : (
        <div className="min-h-[260px] max-h-[420px] overflow-auto bg-white p-3 text-sm text-gray-800">
          {hasContent ? (
            <div dangerouslySetInnerHTML={{ __html: value }} />
          ) : (
            <p className="text-gray-400">Preview will appear here.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default HtmlEditor;

