import * as utils from "../utils";
import { supportedLanguages, type InlineKeyboard, type supportedLanguagesType } from "./data";
import anni from "../anniversary";
import type MongoDB from "../mongodb/init";
import type bingImgCreater from "../bing/bing@imgcreater";
class BotModel {
	private token: any;
	private commands: any;
	private url: string;
	bingImageCT: bingImgCreater;
	message: any;
	database: MongoDB;
	userBot: any;
	constructor(config: any) {
		this.bingImageCT = config.bingImageCT;
		this.token = config.token;
		this.commands = config.commands;
		this.url = "https://api.telegram.org/bot" + this.token;
		this.database = config.database;
		this.userBot = config.userBot;
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
	async updateCallback(request: any) {
		try {
			this.message = request.content.callback_query;

			await this.sendMessage(
				this.makeHtmlCode(JSON.stringify(this.message, null, 2), "JSON"),
				this.message.message.chat.id
			);
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
		let command: string = cmdArray.shift();
		if (command.endsWith("@" + this.userBot)) {
			let cmdArray2 = command.split("@");
			//@ts-ignore
			command = cmdArray2.shift();
		}
		const isCommand = Object.keys(this.commands).includes(command);
		if (isCommand) {
			await this.commands[command](this, req, cmdArray.join(""));
			return true;
		}
		return false;
	}

	async sendMessage(
		text: string,
		chatId: number,
		inlineKeyboard: InlineKeyboard | undefined = undefined,
		parseMode: string = "HTML"
	) {
		const base_url = `${this.url}/sendMessage`;

		const body = {
			chat_id: chatId,
			text: text,
			parse_mode: parseMode,
			reply_markup: inlineKeyboard
				? { inline_keyboard: inlineKeyboard }
				: { remove_keyboard: true },
		};

		try {
			const response: Response = await fetch(base_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			}).then((resp) => resp.json());

			return response;
		} catch (error: any) {
			console.error("Error sending message:", error.message);
			return null;
		}
	}
	async sendMediaGroup(
		photoUrls: string[],
		chatId: number,
		caption: string = "",
		parseMode: string = "HTML"
	) {
		const base_url = `${this.url}/sendMediaGroup`;

		const photos = photoUrls.map((photoUrl) => ({
			type: "photo",
			media: photoUrl,
			caption: caption,
		}));

		const body = {
			chat_id: chatId,
			media: photos,
			parse_mode: parseMode,
			caption: caption,
		};

		try {
			const response = await fetch(base_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			}).then((resp) => resp.json());

			return response;
		} catch (error: any) {
			console.error("Error sending media group:", error.message);
			return null;
		}
	}
	async sendSticker(
		stickerId: string,
		chatId: number,
		replyMarkup: InlineKeyboard | undefined = undefined
	) {
		const base_url = `${this.url}/sendSticker`;

		const body = {
			chat_id: chatId,
			sticker: stickerId,
			reply_markup: replyMarkup
				? { inline_keyboard: replyMarkup }
				: { remove_keyboard: true },
		};

		try {
			const response: Response = await fetch(base_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			}).then((resp) => resp.json());

			return response;
		} catch (error: any) {
			console.error("Error sending sticker:", error.message);
			return null;
		}
	}

	async sendPhoto(
		photoUrls: string,
		chatId: number,
		caption: string = "",
		inlineKeyboard: InlineKeyboard | undefined = undefined,
		parseMode: string = "HTML"
	) {
		const base_url = `${this.url}/sendPhoto`;

		const body = {
			chat_id: chatId,
			photo: photoUrls,
			parse_mode: parseMode,
			caption: caption,
			reply_markup: inlineKeyboard
				? { inline_keyboard: inlineKeyboard }
				: { remove_keyboard: true },
		};

		try {
			const response = await fetch(base_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			}).then((resp) => resp.json());

			return response;
		} catch (error: any) {
			console.error("Error sending photos:", error.message);
			return null;
		}
	}

	// Hàm edit tin nhắn tới telegram dựa vào request POST, dùng fetch để gửi
	async editMessage(
		text: string,
		chatId: number,
		messageId: number,
		inlineKeyboard: InlineKeyboard | undefined = undefined,
		parseMode: string = "HTML"
	) {
		const base_url = `${this.url}/editMessageText`;

		const body = {
			chat_id: chatId,
			message_id: messageId,
			text: text,
			parse_mode: parseMode,
			reply_markup: inlineKeyboard
				? { inline_keyboard: inlineKeyboard }
				: { remove_keyboard: true },
		};

		try {
			const response = await fetch(base_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			}).then((resp) => resp.json());

			return response;
		} catch (error: any) {
			console.error("Error editing message:", error.message);
			return null;
		}
	}
	async answerCallbackQuery(
		callbackQueryId: number,
		text: string | undefined = undefined,
		showAlert: boolean = false
	) {
		const base_url = `${this.url}/answerCallbackQuery`;

		const body = {
			callback_query_id: callbackQueryId,
			text: text,
			show_alert: showAlert,
		};

		try {
			const response = await fetch(base_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			}).then((resp) => resp.json());

			return response;
		} catch (error: any) {
			console.error("Error answering callback query:", error.message);
			return null;
		}
	}
}

class randomfoodBot extends BotModel {
	constructor(config: any) {
		super(config);
	}
	// bot command: /start
	async start(req: any, content: string) {
		const text = await this.database
			.db("randomfood")
			.collection("credit")
			.insertOne({ hi: this.message.text });
		await this.sendMessage(
			this.makeHtmlCode(JSON.stringify(text, null, 2), "JSON"),
			this.message.chat.id
		);
	}
	async about(req: any, content: string) {
		const text = "Bot này tạo ra bởi <b>nthl</b> aka <b>rurimeiko</b> ヽ(✿ﾟ▽ﾟ)ノ";
		await this.sendMessage(text, this.message.chat.id);
	}
	async help(req: any, content: string) {
		// const text = "help mi";
		const text = await this.database.db("randomfood").collection("credit").find();
		await this.sendMessage(
			this.makeHtmlCode(JSON.stringify(text, null, 2), "JSON"),
			this.message.chat.id
		);
	}
	async randomfood(req: any, content: string) {
		// if (this.message.from.id === 1775446945) {
		// }
		function makeHowtoUrlsearch(keyword: string) {
			return `https://www.google.com/search?q=C%C3%A1ch%20l%C3%A0m%20${encodeURIComponent(
				keyword
			)}`;
		}

		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);
		const checkrandom = await this.database
			.db("randomfood")
			.collection("historyfood")
			.find({
				filter: {
					userid: this.message.chat.id,
					RandomAt: {
						$gte: { $date: today.toISOString() },
					},
				},
			});
		if (checkrandom.documents.length == 0) {
			const lastrandom = await this.database
				.db("randomfood")
				.collection("historyfood")
				.find({
					filter: {
						userid: this.message.chat.id,
					},
					sort: {
						RandomAt: -1,
					},
					limit: 1,
				});
			await this.sendMessage(content, this.message.chat.id);
			let subfood;
			let mainfood = await this.database
				.db("randomfood")
				.collection("mainfood")
				.aggregate({ pipeline: [{ $sample: { size: 1 } }] });
			if (lastrandom.documents.length) {
				while (mainfood.documents[0]._id == lastrandom.documents[0]._id) {
					mainfood = await this.database
						.db("randomfood")
						.collection("mainfood")
						.aggregate({ pipeline: [{ $sample: { size: 1 } }] });
				}
			}
			// const inline_keyboard: InlineKeyboard = [
			// 	[{ text: "okiii 🤤", callback_data: `${this.message.chat.id}+randomfood` }],
			// ];
			if (!mainfood.documents[0].only) {
				subfood = await this.database
					.db("randomfood")
					.collection("subfood")
					.aggregate({ pipeline: [{ $sample: { size: 1 } }] });
			}
			const dataInsert = {
				userid: this.message.chat.id,
				food: mainfood.documents[0]._id,
				subfood: null,
				RandomAt: {
					$date: new Date(),
				},
			};
			if (!subfood) {
				await this.database
					.db("randomfood")
					.collection("historyfood")
					.insertOne(dataInsert);
				return await this.sendPhoto(
					mainfood.documents[0].img,
					this.message.chat.id,
					`Tớ gợi ý nấu món <a href='${makeHowtoUrlsearch(mainfood.documents[0].name)}'>${
						mainfood.documents[0].name
					}</a> thử nha 🤤\nCậu có thể thêm tuỳ biến dựa vào nhu cầu hiện tại nhé 🤭`
					// inline_keyboard
				);
			} else {
				dataInsert.subfood = subfood.documents[0]._id;
				await this.database
					.db("randomfood")
					.collection("historyfood")
					.insertOne(dataInsert);
				return await this.sendPhoto(
					mainfood.documents[0].img,
					this.message.chat.id,
					`Tớ gợi ý nấu món <a href='${makeHowtoUrlsearch(mainfood.documents[0].name)}'>${
						mainfood.documents[0].name
					}</a> kết hợp với món phụ là <a href='${makeHowtoUrlsearch(
						subfood.documents[0].name
					)}'>${
						subfood.documents[0].name
					}</a> thử nha 🤤\nCậu có thể thêm tuỳ biến dựa vào nhu cầu hiện tại nhé 🤭`
					// inline_keyboard
				);
			}
		} else {
			await this.sendSticker(
				"CAACAgIAAxkBAAEot_VlmvKyl62IGNoRf6p64AqordsrkAACyD8AAuCjggeYudaMoCc1bzQE",
				this.message.chat.id
			);
			return await this.sendMessage(
				"Cậu đã được gợi ý roài, tớ hong gợi ý thêm món nữa đauuu",
				this.message.chat.id
			);
		}
	}
	async debt(req: any, content: string) {
		const text = "hiiii";
		await this.sendMessage(text, this.message.chat.id);
	}
	async debthistory(req: any, content: string) {
		const text = "nợ nần eo oi";
		await this.sendMessage(text, this.message.chat.id);
	}
	async debtcreate(req: any, content: string) {
		const text = "nợ nần eo oi";
		await this.sendMessage(text, this.message.chat.id);
	}
	async debtpay(req: any, content: string) {
		const text = "nợ nần eo oi";
		await this.sendMessage(text, this.message.chat.id);
	}
	async debtdelete(req: any, content: string) {
		const text = "nợ nần eo oi";
		await this.sendMessage(text, this.message.chat.id);
	}
	async debthelp(req: any, content: string) {
		const text = "nợ nần eo oi";
		await this.sendMessage(text, this.message.chat.id);
	}
	async checkdate(req: any, content: string) {
		if (this.message.from.id === 1775446945 || this.message.from.id === 6831903438) {
			function convertMilliseconds(milliseconds: number, check: boolean = false): string {
				if (milliseconds < 0) {
					return "Thời gian không hợp lệ";
				}
				const secondsInAMinute = 60;
				const secondsInAnHour = 3600;
				const secondsInADay = 86400;
				const secondsInAWeek = 604800;
				const secondsInAMonth = 2592000; // Giả định tháng có 30 ngày
				const secondsInAYear = 31536000; // Giả định năm có 365 ngày
				const seconds = milliseconds / 1000;
				if (seconds < secondsInAMinute) {
					return `${Math.round(seconds)} giây`;
				} else if (seconds < secondsInAnHour) {
					return `${Math.round(seconds / secondsInAMinute)} phút`;
				} else if (seconds < secondsInADay) {
					return `${Math.round(seconds / secondsInAnHour)} giờ`;
				} else if (seconds < secondsInAWeek || check) {
					const days = Math.floor(seconds / secondsInADay);
					const remainingHours = Math.floor((seconds % secondsInADay) / secondsInAnHour);
					const remainingMinutes = Math.floor(
						((seconds % secondsInADay) % secondsInAnHour) / secondsInAMinute
					);
					const remainingSeconds = Math.round(
						((seconds % secondsInADay) % secondsInAnHour) % secondsInAMinute
					);
					return `${days} ngày ${remainingHours} giờ ${remainingMinutes} phút ${remainingSeconds} giây`;
				} else if (seconds < secondsInAMonth) {
					const weeks = Math.floor(seconds / secondsInAWeek);
					const remainingDays = Math.floor((seconds % secondsInAWeek) / secondsInADay);
					const remainingHours = Math.floor(
						((seconds % secondsInAWeek) % secondsInADay) / secondsInAnHour
					);
					const remainingMinutes = Math.floor(
						(((seconds % secondsInAWeek) % secondsInADay) % secondsInAnHour) /
							secondsInAMinute
					);
					const remainingSeconds = Math.round(
						(((seconds % secondsInAWeek) % secondsInADay) % secondsInAnHour) %
							secondsInAMinute
					);
					return `${weeks} tuần ${remainingDays} ngày ${remainingHours} giờ ${remainingMinutes} phút ${remainingSeconds} giây`;
				} else if (seconds < secondsInAYear) {
					const months = Math.floor(seconds / secondsInAMonth);
					const remainingweeks = Math.floor((seconds % secondsInAMonth) / secondsInAWeek);
					const remainingDays = Math.floor(
						((seconds % secondsInAMonth) % secondsInAWeek) / secondsInADay
					);
					const remainingHours = Math.floor(
						(((seconds % secondsInAMonth) % secondsInAWeek) % secondsInADay) /
							secondsInAnHour
					);
					const remainingMinutes = Math.floor(
						((((seconds % secondsInAMonth) % secondsInAWeek) % secondsInADay) %
							secondsInAnHour) /
							secondsInAMinute
					);
					const remainingSeconds = Math.round(
						((((seconds % secondsInAMonth) % secondsInAWeek) % secondsInADay) %
							secondsInAnHour) %
							secondsInAMinute
					);
					return `${months} tháng ${remainingweeks} tuần ${remainingDays} ngày ${remainingHours} giờ ${remainingMinutes} phút ${remainingSeconds} giây`;
				} else {
					const years = Math.floor(seconds / secondsInAYear);
					const remainingMonths = Math.floor(
						(seconds % secondsInAYear) / secondsInAMonth
					);
					const remainingweeks = Math.floor(
						((seconds % secondsInAYear) % secondsInAMonth) / secondsInAWeek
					);
					const remainingDays = Math.floor(
						(((seconds % secondsInAYear) % secondsInAMonth) % secondsInAWeek) /
							secondsInADay
					);
					const remainingHours = Math.floor(
						((((seconds % secondsInAYear) % secondsInAMonth) % secondsInAWeek) %
							secondsInADay) /
							secondsInAnHour
					);
					const remainingMinutes = Math.floor(
						(((((seconds % secondsInAYear) % secondsInAMonth) % secondsInAWeek) %
							secondsInADay) %
							secondsInAnHour) /
							secondsInAMinute
					);
					const remainingSeconds = Math.round(
						(((((seconds % secondsInAYear) % secondsInAMonth) % secondsInAWeek) %
							secondsInADay) %
							secondsInAnHour) %
							secondsInAMinute
					);

					return `${years} năm ${remainingMonths} tháng ${remainingweeks} tuần ${remainingDays} ngày ${remainingHours} giờ ${remainingMinutes} phút ${remainingSeconds} giây`;
				}
			}
			const currentTime = new Date();
			currentTime.setUTCHours(currentTime.getUTCHours() + 7);
			// Tính chênh lệch thời gian giữa currentTime và anni
			const timeDifference: number = currentTime.getTime() - anni.getTime();
			return await this.sendMessage(
				`${this.makeHtmlCode(
					`#loveYouUntilTheWorldEnd {
					time: ${convertMilliseconds(timeDifference)};
					day: ${convertMilliseconds(timeDifference, true)};
					}`,
					"CSS"
				)}`,
				this.message.chat.id
			);
		} else return await this.sendMessage("Kiếm ngiu đi mấy a zai!", this.message.chat.id);
	}
	async image(req: any, content: string) {
		const text = this.message.text;
		if (text.length > 6) {
			await this.sendMessage(this.makeHtmlCode(text.slice(7), "JSON"), this.message.chat.id);
			try {
				const imgLink = await this.bingImageCT.getImages(text.slice(7));
				await this.sendMediaGroup(imgLink, this.message.chat.id, text.slice(7));
			} catch (err: any) {
				await this.sendMessage(err.message, this.message.chat.id);
			}
		} else
			await this.sendMessage(
				"Gửi <code>/image a cat</code> để tạo ảnh con mèo",
				this.message.chat.id
			);
	}
}

export default class Handler {
	private configs: any;
	private token: any;
	private response: Response;
	private request: any;
	private bot: randomfoodBot | undefined;
	constructor(configs: any) {
		this.configs = configs;
		this.token = this.configs.token;
		this.response = new Response();
	}

	async handle(request: any) {
		this.request = await this.processRequest(request);
		this.bot = new randomfoodBot({
			userBot: this.configs.userBot,
			bingImageCT: this.configs.bingImageCT,
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
		else if (
			this.request.method === "POST" &&
			this.request.type.includes("application/json") &&
			this.request.size > 6 &&
			this.request.content.callback_query
		) {
			this.response = await this.bot.updateCallback(this.request);
		} else {
			console.log(JSON.stringify(this.request.content, null, 2));
			this.response = utils.toJSON("OK");
		}

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
