import { Socket } from 'node:net';
import { ServiceConnection } from '../../../service-connection.js';
import { BaseService } from '../base-service.js';
import { AFCError, AFCOpcode } from './enum.js';
import { AFCException, AFCFileNotFoundError } from './errors.js';
import { type AFCHeader, type AFCPacket, type AFCStat, AFC_HEADER_SIZE, AFC_MAGIC } from './struct.js';
import { Encoder } from './transformer/encoder.js';
import { listToDict, parseHeader, recvall } from './util.js';

export class AFCService extends BaseService {
  static readonly RSD_SERVICE_NAME = 'com.apple.afc.shim.remote';
  private packet_number: number;
  private _conn: ServiceConnection | null = null;
  private _socket: Socket | null = null;
  private _encoder: Encoder;

  constructor(address: [string, number]) {
    super(address);
    this.packet_number = 0;
    this._socket = null; // Initialize as null
    this._encoder = new Encoder();
  }

  private async ensureConnection(): Promise<void> {
    if (!this._socket || this._socket.destroyed) {
      const connection = await this.connectToAFCService();
      this._socket = connection.getSocket();
      this.setupPipeline();
    }
  }

  private setupPipeline(): void {
    if (this._socket) {
      // Outgoing: encoder → socket
      this._encoder.pipe(this._socket);
    }
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
      throw error; // Re-throw other errors
    }
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  async stat(filename: string): Promise<AFCStat> {
    const filenameBuffer = Buffer.from(filename + '\0', 'utf-8');
    const responseData = await this._doOperation(AFCOpcode.GET_FILE_INFO, filenameBuffer);
    const statDict = listToDict(responseData);

    return {
      ...statDict,
      st_size: parseInt(statDict.st_size, 10),
      st_blocks: parseInt(statDict.st_blocks, 10),
      st_nlink: parseInt(statDict.st_nlink, 10),
      st_mtime: new Date(parseInt(statDict.st_mtime, 10) / 1_000_000_000 * 1000),
      st_birthtime: new Date(parseInt(statDict.st_birthtime, 10) / 1_000_000_000 * 1000),
    };
  }

  private async _dispatchPacket(
    operation: AFCOpcode,
    data: Buffer,
    thisLength?: number,
  ): Promise<void> {
    await this.ensureConnection(); // Add this

    const dataLength = data.length;
    const totalLength = AFC_HEADER_SIZE + dataLength;

    const afcHeader: AFCHeader = {
      magic: AFC_MAGIC,
      entireLength: totalLength,
      thisLength: thisLength ?? totalLength,
      packetNum: this.packet_number,
      opCode: operation,
      dataOffset: AFC_HEADER_SIZE,
    };

    const afcPacket: AFCPacket = {
      header: afcHeader,
      headerPayload: Buffer.alloc(0),
      content: data,
    };

    this.packet_number += 1;

    return new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onDrain = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        this._encoder.removeListener('error', onError);
        this._encoder.removeListener('drain', onDrain);
      };

      this._encoder.once('error', onError);

      const success = this._encoder.write(afcPacket);
      if (success) {
        cleanup();
        resolve();
      } else {
        this._encoder.once('drain', onDrain);
      }
    });
  }

  private async _receiveData(): Promise<{ status: number; data: Buffer }> {
    if (!this._socket) {
      throw new Error('Socket is not connected');
    }

    // First, read the AFC header
    const headerBuffer = await recvall(this._socket, AFC_HEADER_SIZE);

    let status = AFCError.SUCCESS;
    let data: Buffer<ArrayBufferLike> = Buffer.alloc(0);

    if (headerBuffer.length > 0) {
      const header = parseHeader(headerBuffer);

      // Validate header
      if (header.entireLength < AFC_HEADER_SIZE) {
        throw new Error(`Invalid AFC packet: entireLength ${header.entireLength} < ${AFC_HEADER_SIZE}`);
      }

      // Calculate payload length
      const payloadLength = header.entireLength - AFC_HEADER_SIZE;

      if (payloadLength > 0) {
        data = await recvall(this._socket, payloadLength);
      }

      // Handle status responses
      if (header.opCode === AFCOpcode.STATUS) {
        if (payloadLength !== 8) {
          throw new Error('Status length != 8');
        }
        // Read status as 64-bit value (but use only lower 32 bits)
        status = data.readUInt32LE(0);
      } else if (header.opCode !== AFCOpcode.DATA) {
        // Handle other operation codes if needed
      }
    }

    return { status, data };
  }

  private async _doOperation(opcode: AFCOpcode, data: Buffer = Buffer.alloc(0)): Promise<Buffer> {
    await this._dispatchPacket(opcode, data);
    const { status, data: responseData } = await this._receiveData();

    if (status !== AFCError.SUCCESS) {
      const message = `opcode ${opcode} failed with status: ${status}`;

      if (status === AFCError.OBJECT_NOT_FOUND) {
        throw new AFCFileNotFoundError(message, status);
      }
      throw new AFCException(message, status);
    }

    return responseData;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  async connectToAFCService(): Promise<ServiceConnection> {
    if (this._conn) {
      return this._conn;
    }
    const service = this.getServiceConfig();
    this._conn = await this.startLockdownService(service);
    return this._conn;
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