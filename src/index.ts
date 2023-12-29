import * as Realm from "realm-web";
import * as utils from "./utils";
import TelegramBot from "./telegram/utils";
// The Worker's environment bindings. See `wrangler.toml` file.
interface Bindings {
	// MongoDB Realm Application ID
	REALM_APPID: string;
	API_TOKEN: string;
	API_TELEGRAM: string;
}

let App: Realm.App;
const ObjectId = Realm.BSON.ObjectID;

// Define the Worker logic
const worker: ExportedHandler<Bindings> = {
	async fetch(req, env) {
		// Hàm gửi tin nhắn tới telegram dựa vào request POST, dùng fetch để gửi

		const url = new URL(req.url);
		App = App || new Realm.App(env.REALM_APPID);

		const method = req.method;
		const path = url.pathname.replace(/[/]$/, "");
		if (path !== "/api/randomfood") {
			return utils.toError(`Unknown "${path}" URL; try "/api/randomfood" instead.`, 404);
		}
		try {
			const credentials = Realm.Credentials.apiKey(env.API_TOKEN);
			// Attempt to authenticate
			var user = await App.logIn(credentials);
			var client = user.mongoClient("mongodb-atlas");
		} catch (err) {
			return utils.toError("Error with authentication.", 500);
		}

		const collection_credit = client.db("randomfood").collection("creditdatabase");
		const commands = {
			start: async (bot: any, req: any, args: any) => await bot.start(req, args),
			help: async (bot: any, req: any, args: any) => await bot.help(req, args),
			debt: async (bot: any, req: any, args: any) => await bot.debt(req, args),
		};
		const botConfig = {
			token: env.API_TELEGRAM,
			commands: {
				"/start": commands.start,
				"/help": commands.help,
				"/debt": commands.debt,
			},
		};
		const bot = new TelegramBot(botConfig);

		try {
			// GET
			// if (method === "GET") {
			// 	const payload: JSON = await req.json();

			// 	bot.update(payload);
			// }
			// POST
			if (method === "POST") {
				const payload: JSON = await req.json();
				bot.update(payload);
				// if ("callback_query" in payload) {
				// 	// @ts-ignore
				// 	const data_callback = payload.callback_query.data;
				// 	console.log(data_callback);
				// 	// const result = await collection_credit.insertOne(data);
				// 	return utils.reply(payload);
				// } else if ("message" in payload) {
				// 	// @ts-ignore
				// 	const chatId: number = payload.message.chat.id;
				// 	// @ts-ignore
				// 	const textContent: string = payload.message.text;
				// 	// const result = await collection_credit.insertOne(data);
				// 	switch (textContent) {
				// 		case "/start":
				// 			return utils.reply(
				// 				await bot.sendMessage(JSON.stringify(payload), 1775446945)
				// 			);
				// 		case "/help":
				// 			return utils.reply(await bot.sendMessage("híp mi", 1775446945));
				// 		case "/debt":
				// 			return utils.reply(await bot.sendMessage("nợ nợ", 1775446945));
				// 		default:
				// 			return utils.reply(
				// 				await bot.sendMessage(JSON.stringify(payload), 1775446945)
				// 			);
				// 	}
				// } else {
				// 	return utils.reply("ok_all");
				// }
			}

			// unknown method
			return utils.toError("Method not allowed.", 405);
		} catch (err) {
			const msg = (err as Error).message || "Error with query.";
			return utils.toError(msg, 500);
		}
	},
};

// Export for discoverability
export default worker;
