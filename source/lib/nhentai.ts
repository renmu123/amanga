import {Manga, MangaParser} from '../types';
import {getContent} from '../util';
import cheerio from 'cheerio';
// https://nhentai.net
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
		const title = $('#info > h1').text();
		const images = $('#thumbnail-container img.lazyload')
			.toArray()
			.map((ele) =>
				$(ele)
					.data('src')
					// 1t.jpg 是缩略图
					?.replace(/([0-9]{1,})t/g, '$1')
					// 图片路径 https://i.nhentai.net/galleries/...
					.replace(/\/\/t/g, '//i')
			)
			.filter((imgUrl) => !!imgUrl);

		return {images, title, site: 'nhentai'};
	}
}
