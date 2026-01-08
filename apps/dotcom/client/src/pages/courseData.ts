export interface CaseStudy {
	title: string
	url: string
	source: string
}

export interface Concept {
	id: number
	name: string
	description: string
	conceptUrl?: string
	caseStudies: CaseStudy[]
	architectureQuestions: string[]
}

export interface Module {
	id: number
	topicName: string
	description: string
	concepts: Concept[]
}

export const COURSE_TITLE = 'Real-Time Systems and Scalable Architectures'
export const COURSE_DESCRIPTION =
	'Building systems that respond at scale with low latency and high reliability.'

export const MODULES: Module[] = [
	// ============ MODULE 1: Web + Request Fundamentals ============
	{
		id: 1,
		topicName: 'Web Request Fundamentals',
		description: 'How requests flow end-to-end: browser → DNS → TCP/TLS → HTTP → server → back',
		concepts: [
			{
				id: 1,
				name: 'End-to-End Web Request Life Cycle',
				description: 'DNS resolution, TCP handshake, TLS, HTTP, and browser rendering.',
				conceptUrl: 'https://systemdesign.one/what-happens-when-you-type-url-into-your-browser/',
				caseStudies: [],
				architectureQuestions: [
					'Where does latency come from in a request path (DNS/TLS/server/DB)?',
				],
			},
			{
				id: 2,
				name: 'DNS Basics for System Designers',
				description: 'Recursive vs authoritative DNS, TTL, caching, record types, latency impact.',
				conceptUrl: 'https://www.cloudflare.com/learning/dns/what-is-dns/',
				caseStudies: [],
				architectureQuestions: ['How does DNS TTL affect load balancing and failover?'],
			},
		],
	},

	// ============ MODULE 2: Estimation + SLIs/SLOs ============
	{
		id: 2,
		topicName: 'Capacity Planning & Performance Metrics',
		description: 'Back-of-envelope + latency percentiles + how to measure "good"',
		concepts: [
			{
				id: 1,
				name: 'Back-of-Envelope Capacity Planning',
				description: 'Estimate QPS, bandwidth, storage, peak factors, and cost knobs.',
				conceptUrl: 'https://systemdesign.one/back-of-the-envelope/',
				caseStudies: [],
				architectureQuestions: [
					'What numbers do you compute first in any system design interview?',
				],
			},
			{
				id: 2,
				name: 'Latency Percentiles (P50/P95/P99)',
				description: 'Why tail latency matters and how it changes architecture decisions.',
				conceptUrl:
					'https://www.linkedin.com/pulse/understanding-p50-p75-p90-p95-p99-latency-metrics-rizwan-ahmed-osoqc/',
				caseStudies: [],
				architectureQuestions: ['What breaks when P99 is bad but average looks fine?'],
			},
			{
				id: 3,
				name: 'System Design Pillars (Scalability/Reliability/Availability)',
				description: 'The "why" behind trade-offs: scaling, fault tolerance, redundancy, cost.',
				conceptUrl: 'https://engineeringatscale.substack.com/p/system-design-concepts-an-in-depth',
				caseStudies: [],
				architectureQuestions: ['How do you trade cost vs availability vs consistency?'],
			},
			{
				id: 4,
				name: 'Scaling from 0 → Millions',
				description: 'Common scaling path: LB → caching → replicas → sharding → async.',
				conceptUrl:
					'https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users',
				caseStudies: [],
				architectureQuestions: ['What bottleneck changes first as traffic grows 10x?'],
			},
		],
	},

	// ============ MODULE 3: Traffic Distribution + Gateways ============
	{
		id: 3,
		topicName: 'Load Balancing & Traffic Distribution',
		description: 'How traffic is routed safely + efficiently across systems',
		concepts: [
			{
				id: 1,
				name: 'Load Balancing Fundamentals',
				description: 'L4 vs L7, algorithms, health checks, sticky sessions, hot-spotting.',
				conceptUrl: 'https://systemdr.substack.com/p/introduction-to-load-balancing',
				caseStudies: [
					{
						title: 'Uber: Better Load Balancing with Real-Time Dynamic Subsetting',
						url: 'https://www.uber.com/en-GB/blog/better-load-balancing-real-time-dynamic-subsetting/',
						source: 'Uber Engineering',
					},
				],
				architectureQuestions: ['When do you choose L4 vs L7 load balancing?'],
			},
			{
				id: 2,
				name: 'API Gateway vs Load Balancer vs Reverse Proxy',
				description: 'Auth, throttling, routing, aggregation, protocol translation.',
				conceptUrl: 'https://newsletter.systemdesign.one/p/api-gateway-load-balancer-reverse-proxy',
				caseStudies: [
					{
						title: 'Netflix Zuul 2: Asynchronous API Gateway',
						url: 'https://netflixtechblog.com/zuul-2-the-netflix-journey-to-asynchronous-non-blocking-systems-45947377fb5c',
						source: 'Netflix Tech Blog',
					},
				],
				architectureQuestions: ['When is a gateway necessary (beyond an LB)?'],
			},
			{
				id: 3,
				name: 'Service Discovery (Microservices)',
				description: 'How services find each other dynamically; registry patterns.',
				conceptUrl: 'https://systemdesign.one/what-is-service-discovery/',
				caseStudies: [],
				architectureQuestions: ['How would services discover each other across regions?'],
			},
		],
	},

	// ============ MODULE 4: Data Modeling + DB Selection ============
	{
		id: 4,
		topicName: 'Database Fundamentals & Selection',
		description: 'Pick the right DB model + schema thinking for interviews',
		concepts: [
			{
				id: 1,
				name: 'ACID vs BASE',
				description: 'Strict transactions vs eventual consistency trade-offs.',
				conceptUrl:
					'https://neo4j.com/blog/graph-database/acid-vs-base-consistency-models-explained/',
				caseStudies: [],
				architectureQuestions: ['Where is eventual consistency acceptable in product behavior?'],
			},
			{
				id: 2,
				name: 'CAP Theorem (Practical)',
				description: 'How partitions force consistency/availability choices.',
				conceptUrl: 'https://www.bmc.com/blogs/cap-theorem',
				caseStudies: [],
				architectureQuestions: ['What do you sacrifice during a partition and why?'],
			},
			{
				id: 3,
				name: 'SQL vs NoSQL (Modeling + Scaling)',
				description: 'Joins vs embedding; indexes; access patterns drive choice.',
				conceptUrl: 'https://skyvia.com/learn/nosql-vs-sql',
				caseStudies: [],
				architectureQuestions: ['Given access patterns, which DB would you pick and why?'],
			},
			{
				id: 4,
				name: 'Choosing the Right Database (Framework)',
				description: 'Transactional vs analytical, strong vs eventual, cost tradeoffs.',
				conceptUrl: 'https://memgraph.com/blog/how-to-choose-a-database-for-your-needs',
				caseStudies: [
					{
						title: 'Netflix: Implementing the Netflix Media Database (NMDB)',
						url: 'https://netflixtechblog.com/implementing-the-netflix-media-database-53b5a840b42a',
						source: 'Netflix Tech Blog',
					},
				],
				architectureQuestions: ['How do you justify DB choice to an interviewer?'],
			},
			{
				id: 5,
				name: 'Schema Design (Relational Thinking)',
				description: 'Keys, constraints, evolution, migrations, and practical modeling.',
				conceptUrl: 'https://www.kusumasandi.com/blogs/design-database-schema',
				caseStudies: [],
				architectureQuestions: ['What schema changes do you expect after 6 months of growth?'],
			},
		],
	},

	// ============ MODULE 5: Database Scaling & Distribution ============
	{
		id: 5,
		topicName: 'Database Scaling & Data Distribution',
		description: 'Make DB survive growth: indexes, replicas, sharding, hotspots, consistency knobs',
		concepts: [
			{
				id: 1,
				name: 'Indexing + Query Optimization',
				description: 'Indexes, query plans, covering indexes, write amplification.',
				conceptUrl:
					'https://medium.com/@syed.fawzul.azim/database-performance-optimization-7553fc0a117b',
				caseStudies: [],
				architectureQuestions: ['How do you index for a read-heavy feed / search screen?'],
			},
			{
				id: 2,
				name: 'Read Replicas, Replication Lag & Failover',
				description:
					'Sync/async replication, what lag breaks, and how failover changes consistency.',
				conceptUrl: 'https://www.postgresql.org/docs/current/runtime-config-replication.html',
				caseStudies: [
					{
						title: 'Uber: Improving MySQL Cluster Uptime',
						url: 'https://www.uber.com/en-IN/blog/improving-mysql-cluster-uptime-part1/',
						source: 'Uber Engineering',
					},
					{
						title: 'Uber: MySQL at Uber',
						url: 'https://www.uber.com/blog/mysql-at-uber/',
						source: 'Uber Engineering',
					},
				],
				architectureQuestions: [
					'How do you handle replica lag in user-visible flows?',
					'What changes during primary election/failover?',
				],
			},
			{
				id: 3,
				name: 'Replication Lag (Deep Dive)',
				description: 'Root causes, measurement, and mitigation strategies.',
				conceptUrl: 'https://www.percona.com/blog/replication-lag-in-postgresql/',
				caseStudies: [
					{
						title: 'AWS RDS: Read Replicas (Lag behavior)',
						url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.html',
						source: 'AWS Docs',
					},
					{
						title: 'EDB: Replication + Automatic Failover Overview',
						url: 'https://www.enterprisedb.com/postgres-tutorials/postgresql-replication-and-automatic-failover-tutorial',
						source: 'EnterpriseDB',
					},
				],
				architectureQuestions: ['How do you design "read your writes" when replicas lag?'],
			},
			{
				id: 4,
				name: 'Sharding vs Partitioning (Shard Key Selection)',
				description: 'Partition strategies + choosing shard keys + avoiding hotspots.',
				conceptUrl: 'https://vivekbansal.substack.com/p/sharding-vs-partitioning',
				caseStudies: [
					{
						title: 'Discord: How Discord Stores Trillions of Messages',
						url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages',
						source: 'Discord Engineering',
					},
					{
						title: 'Notion: Sharding Postgres at Notion',
						url: 'https://www.notion.com/blog/sharding-postgres-at-notion',
						source: 'Notion Engineering',
					},
					{
						title: 'Shopify: MySQL Shard Balancing at Terabyte Scale',
						url: 'https://shopify.engineering/mysql-database-shard-balancing-terabyte-scale',
						source: 'Shopify Engineering',
					},
					{
						title: 'Instagram: Sharding & IDs',
						url: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c',
						source: 'Instagram Engineering',
					},
				],
				architectureQuestions: ['How do you pick a shard key for multi-tenant data?'],
			},
			{
				id: 5,
				name: 'Consistent Hashing',
				description: 'Minimize reshuffling when nodes change; virtual nodes; ring.',
				conceptUrl:
					'https://bytebytego.com/courses/system-design-interview/design-consistent-hashing',
				caseStudies: [],
				architectureQuestions: ['How does consistent hashing help caches and partitions at scale?'],
			},
			{
				id: 6,
				name: 'CQRS + Denormalization (Pragmatic)',
				description: 'Separate read/write models, reduce joins, speed reads.',
				conceptUrl: 'https://technori.com/news/cqrs-explained/',
				caseStudies: [],
				architectureQuestions: ['When does CQRS help vs just adding replicas?'],
			},
		],
	},

	// ============ MODULE 6: Caching ============
	{
		id: 6,
		topicName: 'Caching Strategies',
		description: 'Caching patterns, invalidation, and production pitfalls',
		concepts: [
			{
				id: 1,
				name: 'Caching Fundamentals (Eviction + Patterns)',
				description: 'LRU/LFU, cache-aside, write-through/back, consistency tradeoffs.',
				conceptUrl: 'https://interviewready.io/blog/cache-fundamentals',
				caseStudies: [
					{
						title: 'Slack: Flannel — Application-Level Edge Cache',
						url: 'https://slack.engineering/flannel-an-application-level-edge-cache-to-make-slack-scale/',
						source: 'Slack Engineering',
					},
					{
						title: 'Uber: Integrated Cache (CacheFront)',
						url: 'https://www.uber.com/en-IN/blog/how-uber-serves-over-40-million-reads-per-second-using-an-integrated-cache/',
						source: 'Uber Engineering',
					},
					{
						title: 'Instagram: Thundering Herds & Cache Promises',
						url: 'https://instagram-engineering.com/thundering-herds-promises-82191c8af57d',
						source: 'Instagram Engineering',
					},
				],
				architectureQuestions: ['Where would you cache and what would you never cache?'],
			},
			{
				id: 2,
				name: 'Cache Invalidation',
				description: 'TTL, write-through, event-driven invalidation, correctness.',
				conceptUrl: 'https://designgurus.substack.com/p/the-complete-guide-to-cache-invalidation',
				caseStudies: [],
				architectureQuestions: ['How do you keep cache correct during writes?'],
			},
			{
				id: 3,
				name: 'Cache Observability',
				description: 'Hot keys, TTL storms, cold starts, admission control.',
				conceptUrl: 'https://redis.io/tutorials/redis-software-observability-playbook/',
				caseStudies: [],
				architectureQuestions: ['How do you handle hot keys without melting Redis?'],
			},
			{
				id: 4,
				name: 'Redis Beyond Cache',
				description: 'Sessions, leaderboards, rate limiting, geo, queues.',
				conceptUrl: 'https://newsletter.systemdesign.one/p/redis-use-cases',
				caseStudies: [],
				architectureQuestions: ['When does Redis become a bad idea?'],
			},
		],
	},

	// ============ MODULE 7: CDN + Global Delivery ============
	{
		id: 7,
		topicName: 'Content Delivery Networks (CDN)',
		description: 'Edge delivery, caching, routing, global latency',
		concepts: [
			{
				id: 1,
				name: 'CDN Fundamentals',
				description: 'Edge POPs, cache keys, invalidation, geo routing, origin shielding.',
				conceptUrl: 'https://medium.com/globant/content-delivery-networks-explained-5a1feaa224c8',
				caseStudies: [
					{
						title: 'Netflix: Driving Content Delivery Efficiency (Cache Misses)',
						url: 'https://netflixtechblog.com/driving-content-delivery-efficiency-through-classifying-cache-misses-ffcf08026b6c',
						source: 'Netflix Tech Blog',
					},
					{
						title: 'Spotify: Aligning CDN Services for Streaming',
						url: 'https://engineering.atspotify.com/2020/2/how-spotify-aligned-cdn-services-for-a-lightning-fast-streaming-experience',
						source: 'Spotify Engineering',
					},
				],
				architectureQuestions: ['What do you cache at edge vs in app cache vs DB cache?'],
			},
		],
	},

	// ============ MODULE 8: Messaging + Async Processing ============
	{
		id: 8,
		topicName: 'Message Queues & Event Processing',
		description: 'Async workflows, streams vs queues, delivery guarantees, retries',
		concepts: [
			{
				id: 1,
				name: 'Queue vs Stream (RabbitMQ vs Kafka)',
				description: 'Push vs pull, ordering, replay, retention, fanout.',
				conceptUrl: 'https://www.confluent.io/learn/rabbitmq-vs-apache-kafka/',
				caseStudies: [
					{
						title: 'Atlassian: Why We Chose Kafka',
						url: 'https://www.atlassian.com/blog/atlassian-engineering/why-we-chose-kafka',
						source: 'Atlassian Engineering',
					},
				],
				architectureQuestions: ['When do you pick Kafka vs SQS/RabbitMQ?'],
			},
			{
				id: 2,
				name: 'Delivery Guarantees + Idempotent Consumers',
				description: 'At-most/at-least/exactly once in real systems; dedupe strategies.',
				conceptUrl:
					'https://www.cockroachlabs.com/blog/idempotency-and-ordering-in-event-driven-systems/',
				caseStudies: [
					{
						title: 'Slack: Scaling Job Queue',
						url: 'https://slack.engineering/scaling-slacks-job-queue/',
						source: 'Slack Engineering',
					},
					{
						title: 'Segment: Introducing Centrifuge',
						url: 'https://segment.com/blog/introducing-centrifuge/',
						source: 'Segment Engineering',
					},
					{
						title: 'DoorDash: Eliminating Task Processing Outages',
						url: 'https://doordash.engineering/2018/12/03/eliminating-task-processing-outages/',
						source: 'DoorDash Engineering',
					},
				],
				architectureQuestions: ['How do you design retries without double-processing?'],
			},
			{
				id: 3,
				name: 'Backpressure + Consumer Lag',
				description: 'Lag causes, scaling consumers, partition strategy, monitoring.',
				conceptUrl: 'https://www.groundcover.com/blog/kafka-slow-consumer',
				caseStudies: [
					{
						title: 'DoorDash: Scaling Kafka Consumers',
						url: 'https://careersatdoordash.com/blog/building-scalable-real-time-event-processing-with-kafka-and-flink/',
						source: 'DoorDash Engineering',
					},
				],
				architectureQuestions: ['What do you do when consumers are slower than producers?'],
			},
		],
	},

	// ============ MODULE 9: Real-Time Data Pipelines (Optional but strong) ============
	{
		id: 9,
		topicName: 'Real-Time Data Pipelines',
		description: 'Streaming ingestion, processing, real-time analytics, time-series',
		concepts: [
			{
				id: 1,
				name: 'Stream vs Batch (Migration)',
				description: 'Why streaming, how migration works, operational pitfalls.',
				conceptUrl:
					'https://www.uber.com/en-GB/blog/from-batch-to-streaming-accelerating-data-freshness-in-ubers-data-lake/',
				caseStudies: [],
				architectureQuestions: ['How do you migrate batch jobs to streaming safely?'],
			},
			{
				id: 2,
				name: 'Real-Time Data Highway (Razorpay)',
				description: 'Routing + classifying sensitive data; correctness + latency.',
				conceptUrl: 'https://razorpay.com/blog/data-classification-real-time-highway/',
				caseStudies: [
					{
						title: 'Netflix: Real-Time Analytics with Druid',
						url: 'https://netflixtechblog.com/how-netflix-uses-druid-for-real-time-insights-to-ensure-a-high-quality-experience-19e1e8568d06',
						source: 'Netflix Tech Blog',
					},
				],
				architectureQuestions: ['How do you keep streaming pipelines fault tolerant?'],
			},
			{
				id: 3,
				name: 'Time-Series Storage & Querying (Netflix)',
				description: 'High write throughput + fast queries for metrics/time-series.',
				conceptUrl:
					'https://netflixtechblog.com/introducing-netflix-timeseries-data-abstraction-layer-31552f6326f8',
				caseStudies: [],
				architectureQuestions: ['What storage strategy fits time-series workloads?'],
			},
			{
				id: 4,
				name: 'Real-Time User Signals Platform (Airbnb)',
				description: 'Events → features → ML; near-real-time serving requirements.',
				conceptUrl:
					'https://medium.com/airbnb-engineering/building-a-user-signals-platform-at-airbnb-b236078ec82b',
				caseStudies: [],
				architectureQuestions: ['How do you build a real-time feature pipeline for ML?'],
			},
		],
	},

	// ============ MODULE 10: Storage Systems (Object Storage + Uploads + Consistency) ============
	{
		id: 10,
		topicName: 'Storage Systems (Object Storage & Upload Flows)',
		description:
			'User uploads, blob/object storage, durability, and the DB-metadata + blob pattern',
		concepts: [
			{
				id: 1,
				name: 'Object Storage Basics (S3-like)',
				description: 'Objects/buckets, durability vs availability, why object storage exists.',
				conceptUrl: 'https://aws.amazon.com/what-is/object-storage/',
				caseStudies: [
					{
						title: 'Dropbox Tech: Object Store Abstraction (standard interface over blob backends)',
						url: 'https://dropbox.tech/infrastructure/abstracting-cloud-storage-backends-with-object-store',
						source: 'Dropbox Tech',
					},
				],
				architectureQuestions: ['When do you choose object storage over a database filesystem?'],
			},
			{
				id: 2,
				name: 'Durability: What "11 nines" really means',
				description: 'Durability vs availability; what failures are covered and what are not.',
				conceptUrl:
					'https://cloud.google.com/blog/products/storage-data-transfer/understanding-cloud-storage-11-9s-durability-target',
				caseStudies: [],
				architectureQuestions: ['What does 99.999999999% durability NOT guarantee?'],
			},
			{
				id: 3,
				name: 'Multipart Uploads (Chunked Uploads End-to-End)',
				description: 'Chunking, retries, parallelism, integrity, resumable uploads.',
				conceptUrl:
					'https://aws.amazon.com/blogs/compute/uploading-large-objects-to-amazon-s3-using-multipart-upload-and-transfer-acceleration/',
				caseStudies: [],
				architectureQuestions: ['How do you resume uploads after network failures?'],
			},
			{
				id: 4,
				name: 'Pre-Signed URL Uploads (Security Model)',
				description: 'Constraints, permissions, expiry, and common mistakes.',
				conceptUrl:
					'https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html',
				caseStudies: [],
				architectureQuestions: [
					'How do you prevent users from uploading to arbitrary paths/buckets?',
				],
			},
			{
				id: 5,
				name: 'DB Metadata + Object Store Blobs',
				description: 'Store metadata in DB, blobs in object store; how to keep them consistent.',
				conceptUrl: 'https://microservices.io/patterns/data/transactional-outbox.html',
				caseStudies: [],
				architectureQuestions: ['How do you avoid "dual writes" when saving metadata + blob?'],
			},
			{
				id: 6,
				name: 'Outbox Pattern (Failure Modes + Operations)',
				description: 'Why it works, replays, dedupe, ordering, and monitoring.',
				conceptUrl: 'https://www.decodable.co/blog/revisiting-the-outbox-pattern',
				caseStudies: [
					{
						title: 'InfoQ: Saga + Outbox (Consistency Trade-offs)',
						url: 'https://www.infoq.com/articles/saga-orchestration-outbox/',
						source: 'InfoQ',
					},
				],
				architectureQuestions: [
					'How do you recover when the outbox publisher is down for 2 hours?',
				],
			},
		],
	},

	// ============ MODULE 11: Search Systems (Separate, as you asked) ============
	{
		id: 11,
		topicName: 'Search Systems (Indexing, Ranking, Filters & Facets)',
		description: 'Inverted index, indexing pipelines, relevance, BM25, and faceted search',
		concepts: [
			{
				id: 1,
				name: 'Inverted Index Fundamentals',
				description: 'What it is and why it powers search.',
				conceptUrl: 'https://www.baeldung.com/cs/indexing-inverted-index',
				caseStudies: [],
				architectureQuestions: ["Why can't a DB index replace a search index for full-text?"],
			},
			{
				id: 2,
				name: 'Lucene/Elasticsearch: How Indexing + Queries Work',
				description: 'Indexing + query execution intuition.',
				conceptUrl: 'https://www.cockroachlabs.com/blog/inverted-indexes/',
				caseStudies: [
					{
						title: 'Uber: Indexing Streaming Data with Pull-Based Ingestion in OpenSearch',
						url: 'https://www.uber.com/en-IN/blog/how-uber-indexes-streaming-data-with-pull-based-ingestion-in-opensearch/',
						source: 'Uber Engineering',
					},
				],
				architectureQuestions: ['What are the stages in an indexing pipeline?'],
			},
			{
				id: 3,
				name: 'Relevance Scoring (BM25)',
				description: 'Why BM25, knobs, and impact on ranking quality.',
				conceptUrl:
					'https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables',
				caseStudies: [
					{
						title: 'Meta Engineering: Indexing & Ranking (relevance thinking)',
						url: 'https://engineering.fb.com/?s=ranking',
						source: 'Engineering at Meta',
					},
				],
				architectureQuestions: ['How do you tune ranking for "relevance" vs "freshness"?'],
			},
			{
				id: 4,
				name: 'Faceted Search (Filters + Facets)',
				description: "How facets work conceptually and how they're implemented.",
				conceptUrl:
					'https://www.elastic.co/search-labs/tutorials/search-tutorial/full-text-search/facets',
				caseStudies: [
					{
						title: 'LinkedIn Engineering: Faceted Search (Inverted Index + Facets)',
						url: 'https://www.linkedin.com/blog/engineering/archive/many-facets-faceted-search',
						source: 'LinkedIn Engineering',
					},
				],
				architectureQuestions: ['How do you implement facets without scanning all documents?'],
			},
		],
	},

	// ============ MODULE 12: API Design + Auth + Rate Limiting ============
	{
		id: 12,
		topicName: 'API Design, Authentication & Abuse Prevention',
		description: 'Long-lived APIs: naming, errors, pagination, versioning, auth, rate limits',
		concepts: [
			{
				id: 1,
				name: 'REST API Design Best Practices',
				description: 'Naming, errors, pagination, versioning, compatibility.',
				conceptUrl:
					'https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design',
				caseStudies: [
					{
						title: 'Microsoft REST API Guidelines',
						url: 'https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md',
						source: 'Microsoft',
					},
				],
				architectureQuestions: ["What's your error format and versioning plan from day-1?"],
			},
			{
				id: 2,
				name: 'API Versioning (Real-World Model)',
				description: 'Backward compatibility and controlled breaking changes.',
				conceptUrl: 'https://stripe.com/blog/api-versioning',
				caseStudies: [
					{
						title: 'Stripe: API Upgrades',
						url: 'https://docs.stripe.com/upgrades',
						source: 'Stripe',
					},
				],
				architectureQuestions: ['How do you ship breaking changes without breaking clients?'],
			},
			{
				id: 3,
				name: 'Idempotency for Retries',
				description: 'Prevent duplicate effects (payments/orders) under retries.',
				conceptUrl: 'https://stripe.com/blog/idempotency',
				caseStudies: [],
				architectureQuestions: ['Where do you enforce idempotency: gateway, service, DB?'],
			},
			{
				id: 4,
				name: 'Authentication: Sessions vs Tokens',
				description: 'Scaling auth; JWT vs sessions; rotation; security concerns.',
				conceptUrl: 'https://hayksimonyan.substack.com/p/authentication-explained-when-to',
				caseStudies: [],
				architectureQuestions: ['How do you invalidate tokens safely (logout/rotation)?'],
			},
			{
				id: 5,
				name: 'Rate Limiting (Algorithms + Distributed Design)',
				description: 'Token bucket/sliding window + Redis-based distributed limits.',
				conceptUrl: 'https://interviewready.io/blog/ratelimiting',
				caseStudies: [
					{
						title: 'Ramp: Rate Limiting with Redis',
						url: 'http://engineering.ramp.com/post/rate-limiting-with-redis',
						source: 'Ramp Engineering',
					},
				],
				architectureQuestions: ['How do you rate-limit across many API servers?'],
			},
		],
	},

	// ============ MODULE 13: Reliability + Observability ============
	{
		id: 13,
		topicName: 'Reliability & Observability',
		description: 'Prevent outages, debug fast, and design for failure',
		concepts: [
			{
				id: 1,
				name: 'Fault Tolerance vs High Availability',
				description: 'Redundancy, failover, SLAs; what "high availability" really means.',
				conceptUrl: 'https://systemdr.substack.com/p/fault-tolerance-vs-high-availability',
				caseStudies: [],
				architectureQuestions: ['What is your failover plan for DB/cache/service?'],
			},
			{
				id: 2,
				name: 'Retries + Backoff + Circuit Breakers',
				description: 'Stop retry storms; use jitter, timeouts, circuit breakers.',
				conceptUrl:
					'https://medium.com/agoda-engineering/how-agoda-solved-retry-storms-to-boost-system-reliability-9bf0d1dfbeee',
				caseStudies: [
					{
						title: 'Agoda: Solving Retry Storms',
						url: 'https://medium.com/agoda-engineering/how-agoda-solved-retry-storms-to-boost-system-reliability-9bf0d1dfbeee',
						source: 'Agoda Engineering',
					},
				],
				architectureQuestions: ['How do you prevent cascading failures in microservices?'],
			},
			{
				id: 3,
				name: 'Observability: Metrics, Logs, Traces (Golden Signals)',
				description: 'What to measure, dashboards, alerts, tracing and debugging incidents.',
				conceptUrl: 'https://sre.google/sre-book/monitoring-distributed-systems/',
				caseStudies: [],
				architectureQuestions: ['What 5 dashboards do you build on day-1?'],
			},
		],
	},

	// ============ MODULE 14: Capstone Projects (Separate, as you asked) ============
	{
		id: 14,
		topicName: 'Capstone Projects (Interview-Style)',
		description: 'End-to-end designs that force trade-offs across all previous modules',
		concepts: [
			{
				id: 1,
				name: 'Capstone: File Upload & Media Serving (S3 + CDN)',
				description:
					'Multipart upload, presigned URLs, metadata DB, CDN, lifecycle, abuse prevention.',
				conceptUrl:
					'https://aws.amazon.com/blogs/compute/uploading-large-objects-to-amazon-s3-using-multipart-upload-and-transfer-acceleration/',
				caseStudies: [],
				architectureQuestions: [
					'Design Google Drive / Dropbox upload flow.',
					'How do you handle retries, dedupe, and partial uploads?',
					'How do you keep DB metadata consistent with blob writes?',
				],
			},
			{
				id: 2,
				name: 'Capstone: Search for an E-commerce Catalog',
				description: 'Indexing pipeline, ranking, filters/facets, freshness, synonyms, monitoring.',
				conceptUrl: 'https://www.baeldung.com/cs/indexing-inverted-index',
				caseStudies: [
					{
						title: 'Pinterest Engineering: Universal Search',
						url: 'https://medium.com/pinterest-engineering/building-a-universal-search-system-for-pinterest-e4cb03a898d4',
						source: 'Pinterest Engineering',
					},
					{
						title: 'Shopify Engineering: Evaluating Search Algorithms',
						url: 'https://shopify.engineering/evaluating-search-algorithms',
						source: 'Shopify Engineering',
					},
				],
				architectureQuestions: [
					'How do you design indexing + reindexing?',
					'How do you measure relevance and regressions?',
					'How do facets work without scanning all docs?',
				],
			},
			{
				id: 3,
				name: 'Capstone: Live Comments / Chat Stream',
				description: 'WebSockets/SSE, ordering, fanout, partitions, moderation hooks.',
				conceptUrl: 'https://systemdesign.one/live-comment-system-design/',
				caseStudies: [],
				architectureQuestions: ['How do you guarantee ordering and scale fanout?'],
			},
			{
				id: 4,
				name: 'Capstone: Real-Time Leaderboard',
				description: 'Redis sorted sets, write amplification, ranking correctness.',
				conceptUrl: 'https://systemdesign.one/leaderboard-system-design/',
				caseStudies: [],
				architectureQuestions: ['How do you handle heavy writes and top-K reads?'],
			},
		],
	},
]

// Source favicon helper - uses Google's favicon service
export function getFaviconUrl(url: string): string {
	try {
		const domain = new URL(url).hostname
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
	} catch {
		return ''
	}
}

// Get source color for badge styling
export function getSourceColor(source: string): string {
	const colors: Record<string, string> = {
		Netflix: '#E50914',
		Uber: '#000000',
		'Uber Engineering': '#000000',
		Cloudflare: '#F38020',
		'Google Cloud': '#4285F4',
		Google: '#4285F4',
		YouTube: '#FF0000',
		Instagram: '#E4405F',
		'Instagram Engineering': '#E4405F',
		Facebook: '#1877F2',
		Amazon: '#FF9900',
		Discord: '#5865F2',
		'Discord Engineering': '#5865F2',
		LinkedIn: '#0A66C2',
		WhatsApp: '#25D366',
		Stripe: '#635BFF',
		Spotify: '#1DB954',
		'Spotify Engineering': '#1DB954',
		Airbnb: '#FF5A5F',
		'Airbnb Engineering': '#FF5A5F',
		Pinterest: '#E60023',
		'Pinterest Engineering': '#E60023',
		Twitter: '#1DA1F2',
		Slack: '#4A154B',
		'Slack Engineering': '#4A154B',
		PayPal: '#003087',
		eBay: '#E53238',
		Microsoft: '#00A4EF',
		HashiCorp: '#000000',
		EventStore: '#5C2D91',
		Twitch: '#9146FF',
		SoundCloud: '#FF5500',
		'Netflix Tech Blog': '#E50914',
		'Meta Engineering': '#1877F2',
		'Notion Engineering': '#000000',
		'Shopify Engineering': '#96BF48',
		'Grab Engineering': '#00B14F',
		'Atlassian Engineering': '#0052CC',
		'Segment Engineering': '#52BD95',
		'DoorDash Engineering': '#FF3008',
		'RevenueCat Blog': '#000000',
		'Ramp Engineering': '#000000',
		'Agoda Engineering': '#3A76F0',
		'Coinbase Blog': '#0052FF',
		'Meet A Pro Blog': '#666666',
	}
	return colors[source] || '#666666'
}

// Helper to get total concepts count
export function getTotalConcepts(): number {
	return MODULES.reduce((total, module) => total + module.concepts.length, 0)
}

// Helper to get total case studies count
export function getTotalCaseStudies(): number {
	return MODULES.reduce(
		(total, module) =>
			total + module.concepts.reduce((cTotal, concept) => cTotal + concept.caseStudies.length, 0),
		0
	)
}

// Helper to get total architecture questions count
export function getTotalArchitectureQuestions(): number {
	return MODULES.reduce(
		(total, module) =>
			total +
			module.concepts.reduce((cTotal, concept) => cTotal + concept.architectureQuestions.length, 0),
		0
	)
}
