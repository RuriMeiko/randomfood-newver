import * as utils from "../utils";

class BotModel {
	private token: any;
	private commands: any;
	private url: string;
	message: any;
	constructor(config: any) {
		this.token = config.token;
		this.commands = config.commands;
		this.url = "https://api.telegram.org/bot" + config.token;
	}
	async update(request: any) {
		try {
			console.log(request);
			this.message = request.content.message;
			console.log(this.message);
			if (this.message.hasOwnProperty("text")) {
				// process text

				// Test command and execute
				if (!(await this.executeCommand(request))) {
					// Test is not a command
					await this.sendMessage("This is not a command", this.message.chat.id);
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
	async sendMessage(text: any, chatId: number, inline_keyboard = undefined, parse_mode = "HTML") {
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
		text: any,
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

class TelegramBot extends BotModel {
	constructor(config: any) {
		super(config);
	}

	// bot command: /start
	async start(req: any, args: any) {
		console.log(args);
		const text = "start_nek";
		await this.sendMessage(text, this.message.chat.id);
	}
}

export default class Handler {
	async processRequest(req: any) {
		let request = req;
		request.size = parseInt(request.headers.get("content-length")) || 0;
		request.type = request.headers.get("content-type") || "";
		if (request.size && request.type) request.content = await this.getContent(request);
		else if (request.method == "GET")
			request.content = {
				message: "Accessing webhook",
			};
		else
			request.content = {
				message: "",
				error: "Invalid content type or body",
			};
		console.log(req);
		return request;
	}
	async getContent(request: any) {
		try {
			if (request.type.includes("application/json")) {
				return await request.json();
			} else if (request.type.includes("text/")) {
				return await request.text();
			} else if (request.type.includes("form")) {
				const formData = await request.formData();
				const body: any = {};
				for (const entry of formData.entries()) {
					body[entry[0]] = entry[1];
				}
				return body;
			} else {
				const arrayBuff = await request.arrayBuffer();
				const objectURL = URL.createObjectURL(arrayBuff);
				return objectURL;
			}
		} catch (error: any) {
			console.error(error.message);
			return {
				message: "",
				error: "Invalid content/content type",
			};
		}
	}
}
