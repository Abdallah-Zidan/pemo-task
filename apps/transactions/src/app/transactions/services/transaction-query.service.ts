import { Injectable } from '@nestjs/common';
import { Transaction } from '../../models';
import { InjectModel } from '@nestjs/sequelize';
import {
  IGetTransactionsRequest,
  IGetTransactionResponse,
  TransactionType,
} from '@pemo-task/shared-types';

@Injectable()
export class TransactionQueryService {
  constructor(
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
  ) {}

  async getTransactions(query: IGetTransactionsRequest): Promise<IGetTransactionResponse> {
    const { cardId, processorId, status, page, limit } = query;

    const where: Record<string, string> = {};

    if (cardId) {
      where.cardId = cardId;
    }

    if (processorId) {
      where.processorId = processorId;
    }

    if (status) {
      where.status = status;
    }

    const transactions = await this.transactionModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
    });

    return {
      transactions: transactions.rows.map((transaction) => {
        const jsonData = transaction.toJSON();
        return {
          ...jsonData,
          type: transaction.type,
          billingAmount: this.getBillingAmount(transaction),
          billingCurrency: transaction.currency,
          clearingTransactionId: jsonData.clearingTransactionId || undefined,
          createdAt: transaction.createdAt.toISOString(),
          updatedAt: transaction.updatedAt.toISOString(),
        };
      }),
      total: transactions.count,
      page,
      limit,
    };
  }

  private getBillingAmount(transaction: Transaction) {
    return transaction.type === TransactionType.AUTHORIZATION
      ? transaction.authAmount
      : //! fallback to auth amount if clearing amount is not set
        transaction.clearingAmount ?? transaction.authAmount;
  }
}
