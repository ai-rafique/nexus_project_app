import { Schema, model, Document as MongoDoc, Types } from 'mongoose';

export type DocType   = 'srs' | 'sds' | 'fat_plan' | 'fat_report' | 'verification_matrix';
export type DocStatus = 'draft' | 'in_review' | 'client_review' | 'approved' | 'superseded';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface IDocSection {
  id:         string;
  title:      string;
  content:    string;
  order:      number;
  linkedReqs: Types.ObjectId[];
}

export interface IReviewer {
  userId:    Types.ObjectId;
  status:    ReviewStatus;
  comment:   string;
  signedAt?: Date;
}

export interface IDocument extends MongoDoc {
  _id:       Types.ObjectId;
  projectId: Types.ObjectId;
  type:      DocType;
  title:     string;
  status:    DocStatus;
  version:   string;
  sections:  IDocSection[];
  reviewers: IReviewer[];
  fileUrl?:  string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<IDocSection>(
  {
    id:      { type: String, required: true },
    title:   { type: String, required: true },
    content: { type: String, default: '' },
    order:   { type: Number, default: 0 },
    linkedReqs: [{ type: Schema.Types.ObjectId, ref: 'Requirement' }],
  },
  { _id: false },
);

const reviewerSchema = new Schema<IReviewer>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:  { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    comment: { type: String, default: '' },
    signedAt:{ type: Date },
  },
  { _id: false },
);

const documentSchema = new Schema<IDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    type:      { type: String, enum: ['srs','sds','fat_plan','fat_report','verification_matrix'], required: true },
    title:     { type: String, required: true, trim: true },
    status:    { type: String, enum: ['draft','in_review','client_review','approved','superseded'], default: 'draft' },
    version:   { type: String, default: '1.0' },
    sections:  [sectionSchema],
    reviewers: [reviewerSchema],
    fileUrl:   { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

documentSchema.index({ projectId: 1, type: 1 });

export const ProjectDocument = model<IDocument>('Document', documentSchema);
