import BotModel from "./core";
import anni from "../anniversary";
import type MongoDB from "../mongodb/init";
import type { InlineKeyboard } from "./data";

export default class randomfoodBot extends BotModel {
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
		if (!checkrandom.documents.length) {
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
			let subfood;
			let mainfood = await this.database
				.db("randomfood")
				.collection("mainfood")
				.aggregate({ pipeline: [{ $sample: { size: 1 } }] });
			if (lastrandom.documents.length) {
				while (mainfood.documents[0]._id === lastrandom.documents[0].food) {
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
					}</a> thử nha 🤤\nCậu có thể thêm tuỳ biến dựa vào nhu cầu hiện tại nhé 🤭`,
					this.message.message_thread_id
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
					}</a> thử nha 🤤\nCậu có thể thêm tuỳ biến dựa vào nhu cầu hiện tại nhé 🤭`,
					this.message.message_thread_id
					// inline_keyboard
				);
			}
		} else {
			await this.sendSticker(
				"CAACAgIAAxkBAAEot_VlmvKyl62IGNoRf6p64AqordsrkAACyD8AAuCjggeYudaMoCc1bzQE",
				this.message.chat.id,
				this.message.message_thread_id
			);
			return await this.sendMessage(
				"Cậu đã được gợi ý roài, tớ hong gợi ý thêm món nữa đauuu",
				this.message.chat.id,
				this.message.message_thread_id
			);
		}
	}
	async randomfoodhistory(req: any) {
		async function makeList(array: object | any, database: MongoDB, escapeHtml: Function) {
			let content: string = "";

			for await (const iterator of array) {
				content += `\n\n${escapeHtml("*>*^*<*")}\n\n`;
				const namefood = await database
					.db("randomfood")
					.collection("mainfood")
					.findOne({
						filter: {
							_id: { $oid: iterator.food },
						},
						projection: {
							name: 1,
						},
					});
				content += `<b>Ngày random</b>: <code>${iterator.RandomAt}</code>\n<b>Món chính</b>: <code>${namefood.document.name}</code>\n`;
				if (iterator.subfood) {
					const subfood = await database
						.db("randomfood")
						.collection("subfood")
						.findOne({
							filter: {
								_id: { $oid: iterator.subfood },
							},
							projection: {
								name: 1,
							},
						});
					content += `<b>Món phụ</b>: <code>${subfood.document.name}</code>`;
				}
			}

			return content;
		}

		const checkrandom = await this.database
			.db("randomfood")
			.collection("historyfood")
			.find({
				filter: {
					userid: this.message.chat.id,
				},
				sort: {
					RandomAt: -1,
				},
				limit: 5,
			});
		const inline_keyboard: InlineKeyboard = [
			[
				{
					text: `Trang 2 🚗`,
					callback_data: `next_2`,
				},
			],
		];
		await this.sendMessage(
			await makeList(checkrandom.documents, this.database, this.escapeHtml),
			this.message.chat.id,
			this.message.message_thread_id,
			inline_keyboard
		);
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
