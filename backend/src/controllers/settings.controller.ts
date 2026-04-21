import type { Request, Response } from 'express';
import { Settings } from '../models/Settings';
import fs from 'fs';
import path from 'path';

// GET /api/settings
export async function getSettings(req: Request, res: Response) {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({ companyName: 'NEXUS' });
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/settings
export async function updateSettings(req: Request, res: Response) {
  try {
    const { companyName } = req.body;
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({ companyName: 'NEXUS' });

    if (companyName !== undefined) settings.companyName = companyName;
    await settings.save();
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/settings/logo
export async function uploadLogo(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({ companyName: 'NEXUS' });

    // Remove old logo if present
    if (settings.logoPath && fs.existsSync(settings.logoPath)) {
      fs.unlinkSync(settings.logoPath);
    }

    settings.logoPath = req.file.path;
    settings.logoMimeType = req.file.mimetype;
    await settings.save();

    return res.json({ message: 'Logo uploaded', logoPath: req.file.path });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// DELETE /api/settings/logo
export async function deleteLogo(req: Request, res: Response) {
  try {
    const settings = await Settings.findOne();
    if (!settings?.logoPath) return res.status(404).json({ message: 'No logo set' });

    if (fs.existsSync(settings.logoPath)) fs.unlinkSync(settings.logoPath);
    settings.logoPath = undefined;
    settings.logoMimeType = undefined;
    await settings.save();

    return res.json({ message: 'Logo removed' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/settings/logo
export async function getLogo(req: Request, res: Response) {
  try {
    const settings = await Settings.findOne();
    if (!settings?.logoPath || !fs.existsSync(settings.logoPath)) {
      return res.status(404).json({ message: 'No logo set' });
    }
    const mimeType = settings.logoMimeType ?? 'image/png';
    res.setHeader('Content-Type', mimeType);
    return res.send(fs.readFileSync(settings.logoPath));
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
