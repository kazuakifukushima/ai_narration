import * as path from 'path';

/**
 * 音声ファイルの保存・配信ディレクトリ。
 * Render などで public/ が読み取り専用の場合は AUDIO_OUTPUT_DIR=/tmp/audio を設定する。
 */
export function getAudioDir(): string {
  return process.env.AUDIO_OUTPUT_DIR ?? path.join(process.cwd(), 'public', 'audio');
}
