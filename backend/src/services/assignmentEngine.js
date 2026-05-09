const User = require('../models/User');

exports.assignLead = async (lead) => {
  const agents = await User.find({ role: 'agent' });

  const randomAgent = agents[Math.floor(Math.random() * agents.length)];

  lead.assignedTo = randomAgent._id;
  await lead.save();

  return lead;
};