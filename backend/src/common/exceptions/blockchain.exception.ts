import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code.enum';

export class BlockchainException extends AppException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_GATEWAY,
    details?: Record<string, unknown>,
  ) {
    super(errorCode, message, statusCode, details);
  }

  static rpcError(reason: string): BlockchainException {
    return new BlockchainException(
      ErrorCode.BLOCKCHAIN_RPC_ERROR,
      `Stellar RPC request failed: ${reason}`,
      HttpStatus.BAD_GATEWAY,
    );
  }

  static transactionFailed(transactionHash: string, reason: string): BlockchainException {
    return new BlockchainException(
      ErrorCode.BLOCKCHAIN_TRANSACTION_FAILED,
      `Transaction ${transactionHash} failed: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { transactionHash },
    );
  }

  static contractError(contractId: string, reason: string): BlockchainException {
    return new BlockchainException(
      ErrorCode.BLOCKCHAIN_CONTRACT_ERROR,
      `Contract ${contractId} invocation failed: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { contractId },
    );
  }
}
