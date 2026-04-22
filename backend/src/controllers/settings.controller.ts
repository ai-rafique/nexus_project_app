import type { Request, Response } from 'express';
import { Settings } from '../models/Settings';

function settingsJson(s: InstanceType<typeof Settings>) {
  return {
    _id: s._id,
    companyName: s.companyName,
    hasLogo: !!(s.logoData),
    logoMimeType: s.logoMimeType,
    updatedAt: s.updatedAt,
  };
}

export async function getSettings(req: Request, res: Response) {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({ companyName: 'NEXUS' });
    return res.json(settingsJson(settings));
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const { companyName } = req.body;
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({ companyName: 'NEXUS' });
    if (companyName !== undefined) settings.companyName = companyName;
    await settings.save();
    return res.json(settingsJson(settings));
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

export async function uploadLogo(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({ companyName: 'NEXUS' });
    settings.logoData = req.file.buffer;
    settings.logoMimeType = req.file.mimetype;
    await settings.save();
    return res.json({ message: 'Logo uploaded', hasLogo: true });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

export async function deleteLogo(req: Request, res: Response) {
  try {
    const settings = await Settings.findOne();
    if (!settings?.logoData) return res.status(404).json({ message: 'No logo set' });
    settings.logoData = undefined;
    settings.logoMimeType = undefined;
    await settings.save();
    return res.json({ message: 'Logo removed' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

export async function getLogo(req: Request, res: Response) {
  try {
    const settings = await Settings.findOne();
    if (!settings?.logoData) return res.status(404).json({ message: 'No logo set' });
    res.set('Content-Type', settings.logoMimeType ?? 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(settings.logoData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
