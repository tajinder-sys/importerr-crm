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
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  Settings
} from 'lucide-react';

const PipelineStages = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, id: null });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    type: 'success'
  });

  const [pipelineFormData, setPipelineFormData] = useState({
    name: '',
    description: ''
  });

  const [stageFormData, setStageFormData] = useState({
    name: '',
    description: '',
    pipelineId: '',
    order: 0,
    isActive: true
  });

  useEffect(() => {
    fetchPipelines();
    fetchStages();
  }, []);

  const fetchPipelines = async () => {
    try {
      const data = await api.get(API_ROUTES.pipelines.list);
      
      if (data.success) {
        setPipelines(data.data);
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to fetch pipelines',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to fetch pipelines',
        type: 'error'
      });
    }
  };

  const fetchStages = async () => {
    try {
      const data = await api.get(API_ROUTES.stages.list);
      
      if (data.success) {
        setStages(data.data);
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to fetch stages',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to fetch stages',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePipelineSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = editingPipeline 
        ? await api.put(API_ROUTES.pipelines.update(editingPipeline._id), pipelineFormData)
        : await api.post(API_ROUTES.pipelines.create, pipelineFormData);
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: `Pipeline ${editingPipeline ? 'updated' : 'created'} successfully`,
          type: 'success'
        });
        setShowPipelineModal(false);
        setEditingPipeline(null);
        resetPipelineForm();
        fetchPipelines();
      } else {
        setSnackbar({
          open: true,
          message: data.message || `Failed to ${editingPipeline ? 'update' : 'create'} pipeline`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error saving pipeline:', error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingPipeline ? 'update' : 'create'} pipeline`,
        type: 'error'
      });
    }
  };

  const handleStageSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = editingStage 
        ? await api.put(API_ROUTES.stages.update(editingStage._id), stageFormData)
        : await api.post(API_ROUTES.stages.create, stageFormData);
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: `Stage ${editingStage ? 'updated' : 'created'} successfully`,
          type: 'success'
        });
        setShowStageModal(false);
        setEditingStage(null);
        resetStageForm();
        fetchStages();
      } else {
        setSnackbar({
          open: true,
          message: data.message || `Failed to ${editingStage ? 'update' : 'create'} stage`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error saving stage:', error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${editingStage ? 'update' : 'create'} stage`,
        type: 'error'
      });
    }
  };

  const handleDelete = async (type, id) => {
    setDeleteConfirm({ isOpen: true, type, id });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, type: null, id: null });

    try {
      const endpoint = type === 'pipeline' ? API_ROUTES.pipelines.delete(id) : API_ROUTES.stages.delete(id);
      const data = await api.delete(endpoint);
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
          type: 'success'
        });
        if (type === 'pipeline') {
          fetchPipelines();
        } else {
          fetchStages();
        }
      } else {
        setSnackbar({
          open: true,
          message: `Failed to delete ${type}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setSnackbar({
        open: true,
        message: error.message || `Failed to delete ${type}`,
        type: 'error'
      });
    }
  };

  const handleToggleStageStatus = async (id) => {
    try {
      const data = await api.patch(API_ROUTES.stages.toggle(id));
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: 'Stage status updated successfully',
          type: 'success'
        });
        fetchStages();
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to update stage status',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error toggling stage status:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update stage status',
        type: 'error'
      });
    }
  };

  const openEditPipelineModal = (pipeline) => {
    setEditingPipeline(pipeline);
    setPipelineFormData({
      name: pipeline.name,
      description: pipeline.description || ''
    });
    setShowPipelineModal(true);
  };

  const openEditStageModal = (stage) => {
    setEditingStage(stage);
    setStageFormData({
      name: stage.name,
      description: stage.description || '',
      pipelineId: stage.pipelineId,
      order: stage.order,
      isActive: stage.isActive
    });
    setShowStageModal(true);
  };

  const resetPipelineForm = () => {
    setPipelineFormData({
      name: '',
      description: ''
    });
  };

  const resetStageForm = () => {
    setStageFormData({
      name: '',
      description: '',
      pipelineId: '',
      order: 0,
      isActive: true
    });
  };

  const getStagesByPipeline = (pipelineId) => {
    return stages
      .filter(stage => stage.pipelineId === pipelineId)
      .sort((a, b) => a.order - b.order);
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipelines & Stages</h1>
            <p className="mt-1 text-sm text-gray-500">Manage sales pipelines and their stages.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetPipelineForm();
                setEditingPipeline(null);
                setShowPipelineModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Pipeline
            </button>
            <button
              onClick={() => {
                resetStageForm();
                setEditingStage(null);
                setShowStageModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-secondary-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Stage
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-500">Loading pipelines and stages...</div>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gray-50 p-3 mb-3">
              <GitBranch className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No pipelines</h3>
            <p className="text-xs text-gray-500 text-center mb-4 max-w-sm">
              Create your first pipeline to organize your sales process.
            </p>
            <button
              onClick={() => {
                resetPipelineForm();
                setEditingPipeline(null);
                setShowPipelineModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Pipeline
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {pipelines.map((pipeline) => {
              const pipelineStages = getStagesByPipeline(pipeline._id);
              return (
                <Card key={pipeline._id} className="rounded-2xl border-gray-200 shadow-sm">
                  <CardHeader className="border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 p-3">
                          <GitBranch className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">{pipeline.name}</h2>
                          {pipeline.description && (
                            <p className="text-sm text-gray-500">{pipeline.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openEditPipelineModal(pipeline)}
                        className="rounded-md p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Edit pipeline"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Stages ({pipelineStages.length})
                        </h3>
                      </div>
                      
                      {pipelineStages.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500 mb-3">No stages in this pipeline</p>
                          <button
                            onClick={() => {
                              resetStageForm();
                              setEditingStage(null);
                              setStageFormData(prev => ({ ...prev, pipelineId: pipeline._id }));
                              setShowStageModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-secondary-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add First Stage
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pipelineStages.map((stage, index) => (
                            <div key={stage._id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                              <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                  stage.isActive 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {index + 1}
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-medium text-gray-900">{stage.name}</h4>
                                  <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    stage.isActive 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {stage.isActive ? 'Active' : 'Inactive'}
                                  </div>
                                </div>
                                {stage.description && (
                                  <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <ToggleSwitch
                                  checked={stage.isActive}
                                  onChange={() => handleToggleStageStatus(stage._id)}
                                  size="small"
                                />
                                <button
                                  onClick={() => openEditStageModal(stage)}
                                  className="rounded-md p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                  title="Edit stage"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete('stage', stage._id)}
                                  className="rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Delete stage"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pipeline Modal */}
        <Modal
          isOpen={showPipelineModal}
          onClose={() => {
            setShowPipelineModal(false);
            setEditingPipeline(null);
            resetPipelineForm();
          }}
          title={editingPipeline ? 'Edit Pipeline' : 'Add Pipeline'}
          size="lg"
        >
          <form onSubmit={handlePipelineSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pipeline Name *
              </label>
              <input
                type="text"
                value={pipelineFormData.name}
                onChange={(e) => setPipelineFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Sales Pipeline, Lead Qualification"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={pipelineFormData.description}
                onChange={(e) => setPipelineFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Describe the purpose of this pipeline"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPipelineModal(false);
                  setEditingPipeline(null);
                  resetPipelineForm();
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
              >
                {editingPipeline ? 'Update' : 'Create'} Pipeline
              </button>
            </div>
          </form>
        </Modal>

        {/* Stage Modal */}
        <Modal
          isOpen={showStageModal}
          onClose={() => {
            setShowStageModal(false);
            setEditingStage(null);
            resetStageForm();
          }}
          title={editingStage ? 'Edit Stage' : 'Add Stage'}
          size="lg"
        >
          <form onSubmit={handleStageSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stage Name *
              </label>
              <input
                type="text"
                value={stageFormData.name}
                onChange={(e) => setStageFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., New Lead, Qualified, Closed Won"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pipeline *
              </label>
              <select
                value={stageFormData.pipelineId}
                onChange={(e) => setStageFormData(prev => ({ ...prev, pipelineId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              >
                <option value="">Select a pipeline</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline._id} value={pipeline._id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order *
              </label>
              <input
                type="number"
                value={stageFormData.order}
                onChange={(e) => setStageFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="0"
                min="0"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Lower numbers appear first in the pipeline
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={stageFormData.description}
                onChange={(e) => setStageFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Describe what happens in this stage"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={stageFormData.isActive}
                onChange={(e) => setStageFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Stage is active
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowStageModal(false);
                  setEditingStage(null);
                  resetStageForm();
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-secondary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-secondary-700"
              >
                {editingStage ? 'Update' : 'Create'} Stage
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null })}
          onConfirm={confirmDelete}
          title={`Delete ${deleteConfirm.type}`}
          message={`Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
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
    </div>
  );
};

export default PipelineStages;
