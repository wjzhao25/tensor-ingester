import { historyIngester, standardIngester } from '../src/ingester'

import {CsvWriter} from '../src/csv-writer';

import { Connection, PublicKey } from '@solana/web3.js'

describe('for HISTORY mode', () => {
    test('historyIngester load until 1690912199', async  () => {
        const mockConnections = new Connection("https://solana-mainnet.g.alchemy.com/v2/test")
        const getSignaturesForAddressMock = jest.spyOn(mockConnections, 'getSignaturesForAddress')
        const sigs = [{
            signature: "zdEPcW3rqe7R6457ia6n51Ekfr7Dw7JJasG7V6YEiYjpJxMPmMLEzV4swfxjLFiYG2fT4G1np7mz4sz1baG4D8w",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912202,
        },
        {
            signature: "5dRJBAcHn12hpsAtjFJkTvgbZLNKfJZRXH9tGRvRQ8t2Bs1PygXJiFH3o5nnyWssr6Q2PQcTLGZDkkuShpY4aUk8",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912201,
        },
        ]

        const sigs2 = [
        {
            signature: "4mhKBuSYkTFMhsrB5BY5tAWoDPvBDyHoXihULRcmuwY3hXVTAPmEM4MG8uGMYP5MZRVkhFzKTSLHTDX9k46bNjwN",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912201,
        },
        {
            signature: "5UewWf6LxmC4vAumgA7nmEMpAwnjcoK19poRdhJNW9FxpsMKTe9YtKpxuELt3KQsxEqCqhnzQbyPp11awxnGppdb",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912200,
        }
        ]

        const sigs3 = [
        {
            signature: "4u2axnTJoWCPYLQGMeVV3LQKuPhmtC4H8f7eYt7ZFinQhAWutf4w8CWamZY2Q6ANzCnPr2DSyQWBSTBr6nh8bfUC",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912199,
        },
        {
            signature: "2N5tz94wGhuQmThDEa6Ajx7dcouJpay7LNvo8AKCejVGhojZupjzUwaKawd41vKCyAwv475Z3GaDCaWnkWbvxkPR",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912198,
        }
        ]
        getSignaturesForAddressMock.mockImplementation((x) => {

            if (getSignaturesForAddressMock.mock.calls.length === 1) {
                return Promise.resolve(sigs)
              } else if (getSignaturesForAddressMock.mock.calls.length === 2) {
                return Promise.resolve(sigs2)
              } else {
                return Promise.resolve(sigs3)
              }
        })
        const mockMarketplaceAddress = new PublicKey("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN")

        const mockWriter = new CsvWriter()
        const mockWriteToFile = jest.spyOn(mockWriter, 'writeToFile')
        const filename = "test.txt"
        await historyIngester(mockConnections,
            mockMarketplaceAddress,
            mockWriter,
            "zdEPcW3rqe7R6457ia6n51Ekfr7Dw7JJasG7V6YEiYjpJxMPmMLEzV4swfxjLFiYG2fT4G1np7mz4sz1baG4D8w",
            1690912199,
            2,
            1,
            filename,
            true,
            0)
          
        expect(getSignaturesForAddressMock.mock.calls.length).toEqual(3)
        expect(mockWriteToFile.mock.calls.length).toEqual(3)

        expect(mockWriteToFile).toHaveBeenNthCalledWith(1, filename,sigs,1,false)
        expect(mockWriteToFile).toHaveBeenNthCalledWith(2, filename,sigs2,1,true)

        const expectedSig = [
            {
                signature: "4u2axnTJoWCPYLQGMeVV3LQKuPhmtC4H8f7eYt7ZFinQhAWutf4w8CWamZY2Q6ANzCnPr2DSyQWBSTBr6nh8bfUC",
                slot: 0,
                err: null,
                memo: null,
                blockTime: 1690912199,
            } ]
        expect(mockWriteToFile).toHaveBeenNthCalledWith(3, filename,expectedSig,1,true)
    })

    test('historyIngester retry', async  () => {
        const mockConnections = new Connection("https://solana-mainnet.g.alchemy.com/v2/test")
        const getSignaturesForAddressMock = jest.spyOn(mockConnections, 'getSignaturesForAddress')
        const sigs = [{
            signature: "zdEPcW3rqe7R6457ia6n51Ekfr7Dw7JJasG7V6YEiYjpJxMPmMLEzV4swfxjLFiYG2fT4G1np7mz4sz1baG4D8w",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912202,
        },
        {
            signature: "5dRJBAcHn12hpsAtjFJkTvgbZLNKfJZRXH9tGRvRQ8t2Bs1PygXJiFH3o5nnyWssr6Q2PQcTLGZDkkuShpY4aUk8",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912201,
        },
        ]
        getSignaturesForAddressMock.mockImplementation((x) => {

            if (getSignaturesForAddressMock.mock.calls.length === 1) {
                return Promise.resolve([])
              } else if (getSignaturesForAddressMock.mock.calls.length === 2) {
                return Promise.resolve(sigs)
              } else {
                return Promise.resolve([])
              }
        })
        const mockMarketplaceAddress = new PublicKey("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN")

        const mockWriter = new CsvWriter()
        const mockWriteToFile = jest.spyOn(mockWriter, 'writeToFile')
        const filename = "test.txt"
        await historyIngester(mockConnections,
            mockMarketplaceAddress,
            mockWriter,
            "zdEPcW3rqe7R6457ia6n51Ekfr7Dw7JJasG7V6YEiYjpJxMPmMLEzV4swfxjLFiYG2fT4G1np7mz4sz1baG4D8w",
            1690912199,
            2,
            1,
            filename,
            true,
            1)
          
        expect(getSignaturesForAddressMock.mock.calls.length).toEqual(4)
        expect(mockWriteToFile.mock.calls.length).toEqual(1)

        expect(mockWriteToFile).toHaveBeenNthCalledWith(1, filename,sigs,1,false)

    })

    test('historyIngester duplicate', async  () => {
        const mockConnections = new Connection("https://solana-mainnet.g.alchemy.com/v2/test")
        const getSignaturesForAddressMock = jest.spyOn(mockConnections, 'getSignaturesForAddress')
        const sigs = [{
            signature: "5dRJBAcHn12hpsAtjFJkTvgbZLNKfJZRXH9tGRvRQ8t2Bs1PygXJiFH3o5nnyWssr6Q2PQcTLGZDkkuShpY4aUk8",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912201,
        },
        {
            signature: "5dRJBAcHn12hpsAtjFJkTvgbZLNKfJZRXH9tGRvRQ8t2Bs1PygXJiFH3o5nnyWssr6Q2PQcTLGZDkkuShpY4aUk8",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912201,
        },
        ]
        getSignaturesForAddressMock.mockImplementation((x) => {

            if (getSignaturesForAddressMock.mock.calls.length === 1) {
                return Promise.resolve([])
              } else if (getSignaturesForAddressMock.mock.calls.length === 2) {
                return Promise.resolve(sigs)
              } else {
                return Promise.resolve([])
              }
        })
        const mockMarketplaceAddress = new PublicKey("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN")

        const mockWriter = new CsvWriter()
        const mockWriteToFile = jest.spyOn(mockWriter, 'writeToFile')
        const filename = "test.txt"
        await historyIngester(mockConnections,
            mockMarketplaceAddress,
            mockWriter,
            "zdEPcW3rqe7R6457ia6n51Ekfr7Dw7JJasG7V6YEiYjpJxMPmMLEzV4swfxjLFiYG2fT4G1np7mz4sz1baG4D8w",
            1690912199,
            2,
            1,
            filename,
            true,
            1)
          
        expect(getSignaturesForAddressMock.mock.calls.length).toEqual(4)
        expect(mockWriteToFile.mock.calls.length).toEqual(1)

        const expectedSigs = [{
            signature: "5dRJBAcHn12hpsAtjFJkTvgbZLNKfJZRXH9tGRvRQ8t2Bs1PygXJiFH3o5nnyWssr6Q2PQcTLGZDkkuShpY4aUk8",
            slot: 0,
            err: null,
            memo: null,
            blockTime: 1690912201,
        },
        ]

        expect(mockWriteToFile).toHaveBeenNthCalledWith(1, filename, expectedSigs, 1, false)

    })

    test('historyIngester reorder blocktime 1 3 2 4 to 1 2 3 4', async  () => {
        const mockConnections = new Connection("https://solana-mainnet.g.alchemy.com/v2/test")
        const getSignaturesForAddressMock = jest.spyOn(mockConnections, 'getSignaturesForAddress')
        const sigs = [
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
                slot: 209070456
            },
            {
                blockTime: 1691009614,
                err: null,
                memo: null,
                signature: "VT9RswK7B2q86a45XWzAjTLiaqzY4gpPXKoiSrj2ZUSEe9sUCQn2uRAfVom44cZXvZaXxAZTpzuxm4SYZMmzFQu",
                slot: 209070446
            },
            {
                blockTime: 1691009615,
                err: null,
                memo: null,
                signature: "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE",
                slot: 209070446
            },
            {
                blockTime: 1691009613,
                err: null,
                memo: null,
                signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
                slot: 209070446
            }
        ]
        getSignaturesForAddressMock.mockImplementation((x) => {

            if (getSignaturesForAddressMock.mock.calls.length === 1) {
                return Promise.resolve([])
              } else if (getSignaturesForAddressMock.mock.calls.length === 2) {
                return Promise.resolve(sigs)
              } else {
                return Promise.resolve([])
              }
        })
        const mockMarketplaceAddress = new PublicKey("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN")

        const mockWriter = new CsvWriter()
        const mockWriteToFile = jest.spyOn(mockWriter, 'writeToFile')
        const filename = "test.txt"
        await historyIngester(mockConnections,
            mockMarketplaceAddress,
            mockWriter,
            "zdEPcW3rqe7R6457ia6n51Ekfr7Dw7JJasG7V6YEiYjpJxMPmMLEzV4swfxjLFiYG2fT4G1np7mz4sz1baG4D8w",
            1690912199,
            2,
            1,
            filename,
            true,
            1)
          
        expect(getSignaturesForAddressMock.mock.calls.length).toEqual(4)
        expect(mockWriteToFile.mock.calls.length).toEqual(1)

        const expectedSigs = [
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
                slot: 209070456
            },
            {
                blockTime: 1691009615,
                err: null,
                memo: null,
                signature: "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE",
                slot: 209070446
            },
            {
                blockTime: 1691009614,
                err: null,
                memo: null,
                signature: "VT9RswK7B2q86a45XWzAjTLiaqzY4gpPXKoiSrj2ZUSEe9sUCQn2uRAfVom44cZXvZaXxAZTpzuxm4SYZMmzFQu",
                slot: 209070446
            },
            {
                blockTime: 1691009613,
                err: null,
                memo: null,
                signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
                slot: 209070446
            }
        ]

        expect(mockWriteToFile).toHaveBeenNthCalledWith(1, filename, expectedSigs, 1, false)

    })

    test('historyIngester reorder blocktime 1 6 3 to 1 3', async  () => {
        const mockConnections = new Connection("https://solana-mainnet.g.alchemy.com/v2/test")
        const getSignaturesForAddressMock = jest.spyOn(mockConnections, 'getSignaturesForAddress')
        const sigs = [
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
                slot: 209070456
            },
            {
                blockTime: 1691009619,
                err: null,
                memo: null,
                signature: "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE",
                slot: 209070446
            },
            {
                blockTime: 1691009613,
                err: null,
                memo: null,
                signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
                slot: 209070446
            }
        ]
        getSignaturesForAddressMock.mockImplementation((x) => {

            if (getSignaturesForAddressMock.mock.calls.length === 1) {
                return Promise.resolve([])
              } else if (getSignaturesForAddressMock.mock.calls.length === 2) {
                return Promise.resolve(sigs)
              } else {
                return Promise.resolve([])
              }
        })
        const mockMarketplaceAddress = new PublicKey("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN")

        const mockWriter = new CsvWriter()
        const mockWriteToFile = jest.spyOn(mockWriter, 'writeToFile')
        const filename = "test.txt"
        await historyIngester(mockConnections,
            mockMarketplaceAddress,
            mockWriter,
            "zdEPcW3rqe7R6457ia6n51Ekfr7Dw7JJasG7V6YEiYjpJxMPmMLEzV4swfxjLFiYG2fT4G1np7mz4sz1baG4D8w",
            1690912199,
            2,
            1,
            filename,
            true,
            1)
          
        expect(getSignaturesForAddressMock.mock.calls.length).toEqual(4)
        expect(mockWriteToFile.mock.calls.length).toEqual(1)

        const expectedSigs = [{
            blockTime: 1691009616,
            err: null,
            memo: null,
            signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
            slot: 209070456
        },
        {
            blockTime: 1691009613,
            err: null,
            memo: null,
            signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
            slot: 209070446
        }
        ]

        expect(mockWriteToFile).toHaveBeenNthCalledWith(1, filename, expectedSigs, 1, false)

    })

    
})

describe('for Standard mode', () => {
    test('standardIngester', async  () => {
        const mockConnections = new Connection("https://solana-mainnet.g.alchemy.com/v2/test")
        const getSignaturesForAddressMock = jest.spyOn(mockConnections, 'getSignaturesForAddress')
        
        const sigs = [{
            blockTime: 1691009613,
            err: null,
            memo: null,
            signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
            slot: 209070457
        },
        {
            blockTime: 1691009612,
            err: null,
            memo: null,
            signature: "2fkrGWpDTdbz7DBVRgWpGCNesLJL3BZJnjE9UPEbzQdhScyvmCESFcZEiEU3hE9yXo2D6CmLx5Fd9BDtvQoFrq4L",
            slot: 209070456
        }
        ]

        const sigs2 = [
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
                slot: 209070456
            },
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE",
                slot: 209070446
            },
            {
                blockTime: 1691009613,
                err: null,
                memo: null,
                signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
                slot: 209070446
            }
        ]

        const sigs3 = [
            {
                blockTime: 1691009621,
                err: null,
                memo: null,
                signature: "4pAekc8zctofHSYLPfcK3XXQEeTnLNCps2CdZQXeW462opPs2JSCeBrmPUMKnHYfnMqVfHx9vVRSzrwKKDSHyGem",
                slot: 209070446
            },
            {
                blockTime: 1691009621,
                err: null,
                memo: null,
                signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
                slot: 209070445
            }
        ]

        getSignaturesForAddressMock.mockImplementation((x) => {
            if (getSignaturesForAddressMock.mock.calls.length === 1) {
                return Promise.resolve(sigs)
              } else if (getSignaturesForAddressMock.mock.calls.length === 2) {
                return Promise.resolve(sigs2)
              } else if (getSignaturesForAddressMock.mock.calls.length ===3) {
                return Promise.resolve(sigs3)
              } else {
                return Promise.resolve([])
              }
        })
        const mockMarketplaceAddress = new PublicKey("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN")

        const mockWriter = new CsvWriter()
        const mockWriteToFile = jest.spyOn(mockWriter, 'writeToFile')
        const filename = "test.txt"

        await standardIngester(mockConnections,
            mockMarketplaceAddress,
            mockWriter,
            2,
            1,
            filename,
            true,
            0,
            true)
          
        expect(getSignaturesForAddressMock.mock.calls.length).toEqual(4)
        expect(mockWriteToFile.mock.calls.length).toEqual(3)

        const expectedSigs = [
            {
                blockTime: 1691009612,
                err: null,
                memo: null,
                signature: "2fkrGWpDTdbz7DBVRgWpGCNesLJL3BZJnjE9UPEbzQdhScyvmCESFcZEiEU3hE9yXo2D6CmLx5Fd9BDtvQoFrq4L",
                slot: 209070456
            },
            {
                blockTime: 1691009613,
                err: null,
                memo: null,
                signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
                slot: 209070457
            },
        ]

        expect(mockWriteToFile).toHaveBeenNthCalledWith(1, filename,expectedSigs,1,false)

        const expectedSigs2 = [
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE",
                slot: 209070446
            },
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
                slot: 209070456
            },
        ]

        
        expect(mockWriteToFile).toHaveBeenNthCalledWith(2, filename,expectedSigs2,1,true)

        const expectedSigs3 = [
            {
                blockTime: 1691009621,
                err: null,
                memo: null,
                signature: "4pAekc8zctofHSYLPfcK3XXQEeTnLNCps2CdZQXeW462opPs2JSCeBrmPUMKnHYfnMqVfHx9vVRSzrwKKDSHyGem",
                slot: 209070446
            }
        ]
        expect(mockWriteToFile).toHaveBeenNthCalledWith(3, filename,expectedSigs3,1,true)
    })

    test('standardIngester get the gap', async  () => {
        const mockConnections = new Connection("https://solana-mainnet.g.alchemy.com/v2/test")
        const getSignaturesForAddressMock = jest.spyOn(mockConnections, 'getSignaturesForAddress')
        
        const sigs = [{
            blockTime: 1691009618,
            err: null,
            memo: null,
            signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
            slot: 209070457
        },
        {
            blockTime: 1691009617,
            err: null,
            memo: null,
            signature: "2fkrGWpDTdbz7DBVRgWpGCNesLJL3BZJnjE9UPEbzQdhScyvmCESFcZEiEU3hE9yXo2D6CmLx5Fd9BDtvQoFrq4L",
            slot: 209070456
        }
        ]

        const sigs2 = [
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
                slot: 209070456
            },
            {
                blockTime: 1691009615,
                err: null,
                memo: null,
                signature: "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE",
                slot: 209070446
            },
            {
                blockTime: 1691009613,
                err: null,
                memo: null,
                signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
                slot: 209070446
            }
        ]

      
        getSignaturesForAddressMock.mockImplementation((x) => {

            if (getSignaturesForAddressMock.mock.calls.length === 1) {
                return Promise.resolve(sigs)
              } else if (getSignaturesForAddressMock.mock.calls.length === 2) {
                return Promise.resolve(sigs2)
              } else {
                return Promise.resolve([])
              }
        })
        const mockMarketplaceAddress = new PublicKey("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN")

        const mockWriter = new CsvWriter()
        const mockWriteToFile = jest.spyOn(mockWriter, 'writeToFile')
        const mockReadNthLastSig = jest.spyOn(mockWriter, 'readNthLastSig')
        mockReadNthLastSig.mockImplementation((x) => {
            return "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE"
        })
        const filename = "test.txt"

        await standardIngester(mockConnections,
            mockMarketplaceAddress,
            mockWriter,
            2,
            1,
            filename,
            false,
            0,
            true)
          
        expect(getSignaturesForAddressMock.mock.calls.length).toEqual(3)
        expect(mockReadNthLastSig.mock.calls.length).toEqual(2)
        expect(mockWriteToFile.mock.calls.length).toEqual(2)

        const expectedSigs = [
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "2TY8zyxNpdxAypoYYNyUPFHR5nuqaPPyHJ22yXcdaPSaovUjN7A6qeP7FPYT4Towarh6KH2VaQ393f8wfRpos4RY",
                slot: 209070456
            },
        ]

        expect(mockWriteToFile).toHaveBeenNthCalledWith(1, filename,expectedSigs,1,true)

        expect(mockWriteToFile).toHaveBeenNthCalledWith(2, filename,sigs.reverse(),1,true)
       
    })


    test('standardIngester reorder 4 2 3 1 to 1 2 3 4', async  () => {
        const mockConnections = new Connection("https://solana-mainnet.g.alchemy.com/v2/test")
        const getSignaturesForAddressMock = jest.spyOn(mockConnections, 'getSignaturesForAddress')
        
        const sigs = [{
            blockTime: 1691009616,
            err: null,
            memo: null,
            signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
            slot: 209070457
        },
        {
            blockTime: 1691009612,
            err: null,
            memo: null,
            signature: "2fkrGWpDTdbz7DBVRgWpGCNesLJL3BZJnjE9UPEbzQdhScyvmCESFcZEiEU3hE9yXo2D6CmLx5Fd9BDtvQoFrq4L",
            slot: 209070456
        },
        {
            blockTime: 1691009613,
            err: null,
            memo: null,
            signature: "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE",
            slot: 209070446
        },
        {
            blockTime: 1691009611,
            err: null,
            memo: null,
            signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
            slot: 209070446
        }
        ]



        getSignaturesForAddressMock.mockImplementation((x) => {
            if (getSignaturesForAddressMock.mock.calls.length === 1) {
                return Promise.resolve(sigs)
              } else {
                return Promise.resolve([])
              }
        })
        const mockMarketplaceAddress = new PublicKey("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN")

        const mockWriter = new CsvWriter()
        const mockWriteToFile = jest.spyOn(mockWriter, 'writeToFile')
        const filename = "test.txt"

        await standardIngester(mockConnections,
            mockMarketplaceAddress,
            mockWriter,
            2,
            1,
            filename,
            true,
            0,
            true)
          
        expect(getSignaturesForAddressMock.mock.calls.length).toEqual(2)
        expect(mockWriteToFile.mock.calls.length).toEqual(1)

        const expectedSigs = [
            {
                blockTime: 1691009611,
                err: null,
                memo: null,
                signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
                slot: 209070446
            },
            {
                blockTime: 1691009612,
                err: null,
                memo: null,
                signature: "2fkrGWpDTdbz7DBVRgWpGCNesLJL3BZJnjE9UPEbzQdhScyvmCESFcZEiEU3hE9yXo2D6CmLx5Fd9BDtvQoFrq4L",
                slot: 209070456
            },
            {
                blockTime: 1691009613,
                err: null,
                memo: null,
                signature: "4WPCr3sJevopprjoaDpHaS6ZAPfwRuFXZhYx3M3tBJTWSCsXgeLpoN1LwwnctG7e8cP3UnhBKakV4oDcyPunwqPE",
                slot: 209070446
            },
            {
                blockTime: 1691009616,
                err: null,
                memo: null,
                signature: "TNmhZqA5rkicSmoqmeMpgdhKpHpXLa3Z9nfpbQugjTUUqFJ4pSziKitjXr7NPuLBhernWLnnDssjDpHoj68vsWR",
                slot: 209070457
            },
        ]

        expect(mockWriteToFile).toHaveBeenNthCalledWith(1, filename,expectedSigs,1,false)

    })

})
