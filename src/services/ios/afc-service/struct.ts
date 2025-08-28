import { AFCOpcode, AFCLinkType, AFCFileOpenMode } from './enum.js';

// AFC constants - using the standard AFC magic bytes in correct byte order
export const AFC_MAGIC = Buffer.from([0x43, 0x46, 0x41, 0x36, 0x4C, 0x50, 0x41, 0x41]); // 'CFA6LPAA'
export const AFC_HEADER_SIZE = 40; // 8 + 8 + 8 + 8 + 8 bytes

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
