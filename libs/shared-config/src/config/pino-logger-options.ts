import { randomBytes, randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import * as URL from 'node:url';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Params as PinoParams } from 'nestjs-pino';
import { Options as PinoHttpOptions } from 'pino-http';

const MASK = '**********';
const REQ_ID_RANDOM_PREFIX_LENGTH = 5;

export function buildPinoOptions(config: ConfigService): PinoParams {
  const environment = config.getOrThrow<string>('NODE_ENV');
  const level = config.getOrThrow<string>('LOG_LEVEL', 'info');
  const logRequestBody = config.get('LOG_REQUEST_BODY') === 'true';

  // @see https://github.com/pinojs/pino-http#pinohttpopts-stream
  const pinoHttp: PinoHttpOptions = {
    level,
    safe: true,
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    quietReqLogger: true,
    transport: getTransport(environment),
    serializers: {
      req: getRequestSerializer(logRequestBody),
    },
    formatters: {
      level: formatLevel,
    },
    redact: getRedactOptions(),
    autoLogging: getAutoLoggingOptions(['/health', '/health/details', '/metrics']),
    customLogLevel,
    genReqId,
  };

  return { pinoHttp };
}

/**
 * In development environment, we use pino-pretty to format the logs.
 * In non-development environment, we should use the default pino format (JSON) to help monitoring tools parse the logs.
 */
function getTransport(environment: string): PinoHttpOptions['transport'] {
  if (environment === 'development') {
    return {
      target: 'pino-pretty',
      options: { singleLine: true },
    };
  }

  return undefined;
}

/**
 * Customize the request log serializer to
 * - Include the request body if needed (e.g. for debugging purposes)
 */
function getRequestSerializer(logRequestBody: boolean) {
  return (req: { body: unknown; raw?: { body: unknown } }) => {
    if (logRequestBody) {
      req.body = req.raw?.body;
    }
    return req;
  };
}

function getRedactOptions(): PinoHttpOptions['redact'] {
  const sensitiveFieldPaths = ['req.headers["x-api-key"]', 'req.headers.authorization'];

  return {
    paths: sensitiveFieldPaths,
    censor() {
      return MASK;
    },
  };
}

/**
 ** Exclude specific endpoints from auto logging the request summary, useful to reduce the health endpoints call logs.
 * Meanwhile keep logging exception with request details if any.
 */
function getAutoLoggingOptions(ignoredPaths: string[]): PinoHttpOptions['autoLogging'] {
  return {
    ignore: (req: IncomingMessage) => {
      const endpointUrl = req.url ? URL.parse(req.url).pathname : '';
      return ignoredPaths.some((path) => endpointUrl?.toLowerCase() === path.toLowerCase());
    },
  };
}

/**
 ** Note: Format the log level to use its label instead of it's numeric value
 */
function formatLevel(label: string) {
  return { level: label.toLocaleUpperCase() };
}

const customLogLevel: PinoHttpOptions['customLogLevel'] = (
  _req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  error?: Error,
) => {
  if (
    res.statusCode >= HttpStatus.BAD_REQUEST &&
    res.statusCode < HttpStatus.INTERNAL_SERVER_ERROR
  ) {
    return 'warn';
  }
  if (res.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR || error) {
    return 'error';
  }
  if (res.statusCode >= HttpStatus.AMBIGUOUS && res.statusCode < HttpStatus.BAD_REQUEST) {
    return 'silent';
  }
  return 'info';
};

const genReqId: PinoHttpOptions['genReqId'] = (req: IncomingMessage, res: ServerResponse) => {
  const id =
    req.id?.toString() ||
    req.headers['x-request-id'] ||
    req.headers['X-Request-Id'] ||
    randomUUID();
  const prefix = randomBytes(REQ_ID_RANDOM_PREFIX_LENGTH).toString('hex'); //* to ensure deduplication

  const reqId = `${prefix}-${id}`;
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-Id', reqId);

  return reqId;
};
