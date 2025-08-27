import { Socket } from 'node:net';
import { AFCOpcode } from './enum.js';
import { type AFCHeader, AFC_HEADER_SIZE } from './struct.js';

export function listToDict(data: Buffer): Record<string, string> {
  const decoded = data.toString('utf-8');
  const parts = decoded.split('\x00');
  const filtered = parts.slice(0, -1); // Remove last empty element

  if (filtered.length % 2 !== 0) {
    throw new Error('Invalid data: odd number of elements');
  }

  const result: Record<string, string> = {};
  for (let i = 0; i < filtered.length / 2; i++) {
    const key = filtered[i * 2];
    const value = filtered[i * 2 + 1];
    result[key] = value;
  }

  return result;
}

export async function recvall(socket: Socket, size: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;

    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
      received += chunk.length;

      if (received >= size) {
        cleanup();
        const buffer = Buffer.concat(chunks, received);
        resolve(buffer.subarray(0, size));
      }
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('Connection aborted'));
    };

    const cleanup = () => {
      socket.removeListener('data', onData);
      socket.removeListener('error', onError);
      socket.removeListener('close', onClose);
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
}

export function parseHeader(buffer: Buffer): AFCHeader {
  let offset = 0;

  const magic = buffer.subarray(offset, offset + 8); // Keep as Buffer
  offset += 8;

  const entireLength = Number(buffer.readBigUInt64LE(offset));
  offset += 8;

  const thisLength = Number(buffer.readBigUInt64LE(offset));
  offset += 8;

  const packetNum = Number(buffer.readBigUInt64LE(offset));
  offset += 8;

  const opCode = Number(buffer.readBigUInt64LE(offset)) as AFCOpcode;

  return {
    magic,
    entireLength,
    thisLength,
    packetNum,
    opCode,
    dataOffset: AFC_HEADER_SIZE,
  };
}