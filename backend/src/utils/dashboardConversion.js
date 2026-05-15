const { LEAD_STATUSES } = require('./constants');

const CONVERTED_STATUS = LEAD_STATUSES.CONVERTED;

/** Lookup the last active stage (max order) for the lead's pipeline. */
function lookupTerminalStageForLead() {
  return {
    $lookup: {
      from: 'stages',
      let: { pid: '$pipelineId' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$pipelineId', '$$pid'] },
            isActive: true,
          },
        },
        { $sort: { order: -1 } },
        { $limit: 1 },
        { $project: { _id: 1, name: 1, order: 1, probabilityPercent: 1, isConversion: 1 } },
      ],
      as: 'terminalStage',
    },
  };
}

/** Join current stage document onto the lead (required before conversion fields). */
function lookupCurrentStageForLead() {
  return {
    $lookup: {
      from: 'stages',
      localField: 'stageId',
      foreignField: '_id',
      as: 'st',
    },
  };
}

function unwindCurrentStage() {
  return { $unwind: { path: '$st', preserveNullAndEmptyArrays: true } };
}

function addTerminalStageDocField() {
  return {
    $addFields: {
      terminalStageDoc: { $arrayElemAt: ['$terminalStage', 0] },
      prob: { $ifNull: ['$st.probabilityPercent', null] },
    },
  };
}

/** Requires terminalStageDoc (run after addTerminalStageDocField). */
function addDashboardConversionFields() {
  return {
    $addFields: {
      isOnLastStage: {
        $and: [
          { $ifNull: ['$terminalStageDoc._id', false] },
          { $eq: ['$stageId', '$terminalStageDoc._id'] },
        ],
      },
      isConvertedLead: {
        $and: [
          { $eq: ['$st.isConversion', true] },
          { $eq: ['$status', CONVERTED_STATUS] },
        ],
      },
    },
  };
}

/** Second pass after terminalStageDoc exists — metric for pipeline table rows. */
function addPipelineMetricHitField() {
  return {
    $addFields: {
      pipelineUsesConversionMetric: { $eq: ['$terminalStageDoc.isConversion', true] },
      metricHit: {
        $cond: [
          { $eq: ['$terminalStageDoc.isConversion', true] },
          {
            $and: [
              { $eq: ['$st.isConversion', true] },
              { $eq: ['$status', CONVERTED_STATUS] },
            ],
          },
          {
            $and: [
              { $ifNull: ['$terminalStageDoc._id', false] },
              { $eq: ['$stageId', '$terminalStageDoc._id'] },
            ],
          },
        ],
      },
    },
  };
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** Join all SLA progress rows for each lead (before grouping by assignee). */
function lookupLeadStageProgressForLead(progressCollectionName) {
  return {
    $lookup: {
      from: progressCollectionName,
      localField: '_id',
      foreignField: 'leadId',
      as: 'slaProgress',
    },
  };
}

/** Sum time-in-stage across progress rows (matches lead stage timeline). */
function addLeadSlaTimelineSecondsField() {
  return {
    $addFields: {
      slaTimelineSeconds: {
        $sum: {
          $map: {
            input: { $ifNull: ['$slaProgress', []] },
            as: 'p',
            in: {
              $add: [
                { $ifNull: ['$$p.consumedSeconds', 0] },
                {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$$p.isActive', true] },
                        { $ne: ['$$p.currentEnteredAt', null] },
                      ],
                    },
                    then: {
                      $floor: {
                        $divide: [{ $subtract: ['$$NOW', '$$p.currentEnteredAt'] }, 1000],
                      },
                    },
                    else: 0,
                  },
                },
              ],
            },
          },
        },
      },
    },
  };
}

module.exports = {
  CONVERTED_STATUS,
  lookupTerminalStageForLead,
  lookupCurrentStageForLead,
  lookupLeadStageProgressForLead,
  unwindCurrentStage,
  addTerminalStageDocField,
  addDashboardConversionFields,
  addPipelineMetricHitField,
  addLeadSlaTimelineSecondsField,
  percent,
};
