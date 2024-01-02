const BING_URL = "https://www.bing.com";

let sessionCookies: string[] = [];

async function makeSessionFetch(url: string, method: string = "GET") {
	// Thiết lập các tùy chọn mặc định cho mọi yêu cầu

	const defaultOptions: any = {
		headers: {
			accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			"accept-language": "en-US,en;q=0.9",
			"cache-control": "max-age=0",
			"sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
			"sec-ch-ua-arch": '"x86"',
			"sec-ch-ua-bitness": '"64"',
			"sec-ch-ua-full-version": '"120.0.2210.91"',
			"sec-ch-ua-full-version-list":
				'"Not_A Brand";v="8.0.0.0", "Chromium";v="120.0.6099.130", "Microsoft Edge";v="120.0.2210.91"',
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-model": '""',
			"sec-ch-ua-platform": '"Windows"',
			"sec-ch-ua-platform-version": '"10.0.0"',
			"sec-fetch-dest": "document",
			"sec-fetch-mode": "navigate",
			"sec-fetch-site": "same-origin",
			"sec-fetch-user": "?1",
			"sec-ms-gec": "EC8189A5E81D4CE98F630943E10D161B2DFB737679CA64CD17303D4A05D9893A",
			"sec-ms-gec-version": "1-120.0.2210.91",
			"upgrade-insecure-requests": "1",
			"x-client-data":
				"eyIxIjoiMCIsIjEwIjoiXCJaeWVKYUJQNjJiSUF0b1Znb1BmYXBBcVJPQm1BVW5kaGR0azdzcjFaaXZRPVwiIiwiMiI6IjAiLCIzIjoiMCIsIjQiOiI2NTQ3MDM1Nzk0NDUwNjM0MTUiLCI1IjoiXCJiaW9Sa2tUQUVlMEdiUTVieFJaZlgwZDBObEtEV0hPcENWaTNLVWtJRUM0PVwiIiwiNiI6InN0YWJsZSIsIjciOiI5MDE5NDMxMzIyMSIsIjkiOiJkZXNrdG9wIn0=",
			"x-edge-shopping-flag": "1",
			cookie: "ipv6=hit=1704187234902&t=6; ipv6=hit=1704180949990&t=6; MUID=3CC1FF7EAA8F6D1E06B6EC8FAB9D6C19; MUIDB=3CC1FF7EAA8F6D1E06B6EC8FAB9D6C19; SRCHD=AF=ANAB01; SRCHUID=V=2&GUID=81F09341D49C4EDCADA44BD919E80E37&dmnchg=1; MSPTC=WG7O56Z3I0voEu9W2fwJfYmqqJSnanlopXKkF7Wyi0E; MMCASM=ID=A16CEA541AEB46E48D911F450FC70F93; _tarLang=default=en; _TTSS_IN=hist=WyJwdCIsImF1dG8tZGV0ZWN0Il0=&isADRU=0; _TTSS_OUT=hist=WyJlbiJd; BFBUSR=CMUID=3CC1FF7EAA8F6D1E06B6EC8FAB9D6C19; ANON=A=1236B575A5D5792E6B369F4CFFFFFFFF&E=1d3d&W=1; NAP=V=1.9&E=1ce3&C=0gXpjqSTTM6DTmps5CJ3-Ply-NF9tRXsHmalwR23etfHZ7B3sQrLcQ&W=1; PPLState=1; KievRPSSecAuth=FACqBBRaTOJILtFsMkpLVWSG6AN6C/svRwNmAAAEgAAACFUKg1nDCJL7aAQ0pHABu2s+mT4HxoW3Cx5vN3wrX0VwdtTsTWsla9t7BQHXueXCxwnDMhaQcxmxy9cs5fythjl2+P0FQBv95S8ODNOhO5RqOIkASuxafivFk0of6u32+yp9M+D/XJIohEP59aM9ju6wcah7vN1MXU97uCLBdXg2TrZ50CpnG8yzIRmDC2eD1Oo3qobwEFxmGSPuClvNy4xt8wQipio9Nh971lXbe+OO5yeFV9DUmzqhaAhe5dlZWKKLi90w1Dw/H8kdeGKUmFExFRcJlO6exHHg3v4xfhcdw3dLu89vyhDKC3mBe5UWkxetRl3sgXdO3HUBeuSC5LhXcjO2LJEXoYxXswrF3TEGgG7CFIMoBTaiFrnTHEw5iNja5dKDi8zUl9WwHx6Wn7hO1c3z6Z5wxXDHyILl22OP/Z/jbGg6lhyprFGcPI2EanqKFeJ0i+hqxx3zTGFGAEMMVtscmIE2TJTtX2WHNxesADounv5N0I4OiOGqZmGs6jkAILcqhQPBBwIKs7oSqpayBE6+Y+t+fjBDEXKKzKNCpZgRyahcJjHlaaSO3zdcb/50Sz9xNpeoyMEEi+uYBvWPQo4geP3GzrCkkolMVdAAnEVtkvD0JM400fdfYjCloIGQxeTfzWHV1/nhbXi4MHByTRt+6J+XIinmO8chfVL6r8qf389YtCiUBobNpqhpvqxicF9QWbsj8nJzjL4PUIprVGIgNTCBpyL2xnLEqR7M5Jr3so+Unz1oPmlglb6p/jxbGd0Uj5KGJgKoGzkD9z9ZoahZut2f4VSNGv08wdDXSscxrDGH155c3CaLjed+tC0LsnXFfC5XdaGQAyxvDXcPqQXUnljSAtOUndzdyTlrU2R8DuWXagSxURKAOKdIhw7RvM8HUMzxaCSZVyKvgkAwNi1keV6zVhajlYkB0SDBFe63/25R+/53p2Nhe971ub7NhCZb1A2+3Y7oM9vFcjMIXUHUXZpofOUpNXtxEalJr8Qh8cPJzSSrtA3yPTVtFHmOn3+q12PyIVpfYAjxk4pOlOKd8tN8zlSd0Ye3ezDRItkcebUHNvOh1fPopKDfNQfB29/ILt+1PgwF3pNE7wKOwVPYWZ4eAW9Zfu/8UqLl4jKJ6jCMftmE3BcKQrCRvWwAj4oyOtEFOeJTSVfEutFEyn11vnD9MnY6OU1ixe+Grc/c2dRRjFdxzkiZMz6xMav0RlBRRjcDphP/er8qoKwHyFw/URxTJQg0cHyC2bRJqFTpuQXt03t4eSR0fMyHj7/ZPC7j+bNS4fvW6NQB30tx1VkRzSwHzYyII9hegCCdtM91iDTFQ04Yut15HbBj7ZetUQAsxTHxU7iYRY7KvVqDUv0MoHcrn8GlVf/ghTDUmoMKfYfdV3dQFZ5hF6k0OuOZ1j2gQ0XyNXUlzImLIEc8vvGggckNbJaXq7sn+fjFTf8yqZzqmIg2T7gnFQ3MSV/1F4DIt1ntQV0/m+Z54D59pTGmmTd/FaHomN7qk496y74UAKE/gTWqCjuCDHfC+6uEPxpIJhEd; _U=1c197CMFa7WgYwwgbvQzgWZOEjITNyHA9FzGKByEgO9gMYtHpOWWQho1xzzE5gsvOfUAbEuVCRbjROeWhqB9OjjujqaSu9lhdo7R2oVFXKlN0PzEG7cVWw2R1YGXxtJgA_JTdCB3TUu_6hyRRFreTYU0EjgT9FOa91v9apqsQCbbR9WvnlFoWtksbyq-QnYhGn95BN-DKjLBR-0fC9D_fGw; WLID=LxNVqIzrGqYJu9JRINN2dG6XOawl6rJSqs17zfwfpUeUopUcJGiiKZCjvnN9+ZKXdYff5yT16aBmeFr5RYPIJN/hEwo0ABYVBz/6r9oBFn4=; USRLOC=HS=1&ELOC=LAT=10.01323413848877|LON=105.75164794921875|N=An%20Binh%20Ward%2C%20Can%20Tho|ELT=0|&CLOC=LAT=10.0316|LON=105.7609|A=6742|TS=240102063436|SRC=I; SRCHHPGUSR=SRCHLANG=en&IG=29DD4F4DB7044EA0AF736831A4E34FCE&PV=10.0.0&BRW=XW&BRH=M&CW=1488&CH=750&SCW=1473&SCH=3483&DPR=1.3&UTC=420&DM=1&CIBV=1.1381.12&EXLTT=19&HV=1704140272&WTS=63839734523&PRVCW=1488&PRVCH=750&CMUID=3CC1FF7EAA8F6D1E06B6EC8FAB9D6C19; _clck=15q7svj%7C2%7Cfi2%7C0%7C1461; _EDGE_S=SID=1C77CE653E0262913B30DD9F3FBC63A5; WLS=C=e10790f427cba434&N=Ruri; _Rwho=u=d; _SS=SID=1C77CE653E0262913B30DD9F3FBC63A5&R=175&RB=175&GB=0&RG=0&RP=175; SRCHUSR=DOB=20231224&T=1704183629000&POEX=W; GI_FRE_COOKIE=gi_sc=11&gi_prompt=3; GC=dp6EStTYKmuF9UCEhQLZLTTrbXoSH53ubh24LHmdfcwbx8GgJqaZPErYsI8vyFA33vLw1589vpTMw9HWFZxR2g; _RwBf=r=0&ilt=19&ihpd=0&ispd=1&rc=175&rb=175&gb=0&rg=0&pc=175&mtu=0&rbb=0.0&g=0&cid=&clo=0&v=4&l=2024-01-02T08:00:00.0000000Z&lft=0001-01-01T00:00:00.0000000&aof=0&ard=0001-01-01T00:00:00.0000000&o=0&p=bingcopilotwaitlist&c=MY00IA&t=8409&s=2023-03-05T14:15:33.2248650+00:00&ts=2024-01-02T08:20:39.4325316+00:00&rwred=0&wls=2&wlb=0&wle=0&ccp=0&lka=0&lkt=0&aad=0&TH=&mta=0&e=3yfKYRe7qIXZxQqVSwJY_-77wEwwpAbpmef-7jPJ0UXEpoPLpGN8Yiy4c2QLRQt5UTC-BJ3xByDMhFTtemMSGw&A=1236B575A5D5792E6B369F4CFFFFFFFF; _clsk=n67lhi%7C1704188824137%7C1%7C0%7Cz.clarity.ms%2Fcollect",
		},

		body: null,
		method: method,
	};

	// Thêm cookie vào header nếu có
	if (sessionCookies.length > 0) {
		defaultOptions.headers = {
			...defaultOptions.headers,
			cookie: sessionCookies.join("; "),
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
				const existingIndex = sessionCookies.findIndex((cookie) =>
					cookie.startsWith(setCookieHeader.split(";")[0])
				);
				if (existingIndex === -1) {
					sessionCookies.push(setCookieHeader);
				}
			});
		}

		return response;
	} catch (error) {
		console.error("Fetch error:", error);
		throw error; // Ném lại lỗi để có thể xử lý ở nơi gọi hàm
	}
}

const getImages = async (session: any, prompt: string) => {
	console.log("Sending request...");
	const urlEncodedPrompt = encodeURIComponent(prompt);

	const url = `${BING_URL}/images/create?q=${urlEncodedPrompt}&rt=3&FORM=GENCRE`; // force use rt=3
	const response = await session(url, "POST");

	let redirectUrl;
	if (response.status == 200) {
		console.log(response);
		redirectUrl = response.url.replace("&nfy=1", "");
	} else if (response.status !== 302) {
		console.error(`ERROR: the status is ${response.status} instead of 302 or 200`);
		throw new Error("Redirect failed");
	}

	console.log("Redirected to", redirectUrl);

	const requestId = redirectUrl.split("id=")[1];
	await session(redirectUrl);

	const pollingUrl = `${BING_URL}/images/create/async/results/${requestId}?q=${urlEncodedPrompt}`;

	console.log("Waiting for results...");
	const startWait = Date.now();
	let imagesResponse;
	let dataresponse;
	while (true) {
		if (Date.now() - startWait > 300000) {
			throw new Error("Timeout error");
		}
		console.log(".", { end: "", flush: true });
		imagesResponse = await session(pollingUrl);
		dataresponse = await imagesResponse.json();
		console.log(dataresponse);
		if (imagesResponse.status !== 200) {
			throw new Error("Could not get results");
		}
		if (dataresponse === "") {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			continue;
		} else {
			break;
		}
	}

	if (dataresponse.errorMessage === "Pending") {
		throw new Error(
			"This prompt has been blocked by Bing. Bing's system flagged this prompt because it may conflict with their content policy. More policy violations may lead to automatic suspension of your access."
		);
	} else if (dataresponse.errorMessage) {
		throw new Error("Bing returned an error: " + dataresponse.errorMessage);
	}

	const imageLinks = dataresponse.match(/src="([^"]+)"/g).map((src: string) => src.slice(5, -1));
	const normalImageLinks: string[] = Array.from(
		new Set(imageLinks.map((link: string) => link.split("?w=")[0]))
	);

	const badImages = [
		"https://r.bing.com/rp/in-2zU3AJUdkgFe7ZKv19yPBHVs.png",
		"https://r.bing.com/rp/TX9QuO3WzcCJz1uaaSwQAz39Kb0.jpg",
	];

	for (const im of normalImageLinks) {
		if (badImages.includes(im)) {
			throw new Error("Bad images");
		}
	}

	if (normalImageLinks.length === 0) {
		throw new Error("No images");
	}

	return normalImageLinks;
};

export const generateImagesLinks = async (prompt: string) => {
	const authCookie =
		"1c197CMFa7WgYwwgbvQzgWZOEjITNyHA9FzGKByEgO9gMYtHpOWWQho1xzzE5gsvOfUAbEuVCRbjROeWhqB9OjjujqaSu9lhdo7R2oVFXKlN0PzEG7cVWw2R1YGXxtJgA_JTdCB3TUu_6hyRRFreTYU0EjgT9FOa91v9apqsQCbbR9WvnlFoWtksbyq-QnYhGn95BN-DKjLBR-0fC9D_fGw";

	if (!authCookie || !prompt) {
		throw new Error("Missing parameters");
	}

	// Create image generator session
	sessionCookies.push(`_U=${authCookie}`);
	// const session = customFetchWithSession;
	const imageLinks = await getImages(makeSessionFetch, prompt);
	return imageLinks;
};
