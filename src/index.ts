import * as utils from "./utils";
import Handler from "./telegram/utils";
import Mogodb from "./mongodb/init";
import botCommands from "./telegram/command"
// The Worker's environment bindings. See `wrangler.toml` file.
interface Bindings {
	// MongoDB Realm Application ID
	REALM_APPID: string;
	API_MONGO_TOKEN: string;
	API_TELEGRAM: string;
}

// Define the Worker logic
const worker: ExportedHandler<Bindings> = {
	async fetch(req, env) {
		const initMongo = new Mogodb(env.REALM_APPID, env.API_MONGO_TOKEN);
		const database = await initMongo.getMongoClient();
		const url = new URL(req.url);
		const path = url.pathname.replace(/[/]$/, "");
		if (path !== "/api/randomfood") {
			return utils.toError(`Unknown "${path}" URL; try "/api/randomfood" instead.`, 404);
		}
		const botConfig = {
			database: database,
			token: env.API_TELEGRAM,
			commands: {
				"/start": botCommands.start,
				"/help": botCommands.help,
				"/debt": botCommands.debt,
				"/debthistory": botCommands.debthistory,
				"/debtcreate": botCommands.debtcreate,
				"/debtpay": botCommands.debtpay,
				"/debtdelete": botCommands.debtdelete,
				"/debthelp": botCommands.debthelp,
				"/about": botCommands.about,
			},
		};
		const bot = new Handler(botConfig);

		try {
			return bot.handle(req);
		} catch (err) {
			const msg = (err as Error).message || "Error with query.";
			return utils.toError(msg, 500);
		}
	},
};

// Export for discoverability
export default worker;
