import { AFCOpcode, AFCLinkType, AFCFileOpenMode } from './enum.js';

// AFC constants
export const AFC_MAGIC = Buffer.from('CFA6LPAA', 'ascii');
export const AFC_HEADER_SIZE = 40; // Sizeof with 8 + 8 + 8 + 8 + 8 bytes

// AFC Header structure
export interface AFCHeader {
  magic: Buffer;
  entireLength: number;
  thisLength: number;
  packetNum: number;
  opCode: AFCOpcode;
  dataOffset: number;
}

export interface AFCPacket {
  header: AFCHeader;
  headerPayload: Buffer;
  content: Buffer;
}

export interface AFCReadDirResponse {
  filenames: string[];
}

export interface AFCMkdirRequest {
  filename: string;
}

export interface AFCStatRequest {
  filename: string;
}

export interface AFCMakeLinkRequest {
  type: AFCLinkType;
  target: string;
  source: string;
}

export interface AFCFileOpenRequest {
  mode: AFCFileOpenMode;
  filename: string;
}

export interface AFCFileOpenResponse {
  handle: number;
}

export interface AFCFileCloseRequest {
  handle: number;
}

export interface AFCRemoveRequest {
  filename: string;
}

export interface AFCRenameRequest {
  source: string;
  target: string;
}

export interface AFCFileReadRequest {
  handle: number;
  size: number;
}

export interface AFCLockRequest {
  handle: number;
  op: number;
}

export interface AFCStat {
  st_size: number;
  st_blocks: number;
  st_mtime: Date;
  st_birthtime: Date;
  st_nlink: number;
  [key: string]: string | number | Date;
}
