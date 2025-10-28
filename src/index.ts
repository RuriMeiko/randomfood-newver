import * as utils from "@/utils";
import NeonDB from "@/db/neon";
import { RandomFoodBot } from "@/bot";
import { log, LogLevel, logger } from "@/utils/logger";

// The Worker's environment bindings
interface Bindings {
	DATABASE_URL: string;
	API_TELEGRAM: string;
}

// Define the Worker logic
const worker: ExportedHandler<Bindings> = {
	async fetch(req, env) {
		// Initialize logging
		logger.setContext('Worker');
		logger.setLogLevel(LogLevel.INFO); // Change to DEBUG for development
		
		log.info('Worker started', { 
			url: req.url,
			method: req.method,
			userAgent: req.headers.get('User-Agent')?.substring(0, 50) 
		});

		// Initialize database
		const database = new NeonDB({
			connectionString: env.DATABASE_URL,
		});

		// Initialize bot
		const bot = new RandomFoodBot({
			token: env.API_TELEGRAM,
			userBot: "randomfoodruribot",
			database: database,
		});

		// Parse request
		const url = new URL(req.url);
		const path = url.pathname.replace(/[/]$/, "");
		
		if (path !== "/api/randomfood") {
			log.warn('Unknown path accessed', { path, method: req.method });
			return utils.toError(`Unknown "${path}" URL; try "/api/randomfood" instead.`, 404);
		}

		try {
			const content = await req.json() as any;
			const request = { content };
			
			log.debug('Request content received', { 
				hasMessage: !!content.message,
				hasCallback: !!content.callback_query,
				updateId: content.update_id 
			});
			
			// Handle different types of updates
			if (content.message) {
				return await bot.handleMessage(request);
			} else if (content.callback_query) {
				return await bot.handleCallback(request);
			} else {
				log.debug('Unknown update type received', { keys: Object.keys(content) });
				return utils.toJSON("OK");
			}
		} catch (err) {
			const error = err as Error;
			log.error('Worker error', error, { 
				path,
				method: req.method,
				contentType: req.headers.get('Content-Type')
			});
			const msg = error.message || "Error with query.";
			return utils.toJSON(msg, 200);
		}
	},

	async scheduled(event, env, ctx) {
		console.log("cron processed");
	},
};

// Export for discoverability
export default worker;