import { RequestHeaders } from '@pemo-task/shared-types';

export function extractSingleHeader(
  headers: RequestHeaders,
  headerName: string,
): string | undefined {
  const headerValue = headers[headerName];

  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
}
