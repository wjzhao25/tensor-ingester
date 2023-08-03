import {Connection, PublicKey} from '@solana/web3.js';
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {historyIngester, standardIngester} from './src/ingester';
import {CsvWriter} from './src/csv-writer';
import {Mode} from './src/ingester';
import { v4 as uuidv4 } from 'uuid';

require('dotenv').config();

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
  const filename = `${args.jobId}.txt`
  const write = new CsvWriter()
  //if mode is history, call backfillSigIngester from lastSig to toTimestamp
  if(args.mode === Mode.History) {
    await historyIngester(
      connection, 
      marketplaceAddress, 
      write,
      args.from!, 
      args.to!, 
      args.sigFetchSize, 
      args.sigWriteSize, 
      filename, 
      newJob, 
      args.retries)
  }else if(args.mode === Mode.Standard){
    await standardIngester(
      connection, 
      marketplaceAddress, 
      write,
      args.sigFetchSize, 
      args.sigWriteSize, 
      filename, 
      newJob, 
      args.retries)
  }
})()
