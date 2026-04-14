import { Schema, model, Document, Types } from 'mongoose';

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectPhase =
  | 'requirements'
  | 'srs'
  | 'sds'
  | 'implementation'
  | 'testing'
  | 'fat'
  | 'delivery';
export type ProjectRole =
  | 'project_manager'
  | 'business_analyst'
  | 'architect'
  | 'developer'
  | 'qa_engineer'
  | 'client_viewer'
  | 'client_approver';

export interface IProjectMember {
  userId: Types.ObjectId;
  role: ProjectRole;
  addedAt: Date;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  clientName: string;
  status: ProjectStatus;
  currentPhase: ProjectPhase;
  startDate: Date;
  targetEndDate?: Date;
  members: IProjectMember[];
  tags: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: [
        'project_manager',
        'business_analyst',
        'architect',
        'developer',
        'qa_engineer',
        'client_viewer',
        'client_approver',
      ],
      required: true,
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    clientName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed', 'archived'],
      default: 'active',
    },
    currentPhase: {
      type: String,
      enum: ['requirements', 'srs', 'sds', 'implementation', 'testing', 'fat', 'delivery'],
      default: 'requirements',
    },
    startDate: { type: Date, required: true },
    targetEndDate: { type: Date },
    members: [projectMemberSchema],
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

projectSchema.index({ createdBy: 1 });
projectSchema.index({ 'members.userId': 1 });

export const Project = model<IProject>('Project', projectSchema);
