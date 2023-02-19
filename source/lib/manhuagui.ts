import {decompressFromBase64} from 'lz-string';
import {Manga, MangaParser} from '../types';
import {parseScript} from 'esprima';
import {ExpressionStatement, CallExpression, MemberExpression, Literal} from 'estree';
import {getContent} from '../util';
import cheerio from 'cheerio';

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

	constructor(comicId: string) {
		this.comicId = comicId;
		this.base = 'https://www.manhuagui.com';
	}
	async getComicInfo(): Promise<{
		intro: string;
		name: string;
		otherName: string;
		sourceName: string;
		status: string;
		lastUpdateTime: string;
		publishTime: string;
		category: string;
		author: string;
		chapters: {href: string; title: string; count: string}[];
	}> {
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
		return {
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
	}

	async getChapters() {
		const url = `${this.base}/comic/${this.comicId}/`;
		const html = await getContent(url);
		const $ = cheerio.load(html);

		const chapterList = [];
		$('.chapter-list a').map((_, item) => {
			chapterList.push({
				title: $(item).attr('title'),
				count: $(item).find('i').text(),
				href: `${this.base}${$(item).attr('href')}`,
			});
		});

		return chapterList;
	}
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

	async init() {
		const html = await getContent(this.url);
		const $ = cheerio.load(html);
		this.$ = $;
	}
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
