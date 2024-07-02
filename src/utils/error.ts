const ERROR_MAP = {
  OperationalError: 'OperationalError',
  Unknown: 'Unknown',
  SystemError: 'SystemError',
  Timeout: {
    message: 'Timeout',
  },
  Required: {
    message: '必填项',
  },
  ParamsRequired: '缺少参数',
};

export type ERROR_CODES = keyof typeof ERROR_MAP;

export interface ErrorJSON {
  type: 'error';
  message: string;
  errorCode: ERROR_CODES;
  extra?: any;
  stack?: string;
  status?: number;
}

function json2str(obj: any) {
  if (!obj) {
    return '';
  }

  try {
    return JSON.stringify(obj);
  } catch (e) {
    return '';
  }
}

export class OperationalError extends Error {
  public cause: any;

  public constructor(
    public extra?: any,
    public message = 'OperationalError',
    public status = 400,
    public errorCode: ERROR_CODES = 'OperationalError',
  ) {
    super(message);

    if (extra instanceof Error) {
      this.cause = extra;
    }
  }

  public toJSON(): ErrorJSON {
    return {
      type: 'error',
      errorCode: this.errorCode,

      status: this.status,
      message: this.message,
      extra: this.extra,
      stack: this.stack,
    };
  }

  public toString(): string {
    return `${this.errorCode}
${this.extra ? json2str(this.extra) : ''}
${this.stack || ''}`;
  }
}

export type ERRORS = {
  [name in ERROR_CODES]: typeof OperationalError;
};

function buildErrors(): ERRORS {
  const keys = Object.keys(ERROR_MAP) as [ERROR_CODES];
  const o = keys.reduce((result, errorCode) => {
    const tmp = ERROR_MAP[errorCode];

    const defaultError: Partial<
      Pick<ErrorJSON, 'errorCode' | 'message' | 'extra' | 'status'>
    >
      = typeof tmp === 'string'
        ? {
            message: tmp,
          }
        : tmp;

    class ChildError extends OperationalError {
      public constructor(extra?: any, message?: string, status?: number) {
        super(
          ['object', 'undefined'].includes(typeof extra)
            ? {
                ...defaultError.extra,
                ...extra,
              }
            : extra,
          message ?? defaultError.message,
          status ?? defaultError.status,
          errorCode ?? defaultError.errorCode,
        );

        this.name = errorCode;
      }
    }

    result[errorCode] = ChildError;
    return result;
  }, {} as any);

  o.OperationalError = OperationalError;
  return o;
}

const Errors = buildErrors();

function isErrorLike(obj: any): obj is ErrorJSON {
  return !!(obj?.type === 'error' && obj?.errorCode);
}

function try2error<T>(obj: T, isReturnOrigin: true): OperationalError | T;
function try2error<T>(
  obj: T,
  isReturnOrigin?: false
): OperationalError | undefined;
function try2error<T>(
  obj: T,
  isReturnOrigin = false,
): OperationalError | T | undefined {
  if (isErrorLike(obj)) {
    const errorCode = obj.errorCode;
    if (Errors[errorCode]) {
      return new Errors[errorCode](obj.extra, obj.message);
    }

    return new Errors.Unknown(obj, obj.message);
  }

  if (isReturnOrigin) {
    return obj;
  }
}

function valueOrThrowError<T>(obj: T) {
  const data = try2error(obj, true);

  if (data instanceof OperationalError) {
    throw data;
  }

  return data;
}

export { Errors, json2str, try2error, valueOrThrowError };
