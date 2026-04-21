import { Schema, model, Document as MongoDoc, Types } from 'mongoose';

export type TestStatus = 'draft' | 'active' | 'deprecated';

export interface ITestStep {
  order:    number;
  action:   string;
  expected: string;
}

export interface ITestRun {
  _id:         Types.ObjectId;
  result:      'pass' | 'fail' | 'blocked' | 'na';
  notes:       string;
  executedBy:  Types.ObjectId;
  executedAt:  Date;
}

export interface ITestCase extends MongoDoc {
  _id:          Types.ObjectId;
  projectId:    Types.ObjectId;
  testId:       string;
  title:        string;
  description:  string;
  steps:        ITestStep[];
  linkedReqs:   Types.ObjectId[];
  status:       TestStatus;
  runs:         ITestRun[];
  createdBy:    Types.ObjectId;
  createdAt:    Date;
  updatedAt:    Date;
}

const testStepSchema = new Schema<ITestStep>(
  { order: Number, action: { type: String, required: true }, expected: { type: String, default: '' } },
  { _id: false },
);

const testRunSchema = new Schema<ITestRun>(
  {
    result:     { type: String, enum: ['pass','fail','blocked','na'], required: true },
    notes:      { type: String, default: '' },
    executedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    executedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const testCaseSchema = new Schema<ITestCase>(
  {
    projectId:   { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    testId:      { type: String, required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    steps:       [testStepSchema],
    linkedReqs:  [{ type: Schema.Types.ObjectId, ref: 'Requirement' }],
    status:      { type: String, enum: ['draft','active','deprecated'], default: 'draft' },
    runs:        [testRunSchema],
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

testCaseSchema.index({ projectId: 1, testId: 1 }, { unique: true });

export const TestCase = model<ITestCase>('TestCase', testCaseSchema);
