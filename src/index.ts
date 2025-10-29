import * as utils from "@/utils";
import NeonDB from "@/db/neon";
import { RandomFoodBot } from "@/bot";
import { ModernRandomFoodBot } from "@/bot/modern-bot";
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

		// Initialize modern bot
		const modernBot = new ModernRandomFoodBot({
			database: database,
			telegramToken: env.API_TELEGRAM,
		});

		// Keep legacy bot for fallback if needed
		const legacyBot = new RandomFoodBot({
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
			const update = await req.json() as any;
			
			log.debug('Webhook update received', { 
				updateId: update.update_id,
				hasMessage: !!update.message,
				hasCallback: !!update.callback_query,
				messageText: update.message?.text?.substring(0, 50),
				callbackData: update.callback_query?.data
			});
			
			// Use modern bot for handling updates
			return await modernBot.handleUpdate(update);
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