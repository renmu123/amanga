import got from 'got';
import fs from 'fs-extra';
import {dirname, join, parse} from 'path';
import {merge} from 'lodash';

export async function getContent(url: string, options = {}): Promise<string> {
	const res = await got.get(url, {
		// timeout: 20000,
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:94.0) Gecko/20100101 Firefox/94.0',
		},
		...options,
	});
	return res.body;
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function download(url: string, path: string, options = {}) {
	if (await fs.pathExists(path)) return;

	const parsedUrl = new URL(url);
	const mergedOptions = merge(
		{
			headers: {
				Host: parsedUrl.host,
				referer: url,
			},
			https: {
				rejectUnauthorized: false,
			},
		},
		options
	);

	const res = await got.get(url, mergedOptions);
	const buffer = Buffer.from(res.rawBody);

	await fs.ensureDir(dirname(path));
	fs.writeFileSync(path, buffer);
}
