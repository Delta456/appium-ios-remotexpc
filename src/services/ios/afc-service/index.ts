import { Socket } from 'node:net';
import { logger } from '@appium/support';
import { ServiceConnection } from '../../../service-connection.js';
import { BaseService } from '../base-service.js';
import { AFCError, AFCOpcode } from './enum.js';
import { AFCException, AFCFileNotFoundError } from './errors.js';
import { type AFCStat, AFC_HEADER_SIZE, AFC_MAGIC } from './struct.js';
import { listToDict } from './util.js';

const log = logger.getLogger('AFCService');

export class AFCService extends BaseService {
  static readonly RSD_SERVICE_NAME = 'com.apple.afc.shim.remote';
  private packet_number: number;
  private _conn: ServiceConnection | null = null;

  constructor(address: [string, number]) {
    super(address);
    this.packet_number = 0;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  async exists(filename: string): Promise<boolean> {
    try {
      await this.stat(filename);
      return true;
    } catch (error) {
      if (error instanceof AFCFileNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  async stat(filename: string): Promise<AFCStat> {
    try {
      // Build AFC packet for GET_FILE_INFO operation
      const filenameBuffer = Buffer.from(filename + '\0', 'utf-8');
      const dataLength = filenameBuffer.length;
      const totalLength = AFC_HEADER_SIZE + dataLength;

      // Create AFC packet buffer
      const packet = Buffer.alloc(totalLength);
      let offset = 0;

      // Write AFC header with LITTLE ENDIAN encoding (not big endian)
      AFC_MAGIC.copy(packet, offset);
      offset += 8;

      // Write header fields as 64-bit LITTLE-endian values (LE not BE)
      packet.writeUInt32LE(totalLength, offset);
      packet.writeUInt32LE(0, offset + 4); // High 32 bits = 0
      offset += 8;
      packet.writeUInt32LE(totalLength, offset);
      packet.writeUInt32LE(0, offset + 4); // High 32 bits = 0
      offset += 8;
      packet.writeUInt32LE(this.packet_number, offset);
      packet.writeUInt32LE(0, offset + 4); // High 32 bits = 0
      offset += 8;
      packet.writeUInt32LE(AFCOpcode.GET_FILE_INFO, offset);
      packet.writeUInt32LE(0, offset + 4); // High 32 bits = 0
      offset += 8;

      // Copy filename data
      filenameBuffer.copy(packet, offset);
      this.packet_number += 1;

      // Send the packet and get response using ServiceConnection
      await this._ensureConnection();

      // Instead of using raw socket operations, use the ServiceConnection's send method
      const socket = this._conn!.getSocket();

      // Write packet directly to socket
      await new Promise<void>((resolve, reject) => {
        socket.write(packet, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Read response using a simpler approach
      const responseData = await this._readAFCResponse(socket);
      const statDict = listToDict(responseData);

      return {
        ...statDict,
        st_size: parseInt(statDict.st_size, 10),
        st_blocks: parseInt(statDict.st_blocks, 10),
        st_nlink: parseInt(statDict.st_nlink, 10),
        st_mtime: new Date(parseInt(statDict.st_mtime, 10) / 1_000_000_000 * 1000),
        st_birthtime: new Date(parseInt(statDict.st_birthtime, 10) / 1_000_000_000 * 1000),
      };
    } catch (error) {
      if (error instanceof AFCException) {
        if (error.status === AFCError.read_error) {
          throw new AFCFileNotFoundError(error.message, error.status);
        }
        throw error;
      }
      throw error;
    }
  }

  private async _readAFCResponse(socket: Socket): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      let headerReceived = false;
      let expectedLength = 0;
      let receivedData = Buffer.alloc(0);

      const onData = (chunk: Buffer) => {
        receivedData = Buffer.concat([receivedData, chunk]);

        if (!headerReceived && receivedData.length >= AFC_HEADER_SIZE) {
          // Parse header using LITTLE ENDIAN to match what we're sending
          const magic = receivedData.slice(0, 8);
          if (!magic.equals(AFC_MAGIC)) {
            cleanup();
            reject(new Error('Invalid AFC response magic'));
            return;
          }

          // Read as little-endian 64-bit values (matching our send format)
          const entireLength = receivedData.readUInt32LE(8); // Read low 32 bits
          const opCode = receivedData.readUInt32LE(32); // Read low 32 bits

          if (opCode === AFCError.OP_HEADER_INVALID) {
            cleanup();
            reject(new AFCException(`Received OP_HEADER_INVALID (${AFCError.OP_HEADER_INVALID})`, opCode));
            return;
          }

          expectedLength = entireLength;
          headerReceived = true;
        }

        if (headerReceived && receivedData.length >= expectedLength) {
          cleanup();
          // Extract payload (skip 40-byte header)
          const payload = receivedData.slice(AFC_HEADER_SIZE, expectedLength);

          // Check if this is a status response using little-endian
          const opCode = receivedData.readUInt32LE(32); // Read low 32 bits
          if (opCode === AFCOpcode.STATUS) {
            if (payload.length !== 8) {
              reject(new Error('Invalid status response length'));
              return;
            }
            const status = payload.readUInt32LE(0);
            if (status !== AFCError.SUCCESS) {
              reject(new AFCException(`AFC operation failed with status: ${status}`, status));
              return;
            }
            resolve(Buffer.alloc(0)); // Empty response for status
          } else if (opCode === AFCOpcode.DATA) {
            resolve(payload);
          } else {
            reject(new Error(`Unexpected response opcode: ${opCode}`));
          }
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const onClose = () => {
        cleanup();
        reject(new Error('Connection closed while reading response'));
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

  private async _ensureConnection(): Promise<void> {
    if (!this._conn) {
      const service = this.getServiceConfig();
      this._conn = await this.startLockdownService(service);
      this.packet_number = 0;
    }
  }

  private getServiceConfig(): {
    serviceName: string;
    port: string;
  } {
    return {
      serviceName: AFCService.RSD_SERVICE_NAME,
      port: this.address[1].toString(),
    };
  }
}