# Experimental design notes
## Overview
The purpose of this study is to evaluate the performance of Elasticsearch and Qdrant for log search use cases, particularly when using hybrid vector search with dense and sparse embeddings under **heavy write load**. The experiment will involve indexing a dataset of log entries into both Elasticsearch and Qdrant, and then evaluating the search performance (latency and relevance) of both systems under two conditions: 1) without any write load (i.e. steady-state), and 2) under heavy write load.

## Dataset
The log entries are synthetically generated to ensure a controlled environment for testing and to simulate the characteristics of real-world log data. Each log entry will consist of the following fields:
- `id`: A unique identifier for the log entry.
- `timestamp`: The time the log entry was created.
- `service`: The name of the service generating the log.
- `level`: The log level (e.g., INFO, WARN, ERROR).
- `message`: The log message content.
- `embedding`: A dense vector representation of the log message (e.g., using a pre trained language model).

To simulate the logs, we utilize an `emitter` tool that generates log entries at a configurable rate, storing them in buffers and defining different log "sinks" for Elasticsearch and Qdrant that consume the log entries and index them into the respective systems.

## Indexing
Both Elasticsearch and Qdrant will be configured to index the log entries using full HNSW (i.e. no quantization) for the dense embeddings, and BM25 for the sparse embeddings. The indexing process will be designed to ensure that both systems are configured as similarly as possible to allow for a fair comparison.

## Querying
For querying performance, we make use of the [`qstorm`](https://github.com/nleroy917/qstorm) command-line tool, which allows us to execute search queries against both Elasticsearch and Qdrant in a consistent manner. The queries will be designed to test both the relevance of the search results (e.g., by using specific keywords or phrases) and the latency of the search (i.e., how quickly results are returned).

## Evaluation Metrics
The performance of both systems will be evaluated using the following metrics:
- **Latency**: The time taken to execute each query and return results.
- **Relevance**: The relevance of the search results will be evaluated using standard information retrieval metrics such as Precision@K, Recall@K, and Mean Average Precision (MAP).

## Experimental Setup
We will run the experiment in two phases:
1. **Steady-State Performance**: In this phase, we will index a fixed number of log entries (e.g., 100,000) into both Elasticsearch and Qdrant, and then execute a predefined set of search queries to evaluate latency and relevance without any additional write load.
2. **Performance Under Write Load**: In this phase, we will simulate a heavy write load by continuously generating and indexing new log entries into both systems while executing the same set of search queries. This will allow us to evaluate how the performance of each system is affected by concurrent writes.