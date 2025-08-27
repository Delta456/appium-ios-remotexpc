import { Transform, type TransformCallback } from 'stream';
import { type AFCPacket, AFC_HEADER_SIZE, AFC_MAGIC } from '../struct.js';

export class Decoder extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(data: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    // Pass data through without transformation
    try {
      this._decode(data);
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }
  _decode(data: Buffer) {
    const magicNum = data.slice(0, 8);
    if (magicNum.compare(AFC_MAGIC) !== 0) {
      throw new Error(`Invalid AFC packet: incorrect magic number ${magicNum.toString('hex')}`);
    }

    const msgLen = this.readUInt64LE(data, 8);
    const thisLen = this.readUInt64LE(data, 16);
    const packetNum = this.readUInt64LE(data, 24);
    const opCode = this.readUInt64LE(data, 32);
    const headerPayload = data.slice(AFC_HEADER_SIZE, thisLen);
    const content = data.slice(thisLen, msgLen);

    const afcPacket: AFCPacket = {
      header: {
        magic: magicNum,
        entireLength: msgLen,
        thisLength: thisLen,
        packetNum,
        opCode,
        dataOffset: AFC_HEADER_SIZE,
      },
      headerPayload,
      content,
    };

    this.push(afcPacket);

  }

  readUInt64LE (buffer: Buffer, index: number): number {
    // Ignore the first 4 bytes since we don't do anything with longs
    return buffer.readUInt32LE(index);
  }
}