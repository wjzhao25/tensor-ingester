import {Connection, PublicKey, ConfirmedSignatureInfo, SignaturesForAddressOptions} from '@solana/web3.js';

export function checkSigsInOrder(sigs: ConfirmedSignatureInfo[]): boolean {
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

class WeightedSignature{
    signature: ConfirmedSignatureInfo
    weight: number

    constructor(signature: ConfirmedSignatureInfo, weight: number) {
        this.signature = signature
        this.weight = weight
    }
}

class Provider{
    connection: Connection
    marketplaceAddress: PublicKey
    weight: number
    //TODO add retries
    constructor(rpc: Connection, marketplaceAddress: PublicKey) {
        this.connection = rpc
        this.marketplaceAddress = marketplaceAddress
        this.weight = 1
    }
    
    calibrateWeight(sigs: ConfirmedSignatureInfo[], peekAheadSigs: ConfirmedSignatureInfo[], useLastSig: boolean){
        //check if sigs and peekAheadSigs are both ordered by blockTime
        if (sigs.length === 0 && peekAheadSigs.length === 0) {
            return
        }
        if(checkSigsInOrder(sigs) && checkSigsInOrder(peekAheadSigs)){
            if(sigs.length === peekAheadSigs.length){
                return
            }
            if(sigs.length < peekAheadSigs.length){
                //check if sigs cursor exists in peekAheadSigs
                const sigsCursor = useLastSig ? sigs[sigs.length - 1] : sigs[0]

                for(let sig of peekAheadSigs){
                    if(sig.signature === sigsCursor.signature && sig.blockTime === sigsCursor.blockTime){
                        return
                    }
                }
            }
        }
        //if sigs cursor does not exist in peekAheadSigs, then decrease weight in half
        this.weight = this.weight / 2
        console.log(`Decreasing weight of to ${this.weight}.`)
    }

    async getConfirmedWeightedSignaturesForAddress(options : SignaturesForAddressOptions): Promise<{provider: Provider, weightedSigs: WeightedSignature[]}>{
        //make copy of options
        const peekAheadOptions = {...options}
        peekAheadOptions.limit = peekAheadOptions.limit! + 10

        const res = await Promise.all([await this.connection.getSignaturesForAddress(this.marketplaceAddress, options)
            , await this.connection.getSignaturesForAddress(this.marketplaceAddress, peekAheadOptions)]);

        const sigs = res[0]
        const peekAheadSigs = res[1]
        const useLastSig = options.before !== undefined
        this.calibrateWeight(sigs, peekAheadSigs, useLastSig)
        console.log(`Provider returned ${sigs.length} sigs with weight ${this.weight}.`)
        return {provider: this, weightedSigs: sigs.flatMap(sig => new WeightedSignature(sig, this.weight))}
    }
}

export class ProviderUtil{

    rpcs: Provider[] = [] 

    constructor(rpcs: Connection[], marketplaceAddress: PublicKey) {
        for (let rpc of rpcs) {
            this.rpcs.push(new Provider(rpc, marketplaceAddress))
        }
    }
 
    async getConfirmedSignaturesForAddress(options : SignaturesForAddressOptions){
        const confirmedSigs: ConfirmedSignatureInfo[] = []
        let weightedSignatures: {provider: Provider, weightedSigs: WeightedSignature[]}[] = []
        //check if any provider has weight of 0
        const zeroWeightProviders = this.rpcs.filter(provider => provider.weight === 0)
        if(zeroWeightProviders.length > 0){
            //reset all providers to have weight = 1
            for (let provider of this.rpcs) {
                provider.weight = 1
            }
        }
        const promises = this.rpcs.map(provider => provider.getConfirmedWeightedSignaturesForAddress(options))
        weightedSignatures = await Promise.all(promises)
        let reachedEnd = false
        let index = 0
        while(!reachedEnd) {
            reachedEnd = true
            const sigVotes = new Map<ConfirmedSignatureInfo, number>() 
            for (let j = 0; j < weightedSignatures.length; j++) {
                if(weightedSignatures[j].weightedSigs.length > index){
                    reachedEnd = false
                    if(sigVotes.has(weightedSignatures[j].weightedSigs[index].signature)){
                        sigVotes.set(weightedSignatures[j].weightedSigs[index].signature, 
                            sigVotes.get(weightedSignatures[j].weightedSigs[index].signature)! 
                            + weightedSignatures[j].weightedSigs[index].weight)
                    }else{
                        sigVotes.set(weightedSignatures[j].weightedSigs[index].signature, 
                            weightedSignatures[j].weightedSigs[index].weight)
                    }

                }else{
                    //decrement vote for all sigVotes by weightedSignatures[j].weightedSigs[weightedSignatures[j].weightedSigs.length -1].weight
                    for (let [sig, votes] of sigVotes) {
                        sigVotes.set(sig, 
                            votes - weightedSignatures[j].weightedSigs[weightedSignatures[j].weightedSigs.length -1].weight)
                    }
                }
            }
            index++
            //get sigVotes with highest vote and add it to confirmedSigs
            let highestVote = 0
            let highestVotedSig: ConfirmedSignatureInfo | undefined = undefined
            for (let [sig, votes] of sigVotes) {
                if(votes > highestVote){
                    highestVote = votes
                    highestVotedSig = sig
                }
            }
            if(highestVotedSig !== undefined){
                confirmedSigs.push(highestVotedSig)
            }
        }
        
        return confirmedSigs
    }
}