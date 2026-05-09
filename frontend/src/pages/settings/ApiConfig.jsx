import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../components/common/Card';
import { Copy, Eye, Route } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Snackbar from '../../components/common/Snackbar';
import { useAuth } from '../../contexts/AuthContext';
const BASE_URL = import.meta.env.VITE_API_URL + '/channels';

const STATIC_PLATFORM_ROUTES = [
  {
    platform: 'WhatsApp',
    url: BASE_URL + '/webhook/whatsapp',
    payload: {
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul@example.com',
      message: 'Interested in pricing'
    }
  },
  {
    platform: 'Email',
    url: BASE_URL + '/webhook/email',
    payload: {
      name: 'Neha Gupta',
      phone: '9123456780',
      email: 'neha@example.com',
      message: 'Need product demo'
    }
  },
  {
    platform: 'Meta',
    url: BASE_URL + '/webhook/meta',
    payload: {
      name: 'Amit Verma',
      phone: '9988776655',
      email: 'amit@example.com',
      message: 'Submitted from Meta lead form'
    }
  }
];

const ApiConfig = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    type: 'success'
  });
  const [selectedPayloadRoute, setSelectedPayloadRoute] = useState(null);

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setSnackbar({
        open: true,
        message: 'URL copied to clipboard',
        type: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to copy URL',
        type: 'error'
      });
    }
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage ecommerce product API connections.</p>
        </div>

        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Lead Ingestion Routes</h2>
          </CardHeader>
          <CardContent>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Route className="h-4 w-4 text-primary-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  URLs & Payload Examples
                </h3>
              </div>
              <div className="space-y-4">
                {STATIC_PLATFORM_ROUTES.map((item) => (
                  <div key={item.platform} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-sm font-semibold text-gray-900">{item.platform}</p>
                    <div className="mt-1 flex items-start gap-2">
                      <p className="break-all text-xs text-primary-700">{item.url}</p>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(item.url)}
                        className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-primary-700"
                        title="Copy URL"
                        aria-label={`Copy ${item.platform} URL`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {item.platform === 'Direct Submit' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPayloadRoute(item)}
                          className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-primary-700"
                          title="View payload example"
                          aria-label={`View ${item.platform} payload example`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
      <Modal
        isOpen={Boolean(selectedPayloadRoute)}
        onClose={() => setSelectedPayloadRoute(null)}
        title={`${selectedPayloadRoute?.platform || ''} Payload Example`}
        size="md"
      >
        <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
{JSON.stringify(selectedPayloadRoute?.payload || {}, null, 2)}
        </pre>
      </Modal>
    </div>
  );
};

export default ApiConfig;
