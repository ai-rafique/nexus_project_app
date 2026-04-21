import { Schema, model, Document, Types } from 'mongoose';

export type TraceNodeType = 'requirement' | 'srs_section' | 'sds_component' | 'test_case' | 'fat_item';
export type LinkType = 'derives' | 'verifies' | 'implements' | 'tests';

export interface ITraceLink extends Document {
  _id:        Types.ObjectId;
  projectId:  Types.ObjectId;
  sourceType: TraceNodeType;
  sourceId:   string;
  targetType: TraceNodeType;
  targetId:   string;
  linkType:   LinkType;
  createdBy:  Types.ObjectId;
  createdAt:  Date;
}

const traceLinkSchema = new Schema<ITraceLink>(
  {
    projectId:  { type: Schema.Types.ObjectId, ref: 'Project',  required: true },
    sourceType: { type: String, enum: ['requirement','srs_section','sds_component','test_case','fat_item'], required: true },
    sourceId:   { type: String, required: true },
    targetType: { type: String, enum: ['requirement','srs_section','sds_component','test_case','fat_item'], required: true },
    targetId:   { type: String, required: true },
    linkType:   { type: String, enum: ['derives','verifies','implements','tests'], required: true },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

traceLinkSchema.index({ projectId: 1 });
traceLinkSchema.index({ projectId: 1, sourceId: 1 });
traceLinkSchema.index({ projectId: 1, targetId: 1 });
// Prevent exact duplicate links
traceLinkSchema.index({ projectId: 1, sourceId: 1, targetId: 1, linkType: 1 }, { unique: true });

export const TraceLink = model<ITraceLink>('TraceLink', traceLinkSchema);
