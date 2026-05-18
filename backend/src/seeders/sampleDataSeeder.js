const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/lead');
const Activity = require('../models/activity');
const { LEAD_SOURCES, LEAD_STATUSES, ACTIVITY_TYPES } = require('../utils/constants');
require('dotenv').config();

const seedSampleData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Lead.deleteMany({});
    await Activity.deleteMany({});
    console.log('Cleared existing data');

    // Passwords must be plain text here; User model hashes on save.
    const admin = new User({
      name: 'System Administrator',
      email: 'admin@crm.com',
      password: 'admin123',
      role: 'admin',
      phone: '9876543210',
      isActive: true
    });

    await admin.save();
    console.log('Admin user created');

    // Create team members (without teams first)
    const teamMember1 = new User({
      name: 'Sarah Johnson',
      email: 'sarah@crm.com',
      password: 'team123',
      role: 'team_manager',
      phone: '9876543211',
      isActive: true
    });

    const teamMember2 = new User({
      name: 'Mike Wilson',
      email: 'mike@crm.com',
      password: 'team123',
      role: 'team_member',
      phone: '9876543212',
      isActive: true
    });

    const teamMember3 = new User({
      name: 'Lisa Chen',
      email: 'lisa@crm.com',
      password: 'team123',
      role: 'team_member',
      phone: '9876543213',
      isActive: true
    });

    await teamMember1.save();
    await teamMember2.save();
    await teamMember3.save();
    console.log('Team members created');


    // Create sample leads
    const sampleLeads = [
      {
        name: 'John Smith',
        phone: '3625262721',
        email: 'john.smith@example.com',
        source: LEAD_SOURCES.IMPORTERR_INQUIRY,
        message: 'Interested in your premium package for my e-commerce store',
        assignedTo: teamMember1._id,
        status: LEAD_STATUSES.NEW,
        dealValue: 5000
      },
      {
        name: 'Emily Davis',
        phone: '3625262722',
        email: 'emily.davis@example.com',
        source: LEAD_SOURCES.WHATSAPP,
        message: 'Looking for CRM solution for small business',
        assignedTo: teamMember2._id,
        status: LEAD_STATUSES.CONTACTED,
        dealValue: 3000
      },
      {
        name: 'Robert Brown',
        phone: '3625262723',
        email: 'robert.brown@example.com',
        source: LEAD_SOURCES.META_ADS,
        message: 'Need lead management system urgently',
        assignedTo: teamMember3._id,
        status: LEAD_STATUSES.INTERESTED,
        dealValue: 7500
      },
      {
        name: 'Maria Garcia',
        phone: '3625262724',
        email: 'maria.garcia@example.com',
        source: LEAD_SOURCES.EMAIL,
        message: 'Requesting demo for enterprise solution',
        assignedTo: teamMember1._id,
        status: LEAD_STATUSES.NEGOTIATION,
        dealValue: 15000
      }
    ];

    const createdLeads = await Lead.insertMany(sampleLeads);
    console.log('Sample leads created');

    // Create sample activities
    const activities = [];
    
    createdLeads.forEach((lead, index) => {
      // Lead creation activity
      activities.push({
        lead: lead._id,
        type: ACTIVITY_TYPES.LEAD_CREATED,
        description: `Lead created for ${lead.name}`,
        performedBy: admin._id,
        metadata: { source: lead.source }
      });

      // Status update activities based on lead status
      if (lead.status !== LEAD_STATUSES.NEW) {
        activities.push({
          lead: lead._id,
          type: ACTIVITY_TYPES.STATUS_UPDATED,
          description: `Status updated to ${lead.status}`,
          performedBy: lead.assignedTo,
          metadata: { newStatus: lead.status }
        });
      }

      // Assignment activity
      activities.push({
        lead: lead._id,
        type: ACTIVITY_TYPES.LEAD_ASSIGNED,
        description: `Lead assigned to ${lead.assignedTo}`,
        performedBy: admin._id,
        metadata: { assignedTo: lead.assignedTo }
      });
    });

    await Activity.insertMany(activities);
    console.log('Sample activities created');

    console.log('\n=== Sample Data Created Successfully ===');
    console.log('\n=== Admin Account ===');
    console.log('Email: admin@crm.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('\n=== Team Member Accounts ===');
    console.log('Email: sarah@crm.com');
    console.log('Password: team123');
    console.log('Role: team_member');
    console.log('\nEmail: mike@crm.com');
    console.log('Password: team123');
    console.log('Role: team_member');
    console.log('\nEmail: lisa@crm.com');
    console.log('Password: team123');
    console.log('Role: team_manager');
    console.log('\n=== Sample Leads ===');
    console.log(`${createdLeads.length} leads with various statuses`);
    console.log('=====================================\n');

  } catch (error) {
    console.error('Error seeding sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seeder
seedSampleData();
