const { getAbandonedQueueMinAgeMinutes } = require('./abandonedQueueSettings');

/**
 * Open queue rows eligible for display or cron processing (respects per-stage min age).
 */
const buildEligibleOpenQueueFilter = async (stage = null) => {
  const minAges = await getAbandonedQueueMinAgeMinutes();
  const filter = { status: 'open' };

  if (stage) {
    filter.stage = stage;
    const minMinutes = stage === 'payment' ? minAges.payment : minAges.cart;
    if (minMinutes > 0) {
      filter.updatedAt = { $lte: new Date(Date.now() - minMinutes * 60 * 1000) };
    }
    return { filter, minMinutes };
  }

  const cartCutoff =
    minAges.cart > 0 ? new Date(Date.now() - minAges.cart * 60 * 1000) : null;
  const paymentCutoff =
    minAges.payment > 0 ? new Date(Date.now() - minAges.payment * 60 * 1000) : null;

  const or = [];
  if (cartCutoff) {
    or.push({ stage: 'cart', updatedAt: { $lte: cartCutoff } });
  } else {
    or.push({ stage: 'cart' });
  }
  if (paymentCutoff) {
    or.push({ stage: 'payment', updatedAt: { $lte: paymentCutoff } });
  } else {
    or.push({ stage: 'payment' });
  }

  filter.$or = or;
  return { filter, minAges };
};

module.exports = {
  buildEligibleOpenQueueFilter,
};
