import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Snackbar from '../../components/common/Snackbar';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Key,
  Calendar,
  User
} from 'lucide-react';


const PaymentMethods = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, methodId: null });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    type: 'success'
  });

  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const data = await api.get(API_ROUTES.paymentMethods.list);
      
      if (data.success) {
        setPaymentMethods(data.data);
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to fetch payment methods',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to fetch payment methods',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = editingMethod 
        ? await api.put(API_ROUTES.paymentMethods.update(editingMethod._id), formData)
        : await api.post(API_ROUTES.paymentMethods.create, formData);
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: `Payment method ${editingMethod ? 'updated' : 'created'} successfully`,
          type: 'success'
        });
        setShowModal(false);
        setEditingMethod(null);
        resetForm();
        fetchPaymentMethods();
      } else {
        setSnackbar({
          open: true,
          message: data.message || `Failed to ${editingMethod ? 'update' : 'create'} payment method`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingMethod ? 'update' : 'create'} payment method`,
        type: 'error'
      });
    }
  };

  const handleDelete = async (id) => {
    setDeleteConfirm({ isOpen: true, methodId: id });
  };

  const confirmDelete = async () => {
    const { methodId } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, methodId: null });

    try {
      const data = await api.delete(API_ROUTES.paymentMethods.delete(methodId));
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: 'Payment method deleted successfully',
          type: 'success'
        });
        fetchPaymentMethods();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to delete payment method',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete payment method',
        type: 'error'
      });
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const data = await api.patch(API_ROUTES.paymentMethods.toggle(id));
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: 'Payment method status updated successfully',
          type: 'success'
        });
        fetchPaymentMethods();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to update payment method status',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error toggling payment method status:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update payment method status',
        type: 'error'
      });
    }
  };

  const openEditModal = (method) => {
    setEditingMethod(method);
    setFormData({
      name: method.name
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: ''
    });
  };


  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
            <p className="mt-1 text-sm text-gray-500">Manage payment method configurations and status.</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingMethod(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Payment Method
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-500">Loading payment methods...</div>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gray-50 p-3 mb-3">
              <CreditCard className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No payment methods</h3>
            <p className="text-xs text-gray-500 text-center mb-4 max-w-sm">
              Add your first payment method to get started.
            </p>
            <button
              onClick={() => {
                resetForm();
                setEditingMethod(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Payment Method
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paymentMethods.map((method) => (
              <div key={method._id} className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-200 hover:border-primary-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 p-3 group-hover:scale-105 transition-transform duration-200">
                      <CreditCard className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{method.name}</h3>
                      <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded-md inline-block mt-1">{method.key}</p>
                    </div>
                  </div>
                  <div className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                    method.isActive 
                      ? 'bg-green-100 text-green-700 group-hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      method.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    {method.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Status</span>
                    <ToggleSwitch
                      checked={method.isActive}
                      onChange={() => handleToggleStatus(method._id)}
                      size="small"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(method)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 group-hover:scale-105"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(method._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group-hover:scale-105"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMethod(null);
          resetForm();
        }}
        title={editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., Bank Transfer, UPI, Credit Card"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Key will be automatically generated: {formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') : 'bank_transfer'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingMethod(null);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
            >
              {editingMethod ? 'Update' : 'Create'} Payment Method
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, methodId: null })}
        onConfirm={confirmDelete}
        title="Delete Payment Method"
        message="Are you sure you want to delete this payment method? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default PaymentMethods;
