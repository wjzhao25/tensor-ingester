import {ConfirmedSignatureInfo} from '@solana/web3.js';

export abstract class DataWriter{

  abstract writeToFile(
    filename: string,
    sigs: ConfirmedSignatureInfo[],
    sigWriteSize: number,
    append: boolean,
  ): boolean;

  abstract readNthLastSig(
    filename: string,
    n?: number,
  ): string | undefined ;
}

