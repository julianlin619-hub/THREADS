import { google } from 'googleapis';
import fs from 'fs';
import { getNextBatchNumber } from './tweet-history';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

export async function createFolder(name: string, parentFolderId: string): Promise<{ id: string; name: string }> {
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    supportsAllDrives: true,
    fields: 'id',
  });
  return { id: res.data.id!, name };
}

export async function createBatchFolder(parentFolderId: string): Promise<{ id: string; name: string }> {
  const drive = google.drive({ version: 'v3', auth });

  const batchNumber = getNextBatchNumber();
  const folderName = `Batch #${batchNumber}`;
  return createFolder(folderName, parentFolderId);
}

export async function uploadToDrive(filePath: string, fileName: string, folderId: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth });

  const mimeType = fileName.endsWith('.mp4') ? 'video/mp4' : 'image/png';

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    supportsAllDrives: true,
    fields: 'id',
  });

  return response.data.id!;
}
