import { Transform, type TransformCallback } from 'stream';
import { type AFCPacket, AFC_HEADER_SIZE, AFC_MAGIC } from '../struct.js';

export class Encoder extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(data: AFCPacket, encoding: BufferEncoding, onData: TransformCallback): void {
    onData(null, this._encode(data));
  }

  _encode(data: AFCPacket) {
    const content = data.content ? data.content : Buffer.alloc(0);

    const thisLength = AFC_HEADER_SIZE + data.headerPayload.length;
    const messageLength = thisLength + content.length;
    const buffer = Buffer.alloc(messageLength);
    AFC_MAGIC.copy(buffer);
    this.writeUInt64LE(buffer, 8, messageLength);
    this.writeUInt64LE(buffer, 16, thisLength);
    this.writeUInt64LE(buffer, 24, data.header.packetNum);
    this.writeUInt64LE(buffer, 32, data.header.opCode);
    data.headerPayload.copy(buffer, AFC_HEADER_SIZE);
    content.copy(buffer, thisLength);
    return buffer;
  }

  writeUInt64LE (buffer: Buffer, index: number, content: number) {
    // Ignore the first 4 bytes since we don't do anything with longs
    buffer.writeUInt32LE(content, index);
    buffer.writeUInt32LE(0, index + 4);
  }
}