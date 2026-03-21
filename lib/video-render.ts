import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegStatic!);

export function renderPngToVideo(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .inputOptions(['-loop 1'])
      .outputOptions(['-t 5', '-c:v libx264', '-pix_fmt yuv420p', '-r 24'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}
