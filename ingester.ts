import {Connection, PublicKey, ConfirmedSignatureInfo, SignaturesForAddressOptions} from '@solana/web3.js';
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import * as fs from "fs";
import { v4 as uuidv4 } from 'uuid';

require('dotenv').config();

export enum Mode {
  History = "History",
  Standard = "Standard",
}

function checkSigsInOrdered(sigs: ConfirmedSignatureInfo[], mode: Mode): boolean {
  for (let i = 1; i < sigs.length; i++) {
    const prevItem = sigs[i - 1]
    const currentItem = sigs[i]
    const comparisonResult = prevItem.blockTime! - currentItem.blockTime!

    if ((comparisonResult < 0 && mode === Mode.History) || (comparisonResult > 0 && mode === Mode.Standard)) {
      return false
    }
  }
  return true
}

function removeOutliers(sigs: ConfirmedSignatureInfo[], mode: Mode): ConfirmedSignatureInfo[] {
  //check if last blocktime is outlier
  const lastBlockTime = sigs[sigs.length - 1].blockTime!;
  //filter out sigs with blockTime > lastBlockTime
  console.log(`Removing outliers.`)
  if(mode === Mode.Standard) {
    sigs = sigs.filter(s => s.blockTime! >= lastBlockTime);
  } else if (mode === Mode.History) {
    sigs = sigs.filter(s => s.blockTime! <= lastBlockTime);
  }
  console.log(`Remaining sigs without outliers. ${sigs.length}`)
  return sigs
}


function cleanSigs(sigs: ConfirmedSignatureInfo[], mode: Mode): ConfirmedSignatureInfo[] {
  //remove duplicates based on signature and blockTime
  console.log(`Cleaning ${sigs.length} sigs.`)
  const uniqueSigs = sigs.filter((s, index, self) => index === self.findIndex((t) => (t.signature === s.signature)))
  console.log(`Unique ${sigs.length} sigs.`)
  //check if sigs are in order
  if(checkSigsInOrdered(sigs, mode)){
    console.log('Sigs are in order.')
    return sigs;
  }

  //remove outliers
  return removeOutliers(sigs, mode);
}

function writeToFile(
  filename: string,
  sigs: ConfirmedSignatureInfo[],
  sigWriteSize: number,
  append: boolean,
  ) {
  console.log(`Writing ${sigs.length} sigs.`)
  while(sigs.length > 0) {
    if(append) {
      fs.appendFileSync(filename, '\r\n')
    }
    fs.appendFileSync(filename, sigs.slice(0, sigWriteSize).map(s => `${s.blockTime}:${s.signature}`).join('\r\n'))
    sigs = sigs.slice(sigWriteSize)
    append = true
  }
  return append
}

function readNthLastSig(
  filename: string,
  n?: number,
): string | undefined {
  const entries = fs.readFileSync(filename, 'utf-8')
  const entrieList = entries.split('\r\n');
  if(entrieList.length === 0) {
    return undefined;
  }

  //set offset to 1 if n is not provided
  let offset = 1;
  if(n !== undefined) {
    offset = n;
  }
  
  const lastEntry = entrieList[entrieList.length - offset];
  const lastSig = lastEntry.split(':')[1];
  return lastSig;
}


async function backfillSigIngester(
    connection: Connection,
    marketplaceAddress: PublicKey, 
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
      }

      //update currentSignature
      currentSignature = sigs[sigs.length - 1].signature!

      append = writeToFile(filename, cleanSigs(sigs, Mode.History), sigWriteSize, append) 
    }
}

async function getTheGap(
  connection: Connection,
  marketplaceAddress: PublicKey, 
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
  //init gap array for sigs
  let gapSigs: ConfirmedSignatureInfo[] = []
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
      retry = allowedRetries;
    }

    //check if sigs contain toSignature 
    const toSigIndex = sigs.findIndex(s => s.signature === toSignature)
    if(toSigIndex !== -1) {
      console.log(`Found ${toSignature}`)
      //add all sigs with greater blocktime than toSignature to gapSigs
      sigs = sigs.filter(s => s.blockTime! > sigs[toSigIndex].blockTime!)
      signatureFound = true;
    }
    gapSigs.push(...sigs)
    //update currentSignature
    currentSignature = sigs[sigs.length - 1].signature!
  }

  gapSigs = gapSigs.reverse();
  return writeToFile(filename, cleanSigs(gapSigs, Mode.Standard), sigWriteSize, append)
}

async function realTimeSigIngester(
  connection: Connection,
  marketplaceAddress: PublicKey, 
  sigReadSize: number,
  sigWriteSize: number,
  filename: string,
  append: boolean,
  allowedRetries: number,
  fromSignature?: string,
  cursorSignature?: string,
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
      continue
    }
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
        append = await getTheGap(connection, marketplaceAddress, sigReadSize, sigWriteSize, filename, append, allowedRetries, lastSig, cursorSignature)
        //Since lastSig is excluded from the gap, we need the cursor before lastSig to include it in the next fetch
        if(sigs.length > 2) {
          currentSignature = sigs[sigs.length - 3].signature!
        }
        if(sigs.length > 1) {
          cursorSignature = sigs[sigs.length - 2].signature!
        }
        continue
      }
    }
    sigs = cleanSigs(sigs, Mode.Standard)
    append = writeToFile(filename, sigs, sigWriteSize, append)
    if(sigs.length > 1) {
      currentSignature = sigs[sigs.length - 2].signature!
    }
    if(sigs.length > 0) {
      cursorSignature = sigs[sigs.length - 1].signature!;
    }
  }
}

(async () => {
  const args = await yargs(hideBin(process.argv))
    .command("ingester", "ingests Solana onchain sigantures from a given marketplace address")
    .option("mode", {
      alias: "m",
      describe: "mode: History or Standard",
      type: "string",
      default: Mode.Standard,
      choices: Object.values(Mode),
    })
    .option("from", {
      alias: "f",
      describe: "the signature to start backwards from in history mode",
      type: "string",
    })
    .option("to", {
      alias: "t",
      describe: "the point in time to stop fetching signatures in history mode (inclusive)",
      type: "number",
    })
    .option("marketplace", {
      alias: "mp",
      describe: "marketplace to fetch sigs for",
      type: "string",
      default: "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN"
    })
    .option("sigFetchSize", {
      alias: "sf",
      describe: "# of sigs to fetch at a time (max 1000)",
      type: "number",
      default: 1000,
    })
    .option("sigWriteSize", {
      alias: "sw",
      describe: "# of sigs to write at a time (max 50)",
      type: "number",
      default: 50,
    })
    .option("jobId", {
      alias: "id",
      describe: "The UUID for a previously ran job. If provided, will resume from where it left off.",
      type: "string",
    })
    .option("retries", {
      alias: "r",
      describe: "Number of times to retry fetching sigs before giving up.",
      type: "number",
      default: 3,
    })
    .strict().argv;

  console.log('Ingester reporting to duty 🫡')

  const rpc = process.env.RPC_PROVIDER;
  if (!rpc) {
    console.log('Ooof missing RPC. Did you add one to .env?')
    return
  };

  const connection = new Connection(rpc);
  const marketplaceAddress = new PublicKey(args.marketplace);

  //boolean to check if new job
  let newJob = false;
  //if jobId is empty create a new UUID
  if(args.jobId === undefined) {
    args.jobId = uuidv4();
    console.log(`Starting a new job with id ${args.jobId}.`)
    newJob = true;
  }else{
    console.log(`Resuming job with id ${args.jobId}.`)
  }
  //create a filename in forma of <jobId>.txt
  const filename = `${args.jobId}.txt`;

  //if mode is history, call backfillSigIngester from lastSig to toTimestamp
  if(args.mode === Mode.History) {
    let lastSig = args.from;
    if(!newJob) {
      //read last line of file to get last signature
      const lastSigFromFile = readNthLastSig(filename);
      if(lastSigFromFile !== null) {
        lastSig = lastSigFromFile;
      }else{
        newJob = true;
      }
    }
    //set args.to to 0 if not provided
    if(args.to === undefined) {
      args.to = 0;
    }
    await backfillSigIngester(connection, marketplaceAddress, lastSig!, args.to, args.sigFetchSize, args.sigWriteSize, filename, !newJob, args.retries)
  }else if(args.mode === Mode.Standard){
    let lastSig
    let secondLastSig
    if(!newJob) {
      lastSig = readNthLastSig(filename)
      secondLastSig = readNthLastSig(filename, 2)
      if(lastSig === undefined && secondLastSig === undefined) {
        newJob = true;
      }
    }
    await realTimeSigIngester(connection, marketplaceAddress, args.sigFetchSize, args.sigWriteSize, filename, !newJob, args.retries, secondLastSig, lastSig)
  }
})()
