import {
  IGetTransactionsRequest,
  ITransactionDetails,
  IGetTransactionResponse,
} from './transaction-details.interface';
import { Observable } from 'rxjs';

export interface ITransactionsGrpcService {
  ProcessTransaction(data: ITransactionDetails): Observable<{ success: boolean }>;
  GetTransactions(query: IGetTransactionsRequest): Observable<IGetTransactionResponse>;
}
