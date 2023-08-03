import {readFileSync,appendFileSync,existsSync} from "fs"
import {ConfirmedSignatureInfo} from '@solana/web3.js'
import {DataWriter} from './data-writer'

export class CsvWriter extends DataWriter{

  writeToFile(
    filename: string,
    sigs: ConfirmedSignatureInfo[],
    sigWriteSize: number,
    append: boolean,
  ) {
    console.log(`Writing ${sigs.length} sigs.`)
    while(sigs.length > 0) {
        if(append) {
          appendFileSync(filename, '\r\n')
        }
        appendFileSync(filename, sigs.slice(0, sigWriteSize).map(s => `${s.blockTime}:${s.signature}`).join('\r\n'))
        sigs = sigs.slice(sigWriteSize)
        append = true
    }
    return append
  }
    
  readNthLastSig(
    filename: string,
    n?: number,
  ): string | undefined {
    //check if file exists
    if (!existsSync(filename)) {
      console.log(`Job file ${filename} does not exist.`)
      process.exit(0)
    }
    const entries = readFileSync(filename, 'utf-8')
    const entrieList = entries.split('\r\n')
    if(entrieList.length === 0) {
      return undefined
    }
  
    //set offset to 1 if n is not provided
    let offset = 1
    if(n !== undefined) {
      offset = n
    }
    
    const lastEntry = entrieList[entrieList.length - offset]
    const lastSig = lastEntry.split(':')[1]
    return lastSig
  }
}

