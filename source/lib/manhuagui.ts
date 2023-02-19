import {decompressFromBase64} from 'lz-string';
import {Manga, MangaParser, Comic} from '../types';
import {parseScript} from 'esprima';
import {ExpressionStatement, CallExpression, MemberExpression, Literal} from 'estree';
import {getContent} from '../util';
import cheerio from 'cheerio';
import got from 'got';

function decode(p: any, a: any, c: any, k: any, e: any, d: any) {
	e = function (c: any) {
		return (
			(c < a ? '' : e(Math.floor(c / a))) +
			((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
		);
	};

	if (true) {
		while (c--) d[e(c)] = k[c] || e(c);
		k = [
			function (e: any) {
				return d[e];
			},
		];
		e = function () {
			return '\\w+';
		};
		c = 1;
	}

	while (c--) if (k[c]) p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);

	return p;
}

function parseData(statement: ExpressionStatement) {
	const data: (string | string[])[] = [];

	((statement.expression as CallExpression)?.arguments[0] as CallExpression).arguments.forEach(
		(arg) => {
			if (arg.type === 'Literal') {
				data.push(arg.value?.toString() ?? '');
			} else if (arg.type === 'CallExpression') {
				// 加密的图片数据
				const b64Data =
					((arg.callee as MemberExpression)?.object as Literal)?.value?.toString() ??
					'';
				data.push((decompressFromBase64(b64Data) || '').split('|'));
			} else if (arg.type === 'ObjectExpression') {
				// data.push({})
			}
		}
	);

	const [p, a, c, k, e] = data;
	const decodeData = decode(p, a, c, k, e, {}) + '';
	const [jsonData] = decodeData.match(/\{(.+)\}/g) || [];

	return jsonData ? JSON.parse(jsonData) : null;
}

// https://www.manhuagui.com/
export class Parser implements MangaParser {
	base: string;
	url: string;
	comicId: string;
	$: cheerio.Root;
	comicInfo?: Comic;

	constructor(comicId: string) {
		this.comicId = comicId;
		this.base = 'https://www.manhuagui.com';
	}
	async getComicInfo() {
		const url = `${this.base}/comic/${this.comicId}/`;

		const html = await getContent(url);
		const $ = cheerio.load(html);
		const intro = $('#intro-all').text();
		const name = $('.book-title h1').text();
		const otherName = $('.book-title h2').text();
		const sourceName = $('.detail-list>li').eq(2).find('a').text();
		const status = $('.status .red').eq(0).text();
		const lastUpdateTime = $('.status .red').eq(1).text();

		const publishTime = $('.detail-list>li').eq(0).find('a').eq(0).text();
		const category = $('.detail-list>li').eq(1).find('a').eq(0).text();
		const author = $('.detail-list>li').eq(1).find('a').eq(1).text();

		const chapters = await this.getChapters();

		const data = {
			intro,
			name,
			otherName,
			sourceName,
			status,
			lastUpdateTime,
			publishTime,
			category,
			author,
			chapters,
		};
		this.comicInfo = data;
		return data;
	}

	// 获取章节
	async getChapters() {
		const url = `${this.base}/comic/${this.comicId}/`;
		const html = await getContent(url);
		const $ = cheerio.load(html);

		const chapterList = [];
		$('.chapter-list a').map((index, item) => {
			chapterList.push({
				id: index,
				title: $(item).attr('title'),
				count: $(item).find('i').text(),
				href: `${this.base}${$(item).attr('href')}`,
			});
		});

		return chapterList;
	}
	// 章节解析
	async parseChapter(url: string): Promise<Manga> {
		const html = await getContent(url);
		const $ = cheerio.load(html);
		let data;
		const scripts = $('script').toArray();
		for (const ele of scripts) {
			const text = $(ele).html();
			if (text?.indexOf('window[') !== -1) {
				const st = parseScript(text || '', {});
				const statement = st.body[0];
				data = parseData(statement as ExpressionStatement);
			}
		}

		if (!data) {
			throw new Error('Invalid data');
		}

		// 把漫画名也加进去 漫画名/第几话
		const title = data.bname;
		const chapter = data.cname;

		// TODO 验证数据
		const images = [];

		// 组成图片链接
		for (const file of data.files) {
			images.push(
				decodeURI(
					`https://i.hamreus.com${data.path}${file}?e=${data.sl.e}&m=${data.sl.m}`
				)
			);
		}

		return {images, title, chapter, site: '漫画柜'};
	}

	// 下载漫画全部章节
	async downloadComic() {
		if (!this.comicInfo.chapters) return;

		this.comicInfo.chapters;
	}

	// 下载章节
	async downloadChapterByUrl(chapterUrl: string) {
		const images = await this.parseChapter(chapterUrl);

		(images.images ?? []).map((url) => {
			got.get(url, {});
		});
	}
	async _download(url: string) {
		return got.get(url, {
			headers: {
				Host: 'i.hamreus.com',
				referer: this.base,
			},
			https: {
				rejectUnauthorized: false,
			},
		});
	}

	// 废弃
	async init() {
		const html = await getContent(this.url);
		const $ = cheerio.load(html);
		this.$ = $;
	}
	// 废弃
	async parse(): Promise<Manga> {
		const $ = this.$;
		let data;
		const scripts = $('script').toArray();
		for (const ele of scripts) {
			const text = $(ele).html();
			if (text?.indexOf('window[') !== -1) {
				const st = parseScript(text || '', {});
				const statement = st.body[0];
				data = parseData(statement as ExpressionStatement);
			}
		}

		if (!data) {
			throw new Error('Invalid data');
		}

		// 把漫画名也加进去 漫画名/第几话
		const title = data.bname;
		const chapter = data.cname;

		// TODO 验证数据
		const images = [];

		// 组成图片链接
		for (const file of data.files) {
			images.push(
				decodeURI(
					`https://i.hamreus.com${data.path}${file}?e=${data.sl.e}&m=${data.sl.m}`
				)
			);
		}

		return {images, title, chapter, site: '漫画柜'};
	}
}
