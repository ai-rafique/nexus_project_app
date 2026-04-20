import { Schema, model, Document, Types } from 'mongoose';

export type ReqType     = 'functional' | 'non_functional' | 'constraint' | 'interface';
export type ReqPriority = 'critical' | 'high' | 'medium' | 'low';
export type ReqStatus   = 'draft' | 'under_review' | 'approved' | 'deprecated';

export interface IReqComment {
  userId:    Types.ObjectId;
  text:      string;
  createdAt: Date;
}

export interface IReqVersion {
  version:   number;
  title:     string;
  description:        string;
  acceptanceCriteria: string;
  changedBy:  Types.ObjectId;
  changedAt:  Date;
}

export interface IRequirement extends Document {
  _id:                Types.ObjectId;
  projectId:          Types.ObjectId;
  reqId:              string;
  title:              string;
  description:        string;
  acceptanceCriteria: string;
  type:               ReqType;
  priority:           ReqPriority;
  status:             ReqStatus;
  source:             string;
  tags:               string[];
  assignedTo?:        Types.ObjectId;
  version:            number;
  versionHistory:     IReqVersion[];
  comments:           IReqComment[];
  createdBy:          Types.ObjectId;
  createdAt:          Date;
  updatedAt:          Date;
}

const commentSchema = new Schema<IReqComment>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, text: { type: String, required: true }, createdAt: { type: Date, default: Date.now } },
  { _id: true },
);

const versionSchema = new Schema<IReqVersion>(
  {
    version:            { type: Number, required: true },
    title:              { type: String, required: true },
    description:        { type: String, default: '' },
    acceptanceCriteria: { type: String, default: '' },
    changedBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt:  { type: Date, default: Date.now },
  },
  { _id: false },
);

const requirementSchema = new Schema<IRequirement>(
  {
    projectId:          { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    reqId:              { type: String, required: true },
    title:              { type: String, required: true, trim: true },
    description:        { type: String, default: '' },
    acceptanceCriteria: { type: String, default: '' },
    type:     { type: String, enum: ['functional','non_functional','constraint','interface'], default: 'functional' },
    priority: { type: String, enum: ['critical','high','medium','low'], default: 'medium' },
    status:   { type: String, enum: ['draft','under_review','approved','deprecated'], default: 'draft' },
    source:     { type: String, default: '' },
    tags:       [{ type: String }],
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    version:    { type: Number, default: 1 },
    versionHistory: [versionSchema],
    comments:       [commentSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

requirementSchema.index({ projectId: 1, reqId: 1 }, { unique: true });
requirementSchema.index({ projectId: 1, status: 1 });

export const Requirement = model<IRequirement>('Requirement', requirementSchema);
