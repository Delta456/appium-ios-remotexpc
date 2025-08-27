export class AFCException extends Error {
    constructor(message: string, public status: number) {
        super(message);
        this.name = 'AFCException';
    }
}

export class AFCFileNotFoundError extends AFCException {
    constructor(message: string, status: number) {
        super(message, status);
        this.name = 'AFCFileNotFoundError';
    }
}
