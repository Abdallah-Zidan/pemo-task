import { SetMetadata } from '@nestjs/common';
import { PROCESSOR_ADAPTER_METADATA } from '../constants';

export const ProcessorAdapter = (processorId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any) => {
    SetMetadata(PROCESSOR_ADAPTER_METADATA, processorId)(target);
  };
};
