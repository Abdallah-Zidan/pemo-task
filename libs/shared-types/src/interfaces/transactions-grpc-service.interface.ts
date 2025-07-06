import { ITransactionDetails } from './transaction-details.interface';
import { Observable } from 'rxjs';

export interface ITransactionsGrpcService {
  ProcessTransaction(data: ITransactionDetails): Observable<{ success: boolean }>;
}
