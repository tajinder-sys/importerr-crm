import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Modal from '../../components/common/ui/Modal';
import Snackbar from '../../components/common/ui/Snackbar';
import ToggleSwitch from '../../components/common/ui/ToggleSwitch';
import ConfirmDialog from '../../components/common/ui/ConfirmDialog';
import Button from '../../components/common/ui/Button';
import Input from '../../components/common/ui/Input';
import Loading from '../../components/common/ui/Loading';
import { PageHeader, EmptyState, UiCardTitle } from '../../components/common/ui';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
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

  const fetchPaymentMethods = async () => {
    try {
      const data = await api.get(API_ROUTES.paymentMethods.list);
      if (data.success) {
        setPaymentMethods(data.data);
      } else {
        setSnackbar({ open: true, message: 'Failed to fetch payment methods', type: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to fetch payment methods', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchPaymentMethods(); };
    load();
  }, []);

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


  const openAddModal = () => {
    resetForm();
    setEditingMethod(null);
    setShowModal(true);
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">
        <PageHeader
          title="Payment Methods"
          description="Manage payment method configurations and status."
          actions={(
            <Button size="sm" startIcon={<Plus className="h-3.5 w-3.5" />} onClick={openAddModal}>
              Add Payment Method
            </Button>
          )}
        />

        {loading ? (
          <Loading className="py-12" text="Loading payment methods…" />
        ) : paymentMethods.length === 0 ? (
          <EmptyState
            title="No payment methods"
            description="Add your first payment method to get started."
            icon={<CreditCard className="h-6 w-6 text-gray-400" />}
            actionLabel="Add Payment Method"
            onAction={openAddModal}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paymentMethods.map((method) => (
              <div key={method._id} className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-200 hover:border-primary-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-primary-600">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 p-3 group-hover:scale-105 transition-transform duration-200 dark:from-primary-900/30 dark:to-primary-800/30">
                      <CreditCard className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <UiCardTitle>{method.name}</UiCardTitle>
                      <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded-md inline-block mt-1 dark:bg-slate-700 dark:text-slate-400">{method.key}</p>
                    </div>
                  </div>
                  <div className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                    method.isActive
                      ? 'bg-green-100 text-green-700 group-hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      method.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    {method.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-slate-400">Status</span>
                    <ToggleSwitch
                      checked={method.isActive}
                      onChange={() => handleToggleStatus(method._id)}
                      size="small"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" iconOnly
                      className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:text-slate-500 dark:hover:text-primary-400 dark:hover:bg-primary-900/30"
                      startIcon={<Edit2 className="h-4 w-4" />} onClick={() => openEditModal(method)} title="Edit" />
                    <Button type="button" variant="ghost" size="sm" iconOnly
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                      startIcon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(method._id)} title="Delete" />
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
          <Input
            label="Name"
            required
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Bank Transfer, UPI, Credit Card"
            helperText={`Key will be automatically generated: ${formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') : 'bank_transfer'}`}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowModal(false);
                setEditingMethod(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {editingMethod ? 'Update' : 'Create'} Payment Method
            </Button>
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
