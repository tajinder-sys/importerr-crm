import { useState } from 'react';
import { Eye } from 'lucide-react';
import Modal from '../common/Modal';
import { formatLabel } from '../../utils/helpers';

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const MetadataViewer = ({ metadata }) => {
  const [open, setOpen] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  return (
    <>
      {/* Eye Button */}
      <button
        onClick={() => setOpen(true)}
        className="text-gray-400 hover:text-gray-700"
      >
        <Eye size={16} />
      </button>

      {/* Modal Popup */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Metadata"
        size="md"
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {Object.entries(metadata).map(([key, value]) => (
            <div
              key={key}
              className="text-sm border-b last:border-0 border-gray-100 pb-2"
            >
              <p className="font-semibold text-gray-800">
                {formatLabel(key)}
              </p>

              <pre className="text-gray-600 whitespace-pre-wrap break-all font-mono text-xs mt-1 bg-gray-50 p-2 rounded-md">
                {formatValue(value)}
              </pre>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default MetadataViewer;