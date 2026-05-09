const Lead = require('../models/lead');

exports.processLead = async (data) => {
  const { phone, email } = data;

  // Duplicate check
  let existingLead = await Lead.findOne({
    $or: [{ phone }, { email }]
  });

  if (existingLead) {
    existingLead.lastInteraction = new Date();
    await existingLead.save();

    return { lead: existingLead, isNew: false };
  }

  const newLead = await Lead.create(data);

  return { lead: newLead, isNew: true };
};