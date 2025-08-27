export enum AFCOpcode {
  STATUS = 0x00000001,
  DATA = 0x00000002, // Data
  READ_DIR = 0x00000003, // ReadDir
  READ_FILE = 0x00000004, // ReadFile
  WRITE_FILE = 0x00000005, // WriteFile
  WRITE_PART = 0x00000006, // WritePart
  TRUNCATE = 0x00000007, // TruncateFile
  REMOVE_PATH = 0x00000008, // RemovePath
  MAKE_DIR = 0x00000009, // MakeDir
  GET_FILE_INFO = 0x0000000a, // GetFileInfo
  GET_DEVINFO = 0x0000000b, // GetDeviceInfo
  WRITE_FILE_ATOM = 0x0000000c, // WriteFileAtomic (tmp file+rename)
  FILE_OPEN = 0x0000000d, // FileRefOpen
  FILE_OPEN_RES = 0x0000000e, // FileRefOpenResult
  READ = 0x0000000f, // FileRefRead
  WRITE = 0x00000010, // FileRefWrite
  FILE_SEEK = 0x00000011, // FileRefSeek
  FILE_TELL = 0x00000012, // FileRefTell
  FILE_TELL_RES = 0x00000013, // FileRefTellResult
  FILE_CLOSE = 0x00000014, // FileRefClose
  FILE_SET_SIZE = 0x00000015, // FileRefSetFileSize (ftruncate)
  GET_CON_INFO = 0x00000016, // GetConnectionInfo
  SET_CON_OPTIONS = 0x00000017, // SetConnectionOptions
  RENAME_PATH = 0x00000018, // RenamePath
  SET_FS_BS = 0x00000019, // SetFSBlockSize (0x800000)
  SET_SOCKET_BS = 0x0000001a, // SetSocketBlockSize (0x800000)
  FILE_LOCK = 0x0000001b, // FileRefLock
  MAKE_LINK = 0x0000001c, // MakeLink
  SET_FILE_TIME = 0x0000001e, // set st_mtime
}

export enum AFCError {
  SUCCESS = 0,
  UNKNOWN_ERROR = 1,
  OP_HEADER_INVALID = 2,
  NO_RESOURCES = 3,
  READ_ERROR = 4,
  WRITE_ERROR = 5,
  UNKNOWN_PACKET_TYPE = 6,
  INVALID_ARG = 7,
  OBJECT_NOT_FOUND = 8,
  OBJECT_IS_DIR = 9,
  PERM_DENIED = 10,
  SERVICE_NOT_CONNECTED = 11,
  OP_TIMEOUT = 12,
  TOO_MUCH_DATA = 13,
  END_OF_DATA = 14,
  OP_NOT_SUPPORTED = 15,
  OBJECT_EXISTS = 16,
  OBJECT_BUSY = 17,
  NO_SPACE_LEFT = 18,
  OP_WOULD_BLOCK = 19,
  IO_ERROR = 20,
  OP_INTERRUPTED = 21,
  OP_IN_PROGRESS = 22,
  INTERNAL_ERROR = 23,
  MUX_ERROR = 30,
  NO_MEM = 31,
  NOT_ENOUGH_DATA = 32,
  DIR_NOT_EMPTY = 33,
}

export enum AFCLinkType {
  HARDLINK = 1,
  SYMLINK = 2,
}

export enum AFCFileOpenMode {
  RDONLY = 0x00000001, // r   O_RDONLY
  RW = 0x00000002, // r+  O_RDWR   | O_CREAT
  WRONLY = 0x00000003, // w   O_WRONLY | O_CREAT  | O_TRUNC
  WR = 0x00000004, // w+  O_RDWR   | O_CREAT  | O_TRUNC
  APPEND = 0x00000005, // a   O_WRONLY | O_APPEND | O_CREAT
  RDAPPEND = 0x00000006, // a+  O_RDWR   | O_APPEND | O_CREAT
}