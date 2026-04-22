import { Schema, model, Document } from 'mongoose';

export interface ISettings extends Document {
  companyName:   string;
  logoData?:     Buffer;
  logoMimeType?: string;
  updatedAt:     Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    companyName:   { type: String, default: 'NEXUS' },
    logoData:      { type: Buffer },
    logoMimeType:  { type: String },
  },
  { timestamps: true },
);

export const Settings = model<ISettings>('Settings', settingsSchema);
