import { Schema, model, Document as MongoDoc, Types } from 'mongoose';

export type FatResult = 'pending' | 'pass' | 'fail' | 'blocked';

export interface IFatItem {
  _id:          Types.ObjectId;
  order:        number;
  title:        string;
  description:  string;
  linkedReq?:   Types.ObjectId;
  result:       FatResult;
  observations: string;
  signedOff:    boolean;
  signedBy?:    Types.ObjectId;
  signedAt?:    Date;
}

export interface IFatPlan extends MongoDoc {
  _id:       Types.ObjectId;
  projectId: Types.ObjectId;
  title:     string;
  status:    'draft' | 'in_progress' | 'completed';
  items:     IFatItem[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fatItemSchema = new Schema<IFatItem>(
  {
    order:        { type: Number, default: 0 },
    title:        { type: String, required: true, trim: true },
    description:  { type: String, default: '' },
    linkedReq:    { type: Schema.Types.ObjectId, ref: 'Requirement' },
    result:       { type: String, enum: ['pending','pass','fail','blocked'], default: 'pending' },
    observations: { type: String, default: '' },
    signedOff:    { type: Boolean, default: false },
    signedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    signedAt:     { type: Date },
  },
  { _id: true },
);

const fatPlanSchema = new Schema<IFatPlan>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title:     { type: String, required: true, trim: true },
    status:    { type: String, enum: ['draft','in_progress','completed'], default: 'draft' },
    items:     [fatItemSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

fatPlanSchema.index({ projectId: 1 });

export const FatPlan = model<IFatPlan>('FatPlan', fatPlanSchema);
