import mongoose from 'mongoose';

const dailyWorkUpdateSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    reportType: { type: String, enum: ['daily_report', 'task_log'], default: 'daily_report' },
    date: { type: Date, required: true },
    workDescription: {
      type: String,
      required() {
        return this.status !== 'draft';
      },
      default: ''
    },
    timeSpent: { type: Number, default: 0 },
    completedWork: { type: String, default: '' },
    pendingWork: { type: String, default: '' },
    blockers: { type: String, default: '' },
    tomorrowPlan: { type: String, default: '' },
    workDoneToday: [
      {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        projectName: { type: String, default: '' },
        taskName: { type: String, default: '' },
        workDescription: { type: String, default: '' },
        timeSpent: { type: Number, default: 0 },
        status: { type: String, default: '' }
      }
    ],
    completedTasks: [
      {
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        taskName: { type: String, default: '' },
        completionNotes: { type: String, default: '' },
        files: [
          {
            fileName: { type: String, default: '' },
            fileUrl: { type: String, default: '' }
          }
        ]
      }
    ],
    pendingTasks: [
      {
        taskName: { type: String, default: '' },
        reason: { type: String, default: '' },
        expectedCompletionDate: { type: Date }
      }
    ],
    blockersIssues: [
      {
        issueDescription: { type: String, default: '' },
        helpNeeded: { type: String, default: '' },
        priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }
      }
    ],
    tomorrowPlanItems: [
      {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        projectName: { type: String, default: '' },
        plannedTasks: { type: String, default: '' },
        estimatedHours: { type: Number, default: 0 }
      }
    ],
    status: { type: String, enum: ['draft', 'submitted'], default: 'submitted' }
  },
  { timestamps: true }
);

dailyWorkUpdateSchema.index({ employeeId: 1, date: 1, reportType: 1, taskId: 1 }, { unique: true });

const DailyWorkUpdate = mongoose.model('DailyWorkUpdate', dailyWorkUpdateSchema);

export default DailyWorkUpdate;
