const PaymentMethod = require('../models/PaymentMethod');

// Get all payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const paymentMethods = await PaymentMethod.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    console.log('Payment methods fetched:', paymentMethods.map(pm => ({ name: pm.name, key: pm.key, isActive: pm.isActive })));
    
    res.json({
      success: true,
      data: paymentMethods,
      count: paymentMethods.length
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
};

// Get payment method by ID
const getPaymentMethodById = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findById(req.params.id)
      .select('name key isActive createdAt createdBy')
      .populate('createdBy', 'name email');
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }
    
    res.json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Error fetching payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment method'
    });
  }
};

// Create new payment method
const createPaymentMethod = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Payment method name is required'
      });
    }
    
    const paymentMethod = new PaymentMethod({
      name: name.trim(),
      createdBy: req.user.id
    });
    
    await paymentMethod.save();
    await paymentMethod.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Payment method created successfully',
      data: paymentMethod
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'name' 
        ? 'Payment method with this name already exists'
        : 'Payment method with this key already exists';
      
      return res.status(400).json({
        success: false,
        message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment method'
    });
  }
};

// Update payment method
const updatePaymentMethod = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    
    const paymentMethod = await PaymentMethod.findById(req.params.id);
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }
    
    // Update fields
    if (name !== undefined) paymentMethod.name = name.trim();
    if (isActive !== undefined) paymentMethod.isActive = isActive;
    
    await paymentMethod.save();
    await paymentMethod.populate('createdBy', 'name email');
    
    res.json({
      success: true,
      message: 'Payment method updated successfully',
      data: paymentMethod
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Payment method with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update payment method'
    });
  }
};

// Delete payment method
const deletePaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findById(req.params.id);
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }
    
    await PaymentMethod.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method'
    });
  }
};

// Toggle payment method status
const togglePaymentMethodStatus = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findById(req.params.id);
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }
    
    paymentMethod.isActive = !paymentMethod.isActive;
    await paymentMethod.save();
    await paymentMethod.populate('createdBy', 'name email');
    
    res.json({
      success: true,
      message: `Payment method ${paymentMethod.isActive ? 'activated' : 'deactivated'} successfully`,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Error toggling payment method status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle payment method status'
    });
  }
};

module.exports = {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatus
};
