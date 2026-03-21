import { NextRequest, NextResponse } from 'next/server';
import { createBatchFolder, createFolder, uploadToDrive } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  const { files } = await req.json() as { files: { filePath: string; fileName: string; videoFilePath: string; videoFileName: string }[] };

  const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const batchFolder = await createBatchFolder(parentFolderId);
  const videosFolder = await createFolder('Videos', batchFolder.id);

  const uploadedFiles: { fileName: string; driveId: string }[] = [];

  for (const file of files) {
    const driveId = await uploadToDrive(file.filePath, file.fileName, batchFolder.id);
    uploadedFiles.push({ fileName: file.fileName, driveId });
    const videoDriveId = await uploadToDrive(file.videoFilePath, file.videoFileName, videosFolder.id);
    uploadedFiles.push({ fileName: file.videoFileName, driveId: videoDriveId });
  }

  return NextResponse.json({ batchFolder, uploadedFiles });
}
