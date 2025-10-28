import * as utils from "@/utils";
import NeonDB from "@/db/neon";
import { RandomFoodBot } from "@/bot";

// The Worker's environment bindings
interface Bindings {
	DATABASE_URL: string;
	API_TELEGRAM: string;
}

// Define the Worker logic
const worker: ExportedHandler<Bindings> = {
	async fetch(req, env) {
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
			return utils.toError(`Unknown "${path}" URL; try "/api/randomfood" instead.`, 404);
		}

		try {
			const content = await req.json() as any;
			const request = { content };
			
			// Handle different types of updates
			if (content.message) {
				return await bot.handleMessage(request);
			} else if (content.callback_query) {
				return await bot.handleCallback(request);
			} else {
				return utils.toJSON("OK");
			}
		} catch (err) {
			const msg = (err as Error).message || "Error with query.";
			return utils.toJSON(msg, 200);
		}
	},

	async scheduled(event, env, ctx) {
		console.log("cron processed");
	},
};

// Export for discoverability
export default worker;