/**
 * Seed script — run with: node seed.js
 * Adds fresh test data without removing existing data (upsert mode).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const Team              = require('./src/models/Team');
const User              = require('./src/models/User');
const Pipeline          = require('./src/models/Pipeline');
const Stage             = require('./src/models/Stage');
const Lead              = require('./src/models/lead');
const Activity          = require('./src/models/activity');
const Task              = require('./src/models/Task');
const Communication     = require('./src/models/Communication');
const Template          = require('./src/models/Template');
const AiLog             = require('./src/models/AiLog');
const LeadStageProgress = require('./src/models/LeadStageProgress');

const { LEAD_SOURCES, LEAD_STATUSES, ACTIVITY_TYPES } = require('./src/utils/constants');

const rnd  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndN = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // ── 1. Teams (upsert by name) ───────────────────────────────────
  const teamsData = [
    { name: 'Distributed Sync Core', description: 'Architects real-time transactional replication pipelines across global marketplace topologies', status: 'active' },
    { name: 'Strategic High-GMV Brands', description: 'Manages dedicated shard provisioning and high-throughput connection lifecycles for major sellers', status: 'active' },
    { name: 'Data Pipeline Diagnostics', description: 'Monitors backpressure, ingestion dead-letter queues, and asynchronous state synchronization drift', status: 'active' },
    { name: 'Generative Asset Optimization', description: 'Engineers contextual bulk product description models and automated background vectors', status: 'active' },
  ];

  const teams = await Promise.all(
    teamsData.map(t =>
      Team.findOneAndUpdate({ name: t.name }, t, { upsert: true, new: true })
    )
  );
  console.log(`✅ Teams: ${teams.length}`);

  // ── 2. Users (upsert by email) ──────────────────────────────────
  const hash = await bcrypt.hash('password123', 10);

  const adminUser = await User.findOneAndUpdate(
    { email: 'admin@crm.com' },
    {
      name: 'Platform Admin', email: 'admin@crm.com', password: hash,
      role: 'admin', isActive: true, phone: '9999900000',
      lastLogin: daysAgo(1),
    },
    { upsert: true, new: true }
  );

  const managersData = [
    { name: 'Ramkishan Bhati',   email: 'ramkishan@crm.com', password: hash, role: 'team_manager', isActive: true,  phone: '9414500001', team_id: teams[0]._id, priority: 'high',   lastLogin: daysAgo(1) },
    { name: 'Sreelakshmi Nair',  email: 'sreelakshmi@crm.com',password: hash,role: 'team_manager', isActive: true,  phone: '9414500002', team_id: teams[1]._id, priority: 'high',   lastLogin: daysAgo(2) },
    { name: 'Tariq Ansari',      email: 'tariq@crm.com',     password: hash, role: 'team_manager', isActive: true,  phone: '9414500003', team_id: teams[2]._id, priority: 'medium', lastLogin: daysAgo(3) },
    { name: 'Usha Choudhary',    email: 'usha@crm.com',      password: hash, role: 'team_manager', isActive: true,  phone: '9414500004', team_id: teams[3]._id, priority: 'urgent', lastLogin: daysAgo(1) },
  ];

  const managers = await Promise.all(
    managersData.map(u =>
      User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true })
    )
  );

  const membersData = [
    { name: 'Vijayraj Rathore',  email: 'vijayraj@crm.com',  password: hash, role: 'team_member', isActive: true,  phone: '9414501001', team_id: teams[0]._id, priority: 'medium', lastLogin: daysAgo(1) },
    { name: 'Waqar Hussain',     email: 'waqar@crm.com',     password: hash, role: 'team_member', isActive: true,  phone: '9414501002', team_id: teams[0]._id, priority: 'low',    lastLogin: daysAgo(2) },
    { name: 'Yamuna Shekhawat',  email: 'yamuna@crm.com',    password: hash, role: 'team_member', isActive: true,  phone: '9414501003', team_id: teams[0]._id, priority: 'high',   lastLogin: daysAgo(3) },
    { name: 'Ajith Kumar',       email: 'ajith@crm.com',     password: hash, role: 'team_member', isActive: true,  phone: '9414501004', team_id: teams[1]._id, priority: 'medium', lastLogin: daysAgo(1) },
    { name: 'Bindhu Gopan',      email: 'bindhu@crm.com',    password: hash, role: 'team_member', isActive: true,  phone: '9414501005', team_id: teams[1]._id, priority: 'urgent', lastLogin: daysAgo(4) },
    { name: 'Ciby Thomas',       email: 'ciby@crm.com',      password: hash, role: 'team_member', isActive: true,  phone: '9414501006', team_id: teams[1]._id, priority: 'low',    lastLogin: daysAgo(2) },
    { name: 'Dilnawaz Sheikh',   email: 'dilnawaz@crm.com',  password: hash, role: 'team_member', isActive: true,  phone: '9414501007', team_id: teams[2]._id, priority: 'medium', lastLogin: daysAgo(5) },
    { name: 'Elakiya Selvam',    email: 'elakiya@crm.com',   password: hash, role: 'team_member', isActive: true,  phone: '9414501008', team_id: teams[2]._id, priority: 'high',   lastLogin: daysAgo(1) },
    { name: 'Farida Begum',      email: 'farida@crm.com',    password: hash, role: 'team_member', isActive: true,  phone: '9414501009', team_id: teams[3]._id, priority: 'urgent', lastLogin: daysAgo(3) },
    { name: 'Gopal Mundhra',     email: 'gopal@crm.com',     password: hash, role: 'team_member', isActive: false, phone: '9414501010', team_id: teams[3]._id, priority: 'low',    lastLogin: daysAgo(30) },
  ];

  const members = await Promise.all(
    membersData.map(u =>
      User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true })
    )
  );

  const allAgents = [...managers, ...members];
  console.log(`✅ Users: 1 admin + ${managers.length} managers + ${members.length} members`);

  // ── 3. Pipelines (upsert by name) ──────────────────────────────
  const pipelinesData = [
    { name: 'Asynchronous Ingestion Path', teamId: teams[0]._id, description: 'Onboarding pipeline tracking structural OAuth bindings and schema alignment matrices', isDefault: true, isActive: true },
    { name: 'Enterprise Premium Scale', teamId: teams[1]._id, description: 'Dedicated queue adjustments and customized payload limits for tier-1 merchants', isDefault: true, isActive: true },
    { name: 'Fault-Tolerant System Logs', teamId: teams[2]._id, description: 'Critical telemetry intercepting expired handshake tokens and webhook drops', isDefault: true, isActive: true },
    { name: 'Automated Catalog Refinement', teamId: teams[3]._id, description: 'Sellers enabling background image normalization and generative copy arrays', isDefault: true, isActive: true },
  ];

  const pipelines = await Promise.all(
    pipelinesData.map(p =>
      Pipeline.findOneAndUpdate({ name: p.name }, p, { upsert: true, new: true })
    )
  );
  console.log(`✅ Pipelines: ${pipelines.length}`);

  // ── 4. Stages (upsert by pipelineId + name) ────────────────────
  const stageColors = ['#6366f1','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4'];

  const stageData = [
    // Asynchronous Ingestion Path
    { pipelineId: pipelines[0]._id, name: 'Handshake Initiated',  order: 0, color: stageColors[0], probabilityPercent: 15,  followUpDays: 1,    isConversion: false, isActive: true },
    { pipelineId: pipelines[0]._id, name: 'Endpoints Mapped',     order: 1, color: stageColors[1], probabilityPercent: 35,  followUpDays: 2,    isConversion: false, isActive: true },
    { pipelineId: pipelines[0]._id, name: 'Webhooks Validated',   order: 2, color: stageColors[2], probabilityPercent: 55,  followUpDays: 3,    isConversion: false, isActive: true },
    { pipelineId: pipelines[0]._id, name: 'Live Stream Synced',   order: 3, color: stageColors[3], probabilityPercent: 80,  followUpDays: 4,    isConversion: false, isActive: true },
    { pipelineId: pipelines[0]._id, name: 'Operational Active',   order: 4, color: '#10b981',       probabilityPercent: 100, followUpDays: null, isConversion: true,  isActive: true },
    { pipelineId: pipelines[0]._id, name: 'Connection Revoked',   order: 5, color: '#ef4444',       probabilityPercent: 0,   followUpDays: null, isConversion: false, isActive: true },

    // Enterprise Premium Scale
    { pipelineId: pipelines[1]._id, name: 'Capacity Scoping',     order: 0, color: stageColors[0], probabilityPercent: 20,  followUpDays: 2,    isConversion: false, isActive: true },
    { pipelineId: pipelines[1]._id, name: 'SLA Matrix Finalized', order: 1, color: stageColors[1], probabilityPercent: 45,  followUpDays: 2,    isConversion: false, isActive: true },
    { pipelineId: pipelines[1]._id, name: 'Load Simulation Test', order: 2, color: stageColors[2], probabilityPercent: 70,  followUpDays: 5,    isConversion: false, isActive: true },
    { pipelineId: pipelines[1]._id, name: 'Contract Executed',    order: 3, color: '#10b981',       probabilityPercent: 100, followUpDays: null, isConversion: true,  isActive: true },
    { pipelineId: pipelines[1]._id, name: 'Provisioning Defeated',order: 4, color: '#ef4444',       probabilityPercent: 0,   followUpDays: null, isConversion: false, isActive: true },

    // Fault-Tolerant System Logs
    { pipelineId: pipelines[2]._id, name: 'Telemetry Exception',  order: 0, color: stageColors[0], probabilityPercent: null, followUpDays: 1,   isConversion: false, isActive: true },
    { pipelineId: pipelines[2]._id, name: 'Trace Logs Analyzed',  order: 1, color: stageColors[2], probabilityPercent: null, followUpDays: 1,   isConversion: false, isActive: true },
    { pipelineId: pipelines[2]._id, name: 'State Queue Cleared',  order: 2, color: '#10b981',       probabilityPercent: 100, followUpDays: null, isConversion: true,  isActive: true },
    { pipelineId: pipelines[2]._id, name: 'Incident Closed',      order: 3, color: '#6b7280',       probabilityPercent: 100, followUpDays: null, isConversion: true,  isActive: true },

    // Automated Catalog Refinement
    { pipelineId: pipelines[3]._id, name: 'Audit Discovered',     order: 0, color: stageColors[0], probabilityPercent: 25,  followUpDays: 1,    isConversion: false, isActive: true },
    { pipelineId: pipelines[3]._id, name: 'Variant Output Live',  order: 1, color: stageColors[1], probabilityPercent: 50,  followUpDays: 3,    isConversion: false, isActive: true },
    { pipelineId: pipelines[3]._id, name: 'Token Pool Connected', order: 2, color: stageColors[2], probabilityPercent: 75,  followUpDays: 3,    isConversion: false, isActive: true },
    { pipelineId: pipelines[3]._id, name: 'Billing Activated',    order: 3, color: '#10b981',       probabilityPercent: 100, followUpDays: null, isConversion: true,  isActive: true },
    { pipelineId: pipelines[3]._id, name: 'Pipeline Detached',    order: 4, color: '#ef4444',       probabilityPercent: 0,   followUpDays: null, isConversion: false, isActive: true },
  ];

  const stages = await Promise.all(
    stageData.map(s =>
      Stage.findOneAndUpdate(
        { pipelineId: s.pipelineId, name: s.name },
        s,
        { upsert: true, new: true }
      )
    )
  );

  const stagesByPipeline = (plId) => stages.filter(s => String(s.pipelineId) === String(plId));
  console.log(`Stage mapped: ${stages.length}`);

  // ── 5. Templates (upsert by slug) ──────────────────────────────
  const templatesData = [
    {
      name: 'Global Store Integration Initializer', slug: 'global-store-initializer', type: 'email',
      subject: 'Action Required: Initialize Multi-Platform Sync Node Connection',
      body: 'Hello {{name}},\n\nYour distributed routing clusters are fully initialized. Please finalize authentication rules across Amazon, Meesho, and Shopify inside your dashboard gateway panel using the secure OAuth token arrays.\n\nBest,\nAutomated Integration Node',
      placeholders: ['name'], createdBy: adminUser._id,
    },
    {
      name: 'API Credential Disconnect Alert', slug: 'api-credential-disconnect', type: 'email',
      subject: 'Critical Telemetry: Webhook ingestion layer disconnected',
      body: 'Hello {{name}},\n\nWe tracked an persistent unhandled exception error on channel gateway: {{product}}. Your sync authorization array has expired. Please run credential rotation via frontend to avoid listing drift.\n\nRegards,\n{{agent_name}}',
      placeholders: ['name', 'product', 'agent_name'], createdBy: adminUser._id,
    },
    {
      name: 'AI Bulk Batch Execution Complete', slug: 'ai-bulk-batch-complete', type: 'email',
      subject: 'System Alert: Generative asset catalog synchronization finished',
      body: 'Hello {{name}},\n\nOur asset modification engines have transformed your products successfully. Mutated data elements pushed down onto consumer endpoints: {{amount}} objects.\n\nProcessed by,\n{{agent_name}}',
      placeholders: ['name', 'amount', 'agent_name'], createdBy: adminUser._id,
    },
    {
      name: 'WhatsApp Secure Handshake Complete', slug: 'whatsapp-handshake-complete', type: 'whatsapp',
      body: 'Hello {{name}}! 🚀 Encryption parameters verified. Your real-time multi-platform item state changes are now bound to our listener webhooks.',
      placeholders: ['name'], createdBy: adminUser._id,
    },
    {
      name: 'WhatsApp Global Variant Pushed', slug: 'whatsapp-global-push', type: 'whatsapp',
      body: 'Hello {{name}}, localized asset changes for model variant {{product}} have been forcefully propagated down to all marketplace catalogs. Sync State: Completed.',
      placeholders: ['name', 'product'], createdBy: adminUser._id,
    },
  ];

  const templates = await Promise.all(
    templatesData.map(t =>
      Template.findOneAndUpdate({ slug: t.slug }, t, { upsert: true, new: true })
    )
  );
  console.log(`✅ Templates: ${templates.length}`);

  // ── 6. Leads (200 records - always fresh insert) ────────────────
  const sources    = Object.values(LEAD_SOURCES);
  const statuses   = Object.values(LEAD_STATUSES);
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const leadTypes  = ['guest', 'registered'];
  const skus       = ['SKU-DIST-NODE', 'SKU-REPL-XYZ', 'SKU-CONC-V4', 'SKU-ASYNC-H8', null];

  const firstNames = ['Hanuman','Indra','Jagdamba','Kalyan','Laxman','Madhu','Nandlal','Omprakash','Phoolchand','Rajkumar','Savitri','Tara','Urmila','Vasundhara','Wahida','Yadunath','Zeenat','Abhilasha','Bhawani','Chandresh'];
  const lastNames  = ['Bhati','Rathore','Shekhawat','Mundhra','Choudhary','Purohit','Singhvi','Bohra','Kothari','Maheshwari','Gopan','Thomas','Menon','Pillai','Nair','Varma','Selvam','Begum','Ansari','Sheikh'];

  const leadsData = [];
  const TOTAL_LEADS = 200; // Increased to 200 records

  for (let i = 0; i < TOTAL_LEADS; i++) {
    const plIndex  = rndN(0, 3);
    const pl       = pipelines[plIndex];
    const plStages = stagesByPipeline(pl._id);
    const stage    = rnd(plStages);
    const teamMembers = allAgents.filter(u => String(u.team_id) === String(teams[plIndex]._id));
    const assignee = rnd(teamMembers);
    const name     = `${rnd(firstNames)} ${rnd(lastNames)}`;
    const email    = `merchant_stream_${Date.now()}_${i}@omnichannel-cluster.net`;
    const phone    = `97830${String(rndN(10000, 99999))}`;
    const createdAt = daysAgo(rndN(0, 90));

    leadsData.push({
      name, email, phone,
      source:        rnd(sources),
      status:        rnd(statuses),
      priority:      rnd(priorities),
      leadType:      rnd(leadTypes),
      pipelineId:    pl._id,
      stageId:       stage._id,
      assignedTo:    assignee?._id || null,
      message:       `Operating an asynchronous omnichannel matrix over Flipkart, Amazon, and Myntra. We require bulk asset extraction via prompt orchestration to automatically append variation metadata fields. (Merchant Cluster Identification Node #${i + 1})`,
      subject:       rnd(['Distributed Lock Concurrency Failure', 'Event Ingestion Target Interruption', 'Expired Shared OAuth Context Token', 'AI Model Allocation Quota Request', '']),
      issueCategory: rnd(['shipping', 'payment', 'product', 'account', '']),
      productSku:    rnd(skus),
      totalQuantity: rndN(200, 5000),
      orderId:       Math.random() > 0.6 ? `STREAM-${rndN(30000, 99999)}` : null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const leads = await Lead.insertMany(leadsData);
  console.log(`✅ Leads: Added ${leads.length} records to database successfully`);

  // ── 7. Activities ───────────────────────────────────────────────
  const activityTypes  = Object.values(ACTIVITY_TYPES);
  const activitiesData = [];

  for (const lead of leads) {
    const count = rndN(1, 3); // Kept optimal to manage cluster load balance
    for (let i = 0; i < count; i++) {
      const teamMembers = allAgents.filter(u => String(u.team_id) === String(
        teams[pipelines.findIndex(p => String(p._id) === String(lead.pipelineId))]?._id
      ));
      const performer = rnd(teamMembers.length ? teamMembers : allAgents);
      activitiesData.push({
        lead:        lead._id,
        type:        rnd(activityTypes),
        description: rnd([
          'Audited transactional message payload structures within ingestion gateway',
          'Successfully traced background cron worker replication cycles',
          'Orchestrated generative multi-lingual attribute updates via AI endpoint',
          'Evaluated safety authorization flags on remote merchant credentials',
          'Checked cross-channel inventory stock configuration constraints',
          'Configured interval timeout loops inside the webhook handler controller',
          'Analyzed asynchronous stream drop anomalies on frontend log consoles',
          'Instructed user how to push asset modifications down to Amazon backends',
          'Captured system pipeline trace responses directly inside the server framework',
          'Generated customizable integration metric visual dashboards',
        ]),
        performedBy: performer._id,
        metadata:    { source: lead.source },
        createdAt:   new Date(lead.createdAt.getTime() + rndN(1, 10) * 3600000),
      });
    }
  }

  await Activity.insertMany(activitiesData);
  console.log(`✅ Activities: ${activitiesData.length}`);

  // ── 8. Tasks ────────────────────────────────────────────────────
  const taskTypes    = ['call','meeting','follow_up','email','demo','whatsapp','visit','custom'];
  const taskStatuses = ['pending','in_progress','completed','cancelled','overdue'];
  const tasksData = [];

  for (const lead of leads) {
    const count = rndN(1, 2);
    for (let i = 0; i < count; i++) {
      const plIndex = pipelines.findIndex(p => String(p._id) === String(lead.pipelineId));
      const teamMembers = allAgents.filter(u => String(u.team_id) === String(teams[plIndex]?._id));
      const assignee = rnd(teamMembers.length ? teamMembers : allAgents);
      const status   = rnd(taskStatuses);
      const dueDate  = new Date(Date.now() + rndN(-10, 20) * 86400000);
      tasksData.push({
        title:        rnd(['Audit concurrent synchronization routes','Verify distributed webhook integrity','Test transactional payload bulk execution','Validate remote API object definitions','Debug mutation loop event locks','Refine model description token parameters','Calibrate price update variable maps','Re-authorize marketplace tenant boundaries']),
        description:  `Task managing operational multi-channel routing logic for partner: ${lead.name}`,
        lead_id:      lead._id,
        assigned_to:  assignee._id,
        created_by:   rnd(managers)._id,
        team_id:      teams[plIndex]?._id,
        task_type:    rnd(taskTypes),
        status,
        priority:     rnd(priorities),
        due_date:     dueDate,
        completed_at: status === 'completed' ? daysAgo(rndN(1, 5)) : null,
        start_date:   daysAgo(rndN(1, 10)),
      });
    }
  }

  await Task.insertMany(tasksData);
  console.log(`✅ Tasks: ${tasksData.length}`);

  // ── 9. Communications ───────────────────────────────────────────
  const commSources = ['email','whatsapp','phone','importerr_inquiry','importerr_ticket'];
  const commsData   = [];

  // Distribute over a subset of the 200 leads to maintain realistic database profiling
  for (const lead of leads.slice(0, 120)) {
    const count = rndN(1, 3);
    for (let i = 0; i < count; i++) {
      const plIndex = pipelines.findIndex(p => String(p._id) === String(lead.pipelineId));
      const teamMembers = allAgents.filter(u => String(u.team_id) === String(teams[plIndex]?._id));
      const agent = rnd(teamMembers.length ? teamMembers : allAgents);
      const isOutbound = Math.random() > 0.4;
      commsData.push({
        lead:       lead._id,
        senderType: isOutbound ? 'team_member' : 'client',
        senderUser: isOutbound ? agent._id : null,
        source:     rnd(commSources),
        direction:  isOutbound ? 'outbound' : 'inbound',
        message:    rnd([
          'Your multi-tenant integration endpoint configurations have compiled cleanly.',
          'The synchronization framework will align product data state variables smoothly.',
          'Please verify if your marketplace access array permits custom webhook capture.',
          'We recorded intermittent gateway backpressure limits during transactional stream calls.',
          'The pricing variation parameters did not reflect correctly inside the remote database state.',
          'Your internal microservice connection variables have been rotated and encrypted.',
          'Are your dynamic AI language processors evaluating structural listing definitions correctly?',
          'Webhook trigger successfully completed with response status 200.',
        ]),
        createdAt: new Date(lead.createdAt.getTime() + rndN(1, 72) * 3600000),
      });
    }
  }

  await Communication.insertMany(commsData);
  console.log(`✅ Communications: ${commsData.length}`);

  // ── 10. AI Logs ─────────────────────────────────────────────────
  const aiLogsData = [];
  for (const lead of leads.slice(0, 100)) {
    aiLogsData.push({
      leadId:       lead._id,
      callType:     rnd(['matchPipeline', 'getPriority']),
      model:        'gpt-4o-mini',
      prompt:       `Analyze routing logic context and parse structural integration requirements: ${lead.message?.slice(0, 100)}`,
      rawResponse:  JSON.stringify({ pipeline: 'Asynchronous Ingestion Path', confidence: 0.98 }),
      parsedResult: { pipeline: 'Asynchronous Ingestion Path', confidence: 0.98 },
      tokensUsed:   { prompt: rndN(100, 250), completion: rndN(30, 80), total: rndN(130, 330) },
      latencyMs:    rndN(180, 1400),
      success:      Math.random() > 0.08,
      error:        Math.random() > 0.92 ? 'Distributed completion engine instance pool depleted' : null,
      createdAt:    new Date(lead.createdAt.getTime() + rndN(1, 5) * 60000),
    });
  }

  await AiLog.insertMany(aiLogsData);
  console.log(`✅ AI Logs: ${aiLogsData.length}`);

  // ── 11. LeadStageProgress ───────────────────────────────────────
  const progressData = [];
  for (const lead of leads.slice(0, 80)) {
    const plStages = stagesByPipeline(lead.pipelineId);
    const stage    = plStages.find(s => String(s._id) === String(lead.stageId));
    if (!stage) continue;
    progressData.push({
      leadId:           lead._id,
      pipelineId:       lead.pipelineId,
      stageId:          lead.stageId,
      allowedSeconds:   (stage.followUpDays || 3) * 86400,
      consumedSeconds:  rndN(0, (stage.followUpDays || 3) * 86400),
      currentEnteredAt: daysAgo(rndN(0, 5)),
      isActive:         true,
      isOverdue:        Math.random() > 0.75,
      completedAt:      null,
    });
  }

  await LeadStageProgress.insertMany(progressData);
  console.log(`✅ LeadStageProgress: ${progressData.length}`);

  // ── Summary ─────────────────────────────────────────────────────
  console.log('\n🎉 Omnichannel Architecture Seed Complete! Heavy cluster dataset injected seamlessly.\n');
  console.log('System Access Controls (Global password key: password123):');
  console.log('  Admin:        admin@crm.com');
  console.log('  Manager: ramkishan@crm.com   (Distributed Sync Core)');
  console.log('  Manager: sreelakshmi@crm.com (Strategic High-GMV Brands)');
  console.log('  Member:    vijayraj@crm.com   (Distributed Sync Core)');
  console.log('  Member:      ajith@crm.com    (Strategic High-GMV Brands)');

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });