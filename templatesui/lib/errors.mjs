/**
 * defines all errors used in pubsub
 *
 * @author: blukassen
 */

class EError extends Error {

    constructor(message, code, cause, ...data) {
        super(message);
        this.code       = code;
        this._cause     = cause;
        this._data      = data;
    }

    /**
     * resolve error cause to the first one
     * @returns {Error}
     */
    get cause() {
        return (this._cause)
            ? this._cause.cause || this._cause
            : this;
    }

    get message() {
        return `${this._code()}${this._message()}${this._causeMessage()}`;
    }

    trace() {
        let tr = '';
        if (this._cause) {
            tr += this._cause.trace ? this._cause.trace : this._cause.stack ? this._cause.stack : this._cause.message.stack ? this._cause.message.stack : '';
        }

        if (this.stack) {
            if (!!tr) tr += '\n***********\n';
            tr += this.stack;
        }

        return tr;
    }

    _code() {
        return `${this.code}: ` || '';
    }

    _message() {
        return super.message || '';
    }

    _causeMessage() {
        return this._cause ? `\ncaused by: ${this._cause.message}` : '';
    }

    get data() {
        return this._data;
    }
}

export const ErrNotImplemented            = (msg)             => new EError(`Not implemented: ${msg}`,                        "NEULAND:00001");
