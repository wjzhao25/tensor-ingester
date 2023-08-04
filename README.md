# tensor-ingester Part A

## History Mode
The ingestor in history mode will use **before** option in **[getSignaturesForAddress](https://docs.solana.com/api/http#getsignaturesforaddress)**
to get all transactions prior to given transaction specified in options **--from** along with a read limit **--sigFetchSize** to paginated backwards in history. The **before** option will be updated after each request to the transaction with ealiest blocktime to act as the cursor during pagination.

 We also provide an optional options **--to** to speficy the chrono point for when to end ingestion if transactions have reach blocktime prior to given point in time.
Thus the resulting output should be all transactions **from** given transaction to last transaction where blocktime is after given **to** chrono time in descending order.

At the start of the job a the id of the job will be printed to console in following format
```
Starting a new job with id 97a0b73d-edba-432b-97be-8239d1d30d71.
```
The output file's filename will take the following format
```
{job-id}.txt
```
ie. 97a0b73d-edba-432b-97be-8239d1d30d71.txt

To resume running job in case of failure or termination of job, use the **--jobId** option. 
In resumption of job the last sig in the output file will be read to be used as the **before** option hence options **--from** will not be required. 

## Usage

Run from sig 2LCs4MuNUvKQHtKaz56xjLhwSPdYbrZmAbQsKRejuZmN6hisoUsHJD51gVEmLEzKukvXb2ZBv4KYriFLVpA6v8Jw
```
yarn ingest --m History --from 2LCs4MuNUvKQHtKaz56xjLhwSPdYbrZmAbQsKRejuZmN6hisoUsHJD51gVEmLEzKukvXb2ZBv4KYriFLVpA6v8Jw
```
Run from sig 2LCs4MuNUvKQHtKaz56xjLhwSPdYbrZmAbQsKRejuZmN6hisoUsHJD51gVEmLEzKukvXb2ZBv4KYriFLVpA6v8Jw until chrono time 1691070128
```
yarn ingest --m History --from 2LCs4MuNUvKQHtKaz56xjLhwSPdYbrZmAbQsKRejuZmN6hisoUsHJD51gVEmLEzKukvXb2ZBv4KYriFLVpA6v8Jw --to 1691070128
```
Resume job 97a0b73d-edba-432b-97be-8239d1d30d71 
```
yarn ingest --m History --jobId 97a0b73d-edba-432b-97be-8239d1d30d71 
```
### Options

- `-f`, `--from`: signature for when history mode ingestion should run from.
- `-t`, `--to`: (optional) chrono point in time for when to end ingestion if transactions have reach blocktime prior to given point in time.
- `-id`, `--jobId`: Job id used to resume prior job.
- `-r`, `--retries`: Number of retries allowed against **[getSignaturesForAddress](https://docs.solana.com/api/http#getsignaturesforaddress)** if result is empty.

## Standard Mode
The ingestor in standard mode will use **until** option in **[getSignaturesForAddress](https://docs.solana.com/api/http#getsignaturesforaddress)**
along with a read limit **--sigFetchSize** inorder to paginate foward in history, we use the second last txn as the **until** option and use the last txn to verify whether the subsequent response contains it or not which indicates congruency, if the response does not contain the last txn would indicate that ingestor has fallen behind real time and would need to enter get the gap mode in order to catch up back to real time.
In get the gap mode, the ingestor will run in history mode using **before** option to paginate backwards in history until reaching the txn that was missed previously.

ie.
```
real time mode
getSignaturesForAddress
1 2 3 4 5
getSignaturesForAddress until 4
7 8 9 10 11
txn 5 not found
switch to get the gap mode
getSignaturesForAddress before 7
2 3 4 5 6 
txn 5 found
switch to real time mode
getSignaturesForAddress until 10
11 12 13 14 15
```
At the start of the job a the id of the job will be printed to console in following format
```
Starting a new job with id 97a0b73d-edba-432b-97be-8239d1d30d71.
```

The output file's filename will take the following format
```
{job-id}.txt
```

ie. 97a0b73d-edba-432b-97be-8239d1d30d71.txt

To resume running job in case of failure or termination of job, use the **--jobId** option. 
In resumption of job the last sig in the output file will be read to be used as the **before** option hence options **--from** will not be required. 

## Usage

Run 
```
yarn ingest --m Standard
```

Resume job 97a0b73d-edba-432b-97be-8239d1d30d71 
```
yarn ingest --m Standard --jobId 97a0b73d-edba-432b-97be-8239d1d30d71 
```
### Options

- `-id`, `--jobId`: Job id used to resume prior job.
- `-r`, `--retries`: Number of retries allowed against **[getSignaturesForAddress](https://docs.solana.com/api/http#getsignaturesforaddress)** if result is empty.

# tensor-ingester Part C

Given that we have multiple providers and our algorithm is trying to get some guarantees on worst case amount of missed sigs, 
in the sense that if our best performing provider makes 10 mistakes out of 1000 sigs what is the most amount of mistakes the algorithm will make in relation to the best performer.

We can use elements of the **[weighted majority algorithm](https://en.wikipedia.org/wiki/Multiplicative_weight_update_method)**
to solve this problem. If we consider our providers as the experts and the decision problem as which sig to include in response position X, then depending on weight of the provider each will cast a weighted vote for the sig they received at their position and the sig with the highest vote will be selected. This will ensure that the votes of providers with the least amount of mistakes will be weighted higher.

ie.
```
provider1 weight 1
fetched sigs A B C 
provider2 weight 0.2
fetched sigs A B D 
provider3 weight 0.2
fetched sigs A B D

Votes
    Position 1
        sig A with 3 votes
    Position 2
        sig B with 3 votes
    Position 3
        sig C with 1 votes
        sig D with 0.4 votes

Result
sigs A B C
```

Given that we don't know what the correct sequence of sigs are, we define mistakes as responses that are incorrect is terms of 1. being out of order
2. cursor does exist in peek ahead
    We perform a peek ahead where we make a second request with limit + 10 to see if last sig that we use a cursor is not incorrect. If the cursor is in the peek ahead and the peek ahead is in order then we consider the cursor as correct

If a provider makes a mistake we divide their weight in half, with all weights starting at 1
## Configure providers
To configure multiple providers, add url in comma separate list
ie.
```
RPC_PROVIDER=https://solana-mainnet.g.alchemy.com/v2/K9Ju48OokMWsUlDkltR2wmjJw0om2Gbo,https://solana-mainnet.g.alchemy.com/v2/qgtRGNeen3TTGf_cLb2Y3Mi51H9jr9mK
```

## Usage
**note** read limit set to 990 due to peek ahead

Run 
```
yarn ingest --m Standard
```

Resume job 97a0b73d-edba-432b-97be-8239d1d30d71 
```
yarn ingest --m Standard --jobId 97a0b73d-edba-432b-97be-8239d1d30d71 
```
### Options

- `-id`, `--jobId`: Job id used to resume prior job.
- `-r`, `--retries`: Number of retries allowed against **[getSignaturesForAddress](https://docs.solana.com/api/http#getsignaturesforaddress)** if result is empty.