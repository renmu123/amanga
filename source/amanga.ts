import cheerio from 'cheerio';
import {MangaParser, SupportedSitesMap, Manga} from './types';
import {getContent} from './util';

const supportedSites: SupportedSitesMap = {
	manhuagui: 'manhuagui',
	qq: 'qq',
	nhentai: 'nhentai',
	loveheaven: 'loveheaven',
	weloma: 'loveheaven',
};

function match1(text: string, regex: string | RegExp) {
	let r = new RegExp(regex).exec(text);
	if (r) {
		return r[1];
	}
	return '';
}

export async function getMangaParser(url: string): Promise<MangaParser> {
	const host = match1(url, /https?:\/\/([^\/]+)\//);
	const domain = match1(host, /(\.[^.]+\.[^.]+)$/) || host;
	const key = match1(domain, /([^.]+)/);

	if (key in supportedSites) {
		const {Parser} = await import(`./lib/${supportedSites[key]}`);
		return new Parser(url);
	}

	throw new Error('Site not supported ' + url);
}

async function amanga(url: string): Promise<MangaParser> {
	const parser = await getMangaParser(url);

	await parser.init();

	return parser;
}

export default amanga;
