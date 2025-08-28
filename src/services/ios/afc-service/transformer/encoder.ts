import { Transform, type TransformCallback } from 'stream';
import { type AFCPacket } from '../struct.js';

export class Encoder extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(data: AFCPacket, encoding: BufferEncoding, onData: TransformCallback): void {
    onData(null, this._encode(data));
  }

  // Public method to encode packets directly without using the stream pipeline
  encode(data: AFCPacket): Buffer {
    return this._encode(data);
  }

  _encode(data: AFCPacket) {
    const content = data.content ? data.content : Buffer.alloc(0);
    const headerPayload = data.headerPayload ? data.headerPayload : Buffer.alloc(0);

    const messageLength = data.header.entireLength;
    const buffer = Buffer.alloc(messageLength);

// Write the AFC header using the correct AFC protocol format
    let offset = 0;

// Magic (8 bytes) - 'CFA6LPAA'
    data.header.magic.copy(buffer, offset);
    offset += 8;

// Use little-endian format as AFC protocol expects this
// Entire length (8 bytes)
    buffer.writeBigUInt64LE(BigInt(data.header.entireLength), offset);
    offset += 8;

// This length (8 bytes)
    buffer.writeBigUInt64LE(BigInt(data.header.thisLength), offset);
    offset += 8;

// Packet number (8 bytes)
    buffer.writeBigUInt64LE(BigInt(data.header.packetNum), offset);
    offset += 8;

// Operation code (8 bytes)
    buffer.writeBigUInt64LE(BigInt(data.header.opCode), offset);
    offset += 8;

// Copy header payload
    headerPayload.copy(buffer, offset);
    offset += headerPayload.length;

// Copy content
    content.copy(buffer, offset);

    return buffer;
  }
}