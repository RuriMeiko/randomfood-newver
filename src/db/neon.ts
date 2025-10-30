import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, gte, and, sql } from 'drizzle-orm';
import * as schema from './schema';
import { log } from '@/utils/logger';

export class NeonError extends Error {
	status: any;
	title: any;
	meta!: { link: any };
	constructor({ error, error_code, link }: any, status: any = 500) {
		super(error);
		this.name = "NeonError";
		this.status = status;
		if (error_code) this.title = error_code;
		if (link) this.meta = { link };
	}
}

export default class NeonDB {
	private database: any;
	private neonClient: any;
	private currentTable: string | null = null;

	constructor({ connectionString }: { connectionString: string }) {
		if (!connectionString) {
			throw new NeonError({ error: "The `connectionString` must be set." });
		}
		
		this.neonClient = neon(connectionString);
		this.database = drizzle(this.neonClient, { schema });
	}

	// Set table/collection equivalent
	collection(tableName: string): NeonDB {
		this.currentTable = tableName;
		return this;
	}

	// Database selection (not needed for Neon, but keeping for compatibility)
	db(database: string): NeonDB {
		// In Neon, we don't switch databases like MongoDB
		return this;
	}

	private getTable() {
		if (!this.currentTable) {
			throw new NeonError({ error: "Table must be set before calling this method." });
		}
		
		switch (this.currentTable) {
			case 'food_suggestions':
				return schema.foodSuggestions;
			case 'debts':
				return schema.debts;
			case 'chat_members':
				return schema.chatMembers;
			case 'ai_conversations':
				return schema.aiConversations;
			case 'conversation_messages':
				return schema.conversationMessages;
			case 'conversation_summaries':
				return schema.conversationSummaries;
			case 'bot_memories':
				return schema.botMemories;
			case 'bot_moods':
				return schema.botMoods;
			case 'debt_records':
				return schema.debtRecords;
			default:
				throw new NeonError({ error: `Unknown table: ${this.currentTable}` });
		}
	}

	/**
	 * Find and return a list of documents/records.
	 */
	async find({
		filter = {},
		projection,
		sort,
		limit,
		skip,
	}: {
		filter?: any;
		projection?: any;
		sort?: any;
		limit?: number;
		skip?: number;
	} = {}): Promise<{ documents: Array<any> }> {
		try {
			const table = this.getTable();
			let query = this.database.select().from(table);

			// Apply filters
			if (filter && Object.keys(filter).length > 0) {
				query = this.applyFilters(query, filter, table);
			}

			// Apply sorting
			if (sort && Object.keys(sort).length > 0) {
				query = this.applySorting(query, sort, table);
			}

			// Apply limit and offset
			if (limit) query = query.limit(limit);
			if (skip) query = query.offset(skip);

			const documents = await query;
			return { documents };
		} catch (error: any) {
			throw new NeonError({ error: error.message });
		}
	}

	/**
	 * Find and return the first document matching the filter.
	 */
	async findOne({
		filter = {},
		projection,
	}: {
		filter?: any;
		projection?: any;
	} = {}): Promise<{ document: any }> {
		try {
			const table = this.getTable();
			let query = this.database.select().from(table);

			if (filter && Object.keys(filter).length > 0) {
				query = this.applyFilters(query, filter, table);
			}

			query = query.limit(1);
			const result = await query;
			return { document: result[0] || null };
		} catch (error: any) {
			throw new NeonError({ error: error.message });
		}
	}

	/**
	 * Insert a single document/record.
	 */
	async insertOne(document: any): Promise<{ insertedId: string }> {
		try {
			const table = this.getTable();
			const result = await this.database.insert(table).values(document).returning({ id: table.id || sql`id` });
			return { insertedId: result[0].id.toString() };
		} catch (error: any) {
			throw new NeonError({ error: error.message });
		}
	}

	/**
	 * Insert multiple documents/records.
	 */
	async insertMany(documents: any[]): Promise<{ insertedIds: Array<string> }> {
		try {
			const table = this.getTable();
			const result = await this.database.insert(table).values(documents).returning({ id: table.id || sql`id` });
			return { insertedIds: result.map((r: any) => r.id.toString()) };
		} catch (error: any) {
			throw new NeonError({ error: error.message });
		}
	}

	/**
	 * Update a single document/record.
	 */
	async updateOne({
		filter,
		update,
		upsert = false,
	}: {
		filter: any;
		update: any;
		upsert?: boolean;
	}): Promise<{ matchedCount: number; modifiedCount: number; upsertedId?: string }> {
		try {
			const table = this.getTable();
			
			// Convert MongoDB $set syntax to plain object
			const updateData = update.$set || update;
			updateData.updatedAt = new Date();

			let query = this.database.update(table).set(updateData);
			query = this.applyFilters(query, filter, table);

			const result = await query.returning({ id: table.id || sql`id` });
			
			if (result.length === 0 && upsert) {
				// Perform upsert
				const insertResult = await this.insertOne({ ...filter, ...updateData });
				return { matchedCount: 0, modifiedCount: 0, upsertedId: insertResult.insertedId };
			}

			return { matchedCount: result.length, modifiedCount: result.length };
		} catch (error: any) {
			throw new NeonError({ error: error.message });
		}
	}

	/**
	 * Delete a single document/record.
	 */
	async deleteOne({ filter }: { filter: any }): Promise<{ deletedCount: number }> {
		try {
			const table = this.getTable();
			let query = this.database.delete(table);
			query = this.applyFilters(query, filter, table);
			
			const result = await query.returning({ id: table.id || sql`id` });
			return { deletedCount: result.length };
		} catch (error: any) {
			throw new NeonError({ error: error.message });
		}
	}

	/**
	 * Delete multiple documents/records.
	 */
	async deleteMany({ filter }: { filter: any }): Promise<{ deletedCount: number }> {
		try {
			const table = this.getTable();
			let query = this.database.delete(table);
			query = this.applyFilters(query, filter, table);
			
			const result = await query.returning({ id: table.id || sql`id` });
			return { deletedCount: result.length };
		} catch (error: any) {
			throw new NeonError({ error: error.message });
		}
	}

	/**
	 * Aggregate - simplified version for common use cases
	 */
	async aggregate({ pipeline }: { pipeline: any[] }): Promise<{ documents: Array<any> }> {
		try {
			const table = this.getTable();
			
			// Handle $sample stage (random selection)
			const sampleStage = pipeline.find(stage => stage.$sample);
			if (sampleStage) {
				const size = sampleStage.$sample.size || 1;
				const query = this.database.select().from(table).orderBy(sql`RANDOM()`).limit(size);
				const documents = await query;
				return { documents };
			}

			// Default: return all documents
			const documents = await this.database.select().from(table);
			return { documents };
		} catch (error: any) {
			throw new NeonError({ error: error.message });
		}
	}

	private applyFilters(query: any, filter: any, table: any) {
		const conditions: any[] = [];

		for (const [key, value] of Object.entries(filter)) {
			if (key === '_id' || key === 'id') {
				// Handle MongoDB _id -> PostgreSQL id conversion
				conditions.push(eq(table.id, value as string));
			} else if (key === 'userid') {
				conditions.push(eq(table.userid, value as string));
			} else if (typeof value === 'object' && value !== null) {
				// Handle MongoDB operators
				const objValue = value as any;
				if ('$gte' in objValue) {
					const dateValue = objValue.$gte instanceof Date ? objValue.$gte : new Date(objValue.$gte);
					conditions.push(gte(table[key], dateValue));
				}
				if ('$oid' in objValue) {
					// Handle ObjectId references
					const idValue = parseInt(objValue.$oid) || objValue.$oid;
					conditions.push(eq(table[key], idValue));
				}
			} else {
				conditions.push(eq(table[key], value));
			}
		}

		if (conditions.length === 1) {
			return query.where(conditions[0]);
		} else if (conditions.length > 1) {
			return query.where(and(...conditions));
		}

		return query;
	}

	private applySorting(query: any, sort: any, table: any) {
		for (const [key, direction] of Object.entries(sort)) {
			if (direction === -1) {
				query = query.orderBy(desc(table[key]));
			} else {
				query = query.orderBy(table[key]);
			}
		}
		return query;
	}

	/**
	 * Execute raw SQL query - needed for AI bot service
	 * Uses neon client's query method for proper parameter handling
	 */
	async query(sqlString: string, params: any[] = []): Promise<any[]> {
		try {
			if (params.length === 0) {
				// No parameters - use tagged template
				return await this.neonClient`${sqlString}`;
			} else {
				// With parameters - use neon client's query method
				return await this.neonClient.query(sqlString, params);
			}
		} catch (error: any) {
			log.error('Database query error', error, { 
				sqlString: sqlString.substring(0, 100), 
				paramCount: params.length,
				errorMessage: error.message 
			});
			throw new NeonError({ error: `Failed to execute query: ${error.message}` });
		}
	}
}