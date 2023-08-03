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

# tensor-ingester Part B

Given that in part A we used pagination when requesting getSignaturesForAddress for both history and standard mode, only the pages need to be held in memory and can be disgarded after writing to file. Given the sigs no longer have to be written to file, we no longer need keep all sigs during get the gap mode in memory in order to reverse them and can directly write them to memory