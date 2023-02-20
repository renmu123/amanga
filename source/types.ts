import {OptionsOfTextResponseBody as RequestOptions} from 'got';

// 漫画单话
export interface Manga {
	// 来源网站名称
	site: string;
	// 网站主页
	home?: string;
	// 当前话请求地址
	url?: string;
	// 漫画名称
	title: string;
	// 第几话
	chapter?: string;
	// 图片链接
	images: string[];
}

export interface Comic {
	intro: string;
	name: string;
	otherName: string;
	sourceName: string;
	status: string;
	lastUpdateTime: string;
	publishTime: string;
	category: string;
	author: string;
	chapters: {url: string; title: string; count: string}[];
}

export interface MangaOptions {
	requestOptions?: RequestOptions;
}

export interface MangaParser {
	base?: string;
	url: string;
	comicId?: string;
	comicInfo?: Comic;
	init: () => Promise<void>;
	parse: ($: cheerio.Root, rawHtml: string) => Promise<Manga>;
	search?: () => {};
	getChapters?: () => {};
	getImages?: (chapterId: string) => {};
	getComicInfo?: () => Promise<Comic>;
}

export interface SupportedSitesMap {
	[key: string]: string;
}
