import {Connection, PublicKey} from '@solana/web3.js';
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import * as fs from "fs";

require('dotenv').config();

export enum Mode {
  History = "History",
  Standard = "Standard",
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
    .option("marketplace", {
      alias: "mp",
      describe: "marketplace to fetch sigs for",
      type: "string",
      default: "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN"
    })
    .option("siFetchSize", {
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
    .strict().argv;

  console.log('Ingester reporting to duty 🫡')

  const rpc = process.env.RPC_PROVIDER;
  if (!rpc) {
    console.log('Ooof missing RPC. Did you add one to .env?')
    return
  };

  const connection = new Connection(rpc);
  const marketplaceAddress = new PublicKey(args.marketplace);

  //hm I wonder how args.mode interacts with this? 🤔
  const sigs = await connection.getSignaturesForAddress(marketplaceAddress, {limit: args.sigFetchSize})

  console.log(`Looks like I fetched ${sigs.length} sigs.`)
  console.log(`Here's what one of them looks like: ${JSON.stringify(sigs[0], null, 4)}`)

  console.log('Let me write a few of them down into OUTPUT.txt as an example')
  fs.appendFileSync('OUTPUT.txt', sigs.slice(0, args.sigWriteSize).map(s => `${s.blockTime}:${s.signature}`).join('\r\n'))
})()
