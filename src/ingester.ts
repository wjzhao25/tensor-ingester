
import {Connection, PublicKey, ConfirmedSignatureInfo, SignaturesForAddressOptions} from '@solana/web3.js';
import {DataWriter} from './data-writer'

export enum Mode {
    History = "History",
    Standard = "Standard",
  }

function checkSigsInOrdered(sigs: ConfirmedSignatureInfo[]): boolean {
    for (let i = 1; i < sigs.length; i++) {
      const prevItem = sigs[i - 1]
      const currentItem = sigs[i]
      const comparisonResult = prevItem.blockTime! - currentItem.blockTime!
  
      if (comparisonResult < 0) {
        return false
      }
    }
    return true
  }
  
  function reorder(sigs: ConfirmedSignatureInfo[]): ConfirmedSignatureInfo[] {
    //check if last blocktime is outlier
    
    //filter out sigs with blockTime > lastBlockTime
    console.log(`Removing outliers.`)
    const lastBlockTime = sigs[0].blockTime!;
    sigs = sigs.filter(s => s.blockTime! <= lastBlockTime)
    //sort sigs in descending order based on blockTime, slot, and signature
    sigs = sigs.sort((a, b) => {
      if (a.blockTime === b.blockTime) {
        if (a.slot === b.slot) {
          return a.signature! > b.signature! ? -1 : 1
        }
        return a.slot! > b.slot! ? -1 : 1
      }
      return a.blockTime! > b.blockTime! ? -1 : 1
    })
    console.log(`Remaining sigs without outliers. ${sigs.length}`)
    return sigs
  }
  
  
  function cleanSigs(sigs: ConfirmedSignatureInfo[]): ConfirmedSignatureInfo[] {
    //remove duplicates based on signature and blockTime
    console.log(`Cleaning ${sigs.length} sigs.`)
    const uniqueSigs = sigs.filter((s, index, self) => index === self.findIndex((t) => (t.signature === s.signature && t.blockTime === s.blockTime)))
    console.log(`Unique ${uniqueSigs.length} sigs.`)
    //check if sigs are in order
    if(checkSigsInOrdered(uniqueSigs)){
      console.log('Sigs are in order.')
      return uniqueSigs;
    }
  
    //remove outliers
    return reorder(uniqueSigs);
  }
  
  export async function historyIngester(
    connection: Connection,
    marketplaceAddress: PublicKey, 
    writer: DataWriter,
    fromSignature: string,
    toTimestamp: number,
    sigReadSize: number,
    sigWriteSize: number,
    filename: string,
    newJob: boolean,
    allowedRetries: number,
   ) {
    if(!newJob) {
      //read last line of file to get last signature
      const lastSigFromFile = writer.readNthLastSig(filename)
      if(lastSigFromFile !== null && lastSigFromFile !== undefined) {
        fromSignature = lastSigFromFile
      }else{
        newJob = true;
      }
    }
    //set args.to to 0 if not provided
    if(toTimestamp === undefined) {
      toTimestamp = 0;
    }
    await backfillSigIngester(
      connection, 
      marketplaceAddress, 
      writer,
      fromSignature!, 
      toTimestamp, 
      sigReadSize, 
      sigWriteSize, 
      filename, 
      !newJob, 
      allowedRetries)
   }

  async function backfillSigIngester(
      connection: Connection,
      marketplaceAddress: PublicKey, 
      writer: DataWriter,
      fromSignature: string,
      toTimestamp: number,
      sigReadSize: number,
      sigWriteSize: number,
      filename: string,
      append: boolean,
      allowedRetries: number,
     ) {
    
      //retry counter
      let retry = allowedRetries
  
      let currentSignature = fromSignature
      //create while loop to fetch until toTimestamp is reached
      let reachedEnd = false
      while(!reachedEnd) {
  
        //fetch sigs using write size as limit since not in real time
        let sigs = await connection.getSignaturesForAddress(marketplaceAddress, {before: currentSignature, limit: sigReadSize}) 
        console.log(`Fetched ${sigs.length} sigs.`)
        
        //check if sigs is empty
        if(sigs.length === 0) {
          //retry fetch
          if(retry > 0) {
            console.log('Fetched 0 sigs. Retrying...')
            retry--
            continue
          }
          console.log('Reached the end of the sigs.')
          reachedEnd = true
          continue
        }else{
          retry = allowedRetries
        }
  
        //check if toTimestamp is reached
        const blockTime = sigs[sigs.length - 1].blockTime!
        if(blockTime < toTimestamp) {
          console.log(`Reached ${toTimestamp}.`)
          //filter sigs to only include sigs before toTimestamp
          sigs = sigs.filter(s => s.blockTime! >= toTimestamp)
          reachedEnd = true
          if(sigs.length === 0) {
            continue
          }
        }
  
        sigs = cleanSigs(sigs)
        //update currentSignature
        currentSignature = sigs[sigs.length - 1].signature!
  
        append = writer.writeToFile(filename, sigs, sigWriteSize, append) 
      }
      console.log(`Finished backfilling.`)
  }
  
  async function getTheGap(
    connection: Connection,
    marketplaceAddress: PublicKey,
    writer: DataWriter, 
    sigReadSize: number,
    sigWriteSize: number,
    filename: string,
    append: boolean,
    allowedRetries: number,
    fromSignature: string,
    toSignature: string,
  ){
    console.log(`Getting the gap between ${fromSignature} and ${toSignature}`)
    let currentSignature = fromSignature
    //retry counter
    let retry = allowedRetries
    //create while loop to fetch until toSignature is reached
    let signatureFound = false
    while(!signatureFound){
      //fetch sigs using write size as limit since not in real time
      let sigs = await connection.getSignaturesForAddress(marketplaceAddress, {before: currentSignature, limit: sigReadSize}) 
      console.log(`Fetched ${sigs.length} sigs.`)
      
      //check if sigs is empty
      if(sigs.length === 0) {
        //retry fetch
        if(retry > 0) {
          console.log('Fetched 0 sigs. Retrying...')
          retry--
          continue
        }
        console.error(`Reached the end of the sigs without encoutering ${toSignature}`)
        break
      }else{
        retry = allowedRetries
      }
  
      //check if sigs contain toSignature 
      const toSigIndex = sigs.findIndex(s => s.signature === toSignature)
      if(toSigIndex !== -1) {
        console.log(`Found ${toSignature} closing gap.`)
        //add all sigs with greater blocktime than toSignature to gapSigs
        sigs = sigs.filter(s => s.blockTime! > sigs[toSigIndex].blockTime!)
        signatureFound = true
      }
      sigs = cleanSigs(sigs)
      sigs = sigs.reverse()
      append = writer.writeToFile(filename, sigs, sigWriteSize, append)
      //update currentSignature
      currentSignature = sigs[sigs.length - 1].signature!
    }
  
    
    return append
  }
  
  export async function standardIngester(
    connection: Connection,
    marketplaceAddress: PublicKey, 
    writer: DataWriter, 
    sigReadSize: number,
    sigWriteSize: number,
    filename: string,
    newJob: boolean,
    allowedRetries: number,
    stopOnEmpty: boolean = false,
   ){
    let lastSig : string | undefined
    let secondLastSig : string | undefined
    if(!newJob) {
      lastSig = writer.readNthLastSig(filename)
      secondLastSig = writer.readNthLastSig(filename, 2)
      if(lastSig === undefined && secondLastSig === undefined) {
        newJob = true;
      }
    }
    await realTimeSigIngester(
      connection, 
      marketplaceAddress, 
      writer,
      sigReadSize, 
      sigWriteSize, 
      filename, 
      !newJob, 
      allowedRetries, 
      secondLastSig, 
      lastSig,
      stopOnEmpty)
   }

  async function realTimeSigIngester(
    connection: Connection,
    marketplaceAddress: PublicKey, 
    writer: DataWriter,
    sigReadSize: number,
    sigWriteSize: number,
    filename: string,
    append: boolean,
    allowedRetries: number,
    fromSignature?: string,
    cursorSignature?: string,
    stopOnEmpty: boolean = false,
   ) {
  
    let currentSignature = fromSignature;
  
    //create while loop to fetch until toTimestamp is reached
    while(true) {
      console.log(`Current signature ${currentSignature}`)
      console.log(`With cursor ${cursorSignature}`)
      //fetch sigs using write size as limit since not in real time
      const options : SignaturesForAddressOptions = { limit: sigReadSize }
      if(currentSignature !== undefined){
        options.until = currentSignature;
      }
      let sigs = await connection.getSignaturesForAddress(marketplaceAddress, options)
      console.log(`Fetched ${sigs.length} sigs.`)
      
      //check if sigs is empty
      if(sigs.length === 0) {
        if(stopOnEmpty){
          break
        }
        continue
      }
      sigs = cleanSigs(sigs)
      sigs = sigs.reverse()
  
      //check if cursorSignature is contained in the sigs
      if(cursorSignature !== undefined) {
        const cursorSigIndex = sigs.findIndex(s => s.signature === cursorSignature)
        if(cursorSigIndex !== -1) {
          //filter sigs to only include sigs after cursorSignature blocktime
          sigs = sigs.filter(s => s.blockTime! >= sigs[cursorSigIndex].blockTime! && s.signature! != sigs[cursorSigIndex].signature!)
        }else{ //if cursorSignature is not contained in sigs, get the gap between cursorSignature and lastSig
          //get last sig in sigs
          const lastSig = sigs[sigs.length - 1].signature!
          //get the gap between cursorSignature and lastSig
          append = await getTheGap(connection, marketplaceAddress, writer, sigReadSize, sigWriteSize, filename, append, allowedRetries, lastSig, cursorSignature)
        }
      }

      append = writer.writeToFile(filename, sigs, sigWriteSize, append)
      if(sigs.length > 1) {
        currentSignature = sigs[sigs.length - 2].signature!
      }
      if(sigs.length > 0) {
        cursorSignature = sigs[sigs.length - 1].signature!;
      }
    }
  }
  