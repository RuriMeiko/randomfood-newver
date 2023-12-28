import * as Realm from "realm-web";
import * as utils from "./utils";

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
		async function sendMessage(
			text: any,
			chatId: number,
			inline_keyboard = undefined,
			save = false,
			parse_mode = "HTML"
		) {
			// @ts-ignore
			const base_url = `https://api.telegram.org/bot${env.API_TELEGRAM}/sendMessage`;
			const params = new URLSearchParams({
				chat_id: chatId.toString(),
				text: text,
				parse_mode: parse_mode,
			});
			if (inline_keyboard) {
				const keyboard = JSON.stringify({ inline_keyboard: inline_keyboard });
				params.set("reply_markup", keyboard);
			}
			const url = `${base_url}?${params.toString()}`;
			const response = await fetch(url).then((resp) => resp.json());
			if (save) {
				// @ts-ignore
				await KV.put("last_message", `${response.result.message_id}:${text}`);
			}
			return response;
		}
		// Hàm edit tin nhắn tới telegram dựa vào request POST, dùng fetch để gửi
		async function editMessage(
			text: any,
			chatId: number,
			messageId: number,
			inline_keyboard = undefined,
			parse_mode = "HTML"
		) {
			// @ts-ignore
			const base_url = `https://api.telegram.org/bot${env.API_TELEGRAM}/editMessageText`;
			const params = new URLSearchParams({
				chat_id: chatId.toString(),
				message_id: messageId.toString(),
				text: text,
				parse_mode: parse_mode,
			});
			if (inline_keyboard) {
				const keyboard = JSON.stringify({ inline_keyboard: inline_keyboard });
				params.set("reply_markup", keyboard);
			}
			const url = `${base_url}?${params.toString()}`;
			const response = await fetch(url).then((resp) => resp.json());
			return response;
		}
		async function answerCallbackQuery(
			callbackQueryId: number,
			text = undefined,
			showAlert = false
		) {
			// @ts-ignore
			const base_url = `https://api.telegram.org/bot${env.API_TELEGRAM}/answerCallbackQuery`;
			const params = new URLSearchParams({
				callback_query_id: callbackQueryId.toString(),
				show_alert: showAlert.toString(),
			});
			if (text) {
				params.set("text", text);
			}
			const url = `${base_url}?${params.toString()}`;
			const response = await fetch(url).then((resp) => resp.json());
			return response;
		}
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

		try {
			// POST
			if (method === "POST") {
				const payload: JSON = await req.json();

				if ("callback_query" in payload) {
					// @ts-ignore
					const data_callback = payload.callback_query.data;
					console.log(data_callback);
					// const result = await collection_credit.insertOne(data);
					return utils.reply(payload);
				} else if ("message" in payload) {
					// @ts-ignore
					const chatId: number = payload.message.chat.id;
					// @ts-ignore
					const textContent: string = payload.message.text;
					// const result = await collection_credit.insertOne(data);
					switch (textContent) {
						case "/start":
							return utils.reply(
								await sendMessage(JSON.stringify(payload), 1775446945)
							);
						case "/help":
							return utils.reply(await sendMessage("híp mi", 1775446945));
						case "/debt":
							return utils.reply(await sendMessage("nợ nợ", 1775446945));
						default:
							return utils.reply(
								await sendMessage(JSON.stringify(payload), 1775446945)
							);
					}
				} else {
					return utils.reply("ok_all");
				}
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
