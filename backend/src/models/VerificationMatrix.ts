import { Schema, model, Document as MongoDoc, Types } from 'mongoose';

export type VerifMethod = 'test' | 'review' | 'analysis' | 'demonstration';
export type VerifStatus = 'planned' | 'in_progress' | 'verified' | 'failed';

export interface IVerifEntry {
  _id:           Types.ObjectId;
  requirementId: Types.ObjectId;
  method:        VerifMethod;
  reference:     string;
  status:        VerifStatus;
  notes:         string;
  verifiedBy?:   Types.ObjectId;
  verifiedAt?:   Date;
}

export interface IVerificationMatrix extends MongoDoc {
  _id:       Types.ObjectId;
  projectId: Types.ObjectId;
  entries:   IVerifEntry[];
  updatedAt: Date;
  createdAt: Date;
}

const entrySchema = new Schema<IVerifEntry>(
  {
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true },
    method:        { type: String, enum: ['test','review','analysis','demonstration'], required: true },
    reference:     { type: String, default: '' },
    status:        { type: String, enum: ['planned','in_progress','verified','failed'], default: 'planned' },
    notes:         { type: String, default: '' },
    verifiedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt:    { type: Date },
  },
  { _id: true },
);

const verificationMatrixSchema = new Schema<IVerificationMatrix>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
    entries:   [entrySchema],
  },
  { timestamps: true },
);

export const VerificationMatrix = model<IVerificationMatrix>('VerificationMatrix', verificationMatrixSchema);
