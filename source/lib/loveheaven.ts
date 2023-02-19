import {Manga, MangaParser} from '../types';
import {getContent} from '../util';
import cheerio from 'cheerio';

export class Parser implements MangaParser {
	url: string;
	constructor(url: string) {
		this.url = url;
	}
	async init() {
		const html = await getContent(this.url);
		const $ = cheerio.load(html);
	}
	async parse($: cheerio.Root): Promise<Manga> {
		const breadcrumb = $('ol.breadcrumb > li');
		const chapter = breadcrumb.last().text().trim();
		const title = breadcrumb.last().prev().text().trim();

		const images = $('img.chapter-img')
			.toArray()
			.map((ele) => $(ele).data('src'))
			.filter((url) => url.indexOf('Credit_LHScan') === -1);

		return {images, title, chapter, site: 'LoveHeaven'};
	}
}
