import { Schema, model, Document } from 'mongoose';

export interface ISettings extends Document {
  companyName:   string;
  logoPath?:     string;
  logoMimeType?: string;
  updatedAt:     Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    companyName:   { type: String, default: 'NEXUS' },
    logoPath:      { type: String },
    logoMimeType:  { type: String },
  },
  { timestamps: true },
);

export const Settings = model<ISettings>('Settings', settingsSchema);
