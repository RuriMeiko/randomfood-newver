export default class BingImageCreater {
	private authCookie: string;
	private sessionCookies: string[] = [];
	private BING_URL: string;
	constructor(authCookie: string) {
		this.authCookie = authCookie;
		this.sessionCookies.push(`_U=${this.authCookie}`);
		this.BING_URL = "https://cn.bing.com";
	}
	private async makeSessionFetch(url: string, method: string = "GET") {
		const defaultOptions: any = {
			headers: {
				accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "max-age=0",
				"content-type": "application/x-www-form-urlencoded",
				"sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
				"Referrer-Policy": "origin-when-cross-origin",
			},
			body: null,
			method: "POST",
		};

		// Thêm cookie vào header nếu có
		if (this.sessionCookies.length > 0) {
			defaultOptions.headers = {
				...defaultOptions.headers,
				cookie: this.sessionCookies.join("; "),
			};
		}

		// Gửi yêu cầu và trả về Response
		try {
			const response = await fetch(url, defaultOptions);
			// Kiểm tra trạng thái của phản hồi
			if (!response.ok) {
				throw new Error(`Network response was not ok: ${response.statusText}`);
			}
			//@ts-ignore
			const setCookieHeaders = response.headers.getAll("Set-Cookie");
			if (setCookieHeaders) {
				setCookieHeaders.forEach((setCookieHeader: string) => {
					const cookieKey = setCookieHeader.split(";")[0];
					const existingIndex = this.sessionCookies.findIndex((cookie) =>
						cookie.startsWith(cookieKey)
					);

					if (existingIndex !== -1) {
						// Nếu đã tồn tại cookie với khóa tương tự, thì đè lên cookie cũ
						this.sessionCookies[existingIndex] = setCookieHeader;
					} else {
						// Ngược lại, thêm cookie mới vào mảng
						this.sessionCookies.push(setCookieHeader);
					}
				});
			}

			return response;
		} catch (error) {
			console.error("Fetch error:", error);
			throw error; // Ném lại lỗi để có thể xử lý ở nơi gọi hàm
		}
	}
	async getImages(prompt: string) {
		console.log("Sending request...");
		const urlEncodedPrompt = encodeURIComponent(prompt);

		const url = `${this.BING_URL}/images/create?q=${urlEncodedPrompt}&rt=3&FORM=GENCRE`; // force use rt=3
		const response = await this.makeSessionFetch(url, "POST");

		let redirectUrl: string = "";
		if (response.status == 200) {
			// console.log(response);
			redirectUrl = response.url.replace("&nfy=1", "");
		} else if (response.status !== 302) {
			console.error(`ERROR: the status is ${response.status} instead of 302 or 200`);
			throw new Error("Redirect failed");
		}

		const requestId = redirectUrl.split("id=")[1];
		await this.makeSessionFetch(redirectUrl);
		const pollingUrl = `${this.BING_URL}/images/create/async/results/${requestId}?q=${urlEncodedPrompt}`;
		const startWait = Date.now();
		let imagesResponse: Response;
		let dataResponse: any; // Kiểu dữ liệu này cần phải được xác định dựa trên nội dung thực tế của API
		while (true) {
			if (Date.now() - startWait > 300000) {
				throw new Error("Timeout error");
			}
			console.log(".", { end: "", flush: true });
			imagesResponse = await this.makeSessionFetch(pollingUrl);
			if (imagesResponse.status !== 200) {
				throw new Error("Could not get results");
			}
			const contentType = imagesResponse.headers.get("Content-Type");
			if (contentType && contentType.includes("application/json")) {
				dataResponse = await imagesResponse.json();
			} else {
				dataResponse = await imagesResponse.text();
			}
			if (!dataResponse) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				continue;
			} else {
				break;
			}
		}

		if (dataResponse.errorMessage === "Pending") {
			throw new Error(
				"This prompt has been blocked by Bing. Bing's system flagged this prompt because it may conflict with their content policy. More policy violations may lead to automatic suspension of your access."
			);
		} else if (dataResponse.errorMessage) {
			throw new Error("Bing returned an error: " + dataResponse.errorMessage);
		}
		const imageLinks = dataResponse
			.match(/src="([^"]+)"/g)
			.map((src: string) => src.slice(5, -1));
		const normalImageLinks: string[] = Array.from(
			new Set(imageLinks.map((link: string) => link.split("?w=")[0]))
		);

		const badImages = [
			"https://r.bing.com/rp/in-2zU3AJUdkgFe7ZKv19yPBHVs.png",
			"https://r.bing.com/rp/TX9QuO3WzcCJz1uaaSwQAz39Kb0.jpg",
		];

		if (normalImageLinks.length === 0) {
			throw new Error("No images");
		}
		const validImageLinks: string[] = [];

		for (const im of normalImageLinks) {
			if (badImages.includes(im)) {
				throw new Error("Bad images");
			}
			// if (!im.includes(".svg")) validImageLinks.push(im);
		}
		return normalImageLinks;
	}
}
