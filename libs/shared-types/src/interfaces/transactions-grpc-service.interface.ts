import { ITransactionDetails } from './transaction-details.interface';
import { Observable } from 'rxjs';

export interface ITransactionsGrpcService {
  processTransaction(data: ITransactionDetails): Observable<{ success: boolean }>;
}
