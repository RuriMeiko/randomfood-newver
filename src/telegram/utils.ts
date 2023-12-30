import * as utils from "../utils";
import { supportedLanguages, type supportedLanguagesType } from "./data";
class BotModel {
	private token: any;
	private commands: any;
	private url: string;
	message: any;
	database: any;
	constructor(config: any) {
		this.token = config.token;
		this.commands = config.commands;
		this.url = "https://api.telegram.org/bot" + this.token;
		this.database = config.database;
	}
	async update(request: any) {
		try {
			this.message = request.content.message;
			// console.log(this.message);
			if (this.message.hasOwnProperty("text")) {
				// process text

				// Test command and execute
				if (!(await this.executeCommand(request))) {
					// Test is not a command
					// await this.sendMessage("This is not a command", this.message.chat.id);
				}
			} else if (this.message.hasOwnProperty("photo")) {
				// process photo
				console.log(this.message.photo);
			} else if (this.message.hasOwnProperty("video")) {
				// process video
				console.log(this.message.video);
			} else if (this.message.hasOwnProperty("animation")) {
				// process animation
				console.log(this.message.animation);
			} else if (this.message.hasOwnProperty("locaiton")) {
				// process locaiton
				console.log(this.message.locaiton);
			} else if (this.message.hasOwnProperty("poll")) {
				// process poll
				console.log(this.message.poll);
			} else if (this.message.hasOwnProperty("contact")) {
				// process contact
				console.log(this.message.contact);
			} else if (this.message.hasOwnProperty("dice")) {
				// process dice
				console.log(this.message.dice);
			} else if (this.message.hasOwnProperty("sticker")) {
				// process sticker
				console.log(this.message.sticker);
			} else if (this.message.hasOwnProperty("reply_to_message")) {
				// process reply of a message
				console.log(this.message.reply_to_message);
			} else if (this.message.hasOwnProperty("callback_query")) {
				console.log(this.message.callback_query);
				// payload.callback_query.data;
				// console.log(data_callback);
				// // const result = await collection_credit.insertOne(data);
				// return utils.reply(payload);
			} else {
				// process unknown type
				console.log(this.message);
			}
		} catch (error: JSON | any) {
			console.error(error);
			return utils.toError(error.message);
		}
		// return 200 OK response to every update request
		return utils.toJSON("OK");
	}
	escapeHtml(str: string): string {
		const escapeMap: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return str.replace(/[&<>"']/g, (match) => escapeMap[match]);
	}
	makeHtmlCode(str: string, language: supportedLanguagesType): string {
		// Kiểm tra xem ngôn ngữ có được hỗ trợ hay không
		if (!supportedLanguages.includes(language)) {
			return `<pre>${this.escapeHtml(str)}</pre>`;
		}
		// Tạo mã HTML với thẻ <code> và cấu trúc cho ngôn ngữ cụ thể
		return `<pre><code class="language-${language}">${this.escapeHtml(str)}</code></pre>`;
	}

	async executeCommand(req: any) {
		let cmdArray = this.message.text.split(" ");
		const command = cmdArray.shift();
		const isCommand = Object.keys(this.commands).includes(command);
		if (isCommand) {
			await this.commands[command](this, req, cmdArray);
			return true;
		}
		return false;
	}

	async sendMessage(
		text: string,
		chatId: number,
		inline_keyboard = undefined,
		parse_mode = "HTML"
	) {
		// @ts-ignore
		const base_url = `${this.url}/sendMessage`;
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
		return response;
	}
	// Hàm edit tin nhắn tới telegram dựa vào request POST, dùng fetch để gửi
	async editMessage(
		text: string,
		chatId: number,
		messageId: number,
		inline_keyboard = undefined,
		parse_mode = "HTML"
	) {
		// @ts-ignore
		const base_url = `${this.url}/editMessageText`;
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
	async answerCallbackQuery(callbackQueryId: number, text = undefined, showAlert = false) {
		// @ts-ignore
		const base_url = `${this.url}/answerCallbackQuery`;
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
}

class randomfoodBot extends BotModel {
	constructor(config: any) {
		super(config);
	}
	// bot command: /start
	async start(req: any, args: any) {
		const collectionCredit = this.database.db("randomfood").collection("creditdatabase");
		const text = await collectionCredit.insertOne({ hi: this.message.text });
		await this.sendMessage(
			this.makeHtmlCode(JSON.stringify(text, null, 2), "JSON"),
			this.message.chat.id
		);
	}
	async about(req: any, args: any) {
		const text = "Bot này tạo ra bởi <b>nthl</b> aka <b>rurimeiko</b> ヽ(✿ﾟ▽ﾟ)ノ";
		await this.sendMessage(text, this.message.chat.id);
	}
	async help(req: any, args: any) {
		// const text = "help mi";
		const collectionCredit = this.database.db("randomfood").collection("creditdatabase");
		const text = await collectionCredit.find();
		await this.sendMessage(this.makeHtmlCode(JSON.stringify(text, null, 2),"JSON"), this.message.chat.id);
	}
	async debt(req: any, args: any) {
		console.log(args);
		const text = "nợ nần eo oi";
		await this.sendMessage(text, this.message.chat.id);
	}
}

export default class Handler {
	configs: any;
	token: any;
	response: Response;
	request: any;
	bot: randomfoodBot | undefined;
	constructor(configs: any) {
		this.configs = configs;
		this.token = this.configs.token;
		this.response = new Response();
	}

	async handle(request: any) {
		this.request = await this.processRequest(request);
		this.bot = new randomfoodBot({
			database: this.configs.database,
			token: this.token, // Bot Token
			commands: this.configs.commands, // Bot commands
		});

		if (
			this.request.method === "POST" &&
			this.request.type.includes("application/json") &&
			this.request.size > 6 &&
			this.request.content.message
		)
			this.response = await this.bot.update(this.request);
		else this.response = this.error(this.request.content.error);
		return this.response;
	}
	error(error: any): Response {
		throw new Error(error);
	}

	async processRequest(req: any) {
		let request = req;
		request.size = parseInt(request.headers.get("content-length")) || 0;
		request.type = request.headers.get("content-type") || "";
		if (request.size && request.type) request.content = await this.getContent(request);
		else
			request.content = {
				message: "",
				error: "Invalid content type or body",
			};
		return request;
	}
	async getContent(request: any) {
		if (request.type.includes("application/json")) {
			return await request.json();
		}
		return {
			message: "",
			error: "Invalid content/content type",
		};
	}
}
