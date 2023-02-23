import {Connection, PublicKey} from '@solana/web3.js';

require('dotenv').config();

(async () => {
  console.log('Ingester reporting to duty 🫡')

  const rpc = process.env.RPC_PROVIDER;
  if (!rpc) {
    console.log('Ooof missing RPC. Did you add one to .env?')
    return
  };

  const connection = new Connection(rpc);
  const marketplaceAddress = new PublicKey("M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K");
  const sigs = await connection.getSignaturesForAddress(marketplaceAddress)

  console.log(`Looks like I fetched ${sigs.length} sigs.`)
  console.log(`Here's what one of them looks like: ${JSON.stringify(sigs[0], null, 4)}`)
})()
